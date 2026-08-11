# mc-test-lib entity-type registry probe

A headless Bedrock behavior pack and its driver, answering what `EntityTypes` reports — the
registry surface `mc-test-lib` declares and throws on, and that a pack asking "is this entity type
registered in this world" has to read.

Findings are in `RESULTS.md`; the final pass's raw log is `RUN.txt` and all passes are in
`OUTPUT.txt`.

## Run it

```
node run.mjs [runs]     # default 1
```

The driver brings up this directory's compose stack, copies `pack/` into the container's
`development_behavior_packs/`, writes the world's `world_behavior_packs.json`, restarts, waits for
`[etreg] boot :: ready`, then triggers `scriptevent etreg:registry` and waits for
`registry :: complete`. No client attaches: every observation reaches the container log through
`console.warn`.

## What the pack contains

- `pack/scripts/main.js` — the probe set. Readings are taken at three points a pack has: module
  evaluation, `system.beforeEvents.startup`, and after `world.afterEvents.worldLoad`.
- `pack/entities/probe_dummy.json` — a data module defining `mctest:probe_dummy`, so a
  pack-defined type is measured beside the vanilla ones.

## What each probe answers

| Probe | Question |
|---|---|
| `at-module-eval`, `at-event` | whether the registry answers at all from a pack's startup code, and from where it first does |
| `get` | what a registered id, a pack-defined id, an absent id, and four malformed ids return |
| `guard` | what wrong arity and wrong argument types do |
| `shape` | what an `EntityType` carries, and whether two lookups return the same object |
| `getall` | the count, whether pack-defined types appear, and whether entries are the objects `get` returns |
| `spawn` | whether a lookup hit and `dimension.spawnEntity` agree on the same id |

## Reading a run

A correct run has `registry :: begin`, `registry :: complete`, and no `PROBE CRASHED` line. The
`spawn` set needs the probe's own ticking area loaded: `tickingarea-list successCount=1` and
`platform … successCount=1` must both appear, or every spawn case reports
`LocationInUnloadedChunkError` and the set says nothing.
