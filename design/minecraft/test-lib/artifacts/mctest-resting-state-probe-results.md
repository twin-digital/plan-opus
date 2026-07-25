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
