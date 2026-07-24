# mctest engine probe results

Two runs: the initial 18-probe `mctest:run` set, then the 4-probe `mctest:deep` set added in
pack 0.2.0.

---

# Initial run (`mctest:run`)

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

---

# Deep run (`mctest:deep`)

The four follow-up probes added in `engine-probe-pack` 0.2.0, resolving residuals the first
run left open.

## Run provenance

| | |
|---|---|
| Date | 2026-07-24 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** |
| Pack | `engine-probe-pack` **0.2.0**, uuid `ef5201d2-38eb-4f29-8bc2-e84414de8837` |
| Trigger | `execute as @e[type=armor_stand,c=1] run scriptevent mctest:deep` from the console |
| Coverage | 4/4 probes, single run, no `PROBE CRASHED` lines |

Run against a summoned armor stand on a stone platform at `8 101 8`, inside a ticking area
added at spawn — an isolated flat anchor rather than the player's spawn used in the first
run. Same world and volume as the first run.

## What the deep probes settled

- **`effect-replacement-matrix` — the rule is amplifier-first, duration-tiebreak.** A re-add
  replaces iff it has a **higher amplifier**, or the **same amplifier and a longer duration**.
  A lower amplifier never replaces, regardless of duration:

  | re-add vs. base (amp1, dur300) | replaced |
  |---|---|
  | higher amp, shorter dur | ✅ |
  | higher amp, longer dur | ✅ |
  | same amp, shorter dur | ❌ |
  | same amp, longer dur | ✅ |
  | lower amp, shorter dur | ❌ |
  | lower amp, longer dur | ❌ |

  This confirms and generalizes the first run's `effect-replace-unconditional` result:
  replacement is conditional, and unconditional-replace semantics in a fake are wrong.

- **`invalidation-guard-enumeration` — the complete guard list**, read off the engine rather
  than off `@throws` annotations (which the first run showed under-report it). On a removed
  entity, exactly four members still read: `id`, `isValid`, `typeId`, and
  `scoreboardIdentity` (which returns `undefined`). **Every other enumerated member throws
  `InvalidEntityError`** — all 12 remaining properties and all 11 zero-arg getters. Note
  `localizationKey`'s message reads `Failed to call function` despite being accessed as a
  property.

- **`kill-no-health-and-repeat` — `kill()` on a health-less entity.** An arrow has
  `healthComponent=undefined`; `kill()` still returns `true` and fires **only**
  `die(cause=selfDestruct)` — no `entityHurt`, no `entityHealthChanged`. It is also
  **immediately invalid** (`stillValid=false`), unlike the sheep corpse in the first run that
  stayed valid ~7 ticks. So post-death validity is not a uniform grace period.

- **`after-event-tick-delay` — the deferral is sub-tick, not cross-tick.**
  `called-at=72309 returned-at=72309 delivered-at=72309`, so **`delay-ticks=0`**. Combined
  with the first run's `events-delivered-before-applyDamage-returned=0`, the model is: the
  after-event is deferred past the mutating call's return but delivered **within the same
  tick**. A fake that defers to the next tick is wrong in the other direction.

## Operational notes for re-running the pack

Two things bit this run and will bite the next one:

- **A new custom command cannot be registered by `/reload`.** Shipping 0.2.0 over 0.1.0 and
  reloading fails with `CustomCommandError: Custom Command reload failed, cannot change
  parameters for 'mctest:deep' during reload.` A full server restart is required whenever the
  registered command set changes.
- **The manifest version bump must be mirrored in `world_behavior_packs.json`.** 0.2.0 bumped
  `header.version`, and the world's activation entry still pinned `[0, 1, 0]`, so the server
  logged `Configured pack (id: ef5201d2-…, version: 0.1.0) was not found and was ignored` and
  booted **without the probe pack** — no error beyond that one line. Worth checking the
  `Pack Stack` lines on boot before trusting a run.
- The `/mctest:deep` slash command is again unexercised; the `scriptevent` fallback was used.
- Bedrock selectors use `c=1`, not `limit=1`.

## Raw log

```
[2026-07-24 19:26:01.298] [mctest] deep start — 4 probe(s), @minecraft/server 2.8.0 expected
[2026-07-24 19:26:01.298] [mctest] effect-replacement-matrix :: base(amp1,dur300) readd(amp2,dur100) [higher-amp/shorter] -> readback(amp2,dur100) replaced=true
[2026-07-24 19:26:01.299] [mctest] effect-replacement-matrix :: base(amp1,dur300) readd(amp2,dur600) [higher-amp/longer] -> readback(amp2,dur600) replaced=true
[2026-07-24 19:26:01.299] [mctest] effect-replacement-matrix :: base(amp1,dur300) readd(amp1,dur100) [same-amp/shorter] -> readback(amp1,dur300) replaced=false
[2026-07-24 19:26:01.299] [mctest] effect-replacement-matrix :: base(amp1,dur300) readd(amp1,dur600) [same-amp/longer] -> readback(amp1,dur600) replaced=true
[2026-07-24 19:26:01.300] [mctest] effect-replacement-matrix :: base(amp1,dur300) readd(amp0,dur100) [lower-amp/shorter] -> readback(amp1,dur300) replaced=false
[2026-07-24 19:26:01.300] [mctest] effect-replacement-matrix :: base(amp1,dur300) readd(amp0,dur600) [lower-amp/longer] -> readback(amp1,dur300) replaced=false
[2026-07-24 19:26:01.476] [mctest] invalidation-guard-enumeration :: prop dimension threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'dimension' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.476] [mctest] invalidation-guard-enumeration :: prop id ok value=string:-60129542137
[2026-07-24 19:26:01.476] [mctest] invalidation-guard-enumeration :: prop isClimbing threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isClimbing' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.476] [mctest] invalidation-guard-enumeration :: prop isFalling threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isFalling' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.476] [mctest] invalidation-guard-enumeration :: prop isInWater threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isInWater' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop isOnGround threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isOnGround' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop isSleeping threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSleeping' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop isSneaking threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSneaking' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop isSprinting threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSprinting' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop isSwimming threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'isSwimming' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop isValid ok value=boolean:false
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop localizationKey threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'localizationKey' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop location threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'location' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop nameTag threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to set property 'nameTag' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop scoreboardIdentity ok value=undefined
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: prop typeId ok value=string:minecraft:sheep
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getAABB() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getAABB' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getComponents() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponents' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getEffects() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEffects' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getHeadLocation() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getHeadLocation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getRotation() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getRotation' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getTags() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getTags' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getVelocity() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getVelocity' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getViewDirection() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getViewDirection' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getDynamicPropertyIds() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicPropertyIds' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.477] [mctest] invalidation-guard-enumeration :: method getDynamicPropertyTotalByteCount() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicPropertyTotalByteCount' due to Entity being invalid (has the Entity been removed?)."
[2026-07-24 19:26:01.776] [mctest] kill-no-health-and-repeat :: arrow healthComponent=undefined kill ok value=boolean:true sequence=[die(cause=selfDestruct)] stillValid=false
[2026-07-24 19:26:02.171] [mctest] after-event-tick-delay :: called-at=72309 returned-at=72309 delivered-at=72309 delay-ticks=0
[2026-07-24 19:26:02.276] [mctest] deep complete — copy every [mctest] line into the design as the answer record
```
