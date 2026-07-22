# Brief — doc-structure

## What this design is for

Specify the artifact. Where designs live on disk, what a `design.md` contains, what shape
every entry takes, and what a citation means. Everything here answers "how is a design
written down," not "how do I work" and not "what enforces it."

## In scope

- The on-disk tree: scopes, areas, the inputs/output split.
- The `design.md` format: section order, the fenced data blocks, the prose.
- Schemas for decisions, open questions, components, facts, and requirements.
- Citation tokens: what they point at, what they oblige.
- The invariants an entry must satisfy, stated so a machine could check them.

## Out of scope

- Who decides what, when to abort, how the loop runs — that is `process`.
- The checker, hooks, reviewers, and packaging — that is `harness`. This design says what
  must be true; the harness says what enforces it.

## Done looks like

An agent handed only a design's inputs can write a valid `design.md` for some other
subject without asking me how the format works, and a reader can tell whether a claim is
load-bearing without reading the whole document.

## Known tensions

- Schema economy against expressiveness: every field added is one more thing to maintain,
  and the schema has moved often.
- Legibility to a person against parseability by a machine, which the fenced-block split is
  a bet on rather than a settled answer.
