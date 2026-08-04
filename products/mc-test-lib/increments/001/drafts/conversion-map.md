# Conversion map: design/minecraft/test-lib → mc-test-lib increment 001

Working material for the conversion review. Maps every entry of the legacy design to its
converted id, and accounts for the entries deliberately not migrated.

## Requirements (22 converted, all previously active)

| old slug | new id |
|---|---|
| modelled-behaviour-is-the-engines | r-0lbj68w9 |
| engine-claims-are-sourced | r-8r8gf6b7 |
| coverage-is-enumerated | r-ovyzy5ey |
| synchronous-event-delivery | r-dyu1bb04 |
| before-events-can-cancel | r-1a9mpjev |
| scheduling-is-test-advanced | r-b01oxjf9 |
| fakes-behave-not-record | r-4dt4f8zn |
| fakes-never-fabricate | r-62r76czb |
| invalidation-is-modeled | r-dsjwpahw |
| object-substitution-not-module-mocking | r-wv395rgn |
| fakes-are-structurally-assignable | r-28cg0y2h |
| only-real-members-free-functions | r-5mlc26io |
| no-test-framework-dependency | r-2trs9aai |
| target-server-version | r-d141nytz |
| instance-scoped-world | r-892696vk |
| no-implicit-defaults | r-qak2scbs |
| presets-are-opt-in | r-b92y0kb7 |
| ids-auto-assigned-typeid-required | r-nmkxdrga |
| control-plane-component-mutation | r-rnnnz98l |
| canonical-prefixed-storage | r-v1r7n10i |
| persisted-state-is-modeled | r-94keu5iz |
| output-is-capturable | r-lawr69rs |

Verification procedures are authored for all 22 — none of the statements is self-verifying.
Inline `[[f:…]]` fact citations in rationales became `f:…` mentions plus `informed_by` lists
(`synchronous-event-delivery`, `scheduling-is-test-advanced`, `canonical-prefixed-storage`). No
requirement referenced another, so no cross-reference rewriting was needed.

The old area/global bindings resolve to presets: test-lib sat in the global `nodejs:libraries`
set, whose one requirement (`node-libraries-are-esm-typescript`) the `nodejs-library` preset now
carries — adopted here at version 1. No minecraft-area requirement bound test-lib (the
`minecraft-addon-packs` set holds only village-guard, so `minecraft-addon` is not adopted;
its `packs-unit-test-with-the-shared-test-lib` entry binds packs consuming this library, not the
library itself).

## Decisions (34 converted)

Status mapping: `accepted` carried (10); `tolerated` → `delegated` (24); no `rejected` entries
existed. Old falsifiers carried as `revisit_when`.

| old slug | new id | old → new status |
|---|---|---|
| server-bundle-mirrors-module-exports | d-nmjafny2 | tolerated → delegated |
| modelled-surface-is-world-entity-effect | d-khn6zzgj | tolerated → delegated |
| every-signal-exists-few-are-raised | d-1z8ovey4 | tolerated → delegated |
| guard-list-comes-from-the-observation | d-zv2x5luo | tolerated → delegated |
| library-declares-its-error-classes | d-9bys1gsh | tolerated → delegated |
| presets-are-vanilla-dimensions-and-spawn-frame | d-fkbx974k | tolerated → delegated |
| effect-durations-decay-on-the-advance-clock | d-sbml8eor | accepted |
| effect-expiry-is-the-librarys-own | d-94hinqww | tolerated → delegated |
| coverage-rows-carry-stable-ids | d-gw0c8usd | tolerated → delegated |
| custom-effect-display-name-is-supplied | d-dk3rf1w8 | tolerated → delegated |
| trigger-event-requires-prefix-and-records | d-d2v43iqn | tolerated → delegated |
| remove-raises-only-entity-remove | d-ie8qhnr2 | tolerated → delegated |
| projectile-damage-is-verbatim | d-7mkz86s2 | tolerated → delegated |
| placement-and-motion-are-literal | d-y8oeiw5p | tolerated → delegated |
| out-of-scope-members-throw-not-implemented | d-qz2aoixe | tolerated → delegated |
| current-tick-starts-at-zero | d-soaea8n2 | accepted |
| entity-ids-are-sequential-opaque-strings | d-ow40nqqi | tolerated → delegated |
| absence-reads-as-undefined | d-2qq6agnx | tolerated → delegated |
| test-lib-has-one-peer-dependency | d-c5odl61n | accepted |
| registries-are-declared-and-throw | d-duelxt32 | tolerated → delegated |
| damage-without-health-is-a-no-op | d-fgib2fcb | accepted |
| killing-hit-lands-at-or-below-minimum | d-dbv8udc6 | accepted |
| entity-lookups-honour-a-filter-subset | d-6bnub7bw | tolerated → delegated |
| cancelled-actions-return-the-engines-value | d-rjnyvnzm | accepted |
| before-event-field-writes-are-honoured | d-ka348xdn | tolerated → delegated |
| display-names-resolve-from-a-shipped-table | d-mclpuv0u | accepted |
| generated-members-check-arity-before-the-guard | d-nw4v0fag | accepted |
| fakes-are-generated-classes-with-guard-prologues | d-tzww1yuv | accepted |
| one-public-entry-point | d-19qu2ih2 | tolerated → delegated |
| attribute-id-set-is-a-checked-literal-array | d-72iyl1su | tolerated → delegated |
| component-state-is-the-attribute-four | d-990n6j2l | tolerated → delegated |
| tick-advance-semantics | d-dodefnml | tolerated → delegated |
| output-log-record-shape | d-u8u72i58 | tolerated → delegated |
| handler-errors-are-isolated-and-recorded | d-pvnu83vf | accepted |

Inline `[[f:…]]` citations in statements became `f:…` mentions plus `because` entries
(`guard-list-comes-from-the-observation`, `effect-durations-decay-on-the-advance-clock`).

## Harvested from the retired spec (5 new decisions, delegated)

Constraints a consumer observes, or a reimplementation must preserve, that existed only in
spec prose:

| new id | title |
|---|---|
| d-ksk6d7ua | the exported free functions |
| d-vwdg6xle | unanswerable reads resolve in a fixed order |
| d-w0ebi621 | corpse invalidation rides the advance clock |
| d-0fmcw6n8 | component state shorthands expand to fixed records |
| d-k9up7nmc | three before-events are raised |

Pinning candidates (`public-api`), a ruling for this review — they enter unpinned because a
conversion proposes no new ratifications:

- `d-ksk6d7ua` (the exported free functions) — the control-plane surface every consumer calls.
- `d-19qu2ih2` (one public entry point) — the package's import shape.
- `d-9bys1gsh` (library declares its error classes) — the classes a pack's `instanceof` checks bind to.

## Product shape

- Kind `dev-tooling`, like `mc-dev-kit`.
- Facet vocabulary: `fakes` (everything converted here) and `shim` — the owner ruled
  `minecraft/server-shim` converts later as a facet of this product; it is expected as
  increment 002 and nothing of it is converted here.

## Other dispositions

- `brief.md`: not migrated; history keeps it.
- `spec.md`: discarded after the shallow harvest above. Its coverage table ships in the
  package's own user-facing documentation per `r-ovyzy5ey`, with the row-id contract recorded
  as `d-gw0c8usd`; the spec copy is not migrated.
- `artifacts/*`: moved to `evidence/minecraft/test-lib/`; the runs in
  `evidence/minecraft/script-api.yml` re-pointed there.
- `facts/minecraft/pack-testing.yml`'s `test-lib-does-not-intercept-the-module-import` source
  re-pointed from `design/minecraft/test-lib/requirements.yaml`
  (`r:object-substitution-not-module-mocking`) to this increment's `requirements.yaml`
  (`r-wv395rgn`), quote re-verified verbatim.
