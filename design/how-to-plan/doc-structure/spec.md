# Doc-structure

## Summary

This design fixes the artifact. It says where a design lives on disk, what its `spec.md`
contains, the shape of every entry it can hold, and what a citation points at. The product is a
format: a directory layout, a set of entry schemas, a citation grammar, and a list of invariants
stated tightly enough that a machine can check them. An agent handed only another design's inputs
can write against this format without asking how it works.

The format answers the reviewer's problem. Foundations have to read as a short list, and their
shape has to be uniform. Otherwise the machine cannot catch a malformed one, and the reviewer is
back to reading prose at full attention. One constraint shapes everything below: the format must
be read two ways at once, by a person and by a machine, from the same source. The bet that
resolves it is to carry structured data in fenced blocks. A renderer shows the block as-is, and a
tool reads it from the raw text.

## The design tree

Foundations live in a directory tree with exactly three tiers. A global root sits at the top. An
area sits under it. A design sits under the area. Each tier is a directory, and each holds at most
a `requirements.yaml` and a `facts.yaml`. There is no fourth tier, and areas do not nest
[[r:three-tier-scopes]]. The three tiers exist so a foundation can bind everything, or one area,
or one design, and nothing narrower.

A design's own directory splits durable inputs from regenerable outputs, and the split is by file,
not by folder. Its `requirements.yaml` and `facts.yaml` are the inputs, and they endure. Its
`decisions.yaml` and `spec.md` are the outputs: the design produces them, and nothing upstream may
write into them [[r:inputs-outputs-split]]. Because only the file tells inputs from outputs, you
can drop a fact or requirement into the right scope the moment you find it. You do not need to know
which design will use it first, so knowledge is never stranded [[r:enable-easy-capture]].

Every entry has an id, and everything else resolves through it. An id is unique per kind across the
whole repository, not just across the three scopes one design can see [[r:ids-unique-repo-wide]]. A
repeat at a nearer scope is an error, never an override. And when an entry's meaning changes, it
gets a new id rather than a rewritten body [[r:ids-unique-per-kind]]. That repo-wide uniqueness is
what lets a citation ignore scope, as shown below.

## The three foundations

A design stands on exactly three kinds of foundation: facts, requirements, and decisions. Each has
a fixed shape, so a reader knows on sight which kind they are looking at
[[r:foundations-are-expressible]]. These three kinds are the whole reviewable surface. The format
is built to be read as its foundations plus the prose that ties them together
[[r:easily-reviewable-foundations]].

The kinds differ by where their authority comes from. A fact is held true on evidence, and it
yields only to better evidence. A requirement is the owner's call, and it yields only to the owner.
A design does not reopen either one while it argues itself; both are settled and stay put
[[r:foundations-enter-settled]]. A decision is the design's own. It answers a question the facts
and requirements leave open. It can be reopened freely while the design is in flux, and it dies
when the design is thrown away. It never binds a sibling design facing the same question: two good
designs may answer that question differently and both be right
[[r:decisions-belong-to-their-design]].

Only these three kinds can be cited, and each lives in a YAML file. Facts and requirements live in
a design's own directory or a wider scope. Decisions live in a `decisions.yaml` beside the
`spec.md`. Components and open questions live in the document and are never cited
[[r:citable-entries-are-foundations]]. Keeping every citable kind in a file is what makes every
citation resolve the same way, to one entry in one file, so a citation always means "this rests on
something settled."

## Entry shapes

Every field name and enum value below is the format's public interface. The shapes are shown the
way they sit on disk. A field with a sensible default is left out when it takes that default, so a
document shows only what departs from the norm [[r:foundation-default-fields]]
[[r:defaults-are-omitted]]. The one exception is a decision's `status`, which is always written,
even when it is `proposed`. Every id is kebab-case.

**Fact** [[r:fact-structure]]. Required fields: `id`; `claim`, which states the fact; `backing`,
exactly one of `tested`, `documented`, or `assumed` (the three do not carry equal weight); and
`sources`, at least one. Each source takes exactly one form. It is either a `description` of the
mechanism the fact rests on, or a `url` that also carries `where` (a pointer to the right section)
and a verbatim `quote` [[r:facts-require-a-source]]. A `url` that points inside this repository is
written relative to the repo root, not to the file that holds it [[r:repo-relative-source-paths]].
A `quote` is always a block scalar, even when it is one line [[r:quote-is-block-scalar]]. Optional
fields: a `status` of `active` or `retired` (default `active`), and a `caveat` that records why the
fact might not hold despite its backing. A retired fact adds a `reason` of `superseded`,
`disproven`, or `stale`; a superseded fact names its replacement in `superseded_by`.

```text
- id: fence-info-string-is-raw-text
  claim: a fenced block's info string is literal text on the opening fence line ...
  backing: documented
  sources:
    - url: https://spec.commonmark.org/0.31.2/
      where: §4.5 Fenced code blocks — definition of the info string
      quote: |
        The line with the opening code fence may optionally contain some text ...
```

**Requirement** [[r:requirement-structure]]. Required fields: `id` and a `statement`. Optional
fields: a `force` of `hard` or `soft` (default `hard`), a `status` of `active` or `retired`
(default `active`), and a `rationale`. A hard requirement is non-negotiable. A soft one is a
preference that may bend when justified. A requirement carries no `sources`. When a design departs
from a soft requirement, it does not amend the requirement or tag it with an exception. It records
the departure as a decision that cites the requirement, because bending a soft requirement is a
choice with a reason and a falsifier, which makes it a decision [[r:soft-departures-are-decisions]].

**Decision** [[r:decision-structure]]. Required fields: `id`; a single-line `statement` naming what
was chosen, not why and not what follows from it; `falsifiers`, at least one condition that would
overturn the decision or force a rewrite [[r:decisions-require-a-falsifier]]; and a `status`,
always written. The `status` is one of `proposed` (created but not ratified), `accepted` (an agreed
part of the design to keep), `tolerated` (cleared to proceed but not endorsed, so a later author
may rework it freely), or `rejected` (considered and turned down). A rejected decision needs no
falsifier. It is kept only as a record, blocks nothing, and may not be cited
[[r:rejected-decisions-are-closed]].

**Component** [[r:component-structure]]. Required fields: a stable `id` and one line of
`responsibility` naming what it holds. Optional fields: `excludes`, the nearby responsibility it
deliberately leaves out, and `after`, the components that must land before it. `excludes` is the
cheapest way to state a boundary, because a boundary is defined by its far side.

**Open question** [[r:question-structure]]. Required fields: a stable `id`, the `question`, and
`closes`, the kind of foundation that would answer it, one of `fact`, `requirement`, or `decision`.
Optional field: `gates`, the decisions the question blocks. A question is not a foundation, and no
claim may rest on one. Naming the foundation that would close it turns the question into work with a
known shape.

## The spec.md document

A `spec.md` opens with a Summary. The specification follows: the rest of the prose, and the only
place citations appear. Two sections can bracket the specification. An Open questions section
appears right after the Summary, but only when the design has open questions. A Components section
appears at the end, but only when the design has components. Decisions never appear in the
document; they live in `decisions.yaml` [[r:fixed-outer-sections]]. The three fixed sections use
the exact H2 headings `## Summary`, `## Open questions`, and `## Components`
[[d:fixed-section-headings]].

Components and open questions are the only structured data the document itself carries, and each
appears in exactly one fenced block [[r:one-block-per-kind]]. The block's body is a YAML mapping
with exactly one top-level key, and that key names the kind, `components` or `questions`. The key
maps to the sequence of entries [[r:blocks-are-keyed-mappings]] [[d:block-and-file-encoding]]. Each
block's info string is `yaml`, so the block a renderer shows on screen is the same block a tool
reads from the raw text. A fenced block's info string is literal text on the opening fence line,
whatever a renderer does with the block [[f:fence-info-string-is-raw-text]]. GitHub also strips
styling from rendered markdown, so a block's identity can only be its raw fence and info string,
never anything a stylesheet adds [[f:no-inline-styles-in-gfm]]. This is the trade the whole format
turns on: readable by a person, parseable by a machine, from one source.

That trade creates a self-reference. A spec about the format has to show on-disk shapes, and those
shapes are themselves YAML. The fix is simple: every illustrative snippet uses a fenced block whose
info string is not `yaml`. A tool reading the real data blocks then never mistakes an example for a
live one [[d:examples-fenced-as-non-yaml]]. The snippets above use exactly that convention.

## Citations and resolution

A claim in the prose may point at the foundation it rests on. The pointer resolves to exactly one
entry, so the reader never has to go looking [[r:claims-can-cite-foundations]]. The format supplies
the pointer. How much of a design must be cited is a separate matter: a claim owes a citation only
where some decision, component, or other claim would have to change if the cited foundation were
false [[r:explicit-intent]].

A citation is the token `[[<k>:<id>]]`. The kind is a single letter: `f` for a fact, `r` for a
requirement, `d` for a decision [[r:citation-token-grammar]]. It resolves scope-blind. The id is
matched against every entry of that kind across all three tiers, and exactly one match is required;
any other count is an error [[r:resolution-is-scope-blind]]. Scope-blind matching is safe only
because ids are unique per kind repo-wide. Without that guarantee, resolution would need a rule for
which tier wins. A design may cite anything visible at its own tier, its area's tier, or the global
tier, and nothing that belongs to another design.

## Design state

A design is in one of three states: `exploring`, `draft`, or `settled`. The state is computed from
what exists in the tree, never stored next to it, so it cannot drift from the artifacts the way a
stored copy would [[r:design-status-enum]]. The reading is mechanical. No `spec.md` means
`exploring`. A `spec.md` is `draft` when it carries a proposed decision, an open question, or an
uncited live design-scoped requirement or accepted-or-tolerated decision. A design merged to main
with none of those is `settled` [[r:status-derived-from-content]].

State is what a design licenses. Only a `settled` design licenses building on it. A design that
holds an open question or a still-proposed decision cannot settle. A rejected decision blocks
nothing, because it is the record of an option considered, not something the design holds
[[r:only-settled-work-licenses-building]].

The last bar on settling is about citations. A design cannot settle while a live design-scoped
requirement, or an accepted or tolerated decision it holds, has no claim citing it. Those are the
two things a settled design must actually stand on. Facts do not carry this obligation, and neither
do requirements at wider scopes. So capture stays free everywhere, and the only citation debt comes
due at settle [[r:settled-design-cites-what-it-keeps]]. Which of these transitions are legal, and
who performs them, is process's to decide, not this design's.

## Invariants

Every invariant here is either enforced by the harness or marked as having no mechanical backstop.
Nothing that is enforced is also reviewed by hand [[r:invariants-are-enforced-or-marked]]. The list
is what a well-formed spec passes. Green is the floor, not proof that the design is any good.

Enforced by the harness, entry by entry:

- Every id is kebab-case and unique per kind repo-wide.
- A fact carries `id`, `claim`, and a `backing` from the enum. It has at least one source in
  exactly one form. A `url` source never carries a `description`, always carries `where`, and is
  repo-relative when it points in-repo. Every `quote` is a block scalar.
- A requirement carries `id` and `statement`, a `force` and `status` from their enums, and no
  `sources`.
- A decision carries `id`, `statement`, and a written `status` from its enum. It has at least one
  falsifier unless it is rejected.
- Any field sitting at its default is left out.
- A retired fact carries a valid `reason`, and a superseded one carries a `superseded_by` that
  resolves.

Enforced in the document:

- A component carries `id` and `responsibility`, and every `after` resolves to a sibling.
- An open question carries `id`, `question`, and a `closes` from the enum, and it gates only local
  decisions.
- A conditional block that is present but empty is an error.

Enforced for citations:

- Every token matches the grammar and resolves to exactly one live entry of the named kind.
- No token points at another design's entry, and no decision is cited from outside its own design.

Enforced at settle:

- No live design-scoped requirement and no accepted-or-tolerated decision is left uncited.

Some invariants have no mechanical backstop. The checker cannot see these, so a reviewer must:

| invariant | why it cannot be checked |
|---|---|
| An id is stable: a changed meaning gets a new id, not a rewrite. | A rename and a replacement are the same diff. |
| A decision's `statement` names the choice, not its reasons or results. | Whether a sentence smuggles in reasoning is a reading, not a match. |
| A fact's `backing` reflects how the fact was really established. | The enum value is checkable; its truth is not. |
