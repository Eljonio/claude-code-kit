---
name: synonyms
description: "Synonyms for vault-recall: what the user calls things (languages, abbreviations, slang) → concept → which facts and notes to bring up"
metadata:
  type: facts
---

# Synonyms for vault-recall

Last updated: **—**

Line format: `- canonical, variant, variant → target, target`. Targets are optional: fact ids (`vault fact ls`) or note
names; they get a strong boost when the concept appears in the prompt. Case and punctuation don't matter; word endings
are stripped automatically, but short words (3 letters or fewer) only match whole, so list every form.
Check an edit with `vault-recall --why "phrase"`.

## Examples (replace with your own)
- deploy, deployed, release, rollout, ship, shipped
- server, vps, box, prod, production
- open tasks, todo, backlog → project_open_tasks
