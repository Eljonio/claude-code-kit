# Subagents

How the main session hands work to other agents and takes it back. A subagent starts without the main session's
memory, so everything it needs has to be in the brief.

---

### 1. The session with the memory coordinates; the brief carries the context

**Rule.** In large work, the main session plans, briefs, accepts results and keeps memory. Execution goes to
subagents, each with a complete brief: paths, verified facts, prohibitions, the definition of done, and the boundary.

**Why.** Executor agents without memory got facts wrong ("another agent without memory talks nonsense", in the user's
words). The session that holds the context adds most value by writing precise briefs and checking results.

**How to apply.** A brief contains:
- the goal and why it matters;
- paths and the facts already verified (and a note that older memory is only a pointer);
- what is forbidden (outward actions, production scripts, heavy local jobs);
- the boundary: "do X and stop; do not start Y";
- a pre-mortem for any irreversible step;
- "your report must include a test for the checklist".
Exception: when the user explicitly says "do it yourself" for a task (typically one that depends on taste), do it in
the main session.

### 2. One agent, one piece that can be accepted or rolled back on its own

**Rule.** Split work so that each agent produces one change that can be checked and reverted independently. Changes
to the same place go one after another; independent pieces in different files can run in parallel under a written
contract.

**Why.** The agent made twelve edits to a landing page in a row by itself. The mistakes piled up and couldn't be told
apart, nobody could say which edit broke what, and the whole evening's work was rolled back. On another project, a
large build with independent modules, the user asked for the work to be split across several agents at once; four
agents in parallel, each with its own files and a shared contract document, worked well.

**How to apply.** Same files or same page: sequential, the next agent starts after the previous result is accepted.
Separate files with a written interface: parallel is fine. (The user gave both instructions in different situations;
this is the reading that reconciles them.)

### 3. Use agents when they beat a script

**Rule.** Before spawning subagents, answer: what will they give that a script or `grep` won't? Arithmetic, search
and statistics are scripts. Agents are for reading a lot of unstructured text in parallel, or for an independent
adversarial review.

**Why.** The agent launched a workflow of 30+ agents to analyze a trading bot. The user stopped it ("tokens are not
infinite"), and the same analysis was then done with six script-plus-grep calls. The user's criterion was explicit:
spending tokens is fine when agents produce a better result, not by default.

**How to apply.** Say in one sentence why you are spawning agents and roughly how many. Do your own part in parallel
instead of handing over everything.

### 4. Set the subagent's model and effort deliberately

**Rule.** Choose the model and effort for each subagent explicitly, or ask the user if they want to make that choice.
Mechanical work (scripts, tables, grep) doesn't need the strongest model; judgment and adversarial review do.

**Why.** Subagents without an override inherited the most expensive model and used several times more tokens than the
task needed; the user noticed and objected.

**How to apply.** Pass `model` and `effort` in the call. If you launch several agents at once, ask one question for
the whole batch.

### 5. Subagent results go to durable storage

**Rule.** Tell each subagent where to save its result (a project folder or the memory vault), and check after it
returns that the file is there.

**Why.** The session scratchpad is cleared with the session. Three of six research reports had to be reconstructed
from the agents' final messages.

**How to apply.** Put the output path into the brief. Never rely on the scratchpad for anything the user will want
later.

### 6. Don't touch the user's live desktop

**Rule.** Subagents use headless browsers and their own windows only. No clicking, typing or screenshots on the
user's screen without explicit permission in the brief.

**Why.** An agent clicked inside the user's live browser. The user may be working at that same screen at that moment.

**How to apply.** Write "headless only, don't touch the live desktop" into briefs for any agent that tests UIs.

### 7. Persistent agents keep a desk note

**Rule.** An agent that works on an area across sessions has a description (`~/.claude/agents/<name>.md`) and a "desk"
note in memory (`project/desk_<name>.md`) with current state, open tasks and what waits for the user's decision.

**Why.** An agent's context ends with its session. The desk note is how the next run knows what the previous one did,
without reading old transcripts.

**How to apply.**
- At the start: read the desk note in full, large notes only by section (`vault toc` → `vault show`).
- At the end: delete finished items from "open", add new ones, update the date; keep the desk under ~8 KB.
- Report to the coordinator: what was done and how it was checked, what failed and why, questions for the user as a
  list. If another agent's area is involved, write "hand over to <agent>: …" instead of doing it.
- Templates: [`templates/agent.md`](../templates/agent.md), [`templates/desk.md`](../templates/desk.md).
