#!/usr/bin/env node
// vaultctl — запуск и остановка сервера Vault с учётом нескольких сессий Claude Code (Windows / Linux / macOS).
//
//   vaultctl start   [session_id]   поднять (если не поднят) и зарегистрировать сессию
//   vaultctl stop    [session_id]   снять сессию; если сессий не осталось — погасить сервер
//   vaultctl hook-start / hook-stop то же, но session_id берётся из JSON на stdin (хуки Claude Code)
//   vaultctl restart                перезапустить код сервера, НЕ теряя маркеры сессий
//   vaultctl kill                   погасить принудительно (стирает маркеры сессий — обычно нужен restart)
//   vaultctl status
//   vaultctl open                   открыть веб-интерфейс в браузере
//
// Как сервер узнаёт, что пора гаснуть: на каждую сессию лежит маркер с PID процесса Claude Code.
// Сервер раз в 20 с проверяет эти PID и выходит, когда живых не осталось (терминал закрыли жёстко — тоже).
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const P = require(path.join(__dirname, '..', 'lib', 'platform.js'));

const APP_DIR = path.join(__dirname, '..');
const RUN_DIR = P.runDir();
const PID_FILE = path.join(RUN_DIR, 'server.pid');
const SESS_DIR = path.join(RUN_DIR, 'sessions');
const LOCK = path.join(RUN_DIR, 'start.lock');
const LOG = process.env.VAULT_LOG || path.join(APP_DIR, 'server.log'); // журнал запусков и хуков
const PORT = process.env.VAULT_PORT || 4040;
const URL = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(SESS_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const localTs = () => new Date().toLocaleString('sv-SE'); // 2026-11-13 15:38:18, местное время
const log = msg => { try { fs.appendFileSync(LOG, `${localTs()} ${msg}\n`); } catch {} };
const readPid = f => { try { return parseInt(fs.readFileSync(f, 'utf8').trim(), 10) || 0; } catch { return 0; } };
const pidAlive = pid => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const sessions = () => { try { return fs.readdirSync(SESS_DIR); } catch { return []; } };

async function aliveOnPort() {
  try { const r = await fetch(URL + '/api/rebuild', { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; }
}

// Простой межпроцессный замок: несколько чатов стартуют одновременно → сервер всё равно один.
async function withLock(fn) {
  for (let i = 0; i < 50; i++) {
    try {
      const fd = fs.openSync(LOCK, 'wx');
      try { return await fn(); } finally { fs.closeSync(fd); try { fs.unlinkSync(LOCK); } catch {} }
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 15000) fs.unlinkSync(LOCK); } catch {} // зависший замок
      await sleep(100);
    }
  }
  return fn(); // не дождались — работаем без замка, хуже не будет
}

async function start(sid = 'manual') {
  const marker = path.join(SESS_DIR, sid);
  if (!fs.existsSync(marker)) fs.writeFileSync(marker, '');
  return withLock(async () => {
    if (pidAlive(readPid(PID_FILE)) || await aliveOnPort()) return `vault: уже запущен (${URL}), сессий: ${sessions().length}`;
    const out = fs.openSync(LOG, 'a');
    const child = spawn(process.execPath, [path.join(APP_DIR, 'server.js')], {
      cwd: APP_DIR, detached: true, windowsHide: true, stdio: ['ignore', out, out],
      env: { ...process.env, VAULT_AUTOEXIT: '1' },
    });
    child.unref();
    fs.writeFileSync(PID_FILE, String(child.pid));
    for (let i = 0; i < 25 && !(await aliveOnPort()); i++) await sleep(200);
    return `vault: запущен pid ${child.pid} → ${URL}`;
  });
}

async function killServer() {
  const pid = readPid(PID_FILE);
  if (pidAlive(pid)) { try { process.kill(pid); } catch {} await sleep(300); }
  try { fs.unlinkSync(PID_FILE); } catch {}
}

async function stop(sid = 'manual') {
  return withLock(async () => {
    try { fs.unlinkSync(path.join(SESS_DIR, sid)); } catch {}
    // маркеры умерших сессий старше двух суток — в мусор
    for (const f of sessions()) {
      const p = path.join(SESS_DIR, f);
      try { if (Date.now() - fs.statSync(p).mtimeMs > 2 * 864e5) fs.unlinkSync(p); } catch {}
    }
    const left = sessions().length;
    if (left > 0) return `vault: ещё ${left} сессий, сервер оставляю`;
    await killServer();
    return 'vault: остановлен';
  });
}

function readStdin() {
  return new Promise(resolve => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    const t = setTimeout(() => resolve(data), 2000);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => { data += c; });
    process.stdin.on('end', () => { clearTimeout(t); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(t); resolve(data); });
  });
}

function snapshot(msg) {
  // снимок памяти: на входе подберёт правки, сделанные вне Claude (Obsidian и т.п.), на выходе — итог сессии
  try {
    require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'vault-commit.js'), msg],
      { stdio: 'ignore', windowsHide: true, timeout: 8000 });
  } catch {}
}

async function hook(kind) {
  let sid = '';
  try { sid = JSON.parse(await readStdin() || '{}').session_id || ''; } catch {}
  sid = String(sid).replace(/[^\w.-]/g, '') || `hook-${process.ppid}`;
  if (kind === 'hook-start') {
    await start(sid);
    // PID процесса Claude Code; не нашли — маркер без PID (живёт до hook-stop или двух суток)
    const cpid = P.findClaudePid();
    fs.writeFileSync(path.join(SESS_DIR, sid), cpid ? String(cpid) : '');
    snapshot('память: правки вне сессии');
    log(`hook-start sid=${sid} claude_pid=${cpid || '?'}`);
  } else {
    log(`hook-stop sid=${sid}`);
    snapshot(`память: итог сессии ${sid}`);
    await stop(sid);
  }
}

(async () => {
  const [cmd = 'status', arg] = process.argv.slice(2);
  try {
    switch (cmd) {
      case 'start': console.log(await start(arg)); break;
      case 'stop': console.log(await stop(arg)); break;
      case 'hook-start': case 'hook-stop': await hook(cmd); break; // хук ничего не печатает
      case 'kill':
        await killServer();
        for (const f of sessions()) { try { fs.unlinkSync(path.join(SESS_DIR, f)); } catch {} }
        console.log('vault: остановлен'); break;
      case 'restart': {
        await killServer();
        const keep = sessions()[0];
        console.log(await start(keep || 'manual')); break;
      }
      case 'status':
        if (await aliveOnPort()) {
          console.log(`vault: работает ${URL} (pid ${readPid(PID_FILE) || '?'})`);
          for (const f of sessions()) console.log(`  сессия ${f} pid=${readPid(path.join(SESS_DIR, f)) || '-'}`);
        } else console.log('vault: не запущен');
        break;
      case 'open': await start('manual'); P.openExternal(URL); console.log(URL); break;
      default: console.log('usage: vaultctl start|stop|restart|hook-start|hook-stop|kill|status|open [session_id]'); process.exitCode = 1;
    }
  } catch (e) {
    if (cmd.startsWith('hook-')) { log(`${cmd} error: ${e.message}`); return; } // хук не должен ломать сессию
    console.error('vaultctl:', e.message); process.exitCode = 1;
  }
})();
