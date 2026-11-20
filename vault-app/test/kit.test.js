'use strict';
// Tests for the parts that exist only in the claude-code-kit copy of vault-app:
// the Node replacements for the bash helpers (vaultctl.js, vault-commit.js), the settings.json installer
// and the platform layer. Everything runs in temp directories; nothing touches the real ~/.claude.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmpVault, tmpDir } = require('./helpers');

const BIN = path.join(__dirname, '..', 'bin');
const node = (script, args, opts = {}) => spawnSync(process.execPath, [path.join(BIN, script), ...args], { encoding: 'utf8', ...opts });

test('install-settings: hooks + autoMemoryDirectory, foreign hooks and keys kept, re-run does not duplicate', () => {
  const home = tmpDir('kit-home-');
  const settings = path.join(home, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(settings), { recursive: true });
  const foreign = { type: 'command', command: '/opt/other/hook.sh' };
  fs.writeFileSync(settings, JSON.stringify({ model: 'x', hooks: { SessionStart: [{ hooks: [foreign] }] } }));
  const kit = path.join(home, 'claude-kit'), vault = path.join(home, 'claude-vault');

  for (let run = 0; run < 2; run++) assert.equal(node('install-settings.js', [settings, kit, vault]).status, 0);

  const s = JSON.parse(fs.readFileSync(settings, 'utf8'));
  assert.equal(s.model, 'x', 'unrelated keys survive');
  assert.equal(s.autoMemoryDirectory, vault.replace(/\\/g, '/'));
  const cmds = ev => s.hooks[ev].flatMap(g => g.hooks.map(h => h.command));
  assert.deepEqual(cmds('SessionStart').filter(c => c === foreign.command), [foreign.command], 'foreign hook kept once');
  for (const [ev, needle] of [['SessionStart', 'vaultctl.js" hook-start'], ['SessionEnd', 'vaultctl.js" hook-stop'], ['UserPromptSubmit', 'vault-recall" --hook']])
    assert.equal(cmds(ev).filter(c => c.includes(needle)).length, 1, `${ev}: exactly one kit hook after two runs`);
  assert.ok(fs.readdirSync(path.dirname(settings)).some(f => f.startsWith('settings.json.bak-')), 'backup written');
});

test('install-settings: broken settings.json is left untouched, exit code 2', () => {
  const settings = path.join(tmpDir('kit-bad-'), 'settings.json');
  fs.writeFileSync(settings, '{ "hooks": ');
  const r = node('install-settings.js', [settings, '/kit', '/vault']);
  assert.equal(r.status, 2);
  assert.equal(fs.readFileSync(settings, 'utf8'), '{ "hooks": ');
});

test('vault-commit.js: silent with no changes, commits with a message, warns when the vault has a remote', () => {
  const vault = tmpVault();
  const git = (...a) => spawnSync('git', ['-C', vault, ...a], { encoding: 'utf8' });
  git('init', '-q');
  const env = { ...process.env, VAULT_DIR: vault };
  let r = node('vault-commit.js', ['first'], { env });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /first/);
  r = node('vault-commit.js', [], { env });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '', 'nothing to commit → no output');
  fs.appendFileSync(path.join(vault, 'project', 'desk_crm.md'), '\nnew line\n');
  r = node('vault-commit.js', ['--before', 'desk_crm.md'], { env });
  assert.match(git('log', '-1', '--format=%s').stdout, /desk_crm\.md/);
  git('remote', 'add', 'origin', 'https://example.invalid/vault.git');
  fs.appendFileSync(path.join(vault, 'project', 'desk_crm.md'), 'one more\n');
  r = node('vault-commit.js', [], { env });
  assert.match(r.stderr, /remote/);
});

test('vaultctl.js: one server for several sessions, stops after the last one; English date line is recognised', async () => {
  const run = tmpDir('kit-run-');
  const vault = tmpVault();
  fs.writeFileSync(path.join(vault, 'feedback', 'feedback_en.md'), '---\nname: feedback_en\ndescription: "English note"\n---\n\nLast updated: **2026-11-20**\n');
  const env = {
    ...process.env, VAULT_DIR: vault, SKILLS_DIR: tmpDir('kit-skills-'), VAULT_RUN_DIR: run,
    VAULT_PORT: String(4900 + Math.floor(Math.random() * 300)), VAULT_LOG: path.join(run, 'server.log'),
  };
  const ctl = (...a) => node('vaultctl.js', a, { env, timeout: 15000 });
  const up = async () => { try { return (await fetch(`http://127.0.0.1:${env.VAULT_PORT}/api/rebuild`)).ok; } catch { return false; } };
  try {
    assert.match(ctl('start', 's1').stdout, /запущен pid \d+/);
    assert.ok(await up(), 'server answers');
    const tree = await (await fetch(`http://127.0.0.1:${env.VAULT_PORT}/api/tree`)).json();
    assert.equal(tree.notes.find(n => n.base === 'feedback_en').hasDate, true, '"Last updated" counts as a date line');
    assert.match(ctl('start', 's2').stdout, /уже запущен/);
    assert.match(ctl('stop', 's1').stdout, /ещё 1/);
    assert.ok(await up(), 'still up while a session is left');
    assert.match(ctl('stop', 's2').stdout, /остановлен/);
    await new Promise(r => setTimeout(r, 300));
    assert.equal(await up(), false, 'server gone after the last session');
  } finally { ctl('kill'); }
});

test('platform: Claude Code process detection, owner name override', () => {
  const P = require('../lib/platform');
  assert.ok(P.looksLikeClaude('claude', ''));
  assert.ok(P.looksLikeClaude('claude.exe', ''));
  assert.ok(P.looksLikeClaude('node', 'node /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js'));
  assert.ok(!P.looksLikeClaude('node', 'node server.js'));
  assert.ok(!P.looksLikeClaude('bash', 'bash claude-panel'));
  const saved = process.env.VAULT_USER;
  process.env.VAULT_USER = 'Alice';
  try { assert.equal(P.ownerName(), 'Alice'); } finally { if (saved === undefined) delete process.env.VAULT_USER; else process.env.VAULT_USER = saved; }
});
