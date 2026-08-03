---
version: "7"
name: plan
description: Run the Plan phase for one increment — open it at the product's next number, work Clarify in the foundation sources, and loop Ratify through the increment's pull request until the owner declares it settled and the merge gate passes. Use when asked to plan an increment, run the Plan phase, or drive a product's design to a mergeable state in this repository.
---

# Plan an increment

You are driving one increment of `<product>` from creation to publish: Capture, Clarify, and
the Ratify loop. The normative rules are `docs/process-reference.md` (Capture, Clarify, Open
questions, Ratify, Publish is the merge); the content-quality rubric is `docs/authoring.md`;
this skill is the operational sequence. Validate every change with `npm run check`.

## 1. Capture — open the increment

- Create a branch holding the product's next increment
  (`products/<product>/increments/<NNN>/`, the next number in the sequence; the number is
  provisional until merge).
- Populate the requirements source directly with the owner. The increment's scope is nothing
  more than the changes its sources declare.
- Generate ids with `npx design-process id {r|d|q}`.

## 2. Clarify — work the foundation sources

Find the places missing research and do the spikes. Everything lands in the sources as it
happens:

- **facts** — what research finds, at the evidence bar: a documented upstream citation with a
  verbatim quote, or a test you ran with its artifacts and a recorded run under `evidence/`.
  Search `node bin/foundations.mjs --facts` and cite what exists before recording.
- **open questions** — `questions.yaml`, for an unknown you cannot answer, routed by `answer`
  (fact, decision, or requirement); raising one is a form of answering now, and beats a guess.
- **decisions** — the big-picture calls that follow from the requirements, entering
  `proposed`. The consumer-visible package set a build would need is proposed here too, as
  decisions: decomposition is design work.
- **contracts** — the shapes the design speaks about, bound through the model as they settle.

**Plan fixes the public shape only.** Structure below the package surface is the
implementer's; pre-deciding internal names and boundaries from the plan tier manufactures
churn. Working drafts under `drafts/` are optional scaffolding — raw material the fold
outranks.

## 3. Check before Ratify

Check every foundation against the closing checklist of `docs/authoring.md` before putting it
to the owner — the same checklist the post-Clarify review agents load as their rubric.
Finding nothing to raise is a successful review.

## 4. Ratify — the loop

Present the owner the projection (`npx design-process show <product>`) and the question list
through the increment's pull request. The owner rules each decision **accepted**,
**tolerated**, **delegated**, or **rejected** — a rejection carries the owner's reason and is
closed by a replacement whose `supersedes` names it. Apply the rulings, consume the feedback,
and raise what it surfaces; Clarify and Ratify iterate until the owner declares the increment
settled enough.

## 5. Drive to mergeable

The increment publishes by merging, and the gate runs there:

- no decision still `proposed`
- no open question still carried
- the number is the next in the product's sequence — on collision with a concurrent
  increment, the loser renames and recomputes against the fold that moved
- `npm run check` clean

## Bounds

- **Who settles a dispute** governs throughout — CLAUDE.md carries the rule. The collision to
  get right is a fact meeting a requirement: stop and ask.
- **Propose pinning with each decision** that fixes a public surface or a written format; the
  owner rules on both at once.
- Escalation brings a fact, not a preference — CLAUDE.md carries the bar.
