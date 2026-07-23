# Authoring

> **⚠ PLACEHOLDER — not derived from the inputs.** This file records the authoring content
> rules in minimal form so other artifacts can point at `authoring/spec.md` as their owner. It
> will be deleted and regenerated in full from the inputs; it carries no decisions and no
> citations, and its one open question keeps it `draft` on purpose.

## Summary

Authoring fixes what makes the *content* of a spec good, as distinct from the shape
`doc-structure` fixes. A `spec.md` is the primary document a builder builds from, so every rule
below serves one end: a builder can build the right thing from the spec alone, and a reviewer can
see from the citations what the design rests on.

## Open questions

```yaml
questions:
  - id: authoring-spec-is-a-placeholder
    question: the full authoring spec has not been derived from its inputs; this file is a
      minimal stand-in and must be regenerated
    closes: decision
```

## The spec is a build document

Write the spec to tell a builder *what to build and how* — completely enough to implement from
without the inputs at hand — with a minimum of *why*. Give a reason only where a builder needs it
to build correctly. The deeper justification (a fact's evidence, a decision's falsifier, a
requirement's rationale) lives in the foundations and is checked at review, not carried into the
build.

## Orient, and do not re-narrate

The Summary names what the design is, what it produces, and the constraint that most shapes it,
before any detail. Beyond that, do not re-narrate the extracted lists: the requirements, facts,
and decisions are pulled out for review and for the builder's crib, so prose that merely restates
one adds nothing. State the design's own commitments and let a citation point at what they rest
on.

## Cite what carries weight

A claim carries a citation when some decision, component, or other claim would have to change were
the cited foundation false — and nothing else does. Citations are the hook the machine and a
reviewer use to check the design rests on its foundations, so a citation on filler is a false
signal, and citing everything signals as much as citing nothing.

## Evidence is quoted, not paraphrased

Evidence drawn from a source outside the author is reproduced verbatim, never summarized; an
assumed fact, backed by experience, carries a description of its mechanism instead. A paraphrase
is the author's voice — the thing a citation exists to guard against — and cannot be re-verified
at a glance.

## A falsifier must be able to fire

A real falsifier names a later development that is observable, not already settled either way, and
decisive for this decision in particular. A restatement of the decision, an impossibility, or a
condition that would overturn any decision at all is filler however confidently written.

## Answer an unknown you can answer now

An unknown that can be settled at authoring time — found as a fact, decided, or raised as an open
question to the owner — is settled then, not parked as an assumed fact or a decision's falsifier.
Those carry only the unknowns that genuinely cannot be resolved yet.
