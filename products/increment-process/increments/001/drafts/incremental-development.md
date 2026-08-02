# Incremental development

## Summary

The process is a loop: **capture** requirements; **research** and reason about alternatives to
drive decisions; **review** — the owner ratifies or rejects; repeat. Everything drives toward one
goal: structured decisions that are reviewable separately, viewable topologically, and
comprehensive enough to drive implementation in a constrained and directed manner.

The unit of change is an **increment**, scoped to a **product**: a declared delta of requirements,
decisions, and contract bindings, drafted on a branch and published by merging — after which it is
immutable, and the effective state of the product is the **fold** of its published increments.
Implementation is separately scheduled work against the fold at a published increment, recorded
where evidence lives rather than where design lives. What the process retires from earlier
practice, and how existing designs convert, is in `process-migration.md`; the background is in
`motivation.md`; instruction to agents is in `agent-guidance.md`.

---

## The foundations

Everything the owner ratifies is a foundation entry in an increment's sources, and each kind has a
job, an author, and a lifecycle:

- **Requirements** are owner fiat: what the product must do to be accepted. Captured by the owner
  and agents at the start of an increment, directly into its requirements source; amended by later
  entries (`amends`), retired with a reason, adopted in bulk from presets. A requirement may carry
  a `verification` procedure where its statement is not self-verifying, and `rationale` where a
  casual reversal would be a mistake the statement does not warn of.
- **Decisions** are the path taken to meet them — each choice a consumer could observe or a
  reimplementation must preserve; choices below that bar live in the code. Proposed by whoever does
  the design work, then ruled by the owner: accepted, tolerated, delegated, or rejected. While
  still proposed and inside its own increment, a decision may be removed outright; once ruled, it
  persists, closed only by a successor's `supersedes` or a retirement. `because:` records what a
  decision rests on; `pinned` marks the ones that cannot be freely overturned; `revisit_when`
  carries the rare, deliberate revisit condition.
- **Model entries** bind the contracts the design speaks about — entity name to a pooled schema or
  API surface at a pinned version, in the model: block of the requirements source. Written as the
  shapes settle, ratified with the increment's requirements, folded by entity name.
- **Facts** live in the repo-wide pool, unchanged from prior practice: findings about the world,
  with the runs and artifacts that establish them, citable from anywhere.
- **Drafts** are the increment's frozen working prose — the synthesis argument, and design-drafted
  content for document deliverables — raw material for implementation, never normative.

Lifecycle is uniform: **an increment declares changes, and state is the fold.** New entries add;
superseding entries replace, carrying their reason in their own content; retirements remove, with a
reason; and nothing is ever edited once its increment publishes.

---

## The process

```
Plan:
  Capture → Clarify → Ratify    (loops until the owner declares it settled enough to transition to implementing)

Implement:
  defined by the implementation-process increment — waves, escalation, evidence; Plan hands it the ratified fold
```

### Capture

Capture is the step where the owner and their agents create the increment and populate its initial
requirements, directly into its requirements source. An increment's scope is nothing more than the
changes its sources declare.


### Clarify

Find the places missing research and do the spikes. Identify the open questions and answer the ones that
can be answered. Make the big-picture decisions that follow from the requirements alone, without
low-level code knowledge.

Outputs are the research and results collected, plus:

1. a **ratified set of requirements**, with any owner-approved amendments
2. **decisions reached from research**, also owner-approved

What cannot be answered at this level stays in the synthesis draft, and reaches the owner again
through escalation if implementation runs into it.

The working method is a **synthesis draft** — connected prose, because writing an argument that must
hold together is what exposes the decision not yet made and the question not yet asked. The draft
lives in the increment's `drafts/` folder, merges with the increment, and freezes at publish like
every other increment file. It is raw material, never normative: the fold is what binds, and a claim
in the draft that cites no foundation is a shadow decision — extraction into decisions, facts, and
open questions remains Clarify's discipline, with the frozen draft as the record of the argument
rather than a second authority. Implementation later converts drafts into the shipped documents,
checking the draft's claims against the fold as it goes.

### Ratify

**Not a one-way handoff.** Clarify and Ratify iterate — agents raise questions and decisions, the owner
responds, agents consume that feedback and raise more. The loop runs until the owner declares it settled
enough to implement, and whatever remains open goes to Implement.

Each proposed decision is read in full and becomes:

- **accepted** — the owner determined the decision is acceptable without caveats or reservation
- **tolerated** — the owner judged the decision and left it standing, but found it sub-optimal or
  undesirable in some way
- **delegated** — the owner abstained from reviewing the decision, which is left standing as is
- **rejected** — the owner determined the decision non-viable

Distaste is not rejection. A decision the owner dislikes but can live with is **tolerated**, and may
stand indefinitely — nothing obliges a later increment to revisit it. If the owner does want it changed,
that becomes a requirement in some future increment, but as a deliberate choice rather than an automatic
consequence. See *Implement forward*.

A rejection carries the owner's reason on the entry — the one status whose reasoning is required,
because it is the input to the rework. Whoever proposed the decision proposes a replacement that
supersedes the rejected entry, and work resumes from whatever depended on it. A rejected entry, once
ruled on, persists like any other; the replacement's `supersedes` is what closes it.

**`tolerated` and `delegated` are opposite states, not degrees of the same one.** Tolerating is a
judgement — the owner engaged, weighed it, and accepted a cost. Delegating is an abstention. Collapsing
them would make it impossible to ask afterwards how much of a product the owner actually ruled on, which
matters because the decision set is the only window they use. **The count of delegated decisions is the
honest measure of how much of a product was reviewed rather than passed over** — the same kind of ledger
that `attestation` provides for coverage, on the other axis.

### Publish is the merge

An increment is draft or published, and the boundary is main — draft is a location, not a field. A
draft lives on its increment's branch, where the Plan loop, every implementation wave, and the deliverable
edits all happen, freely editable the whole time: proposed decisions may be removed outright, the
number is provisional, and nothing downstream builds on it. Merging to main is the publish act, and
the gate runs there:

- no decision still `proposed`
- the number is the next in the product's sequence — a concurrent increment's collision surfaces
  here, and the loser renames and recomputes

The gate is a required pull-request check: the design validator runs on every PR, applies every
rule in force, and a single failure blocks the merge — nothing publishes over a red check.

Main therefore holds only published increments, dense and immutable, and the design validator refuses any edit
to one. There is no draft-on-main state: the fold over main is always a fold over settled history,
and what a tree-consumed deliverable shows on main is always what a published increment built.

### Design and implementation keep their own schedules

An increment need not run Implement. Capture → Clarify → Ratify → publish is a complete increment — a
preset's only shape, and any product's option. Its ratified requirements sit in the fold as claims
with no coverage, which the projected view shows for what they are: ratified and unbuilt. Several
design increments may queue before any implementation: an implementation targets the fold at a chosen increment —
ordinarily the newest published — durably records that target, and covers the claims it set out to
cover, while claims from intervening increments simply remain ratified and unbuilt. Nothing obliges
an implementation per increment, and an implementation never amends the design it targets: an escalated change lands as
an ordinary design increment, ratified as any is, and the implementation retargets the fold that contains
it.

---

## What endures, and what is disposable

**Durable** — these persist and accumulate:

| artifact | what it holds |
|---|---|
| requirements | owner fiat: what the product must do to be accepted |
| decisions | the path taken to meet them — each choice a consumer could observe or a reimplementation must preserve, recorded with the conditions that would call for it to be revisited; choices below that bar live in the code, and a reimplementation is free to re-make them |
| facts | what has been observed about the world, with the runs and artifacts that establish it |
| interfaces | the shapes something outside the implementation compiles against |
| drafts | each increment's frozen synthesis prose — raw material for the shipped documents, never normative |

**Transient** — generated, used, discarded:

| artifact | why it is transient |
|---|---|
| test plan | an input to the implementation, not a description of the product |
| implementation | regenerable from the durable set |

The asymmetry is deliberate. The durable set is what the owner reviews and what tooling can diff. The
transient set is where work happens.

**The unit of change is an increment**, scoped to a **product**. An increment owns the foundation
changes it makes, the decisions it produces, and the transition an implementer follows. Status
attaches to the increment, so drafting increment N+1 never unsettles the shipped increment N.

---

## Mechanics

### Pinned decisions

A decision's **status** records the owner's ruling. Separately and independently, a decision may be
**pinned** — meaning it cannot be freely overturned.

- **`pinned`** — `false` (the default), or `{ reason, notes? }`. A pinned decision requires owner
  ratification to change; an unpinned one does not, whatever its status.
- **`reason`** is an enum — `data-format` and `public-api` today, joined by others as they earn a name —
  with `other` as the escape. `notes` is optional alongside a named reason; alongside `other` it is
  required, because there it is the reason.

Pin a decision when it fixes a **public API surface**, fixes a **data format** written to disk or sent
over a wire, is something **another product depends on**, or changes behaviour a **consumer would
notice**.

The agent proposing a decision proposes whether it is pinned; the owner rules on that along with the rest
of it.

Pinning is what escalation reads. No status on its own obliges an implementer to stop.

### Lifecycle — declare changes, fold for state

Requirements, decisions and preset adoptions all work the same way: **an increment declares what changed,
and the effective state is the fold across the product's increments.**

The owner reads the effective set, computed. The history is preserved and is not what anyone reads.

**A claim is retired either by supersession or on its own.** A superseding entry names what it replaces
and carries the reason in its own content, so nothing extra needs stating. A retirement with no successor
needs a reason, because that reason is the only thing distinguishing it from an oversight — the thing it
described no longer exists, the constraint stopped applying, the product moved out from under it.

The retirement form is a top-level `retires:` block in the same per-increment source that adds entries,
so the file scopes what kind of claim each id names and no type discriminator is needed. One id per
entry, each with its own one-line `reason` and no statement — when one event retires several claims, the
reason repeats, which keeps every retirement independently greppable and independently judgeable. The
block covers only retirement without a successor; a superseding entry's `supersedes` or `amends` retires
its target on its own.

**Within the increment that created it**, a decision still `proposed` may be removed outright with no
record. Once the owner has ruled on it, it cannot be deleted — it is retired through the same mechanism a
later increment would use, so the owner can follow what became of something they accepted.

**Recording is required; asking is not.** Pinning governs permission — an unpinned decision may be
overturned by an implementation wave without escalating. It must still be recorded, because a decision silently out
of force makes the record lie, and the record is what the owner reads. The implementation report already requires
every overturned decision and why; **that list is where superseding entries come from**, rather than
ending as prose in a report.

**Concurrent increments collide on the number, and that is the whole provision.** Two in flight both
claiming `003` conflict on merge; the loser renames and recomputes the fold against the base that moved,
and the projection tooling and design validator report whatever the recomputed fold breaks. The process adds
nothing further for this case.

### Statements, and how they are verified

A statement is one proposition of owner fiat, in product terms. It is **self-verifying** when its
truth is decidable by direct inspection of what it names, with no interpretive choice — then
`verification` is omitted, and coverage targets the statement read literally. Where the statement
carries a term an observer cannot decide directly — an unbounded quantifier, a judgement word, an
underspecified technical term — `verification` gives one ordered, performable procedure that binds
the term to observations:

```yaml
- id: r-h97o555y
  title: consumer suite typechecks
  statement: |
    a TypeScript consumer's test suite typechecks with the package installed.
  verification:
    - do: compile a consumer suite containing both pack imports and control-surface imports
    - verify: no error, and no cast at the seam
```

`do` steps are performed; `verify` steps assert about what a preceding `do` surfaced, and all must
hold. The first step is a `do`, and a `verify` with no grounding `do` is malformed — which is what
keeps the procedure from drifting into a restatement of the statement. Judgement is a final pair
naming the judge: `do: read the projected decision set, in full` / `verify: the owner can say what
is to be built`. Steps exercise the requirement's **intent through the product's published
surfaces** — and whatever a step names, the owner now expects: naming is binding, so internals are
named only when binding them is the point. A requirement whose author can write no procedure is
usually a badly stated requirement, better discovered while writing than a year later.

**Decisions carry no verification, and the asymmetry is principled.** A requirement states an
*end* — what must be true — so how you would know is a genuinely separate question. A decision states a
*means* — what was done — and its verification would be a restatement: *we chose X*, known to be met
when *X is what is there*. Requiring the field would populate it with tautologies.

### Schemas pool by identity, and the model binds them

A recurring need is to fix a data shape formally. Schemas live in one repo-wide pool under
`schemas/` — any file at any depth, like the facts pool. Identity lives in the file: each schema
declares `$id: /<namespace>/<entity>@<version>` beside `$schema` — `/design-process/requirements@1` —
names unique across the repository, versions dense integers per entity, the leading slash mandatory:
root-relative identities resolve to themselves regardless of base, which is what lets a schema depend
on schemas — a `$ref` is an identity, resolved from the pool as the registry. References resolve by
identity and never by path, so the tree may be nested and reorganised freely; any organisational or
naming convention within a pool is an aid to navigation — non-normative and unenforced. A version is immutable once an
increment binding it publishes, and the design validator refuses to edit or remove one that any
published increment binds; it also fails when two pool files claim one identity, and fails an
increment whose schema reference — a model binding or a source file's `version` field — resolves to
no pool schema. A new version is a new file, proposed by the increment introducing it and ratified
with it.
Binding follows the preset precedent: any product binds any schema at a pinned version, and drift
is legal — no product is rebound by a new version appearing.

An increment binds schemas through its **model** — a top-level block of its requirements source,
beside the requirements and preset declarations it ratifies with, folding by entity name:

```yaml
# in the increment's requirements.yaml
model:
  - name: pack-manifest
    schema: /minecraft/pack-manifest@2
    description: the manifest a behaviour pack ships, as the build writes it
```

The entity name is the design's word for the thing, free to differ from the pool entry's name, and
the description anchors what the entity does in the design. An entry carries one contract
reference — `schema:`, or `api:` once the implement increment defines the API pool. Model entries are part of the
increment's requirements — ratified with it, binding on implementers — and wherever prose references an
entity, its bound schema is the authoritative shape.

Foundation files need no model entry to be interpretable: each names its own schema's pool version
in its `version` field (above). The model is for the shapes a design defines and speaks about.

The formalism is JSON Schema, draft 2020-12, authored as YAML, carrying `$schema` for its dialect
and `$id` for its identity.
It is the default for being widely known and mechanically checkable; something more concise or
expressive can displace it where it meets the foreseeable needs. The pool's first entries are the
process's own sources — `requirements`, `decisions`, `product`, `increment`, `model` — and the
design validator checks every structured file against the schema its `version` names.

This settles the durable-interfaces question at the data layer: a shape something outside the implementation
depends on is a named, versioned schema, bound through a ratified model. What remains open is the
API layer only — functions and modules, not data.

### Every structured file names its own schema version

Every structured artifact this process defines — `product.yaml` and the increment
sources, and any source a later process increment adds — carries a `version`: the pool version of
the file's own schema. A requirements source with `version: 2` is interpreted by the pool
schema `/design-process/requirements@2` — one lookup, no fold. The `.yaml` and `.yml` extensions are
both accepted wherever a file is named.

```yaml
version: 1
requirements:
  - id: r-h97o555y
    ...
```

The field is what makes schema evolution compatible with immutability. A published increment's files
are never rewritten, so they stay forever in the dialect they were written in; the version names
that dialect directly, and a format change is an ordinary new pool version that later files opt
into rather than a repository-wide migration. Carrying the field means the foundation files are
keyed mappings — the version beside a key naming the entry kind — rather than bare sequences.

### Identifiers

Requirements and decisions carry opaque ids — `{prefix}-{8 lowercase base36 characters}`, the prefix
`r-` or `d-`, the rest random: `r-caao9k3z`, `d-9dx9ryhk`. The id is the citation form; no separate
token grammar exists.

Random rather than meaningful, deliberately. A slug bakes a summary into the identity, which drifts as
the statement iterates and breaks citations exactly when an entry churns most. A timestamp component
makes batch-created ids near-identical — and batch-created entries are the ones that cite and supersede
each other, so a one-character misread lands on a valid, plausible sibling. Nothing reads structure out
of an id; creation time lives in increments and git history.

The human handle is **`title`** — a short label, free to churn without breaking anything, and what
the projection displays. The generator is a CLI command used by humans and agents alike; the design validator
enforces format and uniqueness, so a collision is a regenerate at creation rather than a latent bug.

Increments stay plain numbers — readable, and the merge collision on the number is the concurrency
detection. Products and presets are named by their directory, and adoption uses that name.

### Requirement presets

A **requirement preset** is a product that defines requirements and builds nothing — `nodejs-library`,
`minecraft-addon`, `published-to-npm`. It has increments like any other product, and its increments are
**Plan-only**: Capture → Clarify → Ratify, with no Implement.

A product adopts presets at pinned versions, declared in the increment's requirements source —
the place fiat lives — as a `presets:` block beside `requirements:`. Entries are state-shaped and
fold by preset name: the newest declaration for a name is the standing.

```yaml
# increment 1 — first adoptions
presets:
  - name: nodejs-library
    version: 3
  - name: published-to-npm
    version: 1
```

```yaml
# increment 4 — a version change and a removal
presets:
  - name: nodejs-library
    version: 4
  - name: minecraft-addon
    status: dropped
```

`status` is `adopted` — the default, so it is normally omitted — or `dropped`; `version` is required
when adopted and forbidden when dropped, since the name alone is the identity.

Rules:

- Adopting and dropping are direct owner action — fiat, the same as adding or removing any other
  requirement. No reason, ratification, or review attaches; the increment that declares the change is the
  record, and the fold shows what it did to the effective set.
- A preset is adopted whole. There are no exceptions or partial adoptions.
- A preset does not adopt another preset.
- A conflict between an adopted requirement and a product-local one is an error. An agent raises it as an
  open question, and the increment cannot settle until it is addressed.
- A preset increment is immutable once published.
- Adopting and dropping the same preset in one increment is an error.

Drift is expected and not forced. Products may sit on old preset increments indefinitely; a report of how
far behind each adoption sits is useful, but nothing obliges an upgrade.

### Projection replaces a written spec document

If decisions are the owner's window, they have to read *as a set*. Thirty entries in file order do not add
up to a picture the way prose does, and that assembly is most of what a spec was doing.

That job does not disappear when the spec does; it moves to tooling. The two words are deliberate:
the **fold** is the state — declared deltas combined into the effective sets, authoritative wherever
it is computed — and the **projection** is its rendering for a reader, joined, filtered, and
ordered. A projected view of a product shows,
for one product at one increment:

- the effective requirement set, product-local and adopted, with each adoption's preset and version
- the effective decision set, with status and pinning, ordered by `because:` topology where cited
  rather than by file order
- for each claim, its coverage rung and what provides it
- open questions blocking the increment from settling
- what this increment changed against the last — added, retired, superseded

— the whole of it filterable and groupable by facet, where the product declares them.

### The fold at an increment is the bundle

What an implementer implements against is the fold at a published increment — the effective requirements,
decisions, and coverage expectations of `<product>@N`. Publication made every input immutable, so the
view is derivable on demand and identical forever: nothing is archived, nothing is published, and the
increment number is the version, with the declared delta as its changelog. An implementation pins what it consumed by
recording the increment it targeted.

None of that is authored. All of it is a fold over artifacts that already exist, which is why it can be
correct by construction where a spec could only be correct by diligence.

### Facts record what research found

Spikes, probes, experiments and measurements produce findings about the world — how a dependency actually
behaves, what a runner does with a given config, what a measurement showed. Those findings are worth
keeping past the increment that produced them, because the next increment would otherwise re-derive them,
and because a decision built on a finding should be traceable to it.

- **`because:` on a decision** — what it rests on: the requirements it follows from, the facts that
  drove it, and the decisions it builds on. A citation gives the projection a dependency order instead of file order, and
  superseding or retiring an entry surfaces, through these citations, what stood on it. Optional: a fact
  is deliberately non-trivial to record — a citation of the upstream source for a documented one,
  captured output and a re-runnable record for a self-tested one — and requiring a citation per decision
  would manufacture them rather than find them. Where nothing is cited, the decision's own statement
  carries the reasoning.
- **`informed_by:` on a requirement** — a pointer, explicitly not justification, since requirements are
  fiat and need none. It exists so that a fact contradicting a requirement can be found rather than
  noticed.

### Facets

A product with several kinds of deliverable needs a way to find, filter, and track claims without
splitting the product. A **facet** is an optional label on a requirement or decision — one or a
list — drawn from the vocabulary the product declares in its `product.yaml`, each an id with a
description, so the name does not have to carry the meaning alone:

```yaml
- id: d-9g62l9m0
  facets: [schema, design-validator]
```

A facet is a reading aid: the projection groups and filters by it, and no rule reads it. Nothing fences by
facet, nothing escalates by facet, coverage and pinning ignore it — which is what keeps it cheap to
assign and cheap to be wrong about.

The line is bright deliberately. Wanting a rule that mentions a facet — "requirements of the CLI
must…" — is the signal the facet has become a product, and the split happens then, on evidence of
independent life: its own release cadence, another product depending on it specifically, increments
that stop co-changing with the rest. The machinery for the split already exists — retire the claims in
the parent, re-add them in the new product.

Facets do not draw component boundaries. Where packages meet — the CLI consumes the library's public
surface, shared types live in the library — is decision content, pinned when a consumer could notice.
An implementer coheres across facets because implementation is product-scoped: an increment is implemented against the
whole foundation set, and the Stub wave's shared stubs are where packages converge on the types they
share. A facet helps find those decisions; it does not replace them.

### A product maps to its packages

A product spans one or more packages in the code monorepo — a library and its CLI, an addon and its
companion tool. A product exists exactly when `products/<id>/product.yaml` does: the file is the
declaration, and the directory name is the product id, stated nowhere else. The planning repo points;
the workspace describes. The mapping carries `path` and `kind` per package, plus an optional `repo` —
GitHub `owner/repo` form, `twin-digital/opus` when unstated:

```yaml
# products/increment-process/product.yaml
version: 1
kind: process
facets:
  - id: schema
    description: the shapes of the structured files products write
  - id: design-validator
    description: the rules that check artifacts and gate merges
packages:
  - path: nodejs/planning-lib
    kind: npm-library
  - path: nodejs/planning-cli
    kind: npm-cli
  - path: .claude/skills/plan
    kind: agent-skill
```

The `path` is the workspace-relative directory, and it is also where an implementer works — the pointer
needs no other field because the workspace already names packages by location. Anything else a kind
might call for — the npm name, an addon's manifest identity — is read from the package at that path
rather than duplicated here, so the mapping cannot drift from what it maps. A per-kind field is added
only when a consumer for it exists and the package cannot answer it.

Creating, splitting, or moving a package is a decision like any other — recorded, ruled on, and pinned
once something outside the product depends on the boundary. The mapping reflects the state those
decisions produced, and it is descriptive, never aspirational: `product.yaml` is current state, freely
edited rather than increment-locked, because the record of a package change is the decision that made
it. An implementer adds, removes, or updates package entries at the same time it changes the
implementation files they reference — so an implementer never meets a declared package nothing asks
for. Intent to ship one is a requirement in some
increment, not a mapping entry.

Consequences:

- **Released versions are per-package.** A product with three packages has three release histories; the
  durable artifact is plural.
- **Coverage refs resolve through the mapping.** Foundations live in this repository and artifacts in
  the workspace, so a `ref` is workspace-relative — the package path prefixes it — and the package's
  `repo` anchors it to a repository.
- **A preset may read against one package of several.** `published-to-npm` on a product whose CLI is
  the published piece: adoption stays product-level, and the coverage manifest shows which package
  carries each adopted claim.

A package need not be code. For some products the deliverable *is* a document — a format's normative
reference, a process description. Such a package takes `kind: document`, a `path` that is the
document's permanent home, and often a non-default `repo`, since normative planning documents live in
this repository rather than the workspace. This does not bend the no-spec rule: what the process
discards is the design-phase document that *describes* a product; a document a product *ships* is
implementation, produced and revised by implementation waves like any other deliverable.

The difference a document does have is how it is consumed. Code is consumed through released
versions, so work-in-progress on the default branch touches no consumer; a document at a permanent
path is read straight from the tree, so merge is what makes it live. The guard is the merge
itself: a document's changes ride an implementation's pull request, drawing on the increment's
frozen drafts, and go live only when it lands. A document too hot for tree consumption — one outside
readers pin against — releases versions like any other package.

Document homes follow one convention: shipped document packages live under `docs/<domain>/`, and
synthesis drafts live in their increment's `drafts/` folder, publishing with it. For document
deliverables, the design phase may draft content that drives the implementation — anywhere from
nothing at all to a mostly complete document; how far to go is per-product judgement, deliberately
undefined here. The path from one
to the other is an implementation: a new PR that creates or revises the document at its permanent
home, drawing on the frozen drafts, checking their claims against the fold, proposing revisions as
new design increments where the fold itself must move, and writing its implementations record —
which is what says who shipped the document, against which fold, and when. Run by the owner and
agents or autonomously, it is the same mechanism and the same record.

### Implement forward

Resolving a tension that is merely unwelcome is not part of the current increment: the owner may
capture it as a **requirement in some future increment** — optionally, whenever they choose, or
never; nothing in the process does so automatically. Amend in place only when something is
**impossible, non-viable, or incorrect**.

"Incorrect" earns its place in that list. A guard that silently answers false, so a handler returns early
and its test passes green, breaks nothing visibly — and is the product not working. That cannot wait.

---

## Appendix — shapes

Illustrative fragments rather than a schema. Field names are provisional; what matters here is what each
artifact has to carry.

### A requirement

```yaml
- id: r-h97o555y
  title: consumer suite typechecks
  statement: |
    a TypeScript consumer's test suite typechecks with the package installed.
  verification:
    - do: compile a consumer suite containing both pack imports and control-surface imports
    - verify: no error, and no cast at the seam
```

Where only judgement can verify, the final pair names the judge:

```yaml
  verification:
    - do: read the coverage table as a pack author would
    - verify: it reads clearly
```

### A requirement that supersedes an earlier one

```yaml
- id: r-thwmqr8s
  title: consumer suite typechecks and builds
  statement: |
    a TypeScript consumer's test suite typechecks and builds with the package installed.
  amends: r-h97o555y
```

### A retirement with no replacement

```yaml
retires:
  - id: r-h97o555y
    reason: the package no longer ships type declarations
```

### A requirement preset, and adopting it

A preset is a product that defines requirements and builds nothing:

```yaml
# products/nodejs-library/product.yaml
version: 1
kind: requirement-preset
```

Its requirements file has the same shape as any product's. A product adopts it in its own
requirements source:

```yaml
# an adopting increment's requirements.yaml
version: 1
presets:
  - name: nodejs-library
    version: 3
```

### A decision

```yaml
- id: d-cge7c929
  title: control surface joins the package root
  statement: |
    the control surface is exported from the package root rather than from a dedicated subpath.
  status: accepted           # accepted | tolerated | delegated | rejected
  pinned:
    reason: public-api
    notes: consumers import __useServer from the root specifier
  because:
    - f:alias-and-control-subpath-are-one-module-instance
  revisit_when:
    - a consumer needs the root specifier to carry only names the engine's declarations declare
```

`revisit_when` is a rare, deliberate revisit condition the owner sets — not a falsification regime;
most decisions carry none. The reasoning behind a decision — alternatives weighed, conditions
tested — discharges into facts cited in `because:` and into the frozen synthesis draft, not into
stored conditions.

An unpinned decision the owner had no context to rule on:

```yaml
- id: d-pyywsujm
  title: values are generated and committed
  statement: |
    generated values are produced at author time and committed, with a regenerate-and-clean-tree
    check, rather than generated during a consumer's install.
  status: delegated
  pinned: false
```

### A decision that supersedes another

```yaml
- id: d-qaq43q3x
  title: control surface is a real subpath
  statement: |
    the control surface is exported from ./control rather than from the package root.
  status: accepted
  pinned:
    reason: public-api
    notes: the aliased specifier must carry only declared names
  supersedes: d-cge7c929
```

### A decision retired with no successor

```yaml
retires:
  - id: d-huepnzof
    reason: brandAs no longer exists; instanceof answers from the prototype chain
```
