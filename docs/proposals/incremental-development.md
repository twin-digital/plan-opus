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

Escalation says *what* must reach the owner; where a build pauses — after every wave, at completion, or
only when an escalation fires — is orchestration configuration rather than process definition. Agent
guidance carries the flavours of orchestration instruction, and a product runs under the one that fits
its risk.

### Publish gate

Nothing merges or publishes while a `proposed` decision is outstanding — the same mechanic the repository
already uses for the settle gate, pointed at a new target.

---

## Mechanisms it relies on

### Requirement presets

A **requirement preset** is a product that defines requirements and builds nothing — `nodejs-library`,
`minecraft-addon`, `published-to-npm`. It has increments like any other product, and its increments are
**Plan-only**: Ask → Clarify → Ratify, with no Build.

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

- **`pinned`** — a boolean. A pinned decision requires owner ratification to change. An unpinned one does
  not, whatever its status.
- **`pinnedReason`** — free text, required when `pinned` is true and not permitted when it is false.

Pin a decision when it fixes a **public API surface**, fixes a **data format** written to disk or sent
over a wire, is something **another product depends on**, or changes behaviour a **consumer would
notice**.

The agent proposing a decision proposes whether it is pinned; the owner rules on that along with the rest
of it.

Pinning is what escalation reads. No status on its own obliges a builder to stop.

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
overturned by a build wave without escalating. It must still be recorded, because a decision silently out
of force makes the record lie, and the record is what the owner reads. The build report already requires
every overturned decision and why; **that list is where superseding entries come from**, rather than
ending as prose in a report.

**Concurrent increments collide on the number, and that is the whole provision.** Two in flight both
claiming `003` conflict on merge; the loser renames and recomputes the fold against the base that moved,
and the collation and validation tooling reports whatever the recomputed fold breaks. The process adds
nothing further for this case.

### Proving a claim is met

A product should be able to demonstrate, mechanically, that it meets what it claims — so that a decision
cannot quietly describe a product that no longer exists, and so the owner can ask how much of a product is
actually checked rather than merely asserted.

**Every claim carries its evidence.** A claim is a **requirement** or a **decision**. Requirements say
what the product must do; decisions say what path was taken. Both are assertions about the product, and an
assertion nothing checks can quietly become false.

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
says so and why. It describes an **observable condition rather than a mechanism**, so it does not
pre-decide the build; and a requirement whose author cannot write this sentence is usually a badly stated
requirement, which is better discovered while writing it than a year later.

**Decisions do not carry `satisfied_when`, and the asymmetry is principled.** A requirement states an
*end* — what must be true — so how you would know is a genuinely separate question. A decision states a
*means* — what was done — and its `satisfied_when` would be a restatement: *we chose X*, known to be met
when *X is what is there*. The coverage entry already answers it. Requiring the field would populate it
with tautologies.

#### The coverage manifest maps claims to evidence

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

`kind` + `ref` + an optional `note`, uniform across kinds, so new kinds land without a schema change.
`ref` is one path or a list — an implementation that spans files names them all. It names what carries
the claim, not everything the code path touches: the generic error type and the logging library are
reachable from almost every claim and evidence for none. Picking that set is agent-guidance material.

| kind | what it is | what still rests on the builder's word |
|---|---|---|
| `attestation` | an agent asserts it; no artifact | everything |
| `code-test` | a test in the project's own suite, written by the builder | that the test measures the claim |
| `manual-check` | recorded steps a human follows and re-runs | that the steps measure the claim |
| `conformance-case` | a case the owner wrote or vetted, tied to the claim it checks — automated or manual | nothing |

What makes a conformance case conformance is its **provenance and its coupling**: the owner authored or
carefully reviewed the check, and it is tied to the requirement it demonstrates rather than to a decision
an agent made downstream. Automation is not the distinction — the planned tooling carries manual cases as
one supported kind of conformance case. A check with no recorded steps is not a `manual-check` and does
not enter the manifest at all; an unrepeatable check is an attestation with extra effort.

**A manifest names only claims in force at that increment.** Retire a requirement and it is simply omitted
from that increment's manifest. It is also an error to name a claim that is still `proposed` — coverage is
evidence about something the owner has ruled on, not about a suggestion.

#### The ladder

Each rung is stronger evidence than the one below it, and a claim sits at the highest rung anything in
its `covered_by` provides:

| rung | means |
|---|---|
| `attested` | only an agent's word that it is met |
| `checked` | a recorded check exists — a builder's test, or steps a human re-runs |
| `conformance` | the check is owner-vetted and tied to the claim |

Why a builder's test outranks the same builder's word, when one agent wrote both: an attestation is
believed whole — the agent observed, concluded, and reported, and none of that can be re-examined. A test
moves the verdict into the product: it executes and can fail, now and on every later run. What still
rests on the builder is only that the test measures the claim — a smaller thing to trust, and an
auditable one, since a reviewer can read a test where there is nothing to read behind an attestation.
`conformance` retires that residue too, by moving authorship or vetting of the check to the owner.

Automation is a property of a check, not a rung. A manual conformance case outranks an automated builder
test, because strength comes from provenance and coupling; whether a check runs without a human prices
re-running it, and is worth reporting on that ground alone.

The first increment sets the bar at `attested` and reports the distribution. Later increments raise a rung
or turn a warning into an error. **The number worth watching is how many claims sit at `attested`** —
that is the honest measure of how much of the product rests on an agent's word.

Requirements adopted from a preset are coverage-tracked exactly like product-local ones. Nothing about
their origin changes what has to be shown.

#### Who writes coverage, and when

| point | contributes |
|---|---|
| a requirement is authored — by the owner or an agent, in any phase | `satisfied_when`, which is not a coverage entry but the condition one will later demonstrate |
| **Define** | the claim list, and which kind of evidence each claim is expected to get |
| **Stub** | `code-test` and `conformance-case` entries, as those artifacts come into existence |
| **Implement** | an `attestation` for every claim it built against — always, from the implementing agent, alongside whatever better evidence exists — and the entries written earlier now pass |
| **Document** | `manual-check` entries, where a claim is verified by following documented steps |

### Facts record what research found

Spikes, probes, experiments and measurements produce findings about the world — how a dependency actually
behaves, what a runner does with a given config, what a measurement showed. Those findings are worth
keeping past the increment that produced them, because the next increment would otherwise re-derive them,
and because a decision built on a finding should be traceable to it.

- **`because:` on a decision** — the facts that drove it, where facts drove it. Optional: a fact is
  deliberately non-trivial to record — a citation of the upstream source for a documented one, captured
  output and a re-runnable record for a self-tested one — and requiring one per decision would manufacture
  facts rather than find them. Where no fact is cited, the decision's own statement carries the reasoning.
- **`informed_by:` on a requirement** — a pointer, explicitly not justification, since requirements are
  fiat and need none. It exists so that a fact contradicting a requirement can be found rather than
  noticed.

### Collation replaces a written spec document

If decisions are the owner's window, they have to read *as a set*. Thirty entries in file order do not add
up to a picture the way prose does, and that assembly is most of what a spec was doing.

That job does not disappear when the spec does; it moves to tooling. A collated view of a product shows,
for one product at one increment:

- the effective requirement set, product-local and adopted, with each adoption's preset and version
- the effective decision set, with status and pinning
- for each claim, its coverage rung and what provides it
- open questions blocking the increment from settling
- what this increment changed against the last — added, retired, superseded

None of that is authored. All of it is a fold over artifacts that already exist, which is why it can be
correct by construction where a spec could only be correct by diligence.

### Build forward

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
3. **The coverage manifest** — claim to evidence.
4. **Increment as an artifact** — ask, foundation delta, decisions.
5. **Move status from the design to the increment.**
6. **Stop generating `spec.md`.** Keep the Clarify phase; discard its document.

**Schema**

7. **`pinned` and `pinnedReason` on decisions**, governing what escalates.
8. **`satisfied_when` on requirements**, required.
9. **`because:` on decisions** and **`informed_by:` on requirements**.
10. **Interfaces as a first-class artifact** — produced by the Stub wave, landing somewhere durable rather
    than only in the code.
11. **A published increment is immutable**, and lifecycle points *forward* — a new entry names what it
    supersedes or retires, rather than an old entry being edited to close it. Requirements and decisions
    are scoped to a product across all its increments, so finding what supersedes an entry never means
    searching the repository.

**Tooling**

12. **Collation** — the folded, computed view of a product.
13. **Publish gate** — no `proposed` decision outstanding.
14. **Escalation format** — what a wave sends up, and what comes back.

**Process**

15. **Promotion of a decision to a requirement**, when it has become something consumers can reasonably be
    expected to rely on and preserving its effect is a matter of compatibility. Not every accepted
    decision — requirements say what the product must do to be accepted; decisions describe the path taken.
16. **The retirement form** — top-level `retires:` blocks in each increment's sources, one id and a
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
| decisions are the design phase's output, reviewed before building | decisions arrive from every wave and accumulate through the build |
| compliance means the spec cites the requirement | every requirement and decision carries coverage, graded by whether anything actually checks it |
| a punt and a reservation are the same status | `delegated` and `tolerated` are separate, so what the owner ruled on can be told from what they passed over |
| a decision the owner dislikes is rejected, and the work is redone | it is tolerated, and a requirement is filed for a future increment |
| documentation happens if there is time | Document is a wave, validated against the implementation |

**What does not change:** the owner reads every requirement and every decision, in full. That is the
comprehension channel, and this is built to feed it rather than to trim it.

---

## Open

- **Where the durable interfaces live, and what shape they take.** Distinct from the internal API stubs the
  Stub wave produces. Whether the durable one is *extracted* from the code or *authored* against it decides
  where it lives and when it is created — an extracted report cannot be wrong because it is a projection;
  an authored declaration can be, which is what would make it useful.

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

### A decision retired with no successor

```yaml
retires:
  - id: brandas-unions-and-rejects-unknown-classes
    reason: brandAs no longer exists; instanceof answers from the prototype chain
```

### The coverage manifest

Claims are requirements and decisions alike, and every entry must name a claim in force at this
increment. `ref` is one path or a list:

```yaml
- claim: r:consumer-suite-typechecks
  covered_by:
    - kind: conformance-case
      ref: conformance/typecheck.txtar

- claim: d:control-surface-is-a-real-subpath
  covered_by:
    - kind: code-test
      ref:
        - test/exports.spec.ts
        - test/control.spec.ts
    - kind: attestation
      note: the exports map declares ./control, and the build fails without it
```
