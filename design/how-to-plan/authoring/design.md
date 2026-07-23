# Authoring

## Summary

Two designs can stand on the same three kinds of foundation, wear the same shape on disk, and
pass every mechanical check, and one of them can still be bad: a fact with a fabricated source,
a decision with a rhetorical falsifier, an argument that restates its inputs and decides
nothing. Doc-structure fixes the shape and the harness checks it. This design fixes the content
those checks cannot reach — what makes a citation honest, a piece of evidence real, a falsifier
able to fire, and an argument a derivation rather than a summary.

One constraint shapes everything below: almost none of it is mechanically checkable. These are
the rules a reader enforces or no one does, and that cuts both ways. A rule too vague to apply
does nothing; a rule so rigid it dictates sentences produces stilted prose that satisfies the
letter and helps no one. Every rule here is written to be run by a reviewer against a finished
passage, and no tighter than that.

## What authoring owns

Doc-structure can require that a decision carry a falsifier field and that a fact name a source.
It cannot judge whether the falsifier could ever fire, or whether the source says what the fact
claims. Those are the invariants a design states with no mechanical backstop — and a format that
keeps accumulating such rules has outrun what it can check [[r:invariants-are-enforced-or-marked]].
Authoring is where each of them is cashed out: every one is a judgement about meaning, owned by
whoever reads the design.

That ownership fixes the form these rules take. A rule here is written as a test a reviewer
applies to a finished passage. If a rule cannot be phrased that way it is one of two things:
something the harness could enforce, in which case it belongs there and not here; or cosmetic,
in which case it costs more attention than it returns and is cut [[d:guidance-is-reviewer-tests]]
[[r:must-beat-doing-it-myself]].

The reason to accept that discipline is what it buys: consistency without a style guide. Done,
for this repository, is two documents written months apart by different agents that read as
though one author wrote them. That likeness comes from every design deriving the same kinds of
claim from its foundations in the same argument shape — not from a prescribed vocabulary or
tone, which would be the stilted-prose failure wearing different clothes
[[d:consistency-from-shared-derivation]].

## Which claims carry a citation

The obligation to cite is the area's, not this design's to restate: a claim points at what it
rests on whenever some decision, component, or other claim would have to change were that thing
false, and no other claim may carry a citation [[r:explicit-intent]]. What authoring supplies is
the reading that makes the test decidable at a single sentence.

A claim that carries weight rests on a fact, a requirement, or a decision, and every citation
must resolve to a real entry. So when a weight-bearing claim leans on something not yet in the
tree, only two moves are open: capture that thing as a foundation and cite it, or cut the claim
— there is no third move where the claim points at nothing and asks to be trusted. Capture is
the cheaper of the two by design, because a fact found while writing gets a home the moment it
is found rather than being parked for want of somewhere to put it [[r:enable-easy-capture]]. The
uncited sentences that remain are the argument's connective tissue — motivation, illustration,
restatement of something already cited — and a citation on one of those is a false signal
rather than added rigour [[r:explicit-intent]]. For the genuinely unclear sentence the test is
subtraction: cut it and see whether the argument develops a hole or merely loses colour.

## Evidence is reproduced, not described

A fact's citation is worth only what a reader finds on following it. A paraphrase is the
author's voice — the very thing a citation exists to guard against — so a fact's source carries
the verbatim passage its claim rests on, and a summary of a long page proves nothing, because
re-verifying it means re-reading the page [[r:evidence-is-verbatim]]. The rule works as a
forcing function before it works as bookkeeping: being made to produce the passage is what
catches a fact that has overstated what its source actually says.

Reproducing a source assumes there is an outside source to reproduce. An assumed fact has none.
Its backing is the author's own experience, and doc-structure lets it stand on a description of
the mechanism rather than a quote. That description is in the author's voice by necessity, and
its honesty comes from a different place: the assumed backing labels the claim as judgement, so
a reader weighs it as judgement [[d:mechanism-descriptions-are-authors-voice]]. The verbatim
rule binds what quotes an outside source; the backing label binds what does not. A mechanism
description that smuggles in an unquoted claim about someone else's system has reached for the
wrong one.

## A falsifier that can fire

A decision must say what would prove it wrong, because a decision that cannot is not understood
well enough to keep and cannot be retired on purpose, only abandoned by accident
[[r:decisions-state-their-falsifier]]. Structure can require the field; only a reader can tell
whether its contents could ever fire. A real falsifier names a later development that someone
could observe — someone could tell whether it happened — that is not already settled either way,
so it might come out for or against, and that is decisive for this decision in particular rather
than for any decision at all. A statement missing any of the three is filler, however confidently it is
written [[d:real-falsifier-observable-contingent-decisive]]. The common failures each drop one
property: "falsified if this is the wrong call" restates the decision and observes nothing; "if
YAML ceases to exist" can never come true; "if priorities change" would retire every decision in
the repository at once, and so singles out none.

The demand is not reserved for decisions with a number in them. A capacity choice has an easy
falsifier — a measured rate crossing a threshold — and a boundary or taste choice is where the
rule invites doubt. A firing condition can be written for those too: "components are routinely
split or merged mid-implementation" is a real instrument, if a softer one than a threshold
[[f:falsifiers-are-writable-for-boundaries]]. The evidence for that is thin and says so — one
design's worth, written by the same hand that wrote the rule requiring it — which makes it
enough to proceed on and not enough to close.

## Placing an unknown

Not every gap is an open question. An unknown has three honest homes, and which one it takes
turns on what it blocks. If it blocks a decision from being made at all, it is an open question,
and doc-structure has it name the kind of foundation that would close it. If the decision can be
made now but some nameable later event should overturn it, the unknown is that decision's
falsifier — the design commits and records what would reopen it. If the design must rest on the
unknown to proceed and the assumption is defensible, it is an assumed fact, stated with the
caveat that keeps it honest [[d:unknowns-routed-by-what-unblocks-them]]. The routing exists to
stop the middle case from collapsing into the last: an unknown that should have gated a decision,
filed instead as an assumption, and found out only when the design built on it has to come down.

## The shape of the argument

A design document is an argument, and its order is the argument. Each claim rests on ground
already laid, so the reading leads from the foundations the design is handed to the choices
those foundations force; a passage that only restates a requirement has added nothing and is cut
[[d:argument-is-a-derivation]]. This is the same discipline as citing only what carries weight,
raised from the sentence to the section: a restatement is filler at the scale of a paragraph.

A derivation needs its reader oriented before the first step. The Summary names what the design
is and the single constraint that most shapes it, ahead of any rule or schema, so every later
choice can be read against the pressure that produced it rather than in a vacuum
[[d:summary-orients-before-rules]]. A reviewer who holds the governing constraint can judge a
decision by asking whether it answers that constraint; one who meets the decisions first has to
reconstruct the pressure backwards from the answers.
