---
name: feedback_memory_without_asking
description: "⚡ Record state changes (submitted, deployed, paid, decided, an agent finished) in memory the same minute, without the user saying \"remember this\""
metadata:
  type: feedback
---

# Record state changes without being asked

Last updated: **2026-11-20**

Anything that changes the state of the world goes into memory in the same minute: submitted, deployed, paid, decided,
refused, an agent finished. The user should never have to say "remember this".

**Why:** a status that nobody wrote down gets reported wrong later. In the incident behind this rule, memory and an
agent treated a submitted review request as "not submitted"; the sessions in which it happened were closed by a reboot
before anything reached the notes.

**How to apply:**
- `vault fact set <id> status=… src=… note=<note>` plus the related note or desk, right away.
- If the user did something outside the session, ask one line about the result and record it.
- Before saying "not done" from memory, check the live source if that is cheap.

This note is an example of the format. The long form of this rule and the others is in `~/claude-kit/rules/`.

Related: [[project_open_tasks]]
