# mctest death-invalidation probe results

Observed output from running `death-invalidation-probe-pack` against a real Bedrock dedicated
server: `mctest7:corpse` (how many ticks after `kill()` does the corpse go invalid?) and
`mctest7:healthless` (does the arrow's synchronous invalidation generalise to every health-less
type?). Each set was run three times, and each set repeats its own sweep three times internally.
The probes report what the engine did; nothing here is an assertion about what the fake should do.

## Run provenance

| | |
|---|---|
| Date | 2026-07-28 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `death-invalidation-probe-pack` 0.1.0, uuid `b5c058e6-a95f-438f-a921-30dbdcb1e1af` |
| Trigger | `execute as <armor stand> run scriptevent mctest7:<set>` from the server console |
| Source | stationary armor stand at `(38.5, 81, 22.5)`, centred on a 17×17 stone platform inside the `mctest` ticking area |
| Coverage | 3 × each set, no `PROBE CRASHED` lines, every `complete` line present |

Installed alongside the eight earlier packs and loaded as `[08] mc-test-lib death-invalidation
probes`.

## `corpse` — the boundary is a constant at 21 ticks

**72 observations** (8 mob types × 3 internal repeats × 3 runs) and **every one reads
`first-invalid-tick=21`.** `distinct-first-invalid-ticks=["21"]` and
`uniform-across-types-and-repeats=true` in all three runs.

Against the outcomes the README committed to in advance, this is the first case: **one distinct tick
everywhere → a constant, and modellable.** `kill()` schedules the invalidation and `advanceTicks(N)`
makes the corpse go stale at N ≥ 21. The row moves to modelled.

The same-tick design held: within each repeat all eight types share one `kill-tick`
(`336318`, `336386`, `336454` in run 1), so the uniformity cannot be tick alignment — the eight
types were killed in the same tick and went invalid in the same tick.

Two corroborations of the existing record, also 72/72:

- `synchronous-isValid=true` — the corpse is still valid in the statement after `kill()`.
- `inside-die-handler-isValid=true` — and still valid inside its own `entityDie` handler, which is
  what `f:death-invalidation-window` already recorded.

Nothing here contradicts the existing fact. Its wall-clock bound was "valid at ~7 ticks, invalid by
~27"; 21 sits inside that window and replaces it with an exact figure.

## `healthless` — the widening is to two types, not six

The headline line reads:

```
HEADLINE types=6 disagreeing-with-arrow=1 cases=["minecraft:ender_pearl=[]"]
```

**Taken at face value this reads as 5 of 6 types confirmed. The run does not support that.** Only
two of the six types were measured at all. The per-type pre-check — which the design requires,
since a type must be confirmed health-less before its kill means anything — separates them:

| type | pre-check `getComponent('minecraft:health')` | `kill()` | evidence? |
|---|---|---|---|
| `minecraft:arrow` | `ok value=undefined` — health-less, 9/9 | `ok value=true` | **yes** |
| `minecraft:xp_orb` | `ok value=undefined` — health-less, 9/9 | `ok value=true` | **yes** |
| `minecraft:snowball` | **threw `InvalidEntityError`**, 9/9 | **threw** | no |
| `minecraft:egg` | **threw `InvalidEntityError`**, 9/9 | **threw** | no |
| `minecraft:xp_bottle` | **threw `InvalidEntityError`**, 9/9 | **threw** | no |
| `minecraft:ender_pearl` | never spawned, 9/9 | — | no |

Three of the six were **already invalid before the probe touched them**. Their pre-check threw
`"Failed to call function 'getComponent' due to Entity being invalid (has the Entity been
removed?)"`, and `kill()` itself then threw the same error — 27 of the 45 kill attempts across the
three runs threw rather than returning. Their `synchronous-isValid=false` is therefore **trivially
true**: the entity was gone before the kill, so the reading says nothing about whether `kill()`
invalidates synchronously. These are projectiles spawned at the source location, which collide with
the source or the platform and are removed within the same tick — the same failure mode that
produced two false contradictions in the earlier damage pack.

`minecraft:ender_pearl` is not a disagreement either. It never spawned:
`"'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition
file)"`. An unspawnable type contributes no observation, and the empty list `[]` being counted in
`disagreeing-with-arrow` overstates the count in one direction while the three pre-invalidated types
overstate the evidence in the other.

**What the run does support:** `arrow` and `xp_orb` are both confirmed health-less, both killed
successfully, and both read `synchronous-isValid=false` with `tick+1..5=[false × 5]` in 9/9
observations each. The fact widens **from one type to two**. Four types remain unobserved.

To close the remaining four, a rerun needs the projectile subjects spawned clear of the source and
of any surface they can strike — the fix that worked for the isolated no-health rerun — and
`ender_pearl` replaced with a summonable type.

## Run-validity notes

- **`n = 3` externally on top of each set's 3 internal repeats**, so 72 corpse observations and 9
  per healthless type. The corpse figure is identical across all of them.
- **`kill()` threw on 27 of 45 healthless attempts.** That is the three pre-invalidated types, not
  a failure of the probe harness; each is logged with its error rather than silently skipped.
- **The `/mctest7:corpse` and `/mctest7:healthless` slash commands are unexercised.** Both sets ran
  through the `scriptevent` fallback, so the custom-command path is only known not to have thrown at
  registration — the residual every pack in this series carries.
- **No player was connected.** Neither set reads a player.
- The corpse sweep spawns eight mobs at one point and they interpenetrate; that affects where they
  stand, not when they invalidate, and the 72/72 agreement across types rules out any positional
  influence on the boundary.

## Raw logs — `mctest7:corpse`

### corpse run 1

```
[2026-07-28 23:56:53.984] [mctest] corpse start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-28 23:56:53.984] [mctest] corpse-invalidation-boundary :: 8 mob types × 3 repeats, isValid sampled every tick for 60 ticks after kill(). first-invalid-tick is the answer; f:death-invalidation-window bounded it only as "valid at ~7, invalid by ~27" from wall-clock waits
[2026-07-28 23:56:57.184] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:sheep id=-128849018878 kill ok value=boolean:true kill-tick=336318 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:56:57.184] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:cow id=-128849018877 kill ok value=boolean:true kill-tick=336318 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:56:57.184] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:pig id=-128849018876 kill ok value=boolean:true kill-tick=336318 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:56:57.184] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:chicken id=-128849018875 kill ok value=boolean:true kill-tick=336318 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:56:57.184] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:zombie id=-128849018874 kill ok value=boolean:true kill-tick=336318 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:56:57.184] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:skeleton id=-128849018873 kill ok value=boolean:true kill-tick=336318 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:56:57.184] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:creeper id=-128849018872 kill ok value=boolean:true kill-tick=336318 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:56:57.184] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:villager_v2 id=-128849018871 kill ok value=boolean:true kill-tick=336318 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:00.578] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:sheep id=-128849018861 kill ok value=boolean:true kill-tick=336386 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:00.578] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:cow id=-128849018860 kill ok value=boolean:true kill-tick=336386 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:00.578] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:pig id=-128849018859 kill ok value=boolean:true kill-tick=336386 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:00.578] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:chicken id=-128849018858 kill ok value=boolean:true kill-tick=336386 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:00.578] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:zombie id=-128849018857 kill ok value=boolean:true kill-tick=336386 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:00.578] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:skeleton id=-128849018856 kill ok value=boolean:true kill-tick=336386 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:00.579] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:creeper id=-128849018855 kill ok value=boolean:true kill-tick=336386 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:00.579] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:villager_v2 id=-128849018854 kill ok value=boolean:true kill-tick=336386 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:03.983] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:sheep id=-128849018846 kill ok value=boolean:true kill-tick=336454 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:03.983] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:cow id=-128849018845 kill ok value=boolean:true kill-tick=336454 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:03.983] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:pig id=-128849018844 kill ok value=boolean:true kill-tick=336454 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:03.983] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:chicken id=-128849018843 kill ok value=boolean:true kill-tick=336454 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:03.984] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:zombie id=-128849018842 kill ok value=boolean:true kill-tick=336454 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:03.984] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:skeleton id=-128849018841 kill ok value=boolean:true kill-tick=336454 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:03.984] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:creeper id=-128849018840 kill ok value=boolean:true kill-tick=336454 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:03.984] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:villager_v2 id=-128849018839 kill ok value=boolean:true kill-tick=336454 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:sheep first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:cow first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:pig first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:chicken first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:zombie first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:skeleton first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:creeper first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:villager_v2 first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-28 23:57:04.184] [mctest] corpse-invalidation-boundary :: SUMMARY HEADLINE observations=24 distinct-first-invalid-ticks=["21"] uniform-across-types-and-repeats=true — one value here means the boundary is a constant the fake could model; several mean it is per-type or drawn per death
[2026-07-28 23:57:04.283] [mctest] corpse complete — copy every [mctest] line into the design as the answer record
```

### corpse run 2

```
[2026-07-29 00:01:03.434] [mctest] corpse start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-29 00:01:03.434] [mctest] corpse-invalidation-boundary :: 8 mob types × 3 repeats, isValid sampled every tick for 60 ticks after kill(). first-invalid-tick is the answer; f:death-invalidation-window bounded it only as "valid at ~7, invalid by ~27" from wall-clock waits
[2026-07-29 00:01:06.628] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:sheep id=-128849018809 kill ok value=boolean:true kill-tick=341307 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:06.628] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:cow id=-128849018808 kill ok value=boolean:true kill-tick=341307 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:06.628] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:pig id=-128849018807 kill ok value=boolean:true kill-tick=341307 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:06.628] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:chicken id=-128849018806 kill ok value=boolean:true kill-tick=341307 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:06.628] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:zombie id=-128849018805 kill ok value=boolean:true kill-tick=341307 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:06.628] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:skeleton id=-128849018804 kill ok value=boolean:true kill-tick=341307 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:06.628] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:creeper id=-128849018803 kill ok value=boolean:true kill-tick=341307 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:06.628] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:villager_v2 id=-128849018802 kill ok value=boolean:true kill-tick=341307 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:10.033] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:sheep id=-128849018793 kill ok value=boolean:true kill-tick=341375 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:10.033] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:cow id=-128849018792 kill ok value=boolean:true kill-tick=341375 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:10.033] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:pig id=-128849018791 kill ok value=boolean:true kill-tick=341375 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:10.033] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:chicken id=-128849018790 kill ok value=boolean:true kill-tick=341375 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:10.033] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:zombie id=-128849018789 kill ok value=boolean:true kill-tick=341375 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:10.033] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:skeleton id=-128849018788 kill ok value=boolean:true kill-tick=341375 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:10.033] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:creeper id=-128849018787 kill ok value=boolean:true kill-tick=341375 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:10.033] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:villager_v2 id=-128849018786 kill ok value=boolean:true kill-tick=341375 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.433] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:sheep id=-128849018776 kill ok value=boolean:true kill-tick=341443 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.434] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:cow id=-128849018775 kill ok value=boolean:true kill-tick=341443 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.434] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:pig id=-128849018774 kill ok value=boolean:true kill-tick=341443 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.434] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:chicken id=-128849018773 kill ok value=boolean:true kill-tick=341443 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.434] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:zombie id=-128849018772 kill ok value=boolean:true kill-tick=341443 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.434] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:skeleton id=-128849018771 kill ok value=boolean:true kill-tick=341443 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.434] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:creeper id=-128849018770 kill ok value=boolean:true kill-tick=341443 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.434] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:villager_v2 id=-128849018769 kill ok value=boolean:true kill-tick=341443 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:01:13.628] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:sheep first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:01:13.628] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:cow first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:01:13.628] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:pig first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:01:13.628] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:chicken first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:01:13.628] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:zombie first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:01:13.628] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:skeleton first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:01:13.629] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:creeper first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:01:13.629] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:villager_v2 first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:01:13.629] [mctest] corpse-invalidation-boundary :: SUMMARY HEADLINE observations=24 distinct-first-invalid-ticks=["21"] uniform-across-types-and-repeats=true — one value here means the boundary is a constant the fake could model; several mean it is per-type or drawn per death
[2026-07-29 00:01:13.728] [mctest] corpse complete — copy every [mctest] line into the design as the answer record
```

### corpse run 3

```
[2026-07-29 00:04:03.479] [mctest] corpse start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-29 00:04:03.479] [mctest] corpse-invalidation-boundary :: 8 mob types × 3 repeats, isValid sampled every tick for 60 ticks after kill(). first-invalid-tick is the answer; f:death-invalidation-window bounded it only as "valid at ~7, invalid by ~27" from wall-clock waits
[2026-07-29 00:04:06.684] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:sheep id=-128849018734 kill ok value=boolean:true kill-tick=344908 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:06.684] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:cow id=-128849018733 kill ok value=boolean:true kill-tick=344908 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:06.684] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:pig id=-128849018732 kill ok value=boolean:true kill-tick=344908 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:06.684] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:chicken id=-128849018731 kill ok value=boolean:true kill-tick=344908 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:06.684] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:zombie id=-128849018730 kill ok value=boolean:true kill-tick=344908 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:06.684] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:skeleton id=-128849018729 kill ok value=boolean:true kill-tick=344908 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:06.684] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:creeper id=-128849018728 kill ok value=boolean:true kill-tick=344908 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:06.684] [mctest] corpse-invalidation-boundary :: [repeat=1] type=minecraft:villager_v2 id=-128849018727 kill ok value=boolean:true kill-tick=344908 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:10.079] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:sheep id=-128849018717 kill ok value=boolean:true kill-tick=344976 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:10.079] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:cow id=-128849018716 kill ok value=boolean:true kill-tick=344976 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:10.079] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:pig id=-128849018715 kill ok value=boolean:true kill-tick=344976 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:10.079] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:chicken id=-128849018714 kill ok value=boolean:true kill-tick=344976 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:10.079] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:zombie id=-128849018713 kill ok value=boolean:true kill-tick=344976 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:10.079] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:skeleton id=-128849018712 kill ok value=boolean:true kill-tick=344976 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:10.079] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:creeper id=-128849018711 kill ok value=boolean:true kill-tick=344976 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:10.079] [mctest] corpse-invalidation-boundary :: [repeat=2] type=minecraft:villager_v2 id=-128849018710 kill ok value=boolean:true kill-tick=344976 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.478] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:sheep id=-128849018699 kill ok value=boolean:true kill-tick=345044 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.478] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:cow id=-128849018698 kill ok value=boolean:true kill-tick=345044 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.478] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:pig id=-128849018697 kill ok value=boolean:true kill-tick=345044 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.479] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:chicken id=-128849018696 kill ok value=boolean:true kill-tick=345044 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.479] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:zombie id=-128849018695 kill ok value=boolean:true kill-tick=345044 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.479] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:skeleton id=-128849018694 kill ok value=boolean:true kill-tick=345044 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.479] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:creeper id=-128849018693 kill ok value=boolean:true kill-tick=345044 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.479] [mctest] corpse-invalidation-boundary :: [repeat=3] type=minecraft:villager_v2 id=-128849018692 kill ok value=boolean:true kill-tick=345044 synchronous-isValid=true inside-die-handler-isValid=true first-invalid-tick=21
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:sheep first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:cow first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:pig first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:chicken first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:zombie first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:skeleton first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:creeper first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY type=minecraft:villager_v2 first-invalid-ticks=[21,21,21] deterministic-across-repeats=true
[2026-07-29 00:04:13.684] [mctest] corpse-invalidation-boundary :: SUMMARY HEADLINE observations=24 distinct-first-invalid-ticks=["21"] uniform-across-types-and-repeats=true — one value here means the boundary is a constant the fake could model; several mean it is per-type or drawn per death
[2026-07-29 00:04:13.784] [mctest] corpse complete — copy every [mctest] line into the design as the answer record
```

## Raw logs — `mctest7:healthless`

### healthless run 1

```
[2026-07-28 23:59:17.084] [mctest] healthless start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-28 23:59:17.084] [mctest] healthless-kill-invalidation :: 6 expected-health-less types × 3 repeats. health-component=undefined confirms the type belongs to the set; synchronous-isValid=false is the arrow behaviour the design generalized from
[2026-07-28 23:59:17.428] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:arrow id=-128849018830 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:17.878] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:snowball id=-128849018829 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:18.333] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:egg id=-128849018828 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:18.429] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-28 23:59:18.783] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:xp_orb id=-128849018827 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:19.229] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:xp_bottle id=-128849018826 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:19.678] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:arrow id=-128849018824 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:20.128] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:snowball id=-128849018823 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:20.584] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:egg id=-128849018822 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:20.679] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-28 23:59:21.033] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:xp_orb id=-128849018821 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:21.478] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:xp_bottle id=-128849018820 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:21.928] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:arrow id=-128849018817 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:22.378] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:snowball id=-128849018816 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:22.834] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:egg id=-128849018815 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:22.929] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-28 23:59:23.284] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:xp_orb id=-128849018814 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:23.729] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:xp_bottle id=-128849018813 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-28 23:59:23.833] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:arrow synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-28 23:59:23.833] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:snowball synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-28 23:59:23.833] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:egg synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-28 23:59:23.833] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:ender_pearl synchronous-isValid=[] matches-arrow=false
[2026-07-28 23:59:23.833] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:xp_orb synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-28 23:59:23.833] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:xp_bottle synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-28 23:59:23.833] [mctest] healthless-kill-invalidation :: SUMMARY HEADLINE types=6 disagreeing-with-arrow=1 cases=["minecraft:ender_pearl=[]"] — an empty list means the synchronous invalidation generalizes and the design may keep one rule for every health-less type
[2026-07-28 23:59:23.929] [mctest] healthless complete — copy every [mctest] line into the design as the answer record
```

### healthless run 2

```
[2026-07-29 00:02:58.534] [mctest] healthless start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-29 00:02:58.534] [mctest] healthless-kill-invalidation :: 6 expected-health-less types × 3 repeats. health-component=undefined confirms the type belongs to the set; synchronous-isValid=false is the arrow behaviour the design generalized from
[2026-07-29 00:02:58.878] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:arrow id=-128849018759 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:02:59.328] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:snowball id=-128849018758 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:02:59.783] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:egg id=-128849018757 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:02:59.878] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-29 00:03:00.228] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:xp_orb id=-128849018756 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:00.683] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:xp_bottle id=-128849018755 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:01.129] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:arrow id=-128849018751 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:01.578] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:snowball id=-128849018750 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:02.034] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:egg id=-128849018749 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:02.129] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-29 00:03:02.479] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:xp_orb id=-128849018748 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:02.933] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:xp_bottle id=-128849018747 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:03.378] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:arrow id=-128849018744 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:03.828] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:snowball id=-128849018743 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:04.283] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:egg id=-128849018742 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:04.378] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-29 00:03:04.728] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:xp_orb id=-128849018740 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:05.183] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:xp_bottle id=-128849018739 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:03:05.283] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:arrow synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:03:05.283] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:snowball synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:03:05.283] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:egg synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:03:05.283] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:ender_pearl synchronous-isValid=[] matches-arrow=false
[2026-07-29 00:03:05.283] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:xp_orb synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:03:05.284] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:xp_bottle synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:03:05.284] [mctest] healthless-kill-invalidation :: SUMMARY HEADLINE types=6 disagreeing-with-arrow=1 cases=["minecraft:ender_pearl=[]"] — an empty list means the synchronous invalidation generalizes and the design may keep one rule for every health-less type
[2026-07-29 00:03:05.379] [mctest] healthless complete — copy every [mctest] line into the design as the answer record
```

### healthless run 3

```
[2026-07-29 00:05:58.634] [mctest] healthless start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-29 00:05:58.634] [mctest] healthless-kill-invalidation :: 6 expected-health-less types × 3 repeats. health-component=undefined confirms the type belongs to the set; synchronous-isValid=false is the arrow behaviour the design generalized from
[2026-07-29 00:05:58.979] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:arrow id=-128849018679 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:05:59.428] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:snowball id=-128849018678 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:05:59.883] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:egg id=-128849018677 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:05:59.979] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-29 00:06:00.334] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:xp_orb id=-128849018676 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:00.784] [mctest] healthless-kill-invalidation :: [repeat=1] type=minecraft:xp_bottle id=-128849018675 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:01.229] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:arrow id=-128849018672 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:01.678] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:snowball id=-128849018671 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:02.134] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:egg id=-128849018670 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:02.229] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-29 00:06:02.584] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:xp_orb id=-128849018669 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:03.034] [mctest] healthless-kill-invalidation :: [repeat=2] type=minecraft:xp_bottle id=-128849018668 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:03.479] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:arrow id=-128849018665 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:03.929] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:snowball id=-128849018664 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:04.383] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:egg id=-128849018663 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:04.479] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:ender_pearl SPAWN FAILED threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:ender_pearl' is not summonable (is_summonable is set to false in the entity definition file)."
[2026-07-29 00:06:04.834] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:xp_orb id=-128849018662 health-component=ok value=undefined kill ok value=boolean:true synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:05.283] [mctest] healthless-kill-invalidation :: [repeat=3] type=minecraft:xp_bottle id=-128849018661 health-component=threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." kill threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." synchronous-isValid=false tick+1..5=[false,false,false,false,false]
[2026-07-29 00:06:05.383] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:arrow synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:06:05.383] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:snowball synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:06:05.383] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:egg synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:06:05.383] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:ender_pearl synchronous-isValid=[] matches-arrow=false
[2026-07-29 00:06:05.383] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:xp_orb synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:06:05.383] [mctest] healthless-kill-invalidation :: SUMMARY type=minecraft:xp_bottle synchronous-isValid=[false,false,false] matches-arrow=true
[2026-07-29 00:06:05.383] [mctest] healthless-kill-invalidation :: SUMMARY HEADLINE types=6 disagreeing-with-arrow=1 cases=["minecraft:ender_pearl=[]"] — an empty list means the synchronous invalidation generalizes and the design may keep one rule for every health-less type
[2026-07-29 00:06:05.479] [mctest] healthless complete — copy every [mctest] line into the design as the answer record
```

