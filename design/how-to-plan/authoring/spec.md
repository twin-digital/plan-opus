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

The builder reads the specification — everything after the Summary that is not the Open questions or
Components block, and the only place a citation appears — with every token `[[<k>:<id>]]` struck
out, so what survives that stripping is the whole of what the thing gets built from
[[r:specification-stands-alone-at-build-time]]. That gives the spec two edges to cut against, and
they run in opposite directions.

The first is length. A spec earns its length by what a builder needs, not by completeness: a *why*
belongs only where a builder who lacked it would build the wrong thing, and a passage that
justifies a choice to a reviewer without changing the build is surplus
[[d:minimum-sufficient-specification]]. Both directions of that cut are real failure modes, not a
matter of taste — under-specified requirements lower the correctness of generated code
[[f:underspecified-requirements-degrade-code]], and past the point of sufficiency more detail
lowers it too, as adherence falls with each added constraint and misleading cues creep in
[[f:over-specification-also-degrades-code]]. What raises output is the relevance of what is
present, not its volume [[f:relevance-not-volume-improves-output]], and surplus is not free even
when it is true: accuracy drops as the input grows and as the needed part sits buried among the
rest [[f:context-is-not-free]]. The same cut falls on the tests below: each is here because
applying it costs less than the misbuild it prevents, and one that cannot show that is cut rather
than carried [[r:must-beat-doing-it-myself]].

The second is the values themselves. Every value the build turns on — a path, a filename, a literal
spelling, a format, an enumeration, a default — is stated in the prose or in a component, and never
left to a token to fetch [[r:specification-stands-alone-at-build-time]]: "probe each package's two
fixed source-manifest paths" looks complete while the tokens are present and cannot be acted on the
moment they are gone. So the test is run on the stripped document, not the annotated one.

What the prose carries is the value, not the entry. The foundations themselves stay in the short
lists a reviewer reads first — facts in the `facts/` pool, requirements in `requirements.yaml`, decisions
in `decisions.yaml` [[f:foundations-extracted-into-lists]] — so a literal named in prose leaves that
read whole, while a foundation the design stands on appearing *only* in prose is what breaks it
[[r:easily-reviewable-foundations]].

## Opening by orienting

The first test a spec faces is its Summary: read only that, and a reviewer should be able to say
what the design is, what it produces, and the problem it addresses — the three things that orient
before any detail — plus, when a single constraint clearly dominates, that constraint named up
front [[r:summary-names-subject-product-and-problem]]. A Summary carrying a fourth kind of
content, or a citation token, has overstepped: it is the one section `doc-structure` bars a token
from [[f:summary-carries-no-citation]], so anything that would need one belongs below it.

## What a claim cites

A token belongs on a claim exactly when some decision, component, or other claim would have to
change were the cited foundation false, and nowhere else — a citation on motivation, illustration,
or illustration is a false signal rather than added rigour [[r:explicit-intent]]. The obligation is
symmetric, which is why it reads as a pair of tests and not one: an uncited claim that rests on
something fails, and so does a cited sentence that rests on nothing. That these rules are
themselves written as such tests, rather than prose an author pastes in, is what keeps them from
turning out stilted and uniform [[r:guidance-is-tests-not-templates]].

## Evidence and inherited facts

The evidence rules bind whoever captures a fact, as the requirement-content rules below bind
whoever writes a requirement; a spec author builds on facts and requirements already held to their
own rules rather than re-deriving or reopening them
[[r:a-rule-binds-the-writer-of-what-it-governs]]. Their test is at the source: open what a fact
cites, and for evidence drawn from outside the author the words it
rests on are there on the page, verbatim — a paraphrase fails because it is the agent's voice
standing where the source's should be, and an assumed fact instead carries the mechanism it rests
on. A source takes one of exactly two forms, and which one is the first thing the test looks at: a
`url` with a `where` and a verbatim `quote`, or a `description` of the mechanism the fact was
established by [[f:fact-source-is-quote-or-mechanism]] [[r:evidence-is-verbatim]]. Two further tests run at
that same source. The first is whose page it is: a `documented` fact cites the upstream original,
and a repository file transcribing that original is a convenience copy the fact must point past —
citing it instead makes the author's own output the evidence, and a drifted or invented quote
becomes undetectable [[r:documented-source-is-primary]]. An in-repo url is primary only where the
file is where the claim originates, which is why a cross-design dependency sources to the
upstream's own requirement [[r:upstream-dependency-is-recorded-as-a-fact]]. The second is whether
the quote does the work: a passage genuine, verbatim, and beside the point fails as surely as a
paraphrase, and is the harder failure to see [[r:quote-carries-the-claim]]. A `tested` fact faces
the parallel question of whose test it was: an entry that does not say reads as the author's own
work, and the guarantee that whoever wrote the fact can re-run its evidence decays into a file
existing somewhere. So a test the author did not run is disclosed as such in the source, named to
whoever ran it and to where its artifacts sit [[r:tested-facts-disclose-whose-test]]. Nothing more
is asked of it: an artifacts directory is re-runnable from wherever it already stands.

Two tests run before any of those. The first is where the fact goes: the pool takes any file at
any depth and the path binds nothing, so the choice is the author's and the test is a reading —
does this file's subject describe the claim? A fact filed by the design that happened to need it,
rather than by what it is about, fails, and it never moves again once a second design comes to rest
on it [[r:facts-are-filed-by-subject]]. The second is that a fact recorded twice cannot be
corrected once: the author searches the repository-wide index for an entry already making the
claim, and cites it instead of writing a second [[r:search-before-recording-a-fact]]. Every fact is visible to every
design, so the duplicate is not a local copy but a rival — two settled-looking ids for one claim,
of which only one will be maintained.

A spec author's own duties toward inherited facts are three further
tests a reviewer runs against the prose. First: no claim rests on a fact the author has found
wrong — one shown false, or unsupported by its own evidence, is corrected in place by a new
evidenced fact that supersedes it, not cited as-is or merely flagged
[[r:facts-proven-wrong-are-corrected]]. Second: nothing a decision or component rests on stays
buried in prose — a discovery the design comes to stand on is recorded as a fact meeting the
evidence bar, where it can be checked and reused, while a passing observation is not
[[r:foundational-discoveries-are-recorded-as-facts]]. Third: a reliance on another design's output
appears as a fact, sourced by a `url` written relative to the repository root and a verbatim
`quote`, pointing at the upstream design's `requirements.yaml` — never as a direct citation of that
design's decisions or invariants [[f:in-repo-source-url-is-repo-relative]]
[[f:fact-source-is-quote-or-mechanism]] [[r:upstream-dependency-is-recorded-as-a-fact]]. Its
`spec.md` is a fallback only where no requirement pins the claim, since regenerable prose drifts
out from under a quote. One such fact serves every design that leans on the same commitment: the
pool holds it once, and a second dependent cites it rather than restating it.

## What belongs in a requirement

A requirement is owner fiat, so the test of one is a reversal: would the owner overturn a spec
decision to hold it? A statement that fails that test is design work, and belongs in the spec as a
decision that can be argued with rather than in the file of inputs
[[r:requirements-are-owner-reversal-calls]]. Two further tests read the entry itself. The first is
length: a requirement states its call in a sentence or two, and a carve-out, an exception, or an
absolute a later paragraph qualifies marks one carrying design work — the excess moves to a
decision [[r:a-requirement-is-a-sentence-or-two]]. The second is what the rationale is doing: it
belongs only where reversing the requirement casually would be a mistake the statement alone does
not warn of, and a rationale arguing that the requirement is correct fails whatever else it says
[[r:rationale-records-what-a-reversal-would-cost]].

Those tests bind whoever writes a requirement. The spec author's duty toward one is to honour it,
and a requirement from a wider scope is an obligation on this design rather than something a
sibling might discharge instead. The design cannot settle until every one binding it is cited, so
the token is already compulsory — which is exactly why the reader's test is a different one, run
where the machine stops. The gate asks whether a token is present; this asks whether the claim
under it is true: for each requirement on the list, point to what in the spec satisfies it, or to
the decision recording a departure from a soft one [[r:bound-requirements-are-honoured-or-departed]].
A hard requirement admits only the first, and a citation pinned to filler to clear the gate fails
here even though the checker passed it. The list is printed rather than remembered:
`node bin/foundations.mjs <area>/<design>` renders it with the sets resolved.

## Falsifiers that can fire

A decision that cannot say what would prove it wrong is not understood well enough to keep, and
the format can only check that the decision's `falsifiers` list holds at least one entry
[[f:decision-carries-a-falsifier]] — whether what fills it is real is this design's
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
`after` [[f:component-interface-fields]] — is pinned tightly enough to build in parallel without reading a sibling's internals, with
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
scores a spec by [[r:conclude-with-test-summary]]. Some rows judge a foundation entry rather than
the spec's prose, and each of those falls due when that entry is written, to its author — the
*judges* column names which [[r:a-rule-binds-the-writer-of-what-it-governs]]
[[d:checklist-covers-entry-tests]]. It is the design's payoff: a reader who applies it produces
specs that satisfy every reader-facing rule recorded here, because each such rule is one line on
it [[r:instructs-readers-to-follow-the-spec-rules]]. Three rules do not appear as tests of a
produced spec, because they govern this document rather than the specs its readers write —
that its guidance is written as tests and not templates [[r:guidance-is-tests-not-templates]], that
it closes with this very checklist [[r:conclude-with-test-summary]], and that each content rule is
aimed at whoever writes the entry it governs [[r:a-rule-binds-the-writer-of-what-it-governs]].

| # | judges | the test |
|---|---|---|
| 1 | Summary | Reading only it, can a reviewer name the design's subject, its product, and the problem it addresses — plus the dominant constraint when one leads — with no citation present? |
| 2 | build content | Does every passage change what gets built, with a *why* only where its absence would misbuild and no surplus a builder never reads? |
| 3 | build content — stands alone | Strike every citation token — does the specification still say what to build, with every path, literal, format, and default present in the prose or a component? |
| 4 | citations | Does every claim that would change were a foundation false carry its token, and does no motivation or illustration carry one? |
| 4a | spec — bound requirements | For every requirement binding this design, can a reviewer point to what satisfies it, or to a decision recording a departure from a soft one? |
| 5 | fact — evidence | Does each fact's outside evidence appear verbatim at its source, and each assumed fact carry its mechanism? |
| 5a | fact — provenance | Does each `documented` fact cite the upstream original rather than a repository file transcribing it, an in-repo source appearing only where that file originates the claim? |
| 5b | fact — quote fit | Does each quote state the claim its fact makes, rather than being genuine but beside the point? |
| 5c | fact — whose test | Does each `tested` fact its author did not run say so and name whose test it was, and where its artifacts sit? |
| 5d | fact — filing | Is each fact in the pool file whose subject describes its claim, rather than the one the design that needed it happened to own? |
| 5e | fact — duplicates | Was the repository-wide fact index searched before each new fact was recorded, so no entry restates a claim already held under another id? |
| 6 | inherited fact — wrong | Is every inherited fact the spec found wrong corrected by a superseding evidenced fact, not cited as-is or merely flagged? |
| 7 | inherited fact — discovery | Is every discovery a decision or component rests on recorded as a fact, not left implicit in prose? |
| 8 | cross-design dependency | Is each reliance on another design's output a fact sourced to the upstream's requirement, not a direct citation of that design's decisions or invariants? |
| 9 | requirement — is it the owner's call | Would the owner reverse a spec decision to hold this, rather than it being design work that belongs in the spec as a decision? |
| 10 | requirement — length | Is it stated in a sentence or two, carrying no carve-out, exception, or absolute a later paragraph qualifies? |
| 11 | requirement — rationale | Does a rationale appear only where a casual reversal would be a mistake the statement does not warn of, and nowhere argue that the requirement is correct? |
| 12 | falsifiers | Does each decision's falsifier name a condition that could arise and would reverse it — boundary falsifiers included and scrutinised? |
| 13 | components | Is each component one dispatchable build task with an interface pinned for parallel build, the set bounded and serial dependencies marked? |
| 14 | unknowns | Is every unknown the evidence already determines resolved now — found, decided, or raised as an open question — with only the genuinely unresolvable carried as a falsifier or assumed fact, and each assumed fact the design rests on re-judged? |
