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
2. **Bound requirements** — run `node bin/foundations.mjs <area>/<design>` for the requirements
   that bind this design, wider scopes included. For each, point to what in the spec satisfies it,
   or to the decision recording a departure from a soft one. A hard requirement bound to the
   design and left unaccounted for is a finding; "a sibling design handles it" is not an answer,
   because binding is per-design.
3. **Citation intent** — both directions. A weight-bearing claim (some decision, component, or
   other claim would change were a foundation false) with no token is a miss; a token on
   motivation, illustration, or restatement is a false signal. Over- and under-citation both fail.
4. **Falsifier value** — each decision's falsifier names a concrete condition that could actually
   arise and would reverse the decision. A restated negation of the choice, an impossibility, or a
   certainty is a ticked box, not a falsifier.
5. **Evidence integrity** — each fact's quote is verbatim and *actually supports the claim it
   backs* (a quote that is real but does not carry the claim is the subtle failure). In-repo
   sources resolve and the quoted span is present; an assumed fact carries a mechanism, not a
   missing quote.
6. **Rule adherence** — apply `authoring`'s own concluding checklist to this spec, test by test.
   The checklist is the manual; run the spec through it and record every test it fails.
7. **Conciseness** — minimum-why: a *why* a builder who lacked it would not misbuild is surplus.
   Flag it, and any section longer than the work it does. Stating a value a requirement, fact, or
   decision fixes is **not** surplus and is never a finding here — the builder reads this document
   with its citation tokens struck out, so a literal left to a token is a literal they never get.
8. **Buildability** — read it as the builder receives it, every citation token struck: does it
   still say what to build? Every path, filename, literal spelling, format, and default the build
   turns on is present in the prose or a component, not left to a token to fetch. Beyond that: is
   each component a dispatchable unit with an interface pinned enough for parallel build? Is
   anything left underspecified for a real build choice?
9. **Cross-design dependency** — does every reliance on another design's output appear as a
   **fact** in this design's or a shared scope, sourced by repo-relative url and verbatim quote to
   the upstream's **requirement** — its `spec.md` only where no upstream requirement pins the
   claim — never as a direct citation of another design's decisions or invariants, and never left
   implicit in prose? The requirement is the pinned interface; spec prose is regenerable and drifts
   out from under a quote. Each such quote must appear verbatim at its source; a paraphrase, or a
   quote that has drifted from the upstream text, is a finding. This is the check that keeps a
   published interface's consumers from silently depending on a version that has moved.

---

## Verify before gating

A finding gates only if it survives an adversarial check: a skeptic tries to *refute* it, and it
stands only if the refutation fails. Use the `cold-review` skill's find→verify structure where it
fits. Discard the plausible-but-wrong; a review that cries wolf is worse than a lighter one.

---

## Classify by build impact

Every verified finding is **blocking** or a **caveat**, and the test is one question: *would a
builder do something different if this were fixed?*

- **Blocking** — it changes what gets built, or it would send a builder the wrong way: an
  unassigned responsibility, an interface two components would fill differently, a claim that
  misstates the thing being built, a decision no falsifier can reverse, a foundation the design
  rests on that is wrong.
- **Caveat** — true, and nothing downstream moves: a source that states more than its captured
  output carries, a count off by one in a description, a quote whose claim sits in the source
  rather than the claim, a real fact whose provenance is thin. Worth recording. Not worth a round
  trip.

Only blocking findings gate. Caveats are reported in their own list and go to triage, never to the
reviser: see `triage-caveats.md`. Do not upgrade a caveat by arguing it *could* matter — say what a
builder would do differently, or call it a caveat.

This classification is the reviewer's discipline against its own machinery. Nine adversarial
reviewers will always return findings; that is what they are for. Volume is not a signal of spec
quality, and a review that reports thirty equal-weight findings has done less work than one that
reports the four that matter and says so.

---

## Report

- **Verdict** — clean of blocking findings, or blocking findings remain. Caveats never make a
  verdict dirty.
- **Blocking findings**, most-severe first. Each names its dimension, the rule or foundation it
  violates, the location, what a builder would do differently, and either the fix or the question
  it raises.
- **Caveats**, listed separately and briefly — one line each, with the location.
- **Split the blocking ones.** A **spec-level** finding is fixable in the spec (a missing citation,
  a weak falsifier, a bloated section). A **design-level** finding means an *input* is wrong — a
  settled requirement, an accepted decision, a fact — and it goes to the owner, never fixed
  silently. Say which each is.

**A design-level finding is recorded as an open question in the spec**, with `closes` naming the
kind of input that would settle it and `gates` naming any decision that rests on it. That is what
gives the finding teeth: an open question blocks the design from settling, so the spec cannot be
built on while an input it stands on is known to be wrong. A finding that lives only in a report or
a pull request body is one nobody is required to answer.

Recording the question is a spec-level act and does not breach the rule above — the question states
that the input is in doubt; it does not edit the input. Whether to fix the input, and how, stays
the owner's.
