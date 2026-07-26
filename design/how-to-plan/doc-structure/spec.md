# Design Document Structure

## Summary

This design fixes the artifact: where a design lives on disk, what its `spec.md` contains, the
shape of every entry it can hold, and what a citation points at. Its product is a format — a
directory layout, a set of entry schemas, a citation grammar, and a list of invariants stated
tightly enough that a machine can check them — that an agent handed only some other design's
inputs can write against without asking how the format works. The problem it answers is the
reviewer's: foundations have to be legible as a short list and their form has to be uniform, or
the machine cannot catch a malformed one and the reviewer is back to reading prose at full
attention. The one constraint that shapes everything below is that the format must be read two
ways at once — legible to a person and parseable by a machine from the same source — and the bet
that resolves it is to carry structured data in fenced blocks a renderer shows verbatim and a
tool reads from the raw text.

## The design tree

Foundations live in a directory tree of exactly three tiers — a global root, an area beneath it,
and a design beneath that — each tier a directory holding at most a `requirements.yaml` and a
`facts.yaml`, with no fourth tier and no nesting of areas; beside them at the root sits
`sets.yaml`, which names groups of designs and holds no foundations
[[r:three-tiers-hold-foundations]]. The three tiers file a foundation and group it for a reader;
which designs a requirement *binds* is stated on the requirement, not read off its path (below).
A design's own
directory then splits what endures from what is regenerable along the file boundary, not a folder
one: its `requirements.yaml` and `facts.yaml` are durable inputs, while its `decisions.yaml` and
`spec.md` are outputs the design produces and nothing upstream may write into [[r:inputs-outputs-split]].
Because inputs and outputs are separated only by which file holds them, a fact or requirement can be
dropped into whatever scope it belongs to the moment it is found, without first knowing which design
will consume it — knowledge is never stranded for want of a home [[r:enable-easy-capture]]. Laid out
on disk, the three tiers and the input/output split take this shape [[r:spec-shows-layout-as-tree]]:

```text
design/
├── requirements.yaml            global-scope inputs
├── facts.yaml
├── sets.yaml                    named sets of designs
└── how-to-plan/                 an area
    ├── requirements.yaml        area-scope inputs
    ├── facts.yaml
    └── doc-structure/           a design
        ├── requirements.yaml    design inputs (durable)
        ├── facts.yaml
        ├── decisions.yaml       design outputs (regenerable)
        └── spec.md
```

An id is the handle everything else resolves through, so within a kind it is unique across the whole
repository, not merely across the three scopes one design can see [[r:ids-unique-repo-wide]]; a
repeat at a nearer scope is an error, never a shadowing override, and an entry whose meaning changes
earns a fresh id rather than a rewrite of the old one [[r:ids-unique-per-kind]]. That repo-wide
uniqueness is what lets resolution ignore scope entirely (below).

## The three foundations

A design stands on exactly three kinds of foundation — facts, requirements, and decisions — and
each has a fixed form a reader recognises on sight without being told which they are looking at
[[r:foundations-are-expressible]]. These three are the whole reviewable surface: a design read as
its foundations plus the connective prose that binds them is the read the format is built for
[[r:easily-reviewable-foundations]]. They divide by where their authority comes from. A fact is
something held true on evidence and yields only to better evidence; a requirement is owner fiat and
yields only to the owner; and a design does not reopen either while arguing itself — both enter
settled and stay put [[r:foundations-enter-settled]]. A decision is the design's own: it answers a
question the facts and requirements leave open, is reopened freely while the design is in flux, dies
when the design is thrown away, and never binds a sibling design facing the same question — two
competent designs may answer it differently and both be right [[r:decisions-belong-to-their-design]].

Only these three kinds are citable, and each lives in a YAML file: facts and requirements in a
design's own directory or a wider scope, decisions in a `decisions.yaml` beside the `spec.md`.
Components and open questions live in the document and are never cited [[r:citable-entries-are-foundations]].
Keeping every citable kind in a file is what makes every citation resolve the same way — to one
entry in one file — and keeps a citation meaning "this rests on something settled."

## Entry shapes

Every field name and enum value below is the format's public interface; the shapes are shown as they
sit on disk. Each kind's field set is closed — a field outside its schema is an error, not a note the
format silently keeps [[r:entry-schemas-are-closed]]; rejecting unknown fields is enforcement still to
land in the harness, not something the checker does today. A field with a sensible default is omitted
when it takes that default, so a document carries only what departs from the norm
[[r:foundation-default-fields]] [[r:defaults-are-omitted]] — the sole exception is a decision's
`status`, always written even at `proposed`. Every id is kebab-case.

**Fact** [[r:fact-structure]]. Required: `id`; `claim`, stating the fact; `backing`, exactly one of
`tested` | `documented` | `assumed`, the three not equal in weight; and `sources`, at least one.
Each source takes exactly one locator form — either a `description` of the mechanism the fact was
established by, or a `url` that also carries `where` (a pointer to the relevant section) and a
verbatim `quote` [[r:facts-require-a-source]]. A `url` pointing inside this repository is written
relative to the repo root, not to the file holding it [[r:repo-relative-source-paths]], and a
`quote` is always a block scalar even when one line [[r:quote-is-block-scalar]]. A `url` under an
`artifacts/` directory is admissible only on a `tested` fact, where it names output a test actually
produced, and only where that directory sits at the fact's own scope or a wider one — artifacts
another design holds are promoted to a shared scope rather than reached across for, the same
visibility rule citations already obey [[r:artifact-sources-back-only-tested-facts]]. That is the
one provenance rule with a mechanical shadow; which source is the right one for a given `backing`,
and what a source must disclose about who produced it, are authoring's to test, not this format's. Optional: a `status`
of `active` | `retired` (default `active`) — a retired fact adds a `reason` of `superseded` |
`disproven` | `stale`, and a superseded one names its replacement in `superseded_by` as a bare fact
id, not a citation token — and a `caveat` recording why the fact might not hold despite its backing.

**Requirement** [[r:requirement-entry-structure]]. Required: `id` and a `statement`. Optional: a
`force` of `hard` | `soft` (default `hard`) — a hard requirement is non-negotiable, a soft one a
preference that may bend with justification — a `status` of `active` | `retired` (default
`active`), a `rationale`, and `applies_to`, the designs it binds, each item a design scope
(`<area>/<design>`) or a `set:<name>`. `applies_to` sits only on a requirement above design scope;
a design-scoped one already binds exactly its own design.
A requirement carries no `sources`. A design that departs from a soft requirement does
not amend it or annotate it with an exception; it records the departure as a decision that cites the
requirement, since bending a soft requirement is a choice with a reason and a falsifier — a decision
in every respect [[r:soft-departures-are-decisions]].

**Decision** [[r:decision-structure]]. Required: `id`; a single-line `statement` naming what was
chosen — not why, not what it entails; `falsifiers`, at least one condition that would invalidate or
force revision of the decision [[r:decisions-require-a-falsifier]]; and a `status`, always written,
one of `proposed` (created but not ratified), `accepted` (an agreed part of the design to maintain),
`tolerated` (cleared to proceed but not endorsed, so a later author may rework it freely), or
`rejected` (considered and turned down). A rejected decision needs no falsifier, is kept only as a
record, blocks nothing, and may not be cited [[r:rejected-decisions-are-closed]].

**Component** [[r:component-structure]]. Required: a stable `id` and one line of `responsibility`
naming what it holds. Optional: `excludes`, the nearby responsibility it deliberately does not hold —
the cheapest way to state a boundary, since a boundary is defined by its far side — and `after`, the
components that must land before it.

**Open question** [[r:question-structure]]. Required: a stable `id`, the `question`, and `closes` —
which kind of foundation would close it, a `fact`, `requirement`, or `decision`. Optional: `gates`,
the decisions it blocks. A question is not a foundation and no claim may rest on one; naming the
foundation that would close it turns the question into work with a known shape.

A copyable example of each kind — and of the two live blocks a `spec.md` carries — follows, so an
author of any spec starts from a concrete shape rather than the field lists alone
[[r:spec-shows-copyable-type-examples]]. The blocks below sit outside the fixed `## Components` and
`## Open questions` sections, so they are read as illustration and never as live entries (below).

A fact, a requirement, and a decision, as they sit in a `facts.yaml`, `requirements.yaml`, and
`decisions.yaml` — each file a bare sequence:

```yaml
- id: fence-info-string-is-raw-text
  claim: a fenced block's info string is literal text on the opening fence line
  backing: documented
  sources:
    - url: https://spec.commonmark.org/0.31.2/
      where: §4.5 Fenced code blocks — definition of the info string
      quote: |
        The line with the opening code fence may optionally contain some text following the
        code fence; this is trimmed of leading and trailing spaces or tabs and called the
        info string.
```

```yaml
- id: libraries-publish-types
  statement: every published library ships its own type declarations
  applies_to: [set:nodejs:libraries]
  rationale: |
    A consumer should not have to hand-write the types for something we published.
```

```yaml
- id: block-and-file-encoding
  statement: live blocks are yaml-fenced keyed mappings; foundation files are bare sequences
  status: proposed
  falsifiers:
    - a foundation file grows a need for file-level metadata beside its entries
```

The `sets.yaml` that `set:nodejs:libraries` resolves through — this one file is a mapping of set
name to the design scopes it holds, not a sequence. A design may belong to any number of sets:

```yaml
nodejs:libraries:
  - minecraft/dev-kit
  - minecraft/test-lib

minecraft:dev-tools:
  - minecraft/dev-kit
  - minecraft/pack-build
```

A component block and an open-question block, in the form each takes inside a `spec.md` — the
keyed-mapping shape a live block uses:

```yaml
components:
  - id: citation-resolver
    responsibility: resolve one citation token to exactly one entry
    excludes: rendering the prose around the token
    after: [entry-loader]
```

```yaml
questions:
  - id: precedence-across-tiers
    question: should a nearer scope ever override a wider one?
    closes: decision
    gates: [block-and-file-encoding]
```

## The spec.md document

A `spec.md` opens with a Summary and then the specification — its remaining prose sections, where
every citation lives. Two conditional sections bracket it: an Open questions section appears right
after the Summary only when the design has open questions, and a Components section appears at the
end only when it has components; decisions never appear in the document, living in `decisions.yaml`
instead [[r:fixed-outer-sections]]. Those three fixed sections are the H2 headings `## Summary`,
`## Open questions`, and `## Components` [[d:fixed-section-headings]].

Components and open questions are the only structured data the document itself carries, and each
appears in exactly one fenced block [[r:one-block-per-kind]] whose body is a YAML mapping with
exactly one top-level key naming its kind — `components` or `questions` — mapping to the sequence of
entries [[r:blocks-are-keyed-mappings]] [[d:block-and-file-encoding]]. A block's info string is
`yaml`, so the same block a renderer displays verbatim is read from the raw source by any tool: a
fenced block's info string is literal text on the opening fence line regardless of how a renderer
shows the block [[f:fence-info-string-is-raw-text]], and GitHub strips styling from rendered
markdown, so a block's identity can only be its raw fence, never anything a stylesheet imposes
[[f:no-inline-styles-in-gfm]]. This is the legibility-versus-parseability bet the whole format turns
on. A block is live only under its fixed `## Components` or `## Open questions` H2; a `yaml` block
elsewhere — the examples above included — is illustrative, not a live entry
[[d:live-blocks-identified-by-section]].

## Citations and resolution

A claim in the prose may point at the foundation it rests on, and that pointer resolves to exactly
one entry the reader never has to search for [[r:claims-can-cite-foundations]]. The affordance is the
format's; how much of a design must be cited is a claim's obligation only where some decision,
component, or other claim would have to change were the cited foundation false
[[r:explicit-intent]]. A citation is the token `[[<k>:<id>]]`, its kind a single letter — `f` fact,
`r` requirement, `d` decision [[r:citation-token-grammar]]. It resolves scope-blind: the id is
matched against every entry of that kind across all three tiers, and exactly one match is required —
any other count is an error [[r:resolution-is-scope-blind]]. Scope-blind matching is safe only
because ids are unique per kind repo-wide; without that guarantee resolution would need a precedence
rule between tiers. A design may cite anything visible at its own, its area's, or the global tier,
and nothing belonging to another design.

## What a requirement binds

Citing and binding are different relations, and the tier answers only the first. A design *may
cite* any requirement at its own, its area's, or the global tier; it *is bound by* the ones whose
`applies_to` names it — every one of them, without exception where the requirement is hard, and
unless a decision records the departure where it is soft [[r:requirement-binding-is-explicit]]. A
wider-scope requirement that omits `applies_to` binds its whole tier: every design in the area, or
every design in the repository [[d:omitted-binding-means-the-whole-tier]]. That default is what
keeps the field off almost every entry — the tier is usually the right answer, and stating it again
would be noise.

Where the tier is *not* the right answer, `applies_to` names the designs directly, or names a set.
A set is declared once, in `design/sets.yaml`, mapping a name to the design scopes it holds
[[r:binding-sets-are-declared-once]]. This is what a product is here: the designs that ship a
Node.js library, or the tooling half of an area, listed by name rather than gathered into a
directory. A set may hold designs from more than one area — the case a subtree cannot express — and
a design belongs to as many sets as describe it, which is the other half: a grouping that overlaps
a sibling is a set, never a directory. No set holds another, so membership is one lookup deep, and
that is also the answer to how far the nesting goes: exactly one level, always. A set may name a
design that does not exist yet, since a product is often named before its last member is written;
the harness reports the dangling member rather than failing on it. Listing the members in one place
rather than on each design is a bet that a product's roster changes as a unit — adding a pack is
then a one-line edit rather than an edit to every design that joins it
[[d:set-membership-is-declared-by-the-set]].

Binding does not create a citation obligation. A design settles on citing its own live
requirements and the decisions it kept; a requirement bound to it from a wider scope may be
honoured silently, because the design honouring it is often a matter of what it *does not* do
[[r:settled-design-cites-what-it-keeps]] [[d:settle-bar-stays-design-scoped]]. What the harness
owes instead is visibility: it resolves every set, rejects an `applies_to` naming a design or set
that does not exist, and can list exactly the requirements binding a given design — the walk up the
tree that an author would otherwise have to remember to make. Whether each is actually honoured is
a reader's judgement, not a check [[d:binding-coverage-is-reported-not-enforced]].

## Design state

A design is in one of three states — `exploring`, `draft`, or `settled` — and the state is computed
from what exists in the tree, never stored beside it, so it cannot drift from the artifacts the way a
stored copy would [[r:design-status-enum]]. The reading is mechanical: no `spec.md` is `exploring`;
a `spec.md` carrying a proposed decision, an open question, or an uncited live design-scoped
requirement or accepted-or-tolerated decision is `draft`; a `spec.md` with none of those is
`settled`, review-clean on its own content with no appeal to where it sits in git
[[r:status-derived-from-content]]. Building waits on more than that: nothing is built on a design
until it is published — settled and merged to main — where settled means it has cleared review and
published means it is on main for siblings to build against, and a design holding an open question or
a still-proposed decision cannot be settled in the first place [[r:only-published-work-licenses-building]].
Publication is a second axis, not a fourth state: the three states stay computable from tree content,
while merge-to-main is a git-ref property no artifact in the tree records, so it is tracked as a
boolean beside the state rather than folded into the enum [[r:publication-is-a-separate-axis]]. The
last bar on settling is a citation bar: a design cannot settle while a live design-scoped
requirement, or an accepted or
tolerated decision it holds, has no claim citing it — the two things a settled design must actually
stand on. Facts, and requirements at wider scopes, carry no such obligation, so capture stays free
everywhere and the only citation debt falls due at settle [[r:settled-design-cites-what-it-keeps]].
Which of these transitions are legal, and who performs them, is process's to say, not this design's.

## Invariants

Every invariant here is either enforced by the harness or marked as having no mechanical backstop;
nothing enforced is also reviewed by hand [[r:invariants-are-enforced-or-marked]]. The list is what
a well-formed spec passes — green is the floor, not proof the design is any good. A reader who writes
to this format throughout produces a conforming spec [[r:instructs-readers-to-follow-the-format-rules]].

Mechanically enforced, entry by entry: every id is kebab-case and unique per kind repo-wide; a fact
carries `id`, `claim`, and a `backing` in the enum, plus at least one source in exactly one locator
form, a `url` never carrying a `description`, a `url` always carrying `where`, an in-repo `url`
written repo-relative, an `artifacts/` url only on a `tested` fact and only at that fact's own scope
or wider, and every `quote` a block scalar; a requirement carries `id` and `statement`,
a `force` and `status` in their enums, and no `sources`, and carries `applies_to` only above design
scope, and naming only declared sets; every set in `sets.yaml` has a name of kebab-case segments,
at least one member, and no member that is another set — a member or an `applies_to` entry naming
a design that does not exist yet is reported as a notice, not an error, so a set can be declared
before its last member is written; a decision carries `id`, `statement`, and a
written `status` in its enum, plus at least one falsifier unless rejected; any field at its default is
omitted; a retired fact carries a valid `reason` and, if superseded, a resolvable `superseded_by`. In
the document: a live block is recognised only under its fixed `## Components` or `## Open questions`
section, a `yaml` block elsewhere being illustrative; a component carries `id` and `responsibility`
and every `after` resolves to a sibling; an open question carries `id`, `question`, a `closes` in the
enum, and gates only local decisions; a conditional block present but empty is an error. For
citations: every token matches the grammar,
resolves to exactly one live entry of the named kind, points at no other design's entry and no
decision outside the citing design. A live entry is an active fact or requirement, or a decision that
is not rejected; a retired fact or requirement and a rejected decision are dead and may not be cited.
At settle: no live design-scoped requirement and no accepted-or-tolerated decision goes uncited.

Marked as having no mechanical backstop — the checker cannot see these, so a reviewer must:

| invariant | why it cannot be checked |
|---|---|
| an id is stable — a changed meaning gets a new id, not a rewrite | a rename and a replacement are the same diff |
| a decision's `statement` names the choice, not its why or entailments | whether a sentence smuggles in reasoning is a reading, not a match |
| a fact's `backing` reflects how the fact was really established | the enum value is checkable; its truth is not |
| a design honours every requirement bound to it | whether a design satisfies a statement is a reading of both, and honouring one is often a matter of what the design does not do |
