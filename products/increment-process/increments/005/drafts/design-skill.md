# The design skill

Raw material for the design skill — the agent-skill package that carries the Plan phase the way
`.claude/skills/implement` carries Implement: Capture, Clarify, and the Ratify loop as an
operational sequence. The normative rules stay in `docs/process-reference.md`; the authoring
document carries the content-quality rubric; this skill is the sequence an agent follows.

## Decide at the tier that has the information — the upward half

A plan-tier agent may not settle a detail an implementer will meet with better information.
Pre-deciding arbitrary names, shapes, and internal boundaries from the plan tier is how churn is
manufactured — the implementer discovers the constraint, contradicts the guess, and the decision
is re-made. Plan fixes the public shape only; structure below the package surface is the
implementer's.

## The sequence

- **Capture** — create the increment: claim the next number in the product's sequence on a
  branch, and populate the requirements source directly with the owner. Scope is nothing more
  than what the sources declare. Generate ids with `npx design-process id`.
- **Clarify** — find the places missing research and do the spikes. What research finds lands as
  facts at the evidence bar: a documented upstream citation, or a test the agent ran with its
  artifacts and a recorded run under `evidence/`. An unknown the agent cannot answer becomes a
  `questions.yaml` entry routed by `answer` — fact, decision, or requirement — rather than a
  guess. Big-picture decisions enter `proposed`; the package set a build would need is proposed
  here too, as decisions, since decomposition is design work. Working drafts under `drafts/` are
  optional scaffolding, raw material the fold outranks.
- **Review before Ratify** — check every foundation against the authoring document's closing
  checklist before putting it to the owner; the post-Clarify review gate's agents load the same
  checklist as their rubric. Finding nothing to raise is a successful review.
- **Ratify** — present the owner the projection (`npx design-process show <product>`) and the
  question list through the increment's pull request. Apply the rulings — accepted, tolerated,
  delegated, or rejected with the replacement superseding the rejected entry — consume the
  feedback, and raise what it surfaces. The loop repeats until the owner declares it settled
  enough.
- **Drive to mergeable** — the increment publishes by merging: no decision still proposed, no
  question still carried, the number next in the sequence, `npm run check` clean. On collision
  with a concurrent increment, the loser renames and recomputes against the fold that moved.

## Bounds

- Who settles a dispute governs throughout: build freely on facts, requirements, and published
  designs; decide collisions between proposed designs, and between a proposed design and a fact;
  stop and ask where a fact meets a requirement, or anything rests on an open question or a
  decision still proposed.
- Propose pinning together with each decision that fixes a public surface or a written format;
  the owner rules on both at once.
- Escalation brings a fact, not a preference — CLAUDE.md carries the bar.
