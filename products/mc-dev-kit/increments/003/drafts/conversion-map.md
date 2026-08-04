# Conversion map: design/minecraft/pack-build → mc-dev-kit increment 002

Working material for the conversion review. The legacy design was `exploring`, so this increment
enters as a draft, mid-Plan: the branch carries it until the owner ratifies and the merge gate
passes. This is the second half of the `mc-dev-kit` facet merge — increment 001 carried
`minecraft/dev-kit` as the `discovery` facet; this increment carries `minecraft/pack-build` as
the `build` facet. Maps every entry of the legacy design to its converted id, and accounts for
the entries deliberately not migrated.

## Requirements (9 converted, all previously active)

Every entry carries `facets: build`.

| old slug | new id |
|---|---|
| build-ships-in-the-kit-package | r-gyrsw1mq |
| build-is-an-exported-bundler-config | r-if6t18ve |
| a-released-pack-is-an-archive-of-its-output-tree | r-e5bfrqzx |
| the-exported-config-is-documented | r-ifvxhl2p |
| script-module-is-bundled-with-game-modules-external | r-2alueo3d |
| every-pack-file-reaches-the-output-tree | r-umoo5i1i |
| assembly-is-authoritative-over-the-output-tree | r-8xmkne8a |
| rebuild-triggers-are-declared-not-inferred | r-wsv90bxm |
| the-package-version-is-the-pack-version | r-kbgjy2pt |

Statements carry over verbatim; none held an inline `r:<slug>` cross-reference, so nothing was
rewritten. `r-gyrsw1mq`'s statement names `minecraft/dev-kit` in prose — the design that is now
this product's `discovery` facet, increment 001. Verification procedures are authored for all 9 —
new normative content, ratified by this review.

## Presets

None adopted. pack-build sat in no set: the global `nodejs:libraries` set holds `planning-lib`
and `test-lib`, the minecraft area declares no sets, and no area or global requirement named
pack-build in `applies_to` (the retired minecraft-area requirements bound the pack set's
members — packs consuming this toolchain, not the toolchain itself). The product already adopted
`nodejs-library@1` at increment 001, which the fold carries forward.

## Decisions

None. The legacy design was exploring and had no `decisions.yaml` and no `spec.md` to harvest;
the brief's content is motivation, scope, open questions, and tensions, none of it
decision-shaped. No `decisions.yaml` is created; the Plan loop will propose the first ones.

## Other dispositions

- `brief.md`: copied to `drafts/brief.md` — an exploring design keeps its argument as working
  material for this increment's Plan loop. Its prose still names legacy design paths
  (`minecraft/dev-kit`, `minecraft/dev-server`); the Plan loop rewrites it as it works.
- No `artifacts/` existed; nothing moves to `evidence/`.
- No fact source, run, or implementation cites a `design/minecraft/pack-build` path or entry;
  the sweep found nothing to re-point.
- Root `products.yaml`: the `mc-dev-kit` entry's `build:` slot was its last; the entry and its
  comment are removed.
- `sets.yaml` files: no entry named pack-build; unchanged.
