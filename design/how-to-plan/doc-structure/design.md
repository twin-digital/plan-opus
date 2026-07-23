# doc-structure

The format for design documents: where they live on disk, what a design document contains,
and how a claim points at what it rests on. Process says how the work moves, authoring says
what makes the contents good, and the harness enforces what is stated here; this design only
fixes what the format can express.

## The medium

A design meets its reviewer the way code does: agents commit and comment as ordinary
contributors [[f:agents-have-git-identities]], so the artifact is read as GitHub-rendered
markdown in a pull request. That renderer strips every styling hook [[f:no-inline-styles-in-gfm]],
so any structure the format needs must be a native markdown construct, and any structure a
machine needs must survive in the raw source. One construct serves both readers at once: a
fenced block displays to a person as a plain code block, while its info string sits as
literal text on the fence line where any tool can find it without rendering anything
[[f:fence-info-string-is-raw-text]].

The format therefore splits every artifact into markdown prose for the argument and YAML for
the entries — sidecar files where an entry outlives any one document, fenced blocks inside
the document where it does not [[d:fenced-entry-blocks]]. Entries stay in short uniform
lists rather than being woven through the prose because the list, not the essay, is the
review target [[r:easily-reviewable-foundations]]. The brief calls the prose/block split a
bet rather than a settled answer; what would settle it is recorded under Open Questions.

## The tree

Foundations live at exactly three scopes [[r:three-tier-scopes]], mapped onto directories as
`design/` (global), `design/<area>/` (area), and `design/<area>/<design>/` (design)
[[d:scope-tree-paths]]. Each of the two wider scopes holds at most a `requirements.yaml` and
a `facts.yaml`; they exist so that a fact or requirement discovered while working one design
has somewhere durable to land other than that design's branch [[r:enable-easy-capture]].

A design directory separates what it was given from what it produced
[[r:inputs-outputs-split]]:

```
design/<area>/<design>/
  inputs/
    brief.md            # prose: purpose, boundaries, done-criteria, tensions
    requirements.yaml   # owner fiat scoped to this design
    facts.yaml          # evidence scoped to this design
  design.md             # the argument, components, open questions
  decisions.yaml        # the decisions the argument cites
```

`inputs/` holds those three files and nothing else. The brief rides with the inputs because
it is owner-written direction the design consumes, not something the design produces
[[d:brief-in-inputs]]. Decisions sit beside the document rather than inside it because every
citable entry lives in a YAML file [[r:citable-entries-are-foundations]], and they sit in
this directory rather than a wider one because a decision binds only the design that made it
and is discarded with it [[r:decisions-belong-to-their-design]].

## Foundations

A design rests on facts, requirements, and decisions, each in a fixed form a reader can
recognise unlabeled [[r:foundations-are-expressible]]. Recognition comes from the required
fields themselves: only a fact carries `backing`, only a requirement carries `force`, only a
decision carries `invalidated_when`. The kinds also encode what could unsettle them. Facts
and requirements enter a design already settled [[r:foundations-enter-settled]]: a fact
carries the evidence a challenger would have to beat, while a requirement carries no sources
at all — it was decided, not discovered, so there is nothing to cite. A decision carries the
conditions under which it stops being right, because it is the one kind the design itself is
allowed to reopen.

Every foundation file is a single top-level YAML list, `[]` when empty, with kebab-case ids
[[d:foundation-file-shape]]. An entry carries only the fields its schema names, and fields
with a sensible default are omitted rather than written [[r:foundation-default-fields]]
[[d:omit-defaults]] — every extra field is one more thing the format must keep proving it
needs [[r:must-beat-doing-it-myself]].

### Facts

Per [[r:fact-structure]], concretely [[d:fact-fields]]:

| field | rule |
|---|---|
| `id` | required; stable |
| `claim` | required; the statement |
| `backing` | required; `tested` \| `documented` \| `assumed`, in descending weight |
| `sources` | required; a list, each entry with exactly one locator |
| `caveat` | optional; why the claim might not hold despite the backing |
| `status` | `active` (default) \| `retired` |
| `reason` | required iff retired; `superseded` \| `disproven` \| `stale` |
| `superseded_by` | required iff `reason: superseded`; id of the replacing fact |

A source is either a `description` of the mechanism by which the fact was determined, or a
`url` with `where` (the relevant section) and `quote` (a direct quote, as a block scalar),
plus an optional `checked` date; in-repo urls are repo-root-relative
[[d:source-locator-shape]].

### Requirements

Per [[r:requirement-structure]], concretely [[d:requirement-fields]]:

| field | rule |
|---|---|
| `id` | required; stable |
| `statement` | required |
| `force` | `hard` (default) \| `soft` |
| `status` | `active` (default) \| `retired` |
| `rationale` | optional; block scalar |

There is no `sources` field and no exception field. A design that bends a soft requirement
records the bend as a decision [[r:soft-departures-are-decisions]] and embeds the
requirement's citation token in the decision's choice line [[d:soft-departure-token]], so
the departure is findable from the design's side without annotating the fiat.

### Decisions

Per [[r:decision-structure]], concretely [[d:decision-fields]]:

| field | rule |
|---|---|
| `id` | required; stable |
| `choice` | required; one line naming what was chosen |
| `invalidated_when` | required; one or more conditions that, made true, reopen the choice |
| `status` | `proposed` (default) \| `accepted` \| `rejected` |

There is no rationale field: the why lives in the prose of the `design.md` that cites the
decision, which keeps the entry to one reviewable line and the argument in one place.

## The document

`design.md` reads top to bottom as: a title, the argument in whatever prose sections it
needs, then `## Components`, then `## Open Questions`, with either trailing section omitted
when empty [[d:document-order]]. Each trailing section holds one fenced YAML block whose
info string is exactly `components` or `open-questions` [[d:fenced-entry-blocks]]; a fenced
block with any other info string is inert prose. Components and open questions are outputs
of the design but not foundations: they live only in the document and no claim may cite one
[[r:citable-entries-are-foundations]].

Components declare the shape of the designed thing. Per [[r:component-structure]],
concretely [[d:component-fields]]:

| field | rule |
|---|---|
| `id` | required; unique within the document |
| `responsibility` | required; one line naming the responsibility held |
| `excludes` | optional; the nearby responsibility deliberately not held |
| `needs` | optional; ids of components that must land first |

Open questions name what the design does not yet know. Per [[r:question-structure]],
concretely [[d:question-fields]]:

| field | rule |
|---|---|
| `id` | required; unique within the document |
| `question` | required |
| `closes_with` | required; `fact` \| `requirement` \| `decision` — the kind of foundation that would close it |
| `gates` | optional; ids of decisions in the sibling `decisions.yaml` blocked on the answer |

## Citations

A claim points at a foundation with an inline token — `[[f:<id>]]`, `[[r:<id>]]`, or
`[[d:<id>]]` [[r:claims-can-cite-foundations]] [[d:citation-token-grammar]]. `f` and `r`
tokens resolve through the design's own `inputs/`, then the area, then global; `d` tokens
resolve only in the sibling `decisions.yaml`, since no other design's decisions exist to
this one. Because an id repeated at a nearer scope is an error rather than an override
[[r:ids-unique-per-kind]], resolution does not depend on where the token was written: every
token names exactly one entry or is broken.

Tokens are legal in prose paragraphs and in decision entries; component and question blocks
carry none [[d:citation-sites]] — the prose that introduces an entry is where its reasoning,
and therefore its citations, belong. A token must land on an active fact or requirement, or
a proposed or accepted decision [[d:citable-status]]; retired and rejected entries are
records, and a claim cannot rest on a record of something no longer held. Which claims must
carry a token at all is authoring's question; the format promises only that an existing
token resolves.

## States

A design is exploring, draft, or settled, and the state is read off the tree rather than
stored [[r:design-status-enum]]. The derivation [[d:state-derivation]]:

- **exploring** — the directory has `inputs/` but no `design.md`
- **draft** — `design.md` exists, but an open question remains or some decision is still
  `proposed`
- **settled** — `design.md` exists, the open-questions block is empty or absent, and every
  decision is `accepted` or `rejected`

This is the reading that makes settled the licence to build
[[r:only-settled-work-licenses-building]]: a rejected decision does not block settling,
being a record of an option considered, and nothing else unresolved can survive into the
settled state. Which transitions are legal, and who makes them, is process's to say.

## Invariants

The format compresses to the checks below. Each is marked **[machine]** — statable over the
raw tree and handed to the harness to enforce — or **[no backstop]** — real, but caught only
by review [[r:invariants-are-enforced-or-marked]].

1. **[machine]** Every foundation file parses as a top-level YAML list whose entries carry
   their kind's required fields, only fields the schema names, and only listed enum values.
2. **[machine]** Conditional fields appear exactly when their condition holds: `reason` iff
   a fact is retired, `superseded_by` iff the reason is `superseded`.
3. **[machine]** Every source has exactly one locator, and a url locator carries `where`
   and `quote`.
4. **[machine]** Within each foundation kind, ids are unique across all three scopes a
   design sees [[r:ids-unique-per-kind]].
5. **[machine]** Every citation token resolves to exactly one entry — `f`/`r` through
   design, area, global; `d` in the sibling `decisions.yaml` — whose status is citable
   [[d:citable-status]].
6. **[machine]** `inputs/` contains only `brief.md`, `requirements.yaml`, and `facts.yaml`;
   `decisions.yaml` exists only beside a `design.md` [[r:inputs-outputs-split]].
7. **[machine]** A `design.md` holds at most one `components` block and one
   `open-questions` block, in that order after the prose; the reserved info strings appear
   on no other fence.
8. **[machine]** Component and question ids are unique within their document; `needs`
   resolves within the components block; `gates` resolves in the sibling `decisions.yaml`.
9. **[machine]** Every decision has at least one `invalidated_when` condition.
10. **[machine]** Every live foundation is cited from within its own scope — design-scoped
    by its own design, area-scoped by at least one design in the area — where live means an
    active fact or requirement or a proposed or accepted decision [[d:live-means]]; global
    entries, entries of an exploring design, retired facts and requirements, and rejected
    decisions are exempt [[r:foundations-are-reachable]].
11. **[no backstop]** Id stability: an entry whose meaning changed got a new id. A rename
    and a replacement are the same diff, so only review can tell them apart
    [[r:ids-unique-per-kind]].
12. **[no backstop]** A decision's choice line names the choice, not the why or the
    consequences; an invalidation condition is a real falsifier, not a restated hope.
13. **[no backstop]** A quote is faithful to its source and `backing` is honestly
    classified.
14. **[no backstop]** A citation belongs to a claim the design would have to change were
    the cited entry false, and no such claim goes unmarked [[r:explicit-intent]].

## Components

```components
- id: scope-tree
  responsibility: fix where every foundation file lives and which entries a design may see
  excludes: when and how an entry moves between scopes, which is process's

- id: foundation-schemas
  responsibility: the fixed forms of facts, requirements, and decisions
  excludes: whether an entry's content is any good, which is authoring's

- id: document-format
  responsibility: the layout of design.md — prose argument, then the two entry blocks
  needs: [foundation-schemas]

- id: citation-grammar
  responsibility: token syntax and the resolution of a token to one entry
  needs: [scope-tree, foundation-schemas]

- id: state-derivation
  responsibility: map a design directory's contents to exploring, draft, or settled
  excludes: which transitions are legal and who makes them, which is process's
  needs: [document-format]

- id: invariant-set
  responsibility: the machine-checkable contract handed to the harness, with unbacked rules marked
  excludes: enforcing any of it, which is harness's
  needs: [scope-tree, foundation-schemas, document-format, citation-grammar]
```

## Open Questions

```open-questions
- id: fenced-block-bet
  question: |
    Does the prose/entry-block split keep serving both readers as the schemas churn — no
    renderer or tool in actual use mishandles the reserved info strings, and reviewers
    demonstrably read the blocks rather than skipping them?
  closes_with: fact
  gates: [fenced-entry-blocks]

- id: brief-contract
  question: |
    Is a brief.md required for a well-formed design, and what must it contain? The tree
    ships one per design, but no requirement at any scope defines it.
  closes_with: requirement
  gates: [brief-in-inputs]
```
