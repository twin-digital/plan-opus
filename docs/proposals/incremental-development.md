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
- **tolerated** — reserved acceptance, or a deliberate punt
- **rejected** — reserved for *impossible, non-viable, or incorrect*

Distaste is not rejection. A decision the owner dislikes but can live with is **tolerated**, and may
stand indefinitely — nothing obliges a later increment to revisit it. If the owner does want it changed,
that becomes a requirement in some future ask, but as a deliberate choice rather than an automatic
consequence. See *Build forward*.

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
- propose a change to an **accepted** decision
- propose a change to a **tolerated** decision that was flagged costly to reverse
- propose a **new** decision that is costly to reverse

Otherwise the build proceeds. Agents have wide latitude to decide and implement — including overturning
tolerated, cheap-to-reverse decisions and introducing new cheap-to-reverse ones — provided nothing
contradicts a ratified decision or requirement.

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

### Two axes on a decision

The current `accepted` / `tolerated` split records **attachment** — how much the owner cares. That is the
right thing for it to record, and it is assigned after reading everything, not before.

But `accepted` currently carries a second, independent fact: **reversal cost.** "Once we make this
decision we can't change it easily" is not a statement about attachment, and the two vary independently:

| | cheap to reverse | costly to reverse |
|---|---|---|
| owner attached | "how I'd do it" | public API the owner cares about |
| owner indifferent | tolerated / punt | *no home today* |

That empty cell is a live failure mode. A published error-code union the owner has no opinion about gets
marked `tolerated` — honestly, as a punt — and a builder then treats `tolerated` as safe to override and
changes a shape consumers compile against.

The fix is **a field, not a status**: a designer-set reversal cost. Escalation reads off the field; owner
attachment stays on the status. And the permission that makes this work has to be written down — nothing
today tells a builder they may depart from a `tolerated` decision.

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
2. **Increment as an artifact** — ask, foundation delta, decisions, transition.
3. **Move status from the design to the increment.**
4. **Stop generating `spec.md`.** Keep the Clarify phase; discard its document.

**Schema**

5. **Reversal-cost field on decisions**, designer-set, governing what escalates.
6. **`because:` on decisions** — the facts that drove them.
7. **`informed_by:` on requirements** — for collision detection, not justification.
8. **Wave tag on decisions.**
9. **Interfaces as a first-class artifact** — extracted, pinned, diffable. Produced by the Stub wave,
   which already writes the public surface and its doc comments; what is missing is that it lands
   somewhere durable rather than only in the code.
10. **A published increment is immutable**, and lifecycle is expressed by pointing *forward*. Nothing in
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
| a design is settled or draft | an increment is; shipped increments stay shipped |
| changing a shipped product means rewriting its spec or inventing another slice | an increment carries the delta |
| decisions are the design phase's output, reviewed before building | decisions arrive from every wave and accumulate through the build |
| one review gate before the build | Plan is an iterative loop; Build escalates only what is hard to reverse |
| a decision the owner dislikes is rejected, and the work is redone | it is tolerated, and a requirement is filed for the next increment |
| facts are reachable only through spec prose | decisions cite what drove them directly |
| documentation happens if there is time | Document is a wave, validated against the implementation |

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
- **Reconciling product-scoped foundations with `area` and `global` requirements**, and with `applies_to`.
  Scoping requirements to a product is what makes retirement tractable; wider-scope requirements binding
  many products cut against it. The two need to be squared.
- **The term "falsifier"** reads as though the decision were false, which it is not — a decision was made,
  and what may later prove false is the assumption behind it. Nor does one firing mean the decision is
  reversed; it means the decision is no longer justified by what justified it, and should be revisited.
  The term is defined outside this document, so renaming it is a future scope item.
