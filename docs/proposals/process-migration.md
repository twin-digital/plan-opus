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

## Spec citation as evidence of compliance

**Retired:** the checker rule that every requirement binding a design must be cited somewhere in its
`spec.md`.

**Replaced by:** the coverage manifest, which maps every claim — requirement or decision — to evidence
that something checks it.

### Why

The rule was the only mechanical evidence of compliance the process had, and it was theatre: a citation
proves a document *mentions* a requirement, nothing more. An agent could satisfy it by writing the
requirement's name into a paragraph. With most of a spec restating its foundations, citations were
largely decoration.

It also could not survive the spec's removal, and requirement presets made its absence urgent — adopting
a newer preset increment ought to be able to fail, and with nothing checking compliance, nothing would.

### A rejected replacement

"A decision addresses this requirement" was considered as a coverage kind and rejected. Traceability is
not coverage — it is the same mechanism under a new filename, proving only that something mentions
something. Coverage entries name evidence that something *checks* the claim.

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

## Wave tags on decisions

**Retired:** recording which wave proposed a decision.

**Why:** it was justified as telling the owner how much context the proposer had. With `pinned` governing
authority and coverage governing evidence, the tag routed nothing and answered nothing anyone was asking.

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
- **Requirements gain `satisfied_when` at conversion** — drafted by the converting agent, ratified in
  the conversion review. This is the migration's main authoring cost.

### Wider scopes convert first

The global and area requirements binding a design become preset products — plan-only, created before
any product converts — and each converted product `adopts` them at its first increment.

### The spec, two cases

**Where the spec described the product** — most designs — it is discarded, after an optional harvest
pass: constraints meeting the recording bar (a consumer could observe it, or a rebuild must preserve
it) that exist only in spec prose become decisions of the converted increment. How deep to harvest is
chosen per product; for designs already built, the spec's build-guiding job is done and the cheap
default is a shallow pass.

**Where the spec is the product** — `doc-structure`, `authoring` — the document is the deliverable,
not a description of one. The product records a `document`-kind package whose `path` is the document's
permanent home — in this repository, so `repo` departs from its default — and the file moves there as
built output. Nothing is discarded; later increments revise it through build waves like any other
deliverable.

### Sweeps

- **Fact sources**: in-repo `url` sources anchored to `design/…` paths re-point to the new homes, their
  quotes re-verified against the moved text. Confirm the checker validates url existence before
  trusting it to catch stragglers.
- **Coverage**: absent at conversion. The first post-conversion increment sets the bar at `attested`.
- **Briefs**: not migrated; history keeps them.

### Order

1. Presets, from the wider scopes.
2. Pilot: `mc-dev-kit` — the only facet merge, with one published and one draft increment, small enough
   that the status re-ruling is an hour.
3. Remaining products, each its own change.
4. The document-deliverable products, once their permanent home is decided.
5. The old-tree checker rules retire with the last design out; until then the checker accepts both
   trees.
