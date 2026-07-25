# mc-test-lib resting-state probes

A second Bedrock behavior pack for `minecraft/test-lib`. It answers two things the first pack
(`../engine-probe-pack`) did not: **what the engine populates on a freshly-created object**, and
**the residual gaps in facts whose claim outruns the observation behind it**. Each probe emits
observation lines — it reports what the engine did rather than asserting what it should do — and
its output is transcribed into `../../facts.yaml` the same way.

Group A exists to settle a design question larger than the dimension trio: whether
`no-implicit-defaults` (a bare fake carries nothing the caller did not ask for) faces a whole
family of fields the engine *always* populates, such that an empty fake is an impossible engine
state. The dimension probe is one member of that family; the entity, world, effect, and player
probes sample the rest.

## Install

1. Copy this folder into the world's or server's `behavior_packs/` directory (or import it via
   the usual pack tooling) and enable it on a world. No experiments are required: the script
   module targets stable `@minecraft/server` 2.8.0.
2. Cheats must be enabled (the commands are registered at `GameDirectors` permission).

This pack uses the `mctest2:` command namespace, so it can be enabled **alongside**
`engine-probe-pack` (`mctest:`) on the same world without colliding. The `[mctest]` line prefix is
shared deliberately, so one log filter collects both packs' output; probe names disambiguate.

## Run

As a player in the world:

```
/mctest2:rest
/mctest2:gaps
```

or, from the server console / as a fallback (optionally naming a single probe):

```
execute as <player> run scriptevent mctest2:rest
execute as <player> run scriptevent mctest2:gaps
execute as <player> run scriptevent mctest2:gaps effect-equal-duration-replacement
execute as <player> run scriptevent mctest2:rest resting-kinematics
```

Run the `scriptevent` form `execute as <player>` (or otherwise from inside the loaded ticking
area): a run driven from outside it fails with `LocationInUnloadedChunkError` when probes spawn.

Run `mctest2:rest` **as a player** if you can: `resting-player-fields` needs a triggering player
and reports that it was skipped when there is none (the console `scriptevent` path).

Probes spawn a few sheep, an arrow, and other cheap entities near the triggering source and
remove them afterward. Output lines look like:

```
[mctest] component-poor-entities :: minecraft:arrow count=3 zeroComponents=false components=[…]
```

Every line appears both in chat (`world.sendMessage`) and in the content log (`console.warn`), so
a dedicated server can collect them from the log file.

## What each probe closes

### Group A — resting state (`/mctest2:rest`)

| Probe | Target |
|---|---|
| `resting-entity-fields` | `no-implicit-defaults` (requirement): which entity fields — components, `nameTag`, `localizationKey`, `location`, `dimension.id`, rotation, velocity, `isValid`, and the four health-attribute values — the engine populates on a never-written sheep |
| `resting-kinematics` | whether resting `getRotation()`, `getVelocity()`, and `nameTag` are universal engine constants or type-dependent — `resting-entity-fields` measured them on a sheep only. Spawns one fresh instance of eight types (sheep, cow, chicken, zombie, armor stand, xp orb, arrow, boat), emits each field per type as full data plus a `nameTag` length, reports requested vs. actual `location` so engine adjustment is visible, and states uniformity per field. `resting-kinematics-after-2-ticks` re-samples each entity as a separate observation, so a velocity that is zero only on the spawn frame is distinguishable from one that rests at zero |
| `component-poor-entities` | `no-implicit-defaults`: whether a valid entity can carry **zero** components at all (arrow, armor stand, xp orb, item), reported as an explicit count |
| `vanilla-dimensions` | open question `vanilla-dimension-set-on-a-world`, and `namespace-prefix-is-optional` on the dimension surface: what `world.getDimension` returns for each vanilla id, prefixed and bare |
| `resting-world-fields` | `no-implicit-defaults` at world scope: `beforeEvents`, `afterEvents`, `scoreboard` (+ objective count), `seed`, `isHardcore`, `gameRules`, player count |
| `resting-effect-fields` | `no-implicit-defaults` on an owned object: the fields a live `Effect` always carries |
| `resting-player-fields` | `no-implicit-defaults` for players: the components a player carries that a bare sheep does not |

### Group B — gaps in existing facts (`/mctest2:gaps`)

| Probe | Fact it closes a gap in |
|---|---|
| `attribute-reset-guards` | `attribute-guard-classes-observed` — says "the resets", but only `resetToDefaultValue` was run; this adds `resetToMaxValue` and `resetToMinValue` |
| `kill-no-health-invalidation-timing` | `kill-no-health-behaviour` — says "immediately invalid" but sampled only after 4 ticks; this samples synchronously and once per tick for 5 ticks, so the transition tick is visible |
| `remove-event-sweep` | `kill-and-remove-cascades` — says `remove()` "fires no event at all", but only three signals were subscribed; this subscribes to every signal on `world.afterEvents` and reports the count subscribed alongside what fired |
| `invalidation-guard-reflected` | `invalidation-guard-list-complete` — claims a complete member list but was driven by a hand-written array; this enumerates the Entity prototype chain, partitions it at runtime, and reports per-bucket counts |
| `effect-equal-duration-replacement` | `effect-replacement-rule-observed` — says "(or equal) duration" with no equal-duration case run; the base decays first so a surviving base reads back *shorter* than the fresh application, making replacement observable at equal durations across higher, same, and lower amplifier |
| `namespace-prefix-other-surfaces` | `namespace-prefix-is-optional` — sourced on component ids only; this tries bare and prefixed forms on effect types, entity types at spawn, and entity event ids |

## Record the results

Copy the complete set of `[mctest]` lines into a file under `artifacts/`, alongside the run
provenance (game version, module version, pack version, trigger, coverage) the first pack's
results file records. A probe measures what the engine does; whether the fake should *match* that
is a design decision the probe cannot make.

Caveats:

- A **new custom command cannot be registered by `/reload`**, and a manifest version bump must be
  mirrored in `world_behavior_packs.json` — both bit the first pack's second run. Restart the
  server after installing, and check the boot `Pack Stack` lines before trusting a run.
- `remove-event-sweep` subscribes to every world after-event, so unrelated world activity appears
  in its output; lines are tagged `(ours)` / `(other)` by whether the payload references the
  probe's entity. Run it in a quiet world.
- `invalidation-guard-reflected` calls argument-taking methods with no arguments on a removed
  entity: an argument error rather than `InvalidEntityError` is itself the observation (the engine
  validated arguments before the validity guard), not a probe failure.
- Members the engine adds in a later `@minecraft/server` version appear automatically in the
  reflective probes, so a rerun on a newer module is worth doing rather than assuming the counts
  hold.
