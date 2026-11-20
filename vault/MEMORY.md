# Memory Index

## How to use this memory
- **Statuses come from facts.** Before "done / submitted / deployed": `vault fact get <id>` or `vault-recall "<phrase>"`; notes lag behind.
- **State changed** → `vault fact set <id> status=… src=… note=<note>` right away, without being asked.
- Search: `vault find` → `vault toc` → `vault show <note> '#section'`; never read files over 40 KB whole. What to fix: `vault issues`.
- One line per note, under ~200 characters. Claude Code loads only the first 200 lines / 25 KB of this file.
- Service files: all facts in `facts/FACTS.md` (generated) · recall dictionary [[synonyms]] · pins for the short index [[memory-pins]]

## Start here
- [project_open_tasks](project/project_open_tasks.md) — every open task: what, for whom, deadline, what waits for a decision
- [project_test_checklist](project/project_test_checklist.md) — how each finished task is checked, who checks, result

## User

## Feedback — how to work
- [feedback_memory_without_asking](feedback/feedback_memory_without_asking.md) — ⚡ record state changes the same minute, without "remember this"

## Project

## Reference
