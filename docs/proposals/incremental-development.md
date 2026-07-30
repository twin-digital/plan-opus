# Incremental development — a proposal

Status: **proposal**. Nothing here is settled. Written 2026-07-29 from a working session on
`minecraft/server-shim`; revised 2026-07-30 to add conformance. Evidence base:
`docs/experiments/spec-value/` and `docs/research/conformance/`.

**The setting.** ~34 packages in one pnpm/turbo monorepo, growing 3–5 per month, most of them 1,000–5,000
lines, one maintainer, code largely written by agents. Recurring project kinds: libraries, CLI tools, web
apps and HTTP APIs, Minecraft behaviour-pack addons, CI/CD processes, devcontainer tooling, bots. Bounded
manual work is acceptable where it uses the owner's time efficiently. That scale matters — several
recommendations below would be different for a handful of projects or for hundreds.

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
| conformance manifest and its cases | what must be true, as an executable list |
| metamorphic invariants | relations that hold whatever the implementation |

**Transient artifacts** — generated, used, discarded:

| artifact | why it is transient |
|---|---|
| spec | 85%+ restatement and argument; its value is the decisions it forces out |
| test plan | same |
| implementation | regenerable from foundations, interfaces and the conformance manifest |

The asymmetry is deliberate. The durable set is what the owner reviews and what tooling can diff. The
transient set is where work happens.

**Invariants are durable in a way enumerated cases are not.** A case pins a point and its failure needs
adjudicating — was that change intended? A metamorphic relation (idempotence, round-trip,
order-invariance, "removing the plugin puts the suite back to a resolution failure") holds whatever the
implementation, needs no expected value to maintain, and **fails unambiguously.** The enumeration alone
is not the durable set; enumeration plus invariants is.

**The previous build is available by construction.** A released version is a git tag, and a rebuild does
not delete the repository — `git worktree add .worktrees/ref v1.4.2` and build it there. So nothing in
this process needs to require keeping a reference. What it does need is the *adjudication step* (step 6),
and the knowledge that the old build is there to consult when a case fails or when something the corpus
never pinned looks lost.

**The unit of change is an increment**, scoped to a **product** rather than a design. An increment
owns its agenda, the foundation changes it makes, the decisions it produces, and the transition a
builder follows. Status attaches to the increment, so drafting increment N+1 never unsettles the
shipped increment N.

---

## The steps

**0. Eligibility.** One intake question, asked once per product: **does it have a data-shaped I/O
boundary** — a function over serialisable data? Where it does, the conformance cases are durable and the
code around them genuinely is disposable. Where it does not — a stateful library needing operation
sequences, a service whose semantics live behind its wire contract, a plugin whose behaviour is a
conversation with its host — "disposable" costs a model rewrite every cycle and the economics stop
working. That is not a reason to skip the process; it is a reason to know which projects get cheap
rebuilds and which do not.

Deliberately *not* an intake question: "will this be rebuilt?" Whether a rebuild happens depends on a
future requirement delta nobody can predict, so assume it will.

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

**4. Build, in waves.** The builder consumes foundations and makes build-time decisions, instructed to
make the *smallest* decisions that complete the work. It may depart from a cheap-to-reverse decision
with cause — a compile error, a measurement, a contradiction — but not from a costly-to-reverse one.

The existing `prompts/build/build-from-spec.md` already orders its waves by reversal cost, and that
ordering is what makes the durable artifacts fall out in the right sequence:

- **Wave 1 — interface and conformance cases.** The public surface, its doc comments, and every
  conformance case, written before any implementation. **Both durable artifacts are produced here**,
  and so is the work breakdown the components block used to carry — the builder derives it, which is
  where the context for it actually is.
- **Wave 2 — cases run red.** Against the stubbed interface. Internal; its gate asks whether the cases
  encode the contract.
- **Wave 3 — implementation.** Internal; its gate is an adversarial correctness pass.

**Cases are authored in wave 1, before the implementation exists, and this is a rule rather than a
sequencing detail.** A case written from the requirements and then verified is a *specification*; the same
bytes captured from a passing run are a *characterization test*. Where the agent writing the code also
writes the expectations, a captured expectation proves only self-consistency. Expected *values* may be
filled in mechanically afterwards (see the conformance section); the commands and the assertions may not.

**5. The interface gate.** At the end of wave 1, the interface's costly-to-reverse decisions go to the
owner. This is the one place the build pauses for a human, and it is placed where reversal cost spikes
rather than before any work has started — you cannot pin a surface before it exists.

The interface does not arrive for direct review; it arrives **as decisions that reference it.** A
decision reads "the problem code union is pinned as of this interface — 18 codes, five renamed since
the last increment," and points at the artifact. The owner reads the decision; the table lives where
tooling can diff it. This is what keeps a table-shaped interface from having to masquerade as a
decision statement.

Waves 2 and 3 surface nothing to the owner directly. Their decisions are cheap to reverse by
construction and reach the owner once, in the build report.

**6. Adjudication.** Run the conformance corpus. Every failure is either **intended** — record a decision
and update the case — or **unintended**, which is a bug in the rebuild. Nothing automates that judgement;
no tool in the surveyed literature classifies a diff as intentional or accidental, and per-rebuild review
cost does not amortise. What tooling can do is *reduce the number of diffs a human reads*, which is what
the normaliser and the noise probe (below) are for.

Every intended divergence is really **two** entries: the behavioural decision, and the specification gap
that let the rebuild diverge there at all. Independent implementations of one specification fail together
precisely where the specification is ambiguous — measured at 3.7× the independence prediction with coding
agents — so a divergence is evidence about the requirements, not only about the code.

**7. Build report.** Filtered the same way decisions are: report what a consumer, a sibling, or the
owner could tell apart. Plus, mandatorily, **every decision overturned and why** — that list is where
the designer and the builder disagreed, and it is the part that earns attention.

**8. Publish gate.** Nothing merges or publishes while a `proposed` decision is outstanding — the same
mechanic the repository already uses for the settle gate, pointed at a new target.

That makes **two** gates in an increment, not one: the interface gate at the end of wave 1, and this.
Both sit later than today's gate, which precedes the build entirely, and both sit where reversal is
expensive — at the surface others compile against, and at publication.

**9. Harvest.** At the increment boundary:

- decisions accepted because *"this is a pseudo-requirement I hadn't articulated"* are **promoted to
  requirements** — read once, binding thereafter, and no longer re-proposed by the next increment
- deferred tensions become the next increment's ranked agenda
- superseded requirements are retired against replacements

---

## Mechanisms it relies on

### Two axes on a decision

The reversal-cost axis is not new to this repository — `prompts/build/build-from-spec.md` already
orders its waves by it: "the interface is the expensive thing to get wrong, the implementation the cheap
thing to redo." What follows applies the same axis to decisions, where nothing records it yet.

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

- the **coverage table is durable** — it is the check specification, and the cases derive from it
- the **components block is transient** — it describes how to build, not what is true, and dies with
  the spec

### The conformance manifest

**Every conformance item is a command that must exit zero.** That is the Kubernetes conformance model —
the artifact of a claim is a reproduction recipe plus machine-readable output — and it is what makes one
runner serve every project kind. But exit-zero *alone* costs the properties that motivated all of this:
cases stop being data, the promise ledger becomes unreadable because intent moves into scripts nobody
reads, and control flow returns along with the defect class declarative cases eliminate.

So: **the manifest is data even when the check is a command.**

```yaml
- requirement: unmodified-pack-code-loads-under-test
  kind: declarative/testscript
  check: testdata/loads-unmodified.txtar

- requirement: api-rejects-malformed-payload
  kind: declarative/hurl
  check: acceptance/reject-malformed.hurl

- requirement: bundle-stays-under-budget
  kind: opaque
  check: node tooling/check-bundle-size.mjs
  decision: bundle-budget-is-checked-opaquely

- requirement: install-is-one-config-entry
  kind: manual
  steps: docs/acceptance/install.md
```

Four rules make it hold:

**`kind` names the tool, and the runner dispatches on it.** Adding a tool means adding a `kind` — a
visible change to shared tooling — rather than someone quietly introducing a script. This is the JSON-LD
manifest pattern, which dispatches on a case's declared type.

**`declarative/*` is the default. `opaque` and `manual` are proposed decisions.** A `why` field alone
constrains nothing: an agent asked to justify an opaque check writes a plausible justification. But the
owner reads every proposed decision in full, so an opaque entry that *is* a decision gets real scrutiny
at no extra review cost, and rejecting it means "find a declarative form." No new mechanism, and the count
of opaque decisions is visible where the owner already looks.

**`kind: manual` is legitimate.** A requirement verified by the owner following steps is honestly
recorded, tied to a requirement, and visibly not-recently-run — which is strictly better than pretending
it is covered by automation nobody wrote. The owner is already the manual tester for most of this.

**Commands should emit machine-readable results where they can.** Kubernetes requires both a log and
`junit_01.xml` because exit-zero gives no per-case granularity — you cannot say "39 passed, one declared
skip." A command emitting TAP or JUnit gets per-case reporting; one that does not still works.

### The conformance tooling

Verified against cloned source rather than recalled; see `docs/research/conformance/`.

**Runner: `cmd/testscript` v1.15.0.** A standalone CLI, so there is no Go in the repository — one binary
invoked from a turbo task, with cases as plain txtar files that were designed to "be trivial enough to
create and edit by hand" and to "diff nicely in git history and code reviews." `exec` resolves off `PATH`
with no language-specific machinery, so the thing under test can be a Node CLI. Cost: `go install` only
(zero release assets), so a Go toolchain in CI and devcontainers.

**The normaliser is ours.** Path, timestamp, version, temp-dir and hostname scrubbing plus key-order
stabilisation, as a standalone Node CLI reading stdin and writing stdout. This is the one component that
must be owned: testscript ships no normalisation at all, and its `cmpenv` — the path-substituting
comparison — is **excluded from update mode**, so normalisation and expectation-regeneration cannot be
combined. The composition that routes around it:

```
exec my-cli build --out dist
exec normalise stdout
cmp stdout want-stdout.txt
```

Because `normalise` sets the stdout buffer, `cmp stdout <in-archive section>` compares normalised text, so
`-u` regenerates the *normalised* form. Only `cmp` triggers regeneration, only for sections inside the
same file, and the commands round-trip untouched — which is exactly the hand-authored-intent /
derived-expectation split the rule in step 4 requires.

**Ordering, and it is a one-line decision with a rewrite behind it:** normalise the actual output →
compare against stored → write the *normalised* form on update. Backwards, and every regenerated
expectation contains the temp path being scrubbed. rustc's compiletest is the correct model.

**Some determinism belongs in the program under test.** rustc runs its UI tests with `-Z ui-testing` to
anonymise line numbers. A shared `--deterministic-output` convention across projects removes more variance
than any harness regex, and all of these projects are ours.

**HTTP: `hurl`, standalone.** The best assertion vocabulary available — queries, 24 predicates, 30
filters. It has **no update mode**, so those assertions are hand-written. A real cost against the
authoring rule, and the right trade for what it buys.

**Libraries need a driver.** A binary reading a call spec on stdin and writing a serialised result on
stdout, per toml-test's contract. The thinnest real one measured is **43 lines**. Drivers are per project
*type*, not per project — five or six of them against every project we will ever write.

### Minimise the public contract

**Every export is a constraint on the rebuild.** The public surface is precisely the set of things a
regenerated implementation must preserve, so its size is the inverse of the freedom that makes disposable
source affordable. It is also, simultaneously, the size of the conformance corpus, the number of
costly-to-reverse decisions the owner must rule on, and the Hyrum surface — the observable behaviour
someone can come to depend on whatever the contract says.

So minimising it is not tidiness. It is the lever that makes everything else cheaper, and it should be
mechanically checkable wherever it can be.

**Rules that a checker can enforce:**

- **One entry point by default.** A second is a decision, not a default. Checkable: count the keys in the
  package's `exports` map. `minecraft/test-lib` already has this as `d:one-public-entry-point`.
- **No subpath wildcards.** A `"./*"` pattern in `exports` surrenders the boundary — consumers reach
  internals and every internal path becomes a promise. Checkable: assert no `*` in export keys.
- **No `export *` from an entry point.** It is the most common way a surface grows without anyone
  deciding: adding a symbol to an internal module silently publishes it. Named re-exports only.
  Checkable by lint.
- **`internal/` is unreachable from outside.** A directory the exports map never names, with cross-package
  imports into it forbidden. `dependency-cruiser` enforces this well and is already in the toolchain's
  vocabulary.
- **Every exported symbol has at least one conformance case.** This is the strongest of the set, because
  it makes the promise ledger *mechanical* rather than aspirational. Cross-reference the committed API
  report against the conformance manifest: an export with no case is either an untested promise or a
  symbol that should not be exported, and both are findings worth surfacing.
- **The API report is committed, and growth is stated.** An `.api.md`-style report in version control, so
  a surface change appears as a reviewable diff — and engineered, per API Extractor's own design note, so
  "a diff only occurs when a significant contractual change has occurred." An increment that grows the
  export count says why.

**Type-only exports are cheaper than value exports** and worth counting separately: they constrain what a
consumer compiles against but carry no runtime behaviour to preserve, so they cost the rebuild less.

**Scope note.** This section is about the *product's* boundary, which is durable. Minimising the surface
of internal modules is a different concern with a different justification — it makes a build coherent, not
a rebuild cheaper, because internal structure is transient and a rebuild is free to reorganise it
entirely. That belongs in the builder's instructions, not here.

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
9. **Interfaces as a first-class artifact** — extracted, pinned, diffable. Produced by build wave 1,
   which already writes the public surface and its doc comments; what is missing is that it lands
   somewhere durable rather than only in the code.
10. **Conformance manifest as a first-class artifact** — `requirement`, `kind`, `check`, plus `decision`
    for opaque and `steps` for manual. Produced by build wave 1, which already documents every planned
    case before any implementation exists.
11. **Requirement lifecycle fields** — `introduced_in`, `retired_in`, naming increments. This also
    fixes a real defect: `doc-structure` cannot represent a retired `documented` fact whose in-repo
    source text has since changed, because the checker verifies quotes on retired facts and the span is
    gone by definition. If quotes resolve against the increment where the text lived, that is
    structurally solved instead of worked around.

**Tooling**

12. **The normaliser** — a Node CLI, stdin to stdout, named redactions, key-order stabilisation. **Build
    this first.** It is the component nothing off the shelf gets right, the one the authoring rule
    depends on, and it is useful under every other option. Estimated 400–700 lines.
13. **The conformance runner** — dispatch on `kind`, invoke the check, consume TAP/JUnit where present,
    aggregate. Thin, because the tools do the work.
14. **`testscript` in the toolchain** — a devcontainer feature and a CI step, pinned to v1.15.0.
15. **Driver binaries per project type** — toml-test's contract, ~43–80 lines each.
16. **Public-surface checks** — entry-point count, no export wildcards, no `export *` from an entry, the
    `internal/` boundary, and the cross-reference of the API report against the conformance manifest. All
    mechanical; the last one is what makes the promise ledger enforceable rather than aspirational.
17. **Committed API report** per package, so a surface change is a reviewable diff.
18. **Decision collation** — the owner's readable view of a product.
19. **Publish gate** — no `proposed` decision outstanding.
20. **Deferred-tension queue** — ranked, visible, closable.
21. **Build report format** — the standard filter, plus a mandatory list of overturned decisions.

**Process**

22. **Harvest step at the increment boundary** — promote pseudo-requirements to requirements.
23. **Record build-forward as a decision** with its falsifier.
24. **Instruct the tiers asymmetrically** — smallest decisions at the bottom, no detail-settling at the
    top, escalation only with evidence.
25. **Where the owner's time goes.** Bounded manual work is acceptable where it is time-efficient, and
    the evidence says exactly where to spend it. Of 30 interviewed practitioners, **16 said writing the
    specifications slowed their progress**, and the named failure mode was *"not knowing what properties
    to test"* — not tooling. So the owner's authoring effort goes into **deciding what to assert**, which
    is the one part no tool reduces and precisely what the promise ledger asks for.

**Deliberately not needed**

Cross-repository propagation — reusable workflows, template drift checking, bulk mutation, organisation
rulesets — exists to approximate what a monorepo gives for free. These projects are one pnpm/turbo
workspace, so a harness change is one commit. The convention that replaces all of it: **every project
exposes a `verify` task**, and the shared workflow needs no per-project knowledge.

---

## What will actually be different

| today | proposed |
|---|---|
| a spec is written, reviewed and maintained per design | no spec; the clearinghouse produces decisions, facts and questions and its document is discarded |
| requirements fence to a design, so two workstreams on one product file issues at each other | requirements fence to the product; same-product work shares foundations |
| a design is settled or draft | an increment is; shipped increments stay shipped |
| changing a shipped product means rewriting its spec or inventing a new design | an increment carries the delta |
| decisions are the design phase's output, reviewed before building | decisions arrive from every tier and accumulate through the build |
| one review gate, before the build — the cheap, reversible step | two gates, both later: the interface at the end of wave 1, and publish |
| interfaces are written mid-build and reviewed by nobody outside it | the interface gate is where the build pauses for the owner, reached through decisions rather than by reading the surface |
| a decision the owner dislikes is rejected, and the work is redone | it is tolerated, and a requirement is filed for the next increment |
| facts are reachable only through spec prose | decisions carry their evidence directly |
| interfaces and the conformance table live inside a skimmed document | both are first-class, diffable, and mechanically reviewed |
| tests and code are the durable output | the conformance manifest and its cases are durable, plus metamorphic invariants; the implementation is regenerable |
| conformance is TypeScript test code, pinned to code-level APIs | conformance is declarative cases against the black-box boundary, in a format that survives the runner |
| a test asserting the wrong thing is a defect you own | declarative cases have no control flow to get wrong; commands do, so an opaque check is a proposed decision |

**What does not change:** the owner reads every requirement and every decision, in full. That is the
comprehension channel and the proposal is built to feed it, not to trim it.

---

## On adequacy — what this proposal deliberately does not claim

**No metric licenses a rebuild.** Mutation score's fault domain is the operator set: a perfect score means
"no single-token perturbation of *this* source survives." A rebuild is an arbitrary program from the same
behavioural neighbourhood, so it is not in the domain the score quantifies over, and the mismatch is
categorical rather than a matter of degree. Google's own scope sentence is that mutation testing assesses
"whether an **algorithm is correctly implemented** but not whether the **correct algorithm is
implemented**." And no published work gates a rebuild, a regeneration, or a rewrite on any adequacy metric.

So the gate is the conformance manifest passing, and the supporting signals are binary rather than scores:

- zero uncovered public-API surface
- zero untriaged surviving mutants — each killed, or annotated unproductive with a written reason
- mutation testing as a **pre-rebuild finder, never a release gate** (StrykerJS ships its build-failing
  threshold as `null`; leave it there). The deliverable is the survivor list, not the percentage.

The only adequacy measure with real evidential force is a **rebuild retrospective**: after each rebuild,
log every infidelity the corpus missed and why — no case, covered but unasserted, no invariant, or
genuinely unforeseeable. That measures against actual rebuilds rather than synthetic faults, and it is our
own instrumentation rather than an adopted metric.

## Open

- **Whether the boundary gate holds across real projects.** Cheap test: try to state the data-shaped
  boundary for three of the existing packages. If it comes easily, the gate is real; if it turns into
  motivation, it is not.
- **Whether the interface gate is enough for a data format.** The wave structure answers where a format
  gets pinned — at the end of wave 1, during the build rather than before it. Whether that is late enough
  to have learned something and early enough to protect consumers is untested.
- **Whether the clearinghouse's document is worth keeping at all**, or whether a collated decision view
  serves every reader it would have.
- **Adopt versus build for the runner.** `testscript` is adopted with three revisit triggers: the Go
  toolchain becoming a recurring tax, file-tree assertions producing defects often enough that
  hand-written `cmp` lines hurt, or `testscript/plugin` shipping and its boundary proving too thin. A
  TypeScript equivalent is 1,500–2,300 lines, anchored on three measured implementations.
- **Whether a mature TypeScript equivalent already exists.** The tooling survey ran without web search,
  so its discovery was limited to names it could construct. "Nothing mature exists" is *not* established.
- **Concurrency.** Increments are linear per product; two open increments colliding on a foundation is
  an owner call, and no mechanism is proposed for it.
- **The requirement pyramid, tabled.** An apex requirement with more specific ones beneath it, where the
  apex is a universal claim the children instantiate. Deferred because no concrete example emerged beyond
  one brief's "Done looks like". The manifest gives it a free home if it returns — an apex is just an
  entry whose `requirement` is the apex — so nothing here forecloses it.
