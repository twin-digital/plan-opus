# The incremental design process

The normative reference for the incremental design process: what the owner and agents read to
run it. Instruction to agents working inside the process is in `agent-guidance.md`; what the
process retired from earlier practice, and how existing designs convert, is in
`process-migration.md`. The content-quality tests for foundations live in their own document,
shipped by a later increment. This reference is one epistemic kind: everything it states is a
requirement or decision of the `increment-process` product, enforced by the design validator
where a rule is mechanical.

## Summary

The process is a loop: **capture** requirements; **clarify** — research and reason about
alternatives to drive decisions; **ratify** — the owner rules; repeat. Everything drives toward
one goal: structured decisions that are reviewable separately, viewable topologically, and
comprehensive enough to drive implementation in a constrained and directed manner.

The unit of change is an **increment**, scoped to a **product**: a declared delta of
requirements, decisions, and contract bindings, drafted on a branch and published by merging —
after which it is immutable, and the effective state of the product is the **fold** of its
published increments. Implementation is separately scheduled work against the fold at a
published increment, recorded where evidence lives rather than where design lives.

## The foundations

Everything the owner ratifies is a foundation entry in an increment's sources, and each kind
has a job, an author, and a lifecycle:

- **Requirements** are owner fiat: what the product must do to be accepted. Captured by the
  owner and agents at the start of an increment, directly into its requirements source; amended
  by later entries (`amends`), retired with a reason, adopted in bulk from presets. A
  requirement may carry a `verification` procedure where its statement is not self-verifying,
  and `rationale` where a casual reversal would be a mistake the statement does not warn of.
- **Decisions** are the path taken to meet them — each choice a consumer could observe or a
  reimplementation must preserve; choices below that bar live in the code, and a
  reimplementation is free to re-make them. Proposed by whoever does the design work, then
  ruled by the owner. While still proposed and inside its own increment, a decision may be
  removed outright; once ruled, it persists, closed only by a successor's `supersedes` or a
  retirement. `because:` records what a decision rests on; `pinned` marks the ones that cannot
  be freely overturned; `revisit_when` carries the rare, deliberate revisit condition.
- **Model entries** bind the contracts the design speaks about — entity name to a pooled schema
  or API surface at a pinned version, in the `model:` block of the requirements source. Written
  as the shapes settle, ratified with the increment's requirements, folded by entity name.
- **Facts** live in the repo-wide pool: findings about the world, with the runs and artifacts
  that establish them, citable from anywhere and governed by the existing evidence rules.
- **Drafts** are the increment's frozen working prose — the synthesis argument, and
  design-drafted content for document deliverables — raw material for implementation, never
  normative.

One further entity is defined like a foundation but is not one: the **open question**, the
structured ask an agent puts to the owner while an increment is a draft. It has a formally
defined shape (`/design-process/question@1`) and never publishes; see *Open questions* below.

The owner and agents author foundations directly, as plain files; review is an ordinary
pull-request diff, and the owner reads every claim in full. Because the spec is gone, the
decision set is the owner's only window on what was built — so decisions are not minimised;
they are rich enough to comprehend a product from, read as a set.

Increment artifacts live at `products/<product>/increments/<NNN>/` — `requirements.yaml`,
`decisions.yaml`, a `drafts/` folder, and the sources later process increments define, with
`.yaml` and `.yml` both accepted wherever a source is named. The increment is its directory,
with no manifest file of its own. The product is declared by the presence of
`products/<product>/product.yaml`, whose directory name is the product id.

Lifecycle is uniform: **an increment declares changes, and state is the fold.** New entries
add; superseding entries replace, carrying their reason in their own content; retirements
remove, with a reason; and nothing is ever edited once its increment publishes.

## The process

```
Plan:
  Capture → Clarify → Ratify    (loops until the owner declares it settled enough)

Implement:
  Define → Stub → Code → Document per code package; Claims → Compose → Check per document
  package — waves, escalation, evidence; Plan hands Implement the ratified fold
```

### Capture

Capture is the step where the owner and agents create the increment and populate its initial
requirements, directly into its requirements source. An increment's scope is nothing more than
the changes its sources declare.

### Clarify

Find the places missing research and do the spikes. Identify the open questions and answer the
ones that can be answered. Make the big-picture decisions that follow from the requirements
alone, without low-level code knowledge.

Outputs are the research and results collected, plus a ratified set of requirements, with any
owner-approved amendments, and decisions reached from research, also owner-approved.

The working method is a **synthesis draft** — connected prose, because writing an argument that
must hold together is what exposes the decision not yet made and the question not yet asked.
The draft lives in the increment's `drafts/` folder, merges with the increment, and freezes at
publish like every other increment file. It is raw material, never normative: the fold is what
binds, and a claim in the draft that cites no foundation is a shadow decision — extraction into
decisions, facts, and open questions is Clarify's discipline, with the frozen draft as the
record of the argument rather than a second authority.

The design phase produces **no prose specification** for an implementer to follow.
Implementation works strictly from the fold — requirements, decisions, and bound contracts —
and later converts drafts into shipped documents, checking the drafts' claims against the fold
as it goes.

### Open questions

An agent that meets a question it cannot answer raises it to the owner as an open question
rather than guessing an answer or dropping it. Decisions are the propose half of the
Clarify–Ratify exchange; **a question is the ask half** — the structured form an agent uses to
put something to the owner, and the list the owner works down when responding.

Questions live in `questions.yaml` beside the increment's other sources, carrying one
`questions:` block:

```yaml
version: "1"
questions:
  - id: q-p3v6icfy
    question: |
      should a preset be able to declare a requirement that applies to only one package of an
      adopting product?
    answer: requirement
    facets: [schema]
```

`answer` names which kind of foundation would answer the question, and its job is routing: a
`fact` sends someone to measure, a `decision` needs a call someone is competent to make, and a
`requirement` is owner fiat nobody else can supply. A question whose author cannot name that
kind is usually not a question yet.

A question is not a foundation and never enters the fold: no claim, decision, or requirement
may cite one, and no citation resolves to one. It lives only while the increment is a draft,
removable outright with no record, exactly like a decision still proposed. **No increment
publishes carrying an open question**: every question is answered by the fact, requirement, or
decision the increment ratifies, or removed as no longer relevant, before the merge — the same
shape of check as "no decision still proposed", and for the same reason. There is no
retirement form, no supersession, and no closure record; on main the file is absent or holds no
questions.

The gate is mechanical and narrow: it closes the leak of a recorded question drifting
unanswered. It cannot catch a question nobody wrote down — the defences there are the synthesis
draft's remainder check and the owner's read at ratification.

### Ratify

**Not a one-way handoff.** Clarify and Ratify iterate — agents raise questions and decisions,
the owner responds, agents consume that feedback and raise more. The loop runs until the owner
declares it settled enough to implement.

The owner's ruling on each decision is one of four values:

- **accepted** — the owner determined the decision is acceptable without caveats or reservation
- **tolerated** — the owner judged the decision and left it standing, but found it sub-optimal
  or undesirable in some way
- **delegated** — the owner abstained from reviewing the decision, which is left standing as is
- **rejected** — the owner determined the decision non-viable; carries the owner's reason on
  the entry, and is closed by a replacement proposed by whoever proposed the rejected one

Distaste is not rejection. A decision the owner dislikes but can live with is tolerated, and
may stand indefinitely; if the owner does want it changed, that becomes a requirement in some
future increment — a deliberate choice, never an automatic consequence (see *Implement
forward*). A rejection's reason is the one required reasoning, because it is the input to the
rework; the replacement's `supersedes` is what closes the rejected entry.

**`tolerated` and `delegated` are opposite states, not degrees of the same one.** Tolerating is
a judgement; delegating is an abstention. Keeping them apart is what lets anyone ask,
product-wide, how much the owner engaged and judged versus passed over — the projection labels
each decision and counts the abstentions. The count of delegated decisions is the honest
measure of how much of a product was reviewed, the same kind of ledger `attestation` provides
for coverage on the other axis.

### Publish is the merge

An increment is draft or published, and the boundary is main — draft is a location, not a
stored field. A draft lives on its increment's branch, freely editable the whole time: proposed
decisions and questions may be removed outright, the number is provisional, and nothing
downstream builds on it. Merging to main is the publish act, and the gate runs there:

- no decision still `proposed`
- no open question still carried
- the number is the next in the product's sequence — a concurrent increment's collision
  surfaces here, and the loser renames and recomputes against the fold that moved

The gate is a required pull-request check: the design validator runs on every pull request,
applies every rule in force at that point, and any failure blocks the merge — the gate is not
advisory, and nothing publishes over a failing check. The wiring is thin repository
configuration: this repository commits a small workflow that installs the tooling packages and
runs the check, branch protection marks the check required, and the validator logic lives
entirely in the tooling packages.

Main therefore holds only published increments, dense and immutable, and the validator refuses
any edit to one: **a published increment is never unsettled by later work** — drafting
increment N+1 changes nothing about increment N. There is no draft-on-main state: the fold over
main is always a fold over settled history, and what a tree-consumed deliverable shows on main
is always what a published increment built.

### Design and implementation keep their own schedules

An increment need not run Implement. Capture → Clarify → Ratify → publish is a complete
increment — a preset's only shape, and any product's option. Its ratified requirements sit in
the fold as claims with no coverage, which the projected view shows for what they are: ratified
and unbuilt. Several design increments may accumulate before any implementation; one
implementation may target the consolidated fold, and nothing obliges one per increment. An
implementation durably records the increment it targeted, and an implementation never amends
the design it targets: an escalated change lands as an ordinary design increment, and the
implementation retargets the fold that contains it.

## What endures, and what is disposable

**Durable** — these persist and accumulate:

| artifact | what it holds |
|---|---|
| requirements | owner fiat: what the product must do to be accepted |
| decisions | the path taken to meet them — each choice a consumer could observe or a reimplementation must preserve; choices below that bar live in the code |
| facts | what has been observed about the world, with the runs and artifacts that establish it |
| interfaces | the shapes something outside the implementation compiles against — the schema and api pools |
| drafts | each increment's frozen synthesis prose — raw material for the shipped documents, never normative |
| implementations | the record of each implementation — the increment it targeted, the package versions it produced, and its coverage |
| released versions | tags and published artifacts — permanent once out, whatever happens to the source |

**Transient** — generated, used, discarded:

| artifact | why it is transient |
|---|---|
| test plan | an input to the implementation, not a description of the product |
| implementation | regenerable from the durable set |

The asymmetry is deliberate. The durable set is what the owner reviews and what tooling can
diff; the transient set is where work happens. Released versions are durable for a reason no
other entry shares: they are durable whether the process wants them or not — a published
package cannot be recalled, so the record of what went out is the one durable artifact this
repository does not control the lifecycle of.

## Mechanics

### Pinned decisions

A decision's **status** records the owner's ruling. Separately and independently, a decision
may be **pinned** — meaning it cannot be freely overturned.

- **`pinned`** — `false` (the default), or `{ reason, notes? }`. A pinned decision requires
  owner ratification to change; an unpinned one does not, whatever its status.
- **`reason`** is an enum — `data-format`, `public-api`, and `other` as the escape. `notes` is
  required with `other`, because there it is the reason; alongside a named reason it is almost
  never provided — only where why the named reason applies is unclear.

Pin a decision when it fixes a public API surface, fixes a data format written to disk or sent
over a wire, is something another product depends on, or changes behaviour a consumer would
notice. **Pinning, not status, is what escalation reads.** No status on its own obliges an
implementer to stop.

### Lifecycle — declare changes, fold for state

Requirements, decisions, model entries, and preset adoptions all work the same way: an
increment declares what changed, and the effective state is the fold across the product's
increments. The owner reads the effective set, computed; the history is preserved and is not
what anyone reads.

**A claim is retired either by supersession or on its own.** A superseding entry names what it
replaces (`supersedes` on a decision, `amends` on a requirement) and carries the reason in its
own content. A retirement with no successor is a `retires:` entry — one id, one one-line
`reason` — in the increment source whose file scopes its kind; the reason is the only thing
distinguishing it from an oversight. When one event retires several claims, the reason repeats,
keeping every retirement independently greppable and judgeable.

Within the increment that created it, a decision still `proposed` may be removed outright with
no record. Once ruled on, an entry persists and is closed only through these mechanisms, so the
owner can follow what became of something they ruled on.

**Recording is required; asking is not.** An unpinned decision may be overturned by an
implementation wave without escalating. It must still be recorded — a decision silently out of
force makes the record lie, and the record is what the owner reads. Overturns land as
superseding entries in the implementation's companion increment (see *The companion
increment*).

**Concurrent increments collide on the number, and that is the whole provision.** Two in flight
both claiming `003` conflict at merge; the loser renames to the next slot and recomputes
against the fold that moved, and the projection and validator report whatever the recomputed
fold breaks. The process adds nothing further for this case.

### Statements, and how they are verified

A statement is one proposition of owner fiat, in product terms. It is **self-verifying** when
its truth is decidable by direct inspection of what it names, with no interpretive choice —
then `verification` is omitted, and coverage targets the statement read literally. Where the
statement carries a term an observer cannot decide directly — an unbounded quantifier, a
judgement word, an underspecified technical term — `verification` gives one ordered,
performable procedure that binds the term to observations:

```yaml
- id: r-h97o555y
  title: consumer suite typechecks
  statement: |
    a TypeScript consumer's test suite typechecks with the package installed.
  verification:
    - do: compile a consumer suite containing both pack imports and control-surface imports
    - verify: no error, and no cast at the seam
```

`do` steps are performed; `verify` steps assert about what a preceding `do` surfaced, and all
must hold. The first step is a `do`, and a `verify` with no grounding `do` is malformed — which
is what keeps the procedure from drifting into a restatement of the statement. Judgement is a
final pair naming the judge. Steps exercise the requirement's intent through the product's
published surfaces — and whatever a step names, the owner now expects: naming is binding, so
internals are named only when binding them is the point.

**Decisions carry no verification, and the asymmetry is principled.** A requirement states an
*end*, so how you would know is a genuinely separate question. A decision states a *means*, and
its verification would be a restatement.

### Schemas pool by identity, and the model binds them

Schemas live in one repo-wide pool under `schemas/` — any file at any depth. Identity lives in
the file: each schema declares `$id: /<namespace>/<entity>@<version>` beside `$schema` — JSON
Schema draft 2020-12, authored as YAML — names unique across the repository, versions dense
integers per entity, the leading slash mandatory and its omission a validator failure.
Root-relative identities resolve to themselves regardless of base, which is what lets a schema
depend on schemas: a `$ref` is such an identity, resolved from the pool as the registry, and
binds transitively. References resolve by identity and never by path, so the tree may be
reorganised freely; any organisational or naming convention within a pool is an aid to
navigation — non-normative and unenforced.

A version is immutable once an increment binding it publishes, directly or transitively, and
stays present as long as anything published relies on it. The validator refuses to edit or
remove one that any published increment binds; it also fails when two pool files claim one
identity, and fails an increment whose schema reference — a model binding or a source file's
`version` field — resolves to no pool schema. A new version is a new file, proposed by the
increment introducing it and ratified with it. Drift is legal: no product is rebound by a new
version appearing.

An increment binds contracts through its **model** — a top-level block of its requirements
source, beside the requirements and preset declarations it ratifies with, folding by entity
name:

```yaml
model:
  - name: pack-manifest
    schema: /minecraft/pack-manifest@2
    description: the manifest a behaviour pack ships, as the build writes it
```

The entity name is the design's word for the thing, free to differ from the pool entry's name,
and the description anchors what the entity is in the design. An entry carries one contract
reference — `schema:` or `api:` — and a `status` of `bound` (the default) or `unbound`. Model
entries are part of the increment's requirements: ratified with it, binding on implementers,
folded by entity name, with no duplicate entity names in force; wherever prose references an
entity, its bound contract is the authoritative shape.

Foundation files need no model entry to be interpretable: each names its own schema's pool
version in its `version` field. The model is for the shapes a design defines and speaks about.

### Every structured file names its own schema version

Every structured file this process defines — `product.yaml`, the increment sources, the
implementation records, and any source a later increment adds — carries `version`: the pool
version of the file's own schema. A requirements source with `version: "2"` is interpreted by
the pool schema `/design-process/requirements@2` — one lookup, no fold. The field is what makes
schema evolution compatible with immutability: a published file stays readable forever in the
dialect it was written in, and a format change is an ordinary new pool version that later files
opt into. Carrying the field means a foundation file is a mapping, not a bare list: `version`
sits beside the top-level keys — `requirements:`, `decisions:` — that name what the file holds.

### Identifiers

Requirement, decision, and question ids are `{prefix}-{8 lowercase base36 characters}` — the
prefix `r-`, `d-`, or `q-`, the rest random, produced by a CLI generator; the validator
enforces format and uniqueness, so a collision is a regenerate at creation rather than a latent
bug. The id is the citation form; `title` carries the human label and may churn freely.

Random rather than meaningful, deliberately: a slug bakes a summary into the identity, which
drifts as the statement iterates and breaks citations exactly when an entry churns most; a
timestamp component makes batch-created ids near-identical, and batch-created entries are the
ones that cite and supersede each other. Nothing reads structure out of an id. Question ids are
unique within the increment that raised them — the only scope in which a question exists.

Increments stay plain numbers — readable, and the merge collision on the number is the
concurrency detection. Products and presets are named by their directory, and adoption uses
that name.

### Requirement presets

No requirement outside a product's own increments binds it; adoption at a pinned version is the
only way an external requirement takes force. A **requirement preset** is a product that
defines requirements and builds nothing. It has increments like any other product, and they are
Plan-only.

A product adopts presets at pinned versions in its requirements source, as a `presets:` block;
entries are state-shaped and fold by preset name:

```yaml
presets:
  - name: nodejs-library
    version: 3
  - name: minecraft-addon
    status: dropped
```

`status` is `adopted` — the default, normally omitted — or `dropped`; `version` is required
when adopted and forbidden when dropped. Rules:

- Adopting and dropping are direct owner action — fiat, like adding or removing any other
  requirement; the increment that declares the change is the record.
- A preset is adopted whole. There are no exceptions or partial adoptions.
- A preset does not adopt another preset.
- A conflict between an adopted requirement and a product-local one blocks the merge. An agent
  raises the underlying tension as an open question, and the increment cannot settle until it
  is addressed.
- Adopting and dropping the same preset in one increment is an error.

Drift is expected and not forced: products may sit on old preset versions indefinitely, and
nothing obliges an upgrade.

### Projection replaces a written spec document

If decisions are the owner's window, they have to read as a set — and that assembly is most of
what a spec was doing. The job moves to tooling. The two words are deliberate: the **fold** is
the state — declared deltas combined into the effective sets, authoritative wherever it is
computed — and the **projection** is its rendering for a reader, joined, filtered, and ordered.
A projected view of a product shows, for one product at one increment:

- the effective requirement set, product-local and adopted, with each adoption's preset and
  version
- the effective decision set, with status and pinning, ordered by `because:` topology where
  cited rather than by file order — and each decision labelled by ruling, with the abstentions
  counted
- for each claim, its coverage and what provides it
- open questions blocking the increment from settling
- what this increment changed against the fold before it

— the whole of it filterable and groupable by facet, where the product declares them.

### The fold at an increment is the bundle

What an implementer implements against is the fold at a published increment — the effective
requirements, decisions, and bound contracts of `<product>@N`. Publication made every input
immutable, so the view is derivable on demand and identical forever: nothing is archived,
nothing is separately published, the increment number is the version, and the declared delta is
the changelog. None of it is authored — all of it is a fold over artifacts that already exist,
which is why it can be correct by construction where a spec could only be correct by diligence.

### Facts record what research found

Spikes, probes, and measurements produce findings about the world, kept past the increment that
produced them because the next increment would otherwise re-derive them, and because a decision
built on a finding should be traceable to it.

- **`because:` on a decision** — what it rests on: the requirements it follows from, the facts
  that drove it, and the decisions it builds on. Citations give the projection a dependency
  order, and superseding or retiring an entry surfaces its dependents. Optional: a fact is
  deliberately non-trivial to record, and requiring a citation per decision would manufacture
  them rather than find them. Where nothing is cited, the decision's own statement carries the
  reasoning.
- **`informed_by:` on a requirement** — a pointer, explicitly not justification, since
  requirements are fiat and need none. It exists so that a fact contradicting a requirement can
  be found rather than noticed.

### Facets

A **facet** is an optional label on a requirement or decision — one or a list — drawn from the
vocabulary the product declares in its `product.yaml`, each an id with a description. A facet
is a reading aid: the projection groups and filters by it, and no rule reads it. Nothing fences
by facet, nothing escalates by facet, coverage and pinning ignore it — which is what keeps it
cheap to assign and cheap to be wrong about.

Wanting a rule that mentions a facet is the signal the facet has become a product, and the
split happens then, on evidence of independent life. Facets do not draw component boundaries:
where packages meet is decision content, pinned when a consumer could notice.

### A product maps to its packages

A product spans one or more packages. A product exists exactly when
`products/<id>/product.yaml` does; the mapping carries `path` and `kind` per package, plus an
optional `repo` — GitHub `owner/repo` form, `twin-digital/opus` when unstated:

```yaml
version: "1"
kind: process
packages:
  - path: nodejs/plan/design-process
    kind: npm-cli
  - path: docs/design-process/process-reference.md
    kind: document
    repo: twin-digital/plan-opus
```

The `path` is the workspace-relative directory or file, and it is also where an implementer
works; anything else a kind might call for is read from the package at that path rather than
duplicated, so the mapping cannot drift from what it maps.

Creating, splitting, or moving a package is a decision like any other — proposed and ratified
in Plan, pinned once something outside the product depends on the boundary. The mapping
reflects the state those decisions produced, and it is descriptive, never aspirational:
`product.yaml` is current state, freely edited rather than increment-locked, because the record
of a package change is the decision that made it. An implementer adds, removes, or updates
package entries at the same time it changes the implementation files they reference.

Consequences: released versions are per-package; coverage refs resolve through the mapping —
the package path prefixes a `ref`, and the package's `repo` anchors it to a repository; a
preset may read against one package of several, with the coverage manifest showing which
package carries each adopted claim.

**A package need not be code.** For some products the deliverable is a document — a format's
normative reference, a process description. Such a package takes `kind: document`, a `path`
that is the document's permanent home, and often a non-default `repo`. This does not bend the
no-spec rule: what the process discards is the design-phase document that *describes* a
product; a document a product *ships* is implementation, produced and revised by implementation
waves like any other deliverable.

The difference a document does have is how it is consumed. Code is consumed through released
versions, so work-in-progress on the default branch touches no consumer; a document at a
permanent path is read straight from the tree, so merge is what makes it live — its changes
ride an implementation's pull request, drawing on the increments' frozen drafts, and go live
only when it lands. Shipped document packages live at permanent homes under `docs/<domain>/`,
entering `product.yaml` at the merge that ships them; synthesis drafts live at
`products/<product>/increments/<NNN>/drafts/`, merging with the increment that generated them
and freezing at its publish.

### Implement forward

Resolving a tension that is merely unwelcome is not part of the current increment: the owner
may capture it as a requirement in some future increment — optionally, whenever they choose, or
never; nothing in the process does so automatically. Amend in place only when something is
**impossible, non-viable, or incorrect**. "Incorrect" earns its place in that list: a guard
that silently answers false, so a handler returns early and its test passes green, breaks
nothing visibly — and is the product not working. That cannot wait.

## The Implement phase

Plan hands Implement the ratified fold at a published increment.

### Decomposition is design work

The consumer-visible package set — each package's existence, kind, and home — is proposed and
ratified in Plan, as decisions of the increment that calls for it. The information is available
there, and the boundaries are pinned territory the owner rules on regardless, so settling them
anywhere else is the ratification loop with extra steps and a blocked implementer in the
middle.

The line holds in both directions. Plan fixes the public shape only: structure below the
package surface — a shared internal library, how code splits inside a package — is the
implementer's, and pre-deciding it from the plan tier manufactures churn. And `product.yaml`
stays descriptive: intent lives in the increment's decisions, and the mapping reflects the
packages an implementation has realized.

### Dispatch: kind selects the wave shape

An implementation dispatches one implementer per package, and the package's `kind` — already in
the mapping — selects its wave shape. Every shape shares one rule: each wave produces one
artifact, validated against what came before it.

The shape for code kinds — `npm-library`, `npm-cli`, `minecraft-addon`:

| wave | produces | validated against |
|---|---|---|
| **Define** | the test plan | the requirements and decisions |
| **Stub** | tests and API stubs | the test plan |
| **Code** | the implementation | the stubs, by compiling; the tests, by passing |
| **Document** | READMEs and user-facing documentation | the implementation |

Documentation is a wave rather than an afterthought because it is a deliverable of the product,
not a by-product of implementing it.

The shape for `document` kinds:

| wave | produces | validated against |
|---|---|---|
| **Claims** | the list of claims the document must state | the effective design at the targeted increment |
| **Compose** | the document at its permanent home, drawing on the increments' frozen drafts | the claim list; every draft claim checked against the fold |
| **Check** | coverage entries per claim | the document, read against each claim |

The claim list is a selection and an allocation, not a restatement. From everything in force at
the targeted increment, it names the claims *this document* is responsible for stating and maps
each to where the document will state it. Its value is what it surfaces before composition
starts: a claim no document owns, two documents owning one claim, a claim whose statement
cannot be read back out of any planned section.

Further kinds name their shapes as they earn them, each its own decision — the shapes are the
process's initial vocabulary, not a closed set.

### The companion increment

An implementation never amends the design it targets; it accumulates amendments in a
**companion increment** — a branch holding the product's next increment, opened when the
implementation begins. Everything design-relevant the work produces lands there as it happens:

- **decisions** — entering as `delegated` where nothing pins them; as `proposed` where a
  requirement, a pinned decision, or a decision that would be pinned is at stake
- **open questions** — a requirement change to ask for, an unknown the implementer cannot
  answer
- **contracts** — a new external-facing API surface or schema, as a pool version bound through
  the companion increment's model

**A proposed entry is an escalation**: it requires the owner's ratification, and the build
pauses where — and only where — it is blocked on the answer, progressing everywhere else until
forced to stop. An open question blocks the same way. Only delegated entries accumulate without
interrupting anything. The asymmetry between Plan and Implement is deliberate: Plan exists to
surface and ratify the big rocks, so everything raised there reaches the owner; Implement
exists to make progress, so only what is hard to reverse interrupts it. An implementation wave
escalates only to change a requirement, change a pinned decision, or propose a decision that
would be pinned; otherwise agents decide and record, including overturning unpinned decisions.

The companion increment is the **only channel**: every design change an implementation produces
lands through it, as an ordinary design increment, and the implementation record carries no
design content — target, packages, and coverage only. The merge gate reads only `proposed`, so
a companion increment whose escalations were ruled as they arose lands gated by pull-request
review and the validation checks rather than by per-entry rulings; ruling a delegated entry up
— or reversing it — is implement-forward, whenever the owner chooses.

At completion the companion increment is ratified as a whole — every decision ruled, every
question answered or removed — and merges through the ordinary gate. **Only then does the
implementation publish**: a design with no implementation is a safe state the process
supports, and an implementation whose backing design has not published is not — so no package
version releases and no document deliverable goes live before the design increment its
implementation targets is published, with the controls enforcing that ordering deferred to a
later increment. An implementation whose companion increment stayed empty simply closes it — an
increment that declares nothing is not published.

### Everything lands at head

A record's `target` is the product's newest published increment at the moment the record
merges; a stale target is refused, and the implementation retargets first — recomputing against
the declared deltas of whatever landed meanwhile, a bounded read rather than a re-review — so
merge order and target order coincide at every landing. When later design increments have
already landed, this is **abort-and-retarget**: the companion increment lands at head, above
whatever arrived meanwhile; the implementation retargets to the increment it produced; and the
loop repeats if further increments land first. Under fast enough design landings, nothing ever
finishes implementing — accepted for a single owner authoring increments, where the race is
rare and losing it is cheap.

### Proving a claim is met

A product should be able to demonstrate, mechanically, that it meets what it claims — so that a
decision cannot quietly describe a product that no longer exists, and so the owner can ask how
much of a product is actually checked rather than merely asserted. **Every claim in force
carries coverage**, and how much of the product rests on an agent's word alone is visible
without reading the code. A claim is a requirement or a decision: both are assertions about the
product, and an assertion nothing checks can quietly become false. What a requirement's
evidence must demonstrate is its verification procedure — or its statement read literally,
where it carries none.

**Coverage is the implementation's artifact, not the design's.** An implementation produces a
record in the `implementations/` pool — a repo pool like `evidence/`, one record per
implementation, immutable once its artifacts ship — linking the package versions produced to
the design increment targeted, and carrying the coverage manifest. A record is filed at
`implementations/<product>/<NNN>-<k>.yaml`, `NNN` the increment it targeted and `k` a dense
ordinal from 1. Run by hand — the owner and agents working the increment's own branch — or
autonomously by an orchestrated Implement phase, an implementation is the same mechanism either
way, and both write this record:

```yaml
version: "1"
product: minecraft-test-lib
target: 7
built_at: 2026-08-01
packages:
  - path: minecraft/test-lib
    version: 0.4.0
coverage:
  - claim: r-h97o555y
    covered_by:
      - kind: conformance-case
        ref: conformance/typecheck.txtar
  - claim: d-qaq43q3x
    covered_by:
      - kind: code-test
        ref:
          - test/exports.spec.ts
          - test/control.spec.ts
      - kind: attestation
        note: the exports map declares ./control, and the build fails without it
```

`kind` + `ref` + an optional `note`, uniform across kinds, so new kinds land without a schema
change. `ref` is one path or a list, naming what carries the claim — if removing the file would
not touch whether the claim holds, it does not belong.

| kind | what it is | what still rests on the implementer's word |
|---|---|---|
| `attestation` | an agent asserts it; no artifact | everything |
| `code-test` | a test in the project's own suite, written by the implementer | that the test measures the claim |
| `manual-check` | recorded steps a human follows and re-runs | that the steps measure the claim |
| `conformance-case` | a case the owner wrote or vetted, tied to the claim it checks — automated or manual | nothing |

What makes evidence strong is **provenance and coupling** — who vetted the check and its tie to
the claim — not automation. An attestation is believed whole; a test moves the verdict into the
product, where it executes and can fail, leaving only "the test measures the claim" to trust —
a smaller thing, and an auditable one. A conformance case retires that residue by moving
authorship or vetting to the owner. A manual conformance case outranks an automated
implementer's test; whether a check runs without a human prices re-running it, and is worth
reporting on that ground alone. A check with no recorded steps is not a `manual-check` and does
not enter the manifest at all.

**A manifest names only claims in force at the increment its implementation targeted**, and
never a claim still `proposed` — coverage is evidence about something the owner has ruled on.
Requirements adopted from a preset are coverage-tracked exactly like product-local ones.

Who contributes, and when:

| point | contributes |
|---|---|
| a requirement is authored | `verification` — not a coverage entry, but the procedure evidence will later demonstrate |
| **Define** | the claim list, and which kind of evidence each claim is expected to get |
| **Stub** | `code-test` and `conformance-case` entries, as those artifacts come into existence |
| **Code** | an `attestation` for every claim it implemented — always, from the implementer, alongside whatever better evidence exists — and the entries written earlier now pass |
| **Document** | `manual-check` entries, where a claim is verified by following documented steps |

### API surfaces

Public API surfaces are authored contracts in a repo-wide `apis/` pool — commitments the
implementation must satisfy, never extracted projections, though the validator may extract from
the code and diff against the authored surface, which is what makes an authored one
falsifiable. Identity is in-file by a per-tech header — `// api: /<namespace>/<name>@<version>`
in TypeScript, `# api: ...` in YAML formats, `info.x-api-id` where OpenAPI metadata fits — with
the file's extension and content telling the validator which extractor reads it. Versions are
dense integers per name, immutable once an increment binding one publishes, present as long as
anything published binds them; drift is legal. Only public surfaces enter the pool — the
internal stubs the Stub wave produces stay implementation.

The model binds an API surface the way it binds a schema — an entry carries `api:` instead of
`schema:` — so bindings ratify as requirements, and an implementer needing a surface change
proposes a new pool version and a rebinding as an ordinary design increment,
abort-and-retarget applying.

## The tooling, and the documents

The process tooling — the validator, the projection, the id generator — ships as packages in
the opus workspace (`twin-digital/opus`), and this repository installs them at pinned versions
through its top-level `package.json`; the merge gate wires to their commands.

The process's normative reference is itself a shipped deliverable: separate document-kind
packages rather than one, each scoped so an agent loads only the context its task needs, at
permanent homes under `docs/` in this repository — this reference, the agent guidance, and the
migration record. The content-quality tests for foundations — what makes a statement, a
verification procedure, a decision, or a model entry good — are their own document package,
shipped by a later increment: one body of tests binding the writer of what each governs,
reviewer-applied and never a validator rule.
