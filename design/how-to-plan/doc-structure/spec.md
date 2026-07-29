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

The repository has two trees, because requirements and facts are scoped differently. Requirements
live in exactly three tiers — a global root, an area beneath it, and a design beneath that — each a
directory holding at most a `requirements.yaml`, with no fourth tier and no nesting of areas; the
root and each area may also hold a `sets.yaml`, which names groups of designs
[[r:three-tiers-hold-requirements]]. A requirement's tier does two jobs: it files the entry for a
reader, and it is the ceiling on what the entry may bind — and, where the entry names nothing, the
binding itself (below).

Facts have no tiers at all. They live in one pool under `facts/`, where any YAML file at any depth
is a fact file and the path is filing convenience — it means nothing to resolution, so the tree may
be reorganised whenever a better grouping appears [[r:facts-live-in-one-pool]]. Which file an
author picks is authoring's to test, not this format's. Between them, a fact or requirement can be dropped
where it belongs the moment it is found, without first knowing which design will consume it —
knowledge is never stranded for want of a home [[r:enable-easy-capture]].

A design's own directory then splits what endures from what is regenerable along the file boundary,
not a folder one: its `brief.md` and `requirements.yaml` are durable inputs, while its
`decisions.yaml` and `spec.md` are outputs the design produces and nothing upstream may write into
[[r:design-inputs-and-outputs-split]]. Laid out on disk, the two trees and the input/output split
take this shape [[r:spec-shows-layout-as-tree]]:

```text
products.yaml                    maps a product and feature to the design that publishes it

facts/                           the fact pool — any yaml, any depth
├── markdown-rendering.yml
└── minecraft/
    └── pack-format.yml

evidence/                        the run pool — the same shape
└── minecraft/
    └── dev-kit.yml

design/
├── requirements.yaml            global-scope requirements
├── sets.yaml                    sets that may span areas
└── how-to-plan/                 an area
    ├── requirements.yaml        area-scope requirements
    ├── sets.yaml                sets of this area's designs
    └── doc-structure/           a design
        ├── brief.md             design inputs (durable)
        ├── requirements.yaml
        ├── decisions.yaml       design outputs (regenerable)
        └── spec.md
```

An id is the handle everything else resolves through, so within a kind it is unique across the whole
repository, not merely across the scopes one design can see [[r:ids-unique-repo-wide]]; a
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

Where the authority comes from also sets how far each kind reaches. A requirement and a decision
each bind a bounded set of designs, so citing one from outside that set would import an obligation
its owner never issued — the tiers fence them. A fact issues no obligation at all: it reports what
is true, on evidence anyone can re-check, and stays true whichever design happened to find it. So a
fact is citable from anywhere in the repository [[r:facts-resolve-repo-wide]], while a requirement
keeps the three-tier fence and a decision stays with the design that made it
[[r:decisions-belong-to-their-design]].

Only these three kinds are citable, and each lives in a YAML file: facts in the pool, requirements
in a design's own directory or a wider scope, decisions in a `decisions.yaml` beside the `spec.md`.
Components and open questions live in the document and are never cited [[r:foundations-are-the-citable-kinds]].
Keeping every citable kind in a file is what makes every citation resolve the same way — to one
entry in one file — and keeps a citation meaning "this rests on something settled."

## Evidence is not a foundation

A `tested` fact rests on something that was run, and that run is an entry of its own, living in a
pool under `evidence/` shaped exactly like the fact pool [[r:runs-live-in-one-pool]]. The reason it
is an entry rather than a path is that evidence behaves like an entity and not like a file: one run
routinely backs several facts, it is produced once and referenced many times, it has provenance
worth pinning, and it can be superseded by a re-run that disagrees. A path in a source expresses
none of that, and a path written into a sentence expresses less.

What a run is not is citable. Only facts, requirements, and decisions may carry a claim
[[r:foundations-are-the-citable-kinds]], and a spec pointing straight at captured output would be
resting on bytes with the interpretation step skipped — the step the fact exists to perform. So a
run is reached only through a fact's `sources`, never through a `[[…]]` token, and its id joins the
same repo-wide namespace so that reach resolves the same way a citation does.

What a run does not record is who ran it. Every execution here is an agent acting on the owner's
instruction, so the field would carry one value and discriminate nothing; what makes an observation
trustworthy is that its command, output, and environment are written down and can be run again.

A fact's backing fixes the locator its evidence takes [[r:backing-demands-its-locator]]: a `tested`
fact carries a run, a `documented` fact a url, an `assumed` fact a description. The demand is a
floor rather than an exclusion, so corroborating sources in other forms stay admissible and a
prototype observation may sit beside the upstream page documenting the same behaviour. What the
floor removes is the case that motivated it — a `tested` fact whose evidence lives only in a
`description`, where a path written into a sentence looks like provenance and nothing resolves it.

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
Each source takes exactly one locator form: a `description` of the mechanism the fact was
established by, a `url` to an upstream document, or a `run` naming captured output held here. A
`url` and a `run` each carry `where` (a pointer to the relevant section) and a verbatim `quote`
[[r:fact-sources-take-one-locator]]. A `url` pointing inside this repository is written
relative to the repo root, not to the file holding it [[r:repo-relative-source-paths]], and a
`quote` is always a block scalar even when one line [[r:quote-is-block-scalar]]. A `url` under an
`artifacts/` directory is admissible only on a `tested` fact, where it names output a test actually
produced [[r:artifact-sources-back-tested-facts]] — the backing is what makes the locator
admissible, so which design's directory holds the output does not bear on it. Which form at least
one source must take is fixed by the `backing` (above); whether a given source is the *right* one
for the claim is authoring's to test, not this format's. Optional: a `status`
of `active` | `retired` (default `active`) — a retired fact adds a `reason` of `superseded` |
`disproven` | `stale`, and a superseded one names its replacement in `superseded_by` as a bare fact
id, not a citation token — and a `caveat` recording why the fact might not hold despite its backing.

**Requirement** [[r:requirement-entry-structure]]. Required: `id` and a `statement`. Optional: a
`force` of `hard` | `soft` (default `hard`) — a hard requirement is non-negotiable, a soft one a
preference that may bend with justification — a `status` of `active` | `retired` (default
`active`), a `rationale`, and `applies_to`, the designs it binds, each item a design scope
(`<area>/<design>`) or a `set:<name>`, each within the requirement's own tier. `applies_to` sits
only on a requirement above design scope; a design-scoped one already binds exactly its own design.
A requirement carries no `sources`. A design that departs from a soft requirement does
not amend it or annotate it with an exception; it records the departure as a decision that cites the
requirement, since bending a soft requirement is a choice with a reason and a falsifier — a decision
in every respect [[r:soft-departures-are-decisions]].

**Run** [[r:run-structure]]. Required: `id`; a `command` that reproduces it; an `output`, the
repo-relative path to what it captured; and `ran_at`, the date, as `YYYY-MM-DD`. Optional: an `environment` — the versions, fixtures, or state the observation
depends on — and a `status` of `active` | `retired` (default `active`), a retired run adding a
`reason` of `superseded` | `stale` | `invalid` and, when superseded, a `superseded_by`. A run
carries no claim of its own: the output says what happened, and the fact citing it says what that
means. One run is one captured output, so a directory holding several probes yields several runs
[[r:one-run-is-one-captured-output]].

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

A fact, a requirement, and a decision, as they sit in a fact-pool file, a `requirements.yaml`, and
a `decisions.yaml` — each file a bare sequence:

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

A run, as it sits in a file under `evidence/`, and the source that reaches it:

```yaml
- id: registry-probe
  command: node design/minecraft/dev-kit/artifacts/registry-probe/probe.mjs
  output: design/minecraft/dev-kit/artifacts/registry-probe/OUTPUT.txt
  ran_at: 2026-07-27
```

```yaml
  sources:
    - run: registry-probe
      where: both entries — registry status, latest version, and repository of each package
      quote: |
        …the verbatim span from that output…
```

The `sets.yaml` that `set:nodejs:libraries` resolves through — a mapping of set name to the design
scopes it holds, not a sequence. This one sits at the root because its members are meant to span
areas; a set of one area's designs is declared in that area's file instead. A design may appear in
any number of them:

```yaml
nodejs:libraries:
  - minecraft/dev-kit
  - minecraft/test-lib
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
`r` requirement, `d` decision [[r:citation-token-grammar]] — written anywhere but a fenced block or
an inline-code span, where the same characters are an example and resolve to nothing
[[r:citations-in-code-are-not-citations]]. It resolves scope-blind: the id is
matched against every entry of that kind in the repository, and exactly one match is required —
any other count is an error [[r:resolution-is-scope-blind]]. Scope-blind matching is safe only
because ids are unique per kind repo-wide; without that guarantee resolution would need a precedence
rule between tiers. What a design may cite then follows the kind, not the tier the citing design
sits in: every active fact in the repository [[r:facts-resolve-repo-wide]], the requirements at its
own, its area's, and the global tier, and only its own decisions.

Citing a fact anywhere only helps an author who can see it, and a tree read one file at a time
hides most of it. So the whole set is available as one generated view — every fact with its id, its
scope, its backing, and its claim — produced from the foundation files on demand and never
committed [[r:facts-can-be-found-without-walking-the-tree]] [[d:fact-index-is-generated-on-demand]].
Search over that view is the finding mechanism; a topic vocabulary carried on each entry was the
alternative, and it loses on upkeep — a tag set stays useful only while every author agrees on it,
and there is nothing here to hold that agreement. A fact must sit somewhere under `facts/`, and one
written into a design's own directory is an error rather than a file nobody reads — its entries
would resolve nowhere. Which pool file is the *right* one for a subject is a different question:
the generated view makes it visible and the harness deliberately does not decide it
[[d:fact-filing-is-advisory-not-enforced]].

## What a requirement binds

Citing and binding are different relations, and the tier answers only the first. A design *may
cite* any requirement at its own, its area's, or the global tier; it *is bound by* the ones whose
`applies_to` names it, and it must honour every one of them
[[r:requirement-binding-is-explicit]] — without exception where the requirement is hard, and
unless a decision records the departure where it is soft [[r:soft-departures-are-decisions]]. A
wider-scope requirement that omits `applies_to` binds its whole tier: every design in the area, or
every design in the repository [[d:omitted-binding-means-the-whole-tier]]. That default is what
keeps the field off almost every entry, and it is there because the tier is usually the right
answer: a field an author must write out on every shared requirement to say what the path already
said is exactly the ceremony this process cuts rather than keeps
[[r:must-beat-doing-it-myself]].

What `applies_to` cannot do is reach further than the tier it sits in: the designs a requirement
binds are always a subset of the designs its position already covers, so an area-scoped requirement
narrows within its area and never touches a sibling one [[r:binding-narrows-within-the-tier]]. That
bound is what keeps "which requirements bind me" answerable from where a design sits — its own
file, its area's, and global, the same three it could always cite from. Without it the answer is a
repo-wide scan, and worse than the scan is the review: a change in one area would alter what
another area's designs must satisfy, in a diff nobody watching them has reason to read. A rule that
does reach across areas is a global rule with a narrow audience, and is filed as one.

Where the tier is *not* the right answer, `applies_to` names the designs directly, or names a set.
A set is declared once, in a `sets.yaml` at global or area scope, mapping a repo-wide unique name to
the design scopes it holds [[r:binding-sets-are-declared-once]]. This is what a product is here: the
designs that ship a Node.js library, listed by name rather than gathered into a directory. The two
scopes divide by reach — an area's sets hold only that area's designs, while a global set may span
areas, which is the case a subtree cannot express. That is why sets are tiered at all: a requirement
may name a set its own position already covers, so an area requirement uses its area's sets and a
global one may use any, and no one has to re-read a membership list to know whether a set stays
inside an area. A design appears in as many sets as describe it — a grouping that overlaps a
sibling is a set, never a directory — and no set holds another, so membership is one lookup deep,
which is also the answer to how far the nesting goes: exactly one level, always. Every member
resolves to a design that exists, and a name that does not is an error rather than a forward
reference — a set is written after the designs it groups, because a typo and a plan read the same
on the page. Listing the members in one place rather than on each design is a bet that a product's
roster changes as a unit — adding a pack is then a one-line edit rather than an edit to every
design that joins it [[d:set-membership-is-declared-by-the-set]].

Binding is what the settle gate is measured against. A design cannot settle while a requirement
binding it goes uncited, whichever scope that requirement came from, alongside the accepted and
tolerated decisions it holds [[r:settled-design-cites-what-binds-it]]. That is the whole point of
naming the designs: an obligation nobody can point at in the prose is indistinguishable from one
nobody read, and stating the set is what makes the citation demandable without forcing every
area-wide requirement onto a design it was never meant for. The harness resolves every set, rejects
an `applies_to` naming a set nobody declared, and fails the settle gate on each bound requirement
no claim cites. What it still cannot read is whether a cited requirement is genuinely *honoured*;
that stays a reviewer's judgement, and it is the one part of binding with no mechanical backstop.

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
last bar on settling is a citation bar: a design cannot settle while a live requirement binding it,
or an accepted or tolerated decision it holds, has no claim citing it — the two things a settled
design must actually stand on [[r:settled-design-cites-what-binds-it]]. Facts carry no such
obligation, so capture stays free everywhere and the only citation debt falls due at settle.
Which of these transitions are legal, and who performs them, is process's to say, not this design's.

## Invariants

Every invariant here is either enforced by the harness or marked as having no mechanical backstop;
nothing enforced is also reviewed by hand [[r:invariants-are-enforced-or-marked]]. The list is what
a well-formed spec passes — green is the floor, not proof the design is any good. A reader who writes
to this format throughout produces a conforming spec [[r:instructs-readers-to-follow-the-format-rules]].

Mechanically enforced, entry by entry: every id is kebab-case and unique per kind repo-wide; a fact
carries `id`, `claim`, and a `backing` in the enum, plus at least one source in exactly one locator
form, a `url` never carrying a `description`, a `url` always carrying `where`, an in-repo `url`
written repo-relative, an `artifacts/` url only on a `tested` fact, and every `quote` a block
scalar; a `run` source resolves to a live run, carries `where`, sits only on a `tested` fact, and
its quote appears in the output that run names; a run carries `id`, `command`, an `output` that
exists, `ran_by`, and a `ran_at` that is a date, plus a valid `reason` when retired; a requirement carries `id` and `statement`,
a `force` and `status` in their enums, and no `sources`, and carries `applies_to` only above design
scope, its every item resolving to a design that exists or a set that is declared and lying within
the requirement's own tier; every set has a name unique across the repository and at least one
member, every member resolving to a design that exists and, for an area's set, to one of that
area's designs, and no member that is another set; a decision carries `id`, `statement`, and a
written `status` in its enum, plus at least one falsifier unless rejected; any field at its default is
omitted; a retired fact carries a valid `reason` and, if superseded, a resolvable `superseded_by`. In
the document: a live block is recognised only under its fixed `## Components` or `## Open questions`
section, a `yaml` block elsewhere being illustrative; a component carries `id` and `responsibility`
and every `after` resolves to a sibling; an open question carries `id`, `question`, a `closes` in the
enum, and gates only local decisions; a conditional block present but empty is an error. For
citations: every token matches the grammar,
resolves to exactly one live entry of the named kind, points at no requirement outside the citing
design's three tiers and no decision outside the citing design; a fact resolves from anywhere. A
live entry is an active fact or requirement, or a decision that
is not rejected; a retired fact or requirement and a rejected decision are dead and may not be cited.
At settle: no live requirement binding the design — its own, or a wider-scope one whose
`applies_to` reaches it — and no accepted-or-tolerated decision goes uncited.

Marked as having no mechanical backstop — the checker cannot see these, so a reviewer must:

| invariant | why it cannot be checked |
|---|---|
| an id is stable — a changed meaning gets a new id, not a rewrite | a rename and a replacement are the same diff |
| a decision's `statement` names the choice, not its why or entailments | whether a sentence smuggles in reasoning is a reading, not a match |
| a fact's `backing` reflects how the fact was really established | the enum value is checkable; its truth is not |
| a design honours every requirement bound to it | whether a design satisfies a statement is a reading of both, and honouring one is often a matter of what the design does not do |
