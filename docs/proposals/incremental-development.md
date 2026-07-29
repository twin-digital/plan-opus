# Incremental development — a proposal

Status: **proposal**. Nothing here is settled. Written 2026-07-29 from a working session on
`minecraft/server-shim`, with `docs/experiments/spec-value/` as its evidence base.

---

## Why

Five forces, each with evidence from the session that produced this.

**Churn costs more than it produces.** The `minecraft/server-shim` cycle generated 44 decisions, 13 of
them rejected. Almost all of the rejections came from re-deciding three subjects — packaging, the
`instanceof` mechanism, and the install shape — each of which was settled, built on, and then reversed.
Thirteen entries consumed owner review and yielded nothing.

**Design boundaries were drawn in the wrong place.** `minecraft/test-lib` and `minecraft/server-shim`
were always one product; the session discovered that at the end, after the packaging question had been
re-decided four times. The split was not a bad choice — it was forced, because *design* is the unit
that owns requirements, so two workstreams on one product must be two designs and must then talk
through issues. Four cross-design issues were filed. The owner eventually said "this session is taking
control of both halves to ease communication burden," which is the process being routed around.

**Settled work is brittle.** `test-lib` was settled and built. One decision changed and the whole
design returned to draft, though shipped v1 was still shipped and still correct. Nothing distinguishes
"this product is unsettled" from "the next change to it is unsettled."

**There is no artifact for a change.** A spec describes a state. So changing a shipped product means
either rewriting its spec or inventing a new design — which is how one product came to have two.

**The spec is not read, and it is mostly not needed.** Across four designs, an independent agent built
a plan from foundations alone, then read the spec and recorded what changed. Consistently: **55–60% of
each spec restates the foundations** in narrative order, **25–40% is argument that changes nothing a
builder does**, and only **3–6 items per design** would have made a builder ship something wrong. Those
items relocate into roughly five foundation entries per design. The owner already only skims the spec.

Against those, one countervailing force that shapes everything below:

**The decision layer is the owner's only window.** The owner reads every requirement and every
decision in full, skims the spec, glances at the test plan, and does not read code. Remove the spec and
the decision set becomes the sole description of what was built. So decisions must not be minimised —
they must be *rich enough to comprehend a product from*. What must shrink is churn, not signal.

---

## The shape

**Durable artifacts** — these persist and accumulate:

| artifact | what it holds |
|---|---|
| requirements | owner fiat: what must be accomplished |
| decisions | every choice a consumer, builder, or sibling could tell apart, with falsifiers |
| facts | evidence about the world, with artifacts and re-runnable runs |
| interfaces | the shapes something outside the build compiles against |
| conformance enumeration | what must be true, as a checkable list |

**Transient artifacts** — generated, used, discarded:

| artifact | why it is transient |
|---|---|
| spec | 85%+ restatement and argument; its value is the decisions it forces out |
| test plan | same |
| test code | generated from the conformance enumeration |
| implementation | regenerable from foundations + interfaces + conformance |

The asymmetry is deliberate. The durable set is what the owner reviews and what tooling can diff. The
transient set is where work happens.

**The unit of change is an increment**, scoped to a **product** rather than a design. An increment
owns its agenda, the foundation changes it makes, the decisions it produces, and the transition a
builder follows. Status attaches to the increment, so drafting increment N+1 never unsettles the
shipped increment N.

---

## The steps

**1. Agenda.** An increment opens with the top of the deferred queue plus whatever new requirements the
owner has. Both are ranked. Nothing else is in scope.

**2. Clearinghouse.** Replaces spec generation. Its job is not to describe the product but to *force
decisions out* — to find the places the foundations do not settle, pressure-test them, and measure what
can be measured cheaply. Its outputs are **decisions, facts, and open questions**, not a document. It
is done when every tension is resolved into a decision, recorded as an open question, or measured into a
fact.

Research belongs here explicitly. In the session that produced this proposal, nine probes ran; seven
changed the design and three overturned the orchestrator's own reasoning. That was not a phase of the
process — it happened because the owner kept asking. It should be a named output.

**3. Owner review.** Every proposed decision, read in full. Each becomes:

- **accepted** — "this matters to me," or "I'd have done it this way"
- **tolerated** — reserved acceptance, or a deliberate punt
- **rejected** — reserved for *impossible, non-viable, or incorrect*

Distaste is not rejection. A decision the owner dislikes but can live with is **tolerated, plus a
requirement filed for the next increment's agenda.** See *Build forward*.

**4. Interfaces pinned.** Anything something outside the build compiles against — published shapes,
error codes, data formats — is marked costly-to-reverse before anything is written against it.

**5. Build.** The builder consumes foundations, interfaces, and the conformance enumeration. It makes
build-time decisions, and it is instructed to make the *smallest* decisions that complete the work.
It may depart from a cheap-to-reverse decision with cause — a compile error, a measurement, a
contradiction — but not from a costly-to-reverse one.

**6. Build report.** Filtered the same way decisions are: report what a consumer, a sibling, or the
owner could tell apart. Plus, mandatorily, **every decision overturned and why** — that list is where
the designer and the builder disagreed, and it is the part that earns attention.

**7. Publish gate.** Nothing merges or publishes while a `proposed` decision is outstanding. This is
the only gate, and it is the same mechanic the repository already uses for the settle gate, pointed at
a new target.

**8. Harvest.** At the increment boundary:

- decisions accepted because *"this is a pseudo-requirement I hadn't articulated"* are **promoted to
  requirements** — read once, binding thereafter, and no longer re-proposed by the next increment
- deferred tensions become the next increment's ranked agenda
- superseded requirements are retired against replacements

---

## Mechanisms it relies on

### Two axes on a decision

The current `accepted` / `tolerated` split records **attachment** — how much the owner cares. That is
the right thing for it to record, and it is assigned after reading everything, not before.

But `accepted` currently carries a second, independent fact: **reversal cost.** "Once we make this
decision we can't change it easily" is not a statement about attachment, and the two vary
independently:

| | cheap to reverse | costly to reverse |
|---|---|---|
| owner attached | "how I'd do it" | public API the owner cares about |
| owner indifferent | tolerated / punt | *no home today* |

That empty cell is a live failure mode. A published error-code union the owner has no opinion about gets
marked `tolerated` — honestly, as a punt — and a builder then treats `tolerated` as safe to override and
changes a shape consumers compile against.

The fix is **a field, not a status**: a designer-set reversal cost. Build-time authority reads off the
field; owner attachment stays on the status. And the permission that makes this work has to be written
down — nothing today tells a builder they may depart from a `tolerated` decision.

### Decisions carry their evidence

Facts are currently reachable only through spec prose. Delete the spec and they orphan, and worse, the
chain is lost — *this fact is why that decision*. Today both merely appear in the same paragraph.

- **`because:` on a decision** — the facts that drove it.
- **Falsifiers are already fact-shaped.** "This reverses if a CJS-only consumer appears" is a claim
  someone could measure. So a decision's falsifiers are *pending facts* and its `because` is *settled
  facts*, and the decision layer becomes the join between evidence and build in both directions.
- **`informed_by:` on a requirement** — explicitly not justification, since requirements are fiat and
  need none. A pointer so the checker can detect the fact-versus-requirement collision the repository
  already calls a stop-and-ask, and which nothing mechanically finds today.

### Something has to not regenerate

Tests cannot be both the throwaway and the check. The artifact that survives is the **enumeration of
what must be true** — and one already exists: `minecraft/test-lib`'s 65-row coverage table, which the
experiment found to be one of only two things genuinely inexpressible as foundations.

That resolves the experiment's loose end. Of the two inexpressible artifacts:

- the **coverage table is durable** — it is the check specification, and test code is generated from it
- the **components block is transient** — it describes how to build, not what is true, and dies with
  the spec

### Collation replaces the spec's assembly job

If decisions are the owner's window, they have to read *as a set*. Thirty entries in file order do not
add up to a picture the way prose does — and assembling foundations into an ordered narrative is exactly
what the experiment measured as 55–60% of every spec. That job does not disappear when the spec does; it
moves to tooling. `bin/foundations.mjs` already collates requirements.

### Build forward

Tensions that are merely unwelcome become **requirement #1 for the next increment**, not a
relitigation of the current one. Amend in place only when something is **impossible, non-viable, or
incorrect**.

"Incorrect" earns its place in that list: the session's `instanceof`-answers-false case broke nothing
visibly — a handler returned early, the test passed green. That is the product not working, and it
cannot wait.

The deferred queue must be **ranked, visible, and closable**. A tension carried across several
increments without action is evidence nobody cared, which is information.

**Build forward is itself a decision, and its falsifier is "a consumer outside our control appears."**
Its enabling condition is that the owner controls every consumer, so breaking change is cheap. That will
stop being true, and the principle should expire visibly rather than becoming quietly wrong.

### Escalation carries evidence

A build-tier agent may escalate against a higher-tier decision when it has a **fact** that contradicts
it — not a preference. This is the repository's existing dispute rule applied vertically. The session
supports it: every one of the seven design-changing probes carried a measurement rather than an
argument.

The symmetric instruction upward matters as much: a design-tier agent **may not settle a detail a
builder will meet with better information.** That is what stops the design tier from pre-deciding the
arbitrary names that generate churn.

### Phase tags, without a gate

A decision records which tier proposed it — design, test, build. Useful for comprehension, since it tells
the owner how much context the proposer had. It gates nothing. The only gate is the publish gate.

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
| version bump computed from commitments + components + dependency ranges, never from prose | exists (`how-to-plan/spec-bundles`) |
| amend-versus-regenerate as distinct operations | exists |
| adversarial review pipeline — panel, triage, capstone | exists |

The repository already votes for the central claim of this proposal: its own versioning design computes
bumps from structured data and never reads the narrative.

## What needs building or changing

**Structural**

1. **Fence requirements to the product, not the design.** The single highest-value change; it removes
   the cross-design ask ceremony for same-product work. Keep the existing fact-sourced-to-upstream-
   requirement mechanism for genuinely cross-*product* dependencies.
2. **Increment as an artifact** — agenda, foundation delta, decisions, transition.
3. **Move status from the design to the increment.**
4. **Stop generating `spec.md`.** Keep the clearinghouse phase; discard its document.

**Schema**

5. **Reversal-cost field on decisions**, designer-set, governing build-time authority.
6. **`because:` on decisions** — the facts that drove them.
7. **`informed_by:` on requirements** — for collision detection, not justification.
8. **Phase tag on decisions.**
9. **Interfaces as a first-class artifact** — extracted, pinned, diffable.
10. **Conformance enumeration as a first-class artifact** — the coverage table, promoted out of the
    spec.
11. **Requirement lifecycle fields** — `introduced_in`, `retired_in`, naming increments. This also
    fixes a real defect: `doc-structure` cannot represent a retired `documented` fact whose in-repo
    source text has since changed, because the checker verifies quotes on retired facts and the span is
    gone by definition. If quotes resolve against the increment where the text lived, that is
    structurally solved instead of worked around.

**Tooling**

12. **Decision collation** — the owner's readable view of a product.
13. **Publish gate** — no `proposed` decision outstanding.
14. **Deferred-tension queue** — ranked, visible, closable.
15. **Build report format** — the standard filter, plus a mandatory list of overturned decisions.

**Process**

16. **Harvest step at the increment boundary** — promote pseudo-requirements to requirements.
17. **Record build-forward as a decision** with its falsifier.
18. **Instruct the tiers asymmetrically** — smallest decisions at the bottom, no detail-settling at the
    top, escalation only with evidence.

---

## What will actually be different

| today | proposed |
|---|---|
| a spec is written, reviewed and maintained per design | no spec; the clearinghouse produces decisions, facts and questions and its document is discarded |
| requirements fence to a design, so two workstreams on one product file issues at each other | requirements fence to the product; same-product work shares foundations |
| a design is settled or draft | an increment is; shipped increments stay shipped |
| changing a shipped product means rewriting its spec or inventing a new design | an increment carries the delta |
| decisions are the design phase's output, reviewed before building | decisions arrive from every tier and accumulate through the build |
| the review gate sits before the build — the cheap, reversible step | the gate sits before publish — the expensive, irreversible one |
| a decision the owner dislikes is rejected, and the work is redone | it is tolerated, and a requirement is filed for the next increment |
| facts are reachable only through spec prose | decisions carry their evidence directly |
| interfaces and the conformance table live inside a skimmed document | both are first-class, diffable, and mechanically reviewed |
| tests and code are the durable output | the conformance enumeration is durable; tests and code are regenerable |

**What does not change:** the owner reads every requirement and every decision, in full. That is the
comprehension channel and the proposal is built to feed it, not to trim it.

---

## Open

- **Where a data format falls.** It is an interface, so it wants pinning before anything compiles
  against it — but the session's format questions were the ones the build most often overturned.
- **Whether the clearinghouse's document is worth keeping at all**, or whether a collated decision view
  serves every reader it would have.
- **Concurrency.** Increments are linear per product; two open increments colliding on a foundation is
  an owner call, and no mechanism is proposed for it.
