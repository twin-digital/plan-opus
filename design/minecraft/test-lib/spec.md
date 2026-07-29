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

## The package and how a test reaches a fake

The package is `@twin-digital/minecraft-test-lib`: TypeScript sources published as an ESM-only
build with type declarations, no runtime dependencies, and a single peer dependency on
`@minecraft/server` at `2.8.0` — the pinned version every behaviour below is read from
[[r:target-server-version]] [[d:esm-only-typescript-package]]. It depends on no test framework, and
nothing in a fake knows which runner is driving it; a caller who wants call recording wraps a fake
with their own spy library, which works because the fakes are plain objects with nothing intercepting
them [[r:no-test-framework-dependency]]. Everything it exports — every fake
type and every free function — is reachable from one entry point, `@twin-digital/minecraft-test-lib`
itself, with no subpath exports [[d:one-public-entry-point]].

The library imports only *types* from `@minecraft/server`. That package ships `index.d.ts`,
`package.json`, and a README and no JavaScript at all, so an enum member such as
`EntityComponentTypes.Health` has a type but no value at runtime and importing the module from a
test process fails outright [[f:server-package-ships-types-only]]. Every id the library handles is
therefore a plain string; a test that wants named constants takes them from
`@minecraft/vanilla-data`, which does ship runtime JavaScript and whose values are the canonical
prefixed ids [[f:vanilla-data-provides-prefixed-id-constants]].

A test obtains everything from one call:

```ts
import { createServer } from '@twin-digital/minecraft-test-lib'
import { installMyPack } from '../src/main.js'   // the pack under test, not this library

const server = createServer()
installMyPack(server)                            // the pack takes { world, system, … }
```

The second line is the *pack's* own entry point, whatever it is called; this library exports nothing
that installs anything. Handing the bundle to a function the pack already exposes is the whole
integration, and it is the only one available, since the library never touches the module graph
[[r:object-substitution-not-module-mocking]].

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
`withVanillaDimensions` registers dimensions on the world without touching `DimensionTypes`
[[d:registries-are-declared-and-throw]].

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

Every fake carries the full public shape of the type it stands in for and is assignable where the
real declared type is expected, with no cast. That shape is not hand-written and not asserted — it
is generated and then checked. A build-time generator reads the pinned `index.d.ts` and emits a
plain TypeScript class per faked type, declaring `implements MC.Entity` and its siblings, with every
declared member written out [[d:fakes-are-generated-classes-with-guard-prologues]].

`implements` is the point. It fails against a partial class precisely because it demands every
member, which is what defeated the hand-written approaches and is exactly what generation supplies.
So the compiler verifies completeness on every build: a member the generator misses, or types wrong,
or a member a version bump adds, is a build error rather than a hole discovered by a test that
happened to call it. `r:fakes-are-structurally-assignable` moves from satisfied-by-construction to
satisfied-and-checked [[f:server-classes-are-structurally-assignable]]
[[r:fakes-are-structurally-assignable]]. The one thing `implements` cannot give is inheritance —
`extends` is refused outright because the engine's classes declare a `private constructor()` — which
costs nothing here, since the generator writes the members rather than inheriting them.

Each generated member is an arity check, then a guard prologue, then a body. The arity check comes
first because that is where the engine puts it: a call with too few arguments on a removed entity
raises a `TypeError` and never reaches the validity guard [[f:arity-checked-before-validity-guard]].
The generator emits a per-member arity manifest from the declared signature, and the check enforces
**the minimum only** — a call carrying fewer arguments than the member has required parameters
throws `Incorrect number of arguments to function. Expected <n>, received <m>`, where the expected
part is written `<min>-<max>` when the two differ and as the single number when they do not, which
is the engine's own wording: `addEffect` reports `Expected 2-3`, `addTag` reports `Expected 1`. The
manifest therefore carries both bounds because the *message* names both, while only the lower one
gates the call [[d:generated-members-check-arity-before-the-guard]].

**No maximum is checked, and extra arguments pass through**, because nothing has ever observed the
engine receiving too many. Every arity observation in the record is of too few: the reflective sweep
called all 46 `Entity` methods with zero arguments, 19 reached the guard because zero was right for
them, and 27 threw on arity; the follow-up then called those 27 with correct arguments and all 27
reached the guard [[f:arity-checked-before-validity-guard]]
[[f:invalidation-guard-covers-argument-taking-methods]]. Every observed line reads `received 0`.
Native bindings commonly ignore extra arguments rather than rejecting them, so a fake that threw
would risk being *stricter* than the engine — failing a test that real code passes, and inviting
someone to change correct code to satisfy it. Inventing that rejection is what
[[r:fakes-never-fabricate]] and [[r:engine-claims-are-sourced]] forbid. Where the engine's behaviour
is unknown, permissive is the right direction to be wrong: it cannot fail a test that would pass
against the engine.

The guard prologue throws per the guard data
for that class and member; the body either delegates to the hand-written behaviour for a modelled
member, or throws `NotImplementedError` for one this cycle does not model — items, blocks,
containers and the player client surface included [[d:out-of-scope-members-throw-not-implemented]]
[[r:fakes-never-fabricate]]. The guard is therefore in every member rather than at one interception
point, and it runs before any modelled behaviour, which is the order the engine has
[[r:invalidation-is-modeled]]. Guarding at the member is also what makes the guard *land where the
engine's does*: a prologue inside a method body runs when the method is called and not when it is
read, and it reads validity at that moment, so a reference captured while the entity was valid still
throws when it eventually runs [[f:invalidation-guard-fires-at-call-not-access]].

Overloads need no special case today and little tomorrow. **No class in the declarations carries an
overloaded member**: a scan of all 438 declared classes and their 613 method signatures finds no
name declared twice, so every member has one required-parameter count and the minimum is exact.
`getComponent` is generic rather than overloaded — one parameter list with a type-map return — and
`teleport` and `setDynamicProperties` are likewise single signatures. Should a version bump
introduce an overload, the generator takes the **narrowest required-parameter count across the set**,
which rejects only calls that no overload could accept. The consequence is worth stating: a call
that satisfies no individual overload but clears that narrowest minimum is accepted by the fake,
where the engine may reject it. That errs permissive, in the same direction and for the same reason
as leaving the maximum unchecked. Rest parameters need no handling at all once there is no maximum.

There is no `Proxy` and no runtime interception anywhere in the library. That is what makes the
fakes behave like ordinary objects under everything a test might do to them:

- **A spy library works natively.** `sinon.spy(entity, 'applyDamage')` reads the prototype method,
  wraps it, and assigns the wrapper; the next call finds it, because there is nothing in between.
  That is `r:no-test-framework-dependency`'s promise — fakes a caller wraps with their own spy
  library — met by the fakes being plain objects rather than by a mechanism that has to anticipate
  spying.
- **`'teleport' in entity` is `true`** because `teleport` is really on the prototype, and an unknown
  name is `false`, matching the engine on both [[f:entity-shape-is-identical-valid-or-invalid]].
- **Enumeration matches the engine, own and inherited alike.** A real entity carries exactly two own
  enumerable properties, `typeId` and `id`, and about sixty enumerable members on its prototype, so
  the engine reads `Object.keys` 2, `getOwnPropertyNames` 2 and `for-in` 62
  [[f:entity-shape-is-identical-valid-or-invalid]]. Matching both numbers takes three things of the
  generator, and satisfying any two of them without the third gets one of the numbers wrong.

The emission rule, then, in full:

1. `typeId` and `id` are **own data properties**, set in the constructor. They are what `Object.keys`,
   spread and `JSON.stringify` must find.
2. **Every other member sits on the prototype.** A class field is an own property, so emitting the 46
   methods as fields would put all 46 into `Object.keys` and read 48 where the engine reads 2.
3. **Those prototype members are defined `enumerable: true`**, through an explicit
   `Object.defineProperties(FakeEntity.prototype, …)` pass the generator emits. `class` syntax alone
   makes a method non-enumerable, which would leave `for-in` reaching only the two own properties
   where the engine reaches 62. That is a property of the syntax, not a limit on generated code.

Rules 1 and 2 keep `Object.keys` at 2; rule 3 brings `for-in` to 62 without disturbing it, because
prototype members are inherited rather than own. Enumerable prototype methods are unusual in
ordinary JavaScript, and tooling that walks an object with `for-in` expecting data will now meet
method names — but that is exactly what the engine does, and a pack iterating an entity with `for-in`
is the case a mismatch here would have bitten, so matching is the point rather than a side effect.

The costs are the generator's own. It is one program whose defects reproduce across every member it
emits, and it has to run before anything typechecks — both of which the decision's falsifiers name.

**What is committed and what is not.** The guard data and the per-class manifests are committed:
they are small, readable, and are what a reviewer needs when a version bump moves the surface, where
a manifest diff says "these four members appeared" instead of burying it in thousands of mechanical
lines. The generated classes are gitignored. A `prebuild` script runs the generator and is depended
on by `build` and by `typecheck`, and `prepare` runs it after `npm install`, so a fresh clone that
runs install is ready to typecheck. A contributor who opens the repository before the first install
sees unresolved imports in the hand-written behaviour that refers to generated classes; that is the
one rough edge, and running install clears it.

One generic construction serves all 68 entity component classes rather than 68 separate fakes: keyed
through `EntityComponentTypeMap`, the library pays a single internal cast while `getComponent` and
`addComponent` still hand the test author the exact component type and its exact members. That sits
under the generated breadth rather than against it — `surface-codegen` emits a declaration pair for
every faked class including each component class, and this one implementation stands behind all of
them at runtime.

A fake exposes no member the real API does not have. Everything the real surface cannot express is
an exported free function over the fakes [[r:only-real-members-free-functions]]:

| function | what it does |
|---|---|
| `createServer()` | a new bundle: world, system, registries |
| `createEntity(server, { typeId, id?, dimension?, location? })` | a fake entity registered with that world |
| `createPlayer(server, { typeId?, id?, name?, dimension?, location? })` | as above, a `Player` |
| `addComponent(entity, componentId, state?)` | attach a component to a live entity |
| `removeComponent(entity, componentId)` | detach one |
| `registerEffectBaseName(server, effectTypeId, baseName)` | the base name for a custom effect type, or an override for a shipped one |
| `invalidate(entity)` | put the reference into the engine's invalid state |
| `emit(signal, payload)` | deliver a payload to a signal's subscribers |
| `advanceTicks(server, count)` | run scheduled callbacks |
| `getOutput(target)` | the messages and titles sent to a player or the world |
| `getTriggeredEvents(entity)` | the `triggerEvent` calls made on an entity |
| `getHandlerErrors(server)` | the errors thrown by subscribers and absorbed at dispatch |

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
simplifies, the simplification is marked as the library's own, and *Coverage* below enumerates every
behaviour this design has ruled on as modelled, not modelled, or a divergence
[[r:coverage-is-enumerated]].

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
- `asSpawnedEntity(entity)` supplies the spawn frame: `nameTag` the empty string, `getRotation()`
  `{x: 0, y: 0}`, and `getVelocity()` `{x: 0, y: 0, z: 0}`
  [[f:fresh-entity-nametag-is-empty-string]]. It applies those values on every entity type. The
  zeros are the observed spawn frame of seven of the eight types sampled; `minecraft:xp_orb` is the
  exception, spawning with a randomized rotation and a nonzero randomized velocity, and the preset
  simplifies past it rather than modelling a per-type draw
  [[f:spawn-frame-kinematics-zero-except-xp-orb]]. That is a deliberate simplification and is
  recorded as one below.

Neither preset invents per-type vanilla data. A sheep's fourteen components and its 8/8/0/8 health
are per-type data no preset here supplies; a package built on this one may
[[f:fresh-health-component-values-populated]].

`world.getDimension(id)` with an id no dimension in that world answers to throws a plain `Error`
with the message ``Dimension '<id>' is invalid.`` — including on a world where the preset was never
applied [[f:get-dimension-unknown-id-error]].

## Entities

`createEntity` requires a `typeId` and accepts an optional `id`; when none is given the library
assigns one, because in the engine the spawner never chooses it
[[r:ids-auto-assigned-typeid-required]]. Its `dimension` option takes a `Dimension` — the object a
preset registered and `world.getDimension` returns — and not an id string, because a string would
have to resolve against a registry that may hold nothing and would fail late and confusingly where
the object cannot. `createPlayer` takes the same options plus `name`, which is worth supplying:
`Player.name` is declared a bare `string`, so on a player created without one every read of it
throws `UnsetValueError` under the ordinary rule for unsupplied values. Assigned ids are opaque decimal strings issued
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
Every other lookup the declarations carry — `dimension.getEntitiesAtBlockLocation`,
`dimension.getEntitiesFromRay`, `entity.getEntitiesFromViewDirection` and the rest — throws
`NotImplementedError` like any unmodelled member.

`EntityQueryOptions` is honoured in part. It extends `EntityFilter` for 24 fields in all, and six
filter: `type`, `tags` and `name`, and the exclusions `excludeTypes`, `excludeTags` and
`excludeNames`. A query naming only those returns the entities matching it. A query naming any of
the other eighteen — `EntityQueryOptions`' own positional fields `closest`, `farthest`, `location`,
`maxDistance`, `minDistance` and `volume`, and `EntityFilter`'s families, game-mode, level, rotation,
property and score fields with their exclusions — throws `NotImplementedError` naming the field it
could not honour. The throw is per field, not per call: a test learns which filter was dropped
instead of reading a result that quietly ignored it [[d:entity-lookups-honour-a-filter-subset]].

Within the six, `type` matches `typeId` and `name` matches `nameTag`; `tags` keeps an entity
carrying every tag listed and `excludeTags` drops one carrying any; each `exclude` field removes
what its counterpart would have kept, and fields given together intersect. The filter reads the
members the fake already exposes, so a `name` query against an entity whose `nameTag` was never
supplied throws `UnsetValueError` exactly as a direct read of it would. Honouring `tags` means the
tag members behave: `addTag`, `removeTag`, `hasTag` and `getTags` are real storage over a per-entity
set.

`entity.matches(options)` takes the same `EntityQueryOptions` and runs the same matching — the same
six fields, the same per-field throw on the rest. It is one mechanism reached two ways, not a second
set of semantics [[d:entity-lookups-honour-a-filter-subset]].

`dimension.spawnEntity(typeId, location)` behaves: it creates an entity of that type at exactly the
requested location, registers it with the world, fires `entitySpawn`, and returns it. The engine
adjusts some placements — a boat lands 0.2 off on x and z — and AI-driven mobs drift within a
couple of dozen ticks; the fake reproduces neither, and an entity stays exactly where it was put
until something moves it [[f:boat-spawn-offset-magnitude-constant]]
[[f:post-spawn-mob-motion-is-per-run-not-per-type]] [[d:placement-and-motion-are-literal]].

`entity.remove()` runs three steps in this order. First it raises the `entityRemove` before-event,
whose `removedEntity` is the entity itself, still registered and still valid — the event precedes
the removal, so a handler reading it gets a working reference. `EntityRemoveBeforeEvent` declares
`removedEntity` alone and no `cancel`, so there is no path where a handler stops the removal
half-way and no half-invalidated entity to specify. Second, it detaches the entity from the world
registry and invalidates every reference to it — one act, not two, so a builder cannot order them
against each other and a test can never observe a detached-but-valid entity or the reverse. Third it
raises the `entityRemove` after-event, whose payload carries exactly two readonly strings,
`removedEntityId` and `typeId`, and no entity reference — which is what makes it readable after the
entity is gone [[f:entity-remove-after-event-shape]]. It fires no death event, and nothing else
[[f:kill-and-remove-cascades]] [[d:remove-raises-only-entity-remove]].

That the reference goes invalid is the engine's behaviour, not a convenience: every invalidation
fact in the pool was observed on an entity that `remove()` had invalidated
[[f:invalidation-guard-list-complete]] [[f:invalidation-guard-fires-at-call-not-access]]. `invalidate()`
stays, because it reaches a transition `remove()` cannot: the mid-test unload of a reference a test
already holds, on an entity that is still in the world [[r:invalidation-is-modeled]]. The two are
distinct acts — `remove()` invalidates as a consequence of removing, `invalidate()` invalidates on
demand without removing.

`kill()` is the other case, and it splits, because the engine does. On an entity carrying **no
health component** the reference goes invalid at once: an arrow reads `isValid` false in the same
statement sequence as the call and stays false through at least tick+5, so the fake invalidates it
before raising `entityDie` — the handler meets the same dead reference an engine handler would,
since the engine's own delivery comes after the call returned [[f:kill-no-health-behaviour]]. On an
entity **with** one the reference stays valid and then goes stale on a fixed tick, which is equally
the engine's: inside the `entityDie` handler a killed mob's reference is still valid and its guarded
members answer, and it turns invalid exactly **21 ticks** after the call — a constant across all 72
observations, every mob type and every repeat [[f:corpse-invalidation-is-twenty-one-ticks]]. The
fake reproduces both halves: `kill()` schedules the invalidation, and the corpse goes stale when the
test advances to that tick, so `advanceTicks(server, 21)` after a `kill()` leaves the reference
invalid and anything short of it leaves it working. Invalidating on the call instead would be the
one wrong answer available: it would hand every death handler an already-dead reference where the
engine hands it a working one.

`entity.triggerEvent(eventName)` requires the `minecraft:`-prefixed form and throws
`InvalidArgumentError` with the message ``Invalid value passed to argument [0]. The event <name>
does not exist on <typeId>`` for a bare id — the one surface where the engine does not assume the
namespace, contradicting the API reference, which says it does
[[f:namespace-prefix-tolerance-is-per-surface]]. It returns
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
throws `UnsetValueError` naming the bound it could not read [[r:no-implicit-defaults]]
[[d:component-state-is-the-attribute-four]].

Two shorthands spell the common cases without writing the record out. A single number is
`currentValue`, with `effectiveMin` 0 and `effectiveMax` equal to it — `addComponent(entity,
'minecraft:health', 20)` is a full-health entity bounded 0..20 — and a two-element `[min, max]`
gives those bounds with `currentValue` at `max`. Both leave `defaultValue` unset, and both are
exactly the record they abbreviate. Neither breaches [[r:no-implicit-defaults]], which governs what
construction populates unasked: a caller who writes `20` has asked for all three numbers
[[d:component-state-is-the-attribute-four]].

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
`minecraft:player.saturation`, `minecraft:underwater_movement`
[[d:attribute-id-set-is-a-checked-literal-array]].

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
in that order. A killing hit is one leaving `currentValue` at or below `effectiveMin`, the boundary
value included: reaching the minimum exactly was fatal on both the damage and the component-write
path in every observed case, and every hit landing one point above it was survived
[[f:reaching-effective-minimum-is-fatal]] [[d:killing-hit-lands-at-or-below-minimum]]. On an entity
carrying no health component it changes nothing, fires nothing, returns `false`, and leaves the
entity valid [[f:damage-without-health-returns-false-silently]] [[d:damage-without-health-is-a-no-op]].
`amount` is not rounded — 0.5 damage takes exactly 0.5 health.

Its boolean reports **admission, not outcome**. The fake returns `true` when the entity carries a
health component and `amount` is greater than zero, and `false` otherwise — both facts settled
before the call acts on anything, and the value the engine was observed to return in every case
[[f:applydamage-boolean-reports-admission]]. A negative amount and zero each return `false` and
change nothing, so the boundary is at zero rather than at one. The declared contract calls the
boolean "whether the entity takes any damage", and on two reachable paths it is not: a cancelled
before-event, and the engine's damage-invulnerability window, each leave it `true` with no health
lost. Reproducing the admission reading is what [[r:modelled-behaviour-is-the-engines]] asks for,
and a test asserting on this boolean is asserting on admissibility whether or not it means to.

Of those two paths the fake reproduces one. A cancelled before-event returns `true` with nothing
lost, exactly as observed [[d:cancelled-actions-return-the-engines-value]]. The invulnerability
window is not modelled at all: the fake has no i-frames, so consecutive `applyDamage` calls each
take their full amount, where the engine would absorb the second. A test exercising repeated damage
therefore sees more health lost against the fake than the engine would take — the one place the
boolean and the health agree here and disagree there.

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
component it returns true, invalidates the reference, and fires only `entityDie` with cause
`selfDestruct` — the handler therefore reads an invalid entity, as it would in the engine
[[f:kill-no-health-behaviour]]. On an entity with one it leaves the reference valid, unlike
`remove()`, for the reason given under *Entities*.

## Effects

`entity.addEffect(effectType, duration, options?)` returns the resulting `Effect` on success, both
when adding and when updating — the declared signature governs over the pinned TSDoc's contrary
prose [[f:addeffect-returns-the-effect]]. With no amplifier option the effect carries amplifier 0
[[f:effect-amplifier-defaults-to-zero]].

Both numeric arguments are bounds-checked, and the fake checks them as the engine does: amplifier
must be `0…255` and duration `1…20000000`, and a value outside either throws
`ArgumentOutOfBoundsError` [[f:addeffect-argument-bounds-observed]]. Nothing is clamped into range —
an accepted value is stored exactly as passed, so a test never has to ask whether the number it
reads back was adjusted. Duration's floor is 1 rather than 0: a zero duration is refused, not
treated as an instantaneous effect. The pinned TSDoc contradicts itself here, saying the duration
"must be within the range [0, 20000000]" and then `Bounds: [1, 20000000]`; the observation agrees
with the second, and this document follows the observation and records the disagreement
[[r:engine-claims-are-sourced]].

The two rejections do not share a message, and the fake reproduces each. Amplifier names its
parameter after a colon, in the shape `setCurrentValue` also uses
[[f:set-current-value-bounds-observed]]:

```
Unsupported or out of bounds value passed to function argument [2]: amplifier, Value: 256, Argument bounds: [0, 255]
```

Duration ends the argument index with a period and names no parameter at all:

```
Unsupported or out of bounds value passed to function argument [1]. Value: 0, Argument bounds: [1, 20000000]
```

A non-integer argument is truncated toward zero and *then* bounds-checked, which the fake also
reproduces: amplifier `1.5` is accepted and reads back `1`, and duration `0.5` is rejected because
it truncates to `0` [[f:addeffect-coerces-non-integer-arguments]]. `NaN` and `Infinity` are refused
by the engine with a `TypeError` before either bound is consulted; the fake does not reproduce that
error's shape, and is listed below as diverging there.

Re-adding an effect already present replaces it when the new amplifier is higher, or when the
amplifier is equal and the new duration is longer or equal; a lower amplifier never replaces
whatever the duration, and an equal amplifier with a shorter duration does not
[[f:effect-replacement-rule-observed]]. The engine compares against the duration *remaining*, which
decays one per tick [[f:effect-replacement-compares-remaining-duration]]. The fake compares against
the duration the effect carries, and that duration never decays
[[d:effect-durations-do-not-decay]], so the comparison is written against the stored duration with
nothing to subtract. The two bases agree on the tick an effect was applied and part company after
that: against an effect applied with duration 400 and 150 ticks old, a re-add at the same amplifier
carrying 320 replaces in the engine, where 320 exceeds the 250 remaining, and is refused by the
fake, where 320 falls short of the 400 stored. That is a second consequence of not decaying, and it
is recorded as its own divergence below rather than folded into the decay row: a test whose
re-add straddles an advance is where it bites.

A fake effect's duration is the number applied and stays that number until the effect is removed:
advancing ticks does not decay it and never expires an effect
[[d:effect-durations-do-not-decay]]. `getEffect(typeId)` returns the effect or `undefined`;
`getEffects()` returns those present; `removeEffect(typeId)` removes one and returns whether it was
there.

`Effect.displayName` is a populated human-readable string in the engine — `"Speed II"` for speed at
amplifier 1 — and nothing pins it at build time: `@minecraft/vanilla-data` ships ids and no names,
and every one of the 38 types `EffectTypes.getAll()` returns answers `getName()` with its own
identifier rather than a display name, so the value has to come from the test
[[f:live-effect-fields-populated]] [[f:effect-display-name-amplifier-mapping]].

What the engine produces is regular but not a formula. At amplifier 0 the name is the bare base
name; at amplifiers 1 through 5 it is the base plus the Roman numeral of *amplifier + 1*; at
amplifier 6 it reverts to the bare base name and stays there for every amplifier up to 255. A type
therefore has six distinct names across the whole accepted range, and the reversion holds for all 37
vanilla types [[f:effect-display-name-amplifier-mapping]]. Two things follow for anything that
answers `displayName`. A computed `base + roman(amplifier + 1)` is right for five of the 256
accepted amplifiers and wrong for the rest. And the base string cannot be derived from the
identifier either: `minecraft:breath_of_the_nautilus` reads back with a leading space at every
amplifier, straight from the engine's localisation data, so only a verbatim stored string reproduces
it [[f:effect-display-name-carries-raw-whitespace]].

So the library ships the base names and computes the numeral. A vanilla effect's `displayName`
resolves with nothing registered and no test setup: the base string comes from a table of the 37
observed names, and the suffix from the mapping above — bare base at amplifier 0, base plus the
Roman numeral of *amplifier + 1* at 1 through 5, bare base again from 6 to 255. That reproduces the
engine across the whole accepted range, the amplifier-6 reversion included
[[d:display-names-resolve-from-a-shipped-table]].

**The table is transcribed observed output, not generated from identifiers.** Each base is the
string the engine returned, stored byte for byte. `minecraft:breath_of_the_nautilus` is
`" Breath of the Nautilus"` — the leading space is the engine's, it is not a typo, and it is what
makes the fake agree with the engine on that type [[f:effect-display-name-carries-raw-whitespace]].
Anything that normalises the table, or rebuilds it by title-casing identifiers, breaks that agreement
and several others with it. Shipping these 37 strings is not the per-type vanilla data
[[r:presets-are-opt-in]] sends to a package built on this one: that clause governs presets, the
populated starting points a caller opts into, while these are the baseline data a modelled member
needs to answer its own read at all.

A **custom effect type** has no shipped base. `registerEffectBaseName(server, effectTypeId, baseName)`
supplies one, and the same numeral mapping is computed over it, so a registered
`"Gravity Well"` reads `"Gravity Well III"` at amplifier 2 exactly as a vanilla type would. The route
is a free function because `addEffect` takes the engine's own `EntityEffectOptions`, which has no
display-name field, and `Effect` has no member to set one through
[[r:only-real-members-free-functions]]; it is keyed by type and held on the world, so a name is
readable inside the `effectAdd` event `addEffect` itself dispatches, where no effect instance exists
yet. A registration also overrides a shipped base for a vanilla type, which is how a test targeting
a locale other than the observed one supplies its own strings.

One vanilla-adjacent type falls on the custom side of that line. `EffectTypes.getAll()` returns 38
types where `@minecraft/vanilla-data` ships 37, the extra being `minecraft:empty`, which the
name sweep never applied and for which no base is shipped — so its `displayName` throws like any
unregistered type until a test registers one [[f:effect-display-name-amplifier-mapping]].

Reading `displayName` for a custom type nothing was registered for throws `UnsetValueError`. The
fake will not invent a base name from the identifier, because the engine's own strings are not
derivable from identifiers and a fabricated one would read plausibly while differing from the engine
[[r:fakes-never-fabricate]] [[d:custom-effect-display-name-is-supplied]]. A vanilla type never
reaches that path.

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
distinct subscribers run in subscription order [[f:subscription-semantics-observed]].

A handler that throws is isolated, as the engine isolates it: the throw does not reach the call that
caused the event, the other subscribers on that signal still run, and the rest of the cascade still
fires [[f:throwing-handler-is-isolated]]. The engine then discards the error, which a test cannot
afford — a handler failing silently is a test passing for the wrong reason — so the library records
each absorbed error and `getHandlerErrors(server)` returns them in the order they were thrown,
carrying the signal and the error itself. Isolation matches the engine; the record is the library's
own, and a test that asserts no handler failed reads it
[[d:handler-errors-are-isolated-and-recorded]].

After-events are dispatched synchronously, inside the call that caused them, before that call
returns [[r:synchronous-event-delivery]]. The engine defers them past the mutating call's return
and delivers them later in the same game tick [[f:after-events-deferred]]
[[f:after-event-deferral-subtick]]; a fake with no tick loop has nothing to defer within. The cost
is real and worth knowing while writing a test: code placed after a mutating call runs *after* its
handlers, not before. Handlers observe post-write state either way.

Before-events are dispatched synchronously ahead of the action they precede. Two of the three gate
it: `EntityHurtBeforeEvent` and `EffectAddBeforeEvent` each declare a writable `cancel: boolean`, and
a handler setting it stops the action — no state changes and no after-event fires
[[r:before-events-can-cancel]]. What the gated call then *returns* is not a single convention, and
the fake does not invent one. A cancelled `addEffect` returns `undefined`, but a cancelled
`applyDamage` returns `true` while dealing no damage — its boolean having been settled from the
requested amount before the handler ran. Those are the two of the three script-initiable,
cancellable, non-void calls that this cycle models, and `applyDamage` is the outlier across the
complete set [[f:cancelled-call-return-values-observed]]
[[d:cancelled-actions-return-the-engines-value]]. `entityRemove` is a
notification and cannot be cancelled: `EntityRemoveBeforeEvent` declares `removedEntity` alone and no
`cancel`, so the engine gives a handler no hold on the removal and the fake invents none — adding one
would be a fake-only member and would let a test pass on a cancellation the engine cannot perform
[[r:only-real-members-free-functions]] [[r:fakes-are-structurally-assignable]].

A before-event payload can carry mutable fields besides `cancel`, and writing one changes what the
action does. Six of the thirteen declared before-events do: `entityHurt.damage`,
`effectAdd.duration`, `entityHeal.healing`, `playerBreakBlock.itemStack`,
`playerGameModeChange.toGameMode`, and `weatherChange`'s `duration` and `newWeather`. On the two the
fake raises the write is honoured in both directions and reaches downstream — a handler lowering or
raising `entityHurt.damage` changes the health taken and the damage the `entityHurt` after-event
reports, and writing `effectAdd.duration` changes the duration the resulting effect carries
[[f:before-event-field-writes-take-effect]]. The other four fields are writable and nothing reads
them back, because the fake raises no healing, block-breaking, game-mode or weather action for a
write to reach [[d:before-event-field-writes-are-honoured]]. One consequence is worth stating: a
handler writing `damage` to `0` still leaves `applyDamage` returning `true`, because admission was
decided from the requested amount before the handler ran.

## Scheduling

`system` records; it never runs anything on its own. `run`, `runTimeout` and `runInterval` store a
callback against a tick, `clearRun` discards one by handle, and nothing executes until the test
calls `advanceTicks(server, count)`. The library starts no timer and awaits nothing
[[r:scheduling-is-test-advanced]]. `system.currentTick` starts at 0 and moves only under
`advanceTicks` [[d:current-tick-starts-at-zero]]. `advanceTicks` steps one tick at a time,
incrementing `currentTick` and then running every callback due at that tick in the order it was
scheduled, before it steps again; a `run` callback is due on the next tick, `runTimeout(cb, n)` on
the nth tick after scheduling, and `runInterval(cb, n)` every nth tick until cleared. An advance
runs every intervening tick's callbacks, not only those due on the tick it lands on: from tick 0,
`advanceTicks(server, 10)` fires a `runInterval(cb, 2)` five times and a `runTimeout(cb, 3)` once,
during the advance rather than at its end [[d:tick-advance-semantics]]. `runJob`/`clearJob` are
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
passed, and `options` is whatever the member carried [[d:output-log-record-shape]].

## Invalidation and error shapes

`invalidate(entity)` puts a reference into the state the real API leaves a stale reference in, and
may be called at any point in a test — including on a reference a handler is holding mid-event
[[r:invalidation-is-modeled]]. It is not the only route to that state: `remove()` invalidates too,
as part of removing. What `invalidate()` reaches that `remove()` cannot is the entity that goes
stale *without* leaving the world — the mid-test unload — which is the transition a test otherwise
has no way to produce. A killed mob's corpse reaches it on its own once the test advances 21 ticks,
so `invalidate()` is the shortcut there rather than the only route.

The guard list is a per-member table taken from the reflective sweep of the engine's own `Entity`
prototype, not from the declarations' `@throws` annotations, which under-report it: `nameTag` and
`isSneaking` carry no annotation and throw anyway [[f:invalidation-guard-list-complete]]
[[d:guard-list-comes-from-the-observation]]. That table is committed data and it is an *input to
generation*: the generator reads it and writes the right prologue into each member, so the guard is
compiled into all 1010 of them rather than applied by anything at runtime. Changing what a member
does on an invalid reference is an edit to the data and a rebuild, not a change to library code
[[d:fakes-are-generated-classes-with-guard-prologues]]. On an invalidated entity exactly four properties stay
readable — `id`, `isValid` (false), `typeId`, and `scoreboardIdentity` (`undefined`) — and every
other member throws `InvalidEntityError`. That covers the whole member surface as observed, not a
generalization past it: the sweep reached 12 throwing properties and 19 zero-argument methods, and
the remaining 27 methods, called with correct arguments on a removed entity, throw
`InvalidEntityError` too — all 16 properties and all 46 methods accounted for
[[f:invalidation-guard-covers-argument-taking-methods]]. The engine checks argument count before its
validity guard, so a wrong-arity call on a removed entity raises a `TypeError` first
[[f:arity-checked-before-validity-guard]], and the fake reproduces that ordering: its arity check
runs ahead of the guard prologue, so a call with too few arguments reports arity rather than
invalidity [[d:generated-members-check-arity-before-the-guard]].

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

### What a read that finds nothing does

Five rules govern a call or read with no value behind it, and they apply in this order. The order is the
whole of it: a member matching an earlier rule never reaches a later one.

1. **Too few arguments throw `TypeError` first of all**, ahead of the guard, on a valid and an
   invalidated reference alike. Extra arguments are ignored rather than rejected
   [[d:generated-members-check-arity-before-the-guard]].
2. **The validity guard fires next.** On an invalidated reference every guarded member throws
   `InvalidEntityError` — or the plain `Error` its owner's table above gives — whatever the member
   would otherwise have done [[d:guard-list-comes-from-the-observation]].
3. **An out-of-scope member throws `NotImplementedError`.** A member this cycle does not model
   never answers a read, however its declaration is typed
   [[d:out-of-scope-members-throw-not-implemented]].
4. **A modelled member reading an absence the engine can exhibit returns `undefined`** — an
   unattached component, an unset dynamic property, an unknown objective or participant
   [[d:absence-reads-as-undefined]].
5. **A modelled member reading a value the test never supplied throws `UnsetValueError`**, because
   the engine could not have lacked it [[r:fakes-never-fabricate]].

Rules 4 and 5 are told apart by the declaration's own type: a member declared `T | undefined` has an
absence the engine itself can present, so the fake presents it; a member declared bare `T` has none,
so an unsupplied read throws rather than inventing one. `Effect.displayName` is declared `string`,
which is why a custom effect type with no registered base name throws rather than reading
`undefined` [[d:custom-effect-display-name-is-supplied]] — rule 5 applied, not an exception to it.
A vanilla type never reaches rule 5 at all: its name resolves from the shipped table, so there is no
unsupplied value to read [[d:display-names-resolve-from-a-shipped-table]]. Rule 5 governs what a
modelled member does when a value it needs was never supplied, and shipping the value is one way to
make sure that never happens.

Rules 2 and 3 are what rule 4 must not swallow. A member that is both out of scope and declared
`T | undefined` — and the declarations carry many — takes rule 3 and throws. Returning `undefined`
there would be the library asserting the engine had nothing, on a member it never modelled
[[r:fakes-never-fabricate]].

## Coverage

Every engine behaviour this design has ruled on is listed below as **modelled** (the fake reproduces
the engine), **not modelled** (the members are declared and throw `NotImplementedError`, or the
behaviour has no fake counterpart), or a **divergence** (the fake behaves, and differs from the
engine on purpose) [[r:coverage-is-enumerated]]. Each divergence row carries the difference itself,
so this table is the one place a reader learns where a passing test would not have passed against
the engine. The table states what the design ruled on and nothing more: a behaviour outside it has
not been considered, which is not the same as a promise about it.

| engine behaviour | coverage | what the library does |
|---|---|---|
| dimension registration and `world.getDimension` resolution | modelled | via `withVanillaDimensions`; ids, aliases, height ranges and localization keys as observed |
| `getDimension` with an unknown id | modelled | plain `Error`, the message quoted above |
| the world's resting state — empty collections, no players, no objectives | modelled | |
| a freshly constructed entity's components | divergence | construction populates nothing; in the engine a fresh entity always arrives carrying at least one component |
| the spawn frame of `minecraft:xp_orb` | divergence | `asSpawnedEntity` applies zero rotation and velocity to every type; the engine spawns an `xp_orb` with a randomized rotation and a nonzero randomized velocity, drawn afresh per spawn |
| per-type vanilla data — a sheep's fourteen components, its 8/8/0/8 health | not modelled | no preset supplies it; a package built on this one may |
| entity id assignment | divergence | ids are decimal strings issued from `1` per bundle; the engine's are negative integers. `Entity.id` is documented opaque, so nothing may read the spelling either way |
| `world.getEntity`, `getAllPlayers`, `getPlayers`, `dimension.getEntities`, `dimension.getPlayers` | modelled | unfiltered, in creation order |
| `EntityQueryOptions` filtering, on the lookups and on `entity.matches` | divergence | six of the twenty-four fields filter — `type`, `tags`, `name` and their `exclude` counterparts; each of the other eighteen throws `NotImplementedError` naming itself, where the engine honours them all |
| entity tags — `addTag`, `removeTag`, `hasTag`, `getTags` | modelled | a per-entity set, which the `tags` and `excludeTags` filters read |
| the other entity lookups — `getEntitiesAtBlockLocation`, `getEntitiesFromRay`, `getEntitiesFromViewDirection` and the rest | not modelled | |
| `dimension.spawnEntity` placement | divergence | the entity lands exactly where asked; the engine adjusts some placements — a boat by 0.2 on x and z |
| post-spawn motion | divergence | an entity never moves on its own; AI-driven mobs drift within a couple of dozen ticks |
| `entity.remove()` | modelled | raises the `entityRemove` before-event, then detaches from the registry and invalidates the reference as one act, then raises the after-event — the engine's own cascade, which raises no death event either |
| `entity.triggerEvent` | divergence | validates the prefixed id and records the call, changing no state; in the engine the event reshapes the entity |
| `entity.kill()` | modelled | the full cascade, on an entity with and without a health component |
| invalidation of a mob's corpse after `kill()` | modelled | the corpse stays valid — inside the `entityDie` handler and after it — and turns invalid 21 ticks later, the constant the engine was measured at, so it goes stale when the test advances that far. Distinct from `remove()`, which invalidates at once |
| invalidation after `kill()` on an entity with no health component | modelled | the reference goes invalid before `entityDie` is raised, as the engine's does within the call |
| the seven attribute-shaped components | modelled | all four values, the bounds check, and the health-write cascade |
| the other 61 entity components | not modelled | attachable, carrying `typeId`, `isValid` and `entity`; every other member throws |
| runtime component attachment and detachment | not modelled | the engine reaches it through data-driven paths; a test uses the `addComponent` / `removeComponent` free functions |
| bare and prefixed id tolerance | modelled | per-surface, as observed — `triggerEvent` rejects the bare form and the others accept it |
| `setCurrentValue` bounds check | modelled | including the message and both inclusive bounds |
| `applyDamage` cascade, order and payloads | modelled | including the unclamped negative health an overkill leaves, and unrounded fractional amounts |
| `applyDamage`'s boolean | modelled | reports admission — damageable entity, positive amount — not whether damage landed, as observed |
| `applyDamage` cause defaults and the `damagingEntity` carry-through | modelled | |
| the killing-hit boundary | modelled | reaching `effectiveMin` exactly is fatal on both the damage and the component-write path |
| `applyDamage` on an entity with no health component | modelled | returns `false`, fires nothing, leaves the entity valid |
| the damage-invulnerability window | divergence | the fake has no i-frames, so consecutive `applyDamage` calls each take their full amount where the engine absorbs the second — a test driving repeated damage sees more health lost against the fake than the engine would take |
| the engine's velocity-dependent projectile damage adjustment | divergence | the projectile options form applies the amount requested |
| `addEffect` / `getEffect` / `getEffects` / `removeEffect` and the amplifier-first replacement rule | modelled | |
| `addEffect`'s argument bounds | modelled | amplifier `0…255`, duration `1…20000000`, `ArgumentOutOfBoundsError` outside either, nothing clamped, both message shapes reproduced |
| `addEffect`'s non-integer arguments | modelled | truncated toward zero, then bounds-checked — so duration `0.5` is refused |
| `addEffect` on `NaN` or `Infinity` | divergence | the engine refuses these with a `TypeError` ahead of the bounds check; the fake does not reproduce that error's shape |
| the display name's amplifier mapping | modelled | bare base at amplifier 0, base plus the Roman numeral of amplifier + 1 at 1–5, bare base again from 6 to 255 — reproduced for all 37 vanilla types across the whole accepted amplifier range |
| effect duration decay and expiry | divergence | a duration reads back the value applied and never decays; the engine decays it one per tick and expires the effect |
| the duration the replacement rule compares against | divergence | the rule reads the duration the effect carries, the engine the duration remaining; the two agree on the tick an effect was applied and part company after it, so a re-add straddling an advance can be refused where the engine would have replaced |
| `Effect.displayName` for the 37 vanilla types | modelled | resolves with no test setup, from verbatim shipped base names and the computed numeral |
| `Effect.displayName` in a locale other than the observed one | divergence | the shipped bases are the strings one server returned, and the API documents only a "player-friendly name" with no locale contract; until a second locale is observed the table is that locale's, and a test needing another registers its own bases |
| `Effect.displayName` for a custom effect type | divergence | no base is shipped, so an unregistered custom type throws `UnsetValueError` where the engine would answer with whatever its own data holds |
| signal existence, `subscribe` / `unsubscribe`, reference dedupe and subscription order | modelled | |
| after-event dispatch timing | divergence | synchronous, inside the causing call; the engine defers past that call's return to later in the same tick |
| engine-raised signals outside the five after-events and three before-events the fakes raise | not modelled | no fake behaviour raises them; a test drives one with `emit` |
| before-event cancellation | modelled | on the two signals whose payload declares `cancel` |
| what a cancelled call returns | modelled | `addEffect` `undefined`, `applyDamage` `true` — the engine's own per-surface values, quirk included |
| before-event mutable payload fields | divergence | writes to `entityHurt.damage` and `effectAdd.duration` are honoured; the other four declared mutable fields are writable but unread, since the fake raises no action that consumes them |
| a subscriber that throws | divergence | isolated as the engine isolates it, but the absorbed error is recorded for `getHandlerErrors` where the engine discards it |
| the tick loop | divergence | nothing runs on its own; `currentTick` starts at 0 and moves only under `advanceTicks` |
| `run` / `runTimeout` / `runInterval` / `clearRun` scheduling | modelled | every intervening tick's callbacks run during an advance |
| `runJob` / `clearJob` | not modelled | |
| dynamic properties on the world and on entities | modelled | real storage over the declared value types |
| `getDynamicPropertyTotalByteCount` | not modelled | no source pins the engine's accounting |
| the scoreboard — objectives, scores, participants, display slots | modelled | |
| `sendMessage` and `onScreenDisplay` output | modelled | captured to a per-target log rather than displayed, and read back with `getOutput` |
| the invalidation guard on entities, attribute components and effects | modelled | the observed guard data, error class by error class, compiled into each member's prologue ahead of its body |
| reading — not calling — a guarded method on an invalidated reference | modelled | the read returns a function and the throw lands on the call, and a reference captured while valid still throws when it runs, as observed |
| too few arguments checked ahead of the validity guard | modelled | each member's arity check runs before its guard prologue, so a call with too few arguments on an invalidated entity reports `TypeError` rather than `InvalidEntityError`, as the engine does |
| extra arguments to a member | modelled | *with a caveat.* The fake ignores them. The engine has never been observed receiving too many — every arity observation is of too few — so no difference is claimed; if the engine rejects them, the fake is the more permissive of the two |
| `in` on a declared but unmodelled member | modelled | the member is really on the prototype, so `'teleport' in entity` is `true` and an unknown name `false`, as the engine answers, valid or invalidated alike |
| `Object.keys`, spread and `JSON.stringify` over an entity | modelled | `typeId` and `id` are own data properties and every other member sits on the prototype, so all three read the engine's two own enumerable properties |
| `for-in` over an entity | modelled | the generator defines the prototype members `enumerable: true`, so `for-in` walks the engine's 62 while `Object.keys` still reads 2 |
| items, blocks, containers, the player client surface, custom commands, the startup registries, and the eight registry classes | not modelled | declared in full and throwing |

The divergence rows are not spec-only. Each one describes a way a test can pass against the fake and
fail against the engine, so this table and its descriptions carry through into the package's own
user-facing documentation, where someone reading it has the library in hand and the spec nowhere
near [[r:coverage-is-enumerated]]. Keeping the two in step is `package-and-exports`'s to hold,
alongside the entry point it already owns.

This table is the part of the document most likely to rot, because nothing mechanical ties a row to
the prose it summarises: a behaviour can be respecified above and leave a stale row here, and the
row is what ships to users. Two rules keep it honest, and they are the builder's to follow rather
than the checker's to enforce. A change to any modelled behaviour is not complete until its row
says the same thing as the prose — the row is part of the change, not a follow-up. And every row
carrying `divergence` names the evidence for the difference, so a row that no longer has any is a
row to delete rather than to reword: that is how the `remove()` and guard-at-access rows were caught
once the probes closed them.

## Components

```yaml
components:
  - id: error-model
    responsibility: >-
      the exported error classes — InvalidEntityError with id and type, ArgumentOutOfBoundsError,
      InvalidArgumentError, NotImplementedError, UnsetValueError — and the plain-Error message
      builders for the failed-property and failed-call shapes
    excludes: deciding which member raises which error

  - id: guard-data
    responsibility: >-
      the per-class guard tables the generator bakes into each member's prologue — Entity's
      four-name readable allowlist, the eleven-row attribute-component table, the five-row effect
      table — committed as readable data
    excludes: >-
      applying the guard, which the generator writes into every member rather than any component
      applying at runtime
    after: [error-model]

  - id: surface-codegen
    responsibility: >-
      the Node generator that reads the pinned index.d.ts and the guard data and emits a class per
      faked type implementing its declared interface, each member an arity check over a guard
      prologue over a delegation or a NotImplementedError throw, the per-member arity manifest it
      derives from the declared signatures, laid out by the emission rule — own data
      properties for typeId and id, everything else on the prototype, defined enumerable; the
      committed per-class manifests; and the prebuild wiring that makes a fresh clone typecheck
    excludes: any behaving member, and the guard data itself
    after: [error-model, guard-data]

  - id: fake-runtime
    responsibility: >-
      the per-instance state record every behaviour reads and writes, the validity flag on it and
      the invalidate free function that sets it, the naming convention a generated member body
      delegates through, and the id types derived from EntityComponentTypeMap
    excludes: any behaving member
    after: [error-model, surface-codegen]

  - id: event-bus
    responsibility: >-
      the signal objects on world.afterEvents, world.beforeEvents and system, subscribe/unsubscribe
      with reference dedupe and subscription order, synchronous dispatch, handler-throw isolation
      with the error record behind getHandlerErrors, before-event cancellation and mutable payload
      fields on the signals whose payload declares them, and the emit free function
    excludes: which fake member raises which signal
    after: [fake-runtime]

  - id: world-and-dimensions
    responsibility: >-
      createServer, the FakeServer bundle mirroring the module's exported names with the eight
      registry classes, the world instance carrying the event-bus signals, dimension registration
      and getDimension resolution including the invalid-id error, and the entity registry behind
      world.getEntity, world.getAllPlayers, world.getPlayers, dimension.getEntities and
      dimension.getPlayers
    excludes: dimension contents beyond the entity registry, and query filtering over it
    after: [fake-runtime, event-bus]

  - id: entity-model
    responsibility: >-
      createEntity and createPlayer, id assignment, typeId and per-entity fields with
      UnsetValueError on unsupplied reads, the per-entity tag set, spawnEntity, triggerEvent
      recording, remove with its detach-and-invalidate step, kill's health-less branch, and the
      EntityQueryOptions matcher — the honoured six, the per-field throw on the rest — layered onto
      entity.matches and onto the lookups' options argument
    excludes: >-
      component and effect state, and therefore kill's health-bearing cascade, which component-model
      owns beside its twin applyDamage
    after: [world-and-dimensions, event-bus]

  - id: component-model
    responsibility: >-
      addComponent/removeComponent including the attribute state argument, getComponent id
      normalization, the enumerated seven attribute components with their bounds checks, and every
      cascade that writes health — the component writes, applyDamage, and kill's health-bearing
      branch
    excludes: effects
    after: [entity-model]

  - id: effect-model
    responsibility: >-
      addEffect/getEffect/getEffects/removeEffect, the amplifier-first replacement rule, and the
      shipped table of verbatim base names with the computed numeral, and the registerEffectBaseName
      free function behind custom types and overrides
    after: [entity-model]

  - id: system-scheduler
    responsibility: >-
      system's run/runTimeout/runInterval/clearRun recording, currentTick, and the advanceTicks free
      function that runs due callbacks
    after: [fake-runtime, world-and-dimensions]

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
      declaration emit, the single public entry point re-exporting every fake type and every free
      function, and the user-facing documentation carrying the coverage table and a description of
      every divergence in it, kept in step with the spec's own table as a condition of any
      behaviour change rather than as a later sweep
    excludes: the behaviour behind anything it re-exports, and which coverage a behaviour has
    after:
      [
        event-bus,
        world-and-dimensions,
        entity-model,
        component-model,
        effect-model,
        system-scheduler,
        persisted-state,
        output-capture,
        presets,
      ]
```
