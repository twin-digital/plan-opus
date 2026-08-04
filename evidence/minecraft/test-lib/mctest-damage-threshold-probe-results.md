# mctest damage-threshold probe results

Observed output from running `damage-threshold-probe-pack` against a real Bedrock dedicated
server: `mctest4:nohealth`, `mctest4:threshold`, `mctest4:handlers` and `mctest4:beforeevents`.
Each set was run three times. The probes report what the engine did; nothing here is an assertion
about what the fake should do.

## Run provenance

| | |
|---|---|
| Date | 2026-07-27 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `damage-threshold-probe-pack` 0.1.0, uuid `37965a8f-ab62-4107-b040-d7c7e0587ed4` |
| Trigger | `execute as <armor stand> run scriptevent mctest4:<set>` from the server console |
| Source | stationary armor stand at `(38.5, 81, 22.5)`, on a placed stone platform inside the `mctest` ticking area |
| Coverage | 3 × each set, 12 runs, no `PROBE CRASHED` lines, every `complete` line present |

The pack was installed into the server's `development_behavior_packs/` pool and activated in
`world_behavior_packs.json` alongside the four earlier packs. The boot pack stack loaded all five,
with this pack as `[04] mc-test-lib damage-threshold probes`.

**Reproducibility.** The three runs of each set agree exactly: the `nohealth` and `threshold`
`SUMMARY` blocks are byte-identical across their three runs (md5 match), and the `handlers` and
`beforeevents` verdict multisets are identical. Nothing below rests on a single observation.

## Set D first — the before-events *are* raised, so the set discriminates

The README says to read `BEFORE-EVENT-NOT-RAISED` before anything else. **It does not appear in any
run.** Both `control-no-write` cases show `handler-entered` with the action landing at the
requested value — damage `8 -> 4` for a requested 4, and an effect present at `duration=198` for a
requested 200. The engine raises `beforeEvents.entityHurt` and `beforeEvents.effectAdd` for
script-initiated `applyDamage` / `addEffect` calls, so the cancel and field-write cases mean what
they appear to mean.

### Cancellation gates the action, and the return values disagree with each other

Identical in 3/3 runs:

| case | call returns | did the action land? | verdict |
|---|---|---|---|
| `before-entity-hurt` / `cancel` | `true` | **no** — health `8 -> 8`, `cascade=[]` | `CONTRADICTS-SPEC-CANCELLED-RETURNED-TRUE` |
| `before-effect-add` / `cancel` | `undefined` | **no** — `effect-present=false` | `MATCHES-SPEC-CANCELLED-RETURNED-UNDEFINED` |

`r:before-events-can-cancel` holds on both surfaces: cancelling really does gate the action. What
does not hold is `d:cancelled-actions-return-the-no-op-value`, and only on one surface —
**`applyDamage` returns `true` after a cancelled before-event while dealing no damage.** The
falsifier that ruling names fires, reproducibly, and `addEffect` is well-behaved in the same run.
The two surfaces disagree with each other, so this is not a blanket engine convention either way.

### Handlers can rewrite damage and effect duration, and the write reaches downstream

`FIELD-WRITE-TOOK` in all four write cases, 3/3 runs:

| case | requested | handler writes | observed |
|---|---|---|---|
| `lower-damage` | 10 | 2 | health lost **2**, `cascade=[hurt(damage=2,…)]` |
| `raise-damage` | 1 | 4 | health lost **4**, `cascade=[hurt(damage=4,…)]` |
| `extend-duration` | 100 | 600 | effect reads back **598** |
| `shorten-duration` | 400 | 100 | effect reads back **98** |

The mutable `EntityHurtBeforeEvent.damage` and `EffectAddBeforeEvent.duration` are not decorative:
a handler can lower *or raise* incoming damage and extend *or shorten* an effect. The after-event
in each cascade reports the **written** value, not the requested one, so a downstream subscriber
sees the modified number — the write is not a private adjustment. The effect read-backs are two
ticks of decay below the written value (598/98, and 198 in the control), consistent with the
1/tick decay the earlier effect probes established.

## Set A — the no-op ruling holds for every subject that was still valid

`SUMMARY subject-calls=6 contradicting=2` with a `!!!` line naming
`minecraft:arrow/options` and `minecraft:snowball/options` as `CONTRADICTS-SPEC-THREW`.
**Neither is a contradiction of the no-op ruling.** Both are the ordinary invalidation guard firing
on an entity that was already gone:

- The arrow's first call carries `projectileHitEntity(other)` and two `entityRemove(other)` in its
  signal window, and its own line reports `isValid=false`. The arrow was spawned at the source
  location, struck the source armor stand, and was removed.
- The snowball's first call carries `projectileHitBlock(other)` and `entityDie(other)`, with
  `cascade=[die(cause=contact)]` and `isValid=false`. It hit the platform it was spawned on.
- Both second calls then throw `InvalidEntityError` with
  `"…due to Entity being invalid (has the Entity been removed?)"` — the guard, not a damage ruling.

The clean subject is `minecraft:xp_orb`, which stays `isValid=true` throughout and returns
`false` silently on **both** argument forms. Every subject call made against a still-valid
health-less entity reads `MATCHES-SPEC-SILENT-FALSE`, 3/3 runs. The ruling is unfalsified by this
run; the two flagged calls test the invalidation guard instead.

## Set B — reaching the effective minimum is always fatal

`SUMMARY surveyed=11 nonzero-minimum=[]` — no surveyed type has a non-zero `effectiveMin`, so the
extra per-type cases never triggered and the run is the base twelve. Identical 3/3:

- **`REACHED-MINIMUM-AND-DIED` ×4** — `minecraft:sheep` and `minecraft:cow`, on *both* the
  `setCurrentValue` and `applyDamage` paths.
- **`CONTROL-ABOVE-MINIMUM-LIVED` ×6** — every `min+1` control, all three types, both paths.
- **`MINIMUM-NOT-REACHED` ×2** — `minecraft:armor_stand`, both paths: the write did not drive it to
  its minimum at all, so the type says nothing about the boundary.
- `SUMMARY no case reached the minimum and lived`.

Both paths to the minimum kill, and the boundary is exact — `min+1` survives in every control.

## Set C — a throwing handler is isolated in all three directions

Four cases, identical 3/3: `propagation=THROW-DID-NOT-REACH-THE-CALLER` ×3,
`siblings=OTHER-SUBSCRIBER-STILL-RAN` ×3, `cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED` ×4.
A handler that throws does not surface at the `applyDamage` call site, does not stop other
subscribers on the same signal, and does not stop the later events of the cascade.

The control case also pins delivery ordering independently of the throw question. Its `order=[…]`
reads `1:applyDamage called | 2:applyDamage returned | 3:first-handler ENTER | 4:first-handler EXIT
| 5:second-handler ENTER | …` — **the call returns before any after-event handler runs.**

## Reading the log

- **Set A's `!!!` summary line overstates.** It counts a verdict string, not a ruling violation;
  see the Set A section above. The two flagged calls are invalid-entity throws. A rerun that either
  re-checks `isValid` before the second argument form, or spawns the projectile subjects clear of
  the source and the platform, would remove the noise. As it stands the summary reads as two
  contradictions where the run contains none.
- **The `minecraft:sheep` lines in set A are labelled `CONTRADICTS-SPEC-RETURNED-TRUE` although
  the sheep is `role=control(has-health)`.** Returning `true` is the correct behaviour for a
  control that has health, and the README requires it. The verdict vocabulary is applied to the
  control as though the no-health expectation covered it. `SUMMARY subject-calls=6` correctly
  excludes the control, so the count is unaffected — but the per-line string invites the opposite
  reading.
- **`applyDamage` returning `true` does not mean damage landed.** The sheep control's second call
  returns `true` with `cascade=[]` and health unchanged at `6 -> 6`: the damage-invulnerability
  window from the first hit was still open. This is a second, independent way the return value
  fails to track the outcome, alongside the cancelled-before-event case in set D.

## Run-validity notes

- **The source entity does not survive `mctest4:nohealth`.** The set spawns an arrow at the source
  location, which strikes and destroys the armor stand — visible as `projectileHitEntity` in the
  arrow's own signal window. The source was re-created and re-tagged before each set; every run
  recorded here had a live source for its whole duration, and each ended with its `complete` line.
- **No `PROBE CRASHED` line in any of the 12 runs.** Set C's own preamble mentions the string
  `PROBE CRASHED` in prose while explaining the `DELIBERATE THROW` label; a naive `grep` for the
  bare string matches that line. The real check is `:: PROBE CRASHED`, which matches nothing.
- **The `/mctest4:*` slash commands are unexercised.** All 12 runs went through the `scriptevent`
  fallback, so the custom-command path is only known not to have thrown at registration — the same
  residual the earlier packs carry.
- **No player was connected.** No set reads a player, so the armor-stand source covers all four.
- Set D ended normally in all three runs, so the README's "restart before running anything else"
  path was never taken, and no before-event subscriber leaked into a later run.

## Raw logs — `mctest4:nohealth`

### nohealth run 1

```
[2026-07-27 19:48:38.185] [mctest] nohealth start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 19:48:38.185] [mctest] no-health-type-survey :: minecraft:arrow getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:projectile]
[2026-07-27 19:48:38.235] [mctest] no-health-type-survey :: minecraft:snowball getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:projectile]
[2026-07-27 19:48:38.285] [mctest] no-health-type-survey :: minecraft:xp_orb getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:type_family]
[2026-07-27 19:48:38.335] [mctest] no-health-type-survey :: minecraft:sheep getComponent("minecraft:health") ok value=object(EntityHealthComponent) hasComponent=ok value=boolean:true components=[minecraft:movement, minecraft:movement.basic, minecraft:health, minecraft:navigation.walk, minecraft:rideable, minecraft:underwater_movement, minecraft:lava_movement, minecraft:leashable, minecraft:is_hidden_when_invisible, minecraft:color, minecraft:breathable, minecraft:is_dyeable, minecraft:can_climb, minecraft:type_family]
[2026-07-27 19:48:38.485] [mctest] damage-without-health :: minecraft:arrow pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 19:48:38.486] [mctest] damage-without-health :: minecraft:arrow subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 19:48:38.685] [mctest] damage-without-health :: [minecraft:arrow/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[entitySpawn(other), dataDrivenEntityTrigger(other), entitySpawn(other), projectileHitEntity(other), entityRemove(other), entityRemove(other)] count=6
[2026-07-27 19:48:38.685] [mctest] damage-without-health :: [minecraft:arrow/plain] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 19:48:38.885] [mctest] damage-without-health :: [minecraft:arrow/options] applyDamage(2, {"cause":"entityAttack"}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." verdict=CONTRADICTS-SPEC-THREW ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 19:48:38.885] [mctest] damage-without-health :: [minecraft:arrow/options] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 19:48:38.985] [mctest] damage-without-health :: minecraft:snowball pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 19:48:38.985] [mctest] damage-without-health :: minecraft:snowball subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 19:48:39.185] [mctest] damage-without-health :: [minecraft:snowball/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[die(cause=contact)] all-signals-in-window=[entitySpawn(other), projectileHitBlock(other), entityDie(other), entityRemove(other)] count=4
[2026-07-27 19:48:39.185] [mctest] damage-without-health :: [minecraft:snowball/plain] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 19:48:39.385] [mctest] damage-without-health :: [minecraft:snowball/options] applyDamage(2, {"cause":"entityAttack"}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." verdict=CONTRADICTS-SPEC-THREW ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 19:48:39.385] [mctest] damage-without-health :: [minecraft:snowball/options] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 19:48:39.485] [mctest] damage-without-health :: minecraft:xp_orb pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 19:48:39.486] [mctest] damage-without-health :: minecraft:xp_orb subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 19:48:39.685] [mctest] damage-without-health :: [minecraft:xp_orb/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[entitySpawn(other)] count=1
[2026-07-27 19:48:39.685] [mctest] damage-without-health :: [minecraft:xp_orb/plain] health-before=no-component health-after=no-component isValid=true id-readable=true
[2026-07-27 19:48:39.885] [mctest] damage-without-health :: [minecraft:xp_orb/options] applyDamage(2, {"cause":"entityAttack"}) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 19:48:39.885] [mctest] damage-without-health :: [minecraft:xp_orb/options] health-before=no-component health-after=no-component isValid=true id-readable=true
[2026-07-27 19:48:39.985] [mctest] damage-without-health :: minecraft:sheep pre-check getComponent ok value=object(EntityHealthComponent) hasComponent=ok value=boolean:true component-present=true role=control(has-health)
[2026-07-27 19:48:39.986] [mctest] damage-without-health :: minecraft:sheep subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 19:48:40.185] [mctest] damage-without-health :: [minecraft:sheep/plain] applyDamage(2) ok value=boolean:true verdict=CONTRADICTS-SPEC-RETURNED-TRUE ours=[] cascade=[hurt(damage=2,cause=none), health(8->6)] all-signals-in-window=[entitySpawn(other), dataDrivenEntityTrigger(other), dataDrivenEntityTrigger(other), dataDrivenEntityTrigger(other), entityHurt(other), entityHealthChanged(other)] count=6
[2026-07-27 19:48:40.185] [mctest] damage-without-health :: [minecraft:sheep/plain] health-before=ok value=number:8 health-after=ok value=number:6 isValid=true id-readable=true
[2026-07-27 19:48:40.385] [mctest] damage-without-health :: [minecraft:sheep/options] applyDamage(2, {"cause":"entityAttack"}) ok value=boolean:true verdict=CONTRADICTS-SPEC-RETURNED-TRUE ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 19:48:40.385] [mctest] damage-without-health :: [minecraft:sheep/options] health-before=ok value=number:6 health-after=ok value=number:6 isValid=true id-readable=true
[2026-07-27 19:48:40.485] [mctest] damage-without-health :: SUMMARY subject-calls=6 contradicting=2
[2026-07-27 19:48:40.485] [mctest] damage-without-health :: SUMMARY minecraft:arrow/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 19:48:40.485] [mctest] damage-without-health :: SUMMARY minecraft:arrow/options CONTRADICTS-SPEC-THREW
[2026-07-27 19:48:40.485] [mctest] damage-without-health :: SUMMARY minecraft:snowball/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 19:48:40.485] [mctest] damage-without-health :: SUMMARY minecraft:snowball/options CONTRADICTS-SPEC-THREW
[2026-07-27 19:48:40.485] [mctest] damage-without-health :: SUMMARY minecraft:xp_orb/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 19:48:40.485] [mctest] damage-without-health :: SUMMARY minecraft:xp_orb/options MATCHES-SPEC-SILENT-FALSE
[2026-07-27 19:48:40.485] [mctest] damage-without-health :: SUMMARY !!! 2 call(s) contradict the no-op ruling: [minecraft:arrow/options=CONTRADICTS-SPEC-THREW, minecraft:snowball/options=CONTRADICTS-SPEC-THREW]
[2026-07-27 19:48:40.585] [mctest] nohealth complete — copy every [mctest] line into the design as the answer record
```

### nohealth run 2

```
[2026-07-27 19:59:51.235] [mctest] nohealth start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 19:59:51.235] [mctest] no-health-type-survey :: minecraft:arrow getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:projectile]
[2026-07-27 19:59:51.285] [mctest] no-health-type-survey :: minecraft:snowball getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:projectile]
[2026-07-27 19:59:51.335] [mctest] no-health-type-survey :: minecraft:xp_orb getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:type_family]
[2026-07-27 19:59:51.385] [mctest] no-health-type-survey :: minecraft:sheep getComponent("minecraft:health") ok value=object(EntityHealthComponent) hasComponent=ok value=boolean:true components=[minecraft:movement, minecraft:movement.basic, minecraft:health, minecraft:navigation.walk, minecraft:rideable, minecraft:underwater_movement, minecraft:lava_movement, minecraft:leashable, minecraft:is_hidden_when_invisible, minecraft:color, minecraft:breathable, minecraft:is_dyeable, minecraft:can_climb, minecraft:type_family]
[2026-07-27 19:59:51.535] [mctest] damage-without-health :: minecraft:arrow pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 19:59:51.535] [mctest] damage-without-health :: minecraft:arrow subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 19:59:51.735] [mctest] damage-without-health :: [minecraft:arrow/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[entitySpawn(other), dataDrivenEntityTrigger(other), entitySpawn(other), projectileHitEntity(other), entityRemove(other), entityRemove(other)] count=6
[2026-07-27 19:59:51.735] [mctest] damage-without-health :: [minecraft:arrow/plain] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 19:59:51.935] [mctest] damage-without-health :: [minecraft:arrow/options] applyDamage(2, {"cause":"entityAttack"}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." verdict=CONTRADICTS-SPEC-THREW ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 19:59:51.935] [mctest] damage-without-health :: [minecraft:arrow/options] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 19:59:52.035] [mctest] damage-without-health :: minecraft:snowball pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 19:59:52.035] [mctest] damage-without-health :: minecraft:snowball subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 19:59:52.235] [mctest] damage-without-health :: [minecraft:snowball/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[die(cause=contact)] all-signals-in-window=[entitySpawn(other), projectileHitEntity(other), entityDie(other), entityRemove(other)] count=4
[2026-07-27 19:59:52.235] [mctest] damage-without-health :: [minecraft:snowball/plain] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 19:59:52.435] [mctest] damage-without-health :: [minecraft:snowball/options] applyDamage(2, {"cause":"entityAttack"}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." verdict=CONTRADICTS-SPEC-THREW ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 19:59:52.435] [mctest] damage-without-health :: [minecraft:snowball/options] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 19:59:52.535] [mctest] damage-without-health :: minecraft:xp_orb pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 19:59:52.535] [mctest] damage-without-health :: minecraft:xp_orb subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 19:59:52.735] [mctest] damage-without-health :: [minecraft:xp_orb/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[entitySpawn(other)] count=1
[2026-07-27 19:59:52.735] [mctest] damage-without-health :: [minecraft:xp_orb/plain] health-before=no-component health-after=no-component isValid=true id-readable=true
[2026-07-27 19:59:52.935] [mctest] damage-without-health :: [minecraft:xp_orb/options] applyDamage(2, {"cause":"entityAttack"}) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 19:59:52.935] [mctest] damage-without-health :: [minecraft:xp_orb/options] health-before=no-component health-after=no-component isValid=true id-readable=true
[2026-07-27 19:59:53.035] [mctest] damage-without-health :: minecraft:sheep pre-check getComponent ok value=object(EntityHealthComponent) hasComponent=ok value=boolean:true component-present=true role=control(has-health)
[2026-07-27 19:59:53.036] [mctest] damage-without-health :: minecraft:sheep subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 19:59:53.235] [mctest] damage-without-health :: [minecraft:sheep/plain] applyDamage(2) ok value=boolean:true verdict=CONTRADICTS-SPEC-RETURNED-TRUE ours=[] cascade=[hurt(damage=2,cause=none), health(8->6)] all-signals-in-window=[entitySpawn(other), dataDrivenEntityTrigger(other), dataDrivenEntityTrigger(other), dataDrivenEntityTrigger(other), entityHurt(other), entityHealthChanged(other)] count=6
[2026-07-27 19:59:53.235] [mctest] damage-without-health :: [minecraft:sheep/plain] health-before=ok value=number:8 health-after=ok value=number:6 isValid=true id-readable=true
[2026-07-27 19:59:53.435] [mctest] damage-without-health :: [minecraft:sheep/options] applyDamage(2, {"cause":"entityAttack"}) ok value=boolean:true verdict=CONTRADICTS-SPEC-RETURNED-TRUE ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 19:59:53.435] [mctest] damage-without-health :: [minecraft:sheep/options] health-before=ok value=number:6 health-after=ok value=number:6 isValid=true id-readable=true
[2026-07-27 19:59:53.535] [mctest] damage-without-health :: SUMMARY subject-calls=6 contradicting=2
[2026-07-27 19:59:53.535] [mctest] damage-without-health :: SUMMARY minecraft:arrow/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 19:59:53.535] [mctest] damage-without-health :: SUMMARY minecraft:arrow/options CONTRADICTS-SPEC-THREW
[2026-07-27 19:59:53.535] [mctest] damage-without-health :: SUMMARY minecraft:snowball/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 19:59:53.535] [mctest] damage-without-health :: SUMMARY minecraft:snowball/options CONTRADICTS-SPEC-THREW
[2026-07-27 19:59:53.535] [mctest] damage-without-health :: SUMMARY minecraft:xp_orb/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 19:59:53.535] [mctest] damage-without-health :: SUMMARY minecraft:xp_orb/options MATCHES-SPEC-SILENT-FALSE
[2026-07-27 19:59:53.535] [mctest] damage-without-health :: SUMMARY !!! 2 call(s) contradict the no-op ruling: [minecraft:arrow/options=CONTRADICTS-SPEC-THREW, minecraft:snowball/options=CONTRADICTS-SPEC-THREW]
[2026-07-27 19:59:53.635] [mctest] nohealth complete — copy every [mctest] line into the design as the answer record
```

### nohealth run 3

```
[2026-07-27 20:05:32.685] [mctest] nohealth start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:05:32.686] [mctest] no-health-type-survey :: minecraft:arrow getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:projectile]
[2026-07-27 20:05:32.735] [mctest] no-health-type-survey :: minecraft:snowball getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:projectile]
[2026-07-27 20:05:32.785] [mctest] no-health-type-survey :: minecraft:xp_orb getComponent("minecraft:health") ok value=undefined hasComponent=ok value=boolean:false components=[minecraft:type_family]
[2026-07-27 20:05:32.835] [mctest] no-health-type-survey :: minecraft:sheep getComponent("minecraft:health") ok value=object(EntityHealthComponent) hasComponent=ok value=boolean:true components=[minecraft:movement, minecraft:movement.basic, minecraft:health, minecraft:navigation.walk, minecraft:rideable, minecraft:underwater_movement, minecraft:lava_movement, minecraft:leashable, minecraft:is_hidden_when_invisible, minecraft:color, minecraft:breathable, minecraft:is_dyeable, minecraft:can_climb, minecraft:type_family]
[2026-07-27 20:05:32.985] [mctest] damage-without-health :: minecraft:arrow pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 20:05:32.986] [mctest] damage-without-health :: minecraft:arrow subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 20:05:33.185] [mctest] damage-without-health :: [minecraft:arrow/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[entitySpawn(other), dataDrivenEntityTrigger(other), entitySpawn(other), projectileHitEntity(other), entityRemove(other), entityRemove(other)] count=6
[2026-07-27 20:05:33.185] [mctest] damage-without-health :: [minecraft:arrow/plain] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 20:05:33.385] [mctest] damage-without-health :: [minecraft:arrow/options] applyDamage(2, {"cause":"entityAttack"}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." verdict=CONTRADICTS-SPEC-THREW ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 20:05:33.385] [mctest] damage-without-health :: [minecraft:arrow/options] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 20:05:33.485] [mctest] damage-without-health :: minecraft:snowball pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 20:05:33.485] [mctest] damage-without-health :: minecraft:snowball subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 20:05:33.685] [mctest] damage-without-health :: [minecraft:snowball/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[die(cause=contact)] all-signals-in-window=[entitySpawn(other), projectileHitEntity(other), entityDie(other), entityRemove(other)] count=4
[2026-07-27 20:05:33.685] [mctest] damage-without-health :: [minecraft:snowball/plain] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 20:05:33.885] [mctest] damage-without-health :: [minecraft:snowball/options] applyDamage(2, {"cause":"entityAttack"}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." verdict=CONTRADICTS-SPEC-THREW ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 20:05:33.885] [mctest] damage-without-health :: [minecraft:snowball/options] health-before=no-component health-after=no-component isValid=false id-readable=true
[2026-07-27 20:05:33.985] [mctest] damage-without-health :: minecraft:xp_orb pre-check getComponent ok value=undefined hasComponent=ok value=boolean:false component-present=false role=subject(expected-no-health)
[2026-07-27 20:05:33.986] [mctest] damage-without-health :: minecraft:xp_orb subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 20:05:34.185] [mctest] damage-without-health :: [minecraft:xp_orb/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[entitySpawn(other)] count=1
[2026-07-27 20:05:34.185] [mctest] damage-without-health :: [minecraft:xp_orb/plain] health-before=no-component health-after=no-component isValid=true id-readable=true
[2026-07-27 20:05:34.385] [mctest] damage-without-health :: [minecraft:xp_orb/options] applyDamage(2, {"cause":"entityAttack"}) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 20:05:34.385] [mctest] damage-without-health :: [minecraft:xp_orb/options] health-before=no-component health-after=no-component isValid=true id-readable=true
[2026-07-27 20:05:34.485] [mctest] damage-without-health :: minecraft:sheep pre-check getComponent ok value=object(EntityHealthComponent) hasComponent=ok value=boolean:true component-present=true role=control(has-health)
[2026-07-27 20:05:34.486] [mctest] damage-without-health :: minecraft:sheep subscribed=55 skipped=0 skipped-names=[]
[2026-07-27 20:05:34.685] [mctest] damage-without-health :: [minecraft:sheep/plain] applyDamage(2) ok value=boolean:true verdict=CONTRADICTS-SPEC-RETURNED-TRUE ours=[] cascade=[hurt(damage=2,cause=none), health(8->6)] all-signals-in-window=[entitySpawn(other), dataDrivenEntityTrigger(other), dataDrivenEntityTrigger(other), dataDrivenEntityTrigger(other), entityHurt(other), entityHealthChanged(other)] count=6
[2026-07-27 20:05:34.685] [mctest] damage-without-health :: [minecraft:sheep/plain] health-before=ok value=number:8 health-after=ok value=number:6 isValid=true id-readable=true
[2026-07-27 20:05:34.885] [mctest] damage-without-health :: [minecraft:sheep/options] applyDamage(2, {"cause":"entityAttack"}) ok value=boolean:true verdict=CONTRADICTS-SPEC-RETURNED-TRUE ours=[] cascade=[] all-signals-in-window=[] count=0
[2026-07-27 20:05:34.885] [mctest] damage-without-health :: [minecraft:sheep/options] health-before=ok value=number:6 health-after=ok value=number:6 isValid=true id-readable=true
[2026-07-27 20:05:34.985] [mctest] damage-without-health :: SUMMARY subject-calls=6 contradicting=2
[2026-07-27 20:05:34.985] [mctest] damage-without-health :: SUMMARY minecraft:arrow/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 20:05:34.985] [mctest] damage-without-health :: SUMMARY minecraft:arrow/options CONTRADICTS-SPEC-THREW
[2026-07-27 20:05:34.985] [mctest] damage-without-health :: SUMMARY minecraft:snowball/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 20:05:34.985] [mctest] damage-without-health :: SUMMARY minecraft:snowball/options CONTRADICTS-SPEC-THREW
[2026-07-27 20:05:34.985] [mctest] damage-without-health :: SUMMARY minecraft:xp_orb/plain MATCHES-SPEC-SILENT-FALSE
[2026-07-27 20:05:34.985] [mctest] damage-without-health :: SUMMARY minecraft:xp_orb/options MATCHES-SPEC-SILENT-FALSE
[2026-07-27 20:05:34.985] [mctest] damage-without-health :: SUMMARY !!! 2 call(s) contradict the no-op ruling: [minecraft:arrow/options=CONTRADICTS-SPEC-THREW, minecraft:snowball/options=CONTRADICTS-SPEC-THREW]
[2026-07-27 20:05:35.085] [mctest] nohealth complete — copy every [mctest] line into the design as the answer record
```

## Raw logs — `mctest4:threshold`

### threshold run 1

```
[2026-07-27 19:53:45.835] [mctest] threshold start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 19:53:45.836] [mctest] effective-minimum-survey :: minecraft:sheep currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8
[2026-07-27 19:53:45.885] [mctest] effective-minimum-survey :: minecraft:cow currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10
[2026-07-27 19:53:45.935] [mctest] effective-minimum-survey :: minecraft:chicken currentValue=ok value=number:4 defaultValue=ok value=number:4 effectiveMin=ok value=number:0 effectiveMax=ok value=number:4
[2026-07-27 19:53:45.985] [mctest] effective-minimum-survey :: minecraft:pig currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10
[2026-07-27 19:53:46.035] [mctest] effective-minimum-survey :: minecraft:zombie currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 19:53:46.086] [mctest] effective-minimum-survey :: minecraft:skeleton currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 19:53:46.136] [mctest] effective-minimum-survey :: minecraft:villager_v2 currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 19:53:46.185] [mctest] effective-minimum-survey :: minecraft:wolf currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8
[2026-07-27 19:53:46.235] [mctest] effective-minimum-survey :: minecraft:bat currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6
[2026-07-27 19:53:46.285] [mctest] effective-minimum-survey :: minecraft:armor_stand currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6
[2026-07-27 19:53:46.335] [mctest] effective-minimum-survey :: minecraft:iron_golem currentValue=ok value=number:100 defaultValue=ok value=number:100 effectiveMin=ok value=number:0 effectiveMax=ok value=number:100
[2026-07-27 19:53:46.385] [mctest] effective-minimum-survey :: SUMMARY surveyed=11 nonzero-minimum=[]
[2026-07-27 19:53:46.485] [mctest] killing-hit-boundary :: probing 3 type(s) [minecraft:sheep, minecraft:cow, minecraft:armor_stand] × 2 paths × (boundary + one-above control), one fresh entity per case
[2026-07-27 19:53:46.685] [mctest] killing-hit-boundary :: [minecraft:sheep/setCurrentValue/at-min] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=0 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[health(8->0), die(cause=override)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 19:53:46.985] [mctest] killing-hit-boundary :: [minecraft:sheep/setCurrentValue/min+1] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(8->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 19:53:47.285] [mctest] killing-hit-boundary :: [minecraft:sheep/applyDamage/at-min] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=0 write(applyDamage) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[hurt(damage=8,cause=none), health(8->0), die(cause=none)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 19:53:47.585] [mctest] killing-hit-boundary :: [minecraft:sheep/applyDamage/min+1] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=1 write(applyDamage) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[hurt(damage=7,cause=none), health(8->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 19:53:47.885] [mctest] killing-hit-boundary :: [minecraft:cow/setCurrentValue/at-min] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=0 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[health(10->0), die(cause=override)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 19:53:48.185] [mctest] killing-hit-boundary :: [minecraft:cow/setCurrentValue/min+1] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(10->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 19:53:48.485] [mctest] killing-hit-boundary :: [minecraft:cow/applyDamage/at-min] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=0 write(applyDamage) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[hurt(damage=10,cause=none), health(10->0), die(cause=none)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 19:53:48.785] [mctest] killing-hit-boundary :: [minecraft:cow/applyDamage/min+1] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=1 write(applyDamage) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[hurt(damage=9,cause=none), health(10->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 19:53:49.085] [mctest] killing-hit-boundary :: [minecraft:armor_stand/setCurrentValue/at-min] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=0 write(setCurrentValue) ok value=boolean:true -> readback=threw name=no-component ctor=undefined instanceofInvalidEntityError=undefined message="component gone" landed-exactly-on-effectiveMin=false cascade=[health(6->0)] died=false isValid=false verdict=MINIMUM-NOT-REACHED
[2026-07-27 19:53:49.385] [mctest] killing-hit-boundary :: [minecraft:armor_stand/setCurrentValue/min+1] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(6->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 19:53:49.685] [mctest] killing-hit-boundary :: [minecraft:armor_stand/applyDamage/at-min] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=0 write(applyDamage) ok value=boolean:false -> readback=ok value=number:6 landed-exactly-on-effectiveMin=false cascade=[] died=false isValid=true verdict=MINIMUM-NOT-REACHED
[2026-07-27 19:53:49.985] [mctest] killing-hit-boundary :: [minecraft:armor_stand/applyDamage/min+1] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=1 write(applyDamage) ok value=boolean:false -> readback=ok value=number:6 landed-exactly-on-effectiveMin=false cascade=[] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 19:53:50.085] [mctest] killing-hit-boundary :: SUMMARY cases=12
[2026-07-27 19:53:50.085] [mctest] killing-hit-boundary :: SUMMARY REACHED-MINIMUM-AND-DIED count=4 cases=[minecraft:sheep/setCurrentValue/at-min, minecraft:sheep/applyDamage/at-min, minecraft:cow/setCurrentValue/at-min, minecraft:cow/applyDamage/at-min]
[2026-07-27 19:53:50.085] [mctest] killing-hit-boundary :: SUMMARY CONTROL-ABOVE-MINIMUM-LIVED count=6 cases=[minecraft:sheep/setCurrentValue/min+1, minecraft:sheep/applyDamage/min+1, minecraft:cow/setCurrentValue/min+1, minecraft:cow/applyDamage/min+1, minecraft:armor_stand/setCurrentValue/min+1, minecraft:armor_stand/applyDamage/min+1]
[2026-07-27 19:53:50.085] [mctest] killing-hit-boundary :: SUMMARY MINIMUM-NOT-REACHED count=2 cases=[minecraft:armor_stand/setCurrentValue/at-min, minecraft:armor_stand/applyDamage/at-min]
[2026-07-27 19:53:50.085] [mctest] killing-hit-boundary :: SUMMARY no case reached the minimum and lived
[2026-07-27 19:53:50.185] [mctest] threshold complete — copy every [mctest] line into the design as the answer record
```

### threshold run 2

```
[2026-07-27 20:00:56.785] [mctest] threshold start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:00:56.786] [mctest] effective-minimum-survey :: minecraft:sheep currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8
[2026-07-27 20:00:56.835] [mctest] effective-minimum-survey :: minecraft:cow currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10
[2026-07-27 20:00:56.885] [mctest] effective-minimum-survey :: minecraft:chicken currentValue=ok value=number:4 defaultValue=ok value=number:4 effectiveMin=ok value=number:0 effectiveMax=ok value=number:4
[2026-07-27 20:00:56.935] [mctest] effective-minimum-survey :: minecraft:pig currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10
[2026-07-27 20:00:56.985] [mctest] effective-minimum-survey :: minecraft:zombie currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 20:00:57.035] [mctest] effective-minimum-survey :: minecraft:skeleton currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 20:00:57.085] [mctest] effective-minimum-survey :: minecraft:villager_v2 currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 20:00:57.135] [mctest] effective-minimum-survey :: minecraft:wolf currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8
[2026-07-27 20:00:57.185] [mctest] effective-minimum-survey :: minecraft:bat currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6
[2026-07-27 20:00:57.235] [mctest] effective-minimum-survey :: minecraft:armor_stand currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6
[2026-07-27 20:00:57.285] [mctest] effective-minimum-survey :: minecraft:iron_golem currentValue=ok value=number:100 defaultValue=ok value=number:100 effectiveMin=ok value=number:0 effectiveMax=ok value=number:100
[2026-07-27 20:00:57.335] [mctest] effective-minimum-survey :: SUMMARY surveyed=11 nonzero-minimum=[]
[2026-07-27 20:00:57.435] [mctest] killing-hit-boundary :: probing 3 type(s) [minecraft:sheep, minecraft:cow, minecraft:armor_stand] × 2 paths × (boundary + one-above control), one fresh entity per case
[2026-07-27 20:00:57.635] [mctest] killing-hit-boundary :: [minecraft:sheep/setCurrentValue/at-min] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=0 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[health(8->0), die(cause=override)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 20:00:57.935] [mctest] killing-hit-boundary :: [minecraft:sheep/setCurrentValue/min+1] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(8->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:00:58.235] [mctest] killing-hit-boundary :: [minecraft:sheep/applyDamage/at-min] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=0 write(applyDamage) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[hurt(damage=8,cause=none), health(8->0), die(cause=none)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 20:00:58.535] [mctest] killing-hit-boundary :: [minecraft:sheep/applyDamage/min+1] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=1 write(applyDamage) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[hurt(damage=7,cause=none), health(8->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:00:58.835] [mctest] killing-hit-boundary :: [minecraft:cow/setCurrentValue/at-min] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=0 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[health(10->0), die(cause=override)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 20:00:59.135] [mctest] killing-hit-boundary :: [minecraft:cow/setCurrentValue/min+1] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(10->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:00:59.435] [mctest] killing-hit-boundary :: [minecraft:cow/applyDamage/at-min] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=0 write(applyDamage) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[hurt(damage=10,cause=none), health(10->0), die(cause=none)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 20:00:59.735] [mctest] killing-hit-boundary :: [minecraft:cow/applyDamage/min+1] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=1 write(applyDamage) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[hurt(damage=9,cause=none), health(10->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:01:00.035] [mctest] killing-hit-boundary :: [minecraft:armor_stand/setCurrentValue/at-min] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=0 write(setCurrentValue) ok value=boolean:true -> readback=threw name=no-component ctor=undefined instanceofInvalidEntityError=undefined message="component gone" landed-exactly-on-effectiveMin=false cascade=[health(6->0)] died=false isValid=false verdict=MINIMUM-NOT-REACHED
[2026-07-27 20:01:00.335] [mctest] killing-hit-boundary :: [minecraft:armor_stand/setCurrentValue/min+1] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(6->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:01:00.635] [mctest] killing-hit-boundary :: [minecraft:armor_stand/applyDamage/at-min] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=0 write(applyDamage) ok value=boolean:false -> readback=ok value=number:6 landed-exactly-on-effectiveMin=false cascade=[] died=false isValid=true verdict=MINIMUM-NOT-REACHED
[2026-07-27 20:01:00.935] [mctest] killing-hit-boundary :: [minecraft:armor_stand/applyDamage/min+1] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=1 write(applyDamage) ok value=boolean:false -> readback=ok value=number:6 landed-exactly-on-effectiveMin=false cascade=[] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:01:01.035] [mctest] killing-hit-boundary :: SUMMARY cases=12
[2026-07-27 20:01:01.035] [mctest] killing-hit-boundary :: SUMMARY REACHED-MINIMUM-AND-DIED count=4 cases=[minecraft:sheep/setCurrentValue/at-min, minecraft:sheep/applyDamage/at-min, minecraft:cow/setCurrentValue/at-min, minecraft:cow/applyDamage/at-min]
[2026-07-27 20:01:01.035] [mctest] killing-hit-boundary :: SUMMARY CONTROL-ABOVE-MINIMUM-LIVED count=6 cases=[minecraft:sheep/setCurrentValue/min+1, minecraft:sheep/applyDamage/min+1, minecraft:cow/setCurrentValue/min+1, minecraft:cow/applyDamage/min+1, minecraft:armor_stand/setCurrentValue/min+1, minecraft:armor_stand/applyDamage/min+1]
[2026-07-27 20:01:01.035] [mctest] killing-hit-boundary :: SUMMARY MINIMUM-NOT-REACHED count=2 cases=[minecraft:armor_stand/setCurrentValue/at-min, minecraft:armor_stand/applyDamage/at-min]
[2026-07-27 20:01:01.035] [mctest] killing-hit-boundary :: SUMMARY no case reached the minimum and lived
[2026-07-27 20:01:01.135] [mctest] threshold complete — copy every [mctest] line into the design as the answer record
```

### threshold run 3

```
[2026-07-27 20:06:38.085] [mctest] threshold start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:06:38.086] [mctest] effective-minimum-survey :: minecraft:sheep currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8
[2026-07-27 20:06:38.135] [mctest] effective-minimum-survey :: minecraft:cow currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10
[2026-07-27 20:06:38.185] [mctest] effective-minimum-survey :: minecraft:chicken currentValue=ok value=number:4 defaultValue=ok value=number:4 effectiveMin=ok value=number:0 effectiveMax=ok value=number:4
[2026-07-27 20:06:38.235] [mctest] effective-minimum-survey :: minecraft:pig currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10
[2026-07-27 20:06:38.285] [mctest] effective-minimum-survey :: minecraft:zombie currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 20:06:38.335] [mctest] effective-minimum-survey :: minecraft:skeleton currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 20:06:38.386] [mctest] effective-minimum-survey :: minecraft:villager_v2 currentValue=ok value=number:20 defaultValue=ok value=number:20 effectiveMin=ok value=number:0 effectiveMax=ok value=number:20
[2026-07-27 20:06:38.435] [mctest] effective-minimum-survey :: minecraft:wolf currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8
[2026-07-27 20:06:38.485] [mctest] effective-minimum-survey :: minecraft:bat currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6
[2026-07-27 20:06:38.535] [mctest] effective-minimum-survey :: minecraft:armor_stand currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6
[2026-07-27 20:06:38.585] [mctest] effective-minimum-survey :: minecraft:iron_golem currentValue=ok value=number:100 defaultValue=ok value=number:100 effectiveMin=ok value=number:0 effectiveMax=ok value=number:100
[2026-07-27 20:06:38.635] [mctest] effective-minimum-survey :: SUMMARY surveyed=11 nonzero-minimum=[]
[2026-07-27 20:06:38.735] [mctest] killing-hit-boundary :: probing 3 type(s) [minecraft:sheep, minecraft:cow, minecraft:armor_stand] × 2 paths × (boundary + one-above control), one fresh entity per case
[2026-07-27 20:06:38.935] [mctest] killing-hit-boundary :: [minecraft:sheep/setCurrentValue/at-min] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=0 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[health(8->0), die(cause=override)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 20:06:39.235] [mctest] killing-hit-boundary :: [minecraft:sheep/setCurrentValue/min+1] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(8->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:06:39.535] [mctest] killing-hit-boundary :: [minecraft:sheep/applyDamage/at-min] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=0 write(applyDamage) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[hurt(damage=8,cause=none), health(8->0), die(cause=none)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 20:06:39.835] [mctest] killing-hit-boundary :: [minecraft:sheep/applyDamage/min+1] before(currentValue=ok value=number:8 defaultValue=ok value=number:8 effectiveMin=ok value=number:0 effectiveMax=ok value=number:8) target=1 write(applyDamage) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[hurt(damage=7,cause=none), health(8->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:06:40.135] [mctest] killing-hit-boundary :: [minecraft:cow/setCurrentValue/at-min] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=0 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[health(10->0), die(cause=override)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 20:06:40.435] [mctest] killing-hit-boundary :: [minecraft:cow/setCurrentValue/min+1] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(10->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:06:40.735] [mctest] killing-hit-boundary :: [minecraft:cow/applyDamage/at-min] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=0 write(applyDamage) ok value=boolean:true -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[hurt(damage=10,cause=none), health(10->0), die(cause=none)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[2026-07-27 20:06:41.035] [mctest] killing-hit-boundary :: [minecraft:cow/applyDamage/min+1] before(currentValue=ok value=number:10 defaultValue=ok value=number:10 effectiveMin=ok value=number:0 effectiveMax=ok value=number:10) target=1 write(applyDamage) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[hurt(damage=9,cause=none), health(10->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:06:41.335] [mctest] killing-hit-boundary :: [minecraft:armor_stand/setCurrentValue/at-min] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=0 write(setCurrentValue) ok value=boolean:true -> readback=threw name=no-component ctor=undefined instanceofInvalidEntityError=undefined message="component gone" landed-exactly-on-effectiveMin=false cascade=[health(6->0)] died=false isValid=false verdict=MINIMUM-NOT-REACHED
[2026-07-27 20:06:41.635] [mctest] killing-hit-boundary :: [minecraft:armor_stand/setCurrentValue/min+1] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=1 write(setCurrentValue) ok value=boolean:true -> readback=ok value=number:1 landed-exactly-on-effectiveMin=false cascade=[health(6->1)] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:06:41.935] [mctest] killing-hit-boundary :: [minecraft:armor_stand/applyDamage/at-min] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=0 write(applyDamage) ok value=boolean:false -> readback=ok value=number:6 landed-exactly-on-effectiveMin=false cascade=[] died=false isValid=true verdict=MINIMUM-NOT-REACHED
[2026-07-27 20:06:42.235] [mctest] killing-hit-boundary :: [minecraft:armor_stand/applyDamage/min+1] before(currentValue=ok value=number:6 defaultValue=ok value=number:6 effectiveMin=ok value=number:0 effectiveMax=ok value=number:6) target=1 write(applyDamage) ok value=boolean:false -> readback=ok value=number:6 landed-exactly-on-effectiveMin=false cascade=[] died=false isValid=true verdict=CONTROL-ABOVE-MINIMUM-LIVED
[2026-07-27 20:06:42.335] [mctest] killing-hit-boundary :: SUMMARY cases=12
[2026-07-27 20:06:42.335] [mctest] killing-hit-boundary :: SUMMARY REACHED-MINIMUM-AND-DIED count=4 cases=[minecraft:sheep/setCurrentValue/at-min, minecraft:sheep/applyDamage/at-min, minecraft:cow/setCurrentValue/at-min, minecraft:cow/applyDamage/at-min]
[2026-07-27 20:06:42.335] [mctest] killing-hit-boundary :: SUMMARY CONTROL-ABOVE-MINIMUM-LIVED count=6 cases=[minecraft:sheep/setCurrentValue/min+1, minecraft:sheep/applyDamage/min+1, minecraft:cow/setCurrentValue/min+1, minecraft:cow/applyDamage/min+1, minecraft:armor_stand/setCurrentValue/min+1, minecraft:armor_stand/applyDamage/min+1]
[2026-07-27 20:06:42.335] [mctest] killing-hit-boundary :: SUMMARY MINIMUM-NOT-REACHED count=2 cases=[minecraft:armor_stand/setCurrentValue/at-min, minecraft:armor_stand/applyDamage/at-min]
[2026-07-27 20:06:42.335] [mctest] killing-hit-boundary :: SUMMARY no case reached the minimum and lived
[2026-07-27 20:06:42.435] [mctest] threshold complete — copy every [mctest] line into the design as the answer record
```

## Raw logs — `mctest4:handlers`

### handlers run 1

```
[2026-07-27 19:55:43.135] [mctest] handlers start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 19:55:43.135] [mctest] throwing-handler-propagation :: 4 cases; a handler throwing by design is labelled DELIBERATE THROW and its error message carries "mctest4-deliberate-handler-throw" — it is not a PROBE CRASHED line
[2026-07-27 19:55:43.136] [mctest] throwing-handler-propagation :: [control-no-throw] step 1 applyDamage(100) called
[2026-07-27 19:55:43.136] [mctest] throwing-handler-propagation :: [control-no-throw] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 19:55:43.136] [mctest] throwing-handler-propagation :: [control-no-throw] step 3 first-handler ENTER on entityHurt
[2026-07-27 19:55:43.136] [mctest] throwing-handler-propagation :: [control-no-throw] step 4 first-handler EXIT
[2026-07-27 19:55:43.136] [mctest] throwing-handler-propagation :: [control-no-throw] step 5 second-handler ENTER on entityHurt
[2026-07-27 19:55:43.136] [mctest] throwing-handler-propagation :: [control-no-throw] step 6 second-handler EXIT
[2026-07-27 19:55:43.435] [mctest] throwing-handler-propagation :: [control-no-throw] signal=entityHurt thrower=none purpose="baseline delivery order with no handler throwing" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=n/a (control) siblings=n/a (control) bothRan=true cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 19:55:43.435] [mctest] throwing-handler-propagation :: [control-no-throw] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler EXIT | 5:second-handler ENTER on entityHurt | 6:second-handler EXIT]
[2026-07-27 19:55:43.435] [mctest] throwing-handler-propagation :: [control-no-throw] isValid-after=true health-after=ok value=number:0
[2026-07-27 19:55:43.535] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 1 applyDamage(100) called
[2026-07-27 19:55:43.535] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 19:55:43.536] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 3 first-handler ENTER on entityHurt
[2026-07-27 19:55:43.536] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 4 first-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 19:55:43.536] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 5 second-handler ENTER on entityHurt
[2026-07-27 19:55:43.536] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 6 second-handler EXIT
[2026-07-27 19:55:43.834] [mctest] throwing-handler-propagation :: [first-of-two-throws] signal=entityHurt thrower=first purpose="does the second subscriber still run, and does the throw reach applyDamage" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 19:55:43.835] [mctest] throwing-handler-propagation :: [first-of-two-throws] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler DELIBERATE THROW (by design — not a probe crash) | 5:second-handler ENTER on entityHurt | 6:second-handler EXIT]
[2026-07-27 19:55:43.835] [mctest] throwing-handler-propagation :: [first-of-two-throws] isValid-after=true health-after=ok value=number:0
[2026-07-27 19:55:43.935] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 1 applyDamage(100) called
[2026-07-27 19:55:43.935] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 19:55:43.935] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 3 first-handler ENTER on entityHurt
[2026-07-27 19:55:43.935] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 4 first-handler EXIT
[2026-07-27 19:55:43.935] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 5 second-handler ENTER on entityHurt
[2026-07-27 19:55:43.935] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 6 second-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 19:55:44.235] [mctest] throwing-handler-propagation :: [second-of-two-throws] signal=entityHurt thrower=second purpose="the same question with the throw at the end of the subscriber list" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 19:55:44.235] [mctest] throwing-handler-propagation :: [second-of-two-throws] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler EXIT | 5:second-handler ENTER on entityHurt | 6:second-handler DELIBERATE THROW (by design — not a probe crash)]
[2026-07-27 19:55:44.235] [mctest] throwing-handler-propagation :: [second-of-two-throws] isValid-after=true health-after=ok value=number:0
[2026-07-27 19:55:44.335] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 1 applyDamage(100) called
[2026-07-27 19:55:44.335] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 19:55:44.335] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 3 first-handler ENTER on entityHealthChanged
[2026-07-27 19:55:44.335] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 4 first-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 19:55:44.335] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 5 second-handler ENTER on entityHealthChanged
[2026-07-27 19:55:44.335] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 6 second-handler EXIT
[2026-07-27 19:55:44.635] [mctest] throwing-handler-propagation :: [mid-cascade-throw] signal=entityHealthChanged thrower=first purpose="do the later events of the cascade still fire after a handler throws" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 19:55:44.635] [mctest] throwing-handler-propagation :: [mid-cascade-throw] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHealthChanged | 4:first-handler DELIBERATE THROW (by design — not a probe crash) | 5:second-handler ENTER on entityHealthChanged | 6:second-handler EXIT]
[2026-07-27 19:55:44.635] [mctest] throwing-handler-propagation :: [mid-cascade-throw] isValid-after=true health-after=ok value=number:0
[2026-07-27 19:55:44.735] [mctest] throwing-handler-propagation :: complete — read the control case first; it is what the other three are compared against
[2026-07-27 19:55:44.835] [mctest] handlers complete — copy every [mctest] line into the design as the answer record
```

### handlers run 2

```
[2026-07-27 20:02:32.085] [mctest] handlers start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:02:32.085] [mctest] throwing-handler-propagation :: 4 cases; a handler throwing by design is labelled DELIBERATE THROW and its error message carries "mctest4-deliberate-handler-throw" — it is not a PROBE CRASHED line
[2026-07-27 20:02:32.086] [mctest] throwing-handler-propagation :: [control-no-throw] step 1 applyDamage(100) called
[2026-07-27 20:02:32.086] [mctest] throwing-handler-propagation :: [control-no-throw] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 20:02:32.086] [mctest] throwing-handler-propagation :: [control-no-throw] step 3 first-handler ENTER on entityHurt
[2026-07-27 20:02:32.086] [mctest] throwing-handler-propagation :: [control-no-throw] step 4 first-handler EXIT
[2026-07-27 20:02:32.086] [mctest] throwing-handler-propagation :: [control-no-throw] step 5 second-handler ENTER on entityHurt
[2026-07-27 20:02:32.086] [mctest] throwing-handler-propagation :: [control-no-throw] step 6 second-handler EXIT
[2026-07-27 20:02:32.385] [mctest] throwing-handler-propagation :: [control-no-throw] signal=entityHurt thrower=none purpose="baseline delivery order with no handler throwing" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=n/a (control) siblings=n/a (control) bothRan=true cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 20:02:32.385] [mctest] throwing-handler-propagation :: [control-no-throw] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler EXIT | 5:second-handler ENTER on entityHurt | 6:second-handler EXIT]
[2026-07-27 20:02:32.385] [mctest] throwing-handler-propagation :: [control-no-throw] isValid-after=true health-after=ok value=number:0
[2026-07-27 20:02:32.485] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 1 applyDamage(100) called
[2026-07-27 20:02:32.485] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 20:02:32.486] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 3 first-handler ENTER on entityHurt
[2026-07-27 20:02:32.486] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 4 first-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 20:02:32.486] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 5 second-handler ENTER on entityHurt
[2026-07-27 20:02:32.486] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 6 second-handler EXIT
[2026-07-27 20:02:32.785] [mctest] throwing-handler-propagation :: [first-of-two-throws] signal=entityHurt thrower=first purpose="does the second subscriber still run, and does the throw reach applyDamage" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 20:02:32.785] [mctest] throwing-handler-propagation :: [first-of-two-throws] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler DELIBERATE THROW (by design — not a probe crash) | 5:second-handler ENTER on entityHurt | 6:second-handler EXIT]
[2026-07-27 20:02:32.785] [mctest] throwing-handler-propagation :: [first-of-two-throws] isValid-after=true health-after=ok value=number:0
[2026-07-27 20:02:32.885] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 1 applyDamage(100) called
[2026-07-27 20:02:32.885] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 20:02:32.886] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 3 first-handler ENTER on entityHurt
[2026-07-27 20:02:32.886] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 4 first-handler EXIT
[2026-07-27 20:02:32.886] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 5 second-handler ENTER on entityHurt
[2026-07-27 20:02:32.886] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 6 second-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 20:02:33.185] [mctest] throwing-handler-propagation :: [second-of-two-throws] signal=entityHurt thrower=second purpose="the same question with the throw at the end of the subscriber list" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 20:02:33.185] [mctest] throwing-handler-propagation :: [second-of-two-throws] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler EXIT | 5:second-handler ENTER on entityHurt | 6:second-handler DELIBERATE THROW (by design — not a probe crash)]
[2026-07-27 20:02:33.185] [mctest] throwing-handler-propagation :: [second-of-two-throws] isValid-after=true health-after=ok value=number:0
[2026-07-27 20:02:33.285] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 1 applyDamage(100) called
[2026-07-27 20:02:33.285] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 20:02:33.286] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 3 first-handler ENTER on entityHealthChanged
[2026-07-27 20:02:33.286] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 4 first-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 20:02:33.286] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 5 second-handler ENTER on entityHealthChanged
[2026-07-27 20:02:33.286] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 6 second-handler EXIT
[2026-07-27 20:02:33.585] [mctest] throwing-handler-propagation :: [mid-cascade-throw] signal=entityHealthChanged thrower=first purpose="do the later events of the cascade still fire after a handler throws" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 20:02:33.585] [mctest] throwing-handler-propagation :: [mid-cascade-throw] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHealthChanged | 4:first-handler DELIBERATE THROW (by design — not a probe crash) | 5:second-handler ENTER on entityHealthChanged | 6:second-handler EXIT]
[2026-07-27 20:02:33.585] [mctest] throwing-handler-propagation :: [mid-cascade-throw] isValid-after=true health-after=ok value=number:0
[2026-07-27 20:02:33.685] [mctest] throwing-handler-propagation :: complete — read the control case first; it is what the other three are compared against
[2026-07-27 20:02:33.785] [mctest] handlers complete — copy every [mctest] line into the design as the answer record
```

### handlers run 3

```
[2026-07-27 20:08:13.635] [mctest] handlers start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:08:13.635] [mctest] throwing-handler-propagation :: 4 cases; a handler throwing by design is labelled DELIBERATE THROW and its error message carries "mctest4-deliberate-handler-throw" — it is not a PROBE CRASHED line
[2026-07-27 20:08:13.636] [mctest] throwing-handler-propagation :: [control-no-throw] step 1 applyDamage(100) called
[2026-07-27 20:08:13.636] [mctest] throwing-handler-propagation :: [control-no-throw] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 20:08:13.636] [mctest] throwing-handler-propagation :: [control-no-throw] step 3 first-handler ENTER on entityHurt
[2026-07-27 20:08:13.636] [mctest] throwing-handler-propagation :: [control-no-throw] step 4 first-handler EXIT
[2026-07-27 20:08:13.636] [mctest] throwing-handler-propagation :: [control-no-throw] step 5 second-handler ENTER on entityHurt
[2026-07-27 20:08:13.636] [mctest] throwing-handler-propagation :: [control-no-throw] step 6 second-handler EXIT
[2026-07-27 20:08:13.935] [mctest] throwing-handler-propagation :: [control-no-throw] signal=entityHurt thrower=none purpose="baseline delivery order with no handler throwing" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=n/a (control) siblings=n/a (control) bothRan=true cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 20:08:13.935] [mctest] throwing-handler-propagation :: [control-no-throw] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler EXIT | 5:second-handler ENTER on entityHurt | 6:second-handler EXIT]
[2026-07-27 20:08:13.935] [mctest] throwing-handler-propagation :: [control-no-throw] isValid-after=true health-after=ok value=number:0
[2026-07-27 20:08:14.036] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 1 applyDamage(100) called
[2026-07-27 20:08:14.036] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 20:08:14.036] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 3 first-handler ENTER on entityHurt
[2026-07-27 20:08:14.036] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 4 first-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 20:08:14.036] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 5 second-handler ENTER on entityHurt
[2026-07-27 20:08:14.036] [mctest] throwing-handler-propagation :: [first-of-two-throws] step 6 second-handler EXIT
[2026-07-27 20:08:14.335] [mctest] throwing-handler-propagation :: [first-of-two-throws] signal=entityHurt thrower=first purpose="does the second subscriber still run, and does the throw reach applyDamage" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 20:08:14.335] [mctest] throwing-handler-propagation :: [first-of-two-throws] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler DELIBERATE THROW (by design — not a probe crash) | 5:second-handler ENTER on entityHurt | 6:second-handler EXIT]
[2026-07-27 20:08:14.335] [mctest] throwing-handler-propagation :: [first-of-two-throws] isValid-after=true health-after=ok value=number:0
[2026-07-27 20:08:14.435] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 1 applyDamage(100) called
[2026-07-27 20:08:14.436] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 20:08:14.436] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 3 first-handler ENTER on entityHurt
[2026-07-27 20:08:14.436] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 4 first-handler EXIT
[2026-07-27 20:08:14.436] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 5 second-handler ENTER on entityHurt
[2026-07-27 20:08:14.436] [mctest] throwing-handler-propagation :: [second-of-two-throws] step 6 second-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 20:08:14.735] [mctest] throwing-handler-propagation :: [second-of-two-throws] signal=entityHurt thrower=second purpose="the same question with the throw at the end of the subscriber list" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 20:08:14.735] [mctest] throwing-handler-propagation :: [second-of-two-throws] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHurt | 4:first-handler EXIT | 5:second-handler ENTER on entityHurt | 6:second-handler DELIBERATE THROW (by design — not a probe crash)]
[2026-07-27 20:08:14.735] [mctest] throwing-handler-propagation :: [second-of-two-throws] isValid-after=true health-after=ok value=number:0
[2026-07-27 20:08:14.835] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 1 applyDamage(100) called
[2026-07-27 20:08:14.836] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 2 applyDamage returned ok value=boolean:true
[2026-07-27 20:08:14.836] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 3 first-handler ENTER on entityHealthChanged
[2026-07-27 20:08:14.836] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 4 first-handler DELIBERATE THROW (by design — not a probe crash)
[2026-07-27 20:08:14.836] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 5 second-handler ENTER on entityHealthChanged
[2026-07-27 20:08:14.836] [mctest] throwing-handler-propagation :: [mid-cascade-throw] step 6 second-handler EXIT
[2026-07-27 20:08:15.135] [mctest] throwing-handler-propagation :: [mid-cascade-throw] signal=entityHealthChanged thrower=first purpose="do the later events of the cascade still fire after a handler throws" applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[hurt(damage=100,cause=none), health(8->-92), die(cause=none)] propagation=THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[2026-07-27 20:08:15.135] [mctest] throwing-handler-propagation :: [mid-cascade-throw] order=[1:applyDamage(100) called | 2:applyDamage returned ok value=boolean:true | 3:first-handler ENTER on entityHealthChanged | 4:first-handler DELIBERATE THROW (by design — not a probe crash) | 5:second-handler ENTER on entityHealthChanged | 6:second-handler EXIT]
[2026-07-27 20:08:15.135] [mctest] throwing-handler-propagation :: [mid-cascade-throw] isValid-after=true health-after=ok value=number:0
[2026-07-27 20:08:15.235] [mctest] throwing-handler-propagation :: complete — read the control case first; it is what the other three are compared against
[2026-07-27 20:08:15.335] [mctest] handlers complete — copy every [mctest] line into the design as the answer record
```

## Raw logs — `mctest4:beforeevents`

### beforeevents run 1

```
[2026-07-27 19:57:36.135] [mctest] beforeevents start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 19:57:36.135] [mctest] before-entity-hurt :: 4 cases; EntityHurtBeforeEvent.damage is declared mutable in 2.8.0 (index.d.ts:10817, no readonly) and cancel carries no TSDoc (index.d.ts:10811)
[2026-07-27 19:57:36.335] [mctest] before-entity-hurt :: [cancel] requested=4 handler-writes-damage=undefined handler-cancels=true applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:8) health-lost=0 expected-if-the-write-takes=0 cascade=[] verdict=CONTRADICTS-SPEC-CANCELLED-RETURNED-TRUE
[2026-07-27 19:57:36.335] [mctest] before-entity-hurt :: [cancel] handler-notes=[handler-entered damage-as-delivered=4 | wrote cancel=true readback-in-handler=true]
[2026-07-27 19:57:36.635] [mctest] before-entity-hurt :: [control-no-write] requested=4 handler-writes-damage=undefined handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:4) health-lost=4 expected-if-the-write-takes=4 cascade=[hurt(damage=4,cause=none), health(8->4)] verdict=control health-lost=4
[2026-07-27 19:57:36.635] [mctest] before-entity-hurt :: [control-no-write] handler-notes=[handler-entered damage-as-delivered=4]
[2026-07-27 19:57:36.935] [mctest] before-entity-hurt :: [lower-damage] requested=10 handler-writes-damage=2 handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:6) health-lost=2 expected-if-the-write-takes=2 cascade=[hurt(damage=2,cause=none), health(8->6)] verdict=FIELD-WRITE-TOOK (the health lost is the value the handler wrote)
[2026-07-27 19:57:36.935] [mctest] before-entity-hurt :: [lower-damage] handler-notes=[handler-entered damage-as-delivered=10 | wrote damage=2 readback-in-handler=2]
[2026-07-27 19:57:37.235] [mctest] before-entity-hurt :: [raise-damage] requested=1 handler-writes-damage=4 handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:4) health-lost=4 expected-if-the-write-takes=4 cascade=[hurt(damage=4,cause=none), health(8->4)] verdict=FIELD-WRITE-TOOK (the health lost is the value the handler wrote)
[2026-07-27 19:57:37.235] [mctest] before-entity-hurt :: [raise-damage] handler-notes=[handler-entered damage-as-delivered=1 | wrote damage=4 readback-in-handler=4]
[2026-07-27 19:57:37.335] [mctest] before-entity-hurt :: complete — the after-event `hurt(damage=…)` in each cascade says what the engine reported downstream
[2026-07-27 19:57:37.434] [mctest] before-effect-add :: 4 cases; EffectAddBeforeEvent.duration is declared mutable in 2.8.0 (index.d.ts:8215, no readonly)
[2026-07-27 19:57:37.535] [mctest] before-effect-add :: [cancel] requested=200 handler-writes-duration=undefined handler-cancels=true addEffect ok value=undefined -> effect-present=false duration=undefined amplifier=undefined getEffect ok value=undefined health(ok value=number:8 -> ok value=number:8) verdict=MATCHES-SPEC-CANCELLED-RETURNED-UNDEFINED
[2026-07-27 19:57:37.535] [mctest] before-effect-add :: [cancel] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=200 | wrote cancel=true readback-in-handler=true]
[2026-07-27 19:57:37.735] [mctest] before-effect-add :: [control-no-write] requested=200 handler-writes-duration=undefined handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=198 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=control effect-present=true duration=198
[2026-07-27 19:57:37.735] [mctest] before-effect-add :: [control-no-write] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=200]
[2026-07-27 19:57:37.935] [mctest] before-effect-add :: [extend-duration] requested=100 handler-writes-duration=600 handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=598 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=FIELD-WRITE-TOOK (the effect carries the duration the handler wrote)
[2026-07-27 19:57:37.935] [mctest] before-effect-add :: [extend-duration] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=100 | wrote duration=600 readback-in-handler=600]
[2026-07-27 19:57:38.135] [mctest] before-effect-add :: [shorten-duration] requested=400 handler-writes-duration=100 handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=98 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=FIELD-WRITE-TOOK (the effect carries the duration the handler wrote)
[2026-07-27 19:57:38.135] [mctest] before-effect-add :: [shorten-duration] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=400 | wrote duration=100 readback-in-handler=100]
[2026-07-27 19:57:38.234] [mctest] before-effect-add :: complete — the control case is what says an uncancelled add reads back at all
[2026-07-27 19:57:38.335] [mctest] beforeevents complete — copy every [mctest] line into the design as the answer record
```

### beforeevents run 2

```
[2026-07-27 20:03:52.635] [mctest] beforeevents start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:03:52.635] [mctest] before-entity-hurt :: 4 cases; EntityHurtBeforeEvent.damage is declared mutable in 2.8.0 (index.d.ts:10817, no readonly) and cancel carries no TSDoc (index.d.ts:10811)
[2026-07-27 20:03:52.835] [mctest] before-entity-hurt :: [cancel] requested=4 handler-writes-damage=undefined handler-cancels=true applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:8) health-lost=0 expected-if-the-write-takes=0 cascade=[] verdict=CONTRADICTS-SPEC-CANCELLED-RETURNED-TRUE
[2026-07-27 20:03:52.835] [mctest] before-entity-hurt :: [cancel] handler-notes=[handler-entered damage-as-delivered=4 | wrote cancel=true readback-in-handler=true]
[2026-07-27 20:03:53.135] [mctest] before-entity-hurt :: [control-no-write] requested=4 handler-writes-damage=undefined handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:4) health-lost=4 expected-if-the-write-takes=4 cascade=[hurt(damage=4,cause=none), health(8->4)] verdict=control health-lost=4
[2026-07-27 20:03:53.135] [mctest] before-entity-hurt :: [control-no-write] handler-notes=[handler-entered damage-as-delivered=4]
[2026-07-27 20:03:53.435] [mctest] before-entity-hurt :: [lower-damage] requested=10 handler-writes-damage=2 handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:6) health-lost=2 expected-if-the-write-takes=2 cascade=[hurt(damage=2,cause=none), health(8->6)] verdict=FIELD-WRITE-TOOK (the health lost is the value the handler wrote)
[2026-07-27 20:03:53.435] [mctest] before-entity-hurt :: [lower-damage] handler-notes=[handler-entered damage-as-delivered=10 | wrote damage=2 readback-in-handler=2]
[2026-07-27 20:03:53.735] [mctest] before-entity-hurt :: [raise-damage] requested=1 handler-writes-damage=4 handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:4) health-lost=4 expected-if-the-write-takes=4 cascade=[hurt(damage=4,cause=none), health(8->4)] verdict=FIELD-WRITE-TOOK (the health lost is the value the handler wrote)
[2026-07-27 20:03:53.735] [mctest] before-entity-hurt :: [raise-damage] handler-notes=[handler-entered damage-as-delivered=1 | wrote damage=4 readback-in-handler=4]
[2026-07-27 20:03:53.835] [mctest] before-entity-hurt :: complete — the after-event `hurt(damage=…)` in each cascade says what the engine reported downstream
[2026-07-27 20:03:53.935] [mctest] before-effect-add :: 4 cases; EffectAddBeforeEvent.duration is declared mutable in 2.8.0 (index.d.ts:8215, no readonly)
[2026-07-27 20:03:54.035] [mctest] before-effect-add :: [cancel] requested=200 handler-writes-duration=undefined handler-cancels=true addEffect ok value=undefined -> effect-present=false duration=undefined amplifier=undefined getEffect ok value=undefined health(ok value=number:8 -> ok value=number:8) verdict=MATCHES-SPEC-CANCELLED-RETURNED-UNDEFINED
[2026-07-27 20:03:54.035] [mctest] before-effect-add :: [cancel] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=200 | wrote cancel=true readback-in-handler=true]
[2026-07-27 20:03:54.235] [mctest] before-effect-add :: [control-no-write] requested=200 handler-writes-duration=undefined handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=198 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=control effect-present=true duration=198
[2026-07-27 20:03:54.235] [mctest] before-effect-add :: [control-no-write] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=200]
[2026-07-27 20:03:54.435] [mctest] before-effect-add :: [extend-duration] requested=100 handler-writes-duration=600 handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=598 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=FIELD-WRITE-TOOK (the effect carries the duration the handler wrote)
[2026-07-27 20:03:54.435] [mctest] before-effect-add :: [extend-duration] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=100 | wrote duration=600 readback-in-handler=600]
[2026-07-27 20:03:54.635] [mctest] before-effect-add :: [shorten-duration] requested=400 handler-writes-duration=100 handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=98 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=FIELD-WRITE-TOOK (the effect carries the duration the handler wrote)
[2026-07-27 20:03:54.635] [mctest] before-effect-add :: [shorten-duration] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=400 | wrote duration=100 readback-in-handler=100]
[2026-07-27 20:03:54.735] [mctest] before-effect-add :: complete — the control case is what says an uncancelled add reads back at all
[2026-07-27 20:03:54.835] [mctest] beforeevents complete — copy every [mctest] line into the design as the answer record
```

### beforeevents run 3

```
[2026-07-27 20:09:34.035] [mctest] beforeevents start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:09:34.035] [mctest] before-entity-hurt :: 4 cases; EntityHurtBeforeEvent.damage is declared mutable in 2.8.0 (index.d.ts:10817, no readonly) and cancel carries no TSDoc (index.d.ts:10811)
[2026-07-27 20:09:34.235] [mctest] before-entity-hurt :: [cancel] requested=4 handler-writes-damage=undefined handler-cancels=true applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:8) health-lost=0 expected-if-the-write-takes=0 cascade=[] verdict=CONTRADICTS-SPEC-CANCELLED-RETURNED-TRUE
[2026-07-27 20:09:34.235] [mctest] before-entity-hurt :: [cancel] handler-notes=[handler-entered damage-as-delivered=4 | wrote cancel=true readback-in-handler=true]
[2026-07-27 20:09:34.535] [mctest] before-entity-hurt :: [control-no-write] requested=4 handler-writes-damage=undefined handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:4) health-lost=4 expected-if-the-write-takes=4 cascade=[hurt(damage=4,cause=none), health(8->4)] verdict=control health-lost=4
[2026-07-27 20:09:34.535] [mctest] before-entity-hurt :: [control-no-write] handler-notes=[handler-entered damage-as-delivered=4]
[2026-07-27 20:09:34.835] [mctest] before-entity-hurt :: [lower-damage] requested=10 handler-writes-damage=2 handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:6) health-lost=2 expected-if-the-write-takes=2 cascade=[hurt(damage=2,cause=none), health(8->6)] verdict=FIELD-WRITE-TOOK (the health lost is the value the handler wrote)
[2026-07-27 20:09:34.835] [mctest] before-entity-hurt :: [lower-damage] handler-notes=[handler-entered damage-as-delivered=10 | wrote damage=2 readback-in-handler=2]
[2026-07-27 20:09:35.135] [mctest] before-entity-hurt :: [raise-damage] requested=1 handler-writes-damage=4 handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:4) health-lost=4 expected-if-the-write-takes=4 cascade=[hurt(damage=4,cause=none), health(8->4)] verdict=FIELD-WRITE-TOOK (the health lost is the value the handler wrote)
[2026-07-27 20:09:35.135] [mctest] before-entity-hurt :: [raise-damage] handler-notes=[handler-entered damage-as-delivered=1 | wrote damage=4 readback-in-handler=4]
[2026-07-27 20:09:35.235] [mctest] before-entity-hurt :: complete — the after-event `hurt(damage=…)` in each cascade says what the engine reported downstream
[2026-07-27 20:09:35.335] [mctest] before-effect-add :: 4 cases; EffectAddBeforeEvent.duration is declared mutable in 2.8.0 (index.d.ts:8215, no readonly)
[2026-07-27 20:09:35.435] [mctest] before-effect-add :: [cancel] requested=200 handler-writes-duration=undefined handler-cancels=true addEffect ok value=undefined -> effect-present=false duration=undefined amplifier=undefined getEffect ok value=undefined health(ok value=number:8 -> ok value=number:8) verdict=MATCHES-SPEC-CANCELLED-RETURNED-UNDEFINED
[2026-07-27 20:09:35.435] [mctest] before-effect-add :: [cancel] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=200 | wrote cancel=true readback-in-handler=true]
[2026-07-27 20:09:35.635] [mctest] before-effect-add :: [control-no-write] requested=200 handler-writes-duration=undefined handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=198 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=control effect-present=true duration=198
[2026-07-27 20:09:35.635] [mctest] before-effect-add :: [control-no-write] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=200]
[2026-07-27 20:09:35.835] [mctest] before-effect-add :: [extend-duration] requested=100 handler-writes-duration=600 handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=598 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=FIELD-WRITE-TOOK (the effect carries the duration the handler wrote)
[2026-07-27 20:09:35.835] [mctest] before-effect-add :: [extend-duration] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=100 | wrote duration=600 readback-in-handler=600]
[2026-07-27 20:09:36.035] [mctest] before-effect-add :: [shorten-duration] requested=400 handler-writes-duration=100 handler-cancels=false addEffect ok value=object(Effect) -> effect-present=true duration=98 amplifier=1 getEffect ok value=object(Effect) health(ok value=number:8 -> ok value=number:8) verdict=FIELD-WRITE-TOOK (the effect carries the duration the handler wrote)
[2026-07-27 20:09:36.035] [mctest] before-effect-add :: [shorten-duration] handler-notes=[handler-entered effectType="Speed II" duration-as-delivered=400 | wrote duration=100 readback-in-handler=100]
[2026-07-27 20:09:36.135] [mctest] before-effect-add :: complete — the control case is what says an uncancelled add reads back at all
[2026-07-27 20:09:36.235] [mctest] beforeevents complete — copy every [mctest] line into the design as the answer record
```

