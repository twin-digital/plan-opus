# Conversion map: design/minecraft/village-guard → village-guard increment 001

Working material for the conversion review. Maps every entry of the legacy design to its
converted id. The legacy design was `exploring`, so this increment enters as a draft, mid-Plan:
nothing here is ratified until the increment's pull request merges.

## Requirements (5 converted, all previously awaiting ratification)

| old slug | new id |
|---|---|
| the-whole-village-is-protected | r-1nxm8bg4 |
| protection-survives-ordinary-play | r-uyqd39on |
| protected-villagers-are-not-converted | r-9gw909jf |
| the-pack-changes-nothing-else | r-g8trct40 |
| installable-on-any-vanilla-world | r-cizmztsh |

Statements carry over verbatim; no statement cross-referenced another. Verification procedures
were authored for all five at conversion — none is self-verifying — and are new normative
content ratified with this increment.

## Preset adoption

The old minecraft-area requirements bound village-guard through the `minecraft-addon-packs`
set; the merged `minecraft-addon` preset now carries them, adopted here at version 1.
Village-guard sat in no global set (`nodejs:libraries` never held it), so no other preset is
adopted.

Four legacy requirements existed only to bind that set, and the preset carries every one: the
three at minecraft area scope (`r-odoqiqo3`, `r-r316qhk6`, `r-hear6pun`) and the global
`package-config-is-repo-kit-managed` (`r-wh01d5cg`). With village-guard out of the legacy tree
they are retired in place — `design/minecraft/requirements.yaml` and `design/requirements.yaml`
— and the emptied set's `design/minecraft/sets.yaml` is removed.

## Decisions

The legacy design held none — no decisions, no spec, no artifacts. Nothing to migrate or
harvest.

## Other dispositions

- `brief.md`: copied to `drafts/brief.md` — the design is still mid-Plan, so the brief stays
  working material rather than history.
- No fact or run cites a `design/minecraft/village-guard` path; mentions of
  `@twin-digital/village-guard` in `facts/minecraft/packs.yml` and
  `evidence/minecraft/dev-kit/` are the npm package name inside captured probe output, and are
  untouched.
