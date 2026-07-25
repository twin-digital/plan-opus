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

## Wave 2 — panel review, triage, revise

**One panel review, not a loop to clean.** Eight adversarial reviewers always return findings; a
second panel spends most of its budget reviewing the churn the first one caused, and the third
finds wording. Run the panel once, act on it, then move to the capstone.

1. **Review.** Dispatch `review-spec.md` against the target. It returns **blocking** findings, split
   *spec-level* and *design-level*, and a separate **caveat** list.
2. **Triage the caveats.** Dispatch `triage-caveats.md` with the caveat list. This must be a
   **third agent** — not a reviewer that produced them, not the writer or reviser of this spec.
   Both have a stake in whether a caveat matters. Each caveat is discarded, recorded as a `caveat`
   line on the entry it concerns, or sent back as blocking because it needs a change rather than a
   note. Discarding a true-but-inert caveat is a correct outcome and needs no one's sign-off — the
   entries are read by people deciding what to rely on, and their signal-to-noise is what triage
   protects. Its input edits go in the PR body for the owner.
3. **Revise.** Dispatch a **reviser** sub-agent with the blocking *spec-level* findings, plus
   anything triage promoted. It applies each fix and returns with `npm run check` green. It must
   **not** silently touch a *design-level* finding — a wrong requirement, accepted decision, or fact
   is the owner's to settle.
4. **Record design-level findings as open questions.** Have the reviser write each as an open
   question — `closes` naming the kind of input that would settle it, `gates` naming any decision
   resting on it. That is what blocks the design from settling. Recording the question is not fixing
   the input: it states that the input is in doubt and leaves the repair to the owner.

Never lower the bar or delete a foundation to force a pass — a spec that cannot pass honestly is a
finding, not a failure to hide.

---

## Wave 3 — capstone

Dispatch `capstone-review.md` once, to an agent that has seen none of the above. It reads the whole
spec as its builder and answers what a dimension panel cannot: is this buildable end to end, does it
cohere, would a simpler design do, what is most likely to be wrong. It reports at most five blocking
findings and always names the weakest part, so silence costs it something.

If the capstone blocks, fix what it names and ship. **Do not send its output back through the
panel** — that restarts the loop this structure exists to end.

---

## Hand off

Open a pull request against `main` per `write-design-doc.md`'s hand-back — the PR body is the
writer's hand-off (what the spec designs, the decisions made and what would settle each, anything
underspecified, open questions). Append a short **review log**: what the panel blocked on and what
was fixed, how many caveats triage recorded, and the capstone's recommendation and weakest-part
call. Caveats are not listed in the body — they live on the entries they concern — but the input
edits triage made are called out for the owner, as any input change is.

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
so integrate those edits first rather than clobbering them. After a material amend, re-run the
**capstone** — a realigned draft still has to hold together. Re-run the panel only when the amend
reached enough of the spec that it is effectively new; an amend touching one section does not earn
eight reviewers.

---

## Orchestrator discipline

- **Dispatch, don't do.** You never write or review a spec yourself; you spawn the agent that
  does and keep its verdict.
- **Carry verdicts, not content.** Across rounds you hold the finding summaries and the
  pass/fail, not the spec text. Each sub-agent's detailed context dies with it.
- **One writer, N reviewers, one triager, one reviser, one capstone.** The reviewers fan out (they
  are independent by design); the reviser is single so the fixes stay coherent; the triager and the
  capstone are separate agents because their value is in not having been either of the others.
- **Judge the review by what it changed, not by what it found.** A round that returns four findings
  a builder would act on has done more than one that returns thirty. If most of a round's output is
  caveats, the spec is close to done and the next round is not worth running.
