# Triage caveats

A review has finished and handed you its **caveat** list — findings it verified as true but judged
not to change what gets built. Your job is to decide what happens to each: recorded on the entry it
concerns, promoted to a blocking finding, or dropped.

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

**Record it** — the default, and what most caveats deserve. The claim stands and the defect is in
how it is evidenced or worded. Add a `caveat` to the entry stating plainly what the evidence does
and does not carry. A fact whose source says "every component takes both signs" where the output
shows one sign does not need a new id or a rewritten claim; it needs a line saying which part the
runs establish.

**Promote it** — the caveat was misfiled and something downstream does move. Say what a builder
would do differently, and hand it back as a blocking finding. Expect this to be rare; if you are
promoting more than the occasional one, say so in your return, because that is a signal about the
review's classification rather than about this design.

**Drop it** — it is not true, or it is a restatement of another caveat, or the entry already
discloses it. Say why.

---

## Rules

- **Do not rewrite claims.** A caveat is a disclosure. If a claim is actually wrong, that is not a
  caveat — it is a blocking finding under `r:facts-proven-wrong-are-corrected`, and it goes back as
  one rather than being smoothed over by a note.
- **Do not retire or supersede anything.** That follows a wrong claim, and a wrong claim is not
  yours to settle.
- **Editing an input is an owner-reviewed act.** Adding a `caveat` to a fact is an input change,
  so every one you write is called out in the pull request body for the owner, exactly as a
  proposed fact is.
- **A caveat that would read as noise on the entry is a drop, not a record.** The test is whether a
  later reader of that entry is better informed. "This source's phrasing is loose" helps nobody.

---

## Return

- Per caveat: recorded, promoted, or dropped, and one line of why.
- The caveat text you wrote, per entry.
- Anything promoted, stated as a blocking finding with the builder consequence named.
- A one-line read on the review's classification: was the blocking/caveat line drawn about right,
  too tight, or too loose?
