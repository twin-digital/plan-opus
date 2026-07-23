# Doc structure

## Summary

This design fixes the artifact: where a design's material sits on disk, what a `spec.md`
contains and in what order, what shape each entry takes, and what a citation token points at.
It specifies what the format can express.

## Three kinds and nothing else

A design here stands on facts, requirements, and decisions, and the split does real work
rather than merely sorting entries into bins [[r:foundations-are-expressible]] [[r:easily-reviewable-foundations]].
Each kind yields to something different: a fact yields to evidence, a requirement yields to
the owner, and a decision yields to a better argument from anyone working the design
[[r:foundations-enter-settled]] [[r:decisions-belong-to-their-design]]. That is why they
cannot share one entry shape with a `kind:` discriminator — the fields that matter differ
because the failure modes differ. A fact without its backing cannot be re-tested. A
requirement without its force cannot be traded off. A decision without a falsifier cannot be
retired on purpose, only abandoned by accident.

The three kinds also differ in where they may appear, and that is what makes the yielding
real rather than declared. Facts and requirements arrive as inputs and sit in files a design
does not write; decisions, components, and open questions are products and sit on the output
side of the design [[r:inputs-outputs-split]]. An agent working inside `spec.md` therefore
cannot edit a requirement in the course of arguing with it — not because it is forbidden in
prose, but because the requirement is not in the file it is editing.

Nothing about this makes an entry good. A fact with a fabricated source and a decision with a
rhetorical falsifier both satisfy every rule below.

## The tree

Three scopes hold foundations, each a directory with at most a `requirements.yaml` and a
`facts.yaml` [[r:three-tier-scopes]]:

```
design/
  requirements.yaml          global scope
  facts.yaml
  <area>/
    requirements.yaml        area scope
    facts.yaml
    <design>/
      brief.md               optional
      requirements.yaml      design scope
      facts.yaml
      decisions.yaml
      spec.md
```

An area is a directory directly under `design/`; a design is a directory directly under an
area; neither nests further. Directory names and entry ids are kebab-case.

The split between a design's inputs and its outputs is by file, not by folder. A `spec.md` must
be safe to delete: when a document has been patched past coherence, the move is the same as for
a band-aided component — throw it out and rebuild rather than patch again. That only works if
everything the rebuild needs survives the delete, so the two regenerable outputs are named
rather than the durable inputs fenced off. `brief.md`, `requirements.yaml`, and `facts.yaml` are
the inputs; `spec.md` and its `decisions.yaml` are the outputs, and they are the only two files
a rebuild removes and rewrites. Naming the outputs keeps the regeneration instruction stable:
*read the design's inputs, write the two outputs* stays correct as the inputs grow, where a list
of filenames in a prompt would be one more hand-maintained rollup that rots.

`brief.md` is owner prose stating what the design is for and where its edges are. It is
optional: a design whose subject is fully pinned down by its requirements needs no brief, and
requiring one there would only invite restatement. It is free prose with no required sections —
a schema on top of it would be premature structure over a document whose whole value is that
the owner writes it in their own words. When present it carries the subject that the input YAML
files cannot — requirements constrain a design that already has one.

The middle tier is what lets knowledge land somewhere the moment it is found rather than
waiting for the design that will use it [[r:enable-easy-capture]]. A fact discovered while
working design A but belonging to the area goes to the area file immediately. Promotion moves
an entry to a wider scope without renaming it, which is only safe because ids do not depend
on where the entry lives — see below.

An area with one design has a nearly empty area scope, and that is the expected shape. Nothing
promotes on the argument that it feels general; it promotes when a second design depends on it.

## The document

The design's output is two files: `decisions.yaml` and the `spec.md` beside it. Decisions
live in their own file [[r:citable-entries-are-foundations]], which also keeps `spec.md`
readable to an audience arriving long after the choices were litigated — once a design is
settled, its argument is what people return to, and a settled decision list is reference
material, not part of the read. The two files share one lifecycle: they are written together,
thrown away together, and regenerated together.

Everything else is `spec.md`: markdown with fenced YAML blocks inside it
[[d:yaml-entries-markdown-prose]]. That split is a bet, not a settled result: prose is what a
person reviews and YAML is what a machine reads, and the format asks the author to write both
rather than choosing. The cost is real — an entry's statement often repeats a sentence of the
argument — and the alternative of pure prose with tagged sentences would halve the writing at
the price of every mechanical check below.

GitHub is where these documents are read, and it strips `style` attributes and `<style>`
elements when rendering markdown [[f:no-inline-styles-in-gfm]]. So there is no styling route
to making structure visible: the format cannot mark a citation or set off a block by
appearance, and every structural signal has to survive as plain text
[[d:structure-in-plain-text]]. Fences and bracket tokens are what is left, and both render
identically in a terminal, a diff, and a browser.

Sections of `spec.md`, in order [[d:fixed-outer-sections]]:

| # | heading | contents |
|---|---|---|
| 1 | `# <design name>` | H1, once |
| 2 | `## Summary` | a paragraph or two, no citations |
| 3 | `## Open questions` | the `questions` block — present only when the design has open questions |
| — | any H2 sections | the argument; the only place citations appear |
| n | `## Components` | the `components` block — present only when the design has components |

Open questions and Components are omitted when the design has none, so a settled design — which
has no open questions by definition — carries neither, and a `spec.md` narrows to Summary and
the argument. When a design does have open questions, that section sits just after the Summary
[[d:fixed-outer-sections]], so the questions and the `decisions.yaml` list can be taken in
before the argument is read and anything that would invalidate it flagged early — the same
reason the lists exist at all [[r:easily-reviewable-foundations]].

Each in-document block is a fenced YAML mapping with one top-level key — `components` or
`questions` — and exactly one block per kind per document
[[d:one-block-per-kind]] [[d:blocks-are-keyed-mappings]]. The wrapper key means a block
declares its own kind, so a parser finds entries by scanning fences rather than by trusting a
heading, and a renamed heading cannot silently orphan a block. The scope YAML files and
`decisions.yaml` carry bare sequences instead, because there the filename already names the
kind and there is nothing to disambiguate.

The kind need not ride inside the block: a fence's info string is literal text in the raw
source [[f:fence-info-string-is-raw-text]], so a tool could read the kind off the fence itself
(```` ```questions ````) with no wrapper key at all. The wrapper key is kept anyway because
tagging the fence that way costs the `yaml` info string that drives syntax highlighting, and
one extra level of indentation is the cheaper price. That trade is the decision's live
falsifier: make a fence tag coexist with highlighting and the wrapper key has no advantage
left.

## Entry shapes

Every entry has a kebab-case `id` and one field carrying its substance. Every field with a
sensible default is optional and omitted at that default, so a typical entry is three or four
lines [[r:foundation-default-fields]] [[d:defaults-are-omitted]].

No entry carries an author, a date, or a revision number. Agents commit under their own git
identities like any other contributor [[f:agents-have-git-identities]], so authorship and
chronology are already recorded, correctly, by the one system that cannot be fooled by an
entry editing its own metadata [[d:no-authorship-fields]].

**Facts** [[r:fact-structure]] — `id`, `claim`, `backing` (`tested` | `documented` |
`assumed`), `sources`; optional `status` (`active` | `retired`, default `active`), `caveat`,
a `reason` (required when retired), and `superseded_by` (required when the reason is
superseded).

`backing` and `sources` are separate on purpose: the first is the weight class of the
evidence, readable at a glance across a whole file, and the second is the evidence itself.
Sorting a file by backing tells a reviewer where to spend attention; sources tell them what to
check when they get there. Every fact needs at least one source, and each source takes exactly
one locator form — a `description` of the mechanism, or a `url` with `where` and `quote`
[[d:facts-require-a-source]]. An assumption from experience is a mechanism and gets a
description; a claim about someone else's system is not and needs the quote. Requiring the
quote inline means a reviewer can judge a source without following it, and a dead link
degrades to a weaker fact instead of an unverifiable one.

Two rules keep the source field from rotting under the operations this format designs for. A
`url` that points inside the repository is written relative to the repo root, not to the file
that holds it [[d:repo-relative-source-paths]] — an entry is expected to move between scopes,
and a path relative to its current file breaks silently on the `git mv` that promotes it,
because the citation still resolves while pointing at a file that has moved. And a `quote` is
always a block scalar (`quote: |`), even for one line [[d:quote-is-block-scalar]]: a quote is
verbatim text from a source the author does not control, exactly where a stray colon, `#`, or
leading dash lives, any of which breaks an inline YAML scalar. Making the block scalar
unconditional takes the escaping judgement out of the one field that most invites it, and it
is mechanically checkable.

A url source may also carry an optional `checked` date. Age on its own does not weaken a fact:
an old date is a prompt to re-verify, not a decay function, and a fact drops only when someone
re-checks and finds the evidence no longer holds [[r:fact-structure]]. That drop is a status
transition, covered next, not a property of the timestamp.

`caveat` is the field that keeps a fact honest without downgrading it — the single source, the
argument from absence, the evidence gathered by the party it suits. A fact can be `documented`,
sourced, and still worth distrusting; without the field the author's only options are to
overstate the fact or drop it.

A fact is `active` or `retired`, and a retired one names *why* [[r:fact-structure]] — which
puts fact status in the same `active | retired` shape as a requirement, with the reason as the
one addition, because reality can retire a fact several ways while only the owner retires a
requirement. The reason is what tells the reader what to do next. `superseded`: a better fact
took its place, named in `superseded_by` — repoint citations at the successor. `disproven`:
found false with nothing standing in for it — re-argue every claim that rested on it. `stale`:
its evidence no longer holds and nothing has replaced it yet — re-verify or retire what leaned
on it. Collapsing the three would hide which of those jobs a retired fact creates.

**Requirements** [[r:requirement-structure]] — `id`, `statement`; optional `force`
(`hard` | `soft`, default `hard`), `status` (`active` | `retired`, default `active`), and
`rationale`.

Requirements carry no sources. They are decided rather than discovered, so there is nothing to
cite; a requirement that needed evidence would be a fact wearing the wrong hat. `rationale` is
optional because fiat needs no justification to bind, and useful because the design that has
to bend around a requirement is easier to write when the intent is visible. A `soft` requirement
can be bent, and when a design bends one it records the departure as a decision citing that
requirement rather than amending the requirement or hanging an exception field on it
[[r:soft-departures-are-decisions]] — the bend has a reason and a falsifier, which makes it a
decision, and it belongs with the design's other reasoning.

**Decisions** [[r:decision-structure]] — `id`, `statement`, `falsifiers`; optional `status`
(`proposed` | `accepted` | `rejected`, default `proposed`). They live in `decisions.yaml`
[[r:citable-entries-are-foundations]].

The statement is one line naming the choice, not the reasoning and not the consequences —
those are the argument's job, and a decision list where each entry is a paragraph is a second
copy of the design rather than an index into it. `proposed` is the default because an agent
writing a design produces proposals; acceptance is an act performed on the document by someone
with the standing to perform it.

At least one falsifier is required [[d:decisions-require-a-falsifier]]. A decision without one
cannot be revisited deliberately: nothing tells a later reader what to watch for, so the
decision either stands forever or gets overturned on taste. Whether a written falsifier is a
real one is a question of content, and belongs to authoring.

**Components** [[r:component-structure]] — `id`, `responsibility` (one line); optional
`excludes` and `after`. A component is a unit of implementation the design commits to — sized
to be built and reviewed on its own.

`excludes` names the nearby responsibility the component deliberately does not hold, which is
the cheapest possible statement of a boundary — boundaries are only visible from their far
side, and "handles retries" says far less than "handles retries, not backoff policy". `after`
names the components that must land first, which is the only ordering information a
specification of an artifact needs; anything richer is a plan, and plans are not this design's
business.

**Open questions** [[r:question-structure]] — `id`, `question`, `closes` (`fact` |
`requirement` | `decision`); optional `gates` naming decisions in the same design.

`closes` names the kind of foundation that would answer the question, which converts an
uncertainty into work with a known shape and a known owner: a fact means go and find out, a
requirement means ask the owner, a decision means argue it here. A question is not a
foundation and nothing may rest on one [[r:question-structure]] — otherwise citing an
acknowledged uncertainty would look like discharging it.

## Citations

A claim in the prose points at the foundation it rests on with `[[f:<id>]]`, `[[r:<id>]]`, or
`[[d:<id>]]` — a single-letter kind for a fact, a requirement, or a decision
[[r:claims-can-cite-foundations]] [[d:citation-token-grammar]]. The short prefix keeps a token
from bulking up the sentence it sits in, which matters because a citation is meant to annotate
a claim, not interrupt it. The obligation to cite — which claims need one, and the equally
important rule that filler must not carry one — is the area's [[r:explicit-intent]]; what this
design supplies is the notation and the guarantee that a pointer lands somewhere definite.

Components and questions have no token [[r:citable-entries-are-foundations]]. A component is a
product of the design like a decision, but nothing rests on a component: a claim that seems to
depend on a boundary depends on the decision that drew the boundary, and citing the decision
says more.

A token resolves by matching its id against every entry of that kind in all three visible
scopes [[d:resolution-is-scope-blind]]. There is no precedence rule and no nearest-wins
search, because an id repeated at a nearer scope is an error rather than an override
[[r:ids-unique-per-kind]]. Zero matches is a dangling citation; two is a duplicate id; one is
the only healthy outcome. Uniqueness is enforced per kind across the entire repository, not
just across the three scopes a given design can see [[d:ids-unique-repo-wide]] — a stricter
rule than required, and it buys two things: promotion between scopes never has to check for a
collision at the destination, and any id is greppable to exactly one definition.

Ids also have to be stable, which is the half of that requirement no check reaches: an entry
whose meaning changes takes a new id rather than a rewritten body, and a rename and a
replacement produce the same diff [[r:ids-unique-per-kind]].

A `[[d:...]]` resolves only within the design it appears in — its own `decisions.yaml`.
Decisions belong to the design that makes them and bind nothing outside it
[[r:decisions-belong-to-their-design]], so a cross-design decision citation is an error rather
than a lookup — the alternative would let one design freeze another's open choice by pointing
at it.

Citation targets must be live. A retired requirement, a retired fact — whatever the reason —
and a rejected decision may not be cited: each records something the design no longer stands
on, and a claim resting on one is a claim resting on nothing.

## Status and settling

A design is `exploring`, `draft`, or `settled`, and the state is read off the artifacts rather
than stored beside them [[r:design-status-enum]] [[d:status-derived-from-content]]:

| state | condition |
|---|---|
| exploring | no `spec.md` |
| draft | a `spec.md` exists but the design is not yet settled |
| settled | merged to `main`, with no open questions, no proposed decisions, and every live design-scoped requirement and accepted decision it holds cited |

A stored status is a claim about the artifacts that can be wrong; a derived one cannot drift.
The content conditions fall out of the area's constraints on settling: a design cannot settle
while it holds an open question or an unaccepted decision [[r:only-settled-work-licenses-building]],
nor while a live design-scoped requirement or an accepted decision it holds goes uncited
[[r:settled-design-cites-what-it-keeps]]. The remaining condition, being merged to `main`, is
what separates a design that *could* settle from one that has: an unmerged branch meeting the
content conditions is ready to settle but not settled, and naming that intermediate state
belongs to process, not here.

Rejected decisions do not block settling and need no citation [[d:rejected-decisions-are-closed]].
A rejected decision is not held by the design; it is a record that the option was considered,
which is worth keeping for the same reason a falsifier is. Reading "not accepted" to include it
would force a design to delete its own history in order to settle.

Which transitions are legal and who performs them is process's, not this design's. What the
format guarantees is that the answer is a function of the tree.

The citation gate is the condition with teeth, and it is what forces the argument to actually
be the argument. A settled design must cite every live design-scoped requirement and every
accepted decision it holds; an uncited one keeps the design in draft
[[r:settled-design-cites-what-it-keeps]]. A requirement the design never invokes was ignored or
misfiled, and a decision no claim rests on is a decision the design does not need. Facts carry
no such obligation, nor do requirements at a wider scope: an uncited fact is available knowledge
rather than an ignored fiat, and an area or global requirement may be answered by a sibling
design instead of this one. Capture stays free at every scope; only settling asserts that the
design used what it kept.

The gate meets [[r:explicit-intent]] from the far side. Explicit intent pushes toward citing
only the claims that rest on something; the gate pushes toward leaving no kept requirement or
decision uncited. They meet at the argument: if a requirement or decision cannot be reached
without pinning a citation to filler, it was not doing any work.

## Invariants

Everything above reduces to rules that hold or do not. This design states them; the harness
decides what enforces them [[r:invariants-are-enforced-or-marked]].

| # | invariant | backstop |
|---|---|---|
| 1 | An area sits directly under `design/`, a design directly under an area, and neither nests further. | checkable |
| 2 | A design directory holds at most `brief.md`, `requirements.yaml`, `facts.yaml`, one `decisions.yaml`, and one `spec.md`. | checkable |
| 3 | Facts and requirements appear only in scope YAML files; decisions only in `decisions.yaml`; components and questions only in a `spec.md`. | checkable |
| 4 | Every entry has a kebab-case `id`, unique within its kind across the repository. | checkable |
| 5 | An entry whose meaning changes takes a new id. | **none** — a rename and a replacement are the same diff |
| 6 | Every entry carries its required fields and no unknown ones. | checkable |
| 7 | Every fact has at least one source, each source has exactly one locator form, every in-repo `url` is repo-root-relative, and every `quote` is a block scalar. | checkable |
| 8 | A retired fact names a reason; one retired as superseded names an existing, different fact as its replacement, with no cycles. | checkable |
| 9 | Every decision lists at least one falsifier. | checkable |
| 10 | A `spec.md` has Summary and the argument in order; the Open questions and Components sections appear at most once each, in position, and only with a non-empty block. | checkable |
| 11 | Every citation token is well formed and resolves to exactly one entry. | checkable |
| 12 | No citation resolves to a question, a component, a rejected decision, a retired requirement, or a retired fact. | checkable |
| 13 | A `[[d:...]]` resolves within its own design; a `gates` entry names a decision in the same design. | checkable |
| 14 | A design offered as settled cites every live design-scoped requirement and every accepted decision it holds. | checkable |
| 15 | Every citation belongs to a claim that would have to change were its target false. | **none** — the test is semantic |
| 16 | A design's state equals the derivation above (settled reads the presence of the design on `main`). | checkable |

Two rules have no mechanical backstop, and both are the same kind of thing: a judgement about
meaning rather than form. Rule 9 is checkable only as presence — whether a falsifier is a real
one is authoring's problem, and so is the content half of rule 15. If a third unbacked rule
appears, the format has outrun what can be checked and should lose a rule rather than gain a
convention.

