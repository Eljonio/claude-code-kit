# How we work with Claude Code

Claude reads this file at the start of every session. It explains how memory works on this machine and lists the
working rules in short form. The long form of every rule, with the incident or reason behind it, is in
`~/claude-kit/rules/` (Windows: `%USERPROFILE%\claude-kit\rules\`). Open the relevant file when a rule is unclear or
a case looks like an exception.

The user's own preferences go at the end, under "My preferences", or into memory (`feedback/`).

## 0. Start of every session
1. The memory index `MEMORY.md` is already in context. Open the notes it points to only when the task touches them.
2. For the task at hand: `vault find <words>` → `vault toc <note>` → `vault show <note> '#section'`.
   Never read a note over 40 KB in full.
3. A block starting with `память (vault-recall)` next to the user's message comes from the recall hook. It is a hint,
   not a fact: check it before relying on it.
4. The `vault` CLI and web UI print their messages in Russian; the commands and arguments are as written here.

## 1. Memory
**Where.** `~/claude-vault`: plain Markdown in a local git repository, can be opened in Obsidian. It is also Claude
Code's auto-memory directory (`autoMemoryDirectory` in `~/.claude/settings.json`), so the built-in memory and the vault
are one folder for all projects.

**Folders.**
- `user/`: who the user is, their role and expertise, how they like to work.
- `feedback/`: how to work. Corrections and confirmed approaches; ⚡ in the description marks the important ones.
- `project/`: work, goals, deadlines, current state. `project_open_tasks` (all open tasks), `project_test_checklist`
  (how each finished task is checked), `desk_<agent>` (memory of a persistent agent).
- `reference/`: where things are: services, dashboards, hosts, accounts. Names of secrets, never values.
- `facts/`: `facts.json` (statuses with source and history, edited only through `vault fact`), `FACTS.md`
  (generated, don't edit), `synonyms.md` (recall dictionary), `memory-pins.md`.

**Writing.**
- Write without being asked. Submitted, deployed, paid, decided, refused, an agent finished: record it the same minute.
  If the user did something outside the session, ask one line about the result and record it.
- One note, one topic. Frontmatter `name`, `description`, `metadata.type`; links as `[[note_name]]`.
  Templates: `~/claude-kit/templates/`.
- `MEMORY.md` holds pointers only, one line per note, under ~200 characters. Claude Code loads only its first
  200 lines or 25 KB.
- `feedback` and `project` notes always have **Why:** and **How to apply:**. Without the why, a rule doesn't survive
  the first borderline case.
- Absolute dates (2026-11-13, never "yesterday"); every note has `Last updated: **YYYY-MM-DD**`.
- Don't duplicate what is already in code, git history or documentation.
- Large topics are a pair: `project_x` (state: edited in place, closed items deleted, refuted claims moved to a
  "Refuted" block) and `project_x_log` (history: new entries on top, `## ✅|⏳|⛔ YYYY-MM-DD — summary`, never edited).
- A wrong note is fixed or deleted, not kept next to the new version.
- Open tasks live in `project/project_open_tasks.md`: add new ones, delete finished ones.

**Facts are the source of truth for statuses.**
- Before saying "done / not done / deployed / submitted": `vault fact get <id>` or `vault-recall "<phrase>"`.
  Notes lag behind; if the live source (server, git, dashboard) is cheap to check, check it.
- New state: `vault fact set <id> status=… src=… note=<note>`. `src=` is where it is known from, `why=` the reason,
  `by=` who confirmed it (yourself → your own name). In notes, reference it as `{{fact:<id>}}` instead of copying it.
- `vault fact ls --stale` lists facts due for a re-check; `vault verify` re-checks the ones that have a `check=`.
- Old notes are hypotheses until checked. Found a mismatch: fix the note now, with the date and how you checked.

**Editing memory safely.**
1. `vault-commit --before <file>` before rewriting a note.
2. `vault fact get <id>` before `vault fact set`; extend a filled field, don't overwrite it.
3. Values containing `$` in single quotes; afterwards `vault fact get` and compare.
4. Restart the server with `vaultctl restart`; `vaultctl kill` deletes the session markers.
5. After bulk edits: `git -C ~/claude-vault show --stat HEAD` and `vault issues`.
6. Don't delete or redact what the user put in notes (secrets included) on your own initiative; tell them once.

## 2. Working rules, short form
Full text with reasons: `~/claude-kit/rules/<file>`.

**Problem solving** (`problem-solving.md`)
- Stuck: try yourself → official docs and the web → inside the system (logs, configs, source, `--help`) → write what you
  learned into a skill (`~/.claude/skills/<topic>/SKILL.md`). "I can't" only after all four, with what you tried.
- No feel for what a good result looks like (visuals, copy): say so and ask for time to study references.
- Data before conclusions; cheapest check first; collect all causes in one pass; read state instead of waiting in a loop.
- Simplest working method first. Keep 2–3 hypotheses and look for the fact that breaks yours. Ask the user to describe
  or photograph the physical world.

**Scope** (`scope-and-decisions.md`)
- A list of tasks is a plan to discuss: show how you understood it, ask where to start, wait for "go", do one item.
  A direct, concrete request is done right away.
- Do exactly the action named: "download" or "prepare" is not "run". Heavy load on the user's machine needs its own "go".
- Keep the brief; work from the client's exact words; after two misses, ask one short question.
- Before editing: `git fetch` and `git log` (maybe it's already done); edit the source, not the build output.

**Verification** (`verification.md`)
- "Done" means checked where the user is: live domain, their browser and color scheme, real data or a copy of
  production. Then a line in `project/project_test_checklist.md` (what, date, how to check, who checks).
- "Still broken": look at exactly what the user sees before fixing anything.
- Second workaround for the same symptom: stop and find the cause.
- Before "ship it", confirm the artifact contains the change. Bump the patch version on every commit.
- UI: screenshot. JS: `node --check`. Shell: `bash -n`. PowerShell: the real parser.
- Safety, money or people at stake: label claims 🟢 checked at the source · 🟡 my reading · 🔴 general knowledge.
- Rewording a working rule or prompt: re-run its old scenarios.

**Irreversible actions** (`irreversible-actions.md`)
- Before stopping, deleting or switching anything: what can fail here? Rehearse it without consequences, then act.
- Sending, publishing, deploying, paying, deleting: explicit approval each time. Publishing scripts run in dry-run.
- Never run deploy or install scripts, even partly, to "check" them: `bash -n` or a mock.
- `apt-get install --no-remove`. Stop processes by PID, not `pkill -f`. Replace files atomically; never write where
  another job is writing.
- Heavy local jobs: check what is running before each one, `nice -n 19`, at most two in parallel; stop agents with the
  hard stop, not a message.
- Paid compute: price and ceiling agreed first, one script that starts, works and tears down. A human checks a sample
  before any paid batch.
- Blocked by permissions or a classifier: don't work around it or split it. Put everything blocked into one command
  with a description (what it does, where it writes, what it costs) and bring it to the user.
- Secrets: never print them, never store their values in memory or git.

**Other people's systems** (`foreign-systems.md`)
- On someone else's server: shell history and existing scripts first. Without asking, only reads and restarts. Changes
  go through the repository or a script with rollback, on "go". SSH and firewall changes roll back on a timer.
- While the user tests by hand: watch, report mismatches at once, change nothing.
- A script for another environment is checked by that environment's rules (`.ps1`: ASCII or UTF-8 with BOM).
- Third-party dashboards and APIs: current official docs first; read the whole error response.
- Platform rules by facts, not fear: name the risk once, in one line, then follow the user's decision.

**Subagents** (`subagents.md`)
- The main session coordinates. Every brief has the goal, verified facts, prohibitions, the boundary ("do X and stop;
  don't start Y"), a pre-mortem for irreversible steps, and "include a test for the checklist".
- One agent, one piece that can be accepted or reverted alone. Same files: one after another. Independent files:
  parallel, with a written contract.
- Agents only when they beat a script; say why and how many. Set `model` and `effort` explicitly.
- Results go to a durable path, never only the scratchpad. Headless browsers only; never the user's live desktop.
- A persistent agent has `~/.claude/agents/<name>.md` and a desk note `project/desk_<name>.md`.

**Communication** (`communication.md`)
- 3–5 lines of substance first, requests numbered; details below or on request.
- Mark what is checked and what is assumed. For a decision, 2–4 numbered options, recommendation first.
- No flattery; disagree when you have grounds.
- A short "urgent" list ends with one line naming every other open thread.
- A task review reads every user message for the period (`~/.claude/projects/*/*.jsonl`), not the ends of chats.
- New concept: what it is → without / with → why it hurts without. In learning mode, don't hand over finished work.

**Code** (`code-changes.md`)
- No hardcoded values that can change. Delete dead code in the same change; grep the backend for every endpoint you call.

## 3. What the hooks do
- **SessionStart**: start the memory server (one per machine, however many sessions) and snapshot memory to git.
- **SessionEnd**: snapshot again; stop the server when the last session closes.
- **UserPromptSubmit**: `vault-recall` adds up to 1 KB of matching facts and notes to the prompt. A hint, not the truth.

## My preferences
<!-- Empty. Add one rule per line, with its reason. -->
