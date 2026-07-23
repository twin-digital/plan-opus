# Brief — authoring

## What this design is for

Specify what makes the *content* of a design acceptable, as distinct from its shape. The
format says a decision has a `falsified_if` field; this says what makes the value in that
field real rather than filler. An agent handed `doc-structure` can write a well-formed
spec.md; it needs this one to write a good one.

## In scope

- What must be cited and what must not, and how to tell which a claim is.
- What counts as evidence for a fact, and why paraphrase does not.
- What makes a falsifier real rather than a box being ticked.
- When an unknown is a gate, a revisit condition, or an assumed fact.
- How much prose is enough, and the discipline that keeps it honest.

## Out of scope

- Fields, files, scopes, and how a citation resolves — that is `doc-structure`.
- When work happens and who decides — that is `process`.
- What enforces any of it — that is `harness`, though most of this design is precisely
  what the harness *cannot* enforce.

## Done looks like

Two designs written months apart by different agents read as though the same person wrote
them, and a reader can tell which claims the design rests on from narrative, without being told which is
which.

## Known tensions

- Almost nothing here is mechanically checkable, which is the definition of the boundary and
  also its weakness: these rules are enforced by a reader or not at all.
- Guidance that is too prescriptive produces stilted prose; too loose and it does nothing.
