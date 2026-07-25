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
(the workspace step in `write-design-doc.md`). Every sub-agent works in that worktree, on
that branch.

---

## Wave 1 — generate

Dispatch a **writer** sub-agent to produce `spec.md` + `decisions.yaml` by following
`write-design-doc.md` for the target — conforming to `doc-structure` (format) and
`authoring` (content). It returns only once `npm run check` is green. From it you keep the branch
state and a one-paragraph summary of what it produced; you do not read the spec yourself.

---

## Waves 2..n — review, then revise

Loop, up to **3 rounds**:

1. **Review.** Dispatch the review in `review-spec.md` against the target. Collect its
   verdict and its verified findings, split into *spec-level* and *design-level*.
2. **Clean?** If the verdict is clean, stop the loop.
3. **Revise.** Dispatch a **reviser** sub-agent with the confirmed *spec-level* findings only. It
   applies each fix and returns with `npm run check` green again. It must **not** silently touch a
   *design-level* finding — a wrong requirement, accepted decision, or fact is the owner's to
   settle.
4. **Escalate and stop on design-level findings.** If review surfaces a design-level finding, have
   the reviser record it as an **open question** in the spec — `closes` naming the kind of input
   that would settle it, `gates` naming any decision resting on it — then stop the loop and hand
   off with it flagged. The question is what blocks the design from settling; the inputs need the
   owner before regeneration is worth another round. Recording the question is not fixing the
   input: it states that the input is in doubt and leaves the repair to the owner.
5. Re-review.

If spec-level findings still stand after the round cap, **stop and hand off with them listed.** Do
not loop forever, and never lower the bar or delete a foundation to force a pass — a spec that
cannot pass honestly is a finding, not a failure to hide.

---

## Hand off

Open a pull request against `main` per `write-design-doc.md`'s hand-back — the PR body is the
writer's hand-off (what the spec designs, the decisions made and what would settle each, anything
underspecified, open questions). Append a short **review log**: the rounds run, what each
surfaced, and which findings were fixed.

The review log does not re-list the design-level findings. Each is an open question in the spec by
now, which is where the owner answers it and where it does its blocking work; restating them in the
PR body splits the list in two and leaves the copy in the body to go stale the moment one is
settled. Say how many there are and point at the Open questions section.

The spec lands as a **draft**: decisions `proposed`, any open question open, so nothing is built
on it until the owner clears the list.

---

## After hand-off — owner feedback

Once the draft is in review the owner will respond, and each response routes by what it reaches —
the same test throughout: **inputs outrank the comment, and both outrank the document.**

- **A comment about the document** — unclear argument, a decision to accept or reject, a section in
  the wrong place, an uncited claim. Dispatch `process-review-comments.md`; the artifact is
  disposable and revised freely. No input changes, no regeneration.
- **A change to an input** — a requirement added or reworded, a fact corrected, a decision the owner
  lifts into fiat. You apply the owner's change to the input file, then **amend the draft to
  realign** by dispatching `amend-design-doc.md` — preferably by **resuming the original author**,
  whose context keeps the edit coherent. Amendment is the default; it is cheaper than regeneration
  and does not throw away the draft's coherence over one changed requirement.
- **Regeneration is the reserved fallback**, not the response to routine input changes. Reach for a
  full rebuild (`write-design-doc.md`) only when the owner calls for it — because input drift is
  large or structural, or enough amend turns have passed that a fresh context is warranted.
  Recommend it when you see those conditions; the choice is the owner's.

Before any amend, reconcile the branch: the owner may have edited it directly while agents worked,
so integrate those edits first rather than clobbering them. Re-run the review loop after a
material amend — a realigned draft still has to pass the same bar.

---

## Orchestrator discipline

- **Dispatch, don't do.** You never write or review a spec yourself; you spawn the agent that
  does and keep its verdict.
- **Carry verdicts, not content.** Across rounds you hold the finding summaries and the
  pass/fail, not the spec text. Each sub-agent's detailed context dies with it.
- **One writer, N reviewers, one reviser per round.** The reviewers fan out (they are independent
  by design); the reviser is single so the fixes stay coherent.
