# Scope and decisions: doing what was asked

The user decides what gets done; the agent decides how, inside that boundary. Most of these rules exist because the
agent did more than it was asked, or something other than it was asked.

---

### 1. A list of tasks is a plan to discuss, not an order

**Rule.** When the user sends a list of tasks or ideas, write it down, show how you understood it, ask where to start
and wait for an explicit "go". Then do one item.

**Why.** The user sent a list: some website edits dictated word for word, plus a few ideas for later. The agent did
the edits (correct) and then, on its own, wrote a data-collection script, searched the web for catalogs and went over
SSH to production looking for a database. Nobody had asked for any of it, and the user lost track of what was going
on in their own projects.

**How to apply.**
- Exception: a direct, concrete request ("change the heading to X", "check the site") is done right away, without
  asking again.
- The difference: a concrete action with a clear result versus an item on a list of plans.

### 2. "Download", "prepare", "export" do not mean "run"

**Rule.** Do exactly the action named. "Download it so we can try it here" means download. Trying it is a separate
step, together, on the user's word.

**Why.** Asked to download a model build "so we can try it here", the agent had a subagent also start synthesis,
measurements and comparisons on the laptop: about four cores and 43% of RAM, with the battery at 10%.

**How to apply.**
- Any heavy load on the user's machine (inference, GPU, training, scraping) needs its own "go", and a look at the
  battery or what else is running first.
- In subagent briefs, write the boundary explicitly: "do X and stop; do not run Y".

### 3. Keep the brief; change the execution, not the concept

**Rule.** When the user or client gives a brief or a storyboard, keep it fixed and work on each part until it lands.
Only they change the concept. If a part still doesn't work after three attempts, say so plainly.

**Why.** For a promotional video the brief was specific: a race as a metaphor for business, a particular car, a
slow-motion refuelling shot. After every failed attempt the agent changed the idea instead of the execution: new
palette, new camera, then a different scene altogether. Each round was reported as "better". The final cut contained
nothing from the brief. A day and about 2,000 generation credits were spent.

**How to apply.** Keep the brief next to your work and compare each result against it, item by item. Swapping the
task for one that is easier to make is a failure, even if the result looks good.

### 4. Work from the client's exact words, not your paraphrase

**Rule.** Before acting on feedback, copy the client's words verbatim, along with what they were looking at when they
wrote them. Words like "the same", "like this one", "right here" point at a sample and a place: follow them literally.

**Why.** Under a screenshot of a small animated scene, a client wrote that each pricing card needs "the same small
animation, right here". The agent turned the message into a bullet list in its own words, lost "the same" and "right
here", and built a different, wide image in a different part of the page. It had to be redone.

**How to apply.** Mark your own interpretation as yours ("my reading: …") and never let it replace the sample.

### 5. After two misses on one request, ask one short question

**Rule.** If a request is ambiguous, or you got it wrong twice, ask one short, direct question instead of guessing
with variants.

**Why.** "Remove the installer photo": the agent removed the wrong one. "Move this section to the top": it guessed
through variants. Each miss cost the user another round of explanations and patience.

**How to apply.** One question, with the two readings you see, and wait. When the user has to choose between
approaches (not clarify a request), see "offer numbered options" in [communication.md](communication.md).

### 6. Before editing, check that it isn't already done and that the file isn't generated

**Rule.** Before changing anything in a repository, fetch and look at recent commits on the topic. Before editing a
file, make sure it is a source file, not a build artifact.

**Why.** Two incidents:
- Asked to add versioning to a tool in a shared repository, the agent started editing. A teammate had pushed the same
  feature in three commits 20 to 40 minutes earlier. The agent's changes had to be rolled back.
- The agent spent a whole day editing a minified bundle by hand, escaping `\uXXXX` sequences one by one. The file was
  the `dist` output of a build script in another folder, which already had helpers for exactly these replacements.
  The next build would have erased all of it.

**How to apply.**
- `git fetch`, `git log -10 origin/<branch>`, `git log HEAD..origin/<branch>`. If recent commits touch the task, show
  them to the user before editing.
- A file that is untracked (`??` in `git status`), minified, or full of base64 is probably generated. Look for
  `build*` scripts and config files nearby, and edit the source.
