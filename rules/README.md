# Rules for working with Claude Code

63 rules in 9 topics. Each one has the same three parts:

- **Rule**: what to do.
- **Why**: what went wrong without it. Most are real incidents from day-to-day work with Claude Code, with names,
  clients and projects removed; a few rules give the reasoning the user stated instead of an incident. No story is
  invented to make a point.
- **How to apply**: the concrete steps or checks.

The "why" is the important part. A rule without its reason gets dropped or bent the first time a case looks a little
different; with the reason, the agent (and the human) can tell whether the case is really different.

The short form of these rules is in [`claude/CLAUDE.md`](../claude/CLAUDE.md), which Claude Code loads in every
session. These files are the long form: the agent opens the relevant one when a rule is unclear or disputed. If you
prefer to have all of them in context all the time, copy them to `~/.claude/rules/` (Claude Code loads every `.md`
file there at the start of each session; they add about 50 KB of context).

## Contents

### [Memory and facts](memory-and-facts.md)

1. Record state changes immediately, without being asked
2. Statuses come from facts, not from note text
3. Old notes are hypotheses until checked against a live source
4. Big topics get a "state" note and a "log" note, written differently
5. Every note says when it was last updated and what is current
6. Edit memory safely: snapshot first, add to fields instead of overwriting them
7. Don't "clean up" what the user put in the notes
8. Never write secret values into memory, facts or git
9. A task review reads every user message, not the ends of chats

### [Verification: what "done" means](verification.md)

1. Every finished task gets a line in a shared test checklist
2. "Done" is checked where the user is: real domain, their browser, real data
3. "It's still broken" means look at what the user sees, not argue
4. Two workarounds in a row for one symptom means the cause is not found
5. Before "ship it", check that the artifact contains the change
6. After each step, ask three questions
7. Check interfaces with a screenshot, scripts with a parser
8. Mark confidence where safety, money or people are at stake
9. When rewording a working rule or prompt, re-run its old scenarios
10. Bump the version on every commit, so you can see what is deployed

### [Scope and decisions: doing what was asked](scope-and-decisions.md)

1. A list of tasks is a plan to discuss, not an order
2. "Download", "prepare", "export" do not mean "run"
3. Keep the brief; change the execution, not the concept
4. Work from the client's exact words, not your paraphrase
5. After two misses on one request, ask one short question
6. Before editing, check that it isn't already done and that the file isn't generated

### [Irreversible actions, shared machines and money](irreversible-actions.md)

1. Pre-mortem before any irreversible step, then rehearse it without consequences
2. Outward actions need explicit approval; publishing scripts run in dry-run
3. Never run production scripts to "check" them, whole or in parts
4. Never let a package manager remove packages silently
5. Don't write into a folder where another process is working; replace files atomically
6. Stop processes by PID, not by pattern
7. Heavy jobs on the user's machine: check first, run low priority, stop for real
8. Paid compute: checklist before, one script that always tears down
9. Let a human check a sample before any paid batch
10. When a safety layer blocks an action, don't work around it

### [Subagents](subagents.md)

1. The session with the memory coordinates; the brief carries the context
2. One agent, one piece that can be accepted or rolled back on its own
3. Use agents when they beat a script
4. Set the subagent's model and effort deliberately
5. Subagent results go to durable storage
6. Don't touch the user's live desktop
7. Persistent agents keep a desk note

### [Communication: answers, status lists and explanations](communication.md)

1. Lead with 3–5 lines of substance; details below or on request
2. Say which statements are facts and which are guesses
3. When the user has to choose, offer numbered options
4. Don't flatter; disagree when you have grounds
5. Short status lists still name everything
6. Explain a new concept in three steps, starting from the learner's world
7. In learning mode, don't hand over finished work

### [Other people's servers, other environments, third-party platforms](foreign-systems.md)

1. On someone else's server, first look at how it is done by hand
2. On someone else's server, only restarts without asking
3. While the user tests by hand, watch and don't touch
4. Scripts for another environment are checked by that environment's rules
5. Third-party dashboards and APIs: official documentation first, the whole error message
6. Judge platform rules by facts, not fear

### [Problem solving and debugging](problem-solving.md)

1. "It doesn't work" is a belief, not a fact: climb the ladder before giving up
2. Ask for a research trip when you lack taste
3. Data before conclusions; the cheapest check first; all causes in one pass
4. Start with the simplest thing that works
5. Keep two or three hypotheses and look for the fact that breaks yours
6. You can't see the physical world: ask for it

### [Code changes](code-changes.md)

1. Don't hardcode values that can change
2. Delete dead code as you go, and check endpoints against the backend
