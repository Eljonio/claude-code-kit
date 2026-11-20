# Irreversible actions, shared machines and money

Rules for steps that can't be undone with `git revert`: production, publishing, package managers, processes, paid
compute.

---

### 1. Pre-mortem before any irreversible step, then rehearse it without consequences

**Rule.** Before stopping production, deleting, switching over or disabling anything: ask what can fail at this step,
run that part in advance without consequences, and only then take the step.

**Why.** During a production move, the migration script checked only access. The agent stopped the old production,
and only then did the database dump fail on a row-level security setting (`FORCE ROW LEVEL SECURITY`): about five
minutes of downtime. A person would have made a trial dump while production was still running. The user's
observation: on a familiar task the agent follows the plan in a straight line and only branches after something fails,
not before a risky step.

**How to apply.**
1. What can fail here?
2. Rehearse it: a dump while production is live, `--dry-run`, a run on a copy.
3. Then the real step.
For subagents, write the pre-mortem into the brief.

### 2. Outward actions need explicit approval; publishing scripts run in dry-run

**Rule.** Sending, publishing, deploying, paying and deleting happen only with the user's explicit approval for that
action. Scripts that publish are tested with their dry-run mode, and the "real" switch needs two independent signals.

**Why.** While "checking" a publishing script, an agent passed the `--go` flag by mistake and posted a draft story to
a live social media account. After that, the script required both an environment variable and the flag.

**How to apply.** "You approved it yesterday" doesn't count. Each outward action gets its own confirmation.

### 3. Never run production scripts to "check" them, whole or in parts

**Rule.** Deploy and install scripts are checked with `bash -n`, on a mock host or with a fake `HOME`, never by
running them or pieces of them against the real target.

**Why.** An agent tried to test one part of an installer by extracting it with `grep`/`sed`. The pattern didn't
match, the whole production install script ran, and code went to production without anyone asking for it.

**How to apply.** Put this sentence into every subagent brief that touches such scripts: "Do not run deploy/install
scripts, not even partially; check them with `bash -n` or on the mock."

### 4. Never let a package manager remove packages silently

**Rule.** Install system packages with `apt-get install --no-remove` (or simulate first with `-s` and read the
`Remv` lines). Be most careful with dependency lists copied from someone else's install guide.

**Why.** Dependencies for a desktop application were installed from a guide with `apt-get install -y`. The list
included `fuse` (FUSE 2), which conflicts with `fuse3` on Ubuntu 24.04. apt agreed silently and removed a cascade
that ended with `ubuntu-session`. The display manager found no session files, crashed in a restart loop, and the next
boot showed a black screen. The running session hid the damage until that reboot, about an hour and a half later.

**How to apply.** With `--no-remove`, apt fails instead of removing anything. Red flags in old guides: `fuse`,
`libgl1-mesa-glx`, `libssl1.1`, pre-`t64` package names.

### 5. Don't write into a folder where another process is working; replace files atomically

**Rule.** Before running something that writes output, check that no other run (yours or a subagent's) writes to the
same place. Write to a temporary file and move it into place after checking it.

**Why.** The agent started a render while a subagent was re-rendering in the same folder. Both runs wrote the same
video file, and the file handed to the user was corrupt.

**How to apply.** `ps` for running jobs first; `cp → .part → check → mv`.

### 6. Stop processes by PID, not by pattern

**Rule.** Don't use `pkill -f <pattern>` or `pgrep -f <pattern>` to stop or wait for your own jobs. Use the PID
(`$!`), or find it with `ps` and an exact path.

**Why.** `pkill -f` matched the agent's own shell, whose command line contained the same pattern, and killed it.
A wait loop built on `pgrep -f` kept finding itself and never ended. A `kill -STOP` by pattern once froze the
agent's own shell.

**How to apply.** Keep the PID when you start a job. If you must search, match the full path of the binary or script.

### 7. Heavy jobs on the user's machine: check first, run low priority, stop for real

**Rule.** Before each heavy job (speech recognition, video encoding, builds, simulations) check what the user is
running. Run with low priority and limited parallelism. To stop a subagent's job, stop the agent; don't send it a
message.

**Why.** The agent and its subagents ran speech-recognition models on the CPU, and on another day several simulations
in parallel, while the user was playing a game: the frame rate dropped to 10–20 fps. A "stop" message did not help in time, because an agent
reads messages only at its next step, and the agents restarted the job before that. The user also starts working in
the middle of a long job, so a check at the start is not enough.

**How to apply.**
- Before *each* heavy run: look at the top CPU consumers (`ps -eo pcpu,comm --sort=-pcpu | head`).
- `nice -n 19`, at most two in parallel, the smallest model that does the job.
- To pause without losing work: `kill -STOP <pid>`, later `kill -CONT <pid>`.
- To stop a subagent: the hard stop of your tool (for example `TaskStop` in Claude Code), not `SendMessage`.

### 8. Paid compute: checklist before, one script that always tears down

**Rule.** Before renting paid compute (GPU servers billed by the hour), check inputs and price with the user, and run
the whole session as one script: start, work, shut down, fetch results, notify.

**Why.** Over two days, two processing runs produced nothing useful, a server sat idle while the agent waited, and
tunnels and local proxies were left running for eleven hours afterwards. Billing counted every clock hour that each
server touched.

**How to apply.**
1. Before: the job really has new input, there is enough disk, required files are in place, the price and a ceiling
   are agreed. If billing is per clock hour, start right after the hour begins.
2. One background script with no manual step in the middle. The server enforces its own time limit and deletes
   itself; watchers on the laptop are only a backup (laptops sleep and lose network).
3. Wait on a PID or a marker in a log. Parse the top-level health field: a nested `"ready": true` once produced a
   false "ready".
4. "Finished" only from an exit marker or summary on disk, not from "the server is gone".
5. After: close tunnels and proxies, remove temporary firewall rules, check the balance.

### 9. Let a human check a sample before any paid batch

**Rule.** Before paying for processing or training on a dataset, give the user a small sample to review (a page with
A/B comparisons and checkboxes). Pay only after they approve it.

**Why.** A paid processing run over a speech dataset produced clips the user, a native speaker, rejected by ear in
five minutes: clicks after every phrase, words cut at the edges, the liveliness gone. The automatic quality gates (two
speech recognizers, alignment scores, a perceptual quality model) passed all of it.

**How to apply.** 10–40 items, original next to processed, a checkbox per defect type. Process as little as possible.

### 10. When a safety layer blocks an action, don't work around it

**Rule.** If Claude Code's permission system or a classifier blocks an action, don't retry it in pieces, don't
rephrase it to slip through, and don't switch to another model. Collect everything that is blocked into one command or
script with a description (what it does, where it writes, what it costs) and bring it to the user.

**Why.** In auto mode the classifier silently blocked spending money, personal data and network access to production,
and work stopped without explanation. In manual mode every small command needed a click. One reviewed command is
easier for the user to approve than a stream of separate prompts.

**How to apply.**
- Subagents: "if blocked, don't work around it; write one script, don't run it, return its path and description".
- If the task is legitimate and still refused, explain the context with facts; if it stays blocked, it goes to the
  user, not to a different model.
- Long jobs run as one background script with a log, so there are few approval prompts.
