---
version: "23"
---

# What the incremental process replaces

Companion to `process-reference.md`. That document states the process as it is meant to work;
this one records what it retires and why — so the reasoning survives without the affirmative
document carrying it — and how the legacy `design/` tree converts.

## Wider requirement scopes

**Retired:** global-scope and area-scope requirements, the `applies_to` field, and `sets.yaml`.

**Replaced by:** requirement presets, adopted by a product at a pinned version.

The flaw was not a gap in the rules — it was immutability violated from outside. **A published
increment's compliance could change without the increment changing.** Add a global requirement
this morning and a design that was complete last night is incomplete, having done nothing. No
amount of care inside an increment defended against it. Pinning is the move that makes a
durable claim possible at all: "conforms to test262" is not a sayable sentence, because the
suite is living and a claim against it decays silently; adopting `nodejs-library@3` versions
cleanly the way CommonMark does.

Set membership moved from the group to the member with it: `sets.yaml` declared centrally which
designs belonged to a group; a product now declares what it adopts, so adding a product to a
group is a change to that product rather than to a shared file.

## Reversal cost as a decision attribute

**Retired:** the framing of decisions as carrying a designer-set "reversal cost", with
escalation reading off whether a change was cheap or costly.

**Replaced by:** the typed `pinned` field on a decision — `false`, or a named reason with
notes.

"Costly to reverse" is one reason among several for wanting owner ratification before a
decision changes, and building the vocabulary around it made that one reason look like the
whole category. Pinning names the consequence directly — this cannot be freely overturned — and
leaves the reasons open to grow as they are understood.

## Spec bundles

**Retired:** the planned publication of versioned design bundles — the full spec at a computed
version, for implementers to work from later. Planned, never implemented.

**Replaced by:** the fold at a published increment. `<product>@N` is derivable on demand and
identical forever, so the bundle needs no publishing; the increment number is the version, and
the declared delta is the changelog.

The bundle existed to give implementers a frozen, versioned design state on a schedule
decoupled from implementing. Both properties now come free: a Plan-only increment publishes
without an implementation, and a published increment cannot change. What survives of the design
is its core move — the version computed from structured data, never from prose — which the
increment sequence carries natively.

## Drafts on main

**Retired:** the unsettled-and-merged combination — a draft design legally sitting on main
during design work.

**Replaced by:** merge as the publish act. State stays derived from location; the combination
is what goes.

Under numbered increments the combination stops being harmless. Main's increment sequence is
what the fold and the concurrency collision resolve against, so a draft on main would put a
mutable, renameable claim inside the shared ordering; the fold over main would mix settled
history with unsettled entries; a tree-consumed deliverable would go live mid-draft; and
immutability enforcement would be conditional instead of absolute. Removing the combination
buys all four, and costs only what a branch already provides.

## Spec citation as evidence of compliance

**Retired:** the checker rule that every requirement binding a design must be cited somewhere
in its `spec.md`.

**Replaced by:** the coverage manifest, which maps every claim in force — requirement or
decision — to evidence that something checks it. Deferred decisions are the exception: no entry
covers one directly, and a deferral without an answer is not a gap.

The rule was the only mechanical evidence of compliance the process had, and it was theatre: a
citation proves a document *mentions* a requirement, nothing more. It also could not survive
the spec's removal, and requirement presets made its absence urgent — adopting a newer preset
version ought to be able to fail, and with nothing checking compliance, nothing would.

A rejected replacement, recorded so it is not relitigated: "a decision addresses this
requirement" was considered as a coverage kind and rejected. Traceability is not coverage — it
is the same mechanism under a new filename, proving only that something mentions something.
Coverage entries name evidence that something *checks* the claim.

## Wave tags on decisions

**Retired:** recording which wave proposed a decision. It was justified as telling the owner
how much context the proposer had; with `pinned` governing authority and coverage governing
evidence, the tag routed nothing and answered nothing anyone was asking.

## Implementer-amendment branches

**Considered and left behind:** a hotfix increment forked from the targeted increment rather
than landed at head, letting an implementation honestly cite exactly what it worked against
without waiting on the main sequence. Its costs are why it lost: amendments invisible to the
main fold unless promoted, future implementations re-solving the same problems — possibly
differently — and incompatible states mid-stream while pinned amendments await manual
incorporation. It layers onto abort-and-retarget without breaking anything, which is exactly
why it waits for the condition that would justify it: agents autonomously managing increments
at a pace where retargeting starves implementations.

## Converting what exists

The old `design/` tree converted product by product, each conversion its own reviewed change,
with the two trees coexisting until the last design moved. `design/` is gone, and
`npm run check` is `design-process check` over `products/`, `schemas/`, `apis/`, and
`implementations/`; the legacy checker retired with the last design out.

Converting a design removes it from the legacy tree in the same change: the change that
publishes a converted increment deletes the `design/<area>/<design>/` directory it came from. So
no design is readable in both trees at once, there is never a question which copy governs, and
the legacy checker can retire with the last design out.

### Designs to products

The old `products.yaml` already names the merges — its slot names are the facet vocabulary:

| old design(s) | new product | facets |
|---|---|---|
| `minecraft/dev-kit`, `minecraft/pack-build` | `mc-dev-kit` | `discovery`, `build` |
| `minecraft/test-lib` | `mc-test-lib` | — |
| `minecraft/dev-server` | `mc-dev-server` | — |
| `minecraft/server-shim` | own product, or a facet of `mc-test-lib` — owner call | — |
| `minecraft/village-guard` | `village-guard` | — |
| `how-to-plan/*` | absorbed by `increment-process`, their documents as its deliverables | — |

### One design, one increment

Each design becomes one increment of its product, ordered statically by dependency — a design
others consumed converts as the earlier increment. A settled, published design becomes a
published increment; an exploring or draft one becomes a draft increment at
`products/<product>/increments/wip-<NNN>-<slug>/`, on the conversion's own pull-request branch.

That second case does not merge as it converts. Main never holds a `wip-` directory, so the
conversion of an unsettled design finishes its Plan on the branch and lands into a number
before the change merges — the conversion carries the design through to settled, or it waits.

A product absorbing more than one unsettled design — `increment-process`, taking `how-to-plan`'s,
is one — stacks them: each draft increment sits on a branch off the one it depends on, and the
ordinals give that order.

### Entries

- **Ids**: the old slug becomes `title`; an opaque id is generated. Old falsifier conditions
  carry over as `revisit_when` where the owner keeps them.
- **Statuses**: `accepted` carries. Old `tolerated` defaults to `delegated`, the ruling that
  claims least about what the owner reviewed; the owner promotes individual entries to the new
  `tolerated` where they remember actually ruling. `proposed` stays proposed, and appears only in
  draft increments.
- **Rejected decisions are not migrated.** They were never in force; git history keeps the
  record.
- **Requirements gain `verification` at conversion, where their statements are not
  self-verifying** — do/verify procedures drafted by the converting agent, ratified in the
  conversion review. This is the migration's main authoring cost.

### Wider scopes convert first

The global and area requirements binding a design become preset products — plan-only, created
before any product converts — and each converted product adopts them at its first increment.

### The spec, two cases

**Where the spec described the product** — most designs — it is discarded, after an optional
harvest pass: constraints meeting the recording bar (a consumer could observe it, or a
reimplementation must preserve it) that exist only in spec prose become decisions of the
converted increment. How deep to harvest is chosen per product; for designs already built, the
spec's build-guiding job is done and the cheap default is a shallow pass.

**Where the spec is the product** — `doc-structure`, `authoring` — the deliverable is a document,
not a description of one. The absorbing product records a `document`-kind package whose `path` is
the document's permanent home under `docs/`, and an implementation composes the document there
against the fold. The old `spec.md` is that composition's raw material: it froze under the process
being retired, so what the fold now settles differently is written to the fold's state. Later
increments revise the document through implementation waves like any other deliverable.

The homes here are already fixed. `increment-process` ships two reference documents —
`docs/process-reference.md` and this file — and the authoring successor at `docs/authoring.md`.
Instruction to agents is not among them: it ships as agent-skill packages and this repository's
`CLAUDE.md`.

### Sweeps

- **Fact sources**: in-repo `url` sources anchored to `design/…` paths re-point to the new
  homes, their quotes re-verified against the moved text.
- **Coverage**: absent at conversion. The first post-conversion implementation records
  attestations as its floor.
- **Briefs**: not migrated; history keeps them.

### Order

1. Presets, from the wider scopes.
2. Pilot: `mc-dev-kit` — the only facet merge, small enough that the status re-ruling is an
   hour.
3. Remaining products, each its own change.
4. The document-deliverable products, at their permanent homes under `docs/`.
5. The old-tree validation rules retire with the last design out.
