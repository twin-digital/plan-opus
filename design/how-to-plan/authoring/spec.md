# Authoring

## Summary

This design fixes the *content* of a spec, where `doc-structure` fixes its shape. A spec is the
one document a builder builds from, so good content is content that lets a competent builder build
the right thing and lets a reviewer see from the citations what it rests on. It produces a set of
rules — each written as a test a reviewer applies to a finished spec — and a checklist that gathers
them at the end of every spec.

The problem is that a well-formed spec can still be a bad build document. Too little detail and the
generated code drifts; too much, or too much irrelevant context, and it drifts the other way. The
one constraint that shapes everything here is that almost none of this can be machine-checked: each
rule is enforced by a reader or not at all, so each is written as a question a reader can answer,
not a template an author fills in.

## Open questions

```yaml
questions:
  - id: boundary-fields-carry-a-parallel-interface
    question: do a component's responsibility, excludes, and after fields pin the interface between
      components well enough for a parallel build to integrate, or does dispatchable cutting need
      more than doc-structure gives it
    closes: fact
    gates:
      - components-cut-at-dispatchable-boundaries
```

## Reading these rules as tests

Every rule below is a question a reviewer asks of a spec after it is written, not a shape to pour
prose into [[r:guidance-is-tests-not-templates]]. A prescriptive template would flatten the prose it
governs; a test leaves the writing free and only asks whether the result holds.

A rule binds whoever writes the entry it governs. The evidence rules bind a fact's author at the
moment the fact is captured, outside and before any spec; the citation, restatement, Summary,
falsifier, unknown, and component rules bind the author of a `spec.md` and its `decisions.yaml`. A
spec author consumes facts already held to the evidence bar rather than re-deriving them
[[r:a-rule-binds-the-writer-of-what-it-governs]].

A reader of this spec produces specifications that pass every rule that follows
[[r:instructs-readers-to-follow-the-spec-rules]]; the checklist at the end is the list to run them
against, and its ids name each rule.

## What the spec owes a builder

A spec states what to build and how. The cost of getting this wrong is one-sided at the low end:
ambiguous or missing requirements measurably lower the correctness of generated code
[[f:underspecified-requirements-degrade-code]], so an answerable detail a builder needs is pinned,
not left open.

More detail is not the safe direction either. Adherence falls as constraints pile up, and
irrelevant material in the context degrades accuracy on its own
[[f:over-specification-also-degrades-code]] [[f:context-is-not-free]]. So the spec carries a reason
only where a builder needs it to build the thing correctly, and omits motivation offered for its
own sake [[d:reason-only-where-a-builder-needs-it]]. What helps a builder is relevance, not volume
[[f:relevance-not-volume-improves-output]].

The requirements, facts, and decisions are already extracted for review and drawn into the builder's
crib, so specification prose that only restates one of them adds nothing the reader did not already
have; the prose earns its place by doing the connective work the lists cannot show
[[r:specification-does-not-restate-entries]]. The concluding checklist is the single exception,
because gathering the tests in one place is its whole job.

## Opening by orienting

The Summary names three things and stops: what the design is, what it produces, and the problem it
addresses — the last being the one element every design has and the thing that orients a reviewer to
why the design takes its shape. When a single constraint dominates the design it is named here too,
because that is the big rock a reviewer wants before any detail; when several bind about equally they
belong in the specification instead. The Summary carries no citation
[[r:summary-names-subject-product-and-problem]].

## Citations carry intent

A claim points at the fact, requirement, or decision it rests on exactly when that claim would have
to change were the target false; a token on a sentence that would survive its target's removal is a
false signal, not extra rigour [[r:explicit-intent]]. The test cuts both ways: it is the reason a
citation means something, and the reason motivation, illustration, and restatement do not get one.
The foundations a claim cites are the concise, reviewable list the whole approach rests on
[[r:easily-reviewable-foundations]].

## Evidence and fact hygiene

Evidence drawn from a source outside the author is reproduced verbatim, never summarized — a
paraphrase is the agent's voice, which is the one thing a citation exists to keep out — while an
assumed fact, backed by the author's own experience, carries a description of its mechanism instead
[[r:evidence-is-verbatim]]. The quoted span is the shortest verbatim slice that still carries the
claim: a full-page quote reintroduces the irrelevant-context penalty the citation was meant to avoid
[[d:quote-is-the-shortest-carrying-span]] [[f:context-is-not-free]].

The author's duty reaches the facts they inherit. A fact found wrong, or whose evidence does not
support its claim, is corrected — recorded as a new, properly evidenced fact that supersedes the one
it contradicts — rather than cited as-is or merely flagged, because a fact is objective and a spec is
not built on one known to be false [[r:facts-proven-wrong-are-corrected]]. A discovery the author
makes while writing that a decision or component comes to rest on is recorded as a fact meeting the
same evidence bar, not left implicit in the prose where no one can check or reuse it
[[r:foundational-discoveries-are-recorded-as-facts]].

## Unknowns

An unknown the evidence in hand determines is resolved at authoring time, not deferred: find the
fact, decide it, or raise it as an open question to the owner. Writing down a plausible choice ahead
of its evidence is fabrication, not resolution; only an unknown that genuinely cannot be settled yet
is carried — as a decision's falsifier when a named later event would reopen it, or as an assumed
fact the design must rest on and cannot cheaply verify [[r:answerable-unknowns-are-resolved-now]].
An open question is itself a resolve-now move, an ask the owner must answer before the design settles.

That duty reaches inherited assumed facts too. Before a component or decision leans on an assumed
fact, the author re-judges it as if meeting it fresh and raises a question instead of building on it
when verifying or deciding it now costs little beside building on it and being wrong
[[r:resting-on-an-assumed-fact-is-an-answerable-unknown]].

## Falsifiers

A decision that cannot say what would prove it wrong is not understood well enough to keep
[[r:decisions-state-their-falsifier]]. The test of a written falsifier is whether it names a concrete
condition that could be observed to fire and reopen the decision, rather than restating the choice or
hedging rhetorically [[d:falsifier-names-a-firing-condition]].

The bar is meetable beyond capacity and performance decisions. A boundary decision states an
observable condition — the components it drew getting split or merged in practice — and such
conditions do fire without being filler [[f:falsifiers-are-writable-for-boundaries]]. A convention,
a pick among near-equivalent options made for consistency, has no external metric, so its falsifier is
the condition under which the convention's own cost outweighs the benefit it buys
[[d:a-convention-decision-fires-on-its-own-cost]].

## Components as build units

A component is one unit of work a builder can be handed and build on its own — one dispatchable task
[[r:components-map-to-dispatchable-build-units]]. Where a boundary falls is the author's judgement,
revisable in review but not by the builder: components are cut so each is dispatchable with its
interface to the rest pinned well enough for a parallel build to integrate, and so the count stays
bounded with serial dependencies marked [[d:components-cut-at-dispatchable-boundaries]]. Whether the
boundary fields carry a real interface is the open question above.

## Depending on another design

A design that relies on another design's output re-expresses each upstream commitment it depends on
as a documented fact in its own or a shared scope, sourced to the upstream `spec.md` by repo-relative
url and verbatim quote; it never cites another design's decisions or invariants, and its own
requirements or decisions carry what it does about them
[[r:cross-design-dependency-is-cited-as-a-fact]]. A cross-design decision citation is an error and an
invariant has no token, so the fact is the only first-class way to record the dependency — and
re-checking the quote is how drift is caught.

## The concluding checklist

Every spec ends with the tests the rules above define, gathered as a list a reviewer runs against a
finished spec and an author runs before handing one off [[r:conclude-with-test-summary]]. This is the
one place restatement is intended rather than avoided. Each row names the rule by id and the question
to ask.

| foundation | the test |
|---|---|
| `r:guidance-is-tests-not-templates` | Is each rule stated as a question asked of the spec, not a template to fill? |
| `r:a-rule-binds-the-writer-of-what-it-governs` | Does each rule bind the writer of the entry it governs — evidence rules on fact capture, the rest on the spec author? |
| `r:instructs-readers-to-follow-the-spec-rules` | Does the spec direct its reader to produce specs passing every rule listed here? |
| `f:underspecified-requirements-degrade-code` | Is every detail a builder needs to build correctly pinned rather than left open? |
| `d:reason-only-where-a-builder-needs-it` | Does the spec state what and how, giving a reason only where a builder needs it, and cut motivation for its own sake? |
| `r:specification-does-not-restate-entries` | Does every specification sentence do connective work, none merely restating an extracted entry (checklist excepted)? |
| `r:summary-names-subject-product-and-problem` | Does the Summary name subject, product, problem, and the dominant constraint when one leads — and carry no citation? |
| `r:explicit-intent` | Does a claim cite exactly when it would have to change were the target false, and does no filler carry a token? |
| `r:evidence-is-verbatim` | Is outside evidence quoted verbatim, and an assumed fact backed by a description of its mechanism? |
| `d:quote-is-the-shortest-carrying-span` | Is each quote the shortest verbatim span that still carries its claim? |
| `r:facts-proven-wrong-are-corrected` | Is every inherited fact found wrong corrected as a new superseding fact, not cited as-is or just flagged? |
| `r:foundational-discoveries-are-recorded-as-facts` | Is every discovery a decision or component rests on recorded as an evidenced fact, not left in prose? |
| `r:answerable-unknowns-are-resolved-now` | Is every unknown the evidence in hand determines resolved now, with only genuinely unresolvable ones parked? |
| `r:resting-on-an-assumed-fact-is-an-answerable-unknown` | Was each inherited assumed fact re-judged fresh before the design leaned on it? |
| `r:decisions-state-their-falsifier` | Does every decision state what would prove it wrong? |
| `d:falsifier-names-a-firing-condition` | Does each falsifier name an observable firing condition rather than restate or hedge the decision? |
| `d:a-convention-decision-fires-on-its-own-cost` | Does each convention decision falsify on its own cost outgrowing its benefit? |
| `r:components-map-to-dispatchable-build-units` | Is each component one dispatchable build task? |
| `d:components-cut-at-dispatchable-boundaries` | Are boundaries cut so interfaces are pinned for parallel build, the count bounded, and serial dependencies marked? |
| `r:cross-design-dependency-is-cited-as-a-fact` | Is every upstream dependency recorded as a sourced fact, with no cross-design decision or invariant citation? |
| `r:conclude-with-test-summary` | Does the spec end with this checklist? |
