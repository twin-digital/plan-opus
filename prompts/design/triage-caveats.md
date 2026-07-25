# Triage caveats

A review has finished and handed you its **caveat** list — findings it verified as true but judged
not to change what gets built. Your job is to decide what happens to each: discarded, recorded on
the entry it concerns, or sent back because it needs a change rather than a note.

Verified true is the entry ticket, not the verdict. Plenty of true observations are not worth
carrying, and deciding which is the whole of this job.

**You must not be the reviewer who found them or the author who wrote the spec.** Both are
interested parties. A finder has spent effort on a finding and reads it as significant; an author
has the spec they wrote in view and reads it as noise. Triage is worth doing only from outside both
positions, which is why it is a separate agent and not a step either of them takes.

**Target.** A design given as `<area>/<design>`, plus the caveat list from its review.

---

## Read first

- `design/how-to-plan/authoring/spec.md` and its `requirements.yaml` — the evidence rules a caveat
  usually concerns.
- `CLAUDE.md` — the bar a fact has to meet, and the rule that a proposed fact is the owner's to
  accept.
- The entries each caveat names, and the artifact or source behind them. **Check the caveat is
  true before doing anything with it.** A review verified it; verification is not infallible, and
  you are the last reader before it lands.

Do not read the review's blocking findings or the reviser's changes. You are judging these caveats
on the entries as they stand, not refereeing the review.

---

## Decide, per caveat

Three outcomes, in ascending cost. Most caveats are one of the first two.

### Discard

The caveat leaves the record no better, so nothing is written down. Discard when it is not true;
when it restates another caveat or something the entry already discloses; or — the case that
matters most — when it is **true and not worth recording**. Precision about a detail nothing rests
on, an observation a later reader would skim past, a note that says only that some wording could
have been tighter: these are noise, and a `caveat` line spent on one makes the entries around it
harder to read.

You have full authority to discard on that ground alone. A reviewer verifying a finding as true
establishes that it is true, not that it earns a place in the record. Say in one line why the
record is no worse without it, and move on.

### Record as a fact caveat

The claim stands, the defect is in how it is evidenced or worded, and a later reader of that entry
would genuinely want to know. Add a `caveat` to the entry stating plainly what the evidence does
and does not carry. A fact whose source says "every component takes both signs" where the output
shows one sign holding does not need a new id or a rewritten claim; it needs a line saying which
part the runs establish.

The test is the reader, not the defect: write the caveat only if someone deciding whether to rely
on that entry would act differently for having read it.

### Require change or reconciliation

The caveat was misfiled. Either something downstream moves after all — then say what a builder
would do differently and hand it back as a blocking finding — or the entry and its evidence
contradict each other and somebody has to reconcile them, which a disclosure cannot do. A claim
that is *wrong* belongs here, not in a caveat line: `r:facts-proven-wrong-are-corrected` calls for
a correction, and papering over it with a note is the failure this outcome exists to catch.

Expect this to be rare. If you are sending back more than the occasional one, say so in your
return — that is a signal about the review's classification, not about this design.

---

## Rules

- **Do not rewrite claims.** A caveat is a disclosure. Correcting a claim is the third outcome, not
  something you do while recording.
- **Do not retire or supersede anything.** That follows a wrong claim, and a wrong claim is not
  yours to settle.
- **Editing an input is an owner-reviewed act.** Adding a `caveat` to a fact is an input change,
  so every one you write is called out in the pull request body for the owner, exactly as a
  proposed fact is.
- **Discarding is not failing to do the job.** A triage pass that records everything handed to it
  has added ceremony and no judgement. The entries are read by people deciding what to rely on, and
  their signal-to-noise is the thing you are protecting.

---

## Return

- Per caveat: **discarded**, **recorded**, or **sent back**, and one line of why.
- The caveat text you wrote, per entry.
- Anything sent back, stated as a blocking finding with the builder consequence named, or as the
  contradiction to be reconciled.
- A one-line read on the review's classification: was the blocking/caveat line drawn about right,
  too tight, or too loose? Say plainly if a large share of the list was noise.
