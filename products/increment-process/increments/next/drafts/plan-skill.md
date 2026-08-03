# The plan skill

Holding-ground draft for a future increment: a `plan` (or `clarify`) agent skill carrying the
Plan phase the way `.claude/skills/implement` carries Implement — Capture, Clarify, and the
Ratify loop as an operational sequence, dispatched rather than re-derived each session.

Content parked here from the dissolved `agent-guidance.md`, destined for that skill:

## The synthesis draft

Clarify's instrument is a written synthesis: connected prose arguing the increment from
capture to implementation. Write it to find what is missing — the paragraph that does not
follow is the decision not yet made. Before the increment publishes, run the remainder check:
every claim in the draft either cites a foundation or is extracted into a decision, a fact, or
an open question. Publish is allowed only at zero remainder. Polish is never the point;
extraction is. The draft freezes in the increment's `drafts/` folder at publish, as the record
of the argument rather than a second authority.

## Decide at the tier that has the information — the upward half

A plan-tier agent may not settle a detail an implementer will meet with better information.
Pre-deciding arbitrary names, shapes, and internal boundaries from the plan tier is how churn
is manufactured — the implementer discovers the constraint, contradicts the guess, and the
decision is re-made. Plan fixes the public shape only; structure below the package surface is
the implementer's.

## Sketch of the skill itself

- **Capture** — create the increment, populate the requirements source directly with the
  owner; scope is nothing more than what the sources declare.
- **Clarify** — spikes and research land as facts with evidence; the synthesis draft drives
  extraction; unknowns become `questions.yaml` entries routed by `answer` kind; big-picture
  decisions enter `proposed`.
- **Ratify** — present the owner the proposed set and the question list; apply rulings;
  iterate until the owner declares it settled; the gate holds until no `proposed` and no
  questions remain.
- Loads the authoring document as the rubric for statement, verification, decision, and model
  quality (per the authoring-document decision), and the projection
  (`design-process show`) as the owner's review surface.
