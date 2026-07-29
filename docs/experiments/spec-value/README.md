# Does a spec earn its place? — a controlled experiment, 2026-07-29

Raw results, kept without synthesis. The interpretation belongs to whatever process design is
written on top of them; what is here is the evidence.

## The question

A design in this repository is split into **foundations** — requirements (owner fiat), decisions
(choices with falsifiers), and facts (evidence about the world) — and a **spec** (`spec.md`, a prose
build document). The question was whether generating the spec earns its cost, *given that the
foundation set stays roughly the size it is now*. The foundation count is already at the edge of what
the owner can review by hand, so "the spec is redundant, just add forty more decisions" is not an
available answer: it trades a reviewable artifact for an unreviewable one.

## The protocol

Four designs were tested, each by an independent agent working from `origin/main`:

| design | why it was chosen |
|---|---|
| `minecraft/test-lib` | the largest and most behavioural |
| `minecraft/dev-kit` | build tooling — thick with exact paths and literals |
| `how-to-plan/spec-bundles` | a data-shape design, where prose most plausibly carries irreducible payload |
| `how-to-plan/doc-structure` | the format every other design is written in; two consumers, a checker and an author |

Each agent ran three phases, in order. **The ordering is the experiment.**

1. **Blind.** Read the brief, every binding requirement, every decision, and every cited fact — and
   write a concrete build plan. `spec.md` was off limits. Choices the foundations left open were
   marked `[CHOSE]`; genuine blockers `[BLOCKED]`. Those plans are in this directory, unedited.
2. **Read the spec.**
3. **Diff.** Classify every substantive statement as **(A)** changed my build, **(B)** confirmed what
   I had already derived, or **(C)** surplus — motivation and argument that changes nothing a builder
   does. Grade each (A) as *breaks the build*, *different-but-defensible*, or *cosmetic*. Then: could
   it have been a foundation instead, and would that be cheap?

Agents were told to be adversarial toward their own blind plans and not to claim in hindsight that
they would have derived something.

## Results

| design | (A) share | tier-one items | cost to relocate tier-one |
|---|---|---|---|
| `spec-bundles` | ~20% | 5 | 2 reworded entries + 1 new = **net 1** |
| `doc-structure` | ~10% checker / ~5% author | 5 | 2 decisions + 4 requirement edits |
| `dev-kit` | ~15% | 3 | 3 decisions |
| `test-lib` | ~10% | 6 | 4 new + 3 amendments |

Consistent across all four: **(B) is 55–60%** — the foundations restated in narrative order — and
**(C) is 25–40%**, changing nothing any builder does.

## Files

- `report-<design>.md` — each agent's Phase 3 report, verbatim
- `blind-<design>.md` — each agent's Phase 1 build plan, written before it saw a spec

## Two defects the experiment exposed

Recorded here because they are bugs in the foundations rather than findings about the format, and
they outlive this experiment:

- **`how-to-plan/doc-structure`** — `r:settled-design-cites-what-binds-it` (broad) and
  `r:status-derived-from-content` (narrow, "uncited live *design-scoped* requirement") contradict each
  other on the settle gate. `spec.md` restates both verbatim in different sections, reconciles
  neither, then picks the broad one in `## Invariants`.
- **`minecraft/test-lib`** — the spec pins three engine message strings (`Expected 2-3`,
  `triggerEvent`'s message, and four internal field names in the attribute errors) that no fact backs
  anywhere in the pool, against `r:engine-claims-are-sourced`.
