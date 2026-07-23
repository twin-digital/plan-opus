# Authoring

## Summary

`doc-structure` fixes the shape of a spec; this design fixes its content — what makes a `spec.md`
a good build document, not merely a well-formed one. It exists because a spec can pass every
structural check and still fail the reader it is for: tell a builder the wrong thing, bury the
choice a reviewer needs, or rest on a fact that was never real. What it produces is a set of
tests a reviewer applies to a written spec — to its prose, its citations, its evidence, its
falsifiers, its components, and its unknowns — so that specs written months apart by different
agents come out consistent in quality. The constraint that shapes
every choice here is that almost none of it is mechanically checkable: each rule is enforced by a
reader or not at all, so each is written as something a reader can ask, not a form a checker can
pass.

## What this document instructs

Every rule below is one a spec author must follow: this document is the standing instruction to
produce specifications that meet all of them [[r:instructs-readers-to-follow-the-spec-rules]].
Being a spec itself, it meets them here too — so each rule is also a requirement on this very
document, which is why they sit in this design's own `requirements.yaml` and are cited throughout
the specification below.

## Tests, not templates

Every rule below is written to be checked, not filled in — something a reviewer asks of a spec
rather than a pattern an author reproduces [[r:guidance-is-tests-not-templates]]. A filled-in pattern produces prose that
satisfies the pattern; a test the prose must pass produces prose that does the work. This is also
where a rule earns its place or loses it: one a reader cannot check against a real spec is not
paying for the attention it costs, and the standing licence is to drop it
[[r:must-beat-doing-it-myself]].

## The spec is what a builder builds

The implementer's view is the spec's own prose with its citation tokens stripped, plus a
streamlined list of the decisions and requirements it is bound by [[r:derived-implementer-view]].
So the prose is not a summary of the build — it *is* the build instruction, and its one job is to
tell a competent implementer what to build and how, precisely enough to build the right thing and
no more. Under-specified instructions and over-specified ones both cost correctness
[[f:underspecified-requirements-degrade-code]] [[f:over-specification-also-degrades-code]], so the
target is the detail a builder needs, neither maximal nor minimal.

That target governs *why* in particular. A spec states what to build and how; it gives the reason
a constraint exists only where a builder who did not have it would build the wrong thing
[[d:reason-only-where-a-builder-needs-it]]. Reasoning kept for its own sake is irrelevant material
in the build read, and irrelevant material measurably lowers what the reader downstream gets right
[[f:context-is-not-free]]. The reason a decision was made lives in its falsifier and its argument,
which the builder's view drops; what survives is the constraint itself and, where it is easy to
satisfy wrongly, the reason that pins the right reading.

## Components are cut to be built alone

A component maps to a single dispatched build task — an issue, say, that a builder implements — so the
boundary the spec draws is the one the builder builds against, not one they are free to redraw
[[r:components-map-to-dispatchable-build-units]]. That is what makes the
interfaces between components matter: they have to be pinned well enough for the pieces to be built
in parallel, which in turn keeps the count down, because every extra component is another interface
a reviewer must hold. A component that can only be built after another says so with its `after`.

Where a boundary falls is the author's judgement, proposed in the spec and open to revision by
owner or author in review. A responsibility is one component when it can be
built against its stated interface without reading another component's internals; it is split when
it hides an interface a second component must build to, and not split past the point where the
pieces could not be built in parallel anyway [[d:components-cut-at-dispatchable-boundaries]].

## The Summary orients

The Summary names what the design is, what it produces, and the problem or need it addresses, and
— when a single constraint dominates the design — that constraint
[[r:summary-names-subject-product-and-problem]]. Subject and product tell a reviewer what they are
about to read; the problem is what orients them to why the design takes the shape it does, and it
is the element every design has. A dominant constraint is the big rock a reviewer needs early, so
it is named when one clearly leads; where several bind about equally, they belong in the specification
rather than crowded into the opening. Putting the orientation first is deliberate — a reader holds
the framing at the start of a document better than one buried in its middle [[f:context-is-not-free]].
The Summary carries no citation, so anything it asserts that a later claim rests on is stated again
where that claim is argued.

## The specification, not the lists

The facts, requirements, and decisions are extracted into lists a reviewer reads on their own, and
the builder's crib is drawn from the same entries [[r:easily-reviewable-foundations]]. Prose that
restates an entry adds nothing a reader does not already have, and volume that adds nothing does
not improve the output — relevance does [[f:relevance-not-volume-improves-output]]. So the specification
— the H2 sections of the `spec.md`, everything after the Summary that is not the Open questions or
Components block — carries no sentence whose whole content restates an entry it cites
[[r:specification-does-not-restate-entries]] — the one exception is the concluding checklist, whose
job is to restate the tests in a single place. What the prose owes instead is the connective work the
lists cannot show: why these facts and requirements force this decision, how the decisions fit
together, where a boundary falls and what sits on each side.

## What a citation marks

A claim carries a citation when some decision, component, or other claim in the design would have
to change were the cited foundation false, and a citation appears only on such a claim
[[r:explicit-intent]]. Both halves are the test. The positive half catches reasoning left in the
agent's head: a claim resting on a fact or requirement that does not say so has hidden what a
reviewer came to check. The negative half is the one authors get wrong more often — a citation
pinned to motivation, illustration, or an aside is a false signal, and a document where everything
is cited tells a reviewer as little as one where nothing is.

## Depending on another design

A design sometimes rests on another design's output — as a design that enforces a format rests on
the rules it enforces. Those upstream rules are not foundations it can cite: a cross-design
decision citation is an error, and a rule stated only as an invariant has no token at all. The
dependency is carried as a fact instead — the upstream commitment re-expressed and sourced to the
other design's `spec.md` by repo-relative url and verbatim quote — which this design's own
requirements and decisions then cite [[r:cross-design-dependency-is-cited-as-a-fact]]. Recording
the rule as documented evidence keeps the dependency honest: the design notes that the rule exists
rather than re-legislating it, and because facts stay out of the builder's view
[[r:derived-implementer-view]], the dependency never leaks into what a builder reads.

## Evidence is the source's own words

A content rule binds whoever writes the entry it governs, and the evidence rules are the case that
shows why: a fact is an input, written into `facts.yaml` before and outside the spec that leans on
it, so they bind whoever captures the fact, not the spec author who later cites it
[[r:a-rule-binds-the-writer-of-what-it-governs]]. A spec author builds on facts already held to
this standard.

A fact backed by a source outside the author reproduces the passage its claim rests on verbatim;
it is never summarized, and any support drawn from it is a quotation [[r:evidence-is-verbatim]]. A
paraphrase is the agent's voice, the one thing a citation exists to guard against, and a bare link
proves nothing because verifying it means re-reading the page. The span quoted is the shortest that
carries the claim, not the section around it [[d:quote-is-the-shortest-carrying-span]]: a longer
quote reproduces the source and buries the words that matter, while a span cut too short
misrepresents by dropping the context that qualifies it. A fact backed instead by the author's own
experience carries a description of its mechanism, there being no external text to quote.

Auditing rests on the facts too, and it can find one wanting. When a spec author finds an inherited
fact is wrong, or its quote does not carry its claim, the author does not cite it and does not
merely flag it: a wrong fact is corrected — a new, properly-evidenced fact recorded and the
contradicted one superseded — because a fact is objective and a spec is not built on one known to
be false [[r:facts-proven-wrong-are-corrected]]. And a discovery the author makes while writing
that a decision or component comes to rest on is itself recorded as a fact rather than left
implicit in the prose, so the foundation sits on the reviewable list where it can be checked and
reused [[r:foundational-discoveries-are-recorded-as-facts]]. Both are input changes and go to the
owner for review.

## A falsifier names what would fire

A decision that cannot say what would prove it wrong is not understood well enough to keep
[[r:decisions-state-their-falsifier]]. The format can force the field to be filled; whether what
fills it is real is this design's to test. A falsifier is real only when it names a concrete
condition that could actually occur and, if it did, would retire the decision
[[d:falsifier-names-a-firing-condition]]. The decision's own negation dressed as a condition is not
one: "we learn this choice was wrong" names nothing to watch for. A real falsifier points at
something observable — a measured rate, a boundary redrawn again and again, a source that turns out
not to say what it was read to say. This is not reserved for decisions about capacity or
performance; a boundary decision can state a real falsifier too
[[f:falsifiers-are-writable-for-boundaries]], though the condition it names is a softer instrument
than a crossed threshold and is worth a second look.

A convention the inputs force but leave open — a tag format, a naming scheme, a publish location —
looks unfalsifiable, because nothing in the world proves an arbitrary choice wrong. What retires it
is its own cost: the collision, the churn, or the tooling friction it creates is the observable
condition, and that cost is the falsifier a convention decision states
[[d:a-convention-decision-fires-on-its-own-cost]]. A convention with no statable cost is a coin
flip, not a decision worth recording.

## Unknowns

An unknown the author could settle now is settled now, not parked
[[r:answerable-unknowns-are-resolved-now]]. *Answerable now* means the evidence in hand determines
the answer, not that a plausible choice could be written down — a decision fabricated ahead of its
evidence is the premature-structure error, not a resolution — and settling has three forms, all at
authoring time: find the fact, decide the matter, or raise it as an open question to the owner.
Raising one is itself a resolve-now move, an ask a settled design cannot be built around, not a
deferral; a choice only experience of running the thing would settle is raised as an open question
naming that experience. Only an unknown that genuinely cannot be resolved yet is carried, in the
form that fits why: a decision's falsifier when the choice stands now but a named later event would
reopen it, or an assumed fact when the design must rest on something not cheaply verifiable.

The same duty reaches inherited facts. An assumed fact arrives already carried, but before a design
rests a component or decision on one, its author re-judges its resolvability as if meeting it fresh
— and if it could be verified or settled now at a cost small beside building on it and being wrong,
raises an open question rather than build on it
[[r:resting-on-an-assumed-fact-is-an-answerable-unknown]]. An input earns no pass on the
resolve-now duty for having been written down by someone else first.

## The tests

The rules above reduce to a checklist — every test a reviewer runs over a spec, and the
foundation each rests on [[r:conclude-with-test-summary]]. The format checker covers none of
them, so this list is the review; a spec is well-built when it passes all of it.

| # | A spec passes if… | rests on |
|---|---|---|
| 1 | it reads as a build instruction — states what to build and how, giving a constraint's reason only where a builder would otherwise build it wrong | `derived-implementer-view`, `reason-only-where-a-builder-needs-it` |
| 2 | each component is one dispatchable build task with an interface pinned for parallel build, the count stays bounded, and serial dependencies are marked with `after` | `components-map-to-dispatchable-build-units`, `components-cut-at-dispatchable-boundaries` |
| 3 | the Summary names subject, product, and problem — plus the dominant constraint when one leads — and carries no citation | `summary-names-subject-product-and-problem` |
| 4 | no sentence of the specification merely restates an extracted entry; the prose does the connective work instead | `specification-does-not-restate-entries`, `easily-reviewable-foundations` |
| 5 | a citation sits on every claim that would change were its foundation false, and on no filler | `explicit-intent` |
| 6 | external evidence is the source's shortest carrying verbatim span, an assumed fact describes its mechanism, and an inherited fact found wrong is corrected rather than cited | `evidence-is-verbatim`, `quote-is-the-shortest-carrying-span`, `facts-proven-wrong-are-corrected`, `foundational-discoveries-are-recorded-as-facts` |
| 7 | every falsifier names a real firing condition — a convention's being its own cost | `decisions-state-their-falsifier`, `falsifier-names-a-firing-condition`, `a-convention-decision-fires-on-its-own-cost` |
| 8 | an unknown the evidence can settle now is settled now, and only the genuinely unresolvable is carried in the form that fits | `answerable-unknowns-are-resolved-now`, `resting-on-an-assumed-fact-is-an-answerable-unknown` |
| 9 | a dependency on another design is carried as a fact sourced to its spec, never a cross-design citation | `cross-design-dependency-is-cited-as-a-fact` |
| 10 | each rule is applied by whoever writes the entry it governs | `a-rule-binds-the-writer-of-what-it-governs` |
