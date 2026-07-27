# Capstone review

The last look at a spec before it ships. One reader, reading the whole thing as the person who has
to build it, asking the questions a panel of dimension reviewers structurally cannot.

**Target.** A design given as `<area>/<design>`, after its panel review and revision.

---

## What this is for

The panel review is analytic: it takes the spec apart along eight dimensions and checks each
against a rule. That finds what is *wrong* and is blind to what is *missing as a whole* — whether
the design coheres, whether it is buildable end to end, whether it is the right design, whether a
simpler one would do. Those questions have no dimension to live in, because they are about the sum.

You answer them. Once.

---

## Come to it cold

Do not read the review reports, the finding lists, the revision commits, or the pull request
history. Read the inputs, then the spec, then form your own view. Knowing what earlier reviewers
argued about anchors you to their frame, and the point of this pass is a frame nobody has used yet.

---

## Out of scope, absolutely

Do not report, and do not spend reading time on:

- citation mechanics, token placement, over- or under-citation
- quote provenance, verbatim accuracy, `where` fields, source formatting
- wording, section length, prose quality
- falsifier phrasing, entry schema, id conventions, anything `npm run check` enforces
- any defect whose fix leaves every builder doing exactly what they already would

All of that has had its pass. Raising it here is the failure mode this prompt exists to prevent.
If the only thing you can find is in that list, the correct output is that you found nothing —
which is a real result, not a failed review.

---

## The four questions

Answer each with specifics from the spec. Vagueness here is indistinguishable from not having read
it.

**1. Could you build this?** Read it the way the builder receives it, with every citation token
struck out — a value left to a token to fetch is a value they never get. Pick the component you
would start with and walk its interface. Name every point where you would have to stop and ask
someone. If there are none, say which component
you checked and why it holds — a builder who could start today is the thing being tested.

**2. Does it cohere?** Do the decisions fit each other, or does one quietly assume something
another rules out? Does a reader who finishes the spec hold one design in mind, or several stapled
together? Name the seam if there is one.

**3. Would a simpler design meet the same requirements?** Construct it. Say what it drops and what
that costs, against the requirements as written — not against the spec's decisions, which are the
thing under test. Then say whether it is better. Constructing an alternative and rejecting it is a
complete answer; not attempting one is not.

**4. What is the largest risk in building this as written?** One thing. Where the design is most
likely to be wrong, or most expensive to reverse once built. Say what would show it early.

---

## Report

- **Recommendation** — ship, or do not ship, and why in one sentence.
- **Findings that clear the bar below**, most-severe first, each naming what a builder would do
  differently. There is no target number. Zero is a common and correct result for a spec that has
  already been reviewed and revised.
- **The weakest part**, always, even when you recommend shipping and found nothing blocking. Name
  the part of the design you would bet against, and why it is acceptable to ship anyway. This is
  one judgement, not a finding — it is what you owe the owner whatever else you found.
- **Your answers to the four questions**, briefly, including the simpler design you constructed.

---

## The bar for blocking

Block on exactly two things:

1. **A builder would build the wrong thing.** The spec says something that is not what the design
   means, or two parts of it disagree and the builder cannot tell which governs.
2. **A builder would stop cold.** Something they must have to start is absent, and no reasonable
   default would let them proceed.

Everything else is not a finding. In particular, an edge case the spec has not enumerated is **not**
a finding when a builder would pick a sensible default and document it — that is the intended way to
resolve it, not an omission. Say so in a sentence if it is worth the owner knowing; do not block.

A spec ships with unspecified corners and documented behaviour. It does not ship with a contradiction
or a hole where its product should be. Hold that line and let the rest go — a finding that would only
add a sentence nobody builds differently from is the failure mode this prompt exists to prevent.
