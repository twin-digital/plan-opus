# Testability probe — `JaylyDev/terminator`

Pack: `JaylyDev/terminator` @ `5e5b4ee0b69bed09cabb105f7bac434656ba1754` (~3.3k source lines, 37 TS
files). An entity-behaviour pack: a humanoid "terminator" mob with combat, pathing, bridge-building,
death messages, and a scripted respawn ceremony.

Method: read every source file, pick the 10 units carrying real decisions, write the test in my head
against the surface `spec.md` pins, and record what stops it. Verdicts below are **surface verdicts**
— they assume the developer can get a fake object into the code under test. A separate section
covers whether that assumption holds for this pack, because for most units it does not.

## How the 10 were chosen

Selection rule: a unit is in if it (a) branches or computes on values a regression could get wrong,
and (b) is separable from the tick loop it happens to be called from. That excludes the eight
`system.runInterval` bodies as *wiring* while keeping the functions they call, excludes pure data
(`config.ts`, `languageKeys.ts`, `capeVariant.ts`, the 40 one-line `attackX()` methods on
`DeathMessageRawText`), and excludes the eight-way `switch` in `buildForward.ts` which is a lookup
table written out longhand. What remains is the death-message router, the damage/escape detectors,
the variant classifier, the jump cooldown, the name-assignment loop, the death-path router, and the
two genuinely pure helpers.

## Verdicts

| # | Unit | Test I would write | Verdict | What stops it |
|---|---|---|---|---|
| 1 | `getDeathMessage(damageSource, deadEntity)` — `terminator-death/deathMessage.ts:63`, a 30-case cause router with nested sub-branches | build a damage source per cause, assert the returned `RawMessage.translate` key | **blocked** | its very first statement constructs `DeathMessageRawText`, whose ctor ends `this.huntingEntity = entityTriedEscapeDeathFrom(deadEntity)` (`rawTextGenerator.ts:89`) → entity dynamic properties (stub), `world.getEntity` (stub), `system.currentTick` (absent). The `contact` branch needs `Block`; the `entityAttack`/`projectile`/`magic` branches need `ItemStack` |
| 2 | `DeathMessageRawText` ctor + `rawMessageTranslator` — `death-message/rawTextGenerator.ts:14,70`, nameTag→translate fallback and the tile-vs-item classification | dead entity with and without a nameTag; damaging player holding a named sword vs. cobblestone; assert the three shapes | **blocked** | `const equippable = damagingEntity.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent; this.damagingItem = equippable.getEquipment(EquipmentSlot.Mainhand);` (`:77-80`) — `getEquipment` is a non-attribute component member (not-implemented) returning `ItemStack` (absent), and `Container.getItem` on the non-player branch. Also `damagingEntity instanceof Player` (`:76`) and the `.componentId` static — see "the `instanceof` problem" below |
| 3 | `entityTriedEscapeDeathFrom(entity)` — `death-message/escapeDeathDetector.ts:19`, the "died within 5s of being hit" window | set the two dynamic properties, advance the tick, assert the returned entity / `undefined` at the boundary | **blocked** | `const damagingEntityId = entity.getDynamicProperty("terminator:damaging_entity") as string;` (`:20`) — dynamic properties are a stub. Then `world.getEntity(damagingEntityId)` (`:28`, stub) and `system.currentTick - hurtByPlayerOrMob` (`:31`, absent). Three blockers on a nine-line function |
| 4 | `getDamagingBlock(hurtEntity)` — `death-message/damageBlock.ts:16`, scans 10 neighbouring blocks for cactus / sweet berry bush | place a cactus at one of the ten offsets, assert the returned type id; assert `undefined` at an eleventh | **blocked** | `const block = hurtEntity.dimension.getBlock(location);` (`:19`) then `block.above()`, `.north()`, … — `Block` is absent from v1 and every block-shaped `Dimension` member is a stub. Single blocker, total |
| 5 | `getVariant` / `isSteveVariant` / `isAlexVariant` — `terminator/terminator.ts:218-244`, maps a variant integer onto the six-value skin enum | attach a variant component with value 1, assert `isAlexVariant()` true and `isSteveVariant()` false; assert the `?? 0` path with no component | **blocked** | `const variant = this.getComponent(EntityVariantComponent.componentId) as EntityVariantComponent \| undefined; const variantValue = variant?.value ?? 0;` — the control plane can *attach* `minecraft:variant` (all 68 are attachable) but `variant` is not one of the 7 attribute-shaped components, so `.value` throws not-implemented. The closest miss in the pack |
| 6 | `TerminatorEntity.jump()` — `terminator/terminator.ts:434`, a cooldown state machine | with the cooldown in the past and on the ground, assert `true` and the new cooldown value; with it in the future, assert `false` and no impulse | **blocked** | `if (cannotJumpUntil <= system.currentTick && this.isOnGround) { this.applyImpulse(PlayerJumpImpulse);` (`:438-439`) — four blockers at once: `getDynamicProperty`/`setDynamicProperty` (stub), `system.currentTick` (absent), `isOnGround` (stub), `applyImpulse` (stub). The densest unit in the pack |
| 7 | `assignNameTag(entity)` — `terminator/initialization.ts:101`, the duplicate-name resolution loop (`Terminator (2)`, skipping reserved names) | three live terminators with the same base name plus one reserved suffix, assert the assigned tag skips to `(3)` | **testable with a seam change** | as written: `getAllTerminators()` → `getEntities({...options, ...queryOptions})` where `queryOptions` carries `minDistance: 0.1` (`getAll.ts:9`) → not-implemented; plus `reservedNames` reading world dynamic properties and `terminator.getDynamicProperty("terminator:name_tag")` per candidate. The seam — extract `resolveNameTag(base, existingNames, reservedNames): string` and keep the I/O in the caller — is the ordinary extract-a-decision refactor a pack author would accept. Note what it implies: after the seam the unit needs no fake at all |
| 8 | the `terminatorDie` handler — `terminator-death/index.ts:9`, routes first / second / third death on two tags and the damage cause | `emit(world, 'entityDie', payload)` with each tag combination, assert which of the three paths ran | **blocked** | the first third is a clean fit — `hasTag`, `nameTag`, `location`, `dimension`, `dimension.spawnEntity` all behave, and `entityDie` is one of the four payloads `emit` accepts. Then `dropEntityInventory(deadEntity)` (`:17`) needs `Container`; `deadEntity.getVariant()` (`:15`) is unit 5; `terminator.triggerEvent("terminator:disable_respawn")` (`:45`) is the half-stub; `sendDeathMessageCallback` needs unit 1 and `world.sendMessage` (stub). Five blockers |
| 9 | `convertYWithinRange(vec3, heightRange)` — `terminator/terminator.ts:45`, clamps y into a dimension's height range | overworld range from the vanilla-dimensions preset, assert clamping at −64 and 320 and pass-through between | **testable as specified** | nothing. Honestly: nothing in the fake is *needed* either — a `{min, max}` literal does it. What the fake contributes is that the preset's ranges are the recorded ones rather than a number the test author remembered |
| 10 | `TerminatorSuffocateAfterEventSignal` — `terminator-events/onTerminatorSuffocate.ts:11`, re-broadcasts `entityHurt` filtered to terminators hurt by suffocation | subscribe a spy, `emit(world, 'entityHurt', {hurtEntity, damageSource:{cause:'suffocation'}})`, assert one delivery; emit with cause `fall` and with a different `typeId`, assert none | **testable as specified** | nothing on the surface. `EntityHurtAfterEvent` is one of the four built payloads, `emit` takes `entityHurt`, registration is set-shaped and ordered, `typeId` behaves. The one caveat is reach, not surface: the ctor closes over the module-level `world` (`:41`) and takes no parameter |

## Tally

- **testable as specified: 2** (units 9, 10)
- **blocked: 7** (units 1, 2, 3, 4, 5, 6, 8)
- **testable with a seam change: 1** (unit 7)

### Blockers ranked by units blocked

| blocker | units | note |
|---|---|---|
| entity dynamic properties (stub) | 1, 3, 6, 7 — **4** | 61 call sites pack-wide. This pack uses dynamic properties as its entire persistence layer: jump cooldown, escape flag, ride timer, reserved names, respawn-ceremony life-time, death message, spawn options. It is not a long-tail surface here, it is the state model |
| `ItemStack` / `Container` (absent) | 1, 2, 8 — **3** | equipment lookup for death messages, inventory drop on death |
| `system.currentTick` / scheduling (absent) | 1, 3, 6 — **3** | `currentTick` is used as a clock in three distinct decisions, not just to schedule |
| `world.getEntity` (stub) | 1, 3 — **2** | id → entity resolution, the pack's cross-reference mechanism |
| non-attribute component members (not-implemented) | 2, 5 — **2** | `EntityVariantComponent.value`, `EntityEquippableComponent.getEquipment` |
| `Block` / `BlockPermutation` / `Dimension.getBlock` (absent) | 1, 4 — **2** | plus `breakBlock`/`placeBlock`, not in the table |
| `getEntities` `minDistance` option (not-implemented) | 7 — **1** | but every entity query in the pack carries it: `getAll.ts:9`, `dummyEntity/getAll.ts:8`, `netherPortal.ts:22,26`, `navigationDetect.ts:20`, `buildVertical.ts:75,82`. It reads like a no-op the author added out of habit, and it refuses all of them |
| `triggerEvent` (half-stub) | 8 — **1** | 29 call sites. The pack drives all its skin, bossbar, invulnerability and respawn state through data-driven entity events |
| `world.sendMessage` (stub) | 8 — **1** | the terminal step of the whole death-message feature |
| `applyImpulse` / `isOnGround` (stubs) | 6 — **1** | |

## Two problems that sit underneath the surface verdicts

**Reach.** This pack never takes a `world`, `dimension`, or `system` as a parameter. Every module
that needs one reads the module-level singleton at import time: `const overworld =
world.getDimension("overworld")` (`getAll.ts:4`, `dummyEntity/getAll.ts:3`, `netherPortal.ts:18`),
`world.afterEvents.entityHurt.subscribe(...)` at module scope in three files, `system.runInterval` at
module scope in eight. Object substitution — the library's only substitution mechanism, by
`r:object-substitution-not-module-mocking` — cannot reach any of it. Of the 10 units, only 4, 5, 6
and 9 could receive a fake purely through their parameters or their `this`; units 1, 2, 3, 7, 8 and
10 read a singleton. A consumer *could* point their runner's module mapper at a shim exporting a
`createWorld()` result as `world`, and the library doesn't prevent that, but the spec ships no such
shim and `system` has no fake to put behind it at all.

Worse, three modules cannot even be imported: `const buildingBlock =
BlockPermutation.resolve(MinecraftBlockTypes.Cobblestone)` runs at module scope in `suffocation.ts:7`,
`buildVertical.ts:23` and `buildForward.ts:114`, and `BlockPermutation` is absent from v1. A test file
that imports those modules throws before the first assertion regardless of what it was going to test.

**The `instanceof` problem.** `damagingEntity instanceof Player` (`rawTextGenerator.ts:76`),
`damagingEntity instanceof Entity` (`:81`), and the `EntityVariantComponent.componentId` /
`EntityEquippableComponent.componentId` statics (`terminator.ts:219`, `rawTextGenerator.ts:78`) are
runtime reads of a types-only package [[f:server-package-ships-types-only]]. In-game they work
because the module is a real runtime. Against fakes they cannot work *in principle*: a fake that is
structurally assignable is still not `instanceof` a class that has no runtime value. This is not a
gap in the built surface — no member list could close it — and it is worth stating in the record
because it bounds what structural conformance can buy. A pack doing this needs either a real module
shim or a refactor to duck-typing.

## What the fake gets right that a hand-rolled double would not

This pack would genuinely benefit from five of the library's modelled behaviours, and each is a
thing I would expect a hand-rolled double to get wrong:

1. **The die payload carries the hurt cause.** `terminator-death/index.ts:20` branches on
   `cause !== EntityDamageCause.void` — read off the *`entityDie`* payload. A hand-rolled double
   almost always fires `entityDie` with a bare or `none` cause, silently sending every test down the
   first-death path. The spec's rule of carrying the `entityHurt` cause forward into `entityDie` is
   exactly what this router needs.
2. **Per-object validity that propagates from the owner.** The pack guards three times, on three
   different object kinds: `if (!health.isValid() || dangerEscapeTriggered) continue;`
   (`escapeFromDanger.ts:21`, a *component*), `if (!dummyEntity.isValid() || ...)`
   (`terminatorRespawn.ts:256`), `if (!damagingEntity || !hurtEntity.isValid()) return;`
   (`escapeDeathDetector.ts:6`). A component reading invalid because its entity was removed is the
   classic double-rolling miss, and it is precisely branch 1.
3. **Health is not clamped at the minimum, and a corpse takes no second death.** The regeneration
   trigger reads `health.currentValue < 20` while the respawn ceremony re-spawns and re-kills. A
   double that clamps at 0 or lets a second `entityDie` fire would produce a passing test for broken
   code.
4. **The effect replacement rule.** `escapeFromDanger` re-adds Regeneration amplifier 4, Absorption
   3, Resistance 0 and Fire Resistance 0 on every interval pass while health stays low. Whether the
   second add replaces the first is the whole question, and the observed higher/equal-with-duration/
   lower rule is not something anyone reconstructs from memory.
5. **Ids are never reused.** `navigationDetect.ts:41` matches a stored navigator id against
   `deadEntity.id`, and `escapeDeathDetector` stores `damagingEntity.id` for a later lookup. A double
   that recycles ids after removal makes both of those tests pass for the wrong reason.

Note that four of those five sit in units this probe marked blocked. The fake models the right things
for this pack; it is the surrounding state and query surface that stops the tests from being written.

## What this one pack cannot tell us

It is one pack by one author, and its idioms are strong ones: dynamic properties as the entire
persistence layer, module-singleton access with no injection anywhere, `minDistance` on every query,
and data-driven entity events (`triggerEvent`) as the main actuator. A pack that kept state in module
variables, passed its dimension in, and drove behaviour through components rather than entity events
would score very differently on the same surface. Equally, "entity-behaviour pack" turned out to be a
poor predictor here: this one is a *block*-manipulating, *item*-dropping, *tick*-scheduling pack that
happens to be about an entity. The survey's 84%/76%/62%/55% figures counted references; this probe
says that for one pack those references sit inside the decisions too — but one pack is one
data point on that question, and the two testable units (a pure clamp and an event re-broadcaster)
are the two that any library would have served.
