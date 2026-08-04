# Conversion map: design/minecraft/dev-kit → mc-dev-kit increment 001

Working material for the conversion review. Maps every entry of the legacy design to its
converted id, and accounts for the entries deliberately not migrated.

## Requirements (20 converted, all previously active)

| old slug | new id |
|---|---|
| dev-kit-provides-a-library | r-ziw808ls |
| dev-kit-library-name | r-jvb29tpu |
| pack-discovery | r-co6glnme |
| packs-enumerable-without-a-build | r-0l79om74 |
| membership-from-source-manifest-presence | r-zcdmh9p6 |
| packages-come-from-the-workspace-definition | r-4f1obncy |
| the-root-package-is-a-candidate | r-ijeqntrd |
| enumeration-uses-the-managers-own-libraries | r-r9t69mz7 |
| pack-search | r-7v7o1jy8 |
| pack-record-details | r-x40c0qx5 |
| built-output-defaults-to-dist | r-8h864ke8 |
| built-output-mirrors-the-source-layout | r-un786n7v |
| kit-produces-no-built-output | r-1bvvl9k7 |
| manifest-format-version-passes-through | r-dj86ixj8 |
| kit-completes-partial-source-manifests | r-11l92k9x |
| manifest-fields-are-validated-by-form | r-jl42pzah |
| uuids-are-claimed-once-in-a-workspace | r-xcz7nzr6 |
| uuids-compare-case-insensitively | r-fmkhgklz |
| manifest-corroborates-the-directory-kind | r-fghzi5qq |
| unresolvable-packs-fail-loudly | r-iby30nx1 |

Inline cross-references inside statements were rewritten from `r:<slug>` to the new ids
(`pack-discovery` → `r-x40c0qx5`; `pack-record-details` → `r-11l92k9x`;
`uuids-are-claimed-once-in-a-workspace` → `r-iby30nx1`; `unresolvable-packs-fail-loudly` →
`r-co6glnme`).

The old area/global bindings resolve to presets: dev-kit sat in the global `nodejs:libraries`
set, whose one requirement (`node-libraries-are-esm-typescript`) the `nodejs-library` preset now
carries — adopted here at version 1. No minecraft-area requirement bound dev-kit (the
`minecraft-addon-packs` set held only village-guard), so `minecraft-addon` is not adopted.

## Decisions (23 converted)

Status mapping: `accepted` carried (12); `tolerated` → `delegated` (11); `rejected` not
migrated (9). Old falsifiers carried as `revisit_when`.

| old slug | new id | old → new status |
|---|---|---|
| pack-locations-are-workspace-relative | d-s43hmdgr | accepted |
| entries-ordered-by-package-path | d-y4kgdkqk | tolerated → delegated |
| pnpm-marker-wins-npm-is-the-fallback | d-xnv5kh7k | accepted |
| a-package-with-no-source-manifest-yields-no-entry | d-39486z2s | accepted |
| unreadable-and-unparseable-manifests-are-one-problem | d-vn8mwr1d | accepted |
| empty-header-name-reads-as-unspecified | d-n2e2njf4 | accepted |
| only-format-version-3-restricts-version-form | d-r3gbrxre | tolerated → delegated |
| product-name-must-be-a-non-empty-string | d-n2kiacta | accepted |
| filtering-is-a-parameter-of-the-discovery-call | d-thhboim6 | accepted |
| the-pack-set-is-read-once-per-call | d-k7py0qqv | accepted |
| enumeration-failure-rejects-the-call | d-ydph1k7d | accepted |
| output-locations-are-computed-not-probed | d-6g8oo8je | tolerated → delegated |
| the-problem-code-set-is-closed | d-ed610d8c | accepted |
| invalid-entries-omit-only-manifest-derived-details | d-61fegb3o | accepted |
| entry-version-is-the-completed-package-version | d-f72ia08n | tolerated → delegated |
| relative-paths-are-posix-with-the-root-as-a-dot | d-fm9m41kc | accepted |
| a-nameless-package-is-named-by-its-directory | d-me8ieqnr | tolerated → delegated |
| manifest-shape-faults-are-one-problem | d-o0ebrog9 | tolerated → delegated |
| field-type-faults-reuse-the-shape-code | d-7ototrq5 | tolerated → delegated |
| a-form-fault-suppresses-the-checks-that-read-it | d-6w788t2t | tolerated → delegated |
| an-ambiguous-dependency-entry-is-a-problem | d-x0mb3mjg | tolerated → delegated |
| an-unsatisfied-dependency-names-both-readings | d-dba1hiu7 | tolerated → delegated |
| invalidity-propagates-to-a-fixpoint | d-dbf88op0 | tolerated → delegated |

## Not migrated: rejected decisions (9)

Never in force; git history keeps the record.

- the-kit-resolves-the-workspace-definition-itself
- a-package-fault-invalidates-only-its-own-packs
- a-pack-outside-any-workspace-package-is-reported-invalid
- only-a-missing-workspace-definition-throws
- node-modules-directories-are-never-candidates
- an-unconstrained-search-returns-every-valid-entry
- the-workspace-option-is-required
- the-completed-manifest-is-reported-as-a-plain-object
- modules-uuid-and-version-are-unmodelled

## Harvested from the retired spec (5 new decisions, delegated)

Constraints a consumer observes, or a reimplementation must preserve, that existed only in
spec prose:

| new id | title |
|---|---|
| d-rl1msrus | workspace defaults to the current directory |
| d-a8lgrojc | the exported surface |
| d-wytigz6u | the problem codes |
| d-cdbyhv6x | which libraries enumerate |
| d-mqdghcuf | criteria on absent values never match |

`d-a8lgrojc` and `d-wytigz6u` fix a public API surface; pinning them (`public-api`) is a
candidate ruling for this review — they enter unpinned because a conversion proposes no new
ratifications.

## Other dispositions

- `brief.md`: not migrated; history keeps it.
- `spec.md`: discarded after the shallow harvest above.
- `artifacts/*`: moved to `evidence/minecraft/dev-kit/`; the runs in
  `evidence/minecraft/dev-kit.yml` re-pointed there.
- The kit's TypeScript contract (`PackEntry`, `Problem`, `PackManifest`, …) is recorded as
  decision `d-a8lgrojc` rather than bound through a `model:` block: no pool schema or API
  surface for it exists yet.
