# The Implement phase

Draft of increment 003, extending increment 001's draft of the planning process with the Implement
phase: the waves, escalation, and evidence. Plan hands Implement the ratified design.

## Decomposition is design work

The consumer-visible package set — each package's existence, kind, and home — is proposed and
ratified in Plan, as decisions of the increment that calls for it. The information is available
there — what deliverables exist, what kind each is, what surfaces they expose — and the boundaries
are pinned territory the owner rules on regardless, so settling them anywhere else is the
ratification loop with extra steps and a blocked implementer in the middle.

The line holds in both directions. Plan fixes the public shape only: structure below the package
surface — a shared internal library, how code splits inside a package — is the implementer's, and
pre-deciding it from the plan tier is the churn the agent guidance already forbids. And
`product.yaml` stays descriptive, exactly as increment 001 rules: intent lives in the increment's
decisions, and the mapping reflects the packages an implementation has realized.

Escalation on decomposition then reverts to its intended rarity: it fires when reality contradicts
the ratified package set — a fact-based stop like any other — not as the routine first act of every
implementation.

## Dispatch: kind selects the wave shape

An implementation dispatches one implementer per package, and the package's `kind` — already in the
mapping — selects its wave shape. Every shape shares one rule: each wave produces one artifact,
validated against what came before it.

The shape for code kinds — `npm-library`, `npm-cli`, `minecraft-addon`:

| wave | produces | validated against |
|---|---|---|
| **Define** | the test plan | the requirements and decisions |
| **Stub** | tests and API stubs | the test plan |
| **Code** | the implementation | the stubs, by compiling; the tests, by passing |
| **Document** | READMEs and user-facing documentation | the implementation |

Documentation is a wave rather than an afterthought because it is a deliverable of the product, not a
by-product of implementing it.

The shape for `document` kinds:

| wave | produces | validated against |
|---|---|---|
| **Claims** | the list of claims the document must state | the effective design at the targeted increment |
| **Compose** | the document at its permanent home, drawing on the increment's frozen drafts | the claim list; every draft claim checked against the fold |
| **Check** | coverage entries per claim | the document, read against each claim |

Further kinds name their shapes as they earn them — an `agent-skill` package will not test like a
library or read like a reference. The shapes are the process's initial vocabulary, not a closed
set.

## Escalate

An escalation path is open at **every** wave. It is meant to be a rare escape hatch rather than a
closed door, and agents are given explicit instruction about what qualifies. It fires when a wave
needs to:

- propose a change to a **requirement**
- propose a change to a **pinned** decision
- propose a **new** decision that would be pinned

Otherwise the implementation proceeds. Agents have wide latitude to decide and implement — including
overturning unpinned decisions and introducing new unpinned ones — provided nothing contradicts a
ratified decision or requirement.

The asymmetry between Plan and Implement is deliberate. **Plan exists to surface and ratify the big
rocks**, so by definition everything raised there reaches the owner, who may simply tolerate what is
easy to reverse. **Implement exists to make progress**, so only what is hard to reverse interrupts
it.

Escalation says *what* must reach the owner; where an implementation pauses — after every wave, at
completion, or only when an escalation fires — is orchestration configuration rather than process
definition. Agent guidance carries the flavours of orchestration instruction, and a product runs
under the one that fits its risk.

An implementation never amends the design tree it targets. An escalated change lands as an ordinary
design increment — proposed from the implementation, ratified as any increment is — and the
implementation retargets to the increment that contains it. The implementation record keeps the statement
honest either way: what was implemented, against which increment, is pinned there, whatever the
head has since become.

When later design increments have already landed, this is **abort-and-retarget**: the
implementation's amendments land at head, above whatever arrived meanwhile; the implementation
retargets to the increment that contains them, restarting or reconciling; and the loop repeats if further
increments land first. Under fast enough design landings, nothing ever finishes implementing. That
is accepted for a single owner authoring increments, where the race is rare and losing it is cheap.

The alternative left behind, recorded so it is not relitigated: **implementer-amendment branches** —
a hotfix increment forked from the targeted increment rather than landed at head, letting an
implementation honestly cite exactly what it worked against without waiting on the main sequence.
Its costs are why it lost: amendments invisible to the main fold unless promoted, future
implementations re-solving the same problems — possibly differently — and incompatible states
mid-stream while pinned amendments await manual incorporation. It layers onto abort-and-retarget
without breaking anything, which is exactly why it waits for the condition that would justify it:
agents autonomously managing increments at a pace where retargeting starves implementations.

## One channel: how implementation output lands

Every design change an implementation produces lands the same way: as an ordinary design
increment at head. There is no second channel — no decisions block on the record, no
implementation-scoped entries in the effective design, no interleaving semantics to define. The
fold has one input kind, and everything in it entered through an increment.

The two landing moments differ only in urgency. **Escalation** is the mid-flight increment:
requirements and pins, the things an implementation cannot safely build past, raised when met and
ruled then. **Wrap-up** is the end-of-flight increment: the unpinned decisions the implementation
overturned, as superseding entries, and the choices worth keeping — and these open as `delegated`,
recorded rather than ruled. The merge gate reads only `proposed`, so a wrap-up increment lands
gated by pull-request review and the validation checks rather than by per-entry rulings; a
supersession of a ratified entry is still presented in the diff rather than discovered later, and
ruling one up — or reversing it — is implement-forward, whenever the owner chooses.

**A record lands only at head.** Its `target` is the product's newest published increment at the
moment it merges; a stale target is refused, and the implementation retargets first — recomputing
against the declared deltas of whatever landed meanwhile, which is a bounded read, not a re-review.
The consequence is that merge order and target order coincide at every landing: intervening
increments exist while an implementation is in flight, never at the seam.

**Releases wait for their design.** A design with no implementation is a safe state the process
explicitly supports; an implementation whose backing design has not published is not. So no package
version releases and no document deliverable goes live before the design increment its
implementation targets is on main. The controls enforcing this ordering — where the hold lives,
what checks it — are deliberately deferred to a later increment; this one records the rule and the
deferral.

## Proving a claim is met

A product should be able to demonstrate, mechanically, that it meets what it claims — so that a
decision cannot quietly describe a product that no longer exists, and so the owner can ask how much
of a product is actually checked rather than merely asserted. **Every claim carries its evidence.**
A claim is a **requirement** or a **decision**: both are assertions about the product, and an
assertion nothing checks can quietly become false. What a requirement's evidence must demonstrate is its
verification procedure — or its statement read literally, where it carries none.

### The coverage manifest maps claims to evidence

Coverage is the implementation's artifact, not the design's. An implementation produces a record in
the `implementations/` pool — filed like the other pools, immutable once its artifacts ship —
linking the package versions produced to the design increment targeted, and carrying the manifest.
Run by hand on the increment's own branch or autonomously against a published increment, an
implementation is the same mechanism either way, and both write this record:

```yaml
version: "1"
product: minecraft-test-lib
target: 7                    # the design increment whose fold this implementation targeted
built_at: 2026-08-01
packages:
  - path: minecraft/test-lib
    version: 0.4.0
coverage:
  - claim: r-h97o555y      # consumer suite typechecks
    covered_by:
      - kind: conformance-case
        ref: conformance/typecheck.txtar

  - claim: d-qaq43q3x      # control surface is a real subpath
    covered_by:
      - kind: code-test
        ref:
          - test/exports.spec.ts
          - test/control.spec.ts
      - kind: attestation
        note: the exports map declares ./control, and the build fails without it
```

`kind` + `ref` + an optional `note`, uniform across kinds, so new kinds land without a schema change.
`ref` is one path or a list — an implementation that spans files names them all. It names what
carries the claim, not everything the code path touches: the generic error type and the logging
library are reachable from almost every claim and evidence for none. Picking that set is
agent-guidance material.

| kind | what it is | what still rests on the implementer's word |
|---|---|---|
| `attestation` | an agent asserts it; no artifact | everything |
| `code-test` | a test in the project's own suite, written by the implementer | that the test measures the claim |
| `manual-check` | recorded steps a human follows and re-runs | that the steps measure the claim |
| `conformance-case` | a case the owner wrote or vetted, tied to the claim it checks — automated or manual | nothing |

What makes a conformance case conformance is its **provenance and its coupling**: the owner authored
or carefully reviewed the check, and it is tied to the requirement it demonstrates rather than to a
decision an agent made downstream. Automation is not the distinction — the planned tooling carries
manual cases as one supported kind of conformance case. A check with no recorded steps is not a
`manual-check` and does not enter the manifest at all; an unrepeatable check is an attestation with
extra effort.

**A manifest names only claims in force at the increment its implementation targeted.** Retire a
requirement and it is simply omitted from the next implementation's manifest. It is also an error to
name a claim that is still `proposed` — coverage is evidence about something the owner has ruled on,
not about a suggestion.

### The ladder

Each rung is stronger evidence than the one below it, and a claim sits at the highest rung anything
in its `covered_by` provides:

| rung | means |
|---|---|
| `attested` | only an agent's word that it is met |
| `checked` | a recorded check exists — an implementer's test, or steps a human re-runs |
| `conformance` | the check is owner-vetted and tied to the claim |

Why an implementer's test outranks the same implementer's word, when one agent wrote both: an
attestation is believed whole — the agent observed, concluded, and reported, and none of that can be
re-examined. A test moves the verdict into the product: it executes and can fail, now and on every
later run. What still rests on the implementer is only that the test measures the claim — a smaller
thing to trust, and an auditable one, since a reviewer can read a test where there is nothing to
read behind an attestation. `conformance` retires that residue too, by moving authorship or vetting
of the check to the owner.

Automation is a property of a check, not a rung. A manual conformance case outranks an automated
implementer's test, because strength comes from provenance and coupling; whether a check runs
without a human prices re-running it, and is worth reporting on that ground alone.

The first increment sets the bar at `attested` and reports the distribution. Later increments raise
a rung or turn a warning into an error. **The number worth watching is how many claims sit at
`attested`** — that is the honest measure of how much of the product rests on an agent's word.

Requirements adopted from a preset are coverage-tracked exactly like product-local ones. Nothing
about their origin changes what has to be shown.

### Who writes coverage, and when

| point | contributes |
|---|---|
| a requirement is authored — by the owner or an agent, in any phase | `verification`, which is not a coverage entry but the procedure evidence will later demonstrate |
| **Define** | the claim list, and which kind of evidence each claim is expected to get |
| **Stub** | `code-test` and `conformance-case` entries, as those artifacts come into existence |
| **Code** | an `attestation` for every claim it implemented — always, from the implementer, alongside whatever better evidence exists — and the entries written earlier now pass |
| **Document** | `manual-check` entries, where a claim is verified by following documented steps |

## Additions to the shared shape

Two artifacts join increment 001's durable set:

| artifact | what it holds |
|---|---|
| implementations | the record of each implementation — the fold it targeted, the package versions it produced, and its coverage |
| released versions | tags and published artifacts — permanent once out, whatever happens to the source |

Released versions are durable for a reason no other entry shares: they are durable whether the
process wants them or not. A published package cannot be recalled, so the record of what went out
is the one durable artifact this repository does not control the lifecycle of. Naming it here is
what keeps an implementation record honest about what it actually shipped.

## API surfaces

The durable-interfaces question closes at the API layer the way schemas closed it for data: public
API surfaces are authored contracts in a repo-wide `apis/` pool — commitments the implementation
must satisfy, never extracted projections, though the design validator may extract from the code and
diff against the authored surface, which is what makes an authored one falsifiable. Identity is
in-file by a per-tech header (`// api: /mc-test-lib/server@2`), versions dense and immutable once
bound-published, drift legal; any organisational or naming convention within the pool is a
navigation aid — non-normative and unenforced — with the file's extension and content telling the
validator which extractor reads it. Only public surfaces enter the pool; the
internal stubs the Stub wave produces stay implementation.

The model binds an API surface the way it binds a schema — an entry carries `api:` instead of
`schema:` — so bindings ratify as requirements, and an implementer needing a surface change proposes
a new pool version and a rebinding as an ordinary design increment, abort-and-retarget applying.
