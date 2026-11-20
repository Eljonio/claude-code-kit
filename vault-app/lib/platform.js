// platform — то, что различается между Windows, Linux и macOS: где лежат служебные файлы, как открыть ссылку,
// как найти процесс Claude Code среди предков. Всё остальное в vault-app от ОС не зависит.
'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const IS_WIN = process.platform === 'win32';

// Служебная папка сервера: pid, маркеры сессий, lock. На Windows — %TEMP%\vault-app.
function runDir() {
  return process.env.VAULT_RUN_DIR || path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(), 'vault-app');
}

// Кто подтверждает факт из веба, если поле «кто» пустое: VAULT_USER (как в vault-app), VAULT_OWNER (ставит установщик)
// или имя пользователя ОС.
function ownerName() {
  if (process.env.VAULT_USER || process.env.VAULT_OWNER) return process.env.VAULT_USER || process.env.VAULT_OWNER;
  try { return os.userInfo().username || 'web'; } catch { return 'web'; }
}

// Открыть ссылку или файл программой по умолчанию.
function openExternal(target) {
  const opts = { detached: true, stdio: 'ignore', windowsHide: true };
  let p;
  if (IS_WIN) p = spawn('explorer.exe', [target], opts);
  else if (process.platform === 'darwin') p = spawn('open', [target], opts);
  else p = spawn('xdg-open', [target], opts);
  p.on('error', () => {});
  p.unref();
}

const looksLikeClaude = (name, cmd) =>
  /^claude(\.exe)?$/i.test(name || '') ||
  /(^|[\\/ ])claude(\.exe)?(\s|$)|claude-code|[\\/]\.claude[\\/]local/i.test(cmd || '');

// Таблица процессов: Map pid → { ppid, name, cmd }.
function processTable() {
  const table = new Map();
  if (IS_WIN) {
    const ps = 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress';
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps],
      { encoding: 'utf8', timeout: 8000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 || !r.stdout) return table;
    let rows;
    try { rows = JSON.parse(r.stdout); } catch { return table; }
    for (const x of [].concat(rows)) table.set(x.ProcessId, { ppid: x.ParentProcessId, name: x.Name, cmd: x.CommandLine || '' });
    return table;
  }
  // Linux: /proc; macOS: ps
  if (fs.existsSync('/proc/self/stat')) {
    for (const d of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(d)) continue;
      try {
        const stat = fs.readFileSync(`/proc/${d}/stat`, 'utf8');
        const ppid = parseInt(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1], 10);
        const name = stat.slice(stat.indexOf('(') + 1, stat.lastIndexOf(')'));
        const cmd = fs.readFileSync(`/proc/${d}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();
        table.set(+d, { ppid, name, cmd });
      } catch {}
    }
    return table;
  }
  const r = spawnSync('ps', ['-axo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8' });
  for (const line of (r.stdout || '').split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
    if (m) table.set(+m[1], { ppid: +m[2], name: path.basename(m[3]), cmd: m[4] });
  }
  return table;
}

// PID процесса Claude Code среди предков (до 10 шагов вверх). null — не нашли.
function findClaudePid(startPid = process.ppid) {
  const t = processTable();
  let pid = startPid;
  for (let i = 0; i < 10 && pid > 1; i++) {
    const p = t.get(pid);
    if (!p) return null;
    if (looksLikeClaude(p.name, p.cmd)) return pid;
    pid = p.ppid;
  }
  return null;
}

module.exports = { IS_WIN, runDir, ownerName, openExternal, findClaudePid, looksLikeClaude };
