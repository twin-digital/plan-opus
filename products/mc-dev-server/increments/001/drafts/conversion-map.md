# Conversion map: design/minecraft/dev-server → mc-dev-server increment 001

Working material for the conversion review. The legacy design was `exploring`, so this increment
enters as a draft, mid-Plan: the branch carries it until the owner ratifies and the merge gate
passes. Maps every entry of the legacy design to its converted id, and accounts for the entries
deliberately not migrated.

## Requirements (11 converted, all previously active)

| old slug | new id |
|---|---|
| one-command-dev-loop | r-hay27p5n |
| server-lifecycle-outlives-the-foreground | r-tdif5vwf |
| packs-discovered-from-workspace | r-ca9w2614 |
| hosted-packs-are-a-selection | r-739ulzr0 |
| deploy-reconciles-to-built-packs | r-mty3gfy6 |
| edit-to-live-without-disconnect | r-gdsm5ykt |
| behavior-packs-required-other-content-optional | r-o1lozc1k |
| deployment-is-not-a-pack-concern | r-582htwvl |
| built-output-assembly-is-the-package-s-concern | r-zbrdnvnu |
| single-world-scope | r-kts1e4fb |
| remote-docker-supported | r-7fnwuaqz |

Statements carry over verbatim; none held inline cross-references. Verification procedures are
authored for all 11 — new normative content, ratified by this review. Two are partial by nature:
`r-o1lozc1k` verifies only its mandatory half (optional support has nothing to check), and
`r-kts1e4fb` verifies the one-world shape of a run, not the scope exclusion.

## Not migrated

- `pack-source-layout-is-fixed` — the one `status: retired` requirement. Its own rationale
  records the retirement: source layout is `minecraft/dev-kit`'s concern, settled differently
  there. Git history keeps it.

## Presets

None adopted. dev-server sat in no set: the global `nodejs:libraries` set held `planning-lib`
and `test-lib`, the minecraft `minecraft-addon-packs` set held only `village-guard`, and no
area or global requirement named dev-server in `applies_to`. So neither `nodejs-library@1` nor
`minecraft-addon@1` bound it, and adopting either would bind requirements the owner never
applied to this design.

## Decisions

None. The legacy design was exploring and had no `decisions.yaml` and no `spec.md` to harvest;
the brief's content is motivation, dependency framing, and open questions, none of it
decision-shaped. No `decisions.yaml` is created; the Plan loop will propose the first ones.

## Other dispositions

- `brief.md`: copied to `drafts/brief.md` — an exploring design keeps its argument as working
  material for this increment's Plan loop. Its prose still names legacy slugs
  (`built-output-defaults-to-dist`, `minecraft/dev-kit`); the Plan loop rewrites it as it works.
- `artifacts/*` (activation-list-probe, compose-watch-probes, env-file-resolution): moved to
  `evidence/minecraft/dev-server/`; the runs in `evidence/minecraft/dev-server.yml` re-pointed
  there, quotes re-verified against the moved outputs.
- Fact prose in `facts/minecraft/bedrock-server.yml` naming `design/minecraft/dev-server/…`
  paths re-pointed to the evidence homes.
- Root `products.yaml`: the `mc-dev-server` slot's design converted; the slot is removed.
- `sets.yaml` files: no entry named dev-server; unchanged.
