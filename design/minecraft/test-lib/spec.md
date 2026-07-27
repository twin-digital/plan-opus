# @twin-digital/minecraft-test-lib

## Summary

This design specifies `@twin-digital/minecraft-test-lib`, a test-double library for Minecraft
Bedrock behavior packs. Its product is a published npm package of in-memory fakes of the
`@minecraft/server` object model — world, dimensions, entities, entity components, effects, the
before- and after-event signals, `system` scheduling, dynamic properties, scoreboards, and the
messages a pack sends — that hold real state and mutate it as their members are called, so a test
asserts that health is now 20 rather than that `setCurrentValue` was called with 20.

The problem it answers is that `@minecraft/server` ships type declarations with no runtime
JavaScript, so pack authors hand-roll a double per test. Those doubles cannot express the
conditions that break real packs — a component that is absent, a reference that went invalid in the
middle of the event that fired — and a double that returns a plausible-looking payload lets a
handler take the wrong branch while the test still passes.

One constraint shapes everything below: the library never replaces or intercepts the module import.
A fake reaches the code under test only as an object the test passes in, so both what the package
exports and how far it can reach are bounded by what a pack is willing to be handed.

## Open questions

```yaml
questions:
  - id: effect-duration-comparison-basis
    question: >-
      when addEffect re-adds an effect at the same amplifier, does the engine compare the new
      duration against the duration originally applied or against the duration remaining?
    closes: fact
```

## The package and how a test reaches a fake

The package is `@twin-digital/minecraft-test-lib`: TypeScript sources published as an ESM-only
build with type declarations, no runtime dependencies, and a single peer dependency on
`@minecraft/server` at `2.8.0` — the pinned version every behaviour below is read from
[[r:target-server-version]] [[d:esm-only-typescript-package]]. It depends on no test framework, and
nothing in a fake knows which runner is driving it; a caller who wants call recording wraps a fake
with their own spy library [[r:no-test-framework-dependency]].

The library imports only *types* from `@minecraft/server`. That package ships `index.d.ts`,
`package.json`, and a README and no JavaScript at all, so an enum member such as
`EntityComponentTypes.Health` has a type but no value at runtime and importing the module from a
test process fails outright [[f:server-package-ships-types-only]]. Every id the library handles is
therefore a plain string; a test that wants named constants takes them from
`@minecraft/vanilla-data`, which does ship runtime JavaScript and whose values are the canonical
prefixed ids [[f:vanilla-data-provides-prefixed-id-constants]].

A test obtains everything from one call:

```ts
const server = createServer()
install(server)                       // code under test takes { world, system, … }
```

`createServer()` returns a `FakeServer` whose properties are named exactly as `@minecraft/server`
exports them — `world`, `system`, and the eight registry classes `BiomeTypes`, `BlockStates`,
`BlockTypes`, `DimensionTypes`, `EffectTypes`, `EnchantmentTypes`, `EntityTypes`, `ItemTypes` — so
the returned value is assignable to a `Pick<>` of the module's namespace type and a pack written to
receive its engine handles as a parameter can be handed the whole bundle
[[d:server-bundle-mirrors-module-exports]]. Each registry is declared as a `class`, never an object
literal: the bundle's registry properties are typed `typeof BiomeTypes` and its siblings, whose
static side carries `prototype`, which only a class declaration supplies — an object literal is not
assignable there [[r:fakes-are-structurally-assignable]]. All eight registries are declared and
every member on them throws `NotImplementedError`; no behaviour in this cycle reads one, and
`withVanillaDimensions` registers dimensions on the world without touching `DimensionTypes`.

The bundle is the only route to `system` and the registries,
because the library substitutes objects and does not touch the module graph: a pack that reaches
the engine solely through a direct `import { world } from '@minecraft/server'` is outside its reach
[[r:object-substitution-not-module-mocking]]. That reach matters — 84% of surveyed public packs use
`system` scheduling and 41% touch the static registries, and `world` and `system` are module-level
singletons rather than anything an instance hands out
[[f:public-packs-reach-past-entities-and-events]] [[f:engine-surface-outside-instances]].

All state a bundle holds belongs to that bundle. The library keeps no module-level mutable state,
so two `createServer()` calls in one process share nothing and tests need no reset hook
[[r:instance-scoped-world]].

Every fake declares the full public shape of the type it stands in for and is assignable where the
real declared type is expected, with no cast: the 2.8.0 classes carry no private instance members
and no brand fields, so a value exposing only a class's public shape satisfies it structurally
[[f:server-classes-are-structurally-assignable]] [[r:fakes-are-structurally-assignable]]. Declaring
the whole shape means declaring members this cycle does not model. Every such member exists and
throws `NotImplementedError` when called or read — items, blocks, containers and the player client
surface included — rather than being absent or reading `undefined`
[[d:out-of-scope-members-throw-not-implemented]] [[r:fakes-never-fabricate]].

Each faked class is a shell over two things: a per-class handler table, whose entries the class's
members delegate to and whose default entry throws `NotImplementedError`, and a private state record
each instance carries and the handlers read and write. A behaving member is a handler registered
against the table for the member it implements. That is what lets several parts of the library layer
behaviour onto one `FakeEntity` without editing its class or each other's code: the class
declarations are written once, and everything after them is handlers over the state record.

A fake exposes no member the real API does not have. Everything the real surface cannot express is
an exported free function over the fakes [[r:only-real-members-free-functions]]:

| function | what it does |
|---|---|
| `createServer()` | a new bundle: world, system, registries |
| `createEntity(server, { typeId, id?, dimension?, location? })` | a fake entity registered with that world |
| `createPlayer(server, options)` | as above, a `Player` |
| `addComponent(entity, componentId, state?)` | attach a component to a live entity |
| `removeComponent(entity, componentId)` | detach one |
| `setEffectState(effect, state)` | supply an effect's field values, `state` being `{ displayName?: string }` |
| `invalidate(entity)` | put the reference into the engine's invalid state |
| `emit(signal, payload)` | deliver a payload to a signal's subscribers |
| `advanceTicks(server, count)` | run scheduled callbacks |
| `getOutput(target)` | the messages and titles sent to a player or the world |
| `getTriggeredEvents(entity)` | the `triggerEvent` calls made on an entity |

### What the library models

The fakes behave: they hold state and mutate it, so assertions read state rather than call logs
[[r:fakes-behave-not-record]]. What they model with the engine's own behaviour, quirks included
[[r:modelled-behaviour-is-the-engines]], is the world and its dimensions, entity identity and
lifecycle, the seven attribute-shaped entity components, effects, event subscription and dispatch,
`system` scheduling, dynamic properties, scoreboards, message output, and invalidation. Every other
entity component can be attached and carries its declared shape, but only its `typeId`, `isValid`
and `entity` members behave — the rest throw `NotImplementedError`
[[d:modelled-surface-is-world-entity-effect]]. Items, blocks and containers are outside this cycle
entirely, which the survey costs at 69% of repositories referencing one of them unambiguously
[[f:public-packs-reach-past-entities-and-events]].

Every behaviour stated below as the engine's rests on the pinned declarations, the official API
reference, or a recorded observation, and where an observation contradicts the reference this
document says so and follows the observation [[r:engine-claims-are-sourced]]. Where the library
simplifies, the simplification is marked as the library's own; those are gathered under *Where the
fakes diverge*.

## Constructing a world

`createServer()` populates nothing. The world has no dimensions, no players, no objectives and no
dynamic properties, and a new entity carries no components and no field values beyond the ones the
caller passed [[r:no-implicit-defaults]]. That is deliberately unlike the engine, where a freshly
spawned entity always arrives carrying at least one component and no common baseline set exists
[[f:fresh-entity-is-never-component-empty]].

Reading a value the caller never supplied — `nameTag`, `location`, `getRotation()` — throws
`UnsetValueError` naming the member, because the engine cannot lack those values and a fake that
invented one would let a handler branch on fiction [[r:fakes-never-fabricate]]. Absence the engine
*can* exhibit is different and reads back as the engine reports it: `getComponent` for a component
that is not attached returns `undefined`, an unset dynamic property returns `undefined`, and an
unknown scoreboard objective or participant returns `undefined` rather than throwing
[[d:absence-reads-as-undefined]]. An empty collection is likewise a real resting state, not a sign
of an unconfigured object [[f:world-resting-state-observed]].

Populated starting points ship as presets the caller invokes explicitly, never as constructor
behaviour, and compose freely [[r:presets-are-opt-in]]. Two ship in this cycle
[[d:presets-are-vanilla-dimensions-and-spawn-frame]]:

- `withVanillaDimensions(server)` adds the three vanilla dimensions. `world.getDimension` then
  resolves `overworld`, `nether`, `the_end`, their `minecraft:`-prefixed forms, and the spaced alias
  `"the end"`, each returning a dimension whose `id` is the prefixed form, with `heightRange`
  −64..320, 0..128 and 0..256 respectively and `localizationKey`
  `dimension.dimensionName0`/`1`/`2` [[f:vanilla-dimensions-resolve-with-populated-fields]].
- `asSpawnedEntity(entity)` supplies the spawn-frame values a source pins: `nameTag` the empty
  string, `getRotation()` `{x: 0, y: 0}`, and `getVelocity()` `{x: 0, y: 0, z: 0}`
  [[f:fresh-entity-nametag-is-empty-string]]. The zeros are pinned for seven of the eight types
  sampled and not for `minecraft:xp_orb`, which spawns with a randomized rotation and a nonzero
  randomized velocity, so on an entity of that type the preset supplies `nameTag` alone and leaves
  rotation and velocity unset [[f:spawn-frame-kinematics-zero-except-xp-orb]].

Neither preset invents per-type vanilla data. A sheep's fourteen components and its 8/8/0/8 health
are per-type data no preset here supplies; a package built on this one may
[[f:fresh-health-component-values-populated]].

`world.getDimension(id)` with an id no dimension in that world answers to throws a plain `Error`
with the message ``Dimension '<id>' is invalid.`` — including on a world where the preset was never
applied [[f:get-dimension-unknown-id-error]].

## Entities

`createEntity` requires a `typeId` and accepts an optional `id`; when none is given the library
assigns one, because in the engine the spawner never chooses it
[[r:ids-auto-assigned-typeid-required]]. Assigned ids are opaque decimal strings issued
sequentially from `1` within a bundle and never reissued after an entity is removed
[[f:entity-ids-not-reused]] [[d:entity-ids-are-sequential-opaque-strings]]. The engine's own ids are
negative integers, but `Entity.id` is documented as opaque with no meaning to be inferred from its
structure, so the spelling is not something a pack may rely on
[[f:entity-id-is-documented-opaque]].

Registration is readable back through five lookups, which behave: `world.getEntity(id)` returns the
registered entity or `undefined` for an id no entity in that world holds, `world.getAllPlayers()`
and `world.getPlayers()` return the registered players, and `dimension.getEntities()` and
`dimension.getPlayers()` return those registered in that dimension, in creation order. An entity
created with no `dimension` is registered with the world and appears in no dimension's listing.
`EntityQueryOptions` filtering is not modelled: a call passing an options argument throws
`NotImplementedError`, so only the no-argument forms answer. Every other lookup the declarations
carry — `dimension.getEntitiesAtBlockLocation`, `dimension.getEntitiesFromRay`,
`entity.getEntitiesFromViewDirection` and the rest — throws `NotImplementedError` like any unmodelled member.

`dimension.spawnEntity(typeId, location)` behaves: it creates an entity of that type at exactly the
requested location, registers it with the world, fires `entitySpawn`, and returns it. The engine
adjusts some placements — a boat lands 0.2 off on x and z — and AI-driven mobs drift within a
couple of dozen ticks; the fake reproduces neither, and an entity stays exactly where it was put
until something moves it [[f:boat-spawn-offset-magnitude-constant]]
[[f:post-spawn-mob-motion-is-per-run-not-per-type]] [[d:placement-and-motion-are-literal]].

`entity.remove()` detaches the entity from the world and fires `entityRemove`, whose payload
carries exactly two readonly strings, `removedEntityId` and `typeId`, and no entity reference —
which is what makes it readable after the entity is gone [[f:entity-remove-after-event-shape]]. It
fires no death event, and nothing else [[f:kill-and-remove-cascades]]
[[d:remove-raises-only-entity-remove]]. `remove()` does not invalidate references a test holds;
that is `invalidate()`'s job.

`entity.triggerEvent(eventName)` requires the `minecraft:`-prefixed form and throws
`InvalidArgumentError` with the message ``Invalid value passed to argument [0]. The event <name>
does not exist on <typeId>`` for a bare id — the one surface where the engine does not assume the
namespace, contradicting the API reference, which says it does [[f:namespace-prefix-tolerance-is-per-surface]]. It returns
`undefined`, changes no state, and records the call for `getTriggeredEvents`
[[d:trigger-event-requires-prefix-and-records]].

## Entity components

`addComponent` and `removeComponent` reshape a live entity's components, because the real API does
that only through data-driven paths these fakes do not model
[[r:control-plane-component-mutation]]. `entity.getComponent(id)` accepts the bare or the prefixed
form and `getComponents()` returns what is attached.

`addComponent`'s optional third argument is the attached component's field values:
`{ currentValue?: number, defaultValue?: number, effectiveMin?: number, effectiveMax?: number }`,
the four numbers an attribute component holds. It is accepted only on one of the seven
attribute-shaped ids below; passing it with any other id throws `InvalidArgumentError`. Any of the
four left unsupplied is unset, so reading it throws `UnsetValueError` naming the member, and a
member that needs it — `setCurrentValue`'s bounds check, `resetToDefaultValue` and its siblings —
throws `UnsetValueError` naming the bound it could not read [[r:no-implicit-defaults]].

Ids are normalized on entry and stored and reported in the canonical `minecraft:`-prefixed form, so
a read compares equal against the `@minecraft/vanilla-data` constants a test holds
[[r:canonical-prefixed-storage]]. Tolerance of the bare form is per-surface rather than universal —
`getComponent`, `addEffect`, `getEffect` and `spawnEntity` accept both, and `triggerEvent` does not
[[f:namespace-prefix-tolerance-is-per-surface]]. The accepted id sets are derived from the
declarations rather than transcribed: `keyof EntityComponentTypeMap` for every id,
`` `${EntityComponentTypes}` `` for the canonical ones, and a conditional mapping over the type map
for the attribute-shaped subset — 68 component classes on 2.8.0, of which 7 are attribute-shaped
[[f:component-ids-are-derivable-from-types]]. Those derivations are types and produce nothing at
runtime, so the attribute-shaped set is also enumerated as a literal array the library ships and
`addComponent` dispatches on, the derived union serving as the compile-time check that the array is
complete. On 2.8.0 that array is `minecraft:health`, `minecraft:lava_movement`,
`minecraft:movement`, `minecraft:player.exhaustion`, `minecraft:player.hunger`,
`minecraft:player.saturation`, `minecraft:underwater_movement`.

Those seven components behave in full. Each holds `currentValue`, `defaultValue`,
`effectiveMin` and `effectiveMax`, and `setCurrentValue` accepts a value exactly at either bound
and throws `ArgumentOutOfBoundsError` outside them with the message ``Unsupported or out of bounds
value passed to function argument [0]: value, Value: <value>, Argument bounds: [<min>, <max>]``
[[f:set-current-value-bounds-observed]].

Writes through the health component fire `entityHealthChanged` and never `entityHurt`, and a write
that lands exactly on `effectiveMin` also fires `entityDie` with cause `override`. That covers
`setCurrentValue`, `resetToDefaultValue`, `resetToMaxValue` and `resetToMinValue`
[[f:component-health-writes-cascade]].

### Damage and death

`entity.applyDamage(amount, options?)` subtracts `amount` from the health component's
`currentValue`, then fires `entityHurt`, `entityHealthChanged` and — on a killing hit — `entityDie`,
in that order, and returns `true`. A killing hit is one leaving `currentValue` at or below
`effectiveMin`. On an entity carrying no health component it changes nothing, fires nothing, and
returns `false`.

The damage path writes health directly rather than through `setCurrentValue`: it skips the bounds
check and does not attach the `override` death cause a component write landing on `effectiveMin`
carries, using the damage's own cause instead. So the value is not clamped — 100 damage against 8
health leaves −92 and `entityHealthChanged` reports the negative value, where `kill()` and
`resetToMinValue` land exactly on the minimum [[f:health-not-clamped-at-minimum]]. `entityHurt.damage`
carries the requested amount even when it exceeds remaining health
[[f:damage-cascade-order-and-payload]].

With no options the cause is `none`; the plain options form carries a required `cause` and that
cause is used as given; the projectile options form has no `cause` field and reports `projectile`,
with the damage applied being the amount requested — the engine's velocity-dependent adjustment of
projectile damage is not reproduced [[f:applydamage-cause-defaults]]
[[d:projectile-damage-is-verbatim]]. Either form's optional `damagingEntity` and the projectile
form's `damagingProjectile` are carried onto the `damageSource` of the `entityHurt` payload, and of
the `entityDie` payload when the hit kills.

`entity.kill()` returns true. On an entity with a health component it fires `entityHurt` with
damage equal to current health and cause `selfDestruct`, sets health to exactly `effectiveMin`,
fires `entityHealthChanged`, then fires `entityDie` with cause `selfDestruct`. A second `kill()`
returns true and fires nothing [[f:kill-and-remove-cascades]]. On an entity with no health
component it returns true and fires only `entityDie` with cause `selfDestruct`
[[f:kill-no-health-behaviour]]. `kill()` never invalidates the reference — in the engine when a
corpse becomes invalid varies by entity type and is not a uniform grace period, so a test that
wants the dead reference invalid says so with `invalidate()` [[f:death-invalidation-window]].

## Effects

`entity.addEffect(effectType, duration, options?)` returns the resulting `Effect` on success, both
when adding and when updating — the declared signature governs over the pinned TSDoc's contrary
prose [[f:addeffect-returns-the-effect]]. With no amplifier option the effect carries amplifier 0
[[f:effect-amplifier-defaults-to-zero]].

Re-adding an effect already present replaces it when the new amplifier is higher, or when the
amplifier is equal and the new duration is longer or equal; a lower amplifier never replaces
whatever the duration, and an equal amplifier with a shorter duration does not
[[f:effect-replacement-rule-observed]].

A fake effect's duration is the number applied and stays that number until the effect is removed:
advancing ticks does not decay it and never expires an effect
[[d:effect-durations-do-not-decay]]. `getEffect(typeId)` returns the effect or `undefined`;
`getEffects()` returns those present; `removeEffect(typeId)` removes one and returns whether it was
there.

`Effect.displayName` is a populated human-readable string in the engine — `"Speed II"` for speed at
amplifier 1 — which no declaration or constant pins, so the fake reads back what the test supplied
for it and throws `UnsetValueError` when the test supplied nothing
[[f:live-effect-fields-populated]] [[d:effect-display-name-is-supplied]]. The test supplies it with
`setEffectState(effect, { displayName })`, the effect-side counterpart of `addComponent`'s `state`:
`addEffect` takes the engine's own `EntityEffectOptions`, which has no display-name field, and
`Effect` has no member to set one through, so the supply route is a free function
[[r:only-real-members-free-functions]].

## Events

Every signal the declarations carry exists on `world.afterEvents` (55 signals), `world.beforeEvents`
(13), and `system`'s own signals, and every one supports `subscribe` and `unsubscribe`
[[f:world-resting-state-observed]]. A small set is raised by the fakes' own behaviour: the
after-events `entitySpawn`, `entityRemove`, `entityHurt`, `entityHealthChanged` and `entityDie`,
and three before-events — `entityHurt` ahead of `applyDamage`, `entityRemove` ahead of `remove()`,
and `effectAdd` ahead of `addEffect`. No other before-event is raised; `kill()` raises none, and
the declarations carry no before-event for spawn, health change or death. Any other signal is
driven by the test calling `emit(signal, payload)`, which delivers the payload as given
[[d:every-signal-exists-few-are-raised]].

Subscription is set-shaped: subscribing the same function reference twice delivers one call, and
distinct subscribers run in subscription order [[f:subscription-semantics-observed]]. A handler
that throws propagates out of the call that dispatched it, so a test sees the failure rather than
losing it.

After-events are dispatched synchronously, inside the call that caused them, before that call
returns [[r:synchronous-event-delivery]]. The engine defers them past the mutating call's return
and delivers them later in the same game tick [[f:after-events-deferred]]
[[f:after-event-deferral-subtick]]; a fake with no tick loop has nothing to defer within. The cost
is real and worth knowing while writing a test: code placed after a mutating call runs *after* its
handlers, not before. Handlers observe post-write state either way.

Before-events are dispatched synchronously ahead of the action they gate. A handler that sets
`cancel = true` stops the action: no state changes and no after-event fires
[[r:before-events-can-cancel]]. The gated call still returns, and returns as if it had done nothing:
a cancelled `applyDamage` returns `false`, a cancelled `addEffect` returns `undefined`, and
`remove()` returns `undefined` either way, leaving the entity registered with the world.

## Scheduling

`system` records; it never runs anything on its own. `run`, `runTimeout` and `runInterval` store a
callback against a tick, `clearRun` discards one by handle, and nothing executes until the test
calls `advanceTicks(server, count)`. The library starts no timer and awaits nothing
[[r:scheduling-is-test-advanced]]. `system.currentTick` starts at 0 and moves only under
`advanceTicks` [[d:current-tick-starts-at-zero]]. `advanceTicks` steps one tick at a time,
incrementing `currentTick` and then running every callback due at that tick in the order it was
scheduled; a `run` callback is due on the next tick, `runTimeout(cb, n)` on the nth tick after
scheduling, and `runInterval(cb, n)` every nth tick until cleared. `runJob`/`clearJob` are
declared and throw `NotImplementedError`.

## Persisted state and captured output

Dynamic properties are real storage on the world and on every entity: `setDynamicProperty`,
`getDynamicProperty`, `getDynamicPropertyIds` and `clearDynamicProperties` behave over a per-object
map holding the declared value types, and what the code under test wrote is what a test reads back
[[r:persisted-state-is-modeled]]. `getDynamicPropertyTotalByteCount` is declared and throws
`NotImplementedError`, since no source pins the engine's accounting.

`world.scoreboard` is likewise real state: `addObjective`, `getObjective`, `getObjectives` and
`removeObjective` over a map of objectives, each holding scores per participant through
`setScore`, `getScore`, `getScores` and `getParticipants`, plus the display-slot assignment
readable through `getObjectiveAtDisplaySlot`. `entity.scoreboardIdentity` is the participant
identity for that entity.

What a fake would send is recorded rather than discarded [[r:output-is-capturable]]:
`player.sendMessage`, `world.sendMessage`, and `player.onScreenDisplay`'s `setTitle`,
`updateSubtitle` and `setActionBar` each append a record to their target's output log.
`getOutput(target)` returns that log as an array of `{ kind, value, options? }`, where `kind` is
one of `message`, `title`, `subtitle`, `actionBar`, `value` is the raw or localized message as
passed, and `options` is whatever the member carried.

## Invalidation and error shapes

`invalidate(entity)` puts a reference into the state the real API leaves a stale reference in, and
may be called at any point in a test — including on a reference a handler is holding mid-event
[[r:invalidation-is-modeled]].

The guard list is a per-member table taken from the reflective sweep of the engine's own `Entity`
prototype, not from the declarations' `@throws` annotations, which under-report it: `nameTag` and
`isSneaking` carry no annotation and throw anyway [[f:invalidation-guard-list-complete]]
[[d:guard-list-comes-from-the-observation]]. On an invalidated entity exactly four properties stay
readable — `id`, `isValid` (false), `typeId`, and `scoreboardIdentity` (`undefined`) — and every
other member throws `InvalidEntityError`. The engine checks argument count before its validity
guard, so a wrong-arity call on a removed entity raises a `TypeError` first
[[f:arity-checked-before-validity-guard]]; the fake does not reproduce that ordering and throws
`InvalidEntityError` regardless of how a guarded member was called.

Components and effects follow their owner, and not with a single error class
[[f:attribute-guard-classes-observed]] [[f:effect-members-throw-plain-error]]:

| member | on an invalid owner |
|---|---|
| attribute `isValid`, `typeId` | readable; `isValid` is false |
| attribute `currentValue`, `defaultValue`, `effectiveMax`, `effectiveMin` | plain `Error`, ``Failed to get property '<internal name>'.`` — the engine names its internal field, not the public member: `current`, `value`, `effectiveMaxValue`, `effectiveMinValue` respectively |
| attribute `resetToDefaultValue`, `resetToMaxValue`, `resetToMinValue` | plain `Error`, ``Failed to call function '<name>'.`` |
| attribute `setCurrentValue`, `entity` | `InvalidEntityError` |
| effect `isValid` | readable; false |
| effect `amplifier`, `duration`, `typeId`, `displayName` | plain `Error`, ``Failed to get property '<member>'.`` |

The library exports its own error classes, because none of the engine's is importable at runtime
[[f:server-package-ships-types-only]] [[d:library-declares-its-error-classes]].
`InvalidEntityError` extends `Error`, sets `name` to `InvalidEntityError`, and carries the readonly
`id` and `type` of the entity that became invalid, matching the declared shape
[[f:invalid-entity-error-shape]]. `ArgumentOutOfBoundsError` and `InvalidArgumentError` do the same
for the messages quoted above. Two errors are the library's own and have no engine counterpart:
`NotImplementedError` for a declared member this cycle does not model, and `UnsetValueError` for a
read of a value the test never supplied. Both name the member they came from.

## Where the fakes diverge

These are the library's own simplifications, not the engine's behaviour:

- After-events dispatch synchronously rather than same-tick-deferred.
- Construction populates nothing, where a real entity always arrives with components.
- Effect durations do not decay and effects never expire.
- Entities never move on their own and land exactly where they are placed.
- Projectile-form damage is the amount requested.
- `remove()` raises `entityRemove` alone.
- Method arity is not checked ahead of the validity guard.
- Items, blocks, containers, the player client surface, custom commands, the startup registries, and
  all eight registry classes are declared and throw `NotImplementedError`.
- Entity queries ignore no filter because they accept none: an `EntityQueryOptions` argument throws.

## Components

```yaml
components:
  - id: error-model
    responsibility: >-
      the exported error classes — InvalidEntityError with id and type, ArgumentOutOfBoundsError,
      InvalidArgumentError, NotImplementedError, UnsetValueError — and the plain-Error message
      builders for the failed-property and failed-call shapes
    excludes: deciding which member raises which error

  - id: surface-scaffold
    responsibility: >-
      the declared full public shape of every faked class, each member delegating to a per-class
      handler table that defaults to throwing NotImplementedError, the per-instance state record
      handlers read and write, and the id types derived from EntityComponentTypeMap
    excludes: any behaving member
    after: [error-model]

  - id: event-bus
    responsibility: >-
      the signal objects on world.afterEvents, world.beforeEvents and system, subscribe/unsubscribe
      with reference dedupe and subscription order, synchronous dispatch, before-event
      cancellation, and the emit free function
    excludes: which fake member raises which signal
    after: [surface-scaffold]

  - id: world-and-dimensions
    responsibility: >-
      createServer, the FakeServer bundle mirroring the module's exported names with the eight
      registry classes, the world instance carrying the event-bus signals, dimension registration
      and getDimension resolution including the invalid-id error, and the entity registry behind
      world.getEntity, world.getAllPlayers, world.getPlayers, dimension.getEntities and
      dimension.getPlayers
    excludes: dimension contents beyond the entity registry
    after: [surface-scaffold, event-bus]

  - id: entity-model
    responsibility: >-
      createEntity and createPlayer, id assignment, typeId and per-entity fields with
      UnsetValueError on unsupplied reads, spawnEntity, triggerEvent recording, remove, and kill
    excludes: component and effect state
    after: [world-and-dimensions, event-bus]

  - id: component-model
    responsibility: >-
      addComponent/removeComponent including the attribute state argument, getComponent id
      normalization, the enumerated seven attribute components with their bounds checks, and the
      health write and applyDamage cascades
    excludes: effects
    after: [entity-model]

  - id: effect-model
    responsibility: >-
      addEffect/getEffect/getEffects/removeEffect, the amplifier-first replacement rule, and effect
      field storage behind the setEffectState free function
    after: [entity-model]

  - id: validity-guards
    responsibility: >-
      the invalidate free function and the per-member guard table for entities, attribute
      components and effects
    after: [entity-model, component-model, effect-model, persisted-state, output-capture]

  - id: system-scheduler
    responsibility: >-
      system's run/runTimeout/runInterval/clearRun recording, currentTick, and the advanceTicks free
      function that runs due callbacks
    after: [surface-scaffold, world-and-dimensions]

  - id: persisted-state
    responsibility: dynamic property storage on world and entities, and the scoreboard with its objectives, scores and display slots
    after: [entity-model]

  - id: output-capture
    responsibility: the per-target output log behind sendMessage and onScreenDisplay, and the getOutput free function
    after: [entity-model]

  - id: presets
    responsibility: withVanillaDimensions and asSpawnedEntity, each supplying only source-pinned values
    after: [world-and-dimensions, entity-model]

  - id: package-and-exports
    responsibility: >-
      the package.json with its peer dependency and ESM-only build, the TypeScript build and
      declaration emit, and the single public entry point re-exporting every fake type and every
      free function
    excludes: the behaviour behind anything it re-exports
    after:
      [
        event-bus,
        world-and-dimensions,
        entity-model,
        component-model,
        effect-model,
        validity-guards,
        system-scheduler,
        persisted-state,
        output-capture,
        presets,
      ]
```
