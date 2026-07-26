# plan-opus

Planning repository. Designs live under `design/<area>/<design>/`; the artifact format is
specified by `design/how-to-plan/doc-structure/spec.md` and the content rules by
`design/how-to-plan/authoring/spec.md`. Validate every change with `npm run check`.

## Agents may propose facts

An agent writing or revising a spec may add entries to a `facts.yaml`, at any scope, provided
each new fact meets one of:

a. **Documented elsewhere** — its sources cite the evidence as `doc-structure` requires: a
   `url` with `where` and a verbatim `quote`, or a `description` of the mechanism for an
   assumed fact. The url is the upstream original, and the quote states the claim, per
   `r:documented-source-is-primary` and `r:quote-carries-the-claim` in
   `design/how-to-plan/authoring/requirements.yaml`. A file you wrote in this repository is
   never the source, however faithfully it transcribes the original.
b. **Tested directly** — the agent ran the test itself, and the design's `artifacts/`
   subfolder holds the actual scripts and inputs used, plus their outputs when the test
   produces any. The fact's `sources` name those files and state the observed result. What
   an artifact contributes is captured output; a prose conclusion the agent wrote there is
   interpretation, and a fact resting on it belongs under (a) or as an open question. This bar
   is claimed on your own behalf only: a test you did not run is disclosed per
   `r:tested-facts-disclose-whose-test`, naming whose test it was and where its artifacts sit.

A fact meeting neither bar is recorded as an open question instead.

The same bar governs repairing one. An inherited fact an agent finds wrong, or whose evidence does
not carry its claim, is corrected rather than cited as-is or merely flagged, per
`r:facts-proven-wrong-are-corrected`: record the replacement at the bar above, and retire the fact
it contradicts with a `reason` and a `superseded_by` naming the replacement. A retired fact may not
be cited, so every citation of it moves to the replacement.

Proposed and retired facts are input changes and get owner review: the PR description must call
each one out.

## Requirements are the owner's

A requirement is something the owner would reverse a spec decision over. Anything else — however
true — is a decision the spec makes and defends. Requirements are stated in a sentence or two; one
needing paragraphs of carve-outs is a decision wearing the wrong hat.

Building to the requirements as written is the default. An agent may flag a requirement it cannot
satisfy — once, with the measurement that shows the cost: a count, a failed build, a number. It may
propose a requirement the way it proposes a fact, as an input change called out in the PR
description.

An agent may not reopen a requirement because its prose reads inconsistently with another's,
because a rationale no longer matches a superseded regime, or because a better framing suggests
itself. A fact that contradicts a requirement is still a stop-and-ask; an opinion about phrasing is
not. Finding nothing to raise is a successful review.

## Facts are repo-wide; requirements are not

Any design may cite any fact, whichever scope files it. Before recording one, search
`node bin/foundations.mjs --facts` and cite what is already there. File a new fact at the
narrowest scope that describes its **subject** — not the design that needs it — and leave it
there when a second design comes to depend on it. Requirements are fenced: a design cites its
own, its area's, and the global ones, and is bound by those whose `applies_to` names it. A
decision is citable only by the design that made it.
