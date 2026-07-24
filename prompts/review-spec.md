# Review a spec

You are reviewing a spec — its `spec.md` and `decisions.yaml` — against the format
(`doc-structure`) and the content rules (`authoring`). You report a verdict and the findings that
survive verification. This runs standalone, and it is the review step the spec-generation prompt
calls each round.

**Target.** A design given as `<area>/<design>` — everything lives in `design/<area>/<design>/`.
`authoring`'s rules are its own settled `spec.md`; its concluding checklist is the reviewer's
tool.

---

## The floor: run the checker

Run `npm run check`. It enforces the mechanical invariants — schema, citation resolution, the
settle-gate. Any failure is a finding before you read a line. Green means the spec is
*well-formed*, not that it is *good*; the rest of this is for the part the machine cannot see.

---

## Review by dimension

Dispatch an independent reviewer per dimension — each blind to the others, each returning
structured findings that name the rule or foundation it violates and where. Do not let a finding
gate until it is verified (below).

1. **Conformance** — beyond the checker: does the Summary orient (subject, product, problem)? Are
   the sections in order? Is every live design-scoped requirement and every accepted/tolerated
   decision *genuinely* cited by a claim that rests on it, not pinned to filler to clear the gate?
2. **Citation intent** — both directions. A weight-bearing claim (some decision, component, or
   other claim would change were a foundation false) with no token is a miss; a token on
   motivation, illustration, or restatement is a false signal. Over- and under-citation both fail.
3. **Falsifier value** — each decision's falsifier names a concrete condition that could actually
   arise and would reverse the decision. A restated negation of the choice, an impossibility, or a
   certainty is a ticked box, not a falsifier.
4. **Evidence integrity** — each fact's quote is verbatim and *actually supports the claim it
   backs* (a quote that is real but does not carry the claim is the subtle failure). In-repo
   sources resolve and the quoted span is present; an assumed fact carries a mechanism, not a
   missing quote.
5. **Rule adherence** — apply `authoring`'s own concluding checklist to this spec, test by test.
   The checklist is the manual; run the spec through it and record every test it fails.
6. **Conciseness** — minimum-why and no restatement: a *why* a builder who lacked it would not
   misbuild is surplus; a sentence whose whole content restates an entry it cites should cut
   without loss. Flag both, and any section longer than the work it does.
7. **Buildability** — could a competent builder build from this alone? Is each component a
   dispatchable unit with an interface pinned enough for parallel build? Is anything left
   underspecified for a real build choice?
8. **Cross-design dependency** — does every reliance on another design's output appear as a
   **fact** in this design's or a shared scope, sourced to the upstream `spec.md` by
   repo-relative url and verbatim quote — never as a direct citation of another design's
   decisions or invariants, and never left implicit in prose? Each such quote must appear
   verbatim at its source; a paraphrase, or a quote that has drifted from the upstream text, is a
   finding. This is the check that keeps a published interface's consumers from silently
   depending on a version that has moved.

---

## Verify before gating

A finding gates only if it survives an adversarial check: a skeptic tries to *refute* it, and it
stands only if the refutation fails. Use the `cold-review` skill's find→verify structure where it
fits. Discard the plausible-but-wrong; a review that cries wolf is worse than a lighter one.

---

## Report

- **Verdict** — clean, or findings remain.
- **Findings**, most-severe first. Each names its dimension, the rule or foundation it violates,
  the location, and either the fix or the question it raises.
- **Split them.** A **spec-level** finding is fixable in the spec (a missing citation, a weak
  falsifier, a bloated section). A **design-level** finding means an *input* is wrong — a settled
  requirement, an accepted decision, a fact — and it goes to the owner, never fixed silently. Say
  which each is.
