#!/usr/bin/env node
// vault-commit — снимок памяти в локальный git. Без него правка больших заметок идёт без страховки.
//
//   vault-commit                  обычный снимок (ничего не изменилось — молча выходит)
//   vault-commit "текст"          снимок со своим сообщением
//   vault-commit --before <файл>  снимок ПЕРЕД опасной правкой файла (вызывать до перезаписи)
//
// Репозиторий ЛОКАЛЬНЫЙ, remote у него быть не должно: в заметки может попасть что-то секретное.
'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const VAULT = process.env.VAULT_DIR || path.join(os.homedir(), 'claude-vault');
const git = (...a) => spawnSync('git', ['-C', VAULT, ...a], { encoding: 'utf8', windowsHide: true });

if (!fs.existsSync(VAULT)) { console.error(`vault-commit: нет папки ${VAULT}`); process.exit(1); }
if (!fs.existsSync(path.join(VAULT, '.git'))) { console.error(`vault-commit: git не заведён (git init в ${VAULT})`); process.exit(1); }

const remotes = (git('remote').stdout || '').trim();
if (remotes) {
  console.error(`⚠ vault-commit: у репозитория памяти есть remote (${remotes.replace(/\n/g, ' ')}).`);
  console.error('  Пушить память наружу нельзя, пока в ней могут быть секреты.');
}

const args = process.argv.slice(2);
let msg = args[0] || '';
if (args[0] === '--before') msg = `перед правкой ${args[1] || '?'}`;

git('add', '-A');
if (git('diff', '--cached', '--quiet').status === 0) process.exit(0); // нечего коммитить

const files = (git('diff', '--cached', '--name-only').stdout || '').split('\n').filter(Boolean).length;
const stat = (git('diff', '--cached', '--shortstat').stdout || '').trim();
if (!msg) msg = `память: ${files} файл(ов) изменено`;

// имя и почта для снимков — свои, локальные, чтобы не зависеть от глобальных настроек git
const r = git('-c', 'user.name=vault', '-c', 'user.email=vault@localhost', 'commit', '-q', '-m', msg, '-m', stat);
if (r.status !== 0) { console.error('vault-commit:', (r.stderr || r.stdout || '').trim()); process.exit(1); }
console.log(`✓ снимок: ${msg} (${stat})`);
