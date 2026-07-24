# mctest engine probe results

Observed output from running `engine-probe-pack` against a real Bedrock dedicated server.
Each `[mctest] <question-id> :: …` line is evidence for the `spec.md` question of the same
name. The probes report what the engine did; nothing here is an assertion about what it
should do.

## Run provenance

| | |
|---|---|
| Date | 2026-07-24 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `engine-probe-pack` 0.1.0, uuid `ef5201d2-38eb-4f29-8bc2-e84414de8837` |
| Trigger | `execute as <player> run scriptevent mctest:run` from the server console |
| Coverage | 18/18 probes, single run, no `PROBE CRASHED` lines |

The pack was installed into the server's `development_behavior_packs/` pool and activated
in `world_behavior_packs.json` alongside a `hello-world` pack; the pack stack loaded it as
`[01] mc-test-lib engine probes`.

## Reading the log

Two probes emit lines that are ambiguous without the source and the timestamps:

- **`death-invalidation-timing`** emits four identically-shaped `after-wait isValid=…`
  lines. They are the loop over `[0, 5, 20, 40]` extra ticks on top of an initial 2-tick
  wait — so the samples are at roughly **2, 7, 27, and 67 ticks after `kill()`**. The
  timestamps corroborate the mapping (+249 ms ≈ 5 ticks, +1000 ms = 20, +2000 ms = 40).
  The observed transition is `true, true, false, false`: **the corpse remains valid through
  ~7 ticks post-death and is invalid by ~27.** The exact boundary is unmeasured.
- **`effect-replace-unconditional`** stages `speed` 600 ticks/amplifier 2, then re-adds
  `speed` 100 ticks/amplifier 0. The reading is `duration=599 amplifier=2` — the weaker
  re-add did **not** take, and the original is simply one tick further along. **Effect
  replacement is not unconditional**; the probe's name presumes a behavior the engine
  contradicts.

## Run-validity notes

- **No environmental pollution.** Every recorded `sequence=[…]` contains only
  probe-induced events. This was a random survival world at the player's spawn rather than
  the flat/peaceful world the pack README suggests as a fallback, and it was not needed.
- **No script errors** appear in the content log for the whole session, so the
  `system.beforeEvents.startup` custom-command registration did not throw.
- **The `/mctest:run` slash command itself is unexercised.** The run went through the
  `scriptevent` fallback, so the custom-command path is only known not to have thrown at
  registration.
- **Single run, so `n = 1` for anything nondeterministic.** Notably the entity ids in
  `entity-id-reuse` and the `damage=1.045823097229004` figure in `damage-default-cause`
  (a real arrow, so the value is velocity-dependent and should not be read as a constant).
- `difficulty` was `normal`. A ticking area was added at spawn to keep chunks loaded before
  a player joined; the run itself happened at the player's location.

## Raw log

Verbatim, in delivery order, with server timestamps.

```
[2026-07-24 18:56:23.772] [mctest] run start — 18 probe(s), @minecraft/server 2.8.0 expected
[2026-07-24 18:56:23.775] [mctest] addeffect-success-return :: add ok value=object(Effect)
[2026-07-24 18:56:23.775] [mctest] addeffect-success-return :: returned-object typeId=minecraft:speed duration=200 amplifier=1
[2026-07-24 18:56:23.775] [mctest] addeffect-success-return :: update ok value=object(Effect)
[2026-07-24 18:56:23.906] [mctest] effect-member-guard-derivation :: removed-effect amplifier threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'amplifier'."
[2026-07-24 18:56:23.906] [mctest] effect-member-guard-derivation :: removed-effect duration threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'duration'."
[2026-07-24 18:56:23.906] [mctest] effect-member-guard-derivation :: removed-effect typeId threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'typeId'."
[2026-07-24 18:56:23.906] [mctest] effect-member-guard-derivation :: removed-effect displayName threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'displayName'."
[2026-07-24 18:56:23.906] [mctest] effect-member-guard-derivation :: removed-effect isValid ok value=boolean:false
[2026-07-24 18:56:24.006] [mctest] effect-member-guard-derivation :: invalid-owner amplifier threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'amplifier'."
[2026-07-24 18:56:24.006] [mctest] effect-member-guard-derivation :: invalid-owner duration threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'duration'."
[2026-07-24 18:56:24.006] [mctest] effect-member-guard-derivation :: invalid-owner typeId threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'typeId'."
[2026-07-24 18:56:24.006] [mctest] effect-member-guard-derivation :: invalid-owner displayName threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'displayName'."
[2026-07-24 18:56:24.007] [mctest] effect-member-guard-derivation :: invalid-owner isValid ok value=boolean:false
[2026-07-24 18:56:24.306] [mctest] damage-event-order-in-engine :: nonlethal sequence=[hurt(damage=2,cause=none), health(8->6)]
[2026-07-24 18:56:24.506] [mctest] damage-event-order-in-engine :: lethal sequence=[hurt(damage=98,cause=none), health(6->-92), die(cause=none)]
[2026-07-24 18:56:24.806] [mctest] damage-default-cause :: no-options sequence=[hurt(damage=1,cause=none), health(8->7)]
[2026-07-24 18:56:25.006] [mctest] damage-default-cause :: projectile-options sequence=[hurt(damage=1.045823097229004,cause=projectile), health(7->5.954176902770996)]
[2026-07-24 18:56:25.306] [mctest] clamped-hit-damage-payload :: health-before=8 requested=100 sequence=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)]
[2026-07-24 18:56:25.606] [mctest] kill-cascade :: first-kill return ok value=boolean:true sequence=[hurt(damage=8,cause=selfDestruct), health(8->0), die(cause=selfDestruct)]
[2026-07-24 18:56:25.807] [mctest] kill-cascade :: second-kill return ok value=boolean:true sequence=[]
[2026-07-24 18:56:26.106] [mctest] remove-fires-no-death-event :: sequence=[]
[2026-07-24 18:56:26.307] [mctest] death-invalidation-timing :: inside-die-handler isValid ok value=boolean:true; hasTag ok value=boolean:false
[2026-07-24 18:56:26.307] [mctest] death-invalidation-timing :: after-wait isValid=true
[2026-07-24 18:56:26.556] [mctest] death-invalidation-timing :: after-wait isValid=true
[2026-07-24 18:56:27.556] [mctest] death-invalidation-timing :: after-wait isValid=false
[2026-07-24 18:56:29.556] [mctest] death-invalidation-timing :: after-wait isValid=false
[2026-07-24 18:56:29.856] [mctest] component-health-writes-fire-events :: setCurrentValue(3) return ok value=boolean:true sequence=[health(8->3)]
[2026-07-24 18:56:30.056] [mctest] component-health-writes-fire-events :: resetToMaxValue sequence=[health(3->8)]
[2026-07-24 18:56:30.256] [mctest] component-health-writes-fire-events :: resetToMinValue sequence=[health(8->0), die(cause=override)]
[2026-07-24 18:56:30.406] [mctest] effect-replace-unconditional :: after-lower-readd duration=599 amplifier=2
[2026-07-24 18:56:30.507] [mctest] effect-amplifier-default :: amplifier=0
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: currentValue threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'current'."
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: defaultValue threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'value'."
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: effectiveMax threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'effectiveMaxValue'."
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: effectiveMin threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to get property 'effectiveMinValue'."
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: isValid ok value=boolean:false
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: typeId ok value=string:minecraft:health
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: resetToDefaultValue threw name=Error ctor=Error instanceofInvalidEntityError=false message="Failed to call function 'resetToDefaultValue'."
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: setCurrentValue(1) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to set property 'setCurrent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 18:56:30.707] [mctest] attribute-generic-throws-on-invalid-owner :: entity threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'entity' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 18:56:30.807] [mctest] set-current-value-bounds :: staged min=0 max=8
[2026-07-24 18:56:30.807] [mctest] set-current-value-bounds :: at-max ok value=boolean:true
[2026-07-24 18:56:30.807] [mctest] set-current-value-bounds :: above-max threw name=ArgumentOutOfBoundsError ctor=ArgumentOutOfBoundsError instanceofInvalidEntityError=false message="Unsupported or out of bounds value passed to function argument [0]: value, Value: 1008, Argument bounds: [0, 8]"
[2026-07-24 18:56:30.807] [mctest] set-current-value-bounds :: below-min threw name=ArgumentOutOfBoundsError ctor=ArgumentOutOfBoundsError instanceofInvalidEntityError=false message="Unsupported or out of bounds value passed to function argument [0]: value, Value: -1000, Argument bounds: [0, 8]"
[2026-07-24 18:56:30.807] [mctest] set-current-value-bounds :: at-min ok value=boolean:true
[2026-07-24 18:56:30.906] [mctest] get-dimension-invalid-id-error :: threw name=Error ctor=Error instanceofInvalidEntityError=false message="Dimension 'mctest:nope' is invalid."
[2026-07-24 18:56:31.207] [mctest] after-event-delivery-timing :: events-delivered-before-applyDamage-returned=0 total-after-4-ticks=2
[2026-07-24 18:56:31.207] [mctest] after-event-delivery-timing :: handler-observed event(8->6) componentReadsNow=6
[2026-07-24 18:56:31.507] [mctest] duplicate-subscription-delivery :: same-closure-subscribed-twice deliveries=1
[2026-07-24 18:56:31.507] [mctest] duplicate-subscription-delivery :: subscription-order=[first, second]
[2026-07-24 18:56:31.708] [mctest] entity-id-reuse :: first=[-47244640214, -47244640213, -47244640212] second=[-47244640211, -47244640210, -47244640209] reused=[]
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: id ok value=string:-47244640208
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: typeId ok value=string:minecraft:sheep
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: isValid ok value=boolean:false
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: nameTag threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to set property 'nameTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: isSneaking threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSneaking' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: scoreboardIdentity ok value=undefined
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: hasTag threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: getComponent threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 18:56:31.907] [mctest] invalidation-nonuniformity-in-engine :: location threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'location' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 18:56:32.007] [mctest] run complete — copy every [mctest] line into the design as the answer record
```
