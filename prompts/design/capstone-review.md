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
- restatement, wording, section length, prose quality
- falsifier phrasing, entry schema, id conventions, anything `npm run check` enforces
- any defect whose fix leaves every builder doing exactly what they already would

All of that has had its pass. Raising it here is the failure mode this prompt exists to prevent.
If the only thing you can find is in that list, the correct output is that you found nothing —
which is a real result, not a failed review.

---

## The four questions

Answer each with specifics from the spec. Vagueness here is indistinguishable from not having read
it.

**1. Could you build this?** Pick the component you would start with and walk its interface. Name
every point where you would have to stop and ask someone. If there are none, say which component
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
- **At most five findings.** Blocking only, most-severe first, each naming what a builder would do
  differently. If you have more than five, you are reporting the wrong things; keep the five that
  change the build. If you have none, say so plainly.
- **The weakest part**, always, even when you recommend shipping and found nothing blocking. Name
  the part of the design you would bet against, and why it is acceptable to ship anyway. A review
  that finds nothing and names nothing has not been run.
- **Your answers to the four questions**, briefly, including the simpler design you constructed.

A capstone that returns "looks good" is a failed capstone. So is one that returns twenty findings
about wording. The output that means it worked: a short list of things that would change the build,
or an argued case that there are none, plus the risk you would watch.
