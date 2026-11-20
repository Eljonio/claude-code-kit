---
name: vault-memory
description: Navigate and edit Claude's long-term memory (~/claude-vault) with the bundled vault-app (~/claude-kit/vault-app) — web UI on 127.0.0.1:4040 and the CLI `vault find/toc/show/links/issues/lint`, facts with statuses (`vault fact get/set/ls`), `vault-recall` (memory for a phrase), `vault verify` (re-check facts at their source), git snapshots (`vault-commit`). Use at the start of any session instead of reading notes whole, when looking for "where did I write that down", when recording a status change, and when reviewing or cleaning up memory.
---

# Vault: finding your way around memory

Last updated: **2026-11-20**

## Why
Once there are many notes and project logs grow to hundreds of kilobytes, reading them whole wastes the context
window. Vault gives:
1. **A table of contents that reads as a timeline.** Headings like `## ✅|⏳|⛔ 2026-11-13 — …` are parsed into a status
   and a date, so it is visible what is closed, what is waiting and what failed.
2. **Links.** Who links to a note and what it links to (`[[wikilink]]`), broken links, orphan notes.
3. **Full-text search** with line numbers, then a targeted `vault show`.
4. **Facts.** Statuses are stored as records with a source and history, not as text inside notes.

## How it is set up
- Code: `~/claude-kit/vault-app` (Node 20+, no runtime dependencies). `server.js` serves the web UI and the API,
  `bin/vault` is the CLI, `bin/vaultctl.js` starts and stops the server, `bin/vault-commit.js` takes git snapshots,
  `bin/vault-recall` produces the prompt-time hint.
- It reads and writes the files directly: `~/claude-vault` and `~/.claude/skills/*/SKILL.md`. The index rebuilds itself
  when files change.
- Claude Code hooks: `SessionStart → vaultctl.js hook-start`, `SessionEnd → vaultctl.js hook-stop`. **There is one
  server per machine**, however many sessions are open. It stops when the last session closes, including a terminal
  that was killed: every 20 s the server checks the Claude Code PIDs stored in the session markers.
- Port `4040` (`VAULT_PORT`), bound to 127.0.0.1 only. A test instance next to the real one:
  `VAULT_PORT=4041 VAULT_RUN_DIR=<temp dir> VAULT_DIR=<test vault> node vaultctl.js start`.
- Obsidian can be open on `~/claude-vault` at the same time; it doesn't depend on the server.
- CLI and web UI messages are in Russian.

## CLI
```
vault find <words…>            # full-text search, snippets with :line
vault toc <name>               # table of contents: :line, status, date
vault show <name> '#substring' # one section (from its heading to the next heading of the same level)
vault show <name>              # whole note
vault links <name>             # ← backlinks / → outgoing / ✗ broken
vault recent [n]               # recently changed
vault issues                   # > 40 KB, broken links, orphans, missing frontmatter, stale facts
vault lint                     # bloated state notes, logs nobody links to, missing "Last updated"
vault ls [filter]              # list with size, age, links
vault path <name>              # absolute path
vault open [name]              # open in the default browser
vault save [message]           # git snapshot of the vault
```
`<name>` is the file name without `.md`, the `name:` from frontmatter, or a skill's folder name. A substring works if it
is unambiguous.

## Facts: statuses as records, not text
What is true right now (submitted, deployed, paid, decided, waiting) lives in `~/claude-vault/facts/facts.json`.
One entity, one record: status, date, source, who confirmed it, a link to a note, and the history of changes.
`facts/FACTS.md` is a readable copy, regenerated automatically.
```
vault-recall "phrase"                 # 3–5 facts and notes on the topic, ≤ 1 KB
vault fact get <id> | ls [word] [--stale] [--state=wait]
vault fact set <id> status=… src=… note=<note> [value= since= by= why= ttl= check= title= tags= state=]
vault fact ok <id> src=…             # re-checked, still true
vault fact log <id>                  # history
vault fact ref <id>                  # the {{fact:id}} snippet to put in a note
vault fact rm <id> why=…             # archive (history is kept)
vault verify [--dry]                 # re-check facts at their source (ssh / git / http / file — read-only)
```
Example (`note=` must name a note or skill that exists, otherwise the command refuses):
```
vault fact set api_v2_deploy title='API v2 on production' status='deployed, 1.4.2 live' state=done \
  src='curl /api/version 2026-11-20' note=project_api by=Claude
```
- **Before saying "done / not done"**: `vault fact get` or `vault-recall`, not the text of a note. If the fact is stale
  (⚠) or has no source, check the source if that's cheap, then `fact ok` or `fact set`.
- **New state**: `vault fact set` in the same minute. Don't rewrite the status in the note; put `{{fact:<id>}}` there:
  `vault show` and the web UI display the live value.
- `src=` says where it is known from: "screenshot 2026-11-20", "git 815b30f", "ssh package.json", "the user said".
  Secrets are rejected: `fact set` refuses anything that looks like a key.
- States: `risk`, `blocked`, `wait`, `todo`, `later`, `done`, `info`. Each has a default re-check period; set your own
  with `ttl=<days>`.
- `check=` makes a fact verifiable automatically, as JSON:
  `{"kind":"ssh_grep","host":"…","file":"…","pattern":"…","expect":"…"}`, `{"kind":"git_head","repo":"~/…","expect":"…"}`,
  `{"kind":"http","url":"https://…","pattern":"…","expect":"…"}` or
  `{"kind":"file_grep","path":"…","pattern":"…","expect":"…"}`. `expect` is a substring, or `/regex/`.
- If recall misses a word the user uses, add a line to `facts/synonyms.md` (`- canonical, variant, variant → target`)
  and check with `vault-recall --why "phrase"`.

## Start of a session
1. `vault recent 10`: what was touched last. `vault fact ls --stale`: which statuses are due for a re-check.
2. For the task: `vault find <words>` → `vault toc <note>` → `vault show <note> '#topic'`.
3. Never read a large log whole; read the sections you need from its table of contents.
4. After a significant change, add `## ✅|⏳|⛔ YYYY-MM-DD — summary` to the log and update "Last updated".

## Splitting a large note into "state" and "log"
The order matters; break it and text gets lost.
1. **First** the snapshot: `vault-commit --before <file>`. Only then write the new files over it.
2. Write the state in your own words: it is a synthesis, not a cut-and-paste. Collect refuted versions in a "Refuted"
   block.
3. Move the log over verbatim, without editing.
4. **Check:** every heading of the original is present in the two files together. Count characters, not bytes
   (non-Latin letters take two bytes).

## Traps
- Stop the server only with `vaultctl kill` or `vaultctl restart`. `pkill -f 'node server.js'` from Bash kills the
  shell itself, because the pattern matches its own command line.
- `vaultctl kill` deletes the session markers, so live sessions no longer keep the server alive. To reload the code,
  use `vaultctl restart`.
- Windows: the command wrappers are in `%USERPROFILE%\claude-kit\bin` (`vault` for Git Bash, `vault.cmd` for
  PowerShell and cmd). "Command not found" means that folder isn't on PATH yet: open a new terminal after installing.
