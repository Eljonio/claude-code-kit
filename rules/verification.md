# Verification: what "done" means

The agent optimizes for a fast answer unless something stops it. These rules make "done" mean "checked where the
user will see it".

---

### 1. Every finished task gets a line in a shared test checklist

**Rule.** When a task is finished (by you or by a subagent), add a line to `project/project_test_checklist.md`: what
was done, the date, how to check it (command, action, expected result) and who checks it.

**Why.** Tasks kept being "done" in words and then turned out not to work: a chatbot's search limit was left at 3,
and an outgoing-message pipeline stopped on an unpaid bill and nobody noticed for six days.

**How to apply.**
- Check what you can yourself right away (read-only commands, API calls, `curl`) and mark the line with the date.
- What needs the user (sending a real message, clicking in a dashboard) is marked for them and brought up at the next
  review.
- A failed check stays in the list with ❌ and the reason; the task goes back into work.
- Put "your report must include a test for the checklist" into every subagent brief.

### 2. "Done" is checked where the user is: real domain, their browser, real data

**Rule.** Before saying "done", check on the live domain, in the user's browser and settings, against real data or a
copy of production. Local checks are necessary, not sufficient.

**Why.** Two separate failures:
- The agent checked a landing page with headless Chromium from `file://` and reported "all fine". On the live
  domain, behind a CDN that rewrote parts of the page, it was broken in the user's browser (Firefox). Another time the
  user's system was in dark mode and the agent compared light-mode screenshots, so it "saw no change".
- An overnight agent fixed 18 small UI issues in a CRM, with all tests green and a demo stand full of made-up data.
  Nobody ran the main scenario (message comes in, see who it is, reply, set the next step) on the real lead list.
  In the morning the main screen was unusable: weeks-old chats on top, old leads above new ones.

**How to apply.**
- Web: the production URL, the user's browser, their color scheme, a real scroll.
- Data-heavy features: a stand seeded with a copy of production (counts, dates, order after imports), plus a
  screenshot of the main screen.
- Green tests are evidence, not the definition of done.

### 3. "It's still broken" means look at what the user sees, not argue

**Rule.** When the user says it still doesn't work, first look at exactly what they see (ask for a screenshot or open
the same screen), then fix.

**Why.** The agent answered "it's correct on the server" three times in a row. It was technically right and useless:
the page was cached with `max-age=300`, so the user kept seeing the old copy. In another case the user said "I can't
see all the leads" about ten times; each time the agent fixed its own guess (sort order, a 500-row limit, collapsed
groups). The real cause was on the screen the whole time: a remembered "Mine" filter showing "0 of 586".

**How to apply.** The first response to "still broken" or "I don't see it" is a request for a screenshot or a look at
the same screen, with the same account and the same cache state.

### 4. Two workarounds in a row for one symptom means the cause is not found

**Rule.** If you are about to add a second patch for the same symptom, stop and find the root cause.

**Why.** Page sections kept jumping to the top. The agent added code that restored the position, then a watchdog that
re-checked it every frame for 15 seconds. Neither helped: the cause was a hydration mismatch, triggered by the CDN
rewriting an e-mail address in the HTML. Once that was fixed properly, both patches had to be removed.

**How to apply.** Write down what the first patch was supposed to prove. If the second one is "more of the same",
go back to data: logs, the actual HTML the user receives, a minimal reproduction.

### 5. Before "ship it", check that the artifact contains the change

**Rule.** Before telling the user to deploy or upload, confirm the built file that will be shipped contains the fix.

**Why.** The agent said "deploy", but the rebuilt file had not been copied into the project. The previous version
went out and the user lost another round.

**How to apply.** grep the artifact for the change, compare checksums, or look at the version string inside it.

### 6. After each step, ask three questions

**Rule.** After every finished step: How will this break in real use? Is it worth it? How else could it be done?

**Why.** On a field tool used to audit sensors on floor plans, this loop caught two problems before the user did:
re-drawing the plan after each audit mark would have reset the zoom (painful when checking fifty sensors in a row),
and the audit marks would have been lost when the browser storage was cleared, so they were added to the export.

**How to apply.** Keep the answers short; act on the first question, and don't over-build because of the third.

### 7. Check interfaces with a screenshot, scripts with a parser

**Rule.** A UI is verified by a screenshot (headless browser), not by reading the code. JavaScript gets `node --check`
before publishing, shell scripts `bash -n`, PowerShell the real parser.

**Why.** Reading the code didn't show a tooltip covering a heading; a headless screenshot did.

**How to apply.** Render temporary variants of the page (initial state switched by a parameter) to see states that
need clicks. Take screenshots in the color scheme the user actually uses.

### 8. Mark confidence where safety, money or people are at stake

**Rule.** When a statement affects safety, money or people, label it: 🟢 checked against the primary source,
🟡 my reading, 🔴 general knowledge, not checked.

**Why.** On a tool for a fire-alarm installation the user asked for this explicitly: lives depend on it, so every
fact has to be traceable to the project documents, not to the agent's memory.

**How to apply.** Put the label next to the claim, not in a footnote. A 🔴 on anything critical means "verify before
acting".

### 9. When rewording a working rule or prompt, re-run its old scenarios

**Rule.** Changing the wording of an instruction that already works (a system prompt, a rule in a config) requires
re-running the scenarios that rule was written for, not only the new case.

**Why.** The agent rewrote a working chatbot rule "for clarity", from "answer in the language of the last message"
to "answer in the language the customer writes in". The bot started answering English messages in Russian. It was
caught only in a live chat.

**How to apply.** Keep a small set of scenarios per rule and run them after every edit of that rule.

### 10. Bump the version on every commit, so you can see what is deployed

**Rule.** Every commit increments the patch version (`package.json`, the lock file, and any place the version is shown
in the UI). The version is visible from outside (page, `/api/version`, a badge).

**Why.** Without it, after a deploy you can't tell whether the fix is live or the browser is serving a cached bundle.

**How to apply.** Check the version on the live site as part of rule 2.
