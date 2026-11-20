# claude-code-kit

[![tests](https://github.com/Eljonio/claude-code-kit/actions/workflows/test.yml/badge.svg)](https://github.com/Eljonio/claude-code-kit/actions/workflows/test.yml)

A starter kit for working with Claude Code day to day: a set of working rules for the agent, each with the real
mistake behind it, and a long-term memory system wired into Claude Code's hooks. It installs into your home folder
with one script and starts with an empty memory that fills up as you work.

It is for people who use Claude Code across many projects and sessions, and keep running into the same problems: the
agent forgets what was decided yesterday, reports stale status with confidence, says "done" without checking where you
will look, does more than it was asked, or takes an irreversible step without a rehearsal.

## Where to look first

| to check | open |
|---|---|
| 63 rules in 9 topics, each as rule / why (the incident) / how to apply | [`rules/`](rules) (index in [`rules/README.md`](rules/README.md)) |
| the short form Claude Code loads in every session, and how memory is explained to a fresh agent | [`claude/CLAUDE.md`](claude/CLAUDE.md) |
| the memory layout an agent starts from, and note templates with frontmatter | [`vault/`](vault), [`templates/`](templates) |
| how the hooks are merged into an existing `settings.json` without touching other settings | [`vault-app/bin/install-settings.js`](vault-app/bin/install-settings.js), [`claude/settings.example.json`](claude/settings.example.json) |
| one memory server for any number of sessions, and finding the Claude Code process on Windows / Linux / macOS | [`vault-app/bin/vaultctl.js`](vault-app/bin/vaultctl.js), [`vault-app/lib/platform.js`](vault-app/lib/platform.js) |
| the guard that rejects requests sent to the local server by other sites through the browser | `guard()` in [`vault-app/server.js`](vault-app/server.js) |
| what is tested | [`vault-app/test/`](vault-app/test): 46 tests, `npm test`, throwaway folders, no network |

## The problem

Claude Code starts every session with an empty context. It has two built-in ways to carry knowledge over: `CLAUDE.md`
files that you write, and auto memory that Claude writes (a `MEMORY.md` index plus topic notes, per repository).
Used as is, a few things go wrong over weeks of real work:

- **Memory is split per repository** and nothing checks it. A status written in three notes goes stale in two of them.
- **Rules without reasons don't hold.** "Always verify before saying done" gets bent the first time a case looks
  slightly different. A rule that carries the incident it came from survives that case.
- **Nothing makes the agent look.** Relevant memory exists, but the agent answers from the current context.
- **Notes grow.** Project logs reach hundreds of kilobytes; reading them whole wastes the context window.

The kit addresses these with:

1. **Rules with reasons** ([`rules/`](rules)): memory and facts, verification, scope, irreversible actions,
   subagents, communication, other people's systems, problem solving, code changes. Every rule has a "why" taken from
   an actual failure (names and projects removed), and a "how to apply".
2. **One memory for all projects**: `autoMemoryDirectory` points Claude Code's auto memory at `~/claude-vault`, a plain
   Markdown folder in a local git repository (it can be opened in Obsidian).
3. **Facts**: statuses ("submitted", "deployed", "paid") are records with a state, a source, a date, an edit history and
   a re-check period, instead of sentences copied between notes.
4. **Recall**: a `UserPromptSubmit` hook adds up to 1 KB of the most relevant facts and notes to each prompt. It runs
   locally, without network calls or an LLM.
5. **A navigator**: `vault find → vault toc → vault show <note> '#section'`, so large notes are read one section at a
   time, plus a local web UI.

## What's inside

```
rules/                 63 rules, rule / why / how to apply, one file per topic (English)
claude/
  CLAUDE.md            → ~/.claude/CLAUDE.md: how memory works + the rules in short form
  settings.example.json  the hooks and autoMemoryDirectory the installer writes
  skills/vault-memory/ → ~/.claude/skills/: how the agent uses the memory tools
vault/                 → ~/claude-vault: empty memory (index, folders, open tasks, test checklist, facts files)
templates/             notes (user, feedback, project state, project log, reference), agent, agent desk, skill
vault-app/             memory server, CLI, facts, recall (a cross-platform copy of vault-app, see below)
bin/                   vault, vault-recall, vault-commit, vaultctl wrappers for Git Bash (sh) and cmd/PowerShell (.cmd)
install.sh             installer for Linux and macOS
install.ps1            installer for Windows
```

## How the memory is organized

```
~/claude-vault/
  MEMORY.md            index: one line per note; Claude Code loads its first 200 lines / 25 KB into every session
  user/                who the user is, how they like to work
  feedback/            how to work: corrections and confirmed approaches; ⚡ marks the important ones
  project/             goals, state, deadlines; project_open_tasks, project_test_checklist, desk_<agent>
  reference/           where things are: services, hosts, dashboards (names of secrets, never values)
  facts/
    facts.json         facts with state, source, history (written only through `vault fact`)
    FACTS.md           generated readable view
    synonyms.md        your words for things → which facts and notes recall should bring up
    memory-pins.md     notes pinned to the short index built by `vault index --build`
```

- **Notes** have frontmatter (`name`, `description`, `metadata.type`), link with `[[note_name]]`, and carry
  `Last updated: **YYYY-MM-DD**`. `feedback` and `project` notes always have **Why:** and **How to apply:**.
- **Large topics are a pair**: `project_x` holds the current state and is edited in place (closed items deleted,
  refuted claims moved to a "Refuted" block); `project_x_log` is append-only, newest entry on top, with headings
  `## ✅|⏳|⛔ YYYY-MM-DD — summary` that the navigator reads as a timeline.
- **Facts** are written the moment state changes, without the user asking:
  `vault fact set api_v2_deploy status='deployed, 1.4.2 live' state=done src='curl /api/version' note=project_api`.
  A note shows the live value with `{{fact:api_v2_deploy}}`. Values that look like credentials are rejected.
- **Agents** that work on an area across sessions get `~/.claude/agents/<name>.md` and a desk note
  `project/desk_<name>.md` (state, open tasks, what waits for a decision).

The hooks the installer adds to `~/.claude/settings.json`:

| hook | command | what it does |
|---|---|---|
| `SessionStart` | `vaultctl.js hook-start` | starts the memory server if it isn't running (one per machine), registers the session with the Claude Code PID, snapshots the vault to git |
| `SessionEnd` | `vaultctl.js hook-stop` | snapshots again, unregisters the session, stops the server after the last one; the server also exits by itself when no registered Claude Code process is alive |
| `UserPromptSubmit` | `vault-recall --hook` | prints up to 1 KB of matching facts and notes, which Claude Code adds to the prompt as context; stays silent on any error |

## Install

Requirements: [Claude Code](https://code.claude.com/docs), Node.js 20 or newer, git.

```bash
# Linux / macOS
git clone <this repo> claude-code-kit && cd claude-code-kit
./install.sh                      # options: --owner "Name", --force
```

```powershell
# Windows (PowerShell or cmd, no administrator rights)
powershell -ExecutionPolicy Bypass -File install.ps1      # options: -Owner "Name", -Force
```

What the installer does, in order: checks Node and git; copies the kit to `~/claude-kit` (rules and templates are read
from there); installs `~/.claude/CLAUDE.md`; installs the `vault-memory` skill; creates `~/claude-vault` with a local
git repository; adds the three hooks and `autoMemoryDirectory` to `~/.claude/settings.json`; puts the commands on PATH
(`~/.local/bin` symlinks on Linux/macOS, `%USERPROFILE%\claude-kit\bin` on the user PATH on Windows); starts the
memory server once to check it.

It doesn't overwrite anything silently:
- an existing `~/claude-vault` is never touched;
- an existing, different `CLAUDE.md` stays; the kit's version is written next to it as `CLAUDE.kit.md` to merge by
  hand (`--force` / `-Force` replaces it and keeps a `.bak-<date>` copy);
- an existing `vault-memory` skill stays unless `--force`;
- `settings.json` keeps all other keys and hooks, the old file is saved as `settings.json.bak-<date>`, and re-running
  replaces the kit's own hooks instead of adding duplicates. Invalid JSON stops the installer without changing the file.

To install by hand instead: copy `claude/CLAUDE.md` and `claude/skills/` into `~/.claude/`, copy `vault/` to
`~/claude-vault` and `git init` it, and merge `claude/settings.example.json` into `~/.claude/settings.json`.

After installing, in a new terminal: `vault issues` and `vault fact ls` should answer, and in a Claude Code session
`http://127.0.0.1:4040` shows the web UI. If you want the long rules in context at all times rather than opened on
demand, copy `rules/*.md` into `~/.claude/rules/` (Claude Code loads every `.md` file there in each session; about
50 KB).

To remove: delete the three hooks and `autoMemoryDirectory` from `~/.claude/settings.json` (or restore a
`.bak-<date>` copy), delete `~/claude-kit`, the symlinks in `~/.local/bin` (or the PATH entry on Windows), and
`~/.claude/skills/vault-memory`. `~/claude-vault` is your data; keep it or delete it.

## Relationship to vault-app

The memory server, CLI, facts and recall are [vault-app](https://github.com/Eljonio/vault-app). The kit bundles a copy
of it, based on vault-app commit `c64f0b2`, instead of depending on that repository, because vault-app's helper
scripts are bash and use `flock`, `ss` and `curl`, so it runs only on Linux, while the kit has to install on Windows
from one folder without network access.

What differs in the copy:
- `bin/vaultctl.js` and `bin/vault-commit.js` replace the bash `vaultctl` and `vault-commit`: a lock file instead of
  `flock`, an HTTP check instead of `ss`/`curl`, and Claude Code process detection through
  [`lib/platform.js`](vault-app/lib/platform.js) (`/proc` on Linux, `ps` on macOS, `Get-CimInstance` on Windows).
- `lib/platform.js` also opens links with the system default program (`explorer`, `open`, `xdg-open`) and puts runtime
  files in the OS temp folder when `XDG_RUNTIME_DIR` is unset.
- `bin/install-settings.js` is new: it merges the hooks into `settings.json`.
- "Last updated" is recognized as the date line next to the Russian "Последнее обновление", and new notes created from
  the web UI use it, so the English templates pass `vault lint`.
- `VAULT_OWNER` (set by the Windows installer) works as an alias of `VAULT_USER`; `VAULT_LOG` moves `server.log`.
- `test/kit.test.js` covers the parts above; the 41 vault-app tests run unchanged, except that they start the CLI
  through `node` so they don't depend on the shebang.

Everything else, including `guard()` (Host allow-list against DNS rebinding, `Origin` / `Sec-Fetch-Site` checks on
`/api/`, JSON-only POST bodies) and its test, is the same as in vault-app.

## What was verified

- `npm test` in `vault-app/`: 46 tests, 46 pass (Linux, Node 24).
- `install.sh` in a throwaway `HOME` on Linux: fresh install, re-run, install over an existing `CLAUDE.md` and
  `settings.json` with foreign hooks, `--force`. Then the three hook commands exactly as written into `settings.json`:
  the server started, recall answered, `vault` commands and facts worked, and the server stopped after `SessionEnd`.
- `install.ps1` with PowerShell 7 on Linux, in a throwaway `HOME`: completed. The PATH and `VAULT_OWNER` steps write
  the Windows user environment, which PowerShell on Linux doesn't have, so they weren't exercised.
- On every push, GitHub Actions runs the 46 tests, the installer and `vault issues` / `vault fact ls` on GitHub-hosted
  Linux, Windows (Server 2025) and macOS machines ([workflow](.github/workflows/test.yml)).
- Not verified: a live Claude Code session on Windows or macOS (the hooks firing inside Claude Code), and desktop
  Windows 10/11.

## Limitations

- **Windows and macOS are covered by CI only.** The tests and the installer pass on GitHub-hosted Windows Server and
  macOS machines; nobody has used the kit with a live Claude Code session there day to day.
- **vault-app speaks Russian**: its web UI, CLI messages, recall output and stop-word list are in Russian. English
  queries work; English stemming is minimal. The rules, templates, `CLAUDE.md` and the skill are in English.
- **Recall is lexical** (stems plus a hand-written synonyms file), not semantic.
- **Single-user, local, no authentication.** The server listens on 127.0.0.1 only; any local process can call its API.
  Don't expose the port.
- **The rules come from one person's work.** They are generalized, but a few reflect that person's preferences
  (numbered options, short answers first, a strict learning mode). Edit or delete what doesn't fit.
- **It depends on Claude Code features**: hooks, `autoMemoryDirectory`, the `MEMORY.md` limits, `~/.claude/rules/`.
  These were checked against the Claude Code documentation on 2026-11-20 (Claude Code 2.1.x).

## License

MIT, see [LICENSE](LICENSE).

**Provenance.** Exported on 2026-11-20 from a private working copy. The owner's own notes, facts, personal settings,
names of people, clients and projects, server details, and the rules that only made sense for one client or one
machine were removed, so the public history starts with the export.
