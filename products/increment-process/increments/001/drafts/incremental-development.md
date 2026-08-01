# Incremental development

## Context

Roughly 34 packages in one pnpm/turbo monorepo, growing 3–5 per month, most of them 1,000–5,000 lines,
one maintainer, code largely written by agents. Recurring project kinds: libraries, CLI tools, web apps
and HTTP APIs, Minecraft behaviour-pack addons, CI/CD processes, devcontainer tooling, bots. Bounded
manual work is acceptable where it uses the owner's time efficiently.

That scale matters — several recommendations below would be different for a handful of projects or for
hundreds.

What this process retires, and why, is in `process-migration.md`. Instruction to agents working inside
it is in `agent-guidance.md`. This document states only how the process is meant to work.

---

## Why

**Churn costs more than it produces.** A design is settled, built on, and then reversed, and the
re-deciding consumes owner review while producing nothing that ships. That cost is unacceptable — this
is the owner's product and the owner's judgement, which is justification enough.

**The unit of design is wrong at either size.** Today the choice is between two shapes, and both are
bad:

- **Giant specs** that fix every aspect of design for every aspect of a product.
- **Small slices** that enforce arbitrary ownership boundaries. This introduces friction whenever
  feature B needs a change to feature A, and rigidity that keeps a product in feature-shaped silos when
  its natural shape might have collapsed into something simpler.

**Status attaches to the whole slice**, which is the same mis-sizing seen from another side. A shipped,
working slice returns to draft because one decision inside it moved. Nothing distinguishes "this product
is unsettled" from "the next change to it is unsettled."

**There is no artifact for a change.** A spec describes a state, so changing a shipped product means
rewriting its spec or inventing another slice — which is how a product ends up with more slices than it
has parts.

**The spec is not needed.** Dropping it is owner fiat, lightly informed by observation rather than
resting on it:

- The owner skims it. It is not a document anyone reads to understand what was built.
- Most of it restates foundations or argues for them, and the classes of information it genuinely adds
  are few and repeat.

The goal that follows is to capture those missing classes of information **as foundations** rather than
as prose in a spec.

Against those, one countervailing force that shapes everything below:

**Decisions are the only window the owner actually uses.** The others exist — the spec, the test plan,
the code — and go unread. Remove the spec and the decision set becomes the sole artifact used by the
owner to understand what was built. So decisions must not be minimised; they must be rich enough to
comprehend a product from.

---

## The shape

**Durable** — these persist and accumulate:

| artifact | what it holds |
|---|---|
| requirements | owner fiat: what the product must do to be accepted |
| decisions | the path taken to meet them — each choice a consumer could observe or a reimplementation must preserve, recorded with the conditions that would call for it to be revisited; choices below that bar live in the code, and a reimplementation is free to re-make them |
| facts | what has been observed about the world, with the runs and artifacts that establish it |
| interfaces | the shapes something outside the implementation compiles against |
| released versions | tags and published artifacts — permanent once out, whatever happens to the source |
| drafts | each increment's frozen synthesis prose — raw material for the shipped documents, never normative |

**Transient** — generated, used, discarded:

| artifact | why it is transient |
|---|---|
| test plan | an input to the implementation, not a description of the product |
| implementation | regenerable from the durable set |

The asymmetry is deliberate. The durable set is what the owner reviews and what tooling can diff. The
transient set is where work happens.

**The unit of change is an increment**, scoped to a **product**. An increment owns its ask, the
foundation changes it makes, the decisions it produces, and the transition an implementer follows. Status
attaches to the increment, so drafting increment N+1 never unsettles the shipped increment N.

---

## The process

```
Plan:
  Ask → Clarify → Ratify        (loops until the owner declares it settled enough to transition to implementing)

Implement:
  defined by the implementation-process increment — waves, escalation, evidence; Plan hands it the ratified fold
```

### Ask

Ask is the step where the owner and their agents create the increment and populate its initial
requirements — authored new, or drawn from requirements already ratified. The increment's `ask:`
field lists only the pre-existing ones; requirements authored in the increment are in its scope by
existing, so the field is absent otherwise.


### Clarify

Find the places missing research and do the spikes. Identify the open questions and answer the ones that
can be answered. Make the big-picture decisions that follow from the requirements alone, without
low-level code knowledge.

Outputs are the research and results collected, plus:

1. a **ratified set of requirements**, with any owner-approved amendments
2. **decisions reached from research**, also owner-approved
3. **open questions** identified but not answerable at this level, left for Implement to resolve

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
that becomes a requirement in some future ask, but as a deliberate choice rather than an automatic
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

Main therefore holds only published increments, dense and immutable, and the design validator refuses any edit
to one. There is no draft-on-main state: the fold over main is always a fold over settled history,
and what a tree-consumed deliverable shows on main is always what a published increment built.

### Design and implementation keep their own schedules

An increment need not run Implement. Ask → Clarify → Ratify → publish is a complete increment — a
preset's only shape, and any product's option. Its ratified requirements sit in the fold as claims
with no coverage, which the collated view shows for what they are: ratified and unbuilt. Several
design increments may queue before any implementation: an implementation targets the fold at a chosen increment —
ordinarily the newest published — durably records that target, and covers the claims it set out to
cover, while claims from intervening increments simply remain ratified and unbuilt. Nothing obliges
an implementation per increment, and an implementation never amends the design it targets: an escalated change lands as
an ordinary design increment, ratified as any is, and the implementation retargets the fold that contains
it.

---

## Mechanisms it relies on

### Requirement presets

A **requirement preset** is a product that defines requirements and builds nothing — `nodejs-library`,
`minecraft-addon`, `published-to-npm`. It has increments like any other product, and its increments are
**Plan-only**: Ask → Clarify → Ratify, with no Implement.

A product adopts presets at pinned increments, declaring what changed rather than the whole state:

| operation | how |
|---|---|
| **add** | `adopts` a preset not currently adopted |
| **change version** | `adopts` a preset already adopted — it replaces the earlier version, since a preset is adopted at most once at a time and the preset name is the identity |
| **remove** | `drops` the preset, which takes no version for the same reason |

```yaml
# increment 1
adopts:
  - nodejs-library@3
  - published-to-npm@1
```

```yaml
# increment 4 — a version change and a removal
adopts:
  - nodejs-library@4
drops:
  - minecraft-addon
```

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
for. Intent to ship one is a requirement or a
future increment's ask, not a mapping entry.

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

Being authored does not move it — code is authored too. The document lives at its path from the
start and implementations edit it there in place; no copy sits in an increment, and nothing is copied at
publish. Immutability attaches to an increment's foundations, never to the deliverable — the same as
for code, where publishing an increment does not freeze the source files. A shipped state worth
keeping is a released version, and what a later rewrite must preserve is what pinned decisions say.

The difference a document does have is how it is consumed. Code is consumed through released
versions, so work-in-progress on the default branch touches no consumer; a document at a permanent
path is read straight from the tree, so merge is what makes it live. The guard is the one the
process already has: the document's edits belong to an increment, merging them is publishing it, and
the publish gate refuses that as long as the increment is not done — however long its branch lives,
minutes for an unattended implementation or days for hand crafting. A document too hot for tree consumption
— one outside readers pin against — releases versions like any other package.

Document homes follow one convention: shipped document packages live under `docs/<domain>/`, and
synthesis drafts live in their increment's `drafts/` folder, publishing with it. The path from one
to the other is an implementation: a new PR that creates or revises the document at its permanent
home, drawing on the frozen drafts, checking their claims against the fold, proposing revisions as
new design increments where the fold itself must move, and writing its implementations record —
which is what says who shipped the document, against which fold, and when. Run by the owner and
agents or autonomously, it is the same mechanism and the same record.

### Facets

A product with several kinds of deliverable needs a way to find, filter, and track claims without
splitting the product. A **facet** is an optional label on a requirement or decision — one or a
list — drawn from the vocabulary the product declares in its `product.yaml`, each an id with a
description, so the name does not have to carry the meaning alone:

```yaml
- id: d-9g62l9m0
  facets: [schema, design-validator]
```

A facet is a reading aid: collation groups and filters by it, and no rule reads it. Nothing fences by
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
collation displays. The generator is a CLI command used by humans and agents alike; the design validator
enforces format and uniqueness, so a collision is a regenerate at creation rather than a latent bug.

Increments stay plain numbers — readable, and the merge collision on the number is the concurrency
detection. Products and presets are named by their directory, and adoption uses that name.

### Every structured file names its own schema version

Every structured artifact this process defines — `product.yaml`, `increment.yaml`, the increment
sources, and any source a later process increment adds — carries a `version`: the pool version of
the file's own schema. A requirements source with `version: 2` is interpreted by the pool
schema `design-process/requirements@2` — one lookup, no fold.

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

### Schemas pool by identity, and the model binds them

A recurring need is to fix a data shape formally. Schemas live in one repo-wide pool under
`schemas/` — any file at any depth, like the facts pool. Identity lives in the file: each schema
declares `$id: <namespace>/<entity>@<version>` beside `$schema` — `design-process/requirements@1` —
names unique across the repository, versions dense integers per entity. References resolve by that
identity and never by path, so the tree may be nested and reorganised freely; the filing convention —
`schemas/<namespace>/<entity>.<version>.yaml` — aids navigation and means nothing to resolution. A version is immutable once an
increment binding it publishes, and the design validator refuses to edit or remove one that any
published increment binds; it also fails when two pool files claim one identity, and fails an
increment whose schema reference — a model binding or a source file's `version` field — resolves to
no pool schema. A new version is a new file, proposed by the increment introducing it and ratified
with it.
Binding follows the preset precedent: any product binds any schema at a pinned version, and drift
is legal — no product is rebound by a new version appearing.

An increment binds schemas through its **model**, a per-increment source folding by entity name:

```yaml
version: 1
model:
  - name: pack-manifest
    schema: mc-pack-manifest@2
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
and the collation tooling and design validator report whatever the recomputed fold breaks. The process adds
nothing further for this case.

### Requirements state how they would be known to be met

```yaml
- id: r-h97o555y
  title: consumer suite typechecks
  statement: |
    a TypeScript consumer's test suite typechecks with the package installed.
  satisfied_when: |
    a consumer suite containing both pack imports and control-surface imports compiles with no
    error and no cast at the seam.
```

Required, with an honest escape — where a requirement genuinely cannot be checked mechanically, the field
says so and why. It describes an **observable condition rather than a mechanism**, so it does not
pre-decide the implementation; and a requirement whose author cannot write this sentence is usually a badly stated
requirement, which is better discovered while writing it than a year later.

**Decisions do not carry `satisfied_when`, and the asymmetry is principled.** A requirement states an
*end* — what must be true — so how you would know is a genuinely separate question. A decision states a
*means* — what was done — and its `satisfied_when` would be a restatement: *we chose X*, known to be met
when *X is what is there*. Requiring the field would populate it with tautologies.

### Facts record what research found

Spikes, probes, experiments and measurements produce findings about the world — how a dependency actually
behaves, what a runner does with a given config, what a measurement showed. Those findings are worth
keeping past the increment that produced them, because the next increment would otherwise re-derive them,
and because a decision built on a finding should be traceable to it.

- **`because:` on a decision** — what it rests on: the requirements it follows from, the facts that
  drove it, and the decisions it builds on. A citation gives collation a dependency order instead of file order, and
  superseding or retiring an entry surfaces, through these citations, what stood on it. Optional: a fact
  is deliberately non-trivial to record — a citation of the upstream source for a documented one,
  captured output and a re-runnable record for a self-tested one — and requiring a citation per decision
  would manufacture them rather than find them. Where nothing is cited, the decision's own statement
  carries the reasoning.
- **`informed_by:` on a requirement** — a pointer, explicitly not justification, since requirements are
  fiat and need none. It exists so that a fact contradicting a requirement can be found rather than
  noticed.

### Collation replaces a written spec document

If decisions are the owner's window, they have to read *as a set*. Thirty entries in file order do not add
up to a picture the way prose does, and that assembly is most of what a spec was doing.

That job does not disappear when the spec does; it moves to tooling. A collated view of a product shows,
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

### Implement forward

Tensions that are merely unwelcome become **requirements for future increments**, not a relitigation of
the current one. Amend in place only when something is **impossible, non-viable, or incorrect**.

"Incorrect" earns its place in that list. A guard that silently answers false, so a handler returns early
and its test passes green, breaks nothing visibly — and is the product not working. That cannot wait.

---

## What exists today

| mechanism | state |
|---|---|
| `requirements.yaml`, with `status: retired` | exists |
| `decisions.yaml`, with statuses and falsifiers | exists |
| facts pool, with `backing`, sources, runs, artifacts | exists |
| citation tokens and resolution | exists |
| `npm run check` — schema, citations, settle gate | exists |
| `bin/foundations.mjs` — requirement collation per design | exists |
| `products.yaml` | exists |
| version bump computed from structured data, never from prose | exists (`how-to-plan/spec-bundles`) |
| amend-versus-regenerate as distinct operations | exists |
| adversarial review pipeline — panel, triage, capstone | exists |

The repository already votes for the central claim here: its own versioning design computes bumps from
structured data and never reads the narrative.

## What needs building or changing

**Structural**

1. **Fence requirements to the product, not the design.** The highest-value single change; it removes the
   cross-design ask ceremony for same-product work.
2. **Requirement presets**, with `adopts` and `drops` on a product, and the wider scopes removed.
3. **Increment as an artifact** — ask, foundation delta, decisions.
4. **Move status from the design to the increment.** It stays derived, now from location: draft is
   off main, published is merged, and the old unsettled-and-merged combination is gone.
5. **Stop maintaining `spec.md`.** Clarify works through a synthesis draft, discarded at zero
   remainder before publish.

**Schema**

6. **`version` on every structured file** — the pool version of the file's own schema; foundation
   files become keyed mappings to carry it.
7. **Typed `pinned` on decisions** — `false`, or a named reason with optional notes — governing what
   escalates.
8. **`satisfied_when` on requirements**, required.
9. **`because:` on decisions** — citing requirements, facts, and decisions alike — and
   **`informed_by:` on requirements**.
10. **A published increment is immutable**, and lifecycle points *forward* — a new entry names what it
    supersedes or retires, rather than an old entry being edited to close it. Requirements and decisions
    are scoped to a product across all its increments, so finding what supersedes an entry never means
    searching the repository.
11. **The package mapping on a product** — path, kind, and optional repo per package — and **facets**:
    the vocabulary on the product, the labels on claims.
12. **Opaque ids** — `{prefix}-{8 base36 characters}`, `title` as the label, the generator a CLI
    command, format and uniqueness checked.
13. **The schema pool and the model** — one reorganisable pool of `$id`-identified schemas, model
    entries binding an entity to a schema version, every structured file validated against the
    schema its `version` names.

**Tooling**

14. **Collation** — the folded, computed view of a product, filterable by facet and ordered by
    citation topology.
15. **The merge gate** — publish is the merge: no `proposed` decision outstanding, the number next
    in sequence.

**Process**

16. **Promotion of a decision to a requirement**, when it has become something consumers can reasonably be
    expected to rely on and preserving its effect is a matter of compatibility. Not every accepted
    decision — requirements say what the product must do to be accepted; decisions describe the path taken.
17. **The retirement form** — top-level `retires:` blocks in each increment's sources, one id and a
    one-line reason per entry, no statement.

**Deliberately not needed**

Cross-repository propagation — reusable workflows, template drift checking, bulk mutation, organisation
rulesets — exists to approximate what a monorepo gives for free. These projects are one pnpm/turbo
workspace, so a harness change is one commit. The convention that replaces all of it: **every project
exposes a `verify` task**.

---

## What will actually be different

| today | proposed |
|---|---|
| a spec is written, reviewed and maintained per design | no spec; Clarify produces decisions, facts and questions, and its document is discarded |
| requirements fence to a design, so two workstreams on one product file issues at each other | requirements fence to the product; same-product work shares foundations |
| a new global or `applies_to` requirement can make a settled design incomplete retroactively | products adopt requirement presets at a pinned increment; nothing binds a product until it says so |
| a design is settled or draft | an increment is; shipped increments stay shipped |
| changing a shipped product means rewriting its spec or inventing another slice | an increment carries the delta |
| a punt and a reservation are the same status | `delegated` and `tolerated` are separate, so what the owner ruled on can be told from what they passed over |
| a decision the owner dislikes is rejected, and the work is redone | it is tolerated, and a requirement is filed for a future increment |

**What does not change:** the owner reads every requirement and every decision, in full. That is the
comprehension channel, and this is built to feed it rather than to trim it.

---

## Appendix — shapes

Illustrative fragments rather than a schema. Field names are provisional; what matters here is what each
artifact has to carry.

### An increment

The path carries the product and the number, and draft-versus-published is location — off main or
on it — so the file states neither. It exists only when it has something to declare: an `ask`, an adoption.

```yaml
# products/minecraft-test-lib/increments/004/increment.yaml
ask:
  - r-h97o555y   # pre-existing; requirements authored in this increment are in scope by existing
```

### A requirement

```yaml
- id: r-h97o555y
  title: consumer suite typechecks
  statement: |
    a TypeScript consumer's test suite typechecks with the package installed.
  satisfied_when: |
    a consumer suite containing both pack imports and control-surface imports compiles with no
    error and no cast at the seam.
```

Where a requirement genuinely cannot be checked mechanically, `satisfied_when` says so and why:

```yaml
  satisfied_when: |
    not mechanically checkable — whether the coverage table reads clearly to a pack author is a
    judgement, and is verified by reading it.
```

### A requirement that supersedes an earlier one

```yaml
- id: r-thwmqr8s
  title: consumer suite typechecks and builds
  statement: |
    a TypeScript consumer's test suite typechecks and builds with the package installed.
  satisfied_when: |
    ...
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

Its requirements file has the same shape as any product's. A product adopts it, declaring changes rather
than state:

```yaml
# increment 1 — first adoptions
adopts:
  - nodejs-library@3
  - published-to-npm@1
```

```yaml
# increment 4 — a version change and a removal
adopts:
  - nodejs-library@4
drops:
  - minecraft-addon
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
  falsifiers:
    - a consumer needs the root specifier to carry only names the engine's declarations declare
```

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

