# Authoring

## Summary

This design fixes what makes the *content* of a `spec.md` good, where `doc-structure` fixes its
shape. Its subject is the spec as a build document — the artifact an agent builds from — and it
separates one a competent builder can build the right thing from, from one that is merely
well-formed. What it produces is a body of tests a reviewer asks of a spec, gathered into a
checklist at the end, rather than templates an author fills in.

The problem it answers is that almost none of this is mechanically checkable: a spec can satisfy
every structural invariant and still under-specify, over-specify, cite filler, or carry a
falsifier that can never fire. That unmechanizability is the constraint that shapes the whole
design — every rule here is enforced by a reader or not at all, so each is written as a test a
reader can apply, and the document closes with the list of them.

## The spec is a build document

A spec earns its length by what a builder needs, not by completeness. Every passage should change
what gets built: a *why* belongs only where a builder who lacked it would build the wrong thing,
and a passage that justifies a choice to a reviewer without changing the build is surplus
[[d:minimum-sufficient-specification]]. Both edges of that cut are real failure modes, not a
matter of taste — under-specified requirements lower the correctness of generated code
[[f:underspecified-requirements-degrade-code]], and past the point of sufficiency more detail
lowers it too, as adherence falls with each added constraint and misleading cues creep in
[[f:over-specification-also-degrades-code]]. What raises output is the relevance of what is
present, not its volume [[f:relevance-not-volume-improves-output]], and surplus is not free even
when it is true: accuracy drops as the input grows and as the needed part sits buried among the
rest [[f:context-is-not-free]]. So a reviewer should be able to read the design as a short list of
foundations and the connective prose that binds them; a spec that instead buries its foundations
in prose fails the list-first read the format is built for [[r:easily-reviewable-foundations]].

## Opening by orienting

The first test a spec faces is its Summary: read only that, and a reviewer should be able to say
what the design is, what it produces, and the problem it addresses — the three things that orient
before any detail — plus, when a single constraint clearly dominates, that constraint named up
front [[r:summary-names-subject-product-and-problem]]. A Summary carrying a fourth kind of
content, or a citation token, has overstepped: it is the one section `doc-structure` bars a token
from, so anything that would need one belongs below it.

## Saying it once

The foundations are already pulled into their own lists for review and for the builder's crib, so
the specification's prose owes the connective work those lists cannot show, not a second telling
of them. The test: strike any sentence whose whole content is an extracted fact, requirement, or
decision restated, and the specification loses nothing
[[r:specification-does-not-restate-entries]]. The concluding checklist is the deliberate
exception — gathering the tests in one place is its whole job, and a summary artifact is not
prose that failed to add anything.

## What a claim cites

A token belongs on a claim exactly when some decision, component, or other claim would have to
change were the cited foundation false, and nowhere else — a citation on motivation, illustration,
or restatement is a false signal rather than added rigour [[r:explicit-intent]]. The obligation is
symmetric, which is why it reads as a pair of tests and not one: an uncited claim that rests on
something fails, and so does a cited sentence that rests on nothing. That these rules are
themselves written as such tests, rather than prose an author pastes in, is what keeps them from
turning out stilted and uniform [[r:guidance-is-tests-not-templates]].

## Evidence and inherited facts

The evidence rules bind whoever captures a fact; a spec author builds on facts already held to
them rather than re-deriving each [[r:a-rule-binds-the-writer-of-what-it-governs]]. Their test is
at the source: open what a fact cites, and for evidence drawn from outside the author the words it
rests on are there on the page, verbatim — a paraphrase fails because it is the agent's voice
standing where the source's should be, and an assumed fact instead carries the mechanism it rests
on [[r:evidence-is-verbatim]]. A spec author's own duties toward inherited facts are three further
tests a reviewer runs against the prose. First: no claim rests on a fact the author has found
wrong — one shown false, or unsupported by its own evidence, is corrected in place by a new
evidenced fact that supersedes it, not cited as-is or merely flagged
[[r:facts-proven-wrong-are-corrected]]. Second: nothing a decision or component rests on stays
buried in prose — a discovery the design comes to stand on is recorded as a fact meeting the
evidence bar, where it can be checked and reused, while a passing observation is not
[[r:foundational-discoveries-are-recorded-as-facts]]. Third: a reliance on another design's output
appears as a fact in this design's own or a shared scope, sourced to the upstream `spec.md` by
repo-relative url and verbatim quote, never as a direct citation of that design's decisions or
invariants [[r:cross-design-dependency-is-cited-as-a-fact]].

## Falsifiers that can fire

A decision that cannot say what would prove it wrong is not understood well enough to keep, and
the format can only check that the field is filled — whether what fills it is real is this design's
test [[r:decisions-state-their-falsifier]]. That test: a falsifier is real when it names a concrete
condition that could actually arise in building or running the thing and that would reverse the
decision if it did; a restated negation of the choice, or a condition nothing could observe, is a
ticked box [[d:real-falsifier-names-a-condition-that-can-fire]]. Its reach is not limited to
capacity or performance choices — a boundary decision yields a statable falsifier too, though the
boundary kind ("components are routinely split mid-build") tends to be a weaker instrument than a
threshold ("sustained writes exceed the limit") and so earns a harder look
[[f:falsifiers-are-writable-for-boundaries]].

## Cutting a design into components

A component is a unit of work an agent can be handed and build on its own — one dispatchable build
task [[r:components-map-to-dispatchable-build-units]]. Where a boundary falls is the author's
judgement, and the test of a well-drawn one is whether its responsibility is a single such task
and whether its interface to its siblings — all it carries in `responsibility`, `excludes`, and
`after` — is pinned tightly enough to build in parallel without reading a sibling's internals, with
the set small enough to review at once and its serial dependencies marked
[[d:well-drawn-component-is-a-parallel-buildable-unit]].

## Unknowns: resolve now, or carry deliberately

The test for a deferred unknown is whether the evidence in hand already determines it: one that
does is settled now — the fact found, the choice decided, or the matter put to the owner as an open
question — and only one that genuinely cannot be settled at authoring time earns a falsifier or an
assumed fact to carry it [[r:answerable-unknowns-are-resolved-now]]. Writing down a plausible
choice ahead of its evidence is fabrication, not resolution, and raising an open question is itself
a form of answering now rather than a deferral. This duty reaches inherited facts, not only
unknowns met fresh: before a decision or component rests on an assumed fact, its author judges that
fact's resolvability again as if meeting it new, and raises an open question rather than build on it
when verifying or deciding it now would cost little beside building on it and being wrong
[[r:resting-on-an-assumed-fact-is-an-answerable-unknown]].

## The tests

The checklist gathers every test above into one list an author self-checks against and a reviewer
scores a spec by [[r:conclude-with-test-summary]]. It is the design's payoff: a reader who applies
it produces specs that satisfy every reader-facing rule recorded here, because each such rule is
one line on it [[r:instructs-readers-to-follow-the-spec-rules]]. Three rules do not appear as tests
of a produced spec, because they govern this document rather than the specs its readers write —
that its guidance is written as tests and not templates [[r:guidance-is-tests-not-templates]], that
it closes with this very checklist [[r:conclude-with-test-summary]], and that each content rule is
aimed at whoever writes the entry it governs [[r:a-rule-binds-the-writer-of-what-it-governs]].

| # | judges | the test |
|---|---|---|
| 1 | Summary | Reading only it, can a reviewer name the design's subject, its product, and the problem it addresses — plus the dominant constraint when one leads — with no citation present? |
| 2 | build content | Does every passage change what gets built, with a *why* only where its absence would misbuild and no surplus a builder never reads? |
| 3 | specification prose | Does striking any sentence that merely restates an extracted entry leave the specification whole? (this checklist is exempt) |
| 4 | citations | Does every claim that would change were a foundation false carry its token, and does no motivation or restatement carry one? |
| 5 | evidence | Does each fact's outside evidence appear verbatim at its source, and each assumed fact carry its mechanism? |
| 6 | inherited fact — wrong | Is every inherited fact the spec found wrong corrected by a superseding evidenced fact, not cited as-is or merely flagged? |
| 7 | inherited fact — discovery | Is every discovery a decision or component rests on recorded as a fact, not left implicit in prose? |
| 8 | cross-design dependency | Is each reliance on another design's output a sourced fact in this or a shared scope, not a direct citation of that design's decisions or invariants? |
| 9 | falsifiers | Does each decision's falsifier name a condition that could arise and would reverse it — boundary falsifiers included and scrutinised? |
| 10 | components | Is each component one dispatchable build task with an interface pinned for parallel build, the set bounded and serial dependencies marked? |
| 11 | unknowns | Is every unknown the evidence already determines resolved now — found, decided, or raised as an open question — with only the genuinely unresolvable carried as a falsifier or assumed fact, and each assumed fact the design rests on re-judged? |
