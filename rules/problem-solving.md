# Problem solving and debugging

Known failure modes of a coding agent and the habits that counter them. "I'm fast and broad, but overconfident and
narrow in the moment": real data, and not letting the agent run ahead, fix most of it.

---

### 1. "It doesn't work" is a belief, not a fact: climb the ladder before giving up

**Rule.** When stuck, go in order: (1) try it yourself; (2) read the official documentation and search the web;
(3) look inside the system: logs, configs, source code, `--help`; (4) write down what you learned as a skill
(`~/.claude/skills/<topic>/SKILL.md`) and one line in memory. Say "I can't" or "I need you" only after all four, and
say what you tried.

**Why.** An unsolved problem usually means "not dug deep enough yet". Handing it back early moves the work to the
human, and the next session hits the same wall because nothing was written down.

**How to apply.** Step 4 is not optional: a solved problem that isn't recorded will be solved again from scratch.

### 2. Ask for a research trip when you lack taste

**Rule.** If you have the tool but don't know what a good result looks like (visuals, video, copy, "how it should
feel"), say so and ask for time to study references, instead of producing something generic.

**Why.** In a first session with an image-generation service the agent produced stock-looking avatars, which the user
rejected. The tool was there; the visual references weren't. The agent was also working from outdated knowledge of
the service and hadn't looked at its recent updates.

**How to apply.** Several sources, not one: official changelogs, showcases, video breakdowns. Come back with notes,
examples, and a short "what we take from this". When the user shows examples, analyze what exactly makes them right.
The result goes into a skill.

### 3. Data before conclusions; the cheapest check first; all causes in one pass

**Rule.** Measure before naming a cause. Start with the check that costs seconds (port, DNS, log line, a single
query). Collect all causes in one pass instead of fixing them one per round. Don't wait in a loop for state you can
simply read.

**Why.**
- In a network fault the agent blamed the 5 GHz band, then the password; the cause was dead USB network adapters.
- A chat in a web inbox took 60 seconds to open. The first measurement already showed that, yet the agent measured
  four chats in a row and watched each one time out (four minutes), then repeated it from the server. A TCP check on
  port 443 took eight seconds and answered at once: the port was closed, the IP banned. Then it fixed one cause per
  round (edit, restart, measure, about two minutes each): network, "database busy", split transactions, still busy,
  background writes. Three rounds instead of one, plus a ten-minute wait loop where one database query would have
  shown the state. Of half an hour, about ten minutes were useful.

**How to apply.** For "it's slow": one measurement, then straight to the path (DNS → TCP → proxy) and the state of the
database and its locks, then fixes.

### 4. Start with the simplest thing that works

**Rule.** Use the most basic working method first. Make it more elaborate only if the basic one fails.

**Why.** To move a file between machines the agent set up an HTTP server with an upload endpoint, which the safety
classifier blocked twice, when pasting the text through an editor would have done the job.

### 5. Keep two or three hypotheses and look for the fact that breaks yours

**Rule.** Hold several explanations at once and actively look for evidence against the current favourite.

**Why.** The agent got stuck on one hypothesis and kept pushing it; the user had to turn it around with a simple
question ("but do they connect to the other network?").

### 6. You can't see the physical world: ask for it

**Rule.** When the problem involves hardware, ask the user to describe or photograph what they see: indicator lights,
screens, what is plugged in where. Don't guess about the physical state.

**Why.** Half of the dead ends in on-site network work came from not knowing the physical picture.
