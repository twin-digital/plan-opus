# Absorption map: mc-dev-server → mc-dev-kit

Working material for this increment's Plan loop. mc-dev-server and mc-dev-kit are one product:
the dev loop's entire input is the kit's pack set, and the boundary between them was carried by
eleven `f:dev-kit-*` facts that transcribe mc-dev-kit's own `requirements.yaml` into the facts
pool. This increment brings mc-dev-server's published requirements into the kit under a new
`dev-loop` facet, consolidated. The harness may still ship as its own package; the package set is
design work this increment does not do.

## Requirements (9 declared, from 11 absorbed)

| mc-dev-server id | title | new id |
|---|---|---|
| r-hay27p5n | one-command dev loop | r-8et233c9 |
| r-tdif5vwf | server lifecycle outlives the foreground | r-kfu7pcms |
| r-739ulzr0 | hosted packs are a selection | r-u8cg9vi6 |
| r-mty3gfy6 | deploy reconciles to built packs | r-pcq10f2b |
| r-gdsm5ykt | edit to live without disconnect | r-cekp2mcb |
| r-o1lozc1k | behavior packs required, other content optional | r-hpu39brj |
| r-582htwvl + r-zbrdnvnu | the pack/harness boundary | r-97fvutt9 |
| r-kts1e4fb | single-world scope | r-7lroj1cg |
| r-7fnwuaqz | remote Docker supported | r-whacwz1b |

New ids throughout: these are fresh declarations in this product, not amendments of another's.

## Consolidated

- **r-582htwvl + r-zbrdnvnu → r-97fvutt9.** Both stated one boundary from opposite sides —
  "a pack carries no deploy or publish scripts" and "the harness deploys built output and makes no
  assumption about how it was assembled." One requirement carries both, with both verification
  procedures.

## Not carried

- **r-ca9w2614 — packs discovered from the workspace.** Redundant inside this product. The kit's
  `r-zcdmh9p6` already fixes membership as source-manifest presence with "no marker field,
  keyword, or central list is required, and adding, removing, or renaming a pack needs no edit
  anywhere but the package itself"; `r-co6glnme` fixes the flat list of entries and `r-0l79om74`
  fixes discovery from a clean checkout with no build. The harness discovering packs *is* the
  kit's discovery, so the requirement restated a sibling design's guarantee across a boundary that
  no longer exists.
- **`pack-source-layout-is-fixed`** was retired before mc-dev-server increment 001 and never
  converted; its subject is settled by the kit's `r-zcdmh9p6` and `r-un786n7v`.

## Wording

Statements carry over substantively verbatim. Two changes for the new home: r-8et233c9 names the
harness once, so the term the other eight use has a referent inside this product; and r-u8cg9vi6
says "the packs the kit discovers" where the original said "the discovered packs", now that
discovery is this product's own requirement rather than an upstream fact.

## Facets

A `dev-loop` facet joins `discovery` and `build` in `product.yaml`. All nine requirements carry
it.

## Decisions (20 proposed)

The stranded cycle on `design/minecraft-dev-server` (tip c43cefe) proposed sixteen, harvested into
mc-dev-server's increment 002 draft (PR #168) and never ruled. They are re-entered here against
this product's own requirements. Five are new, one is reversed, one is dropped, and the rest carry
with their citations repointed.

### New

- **d-zyo6kku9 — the harness is its own package beside the library.** Where the package lands;
  `product.yaml` is descriptive, so the implementer declares it when its files exist.
- **d-ifke5eeh — start is idempotent against a running server.** `r-kfu7pcms` verifies that Ctrl+C
  leaves the server up and that the loop command reattaches, and the harvested set supplied no
  mechanism for it. Worse, `d-w8cc8n18` regenerates the compose file every run, and `up` against a
  changed project recreates the container — losing the world and disconnecting the client the
  requirement exists to protect.
- **d-imdfu09l — the project identity is derived from the workspace root.** `r-7lroj1cg`
  (single-world scope) was cited by no harvested decision, and the level name every activation
  write depends on was fixed nowhere.
- **d-n0dz38ky — a pool directory is replaced, not merged into.** A copy over a directory already
  in place merges, so a file deleted from the output tree would sit on the server indefinitely and
  `r-pcq10f2b` would not hold. `r-8xmkne8a` makes the output tree authoritative; this makes the
  pool match it.
- **d-oo8256gl — a pack occupies a pool directory named for its uuid.** The draft spec asserted it
  and no decision carried it, though `d-a9jaqn8m`'s presence-and-identity read depends on the pool
  directory name carrying identity.

### Reversed

- **d-cw6pder5 — activation entries are written from the pack set.** The harvested
  `activation-version-read-from-the-built-manifest` read the version from the built
  `manifest.json`, citing a fact whose own claim says the harness can "write its activation entry
  from the pack set alone, without reading a manifest." Inside this product that fact is
  `r-rlh87pau` and `r-kbgjy2pt`, which settle it: the entry is known from a clean checkout, so the
  harness reads no manifest and one failure path disappears.

### Rewritten on new evidence

- **d-ftlfhac8 — a reload is used only when the pack's file set is unchanged.** The harvested
  `live-reload-limited-to-active-behavior-pack-content` drew the cheap class around "a content
  change inside a behavior pack", conservatively, because the evidence did not separate a reload
  from the restart beside it. Increment 007's reload probe
  (`f:a-bedrock-script-reload-resolves-only-the-files-loaded-at-world-load`) measures the boundary:
  an edit to an already-loaded file reloads live, and a file first deployed after world load fails
  to resolve with the same error an absent file gives. The class is now the file set rather than
  the pack, which is both wider where the evidence allows and tighter where it does not — and the
  harness can evaluate it locally.

### Dropped

- **`changed-pack-set-is-an-input-to-the-reconcile`.** Internal function shape rather than an
  outcome a consumer observes or a reimplementation must preserve. What it made observable —
  an unchanged reconcile is a no-op, and startup deploys everything — is `r-pcq10f2b` and
  `d-a9jaqn8m`.

### Pinning

Proposed pinned: d-zyo6kku9 and d-0yrfifhi (`public-api` — the published name, the verbs, the
executable, the reset flag), d-wtziwjh5 (`public-api` — the one server-side knob), d-c1kvyord and
d-5e00ndwi (`data-format` — a checked-in config file and the per-line output prefix), d-zo2yl18y
(`data-format` — the volume the author's world lives in). The harvested set pinned two.

## Open questions (4 carried)

Three of the stranded cycle's five asked what the kit's API does. Inside this product those are the
kit's own requirements: the built-output location is `r-8h864ke8` and `r-un786n7v`, and how a build
is invoked is `r-hlnbi41r` — the kit ships no command line, so d-j3ayhwv1 runs the package's own
scripts. What remains:

| carried from | new id | subject |
|---|---|---|
| q-rtjmsq1r | q-gsr57mk0 | does an activation-list edit land without a restart |
| q-h2uaejbd | q-12jwzs0h | does any console command bring a newly pooled pack live |
| — | q-qk2r4e5q | does `cp`/`exec` read container-to-host against a remote daemon |
| — | q-h34y88go | the resource-pack activation list's name, location, and entry shape |

The last two are gaps the survey of this draft fold found unrecorded. q-qk2r4e5q gates d-q8ikxtdk,
whose every reconcile reads state off the container while the evidence in hand covers only the
host-to-container direction. q-h34y88go gates d-4iepnry2 and d-cw6pder5, which deploy resource
packs against a fact scoped to `world_behavior_packs.json`.

## Left for the Plan loop

- **The `f:dev-kit-*` facts.** Eleven facts in `facts/minecraft/bedrock-server.yml` source
  mc-dev-kit's own requirements. No decision here cites them any longer, so they are retired once
  mc-dev-server's own increments no longer do.
- **mc-dev-server itself.** Retiring the product is a separate change; this increment only adds.
