#!/usr/bin/env node
// install-settings — write the Vault hooks and the memory folder into Claude Code's settings.json, keeping everything else.
//
//   node install-settings.js <path to settings.json> <claude-kit folder> <claude-vault folder>
//
// Safe to re-run: this kit's previous hooks (commands containing /vault-app/bin/) are replaced, other hooks stay.
// The old file is kept next to it as settings.json.bak-<date>.
'use strict';
const fs = require('fs');
const path = require('path');

const [settingsPath, kitDir, vaultDir] = process.argv.slice(2);
if (!settingsPath || !kitDir || !vaultDir) {
  console.error('usage: node install-settings.js <settings.json> <claude-kit> <claude-vault>');
  process.exit(1);
}
const fwd = p => path.resolve(p).replace(/\\/g, '/'); // forward slashes work in both Git Bash and PowerShell

let settings = {};
if (fs.existsSync(settingsPath)) {
  const raw = fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, '');
  try { settings = raw.trim() ? JSON.parse(raw) : {}; } catch (e) {
    console.error(`settings.json is not valid JSON (${e.message}). Fix it by hand and run again; the file was not changed.`);
    process.exit(2);
  }
  const stamp = new Date().toLocaleString('sv-SE').replace(/[-:]/g, '').replace(' ', '-');
  fs.copyFileSync(settingsPath, `${settingsPath}.bak-${stamp}`);
}

const bin = s => fwd(path.join(kitDir, 'vault-app', 'bin', s));
const cmd = (script, arg) => `node "${bin(script)}" ${arg}`;
const OURS = h => typeof h.command === 'string' && h.command.replace(/\\/g, '/').includes('/vault-app/bin/');

settings.autoMemoryDirectory = fwd(vaultDir);
settings.hooks = settings.hooks || {};
function put(event, hook) {
  const groups = (settings.hooks[event] || [])
    .map(g => ({ ...g, hooks: (g.hooks || []).filter(h => !OURS(h)) }))
    .filter(g => g.hooks.length);
  groups.push({ hooks: [{ type: 'command', ...hook }] });
  settings.hooks[event] = groups;
}
put('SessionStart', { command: cmd('vaultctl.js', 'hook-start'), timeout: 20, statusMessage: 'Vault: starting' });
put('SessionEnd', { command: cmd('vaultctl.js', 'hook-stop'), timeout: 10 });
put('UserPromptSubmit', { command: cmd('vault-recall', '--hook'), timeout: 5 });

fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8'); // no BOM
console.log(`  [ok] settings.json: Vault hooks, autoMemoryDirectory = ${settings.autoMemoryDirectory}`);
