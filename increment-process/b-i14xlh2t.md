---
tags:
  - evidence
  - process-doc
---

# Evidence artifacts should not live inside increment folders

An increment's probe artifacts sit at
`products/<product>/increments/<NNN>/artifacts/<probe>/`, and the runs in `evidence/` reference
those paths. Every landing renames the directory — `wip-<NNN>-<slug>` becomes the claimed
number — so every landing breaks every reference into the increment it is landing.

This is now structural rather than occasional. Before `d-x0q4xgd8` a draft could be authored
directly at its number; now the rename happens on every increment that carries a probe.

It has already gone wrong twice while landing 013 and 014:

- The run's `command` and `output` paths in `evidence/` must be repointed by hand, and nothing
  checks that they still resolve until the legacy checker runs.
- The probe script itself often names the increment path internally.
- **A blanket find-and-replace corrupts evidence.** A fact's quote can contain the old path as
  part of the recorded output, and that text is history — it must not be updated to match the
  new location. Landing 013 rewrote a path inside a verbatim quote and the checker caught it
  as "quote not verbatim at its source"; landing 014 only avoided it by checking the quote
  explicitly first.

The obvious shape is to key artifacts by run id rather than by increment — somewhere stable
like `evidence/artifacts/<run-id>/` — so that a run's `output` path never moves and the landing
rename touches nothing outside the increment's own sources.

Worth weighing when this is planned:

- CLAUDE.md's fact bar names `artifacts/` and `evidence/` together; moving artifacts changes
  where an agent is told to put them.
- Existing increments hold artifacts at the old location. Decide whether they move, or whether
  the new rule applies going forward and both shapes resolve.
- `d-nzba0wqu` puts drafts under the increment. Artifacts are not drafts — they are the inputs
  and captured outputs a fact rests on, and they outlive the increment that produced them,
  which is the argument for pooling them with the runs that cite them.
- A check that every run's `output` path resolves would have caught all of this at the gate
  rather than at review.
