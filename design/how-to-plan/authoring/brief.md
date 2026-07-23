# Brief — authoring

## What this design is for

Specify what makes the *content* of a spec good — as distinct from its shape, which
`doc-structure` fixes. A spec is the primary document a builder builds from, so "good" means it
tells a builder what to build and how; this design says what that takes and how much of it. An
agent handed `doc-structure` can write a well-formed `spec.md`; it needs this one to write a good
one.

## In scope

- **The spec as a build document**: that it states what to build and how, with a minimum of
  *why* — a reason given only where a builder needs it to build the thing correctly.
- **Component boundaries**: how a design is cut into build units — that a component maps to one
  dispatchable build task, that the interfaces between them are pinned well enough for parallel
  build, and that the count stays bounded with serial dependencies marked. Where a boundary
  falls is the author's judgement, revisable in review but not by the builder.
- **Opening by orienting**: the Summary names what the design is, what it produces, and the
  problem it addresses, plus the constraint that most shapes it when a single one dominates,
  before any detail.
- **Not re-narrating the extracted lists**: the requirements, facts, and decisions are pulled
  out for review and for the builder's crib, so prose that merely restates them adds nothing.
- **Citation intent**: what must be cited and what must not, and how to tell which a claim is.
- **Evidence, and fact hygiene**: what counts as evidence for a fact and why a paraphrase does
  not; and the author's duty toward inherited facts — correct one proven wrong (a new evidenced
  fact, superseding the old) and record a foundational discovery as a fact rather than leaving
  it in the prose.
- **Falsifiers**: what makes one real rather than a box being ticked.
- **Unknowns**: that an unknown answerable now is answered now, and when one may instead be
  carried as a gate, a revisit condition, or an assumed fact.

## Out of scope

- Fields, files, scopes, and how a citation resolves — that is `doc-structure`, including a
  component's schema (its fields, and how `after` and `excludes` are written); this design judges
  only whether a component is well-drawn, not the shape it is written in.
- When work happens and who decides — that is `process`.
- What enforces any of it — that is `harness`, though most of this design is precisely
  what the harness *cannot* enforce.

## Done looks like

A competent implementer can build the right thing from a settled spec alone, and a reviewer can
see from the citations what the design rests on. Specs written months apart by different agents
come out consistent in shape and quality — not in personal style.

## Known tensions

- Almost nothing here is mechanically checkable, which is the definition of the boundary and
  also its weakness: these rules are enforced by a reader or not at all.
- Guidance that is too prescriptive produces stilted prose; too loose and it does nothing.
- Parallel build needs the interface between components pinned, but a component's only boundary
  fields are `responsibility`, `excludes`, and `after`; whether those can carry a real interface
  is a `doc-structure` question this design leans on but cannot settle.
