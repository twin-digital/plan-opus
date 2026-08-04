# Conversion map: design/minecraft/server-shim → mc-test-lib increment 002

Working material for the conversion review. The legacy design was `exploring`, so this increment
enters as a draft, mid-Plan: the branch carries it until the owner ratifies and the merge gate
passes. The owner ruled `minecraft/server-shim` converts as a facet of `mc-test-lib` rather than
its own product — increment 001 carried `minecraft/test-lib` as the `fakes` facet; this increment
carries `minecraft/server-shim` as the `shim` facet `product.yaml` already declares. Maps every
entry of the legacy design to its converted id, and accounts for what was added by prior owner
ruling.

## Requirements (6 converted, all previously active)

Every entry carries `facets: shim`. Statements carry over verbatim; none held an inline
cross-reference, so nothing was rewritten. Verification procedures are authored for all —
new normative content, ratified by this review.

| old slug | new id |
|---|---|
| unmodified-pack-code-loads-under-test | r-vzz9rnrc |
| enum-values-come-from-the-pinned-declarations | r-29dlrp9r |
| instanceof-answers-for-a-fake | r-956kxrsc |
| module-singletons-are-test-controlled | r-rpm1k57j |
| shim-supplies-values-not-behaviour | r-9z0icbhi |
| a-consumer-suite-still-typechecks | r-4bgnaff8 |

## Requirements added by prior owner ruling (3)

The owner's ruling from the rejected shim spec cycle (July 2026) lifted three constraints into
requirements; `drafts/carry-forward.md` records the full ruling. None of the three was present in
the legacy `requirements.yaml`, so each enters here as a converted requirement rather than a Plan
proposal:

| new id | title |
|---|---|
| r-3dgnq0sp | one package |
| r-d5v1hzgp | instanceof answers by class identity |
| r-uobnqsfg | install is one runner-config entry |

`r-d5v1hzgp` was ruled to live in test-lib's requirements. Increment 001 does not carry it —
its closest entry, `r-28cg0y2h` (fakes are structurally assignable), is about type-level
assignability, not runtime class identity — so it lands here, in the same product's
requirements as ruled. It carries `facets: shim` like the rest; it also binds the `fakes`
facet's construction, which the Plan loop may re-facet.

`r-956kxrsc` (the converted instanceof requirement) states the observable answer;
`r-d5v1hzgp` states the identity basis behind it. Both stand.

## Presets

None adopted. server-shim sat in no set: the global `nodejs:libraries` set holds only
`how-to-plan/planning-lib`, the minecraft area declares no sets, and every minecraft-area
requirement is retired. The product already adopted `nodejs-library@1` at increment 001, which
the fold carries forward.

## Decisions

None. The legacy design was exploring and had no `decisions.yaml` and no `spec.md` to harvest;
the brief's content is motivation, scope, open questions, and tensions, none of it
decision-shaped. No `decisions.yaml` is created; the Plan loop will propose the first ones,
honouring `drafts/carry-forward.md`.

## Other dispositions

- `brief.md`: copied to `drafts/brief.md` — an exploring design keeps its argument as working
  material for this increment's Plan loop. Its prose still names legacy design paths
  (`minecraft/test-lib`, `minecraft/dev-kit`, `minecraft/dev-server`); the Plan loop rewrites it
  as it works. Its `evidence/minecraft/test-lib/pack-testing-survey.md` reference was re-pointed
  during the test-lib retirement and re-checked here: the file exists at that path.
- `artifacts/alias-shim-harness/`: moved to `evidence/minecraft/server-shim/alias-shim-harness/`.
  The two runs in `evidence/minecraft/pack-testing.yml` (`alias-shim-harness-run`,
  `alias-shim-control-run`) re-pointed there; the quotes their dependent facts carry
  (`f:alias-shim-runs-unmodified-pack-code`, `f:server-import-fails-without-an-alias`)
  re-verified verbatim against the moved outputs.
- No fact source cites a `design/minecraft/server-shim` path or entry; the run re-points above
  are the whole sweep.
- Root `products.yaml`: never held a server-shim slot; unchanged.
- `sets.yaml` files: no entry named server-shim; unchanged.
