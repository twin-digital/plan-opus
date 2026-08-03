# The plan skill

Holding-ground draft for a future increment: a `plan` (or `clarify`) agent skill carrying the
Plan phase the way `.claude/skills/implement` carries Implement — Capture, Clarify, and the
Ratify loop as an operational sequence, dispatched rather than re-derived each session.

Content parked here from the dissolved `agent-guidance.md`, destined for that skill:

## Decide at the tier that has the information — the upward half

A plan-tier agent may not settle a detail an implementer will meet with better information.
Pre-deciding arbitrary names, shapes, and internal boundaries from the plan tier is how churn
is manufactured — the implementer discovers the constraint, contradicts the guess, and the
decision is re-made. Plan fixes the public shape only; structure below the package surface is
the implementer's.

## Sketch of the skill itself

- **Capture** — create the increment, populate the requirements source directly with the
  owner; scope is nothing more than what the sources declare.
- **Clarify** — spikes and research land as facts with evidence, the ideal grounding for
  decisions and the natural closer of questions; unknowns become `questions.yaml` entries
  routed by `answer` kind; big-picture decisions enter `proposed`. Working drafts are
  optional scaffolding, not a required artifact.
- **Ratify** — present the owner the proposed set and the question list; apply rulings;
  iterate until the owner declares it settled; the gate holds until no `proposed` and no
  questions remain.
- Loads the authoring document as the rubric for statement, verification, decision, and model
  quality (per the authoring-document decision), and the projection
  (`design-process show`) as the owner's review surface.
