# mctest guard-and-effect probe results

Observed output from running `guard-and-effect-probe-pack` against a real Bedrock dedicated
server: the `mctest3:guards` set (do the arity-blocked methods carry an invalidation guard once
called with correct arguments?) and the `mctest3:effects` set (is effect replacement compared
against the duration *remaining* or the duration *originally applied*?). Each set was run three
times. The probes report what the engine did; nothing here is an assertion about what the fake
should do.

## Run provenance

| | |
|---|---|
| Date | 2026-07-27 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `guard-and-effect-probe-pack` 0.1.0, uuid `2dd3e74b-f52c-4e93-ba18-2a5d4f3f2de2` |
| Pack source | branch `design/minecraft-test-lib` at `7eab9c9`; verified byte-identical at branch tip `7edbe03` |
| Trigger | `execute as <armor stand> run scriptevent mctest3:guards` / `…:effects` from the server console |
| Source | stationary armor stand at `(38.5, 81, 22.5)`, on a placed stone platform inside the `mctest` ticking area |
| Coverage | 3 × `guards` (`probed=27/27` each), 3 × `effects` (11 cases each), no `PROBE CRASHED` lines |

The pack was installed into the server's `development_behavior_packs/` pool and activated in
`world_behavior_packs.json` alongside `hello-world`, `engine-probe-pack` 0.2.0 and
`resting-state-probe-pack` 0.3.0. The boot pack stack loaded all four, with this pack as
`[03] mc-test-lib guard-and-effect probes`.

## What answered what

### `mctest3:guards` — the arity-blocked guards are all present

**All 27 methods report `GUARD-OBSERVED`, in 3/3 runs, with an identical method list each time.**
Called with correct arity on a removed entity, every one throws `InvalidEntityError`; the summary
line `no method returned on a removed entity` holds in every run, so nothing silently succeeded.

This closes the residual `invalidation-guard-reflected` left open. That probe called every method
bare, so about twenty answered with a `TypeError` on argument count before reaching the validity
guard, and its `argMethods=0` partition could not tell an absent guard from a masked one. With
correct arguments the masking disappears: the guard is **universal across the argument-taking
surface**, not merely across the zero-argument getters the reflective sweep could reach.

The verdict vocabulary matters for reading the log: each method is probed with a *control* (a live
entity, same arguments) alongside the removed subject, so `GUARD-UNOBSERVED-ARGS-REJECTED` and
`GUARD-UNOBSERVED-OTHER-ERROR` distinguish "the guard is absent" from "the arguments were wrong
and nothing was learned". Neither verdict appears in any run.

### `mctest3:effects` — replacement compares against the duration remaining

The design applies `amp1/dur400`, waits 150 ticks, and re-applies `dur320` — a value strictly
between the ≈250 remaining and the 400 originally applied, so the two candidate rules predict
different read-backs. **`decayPerTick=1` in all 11 cases of all 3 runs**, so the decay assumption
the design rests on holds and no constant needed adjusting.

Identical in 3/3 runs:

| case | re-apply | read-back | reading |
|---|---|---|---|
| `equal-amp/between` ×3 | `amp1/dur320` | `amp1/dur320` | replaced — **remaining basis** |
| `higher-amp/between` ×3 | `amp2/dur320` | `amp2/dur320` | replaced — **remaining basis** |
| `lower-amp/between` ×3 | `amp0/dur320` | `amp1/dur250` | not replaced — see caveat |
| `equal-amp/below-both` (anchor) | `amp1/dur200` | `amp1/dur250` | decayed base survives, as designed |
| `equal-amp/above-both` (anchor) | `amp1/dur500` | `amp1/dur500` | replaced, as designed |

At equal and higher amplifier the re-applied `320` takes and reads back exactly, though it is
**shorter than the 400 originally applied**. The comparison is therefore against the duration
**remaining**, not the duration originally applied.

## Reading the log

- **The `verdict=anchor` cases read `strictly-between-remaining-and-applied=false` by
  construction.** They are the `200` and `500` controls, deliberately outside the discriminating
  band. Two `false` lines per run is the expected shape, not the tuning failure the pack README
  warns about — that warning is about the nine `between` cases, which read `true` in 3/3 runs.
- **The three `lower-amp/between` rows are not evidence about the duration basis.** The probe
  labels them `verdict=ORIGINAL-APPLIED-BASIS` on the reasoning that the re-add was treated as
  shorter. A lower amplifier never replaces an incumbent *regardless* of duration — established
  independently by `effect-replacement-matrix` — so the amplifier rule rejects the re-add before
  any duration comparison happens. These rows are consistent with the remaining basis and with the
  applied basis alike; they discriminate nothing. **The duration-basis conclusion rests on the six
  equal-amp and higher-amp rows only.**
- Per-case `location` values drift between cases because the subject mobs wander; this has no
  bearing on the durations read back.

## Run-validity notes

- **No script errors** appear in the content log for the session, so the
  `system.beforeEvents.startup` command registration did not throw.
- **The `/mctest3:guards` and `/mctest3:effects` slash commands are unexercised.** All six runs
  went through the `scriptevent` fallback, so the custom-command path is only known not to have
  thrown at registration — the same residual the earlier packs carry.
- **`n = 3` per set, and the runs are reproducible rather than merely consistent**: the guard
  summary line is byte-identical across the three runs, and the effect read-backs are identical
  case-for-case. Nothing here rests on a single observation.
- **No player was connected.** Neither set reads a player, so the armor-stand source covers both.
- The source is the stationary armor stand left in place by the resting-state runs, on a placed
  stone platform at `y=80`. A wandering source is what crashed an earlier session's probes once it
  left the ticking area.

## Raw logs — `mctest3:guards`

### Guards run 1

```
[2026-07-27 12:42:11.072] [mctest] guards start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 12:42:11.073] [mctest] entity-property-discovery :: minecraft:cow getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:42:11.073] [mctest] entity-property-discovery :: minecraft:pig getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:42:11.074] [mctest] entity-property-discovery :: minecraft:chicken getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:42:11.074] [mctest] entity-property-discovery :: minecraft:armadillo getProperty("minecraft:armadillo_state") ok value=string:unrolled
[2026-07-27 12:42:11.074] [mctest] entity-property-discovery :: minecraft:creaking getProperty("minecraft:creaking_state") ok value=string:neutral
[2026-07-27 12:42:11.074] [mctest] entity-property-discovery :: minecraft:wolf getProperty("minecraft:sound_variant") ok value=string:cute
[2026-07-27 12:42:11.075] [mctest] entity-property-discovery :: minecraft:frog getProperty("minecraft:climate_variant") ok value=undefined
[2026-07-27 12:42:11.075] [mctest] entity-property-discovery :: minecraft:bee getProperty("minecraft:has_nectar") ok value=boolean:false
[2026-07-27 12:42:11.075] [mctest] entity-property-discovery :: selected found=true typeId=minecraft:cow id="minecraft:climate_variant" value=string:temperate
[2026-07-27 12:42:11.167] [mctest] guard-with-correct-arity :: probing 27 methods, one control + one removed subject each
[2026-07-27 12:42:11.272] [mctest] guard-with-correct-arity :: addEffect("minecraft:speed", 20, {"amplifier":0,"showParticles":false}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:11.272] [mctest] guard-with-correct-arity :: addEffect control(valid-entity) ok value=object(Effect)
[2026-07-27 12:42:11.272] [mctest] guard-with-correct-arity :: addEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:11.417] [mctest] guard-with-correct-arity :: addItem(ItemStack(minecraft:stone)) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:11.417] [mctest] guard-with-correct-arity :: addItem control(valid-entity) threw name=InvalidEntityComponentError ctor=InvalidEntityComponentError instanceofInvalidEntityError=false message="Attempting to access invalid entity component minecraft:inventory."
[2026-07-27 12:42:11.417] [mctest] guard-with-correct-arity :: addItem subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addItem' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:11.572] [mctest] guard-with-correct-arity :: addTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:11.572] [mctest] guard-with-correct-arity :: addTag control(valid-entity) ok value=boolean:true
[2026-07-27 12:42:11.572] [mctest] guard-with-correct-arity :: addTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:11.722] [mctest] guard-with-correct-arity :: applyDamage(1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:11.722] [mctest] guard-with-correct-arity :: applyDamage control(valid-entity) ok value=boolean:true
[2026-07-27 12:42:11.722] [mctest] guard-with-correct-arity :: applyDamage subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:11.867] [mctest] guard-with-correct-arity :: applyImpulse({"x":0,"y":0.1,"z":0}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:11.867] [mctest] guard-with-correct-arity :: applyImpulse control(valid-entity) ok value=undefined
[2026-07-27 12:42:11.867] [mctest] guard-with-correct-arity :: applyImpulse subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyImpulse' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:12.022] [mctest] guard-with-correct-arity :: applyKnockback({"x":0,"z":0.1}, 0.1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:12.022] [mctest] guard-with-correct-arity :: applyKnockback control(valid-entity) ok value=undefined
[2026-07-27 12:42:12.022] [mctest] guard-with-correct-arity :: applyKnockback subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyKnockback' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:12.167] [mctest] guard-with-correct-arity :: getComponent("minecraft:health") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:12.167] [mctest] guard-with-correct-arity :: getComponent control(valid-entity) ok value=object(EntityHealthComponent)
[2026-07-27 12:42:12.167] [mctest] guard-with-correct-arity :: getComponent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:12.322] [mctest] guard-with-correct-arity :: getDynamicProperty("mctest_prop") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:12.322] [mctest] guard-with-correct-arity :: getDynamicProperty control(valid-entity) ok value=undefined
[2026-07-27 12:42:12.322] [mctest] guard-with-correct-arity :: getDynamicProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:12.472] [mctest] guard-with-correct-arity :: getEffect("minecraft:speed") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:12.472] [mctest] guard-with-correct-arity :: getEffect control(valid-entity) ok value=undefined
[2026-07-27 12:42:12.472] [mctest] guard-with-correct-arity :: getEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:12.617] [mctest] guard-with-correct-arity :: getProperty("minecraft:climate_variant") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:12.617] [mctest] guard-with-correct-arity :: getProperty control(valid-entity) ok value=string:temperate
[2026-07-27 12:42:12.617] [mctest] guard-with-correct-arity :: getProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:12.772] [mctest] guard-with-correct-arity :: hasComponent("minecraft:health") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:12.772] [mctest] guard-with-correct-arity :: hasComponent control(valid-entity) ok value=boolean:true
[2026-07-27 12:42:12.772] [mctest] guard-with-correct-arity :: hasComponent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasComponent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:12.917] [mctest] guard-with-correct-arity :: hasTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:12.918] [mctest] guard-with-correct-arity :: hasTag control(valid-entity) ok value=boolean:false
[2026-07-27 12:42:12.918] [mctest] guard-with-correct-arity :: hasTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:13.072] [mctest] guard-with-correct-arity :: lookAt({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:13.072] [mctest] guard-with-correct-arity :: lookAt control(valid-entity) ok value=undefined
[2026-07-27 12:42:13.072] [mctest] guard-with-correct-arity :: lookAt subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'lookAt' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:13.222] [mctest] guard-with-correct-arity :: matches({"type":"minecraft:sheep"}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:13.222] [mctest] guard-with-correct-arity :: matches control(valid-entity) ok value=boolean:true
[2026-07-27 12:42:13.222] [mctest] guard-with-correct-arity :: matches subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'matches' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:13.367] [mctest] guard-with-correct-arity :: playAnimation("animation.quadruped.walk") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:13.367] [mctest] guard-with-correct-arity :: playAnimation control(valid-entity) ok value=undefined
[2026-07-27 12:42:13.367] [mctest] guard-with-correct-arity :: playAnimation subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'playAnimation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:13.522] [mctest] guard-with-correct-arity :: removeEffect("minecraft:speed") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:13.522] [mctest] guard-with-correct-arity :: removeEffect control(valid-entity) ok value=boolean:false
[2026-07-27 12:42:13.522] [mctest] guard-with-correct-arity :: removeEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'removeEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:13.667] [mctest] guard-with-correct-arity :: removeTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:13.667] [mctest] guard-with-correct-arity :: removeTag control(valid-entity) ok value=boolean:false
[2026-07-27 12:42:13.667] [mctest] guard-with-correct-arity :: removeTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'removeTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:13.822] [mctest] guard-with-correct-arity :: resetProperty("minecraft:climate_variant") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:13.822] [mctest] guard-with-correct-arity :: resetProperty control(valid-entity) ok value=string:temperate
[2026-07-27 12:42:13.822] [mctest] guard-with-correct-arity :: resetProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'resetProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:14.141] [mctest] guard-with-correct-arity :: runCommand("tag @s add mctest_cmd") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:14.141] [mctest] guard-with-correct-arity :: runCommand control(valid-entity) ok value=object(CommandResult)
[2026-07-27 12:42:14.141] [mctest] guard-with-correct-arity :: runCommand subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'runCommand' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:14.291] [mctest] guard-with-correct-arity :: setDynamicProperties({"mctest_prop":1}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:14.291] [mctest] guard-with-correct-arity :: setDynamicProperties control(valid-entity) ok value=undefined
[2026-07-27 12:42:14.291] [mctest] guard-with-correct-arity :: setDynamicProperties subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setDynamicProperties' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:14.441] [mctest] guard-with-correct-arity :: setDynamicProperty("mctest_prop", 1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:14.441] [mctest] guard-with-correct-arity :: setDynamicProperty control(valid-entity) ok value=undefined
[2026-07-27 12:42:14.441] [mctest] guard-with-correct-arity :: setDynamicProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setDynamicProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:14.591] [mctest] guard-with-correct-arity :: setOnFire(1, false) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:14.591] [mctest] guard-with-correct-arity :: setOnFire control(valid-entity) ok value=boolean:true
[2026-07-27 12:42:14.591] [mctest] guard-with-correct-arity :: setOnFire subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setOnFire' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:14.741] [mctest] guard-with-correct-arity :: setProperty("minecraft:climate_variant", "temperate") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:14.741] [mctest] guard-with-correct-arity :: setProperty control(valid-entity) ok value=undefined
[2026-07-27 12:42:14.741] [mctest] guard-with-correct-arity :: setProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:14.891] [mctest] guard-with-correct-arity :: setRotation({"x":0,"y":0}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:14.891] [mctest] guard-with-correct-arity :: setRotation control(valid-entity) ok value=undefined
[2026-07-27 12:42:14.891] [mctest] guard-with-correct-arity :: setRotation subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setRotation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:15.041] [mctest] guard-with-correct-arity :: teleport({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:15.041] [mctest] guard-with-correct-arity :: teleport control(valid-entity) ok value=undefined
[2026-07-27 12:42:15.041] [mctest] guard-with-correct-arity :: teleport subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'teleport' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:15.191] [mctest] guard-with-correct-arity :: triggerEvent("minecraft:entity_born") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:15.191] [mctest] guard-with-correct-arity :: triggerEvent control(valid-entity) ok value=undefined
[2026-07-27 12:42:15.191] [mctest] guard-with-correct-arity :: triggerEvent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'triggerEvent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:15.341] [mctest] guard-with-correct-arity :: tryTeleport({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:42:15.341] [mctest] guard-with-correct-arity :: tryTeleport control(valid-entity) ok value=boolean:true
[2026-07-27 12:42:15.341] [mctest] guard-with-correct-arity :: tryTeleport subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'tryTeleport' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:42:15.391] [mctest] guard-with-correct-arity :: SUMMARY probed=27/27
[2026-07-27 12:42:15.391] [mctest] guard-with-correct-arity :: SUMMARY GUARD-OBSERVED count=27 methods=[addEffect, addItem, addTag, applyDamage, applyImpulse, applyKnockback, getComponent, getDynamicProperty, getEffect, getProperty, hasComponent, hasTag, lookAt, matches, playAnimation, removeEffect, removeTag, resetProperty, runCommand, setDynamicProperties, setDynamicProperty, setOnFire, setProperty, setRotation, teleport, triggerEvent, tryTeleport]
[2026-07-27 12:42:15.391] [mctest] guard-with-correct-arity :: SUMMARY no method returned on a removed entity
[2026-07-27 12:42:15.491] [mctest] guards complete — copy every [mctest] line into the design as the answer record
```

### Guards run 2

```
[2026-07-27 12:43:26.591] [mctest] guards start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 12:43:26.591] [mctest] entity-property-discovery :: minecraft:cow getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:43:26.591] [mctest] entity-property-discovery :: minecraft:pig getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:43:26.592] [mctest] entity-property-discovery :: minecraft:chicken getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:43:26.592] [mctest] entity-property-discovery :: minecraft:armadillo getProperty("minecraft:armadillo_state") ok value=string:unrolled
[2026-07-27 12:43:26.592] [mctest] entity-property-discovery :: minecraft:creaking getProperty("minecraft:creaking_state") ok value=string:neutral
[2026-07-27 12:43:26.593] [mctest] entity-property-discovery :: minecraft:wolf getProperty("minecraft:sound_variant") ok value=string:sad
[2026-07-27 12:43:26.593] [mctest] entity-property-discovery :: minecraft:frog getProperty("minecraft:climate_variant") ok value=undefined
[2026-07-27 12:43:26.593] [mctest] entity-property-discovery :: minecraft:bee getProperty("minecraft:has_nectar") ok value=boolean:false
[2026-07-27 12:43:26.593] [mctest] entity-property-discovery :: selected found=true typeId=minecraft:cow id="minecraft:climate_variant" value=string:temperate
[2026-07-27 12:43:26.691] [mctest] guard-with-correct-arity :: probing 27 methods, one control + one removed subject each
[2026-07-27 12:43:26.795] [mctest] guard-with-correct-arity :: addEffect("minecraft:speed", 20, {"amplifier":0,"showParticles":false}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:26.795] [mctest] guard-with-correct-arity :: addEffect control(valid-entity) ok value=object(Effect)
[2026-07-27 12:43:26.796] [mctest] guard-with-correct-arity :: addEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:26.940] [mctest] guard-with-correct-arity :: addItem(ItemStack(minecraft:stone)) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:26.940] [mctest] guard-with-correct-arity :: addItem control(valid-entity) threw name=InvalidEntityComponentError ctor=InvalidEntityComponentError instanceofInvalidEntityError=false message="Attempting to access invalid entity component minecraft:inventory."
[2026-07-27 12:43:26.941] [mctest] guard-with-correct-arity :: addItem subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addItem' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:27.090] [mctest] guard-with-correct-arity :: addTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:27.090] [mctest] guard-with-correct-arity :: addTag control(valid-entity) ok value=boolean:true
[2026-07-27 12:43:27.090] [mctest] guard-with-correct-arity :: addTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:27.241] [mctest] guard-with-correct-arity :: applyDamage(1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:27.241] [mctest] guard-with-correct-arity :: applyDamage control(valid-entity) ok value=boolean:true
[2026-07-27 12:43:27.241] [mctest] guard-with-correct-arity :: applyDamage subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:27.390] [mctest] guard-with-correct-arity :: applyImpulse({"x":0,"y":0.1,"z":0}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:27.390] [mctest] guard-with-correct-arity :: applyImpulse control(valid-entity) ok value=undefined
[2026-07-27 12:43:27.391] [mctest] guard-with-correct-arity :: applyImpulse subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyImpulse' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:27.546] [mctest] guard-with-correct-arity :: applyKnockback({"x":0,"z":0.1}, 0.1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:27.546] [mctest] guard-with-correct-arity :: applyKnockback control(valid-entity) ok value=undefined
[2026-07-27 12:43:27.546] [mctest] guard-with-correct-arity :: applyKnockback subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyKnockback' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:27.691] [mctest] guard-with-correct-arity :: getComponent("minecraft:health") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:27.691] [mctest] guard-with-correct-arity :: getComponent control(valid-entity) ok value=object(EntityHealthComponent)
[2026-07-27 12:43:27.691] [mctest] guard-with-correct-arity :: getComponent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:27.841] [mctest] guard-with-correct-arity :: getDynamicProperty("mctest_prop") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:27.841] [mctest] guard-with-correct-arity :: getDynamicProperty control(valid-entity) ok value=undefined
[2026-07-27 12:43:27.841] [mctest] guard-with-correct-arity :: getDynamicProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:27.991] [mctest] guard-with-correct-arity :: getEffect("minecraft:speed") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:27.991] [mctest] guard-with-correct-arity :: getEffect control(valid-entity) ok value=undefined
[2026-07-27 12:43:27.991] [mctest] guard-with-correct-arity :: getEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:28.141] [mctest] guard-with-correct-arity :: getProperty("minecraft:climate_variant") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:28.141] [mctest] guard-with-correct-arity :: getProperty control(valid-entity) ok value=string:temperate
[2026-07-27 12:43:28.141] [mctest] guard-with-correct-arity :: getProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:28.295] [mctest] guard-with-correct-arity :: hasComponent("minecraft:health") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:28.295] [mctest] guard-with-correct-arity :: hasComponent control(valid-entity) ok value=boolean:true
[2026-07-27 12:43:28.295] [mctest] guard-with-correct-arity :: hasComponent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasComponent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:28.441] [mctest] guard-with-correct-arity :: hasTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:28.441] [mctest] guard-with-correct-arity :: hasTag control(valid-entity) ok value=boolean:false
[2026-07-27 12:43:28.441] [mctest] guard-with-correct-arity :: hasTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:28.590] [mctest] guard-with-correct-arity :: lookAt({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:28.591] [mctest] guard-with-correct-arity :: lookAt control(valid-entity) ok value=undefined
[2026-07-27 12:43:28.591] [mctest] guard-with-correct-arity :: lookAt subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'lookAt' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:28.741] [mctest] guard-with-correct-arity :: matches({"type":"minecraft:sheep"}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:28.741] [mctest] guard-with-correct-arity :: matches control(valid-entity) ok value=boolean:true
[2026-07-27 12:43:28.741] [mctest] guard-with-correct-arity :: matches subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'matches' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:28.891] [mctest] guard-with-correct-arity :: playAnimation("animation.quadruped.walk") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:28.891] [mctest] guard-with-correct-arity :: playAnimation control(valid-entity) ok value=undefined
[2026-07-27 12:43:28.891] [mctest] guard-with-correct-arity :: playAnimation subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'playAnimation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:29.046] [mctest] guard-with-correct-arity :: removeEffect("minecraft:speed") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:29.046] [mctest] guard-with-correct-arity :: removeEffect control(valid-entity) ok value=boolean:false
[2026-07-27 12:43:29.046] [mctest] guard-with-correct-arity :: removeEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'removeEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:29.191] [mctest] guard-with-correct-arity :: removeTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:29.191] [mctest] guard-with-correct-arity :: removeTag control(valid-entity) ok value=boolean:false
[2026-07-27 12:43:29.191] [mctest] guard-with-correct-arity :: removeTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'removeTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:29.341] [mctest] guard-with-correct-arity :: resetProperty("minecraft:climate_variant") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:29.341] [mctest] guard-with-correct-arity :: resetProperty control(valid-entity) ok value=string:temperate
[2026-07-27 12:43:29.341] [mctest] guard-with-correct-arity :: resetProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'resetProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:29.491] [mctest] guard-with-correct-arity :: runCommand("tag @s add mctest_cmd") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:29.491] [mctest] guard-with-correct-arity :: runCommand control(valid-entity) ok value=object(CommandResult)
[2026-07-27 12:43:29.491] [mctest] guard-with-correct-arity :: runCommand subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'runCommand' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:29.641] [mctest] guard-with-correct-arity :: setDynamicProperties({"mctest_prop":1}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:29.641] [mctest] guard-with-correct-arity :: setDynamicProperties control(valid-entity) ok value=undefined
[2026-07-27 12:43:29.641] [mctest] guard-with-correct-arity :: setDynamicProperties subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setDynamicProperties' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:29.796] [mctest] guard-with-correct-arity :: setDynamicProperty("mctest_prop", 1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:29.796] [mctest] guard-with-correct-arity :: setDynamicProperty control(valid-entity) ok value=undefined
[2026-07-27 12:43:29.796] [mctest] guard-with-correct-arity :: setDynamicProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setDynamicProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:29.941] [mctest] guard-with-correct-arity :: setOnFire(1, false) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:29.941] [mctest] guard-with-correct-arity :: setOnFire control(valid-entity) ok value=boolean:true
[2026-07-27 12:43:29.941] [mctest] guard-with-correct-arity :: setOnFire subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setOnFire' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:30.091] [mctest] guard-with-correct-arity :: setProperty("minecraft:climate_variant", "temperate") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:30.091] [mctest] guard-with-correct-arity :: setProperty control(valid-entity) ok value=undefined
[2026-07-27 12:43:30.091] [mctest] guard-with-correct-arity :: setProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:30.241] [mctest] guard-with-correct-arity :: setRotation({"x":0,"y":0}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:30.241] [mctest] guard-with-correct-arity :: setRotation control(valid-entity) ok value=undefined
[2026-07-27 12:43:30.241] [mctest] guard-with-correct-arity :: setRotation subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setRotation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:30.391] [mctest] guard-with-correct-arity :: teleport({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:30.391] [mctest] guard-with-correct-arity :: teleport control(valid-entity) ok value=undefined
[2026-07-27 12:43:30.391] [mctest] guard-with-correct-arity :: teleport subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'teleport' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:30.546] [mctest] guard-with-correct-arity :: triggerEvent("minecraft:entity_born") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:30.546] [mctest] guard-with-correct-arity :: triggerEvent control(valid-entity) ok value=undefined
[2026-07-27 12:43:30.546] [mctest] guard-with-correct-arity :: triggerEvent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'triggerEvent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:30.691] [mctest] guard-with-correct-arity :: tryTeleport({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:43:30.691] [mctest] guard-with-correct-arity :: tryTeleport control(valid-entity) ok value=boolean:true
[2026-07-27 12:43:30.691] [mctest] guard-with-correct-arity :: tryTeleport subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'tryTeleport' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:43:30.741] [mctest] guard-with-correct-arity :: SUMMARY probed=27/27
[2026-07-27 12:43:30.741] [mctest] guard-with-correct-arity :: SUMMARY GUARD-OBSERVED count=27 methods=[addEffect, addItem, addTag, applyDamage, applyImpulse, applyKnockback, getComponent, getDynamicProperty, getEffect, getProperty, hasComponent, hasTag, lookAt, matches, playAnimation, removeEffect, removeTag, resetProperty, runCommand, setDynamicProperties, setDynamicProperty, setOnFire, setProperty, setRotation, teleport, triggerEvent, tryTeleport]
[2026-07-27 12:43:30.741] [mctest] guard-with-correct-arity :: SUMMARY no method returned on a removed entity
[2026-07-27 12:43:30.841] [mctest] guards complete — copy every [mctest] line into the design as the answer record
```

### Guards run 3

```
[2026-07-27 12:44:23.146] [mctest] guards start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 12:44:23.147] [mctest] entity-property-discovery :: minecraft:cow getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:44:23.147] [mctest] entity-property-discovery :: minecraft:pig getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:44:23.147] [mctest] entity-property-discovery :: minecraft:chicken getProperty("minecraft:climate_variant") ok value=string:temperate
[2026-07-27 12:44:23.147] [mctest] entity-property-discovery :: minecraft:armadillo getProperty("minecraft:armadillo_state") ok value=string:unrolled
[2026-07-27 12:44:23.148] [mctest] entity-property-discovery :: minecraft:creaking getProperty("minecraft:creaking_state") ok value=string:neutral
[2026-07-27 12:44:23.148] [mctest] entity-property-discovery :: minecraft:wolf getProperty("minecraft:sound_variant") ok value=string:default
[2026-07-27 12:44:23.148] [mctest] entity-property-discovery :: minecraft:frog getProperty("minecraft:climate_variant") ok value=undefined
[2026-07-27 12:44:23.149] [mctest] entity-property-discovery :: minecraft:bee getProperty("minecraft:has_nectar") ok value=boolean:false
[2026-07-27 12:44:23.149] [mctest] entity-property-discovery :: selected found=true typeId=minecraft:cow id="minecraft:climate_variant" value=string:temperate
[2026-07-27 12:44:23.241] [mctest] guard-with-correct-arity :: probing 27 methods, one control + one removed subject each
[2026-07-27 12:44:23.346] [mctest] guard-with-correct-arity :: addEffect("minecraft:speed", 20, {"amplifier":0,"showParticles":false}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:23.346] [mctest] guard-with-correct-arity :: addEffect control(valid-entity) ok value=object(Effect)
[2026-07-27 12:44:23.346] [mctest] guard-with-correct-arity :: addEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:23.491] [mctest] guard-with-correct-arity :: addItem(ItemStack(minecraft:stone)) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:23.491] [mctest] guard-with-correct-arity :: addItem control(valid-entity) threw name=InvalidEntityComponentError ctor=InvalidEntityComponentError instanceofInvalidEntityError=false message="Attempting to access invalid entity component minecraft:inventory."
[2026-07-27 12:44:23.491] [mctest] guard-with-correct-arity :: addItem subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addItem' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:23.646] [mctest] guard-with-correct-arity :: addTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:23.646] [mctest] guard-with-correct-arity :: addTag control(valid-entity) ok value=boolean:true
[2026-07-27 12:44:23.646] [mctest] guard-with-correct-arity :: addTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'addTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:23.791] [mctest] guard-with-correct-arity :: applyDamage(1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:23.791] [mctest] guard-with-correct-arity :: applyDamage control(valid-entity) ok value=boolean:true
[2026-07-27 12:44:23.791] [mctest] guard-with-correct-arity :: applyDamage subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:23.941] [mctest] guard-with-correct-arity :: applyImpulse({"x":0,"y":0.1,"z":0}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:23.941] [mctest] guard-with-correct-arity :: applyImpulse control(valid-entity) ok value=undefined
[2026-07-27 12:44:23.941] [mctest] guard-with-correct-arity :: applyImpulse subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyImpulse' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:24.096] [mctest] guard-with-correct-arity :: applyKnockback({"x":0,"z":0.1}, 0.1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:24.096] [mctest] guard-with-correct-arity :: applyKnockback control(valid-entity) ok value=undefined
[2026-07-27 12:44:24.096] [mctest] guard-with-correct-arity :: applyKnockback subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyKnockback' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:24.241] [mctest] guard-with-correct-arity :: getComponent("minecraft:health") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:24.241] [mctest] guard-with-correct-arity :: getComponent control(valid-entity) ok value=object(EntityHealthComponent)
[2026-07-27 12:44:24.241] [mctest] guard-with-correct-arity :: getComponent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:24.396] [mctest] guard-with-correct-arity :: getDynamicProperty("mctest_prop") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:24.396] [mctest] guard-with-correct-arity :: getDynamicProperty control(valid-entity) ok value=undefined
[2026-07-27 12:44:24.396] [mctest] guard-with-correct-arity :: getDynamicProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:24.541] [mctest] guard-with-correct-arity :: getEffect("minecraft:speed") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:24.541] [mctest] guard-with-correct-arity :: getEffect control(valid-entity) ok value=undefined
[2026-07-27 12:44:24.541] [mctest] guard-with-correct-arity :: getEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:24.691] [mctest] guard-with-correct-arity :: getProperty("minecraft:climate_variant") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:24.691] [mctest] guard-with-correct-arity :: getProperty control(valid-entity) ok value=string:temperate
[2026-07-27 12:44:24.691] [mctest] guard-with-correct-arity :: getProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:24.846] [mctest] guard-with-correct-arity :: hasComponent("minecraft:health") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:24.846] [mctest] guard-with-correct-arity :: hasComponent control(valid-entity) ok value=boolean:true
[2026-07-27 12:44:24.846] [mctest] guard-with-correct-arity :: hasComponent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasComponent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:24.991] [mctest] guard-with-correct-arity :: hasTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:24.991] [mctest] guard-with-correct-arity :: hasTag control(valid-entity) ok value=boolean:false
[2026-07-27 12:44:24.991] [mctest] guard-with-correct-arity :: hasTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:25.146] [mctest] guard-with-correct-arity :: lookAt({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:25.146] [mctest] guard-with-correct-arity :: lookAt control(valid-entity) ok value=undefined
[2026-07-27 12:44:25.146] [mctest] guard-with-correct-arity :: lookAt subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'lookAt' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:25.291] [mctest] guard-with-correct-arity :: matches({"type":"minecraft:sheep"}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:25.291] [mctest] guard-with-correct-arity :: matches control(valid-entity) ok value=boolean:true
[2026-07-27 12:44:25.291] [mctest] guard-with-correct-arity :: matches subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'matches' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:25.441] [mctest] guard-with-correct-arity :: playAnimation("animation.quadruped.walk") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:25.441] [mctest] guard-with-correct-arity :: playAnimation control(valid-entity) ok value=undefined
[2026-07-27 12:44:25.441] [mctest] guard-with-correct-arity :: playAnimation subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'playAnimation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:25.596] [mctest] guard-with-correct-arity :: removeEffect("minecraft:speed") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:25.596] [mctest] guard-with-correct-arity :: removeEffect control(valid-entity) ok value=boolean:false
[2026-07-27 12:44:25.596] [mctest] guard-with-correct-arity :: removeEffect subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'removeEffect' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:25.741] [mctest] guard-with-correct-arity :: removeTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:25.741] [mctest] guard-with-correct-arity :: removeTag control(valid-entity) ok value=boolean:false
[2026-07-27 12:44:25.741] [mctest] guard-with-correct-arity :: removeTag subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'removeTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:25.896] [mctest] guard-with-correct-arity :: resetProperty("minecraft:climate_variant") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:25.896] [mctest] guard-with-correct-arity :: resetProperty control(valid-entity) ok value=string:temperate
[2026-07-27 12:44:25.896] [mctest] guard-with-correct-arity :: resetProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'resetProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:26.041] [mctest] guard-with-correct-arity :: runCommand("tag @s add mctest_cmd") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:26.041] [mctest] guard-with-correct-arity :: runCommand control(valid-entity) ok value=object(CommandResult)
[2026-07-27 12:44:26.041] [mctest] guard-with-correct-arity :: runCommand subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'runCommand' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:26.191] [mctest] guard-with-correct-arity :: setDynamicProperties({"mctest_prop":1}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:26.191] [mctest] guard-with-correct-arity :: setDynamicProperties control(valid-entity) ok value=undefined
[2026-07-27 12:44:26.191] [mctest] guard-with-correct-arity :: setDynamicProperties subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setDynamicProperties' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:26.346] [mctest] guard-with-correct-arity :: setDynamicProperty("mctest_prop", 1) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:26.346] [mctest] guard-with-correct-arity :: setDynamicProperty control(valid-entity) ok value=undefined
[2026-07-27 12:44:26.346] [mctest] guard-with-correct-arity :: setDynamicProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setDynamicProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:26.491] [mctest] guard-with-correct-arity :: setOnFire(1, false) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:26.491] [mctest] guard-with-correct-arity :: setOnFire control(valid-entity) ok value=boolean:true
[2026-07-27 12:44:26.491] [mctest] guard-with-correct-arity :: setOnFire subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setOnFire' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:26.646] [mctest] guard-with-correct-arity :: setProperty("minecraft:climate_variant", "temperate") on minecraft:cow subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:26.646] [mctest] guard-with-correct-arity :: setProperty control(valid-entity) ok value=undefined
[2026-07-27 12:44:26.646] [mctest] guard-with-correct-arity :: setProperty subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setProperty' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:26.791] [mctest] guard-with-correct-arity :: setRotation({"x":0,"y":0}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:26.791] [mctest] guard-with-correct-arity :: setRotation control(valid-entity) ok value=undefined
[2026-07-27 12:44:26.791] [mctest] guard-with-correct-arity :: setRotation subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'setRotation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:26.941] [mctest] guard-with-correct-arity :: teleport({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:26.941] [mctest] guard-with-correct-arity :: teleport control(valid-entity) ok value=undefined
[2026-07-27 12:44:26.941] [mctest] guard-with-correct-arity :: teleport subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'teleport' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:27.096] [mctest] guard-with-correct-arity :: triggerEvent("minecraft:entity_born") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:27.096] [mctest] guard-with-correct-arity :: triggerEvent control(valid-entity) ok value=undefined
[2026-07-27 12:44:27.096] [mctest] guard-with-correct-arity :: triggerEvent subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'triggerEvent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:27.241] [mctest] guard-with-correct-arity :: tryTeleport({"z":22.5,"y":81,"x":38.5}) on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[2026-07-27 12:44:27.241] [mctest] guard-with-correct-arity :: tryTeleport control(valid-entity) ok value=boolean:true
[2026-07-27 12:44:27.241] [mctest] guard-with-correct-arity :: tryTeleport subject(removed-entity) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'tryTeleport' due to Entity being invalid (has the Entity been removed?)."
[2026-07-27 12:44:27.291] [mctest] guard-with-correct-arity :: SUMMARY probed=27/27
[2026-07-27 12:44:27.291] [mctest] guard-with-correct-arity :: SUMMARY GUARD-OBSERVED count=27 methods=[addEffect, addItem, addTag, applyDamage, applyImpulse, applyKnockback, getComponent, getDynamicProperty, getEffect, getProperty, hasComponent, hasTag, lookAt, matches, playAnimation, removeEffect, removeTag, resetProperty, runCommand, setDynamicProperties, setDynamicProperty, setOnFire, setProperty, setRotation, teleport, triggerEvent, tryTeleport]
[2026-07-27 12:44:27.291] [mctest] guard-with-correct-arity :: SUMMARY no method returned on a removed entity
[2026-07-27 12:44:27.396] [mctest] guards complete — copy every [mctest] line into the design as the answer record
```

## Raw logs — `mctest3:effects`

### Effects run 1

```
[2026-07-27 12:45:26.846] [mctest] effects start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 12:45:26.846] [mctest] effect-duration-basis :: design base(amp1,dur400) decay=150ticks between=320 anchors=[200, 500] cases=11 predictions: original-applied-basis => readback≈remaining (no replacement); remaining-basis => readback=320
[2026-07-27 12:45:34.346] [mctest] effect-duration-basis :: [equal-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:45:34.346] [mctest] effect-duration-basis :: [equal-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":21.210908889770508,"y":81,"x":36.77570343017578}
[2026-07-27 12:45:34.441] [mctest] effect-duration-basis :: [equal-amp/between #1] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:45:42.041] [mctest] effect-duration-basis :: [equal-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:45:42.041] [mctest] effect-duration-basis :: [equal-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:45:42.141] [mctest] effect-duration-basis :: [equal-amp/between #2] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:45:49.746] [mctest] effect-duration-basis :: [equal-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:45:49.746] [mctest] effect-duration-basis :: [equal-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":24.133140563964844,"y":81,"x":40.133113861083984}
[2026-07-27 12:45:49.846] [mctest] effect-duration-basis :: [equal-amp/between #3] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:45:57.441] [mctest] effect-duration-basis :: [higher-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:45:57.441] [mctest] effect-duration-basis :: [higher-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":17.728038787841797,"y":81,"x":43.41220474243164}
[2026-07-27 12:45:57.540] [mctest] effect-duration-basis :: [higher-amp/between #1] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:46:05.141] [mctest] effect-duration-basis :: [higher-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:46:05.141] [mctest] effect-duration-basis :: [higher-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":24.254308700561523,"y":81,"x":34.80392837524414}
[2026-07-27 12:46:05.245] [mctest] effect-duration-basis :: [higher-amp/between #2] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:46:12.845] [mctest] effect-duration-basis :: [higher-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:46:12.846] [mctest] effect-duration-basis :: [higher-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":16.7927303314209,"y":81,"x":40.25628662109375}
[2026-07-27 12:46:12.940] [mctest] effect-duration-basis :: [higher-amp/between #3] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:46:20.541] [mctest] effect-duration-basis :: [lower-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:46:20.541] [mctest] effect-duration-basis :: [lower-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:46:20.641] [mctest] effect-duration-basis :: [lower-amp/between #1] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:46:28.246] [mctest] effect-duration-basis :: [lower-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:46:28.246] [mctest] effect-duration-basis :: [lower-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:46:28.346] [mctest] effect-duration-basis :: [lower-amp/between #2] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:46:35.941] [mctest] effect-duration-basis :: [lower-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:46:35.941] [mctest] effect-duration-basis :: [lower-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":17.546316146850586,"y":81,"x":30.874698638916016}
[2026-07-27 12:46:36.041] [mctest] effect-duration-basis :: [lower-amp/between #3] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:46:43.641] [mctest] effect-duration-basis :: [equal-amp/below-both #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur200) strictly-between-remaining-and-applied=false -> readback(amp1,dur250) matches=the-decayed-base verdict=anchor readback=the-decayed-base
[2026-07-27 12:46:43.641] [mctest] effect-duration-basis :: [equal-amp/below-both #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":29.08869743347168,"y":81,"x":39.5387077331543}
[2026-07-27 12:46:43.746] [mctest] effect-duration-basis :: [equal-amp/below-both #1] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:46:51.346] [mctest] effect-duration-basis :: [equal-amp/above-both #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur500) strictly-between-remaining-and-applied=false -> readback(amp1,dur500) matches=the-reapplied-value verdict=anchor readback=the-reapplied-value
[2026-07-27 12:46:51.346] [mctest] effect-duration-basis :: [equal-amp/above-both #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.500001907348633,"y":81,"x":44.123779296875}
[2026-07-27 12:46:51.441] [mctest] effect-duration-basis :: [equal-amp/above-both #1] after-2-ticks duration=498 amplifier=1
[2026-07-27 12:46:51.541] [mctest] effect-duration-basis :: complete — the equal-amp/between lines carry the verdict; the anchors are the sanity check
[2026-07-27 12:46:51.641] [mctest] effects complete — copy every [mctest] line into the design as the answer record
```

### Effects run 2

```
[2026-07-27 12:48:33.246] [mctest] effects start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 12:48:33.246] [mctest] effect-duration-basis :: design base(amp1,dur400) decay=150ticks between=320 anchors=[200, 500] cases=11 predictions: original-applied-basis => readback≈remaining (no replacement); remaining-basis => readback=320
[2026-07-27 12:48:40.746] [mctest] effect-duration-basis :: [equal-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:48:40.746] [mctest] effect-duration-basis :: [equal-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":15.876632690429688,"y":81,"x":44.435367584228516}
[2026-07-27 12:48:40.846] [mctest] effect-duration-basis :: [equal-amp/between #1] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:48:48.441] [mctest] effect-duration-basis :: [equal-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:48:48.441] [mctest] effect-duration-basis :: [equal-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":15.876632690429688,"y":81,"x":44.435367584228516}
[2026-07-27 12:48:48.541] [mctest] effect-duration-basis :: [equal-amp/between #2] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:48:56.141] [mctest] effect-duration-basis :: [equal-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:48:56.141] [mctest] effect-duration-basis :: [equal-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":26.22281265258789,"y":81,"x":46.19084167480469}
[2026-07-27 12:48:56.246] [mctest] effect-duration-basis :: [equal-amp/between #3] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:49:03.846] [mctest] effect-duration-basis :: [higher-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:49:03.846] [mctest] effect-duration-basis :: [higher-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:49:03.941] [mctest] effect-duration-basis :: [higher-amp/between #1] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:49:11.541] [mctest] effect-duration-basis :: [higher-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:49:11.541] [mctest] effect-duration-basis :: [higher-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":24.202966690063477,"y":81,"x":37.203006744384766}
[2026-07-27 12:49:11.640] [mctest] effect-duration-basis :: [higher-amp/between #2] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:49:19.246] [mctest] effect-duration-basis :: [higher-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:49:19.246] [mctest] effect-duration-basis :: [higher-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":19.544618606567383,"y":81,"x":42.06040573120117}
[2026-07-27 12:49:19.346] [mctest] effect-duration-basis :: [higher-amp/between #3] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:49:26.941] [mctest] effect-duration-basis :: [lower-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:49:26.941] [mctest] effect-duration-basis :: [lower-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:49:27.041] [mctest] effect-duration-basis :: [lower-amp/between #1] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:49:34.641] [mctest] effect-duration-basis :: [lower-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:49:34.641] [mctest] effect-duration-basis :: [lower-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":26.539928436279297,"y":81,"x":42.05815505981445}
[2026-07-27 12:49:34.746] [mctest] effect-duration-basis :: [lower-amp/between #2] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:49:42.346] [mctest] effect-duration-basis :: [lower-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:49:42.346] [mctest] effect-duration-basis :: [lower-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:49:42.441] [mctest] effect-duration-basis :: [lower-amp/between #3] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:49:50.041] [mctest] effect-duration-basis :: [equal-amp/below-both #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur200) strictly-between-remaining-and-applied=false -> readback(amp1,dur250) matches=the-decayed-base verdict=anchor readback=the-decayed-base
[2026-07-27 12:49:50.041] [mctest] effect-duration-basis :: [equal-amp/below-both #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":20.25980567932129,"y":81,"x":34.79641342163086}
[2026-07-27 12:49:50.141] [mctest] effect-duration-basis :: [equal-amp/below-both #1] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:49:57.741] [mctest] effect-duration-basis :: [equal-amp/above-both #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur500) strictly-between-remaining-and-applied=false -> readback(amp1,dur500) matches=the-reapplied-value verdict=anchor readback=the-reapplied-value
[2026-07-27 12:49:57.741] [mctest] effect-duration-basis :: [equal-amp/above-both #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":20.745281219482422,"y":81,"x":34.80411911010742}
[2026-07-27 12:49:57.846] [mctest] effect-duration-basis :: [equal-amp/above-both #1] after-2-ticks duration=498 amplifier=1
[2026-07-27 12:49:57.940] [mctest] effect-duration-basis :: complete — the equal-amp/between lines carry the verdict; the anchors are the sanity check
[2026-07-27 12:49:58.041] [mctest] effects complete — copy every [mctest] line into the design as the answer record
```

### Effects run 3

```
[2026-07-27 12:50:49.741] [mctest] effects start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 12:50:49.741] [mctest] effect-duration-basis :: design base(amp1,dur400) decay=150ticks between=320 anchors=[200, 500] cases=11 predictions: original-applied-basis => readback≈remaining (no replacement); remaining-basis => readback=320
[2026-07-27 12:50:57.240] [mctest] effect-duration-basis :: [equal-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:50:57.241] [mctest] effect-duration-basis :: [equal-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":28.085540771484375,"y":81,"x":33.557926177978516}
[2026-07-27 12:50:57.346] [mctest] effect-duration-basis :: [equal-amp/between #1] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:51:04.941] [mctest] effect-duration-basis :: [equal-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:51:04.941] [mctest] effect-duration-basis :: [equal-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:51:05.041] [mctest] effect-duration-basis :: [equal-amp/between #2] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:51:12.646] [mctest] effect-duration-basis :: [equal-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:51:12.646] [mctest] effect-duration-basis :: [equal-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:51:12.741] [mctest] effect-duration-basis :: [equal-amp/between #3] after-2-ticks duration=318 amplifier=1
[2026-07-27 12:51:20.346] [mctest] effect-duration-basis :: [higher-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:51:20.346] [mctest] effect-duration-basis :: [higher-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":25.893823623657227,"y":81,"x":41.04050827026367}
[2026-07-27 12:51:20.441] [mctest] effect-duration-basis :: [higher-amp/between #1] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:51:28.041] [mctest] effect-duration-basis :: [higher-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:51:28.041] [mctest] effect-duration-basis :: [higher-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:51:28.146] [mctest] effect-duration-basis :: [higher-amp/between #2] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:51:35.741] [mctest] effect-duration-basis :: [higher-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp2,dur320) strictly-between-remaining-and-applied=true -> readback(amp2,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)
[2026-07-27 12:51:35.741] [mctest] effect-duration-basis :: [higher-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":20.52581214904785,"y":81,"x":36.54289245605469}
[2026-07-27 12:51:35.846] [mctest] effect-duration-basis :: [higher-amp/between #3] after-2-ticks duration=318 amplifier=2
[2026-07-27 12:51:43.441] [mctest] effect-duration-basis :: [lower-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:51:43.441] [mctest] effect-duration-basis :: [lower-amp/between #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":18.71580696105957,"y":81,"x":42.28419876098633}
[2026-07-27 12:51:43.541] [mctest] effect-duration-basis :: [lower-amp/between #1] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:51:51.146] [mctest] effect-duration-basis :: [lower-amp/between #2] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:51:51.146] [mctest] effect-duration-basis :: [lower-amp/between #2] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":17.79628562927246,"y":81,"x":35.76694107055664}
[2026-07-27 12:51:51.241] [mctest] effect-duration-basis :: [lower-amp/between #2] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:51:58.846] [mctest] effect-duration-basis :: [lower-amp/between #3] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp0,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur250) matches=the-decayed-base verdict=ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)
[2026-07-27 12:51:58.846] [mctest] effect-duration-basis :: [lower-amp/between #3] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":22.5,"y":81,"x":38.5}
[2026-07-27 12:51:58.941] [mctest] effect-duration-basis :: [lower-amp/between #3] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:52:06.541] [mctest] effect-duration-basis :: [equal-amp/below-both #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur200) strictly-between-remaining-and-applied=false -> readback(amp1,dur250) matches=the-decayed-base verdict=anchor readback=the-decayed-base
[2026-07-27 12:52:06.541] [mctest] effect-duration-basis :: [equal-amp/below-both #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":25.859146118164062,"y":81,"x":38.35309982299805}
[2026-07-27 12:52:06.646] [mctest] effect-duration-basis :: [equal-amp/below-both #1] after-2-ticks duration=248 amplifier=1
[2026-07-27 12:52:14.241] [mctest] effect-duration-basis :: [equal-amp/above-both #1] applied(amp1,dur400) waited=150ticks remaining=250 remainingAmp=1 decayPerTick=1 reapply(amp1,dur500) strictly-between-remaining-and-applied=false -> readback(amp1,dur500) matches=the-reapplied-value verdict=anchor readback=the-reapplied-value
[2026-07-27 12:52:14.241] [mctest] effect-duration-basis :: [equal-amp/above-both #1] addEffect(re-add) ok value=object(Effect) getEffect(after) ok value=object(Effect) entity-isValid=true location={"z":23.535568237304688,"y":81,"x":39.53547286987305}
[2026-07-27 12:52:14.346] [mctest] effect-duration-basis :: [equal-amp/above-both #1] after-2-ticks duration=498 amplifier=1
[2026-07-27 12:52:14.441] [mctest] effect-duration-basis :: complete — the equal-amp/between lines carry the verdict; the anchors are the sanity check
[2026-07-27 12:52:14.541] [mctest] effects complete — copy every [mctest] line into the design as the answer record
```

