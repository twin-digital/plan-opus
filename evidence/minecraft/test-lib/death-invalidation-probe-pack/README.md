# mc-test-lib death-invalidation probes

A behavior pack for `minecraft/test-lib` that asks when a killed entity's reference turns invalid,
sampling **every tick** rather than by wall clock. It answers two open questions, one of which the
design currently rules on from a sample of one.

## Why

**The corpse boundary is unmeasured.** `f:death-invalidation-window` waited in wall-clock time and
found the reference valid at ~0.25s and invalid at ~1.25s, which is why its claim reads "valid for
at least ~7 ticks, turning invalid by ~27, the exact boundary unmeasured". That ~20-tick window is
an artifact of the sampling, not of the engine. The spec's coverage table carries
`invalidation of a mob's corpse after kill() | not modelled` because of it: the fake will not invent
a despawn tick it has not seen.

**The health-less rule generalizes from one type.** `f:kill-no-health-behaviour` observed an
**arrow** reading `isValid` false in the same statement sequence as `kill()`. The design now rules
that `kill()` invalidates *any* entity carrying no health component, and the library implements it,
so a snowball or an xp_orb that lingers would make that rule wrong for every type but the one that
was measured.

## Install

1. Copy this folder into the world's or server's `behavior_packs/` directory and enable it on a
   world. No experiments are required: the script module targets stable `@minecraft/server` 2.8.0.
2. Cheats must be enabled (the commands are registered at `GameDirectors` permission).

It uses the `mctest7:` command namespace, so it can be enabled alongside the earlier probe packs on
the same world. The `[mctest]` line prefix is shared deliberately, so one log filter collects every
pack's output; probe names disambiguate.

## Run

As a player in the world:

```
/mctest7:corpse
/mctest7:healthless
```

or from the server console:

```
execute as <player> run scriptevent mctest7:corpse
execute as <player> run scriptevent mctest7:healthless
```

Stand somewhere flat with room around you — subjects spawn on a grid offset from you, and the
corpse set spawns eight mobs at once. The corpse run takes roughly a minute (3 repeats × 60 ticks
of sampling plus settling); the health-less run is shorter.

## What each set answers

### `corpse` — `corpse-invalidation-boundary`

Spawns one of each of eight mob types, kills them **all in the same tick**, then reads `isValid` on
every subject once per tick for 60 ticks, recording the first tick each one answers false. The whole
sweep repeats three times.

Killing them together is what makes the types comparable: a difference between types cannot be a
difference in tick alignment. Repeating is what separates a constant from a draw.

Each subject also reports what the `entityDie` handler saw, which is the half
`f:death-invalidation-window` already pins — a working reference — so a run that contradicts it is
visible rather than silent.

Read the `SUMMARY HEADLINE` line:

- **one distinct first-invalid-tick** across every type and repeat → the boundary is a constant, and
  the fake could model it: `kill()` would schedule the invalidation N ticks out, `advanceTicks(N)`
  would make the corpse go stale, and the coverage row moves from *not modelled* to *modelled*.
- **one value per type, stable across repeats** → it is per-type vanilla data, which the design
  pushes to a package built on this one; the row stays *not modelled* and `invalidate()` remains how
  a test says it.
- **values that move between repeats** → the engine draws it, and modelling it would be inventing a
  number. The row stays as it is, and the reason in it gets sharper.
- **`none-within-60`** for a type → the corpse outlives the sampling window; rerun with a larger
  `SAMPLE_TICKS` before concluding anything.

### `healthless` — `healthless-kill-invalidation`

For each candidate health-less type: spawns it **well clear of any surface**, re-checks `isValid`,
confirms `getComponent('minecraft:health')` is `undefined` (so the type really belongs to the set),
calls `kill()`, reads `isValid` in the same statement sequence, and then samples five more ticks to
catch a late flip.

Subjects spawn `HEALTHLESS_SPAWN_HEIGHT` blocks above the source because these are projectiles.
Spawned at the source they strike it or the ground within a tick, and a subject that is already gone
cannot say whether `kill()` invalidates synchronously — its `isValid=false` would read as agreement
with the arrow while measuring nothing. The first run of this pack lost three of six types that way.

Three outcomes carry no evidence and are excluded from the headline rather than counted:

| Verdict | Meaning |
|---|---|
| `NOT-SUMMONABLE` | the type will not spawn at all — `minecraft:ender_pearl` sets `is_summonable` false |
| `SUBJECT-ALREADY-INVALID` | removed between spawn and kill, so the kill measures nothing |
| `HAS-HEALTH-COMPONENT` | the type has health and is not a member of the set |

`SUMMARY HEADLINE` reports `observed=` (the types that produced a usable case) alongside
`disagreeing-with-arrow=`. **The fact widens to the observed types only** — an unobserved type is not
evidence either way, and a `SUMMARY excluded=` line names each one and why. A non-empty disagreement
list means the library is wrong for those types, and the rule needs splitting further or narrowing
to what was actually observed.

## After running

Copy every `[mctest]` line into the design as evidence — the record is the raw lines, not a summary
of them. A fact drawn from this run cites it as a `run:` with a `where:` and a verbatim quote, per
the repository's evidence bar, and the corpse row's wording in `spec.md` follows whichever of the
four outcomes above the headline reports.
