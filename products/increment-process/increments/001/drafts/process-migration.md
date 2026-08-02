# What the incremental process replaces

Companion to `incremental-development.md`. That document states the process as it is meant to work. This
one records what it retires and why, so the reasoning survives without the affirmative document carrying
it.

---

## Wider requirement scopes

**Retired:** global-scope and area-scope requirements, the `applies_to` field, and `sets.yaml`.

**Replaced by:** requirement presets, adopted by a product at a pinned increment.

### Why

The flaw was not a gap in the rules — it was immutability violated from outside. **A published
increment's compliance could change without the increment changing.** Add a global requirement this
morning and a design that was complete last night is incomplete, having done nothing. The same held for
an `applies_to` that reached a design after the fact. No amount of care inside an increment defended
against it.

Pinning is the move that makes a durable claim possible at all. "Conforms to test262" is not a sayable
sentence, because the suite is living and a claim against it decays silently; CommonMark and the JSON
Schema test suite version cleanly because an implementation pins a frozen revision. Adopting
`nodejs-library@3` is the same shape.

### What else changed with it

**Set membership moved from the group to the member.** `sets.yaml` declared centrally which designs
belonged to a group. A product now declares what it adopts, so adding a product to a group is a change to
that product rather than to a shared file.

---

## Reversal cost as a decision attribute

**Retired:** the framing of decisions as carrying a designer-set "reversal cost", with escalation reading
off whether a change was cheap or costly.

**Replaced by:** the typed `pinned` field on a decision — `false`, or a named reason with notes.

### Why

"Costly to reverse" is one reason among several for wanting owner ratification before a decision changes,
and building the vocabulary around it made that one reason look like the whole category. Pinning names the
consequence directly — this cannot be freely overturned — and leaves the reasons open to grow as they are
understood.

---

## Spec bundles

**Retired:** the planned publication of versioned design bundles — the full spec at a computed
version, for implementers to work from later. Planned, never implemented.

**Replaced by:** the fold at a published increment. `<product>@N` is derivable on demand and
identical forever, so the bundle needs no publishing; the increment number is the version, and the
declared delta is the changelog.

### Why

The bundle existed to give implementers a frozen, versioned design state on a schedule decoupled from
implementing. Both properties now come free: a Plan-only increment publishes without an implementation, and a
published increment cannot change. What survives of the design is its core move — the version
computed from structured data, never from prose — which the increment sequence carries natively.

---

## Drafts on main

**Retired:** the unsettled-and-merged combination. Design state was always derived — exploring,
draft, settled, computed from tree content, with published a separate settled-and-merged axis — and a
draft could legally sit on main during design work.

**Replaced by:** merge as the publish act. State stays derived; the combination is what goes.

### Why

Under numbered increments the combination stops being harmless. Main's increment sequence is what
`after:` references and the concurrency lock resolve against, so a draft on main would put a mutable,
renameable claim inside the shared ordering. The fold over main would mix settled history with
unsettled entries, obliging every consumer to filter. A tree-consumed deliverable — a document
package — would go live mid-draft. And immutability enforcement would be conditional ("refuse edits
unless draft") instead of absolute ("refuse edits to anything on main"). Removing the combination
buys all four, and costs only what a branch already provides.

---

## Converting what exists

The old tree converts product by product, each conversion its own reviewed change, and the two trees
coexist until the last design moves. A design never exists in both: the change that publishes a
converted increment deletes the design directory it came from.

### Designs to products

The old `products.yaml` already names the merges — its slot names are the facet vocabulary:

| old design(s) | new product | facets |
|---|---|---|
| `minecraft/dev-kit`, `minecraft/pack-build` | `mc-dev-kit` | `discovery`, `build` |
| `minecraft/test-lib` | `mc-test-lib` | — |
| `minecraft/dev-server` | `mc-dev-server` | — |
| `minecraft/server-shim` | own product, or a facet of `mc-test-lib` — owner call | — |
| `minecraft/village-guard` | `village-guard` | — |
| `how-to-plan/*` | plausibly `increment-process`, their documents as its deliverables — owner call | — |

### One design, one increment

Each design becomes one increment of its product, ordered statically by dependency — a design others
consumed converts as the earlier increment. A settled, published design becomes a `published`
increment; an exploring or draft one becomes a `draft` increment sitting where unratified work sits,
mid-Plan.

### Entries

- **Ids**: the old slug becomes `title`; an opaque id is generated. Falsifiers carry over unchanged.
- **Statuses**: `accepted` carries. **Old `tolerated` defaults to `delegated`** — its old definition,
  "cleared to proceed but not endorsed, so a later author may rework it freely," is the new
  `delegated`; the owner promotes individual entries to the new `tolerated` where they remember
  actually ruling. `proposed` stays proposed, and appears only in draft increments.
- **Rejected decisions are not migrated.** They were never in force; git history keeps the record.
- **Requirements gain `verification` at conversion, where their statements are not self-verifying** —
  do/verify procedures drafted by the converting agent, ratified in
  the conversion review. This is the migration's main authoring cost.

### Wider scopes convert first

The global and area requirements binding a design become preset products — plan-only, created before
any product converts — and each converted product `adopts` them at its first increment.

### The spec, two cases

**Where the spec described the product** — most designs — it is discarded, after an optional harvest
pass: constraints meeting the recording bar (a consumer could observe it, or a reimplementation must preserve
it) that exist only in spec prose become decisions of the converted increment. How deep to harvest is
chosen per product; for designs already built, the spec's build-guiding job is done and the cheap
default is a shallow pass.

**Where the spec is the product** — `doc-structure`, `authoring` — the document is the deliverable,
not a description of one. The product records a `document`-kind package whose `path` is the document's
permanent home — in this repository, so `repo` departs from its default — and the file moves there as
built output. Nothing is discarded; later increments revise it through implementation waves like any other
deliverable.

### Sweeps

- **Fact sources**: in-repo `url` sources anchored to `design/…` paths re-point to the new homes, their
  quotes re-verified against the moved text. Confirm the design validator checks url existence before
  trusting it to catch stragglers.
- **Coverage**: absent at conversion. The first post-conversion increment sets the bar at `attested`.
- **Briefs**: not migrated; history keeps them.

### Order

1. Presets, from the wider scopes.
2. Pilot: `mc-dev-kit` — the only facet merge, with one published and one draft increment, small enough
   that the status re-ruling is an hour.
3. Remaining products, each its own change.
4. The document-deliverable products, once their permanent home is decided.
5. The old-tree validation rules retire with the last design out; until then the design validator accepts both
   trees.

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
2. **Requirement presets**, adopted through the `presets:` declaration in a requirements source,
   and the wider scopes removed.
3. **Increment as an artifact** — foundation delta, decisions, adoptions.
4. **Move status from the design to the increment.** It stays derived, now from location: draft is
   off main, published is merged, and the old unsettled-and-merged combination is gone.
5. **Stop maintaining `spec.md`.** Clarify works through a synthesis draft, discarded at zero
   remainder before publish.

**Schema**

6. **`version` on every structured file** — the pool version of the file's own schema; foundation
   files become keyed mappings to carry it.
7. **Typed `pinned` on decisions** — `false`, or a named reason with optional notes — governing what
   escalates.
8. **`verification` on requirements** — one do/verify procedure, present only where the statement
   is not self-verifying.
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

14. **The projection** — the folded, computed view of a product, filterable by facet and ordered by
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
