# mctest resting-state probe results

Observed output from running `resting-state-probe-pack` against a real Bedrock dedicated
server: the `mctest2:rest` set (resting state of freshly-created objects) and the
`mctest2:gaps` set (follow-ups on facts whose claim outran the observation behind it). The
probes report what the engine did; nothing here is an assertion about what the fake should do.

## Run provenance

| | |
|---|---|
| Date | 2026-07-25 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `resting-state-probe-pack` 0.1.0, uuid `6b1c9f2a-4d83-4a17-9c0e-1f5a7b3e2d84` |
| Trigger | `execute as <entity> run scriptevent mctest2:rest` / `…:gaps` from the server console |
| Coverage | 6/6 `rest`, 6/6 `gaps`, no `PROBE CRASHED` lines |

The pack was installed into the server's `development_behavior_packs/` pool and activated in
`world_behavior_packs.json` alongside `hello-world` and `engine-probe-pack` 0.2.0. The boot
pack stack loaded all three, with this pack as `[02] mc-test-lib resting-state probes`.

The world is the same pinned-seed dev world the first pack's runs used (seed
`-4879002305207299781`, level `dev`), with the persisted `mctest` ticking area covering
`0,0,0`–`47,0,47` in the overworld.

## What answered what

Group A settles the question the pack was built for: **`no-implicit-defaults` faces a family
of always-populated fields, not a single dimension-shaped exception.** A never-written sheep
arrives with 14 components, a populated `localizationKey`, a real `location` and
`dimension.id`, zeroed rotation and velocity, and all four health-attribute values.
`zeroComponents=false` for every type tried, with a floor of one component (`xp_orb`,
`arrow`) and never zero. The set is also type-dependent: a player carries 16 components,
seven of which no sheep has, while the sheep carries five the player lacks — so there is no
single empty baseline an engine object could rest at.

Two Group B observations bear on facts whose current wording the run contradicts rather than
tightens:

- **`kill-and-remove-cascades`** says `remove()` "fires no event at all". With all 55
  `world.afterEvents` signals subscribed (`skipped=0`), `remove()` was followed by five
  delivered events, `entityRemove` among them.
- **`namespace-prefix-is-optional`** holds on `addEffect`, `getEffect`, `spawnEntity`, and
  `getComponent`, and fails on `triggerEvent`: bare `entity_born` and `ageable_grow_up` threw
  `InvalidArgumentError`, and the `minecraft:`-prefixed forms succeeded. The rule is
  surface-dependent.

The remaining Group B probes tighten rather than contradict: equal-duration effect
replacement takes when the incoming amplifier is **higher or equal** and not when it is lower;
`kill()` on a health-less entity leaves it invalid **synchronously**, before the next tick;
all three attribute resets throw a plain `Error` rather than `InvalidEntityError`; and the
reflective invalidation sweep leaves four readable properties after removal (`id`, `isValid`,
`scoreboardIdentity`, `typeId`).

## Reading the log

Three probes emit lines that mislead without the source in hand:

- **`remove-event-sweep`** tags every delivered event `(other)`, including the probe's own
  `entitySpawn`. The `mentionsEntity` helper resolves a payload entity by reading its `id`,
  which is unreadable once the entity is invalid, so nothing matches after `remove()` and the
  tag degrades to `(other)` for everything. **`(other)` is not evidence of foreign
  provenance here.** The world held only stationary armor stands during the run, so the five
  events are attributable to the probe; confirming that by construction needs a rerun that
  captures the entity id *before* `remove()`.
- **`invalidation-guard-reflected`** reports `argMethods=0`: the partition found no
  argument-taking methods, so all 46 were invoked bare. About twenty answered with a
  `TypeError` on arity instead of `InvalidEntityError` — the engine validates argument count
  before the validity guard, which is an observation about ordering, not a probe failure. The
  guard is only directly exercised for the methods that reached it.
- **`resting-entity-fields`** reports `nameTag` as an empty string and
  `invalidation-guard-reflected` reports `nameTag` throwing on *set* rather than get; the
  reflective probe writes the property it enumerates.

## Run-validity notes

- **No script errors** appear in the content log for the session, so the
  `system.beforeEvents.startup` command registration did not throw.
- **The `/mctest2:rest` and `/mctest2:gaps` slash commands are unexercised.** Both runs went
  through the `scriptevent` fallback, so the custom-command path is only known not to have
  thrown at registration — the same residual the first pack's runs carry.
- **The `rest` and `gaps` sets ran from a stationary armor stand**, not a player. A first
  `gaps` attempt driven by a wandering chicken crashed every probe with
  `LocationInUnloadedChunkError` once the source left the ticking area; the recorded run uses
  a source fixed at `(24.5, 57, 24.5)`, well inside it. `resting-player-fields` was rerun
  separately as a connected player.
- **Single run, so `n = 1` for anything nondeterministic** — notably the entity id in
  `invalidation-guard-reflected` and the decayed durations in
  `effect-equal-duration-replacement`.
- `component-poor-entities` records `minecraft:item` as not spawnable via `spawnEntity` at
  all (`InvalidArgumentError`), so the zero-component question is unanswered for that type.

## Raw log — `mctest2:rest`

Verbatim, in delivery order, with server timestamps.

```
[2026-07-25 02:21:08.717] [mctest] rest start — 6 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 02:21:08.717] [mctest] resting-entity-fields :: components=[minecraft:movement, minecraft:movement.basic, minecraft:health, minecraft:navigation.walk, minecraft:rideable, minecraft:underwater_movement, minecraft:lava_movement, minecraft:leashable, minecraft:is_hidden_when_invisible, minecraft:color, minecraft:breathable, minecraft:is_dyeable, minecraft:can_climb, minecraft:type_family]
[2026-07-25 02:21:08.717] [mctest] resting-entity-fields :: componentCount=14
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: nameTag ok value=string: (empty-string check: length=0)
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: localizationKey ok value=string:entity.sheep.name
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: location ok value={"z":22.776620864868164,"y":62.67233657836914,"x":38.17143249511719}
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: dimension.id ok value=string:minecraft:overworld
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: getRotation() ok value={"y":0,"x":0}
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: isValid ok value=boolean:true
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: typeId ok value=string:minecraft:sheep
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: getTags() []
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: health.currentValue ok value=number:8
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: health.defaultValue ok value=number:8
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: health.effectiveMin ok value=number:0
[2026-07-25 02:21:08.718] [mctest] resting-entity-fields :: health.effectiveMax ok value=number:8
[2026-07-25 02:21:08.812] [mctest] component-poor-entities :: minecraft:arrow count=1 zeroComponents=false components=[minecraft:projectile]
[2026-07-25 02:21:08.812] [mctest] component-poor-entities :: minecraft:armor_stand count=5 zeroComponents=false components=[minecraft:movement, minecraft:health, minecraft:underwater_movement, minecraft:lava_movement, minecraft:type_family]
[2026-07-25 02:21:08.812] [mctest] component-poor-entities :: minecraft:xp_orb count=1 zeroComponents=false components=[minecraft:type_family]
[2026-07-25 02:21:08.812] [mctest] component-poor-entities :: minecraft:item spawn threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. 'minecraft:item' is not a valid entity type."
[2026-07-25 02:21:08.912] [mctest] vanilla-dimensions :: requested="overworld" -> id="minecraft:overworld" heightRange={"max":320,"min":-64} localizationKey="dimension.dimensionName0"
[2026-07-25 02:21:08.913] [mctest] vanilla-dimensions :: requested="nether" -> id="minecraft:nether" heightRange={"max":128,"min":0} localizationKey="dimension.dimensionName1"
[2026-07-25 02:21:08.913] [mctest] vanilla-dimensions :: requested="the_end" -> id="minecraft:the_end" heightRange={"max":256,"min":0} localizationKey="dimension.dimensionName2"
[2026-07-25 02:21:08.913] [mctest] vanilla-dimensions :: requested="minecraft:overworld" -> id="minecraft:overworld" heightRange={"max":320,"min":-64} localizationKey="dimension.dimensionName0"
[2026-07-25 02:21:08.913] [mctest] vanilla-dimensions :: requested="minecraft:nether" -> id="minecraft:nether" heightRange={"max":128,"min":0} localizationKey="dimension.dimensionName1"
[2026-07-25 02:21:08.913] [mctest] vanilla-dimensions :: requested="minecraft:the_end" -> id="minecraft:the_end" heightRange={"max":256,"min":0} localizationKey="dimension.dimensionName2"
[2026-07-25 02:21:08.913] [mctest] vanilla-dimensions :: unknown-id threw name=Error ctor=Error instanceofInvalidEntityError=false message="Dimension 'mctest2:nope' is invalid."
[2026-07-25 02:21:08.913] [mctest] vanilla-dimensions :: end-alias "the end" ok value=object(Dimension)
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: beforeEvents ok value=object(WorldBeforeEvents)
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: afterEvents ok value=object(WorldAfterEvents)
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: scoreboard ok value=object(Scoreboard)
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: gameRules ok value=object(GameRules)
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: isHardcore ok value=boolean:false
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: scoreboard.getObjectives().length ok value=number:0
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: getAllPlayers().length ok value=number:0
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: seed ok value=string:-4879002305207299781
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: gameRules keys=["commandBlockOutput","commandBlocksEnabled","doDayLightCycle","doEntityDrops","doFireTick","doImmediateRespawn","doInsomnia","doLimitedCrafting","doMobLoot","doMobSpawning","doTileDrops","doWeatherCycle","drowningDamage","fallDamage","fireDamage","freezeDamage","functionCommandLimit","keepInventory","maxCommandChainLength","mobGriefing","naturalRegeneration","playersSleepingPercentage","projectilesCanBreakBlocks","pvp","randomTickSpeed","recipesUnlock","respawnBlocksExplode","sendCommandFeedback","showBorderEffect","showCoordinates","showDaysPlayed","showDeathMessages","showRecipeMessages","showTags","spawnRadius","tntExplodes","tntExplosionDropDecay"]
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: afterEvents signal count=55
[2026-07-25 02:21:09.017] [mctest] resting-world-fields :: beforeEvents signal count=13
[2026-07-25 02:21:09.112] [mctest] resting-effect-fields :: getEffect ok value=object(Effect)
[2026-07-25 02:21:09.112] [mctest] resting-effect-fields :: typeId ok value=string:minecraft:speed
[2026-07-25 02:21:09.112] [mctest] resting-effect-fields :: duration ok value=number:400
[2026-07-25 02:21:09.112] [mctest] resting-effect-fields :: amplifier ok value=number:1
[2026-07-25 02:21:09.112] [mctest] resting-effect-fields :: displayName ok value=string:Speed II
[2026-07-25 02:21:09.112] [mctest] resting-effect-fields :: isValid ok value=boolean:true
[2026-07-25 02:21:09.112] [mctest] resting-effect-fields :: getEffects()=[minecraft:speed]
[2026-07-25 02:21:09.217] [mctest] resting-player-fields :: no triggering player (source typeId=minecraft:chicken) — rerun as a player to sample this
[2026-07-25 02:21:09.312] [mctest] rest complete — copy every [mctest] line into the design as the answer record
```

## Raw log — `mctest2:gaps`

```
[2026-07-25 02:26:22.662] [mctest] gaps start — 6 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 02:26:22.762] [mctest] attribute-reset-guards :: resetToDefaultValue() threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to call function 'resetToDefaultValue'."
[2026-07-25 02:26:22.762] [mctest] attribute-reset-guards :: resetToMaxValue() threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to call function 'resetToMaxValue'."
[2026-07-25 02:26:22.762] [mctest] attribute-reset-guards :: resetToMinValue() threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to call function 'resetToMinValue'."
[2026-07-25 02:26:22.867] [mctest] kill-no-health-invalidation-timing :: before-kill isValid=true healthComponent=undefined
[2026-07-25 02:26:22.867] [mctest] kill-no-health-invalidation-timing :: kill ok value=boolean:true synchronous-isValid ok value=boolean:false
[2026-07-25 02:26:22.912] [mctest] kill-no-health-invalidation-timing :: tick+1 isValid ok value=boolean:false
[2026-07-25 02:26:22.967] [mctest] kill-no-health-invalidation-timing :: tick+2 isValid ok value=boolean:false
[2026-07-25 02:26:23.012] [mctest] kill-no-health-invalidation-timing :: tick+3 isValid ok value=boolean:false
[2026-07-25 02:26:23.062] [mctest] kill-no-health-invalidation-timing :: tick+4 isValid ok value=boolean:false
[2026-07-25 02:26:23.117] [mctest] kill-no-health-invalidation-timing :: tick+5 isValid ok value=boolean:false
[2026-07-25 02:26:23.218] [mctest] remove-event-sweep :: subscribed=55 skipped=0 skipped-names=[]
[2026-07-25 02:26:23.412] [mctest] remove-event-sweep :: after remove() fired=[entitySpawn(other), dataDrivenEntityTrigger(other), dataDrivenEntityTrigger(other), dataDrivenEntityTrigger(other), entityRemove(other)] count=5
[2026-07-25 02:26:23.512] [mctest] invalidation-guard-reflected :: enumerated=62 properties=16 zeroArgMethods=46 argMethods=0
[2026-07-25 02:26:23.512] [mctest] invalidation-guard-reflected :: properties=[dimension, id, isClimbing, isFalling, isInWater, isOnGround, isSleeping, isSneaking, isSprinting, isSwimming, isValid, localizationKey, location, nameTag, scoreboardIdentity, typeId]
[2026-07-25 02:26:23.512] [mctest] invalidation-guard-reflected :: zeroArgMethods=[addEffect, addItem, addTag, applyDamage, applyImpulse, applyKnockback, clearDynamicProperties, clearVelocity, extinguishFire, getAABB, getAllBlocksStandingOn, getBlockFromViewDirection, getBlockStandingOn, getComponent, getComponents, getDynamicProperty, getDynamicPropertyIds, getDynamicPropertyTotalByteCount, getEffect, getEffects, getEntitiesFromViewDirection, getHeadLocation, getProperty, getRotation, getTags, getVelocity, getViewDirection, hasComponent, hasTag, kill, lookAt, matches, playAnimation, remove, removeEffect, removeTag, resetProperty, runCommand, setDynamicProperties, setDynamicProperty, setOnFire, setProperty, setRotation, teleport, triggerEvent, tryTeleport]
[2026-07-25 02:26:23.512] [mctest] invalidation-guard-reflected :: argMethods=[]
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop dimension threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'dimension' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop id ok value=string:-68719476721
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isClimbing threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isClimbing' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isFalling threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isFalling' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isInWater threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isInWater' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isOnGround threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isOnGround' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isSleeping threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSleeping' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isSneaking threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSneaking' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isSprinting threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSprinting' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isSwimming threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSwimming' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop isValid ok value=boolean:false
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop localizationKey threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'localizationKey' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop location threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'location' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop nameTag threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to set property 'nameTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop scoreboardIdentity ok value=undefined
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: prop typeId ok value=string:minecraft:sheep
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method addEffect() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 2-3, received 0"
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method addItem() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method addTag() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method applyDamage() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1-2, received 0"
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method applyImpulse() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method applyKnockback() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 2, received 0"
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method clearDynamicProperties() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'clearDynamicProperties' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method clearVelocity() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'clearVelocity' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method extinguishFire() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'extinguishFire' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method getAABB() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getAABB' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method getAllBlocksStandingOn() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getAllBlocksStandingOn' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method getBlockFromViewDirection() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getBlockFromViewDirection' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.617] [mctest] invalidation-guard-reflected :: method getBlockStandingOn() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getBlockStandingOn' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getComponent() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getComponents() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponents' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getDynamicProperty() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getDynamicPropertyIds() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicPropertyIds' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getDynamicPropertyTotalByteCount() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicPropertyTotalByteCount' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getEffect() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getEffects() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEffects' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getEntitiesFromViewDirection() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEntitiesFromViewDirection' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getHeadLocation() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getHeadLocation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getProperty() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getRotation() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getRotation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getTags() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getTags' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getVelocity() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getVelocity' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method getViewDirection() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getViewDirection' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method hasComponent() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method hasTag() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method kill() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method lookAt() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method matches() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method playAnimation() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1-2, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method remove() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'remove' due to Entity being invalid (has the Entity been removed?)."
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method removeEffect() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method removeTag() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method resetProperty() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method runCommand() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method setDynamicProperties() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method setDynamicProperty() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1-2, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method setOnFire() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1-2, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method setProperty() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 2, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method setRotation() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method teleport() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1-2, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method triggerEvent() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: method tryTeleport() threw name=TypeError ctor=TypeError instanceofInvalidEntityError=false message="Incorrect number of arguments to function. Expected 1-2, received 0"
[2026-07-25 02:26:23.618] [mctest] invalidation-guard-reflected :: readable-properties-after-remove=4
[2026-07-25 02:26:24.217] [mctest] effect-equal-duration-replacement :: [higher-amp/equal-dur] base(amp1,dur300) decayed-to(amp1,dur290) readd(amp2,dur300) -> readback(amp2,dur300) replaced=true discriminator="readDur===300 means fresh application; readDur===290 means the decayed base survived"
[2026-07-25 02:26:24.717] [mctest] effect-equal-duration-replacement :: [same-amp/equal-dur] base(amp1,dur300) decayed-to(amp1,dur290) readd(amp1,dur300) -> readback(amp1,dur300) replaced=true discriminator="readDur===300 means fresh application; readDur===290 means the decayed base survived"
[2026-07-25 02:26:25.217] [mctest] effect-equal-duration-replacement :: [lower-amp/equal-dur] base(amp1,dur300) decayed-to(amp1,dur290) readd(amp0,dur300) -> readback(amp1,dur290) replaced=false discriminator="readDur===300 means fresh application; readDur===290 means the decayed base survived"
[2026-07-25 02:26:25.312] [mctest] namespace-prefix-other-surfaces :: addEffect("speed") ok value=object(Effect) reportedTypeId="minecraft:speed"
[2026-07-25 02:26:25.312] [mctest] namespace-prefix-other-surfaces :: addEffect("minecraft:speed") ok value=object(Effect) reportedTypeId="minecraft:speed"
[2026-07-25 02:26:25.312] [mctest] namespace-prefix-other-surfaces :: getEffect("speed") ok value=object(Effect) reportedTypeId="minecraft:speed"
[2026-07-25 02:26:25.312] [mctest] namespace-prefix-other-surfaces :: getEffect("minecraft:speed") ok value=object(Effect) reportedTypeId="minecraft:speed"
[2026-07-25 02:26:25.313] [mctest] namespace-prefix-other-surfaces :: spawnEntity("sheep") ok value=object(Entity) reportedTypeId="minecraft:sheep"
[2026-07-25 02:26:25.313] [mctest] namespace-prefix-other-surfaces :: spawnEntity("minecraft:sheep") ok value=object(Entity) reportedTypeId="minecraft:sheep"
[2026-07-25 02:26:25.313] [mctest] namespace-prefix-other-surfaces :: triggerEvent("entity_born") threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. The event entity_born does not exist on minecraft:sheep"
[2026-07-25 02:26:25.314] [mctest] namespace-prefix-other-surfaces :: triggerEvent("minecraft:entity_born") ok value=undefined
[2026-07-25 02:26:25.314] [mctest] namespace-prefix-other-surfaces :: triggerEvent("ageable_grow_up") threw name=InvalidArgumentError ctor=InvalidArgumentError instanceofInvalidEntityError=false message="Invalid value passed to argument [0]. The event ageable_grow_up does not exist on minecraft:sheep"
[2026-07-25 02:26:25.314] [mctest] namespace-prefix-other-surfaces :: triggerEvent("minecraft:ageable_grow_up") ok value=undefined
[2026-07-25 02:26:25.314] [mctest] namespace-prefix-other-surfaces :: getComponent("health") ok value=object(EntityHealthComponent) reportedTypeId="minecraft:health"
[2026-07-25 02:26:25.314] [mctest] namespace-prefix-other-surfaces :: getComponent("minecraft:health") ok value=object(EntityHealthComponent) reportedTypeId="minecraft:health"
[2026-07-25 02:26:25.412] [mctest] gaps complete — copy every [mctest] line into the design as the answer record
```

## Raw log — `resting-player-fields` rerun as a player

The `rest` set above ran from an armor stand, so `resting-player-fields` reported itself
skipped. Rerun with a player connected, trigger
`execute as @a[c=1] run scriptevent mctest2:rest resting-player-fields`:

```
[2026-07-25 02:37:11.587] [mctest] rest start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 02:37:11.587] [mctest] resting-player-fields :: name ok value=string:worldbinder
[2026-07-25 02:37:11.587] [mctest] resting-player-fields :: componentCount=16 components=[minecraft:movement, minecraft:equippable, minecraft:ender_inventory, minecraft:cursor_inventory, minecraft:inventory, minecraft:player.exhaustion, minecraft:health, minecraft:player.hunger, minecraft:player.saturation, minecraft:rideable, minecraft:underwater_movement, minecraft:lava_movement, minecraft:is_hidden_when_invisible, minecraft:breathable, minecraft:can_climb, minecraft:type_family]
[2026-07-25 02:37:11.588] [mctest] resting-player-fields :: player-only=[minecraft:equippable, minecraft:ender_inventory, minecraft:cursor_inventory, minecraft:inventory, minecraft:player.exhaustion, minecraft:player.hunger, minecraft:player.saturation]
[2026-07-25 02:37:11.588] [mctest] resting-player-fields :: sheep-only=[minecraft:movement.basic, minecraft:navigation.walk, minecraft:leashable, minecraft:color, minecraft:is_dyeable]
[2026-07-25 02:37:11.616] [mctest] rest complete — copy every [mctest] line into the design as the answer record
```

---

# `resting-kinematics` (pack 0.2.0)

The probe added in `resting-state-probe-pack` 0.2.0, run twice: once from the same underground
source the 0.1.0 runs used, and once from a purpose-built platform in open air. The spawn-frame
observations are identical across both; the two runs are kept because the `after-2-ticks` half
differs between them and that difference is what identifies the confound below.

## Run provenance

| | |
|---|---|
| Date | 2026-07-25 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** |
| Pack | `resting-state-probe-pack` **0.2.0**, uuid `6b1c9f2a-4d83-4a17-9c0e-1f5a7b3e2d84` (unchanged) |
| Trigger | `execute as <armor stand> run scriptevent mctest2:rest resting-kinematics` |
| Source A | armor stand at `(24.5, 57, 24.5)` — below the local surface |
| Source B | armor stand at `(42.5, 81, 22.5)` — on a placed 5×5 stone platform, open air above |
| Coverage | `sampled=8/8` types, both runs, no `PROBE CRASHED` lines |

The version bump was mirrored in the world's `world_behavior_packs.json` (`6b1c9f2a…` → `0.2.0`)
and the server restarted; the boot pack stack confirms `[02] … version: 0.2.0`.

## What the spawn frame shows

Read on each entity's own spawn frame, before the later types exist. **Identical in both runs**:

- **Rotation and velocity are not uniform across types.** Seven of eight spawn with
  `getRotation() = {x:0, y:0}` and `getVelocity() = {x:0, y:0, z:0}`. `minecraft:xp_orb` spawns
  with a randomized y-rotation and a nonzero randomized velocity, redrawn per spawn:

  | run | `xp_orb` rotation.y | `xp_orb` velocity |
  |---|---|---|
  | A (underground) | `69.07179260253906` | `{x:0.0554, y:0.2263, z:-0.0950}` |
  | B (open air) | `288.386962890625` | `{x:0.0967, y:0.1287, z:0.1627}` |

- **`nameTag` is uniform** — `""`, `length=0`, all eight types, both runs.
- **The requested spawn location is not always honored.** `minecraft:boat` lands `0.2` off the
  requested point on both x and z in both runs; every other type lands on it exactly,
  `delta={x:0,y:0,z:0}`. The magnitude is constant and the sign tracks the spawn position — see
  the four-run section below, where it is bit-identical across runs from a fixed base.
- **RETRACTED — `minecraft:arrow` reads `isValid=false` at the 2-tick sample in both runs.** This
  was recorded here as unprompted self-removal. It is not: the isolated runs below hold the arrow
  valid at 2 and 22 ticks in 4/4, so the invalidation was **contact with the six other entities
  spawned at the same point**, not a property of a resting arrow. The observation is left in
  place because the raw logs below contain it; the conclusion drawn from it does not stand.

## Reading the log — the `after-2-ticks` sample is confounded

The probe spawns all eight types at one identical location and holds them live, so they
interpenetrate and the engine resolves the overlap. The 2-tick sample therefore measures
**collision resolution, not resting kinematics**. Two things identify it:

- `minecraft:armor_stand`, which takes no such push, reads exactly zero velocity and zero
  positional delta in both runs.
- `minecraft:sheep` and `minecraft:cow` read exactly `+0.4550018310546875` upward in **both**
  runs — including run B, on a flat platform with nothing above them. Moving the source to open
  air changed the chicken, zombie and boat samples but left these two untouched, which is what
  rules out terrain as the cause.

Isolating the intended observation — whether a type's zero velocity is a resting value or only a
spawn-frame value — needs each type spawned at its own offset, or disposed before the next is
spawned. The spawn-frame section above is unaffected: each entity is read before the others exist.

## Run-validity notes

- **The world was modified for run B.** A 5×5 stone platform was placed at `y=80`,
  `x 40–44`, `z 20–24`, inside the persisted `mctest` ticking area. Run A used unmodified terrain.
- **Source entity churn.** The armor stand tagged `mctestsrc` for the 0.1.0 runs did not survive
  run A; run B uses a fresh stand tagged `kin2`. The probe spawns and disposes an
  `armor_stand` of its own at the source location, so an armor-stand source is a poor choice for
  this probe specifically.
- **`n = 2`**, and the two runs differ in source placement, so the agreeing spawn-frame values are
  reproducible while the `xp_orb` randomization is confirmed as *varying* rather than measured.
- The slash-command path remains unexercised; both runs used the `scriptevent` fallback.

## Raw log — run A (source at `(24.5, 57, 24.5)`, underground)

```
[2026-07-25 03:18:22.570] [mctest] rest start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 03:18:22.570] [mctest] resting-kinematics :: minecraft:sheep getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:18:22.570] [mctest] resting-kinematics :: minecraft:sheep getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:18:22.570] [mctest] resting-kinematics :: minecraft:sheep nameTag ok value=string: length=0
[2026-07-25 03:18:22.570] [mctest] resting-kinematics :: minecraft:sheep requested-location={"z":24.5,"y":57,"x":24.5} location ok value={"z":24.5,"y":57,"x":24.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:18:22.571] [mctest] resting-kinematics :: minecraft:cow getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:18:22.571] [mctest] resting-kinematics :: minecraft:cow getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:18:22.571] [mctest] resting-kinematics :: minecraft:cow nameTag ok value=string: length=0
[2026-07-25 03:18:22.571] [mctest] resting-kinematics :: minecraft:cow requested-location={"z":24.5,"y":57,"x":24.5} location ok value={"z":24.5,"y":57,"x":24.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:18:22.571] [mctest] resting-kinematics :: minecraft:chicken getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:18:22.571] [mctest] resting-kinematics :: minecraft:chicken getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:18:22.571] [mctest] resting-kinematics :: minecraft:chicken nameTag ok value=string: length=0
[2026-07-25 03:18:22.571] [mctest] resting-kinematics :: minecraft:chicken requested-location={"z":24.5,"y":57,"x":24.5} location ok value={"z":24.5,"y":57,"x":24.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:zombie getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:zombie getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:zombie nameTag ok value=string: length=0
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:zombie requested-location={"z":24.5,"y":57,"x":24.5} location ok value={"z":24.5,"y":57,"x":24.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:armor_stand getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:armor_stand getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:armor_stand nameTag ok value=string: length=0
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:armor_stand requested-location={"z":24.5,"y":57,"x":24.5} location ok value={"z":24.5,"y":57,"x":24.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:xp_orb getRotation() ok value={"y":69.07179260253906,"x":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:xp_orb getVelocity() ok value={"z":-0.09496267884969711,"y":0.22630934417247772,"x":0.055352792143821716}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:xp_orb nameTag ok value=string: length=0
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:xp_orb requested-location={"z":24.5,"y":57,"x":24.5} location ok value={"z":24.5,"y":57,"x":24.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:arrow getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:arrow getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:arrow nameTag ok value=string: length=0
[2026-07-25 03:18:22.572] [mctest] resting-kinematics :: minecraft:arrow requested-location={"z":24.5,"y":57,"x":24.5} location ok value={"z":24.5,"y":57,"x":24.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:18:22.573] [mctest] resting-kinematics :: minecraft:boat getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:18:22.573] [mctest] resting-kinematics :: minecraft:boat getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:18:22.573] [mctest] resting-kinematics :: minecraft:boat nameTag ok value=string: length=0
[2026-07-25 03:18:22.573] [mctest] resting-kinematics :: minecraft:boat requested-location={"z":24.5,"y":57,"x":24.5} location ok value={"z":24.299999237060547,"y":57,"x":24.700000762939453} delta={"x":0.20000076293945312,"y":0,"z":-0.20000076293945312}
[2026-07-25 03:18:22.573] [mctest] resting-kinematics :: sampled=8/8 types=[minecraft:sheep, minecraft:cow, minecraft:chicken, minecraft:zombie, minecraft:armor_stand, minecraft:xp_orb, minecraft:arrow, minecraft:boat]
[2026-07-25 03:18:22.573] [mctest] resting-kinematics :: rotation uniform=false distinctValues=2 values=[{"y":0,"x":0} | {"y":69.07179260253906,"x":0}]
[2026-07-25 03:18:22.573] [mctest] resting-kinematics :: velocity uniform=false distinctValues=2 values=[{"z":0,"y":0,"x":0} | {"z":-0.09496267884969711,"y":0.22630934417247772,"x":0.055352792143821716}]
[2026-07-25 03:18:22.573] [mctest] resting-kinematics :: nameTag uniform=true distinctValues=1 values=[""]
[2026-07-25 03:18:22.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0.4550018310546875,"x":0} location ok value={"z":24.5,"y":57.45500183105469,"x":24.5} delta={"x":0,"y":0.4550018310546875,"z":0}
[2026-07-25 03:18:22.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0.4550018310546875,"x":0} location ok value={"z":24.5,"y":57.45500183105469,"x":24.5} delta={"x":0,"y":0.4550018310546875,"z":0}
[2026-07-25 03:18:22.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0.4550018310546875,"x":0} location ok value={"z":24.5,"y":57.45500183105469,"x":24.5} delta={"x":0,"y":0.4550018310546875,"z":0}
[2026-07-25 03:18:22.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:zombie isValid=true getRotation() ok value={"y":30,"x":30} getVelocity() ok value={"z":0,"y":0.4550018310546875,"x":0} location ok value={"z":24.5,"y":57.45500183105469,"x":24.5} delta={"x":0,"y":0.4550018310546875,"z":0}
[2026-07-25 03:18:22.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":24.5,"y":57,"x":24.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:18:22.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:xp_orb isValid=true getRotation() ok value={"y":69.07179260253906,"x":0} getVelocity() ok value={"z":-0.09120216220617294,"y":0.11517000198364258,"x":0.05316082388162613} location ok value={"z":24.311973571777344,"y":57.28131103515625,"x":24.60959815979004} delta={"x":0.10959815979003906,"y":0.28131103515625,"z":-0.18802642822265625}
[2026-07-25 03:18:22.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:arrow isValid=false getRotation() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getRotation' due to Entity being invalid (has the Entity been removed?)." getVelocity() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getVelocity' due to Entity being invalid (has the Entity been removed?)." location threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'location' due to Entity being invalid (has the Entity been removed?)." delta=undefined
[2026-07-25 03:18:22.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0.02256011962890625,"x":0} location ok value={"z":24.299999237060547,"y":57.022560119628906,"x":24.700000762939453} delta={"x":0.20000076293945312,"y":0.02256011962890625,"z":-0.20000076293945312}
[2026-07-25 03:18:22.774] [mctest] rest complete — copy every [mctest] line into the design as the answer record
```

## Raw log — run B (source at `(42.5, 81, 22.5)`, open air on a placed platform)

```
[2026-07-25 03:22:17.570] [mctest] rest start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:sheep getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:sheep getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:sheep nameTag ok value=string: length=0
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:sheep requested-location={"z":22.5,"y":81,"x":42.5} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:cow getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:cow getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:cow nameTag ok value=string: length=0
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:cow requested-location={"z":22.5,"y":81,"x":42.5} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:chicken getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:chicken getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:chicken nameTag ok value=string: length=0
[2026-07-25 03:22:17.571] [mctest] resting-kinematics :: minecraft:chicken requested-location={"z":22.5,"y":81,"x":42.5} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:zombie getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:zombie getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:zombie nameTag ok value=string: length=0
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:zombie requested-location={"z":22.5,"y":81,"x":42.5} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:armor_stand getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:armor_stand getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:armor_stand nameTag ok value=string: length=0
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:armor_stand requested-location={"z":22.5,"y":81,"x":42.5} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:xp_orb getRotation() ok value={"y":288.386962890625,"x":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:xp_orb getVelocity() ok value={"z":0.162714883685112,"y":0.1286885142326355,"x":0.09673430025577545}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:xp_orb nameTag ok value=string: length=0
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:xp_orb requested-location={"z":22.5,"y":81,"x":42.5} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:arrow getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:arrow getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:arrow nameTag ok value=string: length=0
[2026-07-25 03:22:17.572] [mctest] resting-kinematics :: minecraft:arrow requested-location={"z":22.5,"y":81,"x":42.5} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:22:17.573] [mctest] resting-kinematics :: minecraft:boat getRotation() ok value={"y":0,"x":0}
[2026-07-25 03:22:17.573] [mctest] resting-kinematics :: minecraft:boat getVelocity() ok value={"z":0,"y":0,"x":0}
[2026-07-25 03:22:17.573] [mctest] resting-kinematics :: minecraft:boat nameTag ok value=string: length=0
[2026-07-25 03:22:17.573] [mctest] resting-kinematics :: minecraft:boat requested-location={"z":22.5,"y":81,"x":42.5} location ok value={"z":22.700000762939453,"y":81,"x":42.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312}
[2026-07-25 03:22:17.573] [mctest] resting-kinematics :: sampled=8/8 types=[minecraft:sheep, minecraft:cow, minecraft:chicken, minecraft:zombie, minecraft:armor_stand, minecraft:xp_orb, minecraft:arrow, minecraft:boat]
[2026-07-25 03:22:17.573] [mctest] resting-kinematics :: rotation uniform=false distinctValues=2 values=[{"y":0,"x":0} | {"y":288.386962890625,"x":0}]
[2026-07-25 03:22:17.573] [mctest] resting-kinematics :: velocity uniform=false distinctValues=2 values=[{"z":0,"y":0,"x":0} | {"z":0.162714883685112,"y":0.1286885142326355,"x":0.09673430025577545}]
[2026-07-25 03:22:17.573] [mctest] resting-kinematics :: nameTag uniform=true distinctValues=1 values=[""]
[2026-07-25 03:22:17.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0.4550018310546875,"x":0} location ok value={"z":22.5,"y":81.45500183105469,"x":42.5} delta={"x":0,"y":0.4550018310546875,"z":0}
[2026-07-25 03:22:17.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0.4550018310546875,"x":0} location ok value={"z":22.5,"y":81.45500183105469,"x":42.5} delta={"x":0,"y":0.4550018310546875,"z":0}
[2026-07-25 03:22:17.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0.049999237060546875} location ok value={"z":22.700000762939453,"y":81.17500305175781,"x":42.150001525878906} delta={"x":-0.34999847412109375,"y":0.1750030517578125,"z":0.20000076293945312}
[2026-07-25 03:22:17.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0.049999237060546875} location ok value={"z":22.700000762939453,"y":80.67500305175781,"x":42.95000076293945} delta={"x":0.4500007629394531,"y":-0.3249969482421875,"z":0.20000076293945312}
[2026-07-25 03:22:17.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0}
[2026-07-25 03:22:17.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:xp_orb isValid=true getRotation() ok value={"y":288.386962890625,"x":0} getVelocity() ok value={"z":0.15627138316631317,"y":0.04597645625472069,"x":0.09290362149477005} location ok value={"z":22.822174072265625,"y":81.13560485839844,"x":42.691532135009766} delta={"x":0.19153213500976562,"y":0.1356048583984375,"z":0.322174072265625}
[2026-07-25 03:22:17.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:arrow isValid=false getRotation() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getRotation' due to Entity being invalid (has the Entity been removed?)." getVelocity() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getVelocity' due to Entity being invalid (has the Entity been removed?)." location threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'location' due to Entity being invalid (has the Entity been removed?)." delta=undefined
[2026-07-25 03:22:17.670] [mctest] resting-kinematics-after-2-ticks :: minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0.049999237060546875} location ok value={"z":22.700000762939453,"y":81,"x":42.75} delta={"x":0.25,"y":0,"z":0.20000076293945312}
[2026-07-25 03:22:17.770] [mctest] rest complete — copy every [mctest] line into the design as the answer record
```

---

# `resting-kinematics-isolated` (pack 0.3.0)

The isolation-corrected companion to `resting-kinematics`: one type at a time, spawned 4 blocks
clear of the source and removed before the next, sampled on the spawn frame and again at 2 and 22
ticks. Every sample carries `neighboursWithin4`, so contention is visible in the log rather than
assumed absent.

## Run provenance

| | |
|---|---|
| Date | 2026-07-25 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** |
| Pack | `resting-state-probe-pack` **0.3.0**, uuid `6b1c9f2a-4d83-4a17-9c0e-1f5a7b3e2d84` (unchanged) |
| Trigger | `execute as <armor stand> run scriptevent mctest2:rest resting-kinematics-isolated` |
| Source | armor stand at `(38.5, 81, 22.5)`, centred on a placed 17×17 stone platform at `y=80` |
| Coverage | 8/8 types, no `PROBE CRASHED` lines |

## What changes when the sample is uncontended

`neighboursWithin4` reads **1** for every type (the source armor stand, 4 blocks away and not in
contact) against the seven co-located entities the original probe held live. Two results from the
contended runs do not survive:

- **The `+0.4550018310546875` upward velocity is gone.** Sheep reads exactly zero velocity and
  zero positional delta at 2 *and* 22 ticks. It was overlap resolution, as the contended runs'
  own armor-stand control suggested.
- **`minecraft:arrow` does not self-invalidate.** It reads `isValid=true` at 2 and 22 ticks.
  The earlier "invalid within 2 ticks, unprompted" reading is an **artifact of the pile** — the
  arrow was spawned into seven other entities and consumed by contact. Nothing about a resting
  arrow invalidates it.

## What the corrected run shows

**Spawn frame — unchanged from the contended runs**, which is expected since each entity is read
before the next exists:

- Seven of eight spawn `getRotation() = {x:0, y:0}` and `getVelocity() = {x:0, y:0, z:0}`;
  `minecraft:xp_orb` spawns with a randomized y-rotation (`325.0026` this run) and a nonzero
  randomized velocity.
- `nameTag` is `""` for all eight.
- `minecraft:boat` lands `0.2` off the requested point on x and z; every other type lands exactly.

**Post-spawn — a resting entity is not uniformly still, and stillness is type-dependent:**

| type | 2 ticks | 22 ticks |
|---|---|---|
| `sheep`, `chicken` | still | still |
| `armor_stand`, `boat` | still | still |
| `arrow` | still, rotation becomes `{x:-72, y:0}` | unchanged, still valid |
| `cow` | still | rotation `-135.13`, velocity ~`0.06`, moved ~0.41 on x and z |
| `zombie` | still | rotation `-45.01`, velocity ~`0.029`, moved ~0.078 |
| `xp_orb` | self-propelled, moving | settled: velocity ~`7e-6`, ~1 block from spawn |

Three distinct behaviours the spawn frame alone cannot distinguish: types that rest immediately
and stay (`sheep`, `chicken`, `armor_stand`, `boat`); AI-driven types that are still on the spawn
frame and start moving under their own control within ~22 ticks (`cow`, `zombie` — `sheep` and
`chicken` share the mechanism and simply had not moved yet, so this is not a fixed per-type
property); and `xp_orb`, which spawns with momentum and decays to rest.

`minecraft:arrow` is the one type whose **rotation** is not stable across the spawn frame: it is
`{x:0, y:0}` at spawn and `{x:-72, y:0}` two ticks later, with no velocity and no movement.

## Run-validity notes

- **`neighboursWithin4` counts entities within 4 blocks, not entities in contact.** The constant
  `1` is the source armor stand at exactly the offset distance; `sheep` reads `2` because a second
  entity was near the platform. Neither is in contact, so the samples are uncontended — but the
  metric is a proximity bound, not a contact test.
- **The platform is placed terrain.** A 17×17 stone slab at `y=80`, `x 30–46`, `z 14–30`, inside
  the persisted `mctest` ticking area, so every offset lands on solid ground with open air above.
- **`n = 1` for this configuration.** The AI-driven drift in `cow` and `zombie` is nondeterministic
  in direction and timing; only its presence by 22 ticks is reproducible, not the values.
- The source armor stand did not survive either contended run of `resting-kinematics`; a fresh one
  was placed for this run. An armor-stand source is a poor choice for a probe that spawns an armor
  stand at the source location.

## Raw log

```
[2026-07-25 03:27:19.183] [mctest] rest start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 03:27:19.183] [mctest] resting-kinematics-isolated :: minecraft:sheep requested-location={"x":42.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:27:19.183] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=2
[2026-07-25 03:27:19.288] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=2
[2026-07-25 03:27:20.287] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=2
[2026-07-25 03:27:20.383] [mctest] resting-kinematics-isolated :: minecraft:cow requested-location={"x":34.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:27:20.383] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:20.487] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:21.488] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:cow isValid=true getRotation() ok value={"y":-135.13467407226562,"x":0} getVelocity() ok value={"z":-0.06011009216308594,"y":0,"x":0.0598297119140625} location ok value={"z":22.095735549926758,"y":81,"x":34.90705871582031} delta={"x":0.4070587158203125,"y":0,"z":-0.4042644500732422} neighboursWithin4=1
[2026-07-25 03:27:21.583] [mctest] resting-kinematics-isolated :: minecraft:chicken requested-location={"x":38.5,"y":81,"z":26.5} nameTag ok value=string: length=0
[2026-07-25 03:27:21.583] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:21.682] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:22.682] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:22.789] [mctest] resting-kinematics-isolated :: minecraft:zombie requested-location={"x":38.5,"y":81,"z":18.5} nameTag ok value=string: length=0
[2026-07-25 03:27:22.790] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:22.882] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:23.882] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:zombie isValid=true getRotation() ok value={"y":-45.01167297363281,"x":0} getVelocity() ok value={"z":0.029224395751953125,"y":0,"x":0.029232025146484375} location ok value={"z":18.57805061340332,"y":81,"x":38.577674865722656} delta={"x":0.07767486572265625,"y":0,"z":0.07805061340332031} neighboursWithin4=1
[2026-07-25 03:27:23.988] [mctest] resting-kinematics-isolated :: minecraft:armor_stand requested-location={"x":42.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:27:23.988] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:24.082] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:25.082] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:25.182] [mctest] resting-kinematics-isolated :: minecraft:xp_orb requested-location={"x":34.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:27:25.183] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:xp_orb isValid=true getRotation() ok value={"y":325.0025939941406,"x":0} getVelocity() ok value={"z":-0.1840614527463913,"y":0.09695979207754135,"x":0.06731946766376495} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:25.287] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:xp_orb isValid=true getRotation() ok value={"y":325.0025939941406,"x":0} getVelocity() ok value={"z":-0.17677262425422668,"y":0.01550418883562088,"x":0.06465362012386322} location ok value={"z":22.13555908203125,"y":81.07278442382812,"x":34.6332893371582} delta={"x":0.13328933715820312,"y":0.072784423828125,"z":-0.36444091796875} neighboursWithin4=1
[2026-07-25 03:27:26.287] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:xp_orb isValid=true getRotation() ok value={"y":325.0025939941406,"x":0} getVelocity() ok value={"z":-0.000007191361419245368,"y":0,"x":0.000002630200924613746} location ok value={"z":21.53832244873047,"y":81,"x":34.851722717285156} delta={"x":0.35172271728515625,"y":0,"z":-0.9616775512695312} neighboursWithin4=1
[2026-07-25 03:27:26.382] [mctest] resting-kinematics-isolated :: minecraft:arrow requested-location={"x":38.5,"y":81,"z":26.5} nameTag ok value=string: length=0
[2026-07-25 03:27:26.383] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:26.488] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":-72} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:27.487] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":-72} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:27:27.582] [mctest] resting-kinematics-isolated :: minecraft:boat requested-location={"x":38.5,"y":81,"z":18.5} nameTag ok value=string: length=0
[2026-07-25 03:27:27.582] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:27:27.682] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:27:28.682] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:27:28.882] [mctest] rest complete — copy every [mctest] line into the design as the answer record
```

---

# `resting-kinematics-isolated` — variation across four runs

Four consecutive runs of the same probe against the same source and platform, to separate the
values that are engine constants from the ones that are drawn per spawn. Same provenance as the
run above (pack 0.3.0, Bedrock 1.26.31.1, `@minecraft/server` 2.8.0, source at `(38.5, 81, 22.5)`),
8/8 types and no crashes in every run.

## Deterministic — bit-identical in 4/4 runs

- **Every spawn-frame value except `xp_orb`'s.** All seven other types read
  `getRotation() = {x:0, y:0}` and `getVelocity() = {x:0, y:0, z:0}` on the spawn frame in all
  four runs, and `nameTag` is `""` throughout.
- **The boat's spawn offset**: `delta={x:0.20000076293945312, y:0, z:0.20000076293945312}`,
  identical to the last digit in 4/4. Against the two earlier contended runs — which used
  different base locations and produced `(+0.2, -0.2)` and `(+0.2, +0.2)` — the magnitude is
  constant while the sign tracks the spawn position, so this is a deterministic placement
  adjustment rather than a random one.
- **The arrow's post-spawn rotation**: `{x:-72, y:0}` at 2 and 22 ticks in 4/4, with the entity
  never moving and its velocity never leaving zero.
- **`minecraft:arrow` stays valid**: `isValid=true` at 22 ticks in 4/4, confirming the
  contended runs' invalidation was contact, not self-removal.
- **`minecraft:armor_stand` never moves**: zero velocity, zero delta, at both samples in 4/4.

## Drawn per spawn

**`minecraft:xp_orb` rotation and velocity are randomized on every spawn** — four runs, four
distinct values, no repeats:

| run | rotation.y | velocity |
|---|---|---|
| 1 | `325.0026` | `{x:0.0673, y:0.0970, z:-0.1841}` |
| 2 | `37.7103` | `{x:-0.1899, y:0.1864, z:0.0300}` |
| 3 | `191.0609` | `{x:-0.0842, y:0.2846, z:-0.1761}` |
| 4 | `61.4511` | `{x:-0.1481, y:0.0508, z:0.0354}` |

The y-rotation spans the full circle and every velocity component takes both signs, so this is a
per-spawn draw rather than a constant.

## Whether a mob has started moving by 22 ticks is per-run, not per-type

The single most important correction the repeat runs make. Movement observed at the 22-tick
sample, out of four runs:

| type | moved | runs |
|---|---|---|
| `minecraft:zombie` | 2/4 | 1, 2 |
| `minecraft:sheep` | 1/4 | 3 |
| `minecraft:cow` | 1/4 | 1 |
| `minecraft:chicken` | 0/4 | — |

Run 3 is the decisive one: `sheep` moved while `cow` and `zombie` both stayed put — the exact
inverse of run 1. **No AI-driven type is reliably still at 22 ticks, and none reliably moves.**
A single run cannot tell the two apart, so the earlier run's cow-and-zombie-move / sheep-and-
chicken-stay split was an artifact of `n = 1`. `chicken` at 0/4 is consistent with the same
mechanism at a lower rate, not with a stationary type; four runs cannot distinguish those.

When a mob does turn, the y-rotation lands near a multiple of 45° in every observed case
(`45.0089`, `-45.0117`, `-90.0187`, `-135.1347`), which is worth a dedicated probe before being
relied on.

## What this means for the sample

The spawn frame is deterministic for seven of eight types and reproducible across runs. The
post-spawn sample is not a property of the type at all for AI-driven mobs — it is a draw, and a
single run cannot be read as characterising a type.

## Raw logs — runs 2, 3 and 4

Run 1 is the log recorded in the section above.

### Run 2

```
[2026-07-25 03:36:39.883] [mctest] rest start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 03:36:39.883] [mctest] resting-kinematics-isolated :: minecraft:sheep requested-location={"x":42.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:36:39.883] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:39.987] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:40.988] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:41.083] [mctest] resting-kinematics-isolated :: minecraft:cow requested-location={"x":34.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:36:41.083] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:41.187] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:42.187] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:42.283] [mctest] resting-kinematics-isolated :: minecraft:chicken requested-location={"x":38.5,"y":81,"z":26.5} nameTag ok value=string: length=0
[2026-07-25 03:36:42.283] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:42.382] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:43.382] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:43.487] [mctest] resting-kinematics-isolated :: minecraft:zombie requested-location={"x":38.5,"y":81,"z":18.5} nameTag ok value=string: length=0
[2026-07-25 03:36:43.487] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:43.582] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:44.582] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:zombie isValid=true getRotation() ok value={"y":-90.01869201660156,"x":0} getVelocity() ok value={"z":-0.000057220458984375,"y":0,"x":0.11047744750976562} location ok value={"z":18.50044059753418,"y":81,"x":39.14875793457031} delta={"x":0.6487579345703125,"y":0,"z":0.0004405975341796875} neighboursWithin4=0
[2026-07-25 03:36:44.687] [mctest] resting-kinematics-isolated :: minecraft:armor_stand requested-location={"x":42.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:36:44.688] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:44.782] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:45.782] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:45.883] [mctest] resting-kinematics-isolated :: minecraft:xp_orb requested-location={"x":34.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:36:45.883] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:xp_orb isValid=true getRotation() ok value={"y":37.7103385925293,"x":0} getVelocity() ok value={"z":0.02999432384967804,"y":0.18638093769550323,"x":-0.18991337716579437} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:45.987] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:xp_orb isValid=true getRotation() ok value={"y":37.7103385925293,"x":0} getVelocity() ok value={"z":0.028806550428271294,"y":0.1013842523097992,"x":-0.18239282071590424} location ok value={"z":22.559389114379883,"y":81.24983215332031,"x":34.12397003173828} delta={"x":-0.37602996826171875,"y":0.2498321533203125,"z":0.05938911437988281} neighboursWithin4=0
[2026-07-25 03:36:46.987] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:xp_orb isValid=true getRotation() ok value={"y":37.7103385925293,"x":0} getVelocity() ok value={"z":0.000015070612789713778,"y":0,"x":-0.00009542178304400295} location ok value={"z":22.78571319580078,"y":81,"x":32.69096374511719} delta={"x":-1.8090362548828125,"y":0,"z":0.28571319580078125} neighboursWithin4=0
[2026-07-25 03:36:47.083] [mctest] resting-kinematics-isolated :: minecraft:arrow requested-location={"x":38.5,"y":81,"z":26.5} nameTag ok value=string: length=0
[2026-07-25 03:36:47.083] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:47.187] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":-72} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:48.187] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":-72} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:36:48.282] [mctest] resting-kinematics-isolated :: minecraft:boat requested-location={"x":38.5,"y":81,"z":18.5} nameTag ok value=string: length=0
[2026-07-25 03:36:48.283] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:36:48.382] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:36:49.382] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:36:49.582] [mctest] rest complete — copy every [mctest] line into the design as the answer record
```

### Run 3

```
[2026-07-25 03:37:31.488] [mctest] rest start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 03:37:31.488] [mctest] resting-kinematics-isolated :: minecraft:sheep requested-location={"x":42.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:37:31.488] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:31.582] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:32.582] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:sheep isValid=true getRotation() ok value={"y":45.00886535644531,"x":0} getVelocity() ok value={"z":0.029804229736328125,"y":0,"x":-0.029811859130859375} location ok value={"z":22.588825225830078,"y":81,"x":42.41145706176758} delta={"x":-0.08854293823242188,"y":0,"z":0.08882522583007812} neighboursWithin4=1
[2026-07-25 03:37:32.688] [mctest] resting-kinematics-isolated :: minecraft:cow requested-location={"x":34.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:37:32.688] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:32.782] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:33.782] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:33.883] [mctest] resting-kinematics-isolated :: minecraft:chicken requested-location={"x":38.5,"y":81,"z":26.5} nameTag ok value=string: length=0
[2026-07-25 03:37:33.883] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:33.987] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:34.987] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:35.083] [mctest] resting-kinematics-isolated :: minecraft:zombie requested-location={"x":38.5,"y":81,"z":18.5} nameTag ok value=string: length=0
[2026-07-25 03:37:35.083] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:35.187] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:36.187] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:36.282] [mctest] resting-kinematics-isolated :: minecraft:armor_stand requested-location={"x":42.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:37:36.282] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:36.382] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:37.382] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:37.487] [mctest] resting-kinematics-isolated :: minecraft:xp_orb requested-location={"x":34.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:37:37.488] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:xp_orb isValid=true getRotation() ok value={"y":191.06085205078125,"x":0} getVelocity() ok value={"z":-0.17607101798057556,"y":0.2845551669597626,"x":-0.08416210860013962} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:37.582] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:xp_orb isValid=true getRotation() ok value={"y":191.06085205078125,"x":0} getVelocity() ok value={"z":-0.1690986156463623,"y":0.19567081332206726,"x":-0.08082929253578186} location ok value={"z":22.151378631591797,"y":81.4442138671875,"x":34.33335876464844} delta={"x":-0.1666412353515625,"y":0.4442138671875,"z":-0.3486213684082031} neighboursWithin4=0
[2026-07-25 03:37:38.582] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:xp_orb isValid=true getRotation() ok value={"y":191.06085205078125,"x":0} getVelocity() ok value={"z":-0.0006826131138950586,"y":0,"x":-0.0003262896789237857} location ok value={"z":20.271041870117188,"y":81,"x":33.43455123901367} delta={"x":-1.0654487609863281,"y":0,"z":-2.2289581298828125} neighboursWithin4=0
[2026-07-25 03:37:38.687] [mctest] resting-kinematics-isolated :: minecraft:arrow requested-location={"x":38.5,"y":81,"z":26.5} nameTag ok value=string: length=0
[2026-07-25 03:37:38.687] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:38.782] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":-72} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:39.782] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":-72} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:37:39.882] [mctest] resting-kinematics-isolated :: minecraft:boat requested-location={"x":38.5,"y":81,"z":18.5} nameTag ok value=string: length=0
[2026-07-25 03:37:39.883] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:37:39.987] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:37:40.987] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:37:41.187] [mctest] rest complete — copy every [mctest] line into the design as the answer record
```

### Run 4

```
[2026-07-25 03:38:22.782] [mctest] rest start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-25 03:38:22.783] [mctest] resting-kinematics-isolated :: minecraft:sheep requested-location={"x":42.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:38:22.783] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:22.882] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:23.882] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:sheep isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:23.988] [mctest] resting-kinematics-isolated :: minecraft:cow requested-location={"x":34.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:38:23.988] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:24.082] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:25.082] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:cow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:25.188] [mctest] resting-kinematics-isolated :: minecraft:chicken requested-location={"x":38.5,"y":81,"z":26.5} nameTag ok value=string: length=0
[2026-07-25 03:38:25.188] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:25.282] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:26.282] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:chicken isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:26.383] [mctest] resting-kinematics-isolated :: minecraft:zombie requested-location={"x":38.5,"y":81,"z":18.5} nameTag ok value=string: length=0
[2026-07-25 03:38:26.383] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:26.487] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:27.487] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:zombie isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:27.583] [mctest] resting-kinematics-isolated :: minecraft:armor_stand requested-location={"x":42.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:38:27.583] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:27.687] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:28.687] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:armor_stand isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":22.5,"y":81,"x":42.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:28.782] [mctest] resting-kinematics-isolated :: minecraft:xp_orb requested-location={"x":34.5,"y":81,"z":22.5} nameTag ok value=string: length=0
[2026-07-25 03:38:28.783] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:xp_orb isValid=true getRotation() ok value={"y":61.451141357421875,"x":0} getVelocity() ok value={"z":0.03544740378856659,"y":0.05080430582165718,"x":-0.14810675382614136} location ok value={"z":22.5,"y":81,"x":34.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:28.882] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:xp_orb isValid=true getRotation() ok value={"y":61.451141357421875,"x":0} getVelocity() ok value={"z":0.02042621374130249,"y":0,"x":-0.08534505218267441} location ok value={"z":22.570186614990234,"y":81,"x":34.206748962402344} delta={"x":-0.29325103759765625,"y":0,"z":0.07018661499023438} neighboursWithin4=0
[2026-07-25 03:38:29.882] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:xp_orb isValid=true getRotation() ok value={"y":61.451141357421875,"x":0} getVelocity() ok value={"z":4.985804480384104e-7,"y":0,"x":-0.0000020831746496696724} location ok value={"z":22.619762420654297,"y":81,"x":33.99959945678711} delta={"x":-0.5004005432128906,"y":0,"z":0.11976242065429688} neighboursWithin4=0
[2026-07-25 03:38:29.987] [mctest] resting-kinematics-isolated :: minecraft:arrow requested-location={"x":38.5,"y":81,"z":26.5} nameTag ok value=string: length=0
[2026-07-25 03:38:29.988] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:30.082] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":-72} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:31.082] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:arrow isValid=true getRotation() ok value={"y":0,"x":-72} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":26.5,"y":81,"x":38.5} delta={"x":0,"y":0,"z":0} neighboursWithin4=1
[2026-07-25 03:38:31.187] [mctest] resting-kinematics-isolated :: minecraft:boat requested-location={"x":38.5,"y":81,"z":18.5} nameTag ok value=string: length=0
[2026-07-25 03:38:31.187] [mctest] resting-kinematics-isolated :: [spawn-frame] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:38:31.282] [mctest] resting-kinematics-isolated :: [after-2-ticks] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:38:32.282] [mctest] resting-kinematics-isolated :: [after-22-ticks] minecraft:boat isValid=true getRotation() ok value={"y":0,"x":0} getVelocity() ok value={"z":0,"y":0,"x":0} location ok value={"z":18.700000762939453,"y":81,"x":38.70000076293945} delta={"x":0.20000076293945312,"y":0,"z":0.20000076293945312} neighboursWithin4=1
[2026-07-25 03:38:32.487] [mctest] rest complete — copy every [mctest] line into the design as the answer record
```

