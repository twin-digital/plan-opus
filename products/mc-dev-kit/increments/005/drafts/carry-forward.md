# Carry-forward: the scriptOutput amendment, from PR #123 thread 3674443094

Working material for this increment's Plan loop. In PR #123 (branch `design/minecraft-pack-build`,
tip `afd5881`) the owner ruled, in review thread 3674443094, that reporting a pack's built script
location belongs in the dev kit: "Yes, this should be part of dev-kit. In this PR, make the
necessary changes to that spec…". The branch carried that ruling as edits to the retired legacy
`design/minecraft/dev-kit` (commits `d303246`, `10fa480`, `661344a`); increment 004's
carry-forward routed the material here. The thread ruled the *direction* — the entries below are
this increment's proposals of it, and each needs ratification on its own.

## What each entry proposes

- `r-rlh87pau` (amends `r-x40c0qx5`): the pack record gains its built script location — where a
  behavior pack's bundled script module belongs, present even when unbuilt, absent for a resource
  pack. Branch wording, ids translated via increment 001's conversion map.
- `r-5qo6fzs4` (new, fiat): the built script is `scripts/main.js` within the pack's build output
  location, computed from the kind rather than read from the manifest, probing no source tree.
  The branch's `built-script-defaults-to-scripts-main-js`, filed there as a requirement so the
  dependent build design can write a fact against it.
- `d-jewbwtye` (proposed): `scriptOutput` is `string | null` on every entry — `null` where there is
  no script location, never an omitted field — so `d-61fegb3o`'s rule that an invalid entry omits
  only manifest-derived details still holds. The branch's
  `an-absent-script-location-is-null-not-a-missing-field`, never ruled there.
- `d-9se0yv0h` (proposed): `ManifestModule` declares `entry?: string` and form-checks it (a
  non-string is `manifest-shape-invalid`), and nothing reads it, so a fault there suppresses
  nothing downstream. The branch carried this as spec mechanics under
  `r:manifest-fields-are-validated-by-form`; here it is a decision of its own.
- `q-fcuue13t` (answer: requirement): what happens when a source manifest names its own script
  `entry`. Closing the gap adds `entry` to the fields `r-11l92k9x` forbids a partial source
  manifest to specify; honoring the manifest instead softens that requirement. The #123-cycle
  agent correctly stopped on this as the owner's call, and it stays the owner's here.

## Facts: ported and held

The branch's `facts/minecraft/dev-kit.yml` was held out of the 004 harvest because its sources
named the retired legacy spec. This increment files the entries whose sources re-point to
surviving text — the published increments' requirements, quotes re-verified verbatim:

- `dev-kit-library-is-published-as-mc-dev-kit` (r-jvb29tpu)
- `dev-kit-discovery-returns-the-whole-workspace-set-unfiltered` (r-7v7o1jy8, r-co6glnme; the
  branch's second source, the retired spec's "returns the whole of it" line, is replaced by
  r-co6glnme's flat-list sentence)
- `dev-kit-completes-a-workspace-dependency-version-from-the-owning-package` (r-11l92k9x)
- `pack-sources-sit-at-fixed-kind-named-directories` (r-zcdmh9p6)

Still held, not filed:

- `dev-kit-reports-a-packs-script-output-location` — its subject is exactly what this increment
  proposes, so it lands only if `r-rlh87pau` and `r-5qo6fzs4` ratify; filing it now would state
  the amendment as if ruled. Re-point it to this increment's requirements after publication.
- `dev-kit-types-the-completed-manifests-dependency-entries` — its quotes were the retired spec's
  interface listings (`PackManifest`, the `ManifestDependency` union); no surviving text carries
  the claim's shape detail ("an optional array of entries each carrying exactly one of `uuid` or
  `module_name` alongside a `version`") verbatim. The nearest survivors are the unpinned surface
  decisions `d-a8lgrojc` and `d-x0mb3mjg`, whose text does not carry it.
- `dev-kit-pack-entry-paths-are-workspace-relative` — half its support was the retired spec's
  `PackEntryBase` field listing; what survives says sourceDir/outputDir are workspace-relative
  (`d-s43hmdgr`) but nothing states `packageDir`'s anchor, and the packageName-basename fallback
  survives only in the delegated `d-me8ieqnr`. Not a clean re-point; a consumer loop
  re-establishes what it needs.

## Review rulings applied

The source-manifest question resolved as an error: `r-wi7qf6to` amends the completion
requirement with the `modules[].entry` must-not line, and `d-9se0yv0h` follows it. Both
decisions ruled delegated. The four ported dev-kit facts were removed — each existed only to
let sibling designs cite dev-kit behavior across the legacy design fence, nothing cites them,
and same-product entries cite requirements directly; the three held facts stay unported for
the same reason.
