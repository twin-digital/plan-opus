# reload entry-shape probe — what a console reload does not re-evaluate

The dev-loop probe left one case unresolved: a script module that is a single file with no imports
did not re-evaluate on `send-command reload`, while a module with an import did. Those runs differed
in more than the import, so this probe varies exactly one thing.

Three module shapes, each deployed under its own pack uuid into an emptied pool, loaded by a
restart, then edited **only in `scripts/main.js`** and reloaded with a 60-second poll. The set runs
twice.

| shape | files | round 1 | round 2 |
|---|---|---|---|
| flat | `main.js` | NO | NO |
| noop | `main.js` importing an empty `noop.js` | NO | NO |
| graph | `main.js` importing `helper.js`, whose value it logs | NO | NO |

Every one of the six packs loaded — each logged its `LOADED` token at world load — so no case is a
deploy that silently failed. Every reload returned `Function and script files have been reloaded.`,
so the command reached the server. None of the six re-evaluated.

**The import graph is not the discriminator.** `graph` here is the same shape as the dev-loop
probe's E-series and it did not re-evaluate either. What separates the cases that re-evaluate from
the cases that do not is **which file changed**:

- an edit to a file the entry *imports* re-evaluates on reload — the dev-loop probe's E2, the
  standalone check beside it, and increment 007's `reload-edits-a-loaded-file`, whose edit was to
  `helper.js` and not to the entry
- an edit to the **entry file itself** did not re-evaluate, in 6 of 6 controlled cases here

The dev-loop probe's E1 is the one observation that points the other way, and it was not controlled:
the pack had been redeployed and restarted repeatedly in the same server session immediately before,
and the edit landed close enough to the world load that the load's own evaluation may have read the
edited file. This probe supersedes it for that claim.

## Why it matters

`r-2alueo3d` and `d-1w5rjhg6` bundle a pack's script module to a single file at the entry location
with its imports inlined. Every source edit in a pack this kit builds therefore reaches the server
as an edit to the entry file and nothing else — the one shape that did not re-evaluate here.

## What this probe does not establish

Why the entry file behaves differently, and whether any invocation other than `send-command reload`
re-evaluates it. The probe tests one command against one engine build, 1.26.40.8.
