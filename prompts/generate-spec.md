# Generate a spec (with review)

You are an **orchestrator**. Given a design folder, you produce a review-clean spec by delegating
the heavy work — writing, reviewing, revising — to sub-agents, and holding only the loop and the
verdicts yourself. Keep your own context lean: you read summaries and finding lists, never whole
specs. That discipline is the whole point; it is what lets the loop run several rounds without
your context filling.

**Target.** A design `<area>/<design>` whose `design/<area>/<design>/` holds `brief.md`,
`requirements.yaml`, `facts.yaml`. The output is `spec.md` + `decisions.yaml` beside them.

---

## Set up

Confirm the three input files are present. Give yourself a worktree and branch off `origin/main`
(the workspace step in `prompts/write-design-doc.md`). Every sub-agent works in that worktree, on
that branch.

---

## Wave 1 — generate

Dispatch a **writer** sub-agent to produce `spec.md` + `decisions.yaml` by following
`prompts/write-design-doc.md` for the target — conforming to `doc-structure` (format) and
`authoring` (content). It returns only once `npm run check` is green. From it you keep the branch
state and a one-paragraph summary of what it produced; you do not read the spec yourself.

---

## Waves 2..n — review, then revise

Loop, up to **3 rounds**:

1. **Review.** Dispatch the review in `prompts/review-spec.md` against the target. Collect its
   verdict and its verified findings, split into *spec-level* and *design-level*.
2. **Clean?** If the verdict is clean, stop the loop.
3. **Revise.** Dispatch a **reviser** sub-agent with the confirmed *spec-level* findings only. It
   applies each fix and returns with `npm run check` green again. It must **not** silently touch a
   *design-level* finding — a wrong requirement, accepted decision, or fact is the owner's to
   settle.
4. **Escalate and stop on design-level findings.** If review surfaces a design-level finding, stop
   the loop and hand off with it flagged — the inputs need the owner before regeneration is worth
   another round.
5. Re-review.

If spec-level findings still stand after the round cap, **stop and hand off with them listed.** Do
not loop forever, and never lower the bar or delete a foundation to force a pass — a spec that
cannot pass honestly is a finding, not a failure to hide.

---

## Hand off

Open a pull request against `main` per `write-design-doc.md`'s hand-back — the PR body is the
writer's hand-off (what the spec designs, the decisions made and what would settle each, anything
underspecified, open questions). Append a short **review log**: the rounds run, what each
surfaced, which findings were fixed, and any design-level finding escalated to the owner.

The spec lands as a **draft**: decisions `proposed`, any open question open, so nothing is built
on it until the owner clears the list.

---

## Orchestrator discipline

- **Dispatch, don't do.** You never write or review a spec yourself; you spawn the agent that
  does and keep its verdict.
- **Carry verdicts, not content.** Across rounds you hold the finding summaries and the
  pass/fail, not the spec text. Each sub-agent's detailed context dies with it.
- **One writer, N reviewers, one reviser per round.** The reviewers fan out (they are independent
  by design); the reviser is single so the fixes stay coherent.
