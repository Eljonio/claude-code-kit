# Memory and facts

How the agent keeps long-term memory honest: what to write, when, where, and how to edit it without losing anything.
The commands (`vault …`, `vault-commit`) come from the bundled [vault-app](../vault-app); the rules work with any
folder of Markdown notes.

---

### 1. Record state changes immediately, without being asked

**Rule.** Anything that changes the state of the world goes into memory in the same minute: submitted, deployed, paid,
decided, refused, an agent finished. The user should never have to say "remember this".

**Why.** Memory and an agent both treated an app review request on a developer platform as "not submitted" while it
was already under review.
The user had submitted it days earlier, nobody wrote it down, and several sessions from that day were closed by a
reboot before their results reached the notes.

**How to apply.**
- Write the fact (`vault fact set <id> status=… src=… note=<note>`) and update the related note right away, not
  "at the end of the evening".
- If the user did something outside the session (in a browser, in another terminal), ask one line about the outcome
  and record it.
- Before saying "not done" or "not submitted" from memory, check the live source (dashboard, git, production) if
  that is cheap. Memory lags behind reality.

### 2. Statuses come from facts, not from note text

**Rule.** "Done / not done / deployed / submitted" is answered from the facts store (`vault fact get <id>`,
`vault-recall "<phrase>"`), not from prose in a note. Notes reference a fact with `{{fact:<id>}}` instead of copying
its status.

**Why.** A status copied into three notes goes stale in two of them, and the agent then reports the stale one with
full confidence. The incident in rule 1 was exactly this.

**How to apply.**
- One entity, one fact record, with `src=` (where it is known from) and a history of changes.
- `vault fact ls --stale` lists facts not re-checked for longer than their TTL. Re-check them, then `vault fact ok`
  or `vault fact set`.
- `vault verify` re-checks facts that have a `check=` (read-only: grep over ssh, `git log`, HTTP GET, local grep).

### 3. Old notes are hypotheses until checked against a live source

**Rule.** A note, a config or a "verified" mark of unknown or old provenance is a hypothesis, not a fact. Before
relying on it, check it against the code, the server, the API or the official docs.

**Why.** Earlier sessions, run on weaker models, wrote confident mistakes into memory and code. When a rule set for a
customer-facing chatbot written that way was tested with five simulated customers, it scored 6 out of 10: it quoted
the price on the first question, invented details in a role-play and promised something the business could not do.

**How to apply.**
- Treat anything written before the last model upgrade, or without a source, as a lead to verify.
- When you find a mismatch, fix the note at once, with the date and how you checked. Delete wrong notes instead of
  keeping both versions.
- When briefing a subagent, say which facts are verified and that older notes are only a pointer.

### 4. Big topics get a "state" note and a "log" note, written differently

**Rule.** A large project is split into `project_x` (current state) and `project_x_log` (history). The state note is
edited in place; the log is append-only.

**Why.** If both halves are written the same way, the state note grows back to its old size within a couple of weeks
and stops being readable in one go. The "what turned out to be false" block matters most: it stops the agent from
quoting yesterday's hallucination as a fact.

**How to apply.**
- State: a closed item is deleted (not marked "done"), a changed fact is rewritten, a refuted claim moves to a
  "Refuted" block with where it came from. Keep it under about 15K tokens.
- Log: new entries on top, heading `## ✅|⏳|⛔ YYYY-MM-DD — one-line summary`. Never edit old entries; if yesterday's
  conclusion was wrong, today's entry says so.
- Warning sign: two lines about the same thing with different dates in the state note. Someone appended instead of
  replacing.
- `vault lint` flags bloated state notes and logs that nothing links to.

### 5. Every note says when it was last updated and what is current

**Rule.** Each note carries `Last updated: **YYYY-MM-DD**` and, where there were several options, which one is in use
now.

**Why.** With many notes that age quickly, a note without a date can't be told apart from a stale one, and a note
that lists three approaches doesn't say which one actually runs.

**How to apply.** Update the date on every edit. Use absolute dates everywhere ("2026-11-13", not "yesterday").
`vault lint --dates` lists notes without the line.

### 6. Edit memory safely: snapshot first, add to fields instead of overwriting them

**Rule.** Before rewriting a large note, take a snapshot. Before changing a fact, read it. `src=` holds the source,
nothing else.

**Why.** In one cleanup pass the agent split four notes, edited ten facts and restarted the memory server. A review
found four mistakes: it had overwritten one fact's value and two facts' sources, detached three live sessions from
the server by killing it instead of restarting it, and attributed fact history to the user. Everything was restored
from the fact history and git. In another session, prices passed in double quotes lost their digits to the shell:
`"$243"` was saved as `43`.

**How to apply.**
1. `vault-commit --before <file>` before rewriting a note (snapshot in the vault's local git).
2. `vault fact get <id>` before `vault fact set <id> value=… src=…`. If the field is filled, extend it, don't replace it.
3. `src=` is where it is known from (screenshot, command, who said it). The reason goes to `why=`, the deadline to `ttl=`.
4. `by=` is whoever confirmed it. If you confirmed it yourself, write your own name, not the user's.
5. Restart the server with `vaultctl restart`. `vaultctl kill` deletes the session markers.
6. Pass values containing `$` in single quotes, then `vault fact get` and compare the digits.
7. After bulk edits: `git -C ~/claude-vault show --stat HEAD` and `vault issues`.

### 7. Don't "clean up" what the user put in the notes

**Rule.** Don't delete, move or redact content the user put into notes, credentials included, on your own initiative.
Report what you noticed; the user decides.

**Why.** Following a hint from an automated reviewer, the agent cut an application secret out of a note without
asking. The user had to put it back. A note can hold the only copy of something.

**How to apply.** Say it once, in one line ("note X contains a plaintext key; move it to a password manager?") and
leave the note as it is until the user answers.

### 8. Never write secret values into memory, facts or git

**Rule.** Memory stores the name of a secret and where it lives (password manager entry, env var name), never the
value. Don't print secret values in command output either.

**Why.** Memory is injected back into the context (the recall hook adds notes and facts to every prompt), and
anything in the context can be repeated in a reply, a commit or a log.

**How to apply.**
- `vault fact set` rejects values that look like credentials. Don't work around it; write "token rotated, stored in
  <manager>/<entry>" instead.
- Use tools that read a secret into a variable or the clipboard without echoing it.
- The vault's git repository stays local. `vault-commit` warns if it has a remote.

### 9. A task review reads every user message, not the ends of chats

**Rule.** When asked to collect all open tasks, go through all of the user's messages for the period, not the last
messages of each chat and not only the notes.

**Why.** The first full review (twelve agents, reading memory by area plus the last ~15 messages of each chat) lost
several tasks the user had mentioned in passing in the middle of conversations. The user had to point them out.

**How to apply.**
- Export every human message for the period with a script from `~/.claude/projects/*/*.jsonl` (`type: user`, not
  sidechain, not meta, not tool results), plus the "Pending Tasks" part of compacted-session summaries.
- Check each candidate against memory, then update the open-tasks note: add new items, delete finished ones.
