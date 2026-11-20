# Code changes

Small habits for editing code that came out of repeated cleanup work. See also
[scope-and-decisions.md](scope-and-decisions.md#6-before-editing-check-that-it-isnt-already-done-and-that-the-file-isnt-generated)
(check that it isn't already done, edit the source and not the build output) and
[verification.md](verification.md#10-bump-the-version-on-every-commit-so-you-can-see-what-is-deployed) (version bump).

---

### 1. Don't hardcode values that can change

**Rule.** URLs, hosts, IDs, names, counts and paths go into environment variables, parameters or config, or are
looked up at run time.

**Why.** The user noticed a pattern: the agent kept hardcoding URLs, IPs, IDs and names, and each one had to be fixed
later by hand.

**How to apply.** For every literal, ask "can this change?". If yes, move it out.

### 2. Delete dead code as you go, and check endpoints against the backend

**Rule.** When rewriting a component, remove imports, files and branches that are no longer used, in the same change.
When a frontend calls an endpoint, find that route in the backend.

**Why.** The user asked for this explicitly during a frontend rewrite: leftovers ("styles copy.css", "*.backup",
unused imports) slow the build and clutter the tooling, and a frontend URL copied from memory that doesn't match the
backend breaks production.

**How to apply.**
- After editing a file, check its imports. If you removed the last user of a file, `grep` for other importers and
  delete it.
- For every new or changed `fetch('/path')`, grep the backend for the route.
- If unsure whether something is used, ask instead of assuming.
