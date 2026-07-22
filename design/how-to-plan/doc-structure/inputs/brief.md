# Brief — doc-structure

## What this design is for

Specify the artifact. Where designs live on disk, what a `design.md` contains, what shape
every entry takes, and what a citation means. Everything here answers "what can the format
express," not "how do I work," not "what makes the contents good," and not "what enforces
it."

## In scope

- The on-disk tree: scopes, areas, the inputs/output split.
- The `design.md` format: section order, the fenced data blocks, the prose.
- Schemas for decisions, open questions, components, facts, and requirements.
- Citation tokens: what they point at, and how a pointer resolves.
- The invariants an entry must satisfy, stated so a machine could check them.

## Out of scope

- Who decides what, when to abort, how the loop runs, where a design lives and settles —
  that is `process`.
- What makes the contents any good — whether a falsifier is real, when a claim needs a
  citation, what counts as evidence — that is `authoring`. This design provides the fields;
  authoring says what belongs in them.
- The checker, hooks, reviewers, and packaging — that is `harness`. This design says what
  must be true; the harness says what enforces it.

## Done looks like

An agent handed only a design's inputs can write a well-formed `design.md` for some other
subject without asking me how the format works — and a design that is well-formed but empty
of substance fails somewhere else, not here.

## Known tensions

- Schema economy against expressiveness: every field added is one more thing to maintain,
  and the schema has moved often.
- Legibility to a person against parseability by a machine, which the fenced-block split is
  a bet on rather than a settled answer.
