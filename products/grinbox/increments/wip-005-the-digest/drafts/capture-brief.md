# Capturing the digest

Fifth increment of the grinbox capture, stacked on `wip-004`. The digest is the one part of
grinbox that is scheduled rather than driven by arriving mail, and the one with an accounting
guarantee of its own.

## What was read

`docs/digest-design.md` in full, `docs/pipeline-runtime.md`'s digest scheduler section, and
`packages/server/src/digest` with `packages/shared/src/operators.ts`'s edition configuration.
`docs/roadmap.md` supplies the motive: the digest ships immediately after the archive action
because aggressive archiving is only trustworthy once something guarantees nothing was silently
lost.

## The bound-or-free split

**Bound.** The division itself — judgement at triage, collation at digest — which is what makes
the accounting a property of the code. That an edition is an ordinary operator instance whose
schedule is its cadence, firing per account and sending to that account's owner. That slotting is
an ordinary closed-enum tag, so growing the category set is a configuration edit. The coverage
window's half-open shape over ingestion time, that only a completed delivery advances the
watermark, that missed occurrences collapse into one, and that claiming the occurrence is what
prevents a second send. That editions of one pipeline claim disjoint categories. The three render
shapes and the fallback line for a message that renders empty. The reconciliation assertion and
the footer count for categories no section claims. That prose is the only model involvement and
cannot touch the items. That a capped send fails the delivery, unlike a capped per-message action.

**Free.** The scheduler's tick interval and how an occurrence is resolved from a schedule
expression. The candidate cap and how the overflow is worded. The email's markup and layout. How
a highlight is marked. The prompt a prose block is given around the user's own.

**Not captured, deliberately.** The template grammar reserves a call form for aggregation it does
not yet implement, and rejects it with a dedicated message. What the user observes today is an
unknown placeholder refused at save, which `wip-003`'s `d-svk1emrj` already covers; the
reservation is a promise about a grammar that does not exist yet, and it can be made when the
aggregation does.

## One thing worth the owner's eye

`r-vd9mu8od` and `r-yq13riob` — everything covered is accounted for, and a message is digested
once — are stated as requirements, and four decisions exist to serve them: the watermark, the
collapse, the claim, and the disjoint categories. That is the right ratio for a guarantee this
central, but it does mean four mechanisms can be rearranged freely and the promise still has to
hold. Read the requirements as the thing being defended.
