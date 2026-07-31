# Incremental development

## Context

Roughly 34 packages in one pnpm/turbo monorepo, growing 3–5 per month, most of them 1,000–5,000 lines,
one maintainer, code largely written by agents. Recurring project kinds: libraries, CLI tools, web apps
and HTTP APIs, Minecraft behaviour-pack addons, CI/CD processes, devcontainer tooling, bots. Bounded
manual work is acceptable where it uses the owner's time efficiently.

That scale matters — several recommendations below would be different for a handful of projects or for
hundreds.

Evidence base: `docs/experiments/spec-value/`, four controlled comparisons of what a spec contributes
over its foundations, included in this change.

What this process retires, and why, is in `process-migration.md`. This document states only how the
process is meant to work.

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

**The spec is not needed.** Two observations, and the first is the plainer one:

- The owner skims it. It is not a document anyone reads to understand what was built.
- It does not change the built product much beyond what the foundations already state. Four designs were
  tested by having an independent agent write a build plan from the foundations alone, then read the spec
  and record what changed. In each case the agent found only **a handful of items** that would have been
  built differently without the spec; most of the document restated foundations or argued for them.

The goal that follows is to capture those missing classes of information **as foundations** rather than
as prose in a spec — which is a smaller job than it sounds, because there are few of them and they
repeat.

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
| decisions | the path taken to meet them — each choice whose outcome someone downstream would notice, recorded with the conditions that would call for it to be revisited |
| facts | what has been observed about the world, with the runs and artifacts that establish it |
| interfaces | the shapes something outside the build compiles against |
| released versions | tags and published artifacts — permanent once out, whatever happens to the source |

**Transient** — generated, used, discarded:

| artifact | why it is transient |
|---|---|
| spec | 85%+ restatement and argument |
| test plan | an input to the build, not a description of the product |
| implementation | regenerable from the durable set |

The asymmetry is deliberate. The durable set is what the owner reviews and what tooling can diff. The
transient set is where work happens.

**The unit of change is an increment**, scoped to a **product**. An increment owns its ask, the
foundation changes it makes, the decisions it produces, and the transition a builder follows. Status
attaches to the increment, so drafting increment N+1 never unsettles the shipped increment N.

---

## The process

```
Plan:
  Ask → Clarify → Ratify        (loops until the owner declares it settled enough to transition to building)

Build:
  Define    → [Escalate → Ratify → resume or rework]
  Stub      → [Escalate → Ratify → resume or rework]
  Implement → [Escalate → Ratify → resume or rework]
  Document  → [Escalate → Ratify → resume or rework]
```

### Ask

The owner picks a set of requirements to build as a new increment.

### Clarify

Find the places missing research and do the spikes. Identify the open questions and answer the ones that
can be answered. Make the big-picture decisions that follow from the requirements alone, without
low-level code knowledge.

Outputs are the research and results collected, plus:

1. a **ratified set of requirements**, with any owner-approved amendments
2. **decisions reached from research**, also owner-approved
3. **open questions** identified but not answerable at this level, left for Build to resolve

### Ratify

**Not a one-way handoff.** Clarify and Ratify iterate — agents raise questions and decisions, the owner
responds, agents consume that feedback and raise more. The loop runs until the owner declares it settled
enough to build, and whatever remains open goes to Build.

Each proposed decision is read in full and becomes:

- **accepted** — "this matters to me," or "I'd have done it this way"
- **tolerated** — "I don't love it, but you had good reason and I would not reject it"
- **delegated** — "I do not have the context to rule on this; the judgement stays with whoever made it"
- **rejected** — reserved for *impossible, non-viable, or incorrect*

Distaste is not rejection. A decision the owner dislikes but can live with is **tolerated**, and may
stand indefinitely — nothing obliges a later increment to revisit it. If the owner does want it changed,
that becomes a requirement in some future ask, but as a deliberate choice rather than an automatic
consequence. See *Build forward*.

**`tolerated` and `delegated` are opposite states, not degrees of the same one.** Tolerating is a
judgement — the owner engaged, weighed it, and accepted a cost. Delegating is an abstention. Collapsing
them would make it impossible to ask afterwards how much of a product the owner actually ruled on, which
matters because the decision set is the only window they use. **The count of delegated decisions is the
honest measure of how much of a product was reviewed rather than passed over** — the same kind of ledger
that `attestation` provides for coverage, on the other axis.

### The build waves

Each wave produces one artifact and is validated against what came before it:

| wave | produces | validated against |
|---|---|---|
| **Define** | the test plan | the requirements and decisions |
| **Stub** | tests and API stubs | the test plan |
| **Implement** | the implementation | the stubs, by compiling; the tests, by passing |
| **Document** | READMEs and user-facing documentation | the implementation |

Documentation is a wave rather than an afterthought because it is a deliverable of the product, not a
by-product of building it.

### Escalate

An escalation path is open at **every** wave. It is meant to be a rare escape hatch rather than a closed
door, and agents are given explicit instruction about what qualifies. It fires when a wave needs to:

- propose a change to a **requirement**
- propose a change to a **pinned** decision
- propose a **new** decision that would be pinned

Otherwise the build proceeds. Agents have wide latitude to decide and implement — including overturning
unpinned decisions and introducing new unpinned ones — provided nothing contradicts a ratified decision or
requirement.

The asymmetry between Plan and Build is deliberate. **Plan exists to surface and ratify the big rocks**,
so by definition everything raised there reaches the owner, who may simply tolerate what is easy to
reverse. **Build exists to make progress**, so only what is hard to reverse interrupts it.

### Publish gate

Nothing merges or publishes while a `proposed` decision is outstanding — the same mechanic the repository
already uses for the settle gate, pointed at a new target.

### Harvest

At the increment boundary:

- superseded requirements are retired against replacements
- a decision is **promoted to a requirement** only when it has become so visible or impactful that
  consumers can reasonably be expected to rely on it, and preserving its effect is a matter of
  compatibility

That last one is narrower than "promote what the owner cares about." Requirements say what the product
must do to be accepted; decisions describe the path taken to meet them. Most accepted decisions stay
decisions, because acceptance records that the owner ruled on a choice, not that the choice has become
load-carrying for anyone downstream.

---

## Mechanisms it relies on

### Requirement presets

A **requirement preset** is a product that defines requirements and builds nothing — `nodejs-library`,
`minecraft-addon`, `published-to-npm`. It has increments like any other product, and its increments are
**Plan-only**: Ask → Clarify → Ratify, with no Build.

**A product adopts presets at pinned increments.** An increment declares what changed, not the whole
state; the effective set is the fold across the product's increments.

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

- A preset is adopted **at most once at a time**, so the preset name is the identity. `adopts` on an
  already-adopted preset replaces the earlier version; no `supersedes` is needed.
- `drops` removes an adoption and takes no version.
- Adopting and dropping the same preset in one increment is an error.

Rules:

- A preset is adopted whole. There are no exceptions or partial adoptions.
- A preset does not adopt another preset.
- A conflict between an adopted requirement and a product-local one is an error. An agent raises it as an
  open question, and the increment cannot settle until it is addressed.
- A preset increment is immutable once published.
- Adopted requirements need coverage exactly as product-local ones do.

Drift is expected and not forced. Products may sit on old preset increments indefinitely; a report of how
far behind each adoption sits is useful, but nothing obliges an upgrade.

### Proving a claim is met

A product should be able to demonstrate, mechanically, that it meets what it claims. That is what makes
adopting a newer preset increment able to *fail*, what stops a decision quietly describing a product that
no longer exists, and what lets the owner ask how much of a product is actually checked rather than merely
asserted.

**Every claim carries its evidence.** A claim is a **requirement** or a **decision**. Requirements say
what the product must do; decisions say what path was taken. Both are assertions about the product, and
an assertion nothing checks can quietly become false. For decisions that is the more dangerous case:
they are the owner's window into the product, and a window that silently misreports is worse than none.

#### Requirements state how they would be known to be met

```yaml
- id: consumer-suite-typechecks
  statement: |
    a TypeScript consumer's test suite typechecks with the package installed.
  satisfied_when: |
    a consumer suite containing both pack imports and control-surface imports compiles with no
    error and no cast at the seam.
```

Required, with an honest escape — where a requirement genuinely cannot be checked mechanically, the field
says so and why. Two things earn it the schema cost. It describes an **observable condition rather than a
mechanism**, so it does not pre-decide the build. And a requirement whose author cannot write this
sentence is usually a badly stated requirement, which is better discovered while writing it than a year
later.

It is also what a conformance case would later be written *from*, so nothing is re-derived as coverage
strengthens.

#### The coverage manifest maps claims to evidence

```yaml
- claim: r:consumer-suite-typechecks
  covered_by:
    - kind: code-test
      ref: test/typecheck.spec.ts
    - kind: conformance-case
      ref: conformance/typecheck.txtar

- claim: d:control-surface-is-a-real-subpath
  covered_by:
    - kind: attestation
      note: the exports map declares ./control, and the build fails without it
```

`kind` + `ref` + an optional `note`, uniform across kinds. New kinds land without a schema change, and the
checker validates `ref` shape per kind from a lookup table rather than the schema knowing about each one.

| kind | what it is | survives a rebuild |
|---|---|---|
| `attestation` | an agent asserts it; no artifact | no |
| `code-test` | a test in the project's own suite | no — rebuilt with the implementation |
| `manual-check` | a human followed recorded steps | the steps do; the run does not |
| `conformance-case` | a durable case | yes |

#### The ladder

| rung | means |
|---|---|
| `attested` | at least an agent's claim that it is met |
| `checked` | something other than an attestation exists |
| `automated` | it runs without a human |
| `durable` | a conformance case — it survives a rebuild |

Increment 1 sets the bar at `attested` and reports the distribution. Later increments raise a rung or turn a
warning into an error. **The number worth watching is how many claims sit at `attestation`** — that is
the honest measure of how much of the product rests on an agent's word.

#### This is what makes a preset bump fail

Adopt `nodejs-library@4` and its new requirements arrive with no coverage entries, so the `attested` rung
reports them immediately.

#### Who writes what

**Clarify writes `satisfied_when`**, because turning a requirement into something checkable is design
work. **The build waves write coverage**, because that is when the evidence exists. A published
increment's manifest is frozen with it; the next increment produces a new one.

### Pinned decisions

`accepted` and `tolerated` record the owner's **attachment** — how much they care — assigned after
reading everything. A separate and independent question is whether a decision may be freely overturned.

Two fields carry it:

- **`pinned`** — a boolean. A pinned decision requires owner ratification to change. An unpinned one does
  not, whatever its status.
- **`pinnedReason`** — required when `pinned` is true, and not permitted when it is false. Free text
  describing why.

Pin a decision when:

- it fixes a **public API surface** something outside the build compiles against
- it fixes a **data format** written to disk or sent over a wire
- another **product depends on it**, so changing it reaches beyond this one
- a **consumer would notice** the behaviour changing, whatever the contract says
- it is expensive to reverse for some other reason worth writing down

The reasons may become an enumeration once the set is understood, with a free-text detail field alongside
— `pinnedReason: public-api` plus `pinnedDetail: exports the FooBar class, which consumers construct`.
Free text until then, because closing the set early would hide the reasons that have not appeared yet.

Pinning is what escalation reads. Nothing about `accepted` or `tolerated` obliges a builder to stop.

### Lifecycle — declare changes, fold for state

Requirements, decisions and preset adoptions all work the same way: **an increment declares what changed,
and the effective state is the fold across the product's increments.** Three separate mechanisms would be
three things to learn and a fourth waiting to be invented.

The owner reads the effective set, computed. The history is preserved and is not what anyone reads.

**A decision ends in one of two ways.**

- **Superseded** — a later increment makes a different choice on the same subject. The successor carries
  the reason, so nothing extra needs stating.
- **Obsoleted** — the thing it described no longer exists, and nothing supersedes it. This one needs a
  reason, because the reason is the only thing distinguishing a retirement from an oversight.

A fired falsifier is not a third way. It means the decision is no longer justified by what justified it,
so it opens a question; a retirement, if there is one, comes out of the revisit.

**Recording is required; asking is not.** Pinning governs permission — an unpinned decision may be
overturned by a build wave without escalating. It must still be recorded, because a decision silently out
of force makes the record lie, and the record is what the owner reads. The build report already requires
every overturned decision and why; **that list is where superseding entries come from**, rather than
ending as prose in a report.

**The coverage manifest names only active claims.** An increment's manifest must not reference a claim
that is not in force at that increment — retire a requirement and it leaves the manifest in the same
increment that retires it. That is what makes the manifest checkable rather than aspirational: every
entry points at something live, and coverage cannot linger for a claim nobody is making.

### Decisions cite what drove them

Facts are currently reachable only through spec prose. Delete the spec and they orphan, and worse, the
chain is lost — *this fact is why that decision*. Today both merely appear in the same paragraph.

- **`because:` on a decision** — the facts that drove it.
- **Falsifiers are already fact-shaped.** "This reverses if a CJS-only consumer appears" is a claim
  someone could measure. So a decision's falsifiers are *pending facts* and its `because` is *settled
  ones*, and the decision layer becomes the join in both directions.
- **`informed_by:` on a requirement** — explicitly not justification, since requirements are fiat and need
  none. A pointer so the checker can detect the fact-versus-requirement collision the repository already
  calls a stop-and-ask, and which nothing mechanically finds today.

### Minimise the public contract

**Every export is a constraint on the rebuild.** The public surface is precisely the set of things a
regenerated implementation must preserve, so its size is the inverse of the freedom that makes a rebuild
cheap. It is also the size of the surface a consumer can come to depend on whatever the contract says.

Rules a checker can enforce:

- **One entry point by default.** A second is a decision, not a default. Checkable: count the keys in the
  package's `exports` map.
- **No subpath wildcards.** A `"./*"` pattern surrenders the boundary — every internal path becomes a
  promise.
- **No `export *` from an entry point.** It is the most common way a surface grows without anyone
  deciding: adding a symbol to an internal module silently publishes it. Named re-exports only.
- **`internal/` is unreachable from outside**, enforced by `dependency-cruiser`.
- **The API report is committed**, so a surface change appears as a reviewable diff, and an increment
  that grows the export count says why.

**Type-only exports are cheaper** than value exports and worth counting separately: they constrain what a
consumer compiles against but carry no runtime behaviour for a rebuild to preserve.

This is about the *product's* boundary. Minimising the surface of internal modules is a different concern
with a different justification — it makes a build coherent, not a rebuild cheaper, because internal
structure is transient and a rebuild may reorganise it entirely. That belongs in the builder's
instructions.

### Collation replaces the spec's assembly job

If decisions are the owner's window, they have to read *as a set*. Thirty entries in file order do not add
up to a picture the way prose does — and assembling foundations into an ordered narrative is exactly what
the experiment measured as 55–60% of every spec. That job does not disappear when the spec does; it moves
to tooling. `bin/foundations.mjs` already collates requirements.

### Build forward

Tensions that are merely unwelcome become **requirement #1 for the next increment**, not a relitigation of
the current one. Amend in place only when something is **impossible, non-viable, or incorrect**.

"Incorrect" earns its place in that list. A guard that silently answers false, so a handler returns early
and its test passes green, breaks nothing visibly — and is the product not working. That cannot wait.

**Build forward is itself a decision, and its falsifier is "a consumer outside our control appears."** Its
enabling condition is that the owner controls every consumer, so breaking change is cheap. That will stop
being true, and the principle should expire visibly rather than becoming quietly wrong.

### Escalation carries evidence

A build-tier agent may escalate against a higher-tier decision when it has a **fact** that contradicts it,
not a preference. This is the repository's existing dispute rule applied vertically.

The symmetric instruction upward matters as much: a plan-tier agent **may not settle a detail a builder
will meet with better information.** That is what stops the plan tier from pre-deciding the arbitrary
names and shapes that generate churn.

### Phase tags, without a gate

A decision records which wave proposed it. Useful for comprehension, since it tells the owner how much
context the proposer had. It gates nothing.

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
   cross-design ask ceremony for same-product work. Keep the existing fact-sourced-to-upstream-requirement
   mechanism for genuinely cross-*product* dependencies.
2. **The coverage manifest** — claim to evidence, with `satisfied_when` on requirements. The checker
   enforces the configured rung, reports the distribution across rungs, and validates each `ref` against
   its kind. Set at `any` for the first increment and ratcheted deliberately.
3. **Requirement presets**, with `adopts` and `drops` on a product. The checker folds adoptions across a
   product's increments to get the effective set, and enforces that each adopted preset and increment
   exists, that the increment is published rather than draft, that a preset is not adopted and dropped in
   one increment, and that no two adopted presets declare conflicting requirement ids — reporting, without
   failing, how many increments behind each adoption sits.
4. **Increment as an artifact** — ask, foundation delta, decisions, transition.
5. **Move status from the design to the increment.**
6. **Stop generating `spec.md`.** Keep the Clarify phase; discard its document.

**Schema**

7. **`pinned` and `pinnedReason` on decisions**, governing what escalates.
8. **`because:` on decisions** — the facts that drove them.
9. **`informed_by:` on requirements** — for collision detection, not justification.
10. **Wave tag on decisions.**
11. **Interfaces as a first-class artifact** — extracted, pinned, diffable. Produced by the Stub wave,
   which already writes the public surface and its doc comments; what is missing is that it lands
   somewhere durable rather than only in the code.
12. **A published increment is immutable**, and lifecycle is expressed by pointing *forward*. Nothing in
    a shipped increment is edited afterwards, so a requirement cannot carry a range like
    `active_from: [start, end]` — that would mean editing an old artifact to close it. Instead a new entry
    names what it supersedes: `amends:` or `retires:`, referencing the earlier id.

    Two things to work out. **Retirement needs a concise form** — an entry whose only content is "this
    retires `baz`" is noise, since the statement restates the id. What the statement should carry beyond
    the retired id, and what a bare removal with no replacement looks like, both need settling.

    And **requirements and decisions are scoped to a product**, across all of its increments, so finding
    what supersedes a given entry never means searching the whole repository. That is what keeps
    retirement tractable at all.

    This also fixes a real defect: `doc-structure` cannot represent a retired `documented` fact whose
    in-repo source text has since changed, because the checker verifies quotes on retired facts and the
    span is gone by definition. If quotes resolve against the increment where the text lived, that is
    structurally solved rather than worked around.

**Tooling**

11. **Public-surface checks** — entry-point count, no export wildcards, no `export *` from an entry, the
    `internal/` boundary.
12. **Committed API report** per package, so a surface change is a reviewable diff.
13. **Decision collation** — the owner's readable view of a product.
14. **Publish gate** — no `proposed` decision outstanding.
15. **Escalation format** — what a wave sends up, and what comes back.

**Process**

16. **Harvest step at the increment boundary**, with the narrow promotion rule.
17. **Record build-forward as a decision** with its falsifier.
18. **Instruct the tiers asymmetrically** — smallest decisions at the bottom, no detail-settling at the
    top, escalation only with a fact.
19. **Where the owner's time goes.** Bounded manual work is acceptable where it is time-efficient, and the
    evidence says where to spend it. Of 30 interviewed practitioners, **16 said writing the specifications
    slowed their progress**, and the named failure mode was *"not knowing what properties to test"* — not
    tooling. So the owner's authoring effort goes into **deciding what must be true**, which is the one
    part no tool reduces.

**Deliberately not needed**

Cross-repository propagation — reusable workflows, template drift checking, bulk mutation, organisation
rulesets — exists to approximate what a monorepo gives for free. These projects are one pnpm/turbo
workspace, so a harness change is one commit. The convention that replaces all of it: **every project
exposes a `verify` task**, and the shared workflow needs no per-project knowledge.

---

## What will actually be different

| today | proposed |
|---|---|
| a spec is written, reviewed and maintained per design | no spec; Clarify produces decisions, facts and questions, and its document is discarded |
| requirements fence to a design, so two workstreams on one product file issues at each other | requirements fence to the product; same-product work shares foundations |
| a new global or `applies_to` requirement can make a settled design incomplete retroactively | products adopt requirement presets at a pinned increment; nothing binds a product until it says so |
| compliance means the spec cites the requirement | every requirement and decision carries coverage, graded by whether anything actually checks it |
| a design is settled or draft | an increment is; shipped increments stay shipped |
| changing a shipped product means rewriting its spec or inventing another slice | an increment carries the delta |
| decisions are the design phase's output, reviewed before building | decisions arrive from every wave and accumulate through the build |
| one review gate before the build | Plan is an iterative loop; Build escalates only what is hard to reverse |
| a decision the owner dislikes is rejected, and the work is redone | it is tolerated, and a requirement is filed for the next increment |
| facts are reachable only through spec prose | decisions cite what drove them directly |
| documentation happens if there is time | Document is a wave, validated against the implementation |
| a punt and a reservation are the same status | `delegated` and `tolerated` are separate, so what the owner ruled on can be told from what they passed over |

**What does not change:** the owner reads every requirement and every decision, in full. That is the
comprehension channel, and this is built to feed it rather than to trim it.

---

## Open

- **The gate positioning is not fully settled.** The Plan loop and the per-wave escalation are the current
  shape, but where a costly-to-reverse decision must stop the build, and how rare escalation actually
  turns out to be, are untested.
- **Whether Clarify's document is worth keeping at all**, or whether a collated decision view serves every
  reader it would have.
- **Concurrency.** Increments are linear per product; two open increments colliding on a foundation is an
  owner call, and no mechanism is proposed for it.
- **The requirement pyramid, tabled.** An apex requirement with more specific ones beneath it, where the
  apex is a universal claim the children instantiate. Deferred because no concrete example emerged.
- **Conformance**, deferred to its own increment: how behaviour is pinned so a rebuilt implementation can
  be verified against it, where those cases are authored, and who ratifies them.
- **Where the durable interfaces live, and what shape they take.** Distinct from the internal API stubs
  the Stub wave produces — see the open thread on that row.
- **Whether decisions need `satisfied_when` too**, or whether a falsifier plus coverage is enough. They are
  not the same event: a falsifier fires when the world changes, coverage fails when the code drifts.
- **A concise form for retirement.** An entry whose statement restates the id it retires is noise. This is
  one problem, not two — requirements and decisions both need it, and obsoletion needs a reason where
  supersession does not.
- **Whether "revisited and left standing" needs recording.** If a falsifier fires, a question opens, and
  the decision survives, nothing marks that it was examined — so the same falsifier re-fires and is
  re-litigated each increment. Recording it adds ceremony to a non-event; not recording it repeats work.
- **The term "falsifier"** reads as though the decision were false, which it is not — a decision was made,
  and what may later prove false is the assumption behind it. Nor does one firing mean the decision is
  reversed; it means the decision is no longer justified by what justified it, and should be revisited.
  The term is defined outside this document, so renaming it is a future scope item.

---

## Appendix — shapes

Illustrative fragments rather than a schema. Field names are provisional; what matters here is what each
artifact has to carry.

### An increment

```yaml
id: 004
product: minecraft-test-lib
status: published            # draft | published
ask:
  - r:fakes-carry-their-declared-class-prototype
  - r:consumer-suite-typechecks
```

### A requirement

```yaml
- id: consumer-suite-typechecks
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
- id: consumer-suite-typechecks-and-builds
  statement: |
    a TypeScript consumer's test suite typechecks and builds with the package installed.
  satisfied_when: |
    ...
  amends: consumer-suite-typechecks
```

### A retirement with no replacement

```yaml
retires:
  - id: consumer-suite-typechecks
    reason: the package no longer ships type declarations
```

> Shape unsettled — a concise form for retirement is an open item. What is shown here restates the id in
> prose, which is the noise the open item is about.

### A requirement preset, and adopting it

A preset is a product that defines requirements and builds nothing:

```yaml
# products.yaml
- id: nodejs-library
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
- id: control-surface-joins-the-package-root
  statement: |
    the control surface is exported from the package root rather than from a dedicated subpath.
  status: accepted           # accepted | tolerated | delegated | rejected
  pinned: true
  pinnedReason: |
    public-api — consumers import __useServer from the root specifier
  because:
    - f:alias-and-control-subpath-are-one-module-instance
  falsifiers:
    - a consumer needs the root specifier to carry only names the engine's declarations declare
```

An unpinned decision the owner had no context to rule on:

```yaml
- id: values-are-generated-and-committed
  statement: |
    generated values are produced at author time and committed, with a regenerate-and-clean-tree
    check, rather than generated during a consumer's install.
  status: delegated
  pinned: false
```

### A decision that supersedes another

```yaml
- id: control-surface-is-a-real-subpath
  statement: |
    the control surface is exported from ./control rather than from the package root.
  status: accepted
  pinned: true
  pinnedReason: public-api — the aliased specifier must carry only declared names
  supersedes: control-surface-joins-the-package-root
```

### A decision that is obsoleted

```yaml
obsoletes:
  - id: brandas-unions-and-rejects-unknown-classes
    reason: brandAs no longer exists; instanceof answers from the prototype chain
```

### The coverage manifest

Claims are requirements and decisions alike, and every entry must name a claim in force at this
increment:

```yaml
- claim: r:consumer-suite-typechecks
  covered_by:
    - kind: conformance-case
      ref: conformance/typecheck.txtar

- claim: d:control-surface-is-a-real-subpath
  covered_by:
    - kind: code-test
      ref: test/exports.spec.ts
    - kind: attestation
      note: the exports map declares ./control, and the build fails without it
```
