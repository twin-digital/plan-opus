# @twin-digital/minecraft-test-lib

## Summary

This design specifies a test double library for Minecraft Bedrock behavior packs: in-memory fakes
of the `@minecraft/server` object model — worlds, dimensions, entities, components, effects, and
event signals — that hold real state and mutate it, so a test asserts on an entity's resulting
health rather than on which method was called. Its product is a TypeScript package exporting fake
classes that are assignable where the real declared types are expected, plus a control plane of
free functions for everything the real API cannot express: creating a world, spawning an entity,
invalidating a reference, and reshaping an entity's components. It answers the pack author's
problem that the engine package ships declarations with no runtime, leaving every suite to
hand-roll doubles that record calls, smooth over the API's quirks, and cannot express an absent
component or an entity that unloaded mid-event.

One constraint shapes everything below: the fake has no engine and no tick. Every behaviour it
reproduces is transcribed from a recorded observation of one pinned engine version, so where the
engine's behaviour is per-tick or is per-type vanilla data, the library states the gap rather than
inventing a plausible value.

## Open questions

```yaml
questions:
  - id: tickless-effect-duration
    question: >-
      an effect's duration decays with the tick in the engine, and a tickless fake's duration
      stays at whatever the test set; which requirement documents that departure, as
      synchronous-event-delivery documents the event one?
    closes: requirement
    gates: [no-clock]
  - id: projectile-damage-adjustment
    question: >-
      the engine adjusts projectile-path damage by an amount neither the declarations nor the
      API reference states, observed once and not reproducible from one sample, so the fake
      applies the requested damage; which requirement documents that departure?
    closes: requirement
    gates: [one-mutation-pipeline-for-health]
  - id: entity-id-form-departure
    question: >-
      the engine issues entity ids as negative integers and the fake issues decimal counter
      strings; the API reference documents `Entity.id` as opaque and tells a reader not to
      parse or interpret it, so the form may be a quirk no fake owes reproduction — does that
      reading exempt the id from the observed-behaviour rule, or does a requirement document
      the departure?
    closes: requirement
    gates: [sequential-opaque-entity-ids]
  - id: per-type-spawn-quirk-departure
    question: >-
      the engine's spawn frame carries per-type placement offsets and rotation settles the fake
      does not apply — boat, arrow and xp_orb among the eight types probed, with the set over
      all entity types unknown; which requirement documents that departure, given a decision
      currently carries it?
    closes: requirement
    gates: [per-type-spawn-quirks-not-modeled]
  - id: remove-side-effect-departure
    question: >-
      the engine's `remove()` was followed by five after-event deliveries the fake emits none
      of, four of them data-driven and none of the five causally pinned by the run; which
      requirement documents that departure, and should `entityRemove` — the one the fake could
      populate — be emitted rather than carried as a departure?
    closes: requirement
  - id: corpse-despawn-departure
    question: >-
      the engine's killed corpse turns invalid by roughly 27 ticks and a tickless fake's stays
      valid until the control plane invalidates it; which requirement documents that departure?
    closes: requirement
    gates: [corpse-stays-valid-except-on-the-no-health-path]
```

## What the library substitutes, and how it types itself

The library hands a test fake objects to pass into the code under test, and does nothing to the
module system [[r:object-substitution-not-module-mocking]]. That is the only substitution
available: `@minecraft/server` publishes `index.d.ts` and nothing importable, so there is neither a
runtime module to intercept nor a real class to instantiate or subclass
[[f:server-package-ships-types-only]]. Every fake is therefore an ordinary class this package
declares and this package constructs.

Those classes are assignable where the real types are expected because the declared classes carry
no private instance members and no brand fields — a `private constructor()` blocks construction
without branding the instance type — so a value with the full public shape satisfies the class type
structurally [[f:server-classes-are-structurally-assignable]]. Each fake takes that guarantee and
makes the compiler enforce it, declaring the real type in an `implements` clause and filling every
member outside the built surface with a throwing stub
[[d:structural-conformance-by-implements-clause]] [[r:structural-full-shape-fakes]]. The clause is
what keeps the shape complete without a codegen step: a missing member is a compile error in this
package, not a `undefined` read in a consumer's test.

Because the clause forces a body onto every member, the built surface has to be settled member by
member, not class by class: a builder needs to know which side of the throw each one falls on
[[d:built-surface-v1]]. On `World` it is `getDimension`, `getAllPlayers`, `scoreboard`,
`gameRules`, `isHardcore`, `seed`, `afterEvents`, and `beforeEvents` — the members a world with no
one connected was observed to answer [[f:world-resting-state-observed]]. On `Dimension` it is `id`,
`heightRange`, `localizationKey`, `spawnEntity`, and `getEntities`; every block-shaped member is a
stub, since blocks are outside the surface entirely. On `Entity` and `Player` it is the state the
fakes hold and nothing more — identity, location and dimension, rotation and velocity, the tag
methods, `getComponent`/`getComponents`/`hasComponent`, the four effect methods, `applyDamage`,
`kill`, `remove`, and `Player.name`. `triggerEvent` rejects a bare id as the engine does and then
throws not-implemented, because what a triggered event does is a data-driven definition the fake
has none of. Teleportation and impulse, `runCommand`, and the view-direction and AABB queries are
stubs: each needs world geometry or a command interpreter behind it, and a fake that answered them
would be inventing. The dynamic-property surface is a stub for the plainer reason that no
requirement names a consumer needing it.

The event surface divides the same way. All 55 after-event signals and all 13 before-event signals
[[f:world-resting-state-observed]] exist as objects a test can subscribe to, and every signal's
payload class — `EntityHurtAfterEvent` and its siblings, the objects a handler actually reads — is
complete rather than stubbed. Only an after-event signal a modelled mutation emits ever delivers,
which is the damage, health, and death cascades below; every other after-event signal, and all 13
before-event signals, stay silent rather than throwing, since a pack subscribing to a signal it
never triggers is doing nothing wrong, and the fake models no before-phase to cancel from.

Every entity component class the type map names [[f:component-ids-are-derivable-from-types]] can be
attached to an entity and answer its identity members, so the control plane can shape any component
set a test needs; only the attribute-shaped subset behaves beyond that, and a non-attribute
component's other members throw not-implemented.

What that surface leaves out follows from the same reading: every behaviour the requirements name
is a world's, an entity's, a component's, an effect's, or an event's
[[r:fakes-behave-not-record]] [[r:invalidation-is-modeled]] [[r:control-plane-component-mutation]],
and every engine observation held here was taken on those objects, so v1 builds the classes those
behaviours run through and stubs the other 400-odd the package declares
[[f:server-classes-are-structurally-assignable]]. What is left out, and why:

| omitted | what it is | why it stays out of v1 |
|---|---|---|
| `ItemStack`, `Container`, `ContainerSlot`, the item component classes | item stacks and the inventories holding them | no requirement names a consumer needing it; the decision's own falsifier makes a consumer suite passing an `ItemStack` the trigger to reopen |
| `Block`, `BlockPermutation`, `BlockType` and `BlockStates`, `BlockVolume` and its iterators, the block component classes | the voxel layer and everything addressed by block position | answering any of it needs world geometry the fake has none of, so every answer would be invented [[r:fakes-never-fabricate]] |
| `System` — `run`, `runTimeout`, `runInterval`, `currentTick` | tick scheduling and the tick counter | there is no tick to schedule against [[d:no-clock]] |
| `EntityTypes`, `EffectTypes`, `ItemTypes`, `BlockTypes`, `Potions` and the other static registries | the engine's catalogues of what exists | their contents are per-type vanilla data, which belongs to a package built on this one [[r:presets-are-opt-in]] |
| `StartupEvent`, `ShutdownEvent`, and the custom command and custom component registries | the startup phase where a pack registers its own commands and components | it is reached through the module's own lifecycle, not through objects a test passes in [[r:object-substitution-not-module-mocking]] |
| `Camera`, `ScreenDisplay`, `PlayerAimAssist`, `InputInfo`, `LocatorBar` | what a connected client is shown and how it drives its player | no requirement names a consumer needing it, and there is no client behind the fake to answer from |
| `Structure` and `StructureManager`, the loot table classes, `MolangVariableMap`, `Seat`, `FluidContainer`, and the remaining declared classes | world authoring, loot generation, and the long tail | no requirement names a consumer needing it |
| `Scoreboard`, `ScoreboardObjective`, `ScoreboardIdentity`, `GameRules` | the objects a world's `scoreboard` and `gameRules` answer with | present because the world graph has to be callable [[f:world-resting-state-observed]], with their own members stubbed: nothing modelled reads or writes them |

Id types are derived from the package's own declarations rather than transcribed
[[f:component-ids-are-derivable-from-types]] [[d:id-unions-derived-from-declarations]]. The values
behind those types are a different matter:
the enum members have types but no usable values at runtime [[f:server-package-ships-types-only]],
so any runtime constant the library needs is its own string literal, and a consumer wanting real
constants uses `@minecraft/vanilla-data`, which does ship runtime JavaScript and whose values are
the prefixed form [[f:vanilla-data-provides-prefixed-id-constants]]. The derived unions and the
hand-written stub lists are the two places a version bump surfaces, which is why the pin is a
declared peer range and not an assumption [[r:target-server-version]]. Nothing is depended on
beyond it [[r:no-test-framework-dependency]], so the fakes carry no recording machinery of their
own: a caller who wants call records wraps them in whatever their runner provides.

## Failing loudly

Engine errors are reproduced by class and message, and the library declares those classes itself,
since the real ones are not importable [[f:server-package-ships-types-only]]
[[d:library-owned-error-classes]]. `InvalidEntityError` carries the readonly `id` and `type` of the
entity that became invalid, matching the declared shape [[f:invalid-entity-error-shape]].
`ArgumentOutOfBoundsError` is thrown by `setCurrentValue` outside the effective bounds, with the
message naming the value and the bounds, while values exactly at either bound are accepted
[[f:set-current-value-bounds-observed]]. Where the engine throws a plain `Error` the fake throws a
plain `Error` with the observed text: `world.getDimension` on an id naming no dimension
[[f:get-dimension-unknown-id-error]], and the attribute value getters and the three resets on an
invalid owner [[f:attribute-guard-classes-observed]].

## Construction and presets

Construction populating
nothing the caller did not ask for [[r:no-implicit-defaults]] is a deliberate
departure from what the engine rests at — a fresh engine entity always carries components, with a
type-dependent set and no common baseline [[f:fresh-entity-is-never-component-empty]], and a fresh
health component answers all four of its values before any write
[[f:fresh-health-component-values-populated]] — because reproducing either would mean shipping
per-type vanilla data.

Two things are always present regardless. The object graph the API needs in order to be callable —
the event signal objects, the scoreboard, the game rules — is constructed with the world, since a
world whose collections are empty is a real resting state while a world missing those objects is
not callable at all [[f:world-resting-state-observed]] [[r:no-implicit-defaults]]. And a spawned
entity starts at zero rotation and zero velocity for every type
[[r:zero-kinematics-at-spawn]] — the value seven of the eight probed types read on their spawn
frame, bit-identical across runs, with `minecraft:xp_orb` the outlier the fake does not reproduce
[[f:spawn-frame-kinematics-zero-except-xp-orb]]. `nameTag` starts as the empty string, which is
uniform across every type sampled and so needs no per-type data
[[f:fresh-entity-nametag-is-empty-string]]; the other spawn-frame fields the engine populates —
`localizationKey`, a real `location` [[f:fresh-entity-spawn-frame-field-values]] — are the caller's
to supply, and a read of one the test never set throws rather than answering an invented value
[[r:fakes-never-fabricate]].

A populated starting point is a named preset the caller invokes, never constructor behaviour, and a
preset here supplies only values a fact pins [[r:presets-are-opt-in]]. Exactly one clears that bar:
the three vanilla dimensions, whose ids resolve from either spelling, whose height ranges are
−64..320, 0..128, and 0..256, and whose localization keys are recorded
[[f:vanilla-dimensions-resolve-with-populated-fields]] [[d:vanilla-dimensions-is-the-only-preset]].
The rest of the engine's resting state is per-type vanilla data and belongs to a package built on
this one. So does the engine's per-type spawn-frame behaviour: the fake places an entity exactly
where asked and models neither the boat's 0.2 placement offset — constant in magnitude, but with a
sign rule the observations do not establish, so reproducing it would mean guessing which way to
push [[f:boat-spawn-offset-magnitude-constant]] — nor the arrow's one-time rotation settle to −72
[[f:resting-arrow-turns-once-and-stays-valid]], nor post-spawn AI drift, which is drawn per run
rather than fixed per type and so is not deterministically reproducible at all
[[f:post-spawn-mob-motion-is-per-run-not-per-type]] [[d:per-type-spawn-quirks-not-modeled]]. Those
three are what eight sampled types turned up, against the 128 entity types
`@minecraft/vanilla-data` names [[f:vanilla-data-provides-prefixed-id-constants]]: a per-type table
built from the sample would be a table of the types that happened to be probed, so which types
carry a quirk is bounded only by what was probed.

## Identity and ids

The id `spawnFake` assigns unless the caller overrides it [[r:ids-auto-assigned-typeid-required]]
comes from a counter on the world — the only place a monotonic sequence can live in a library with
no module state [[r:instance-scoped-world]] — as a decimal string, never reissued, matching the
engine's observed non-reissue after removal
[[f:entity-ids-not-reused]]; the engine's negative-integer form is not reproduced, so a test that
depends on the shape of an id is depending on something the engine does not promise
[[d:sequential-opaque-entity-ids]].

Every id-taking input is normalized on entry and stored and reported in the canonical
`minecraft:`-prefixed form [[r:canonical-prefixed-storage]] [[d:ids-normalized-at-entry]].
Tolerance of the bare form is per-surface rather than universal:
components, effect types, and entity types accept either, while `triggerEvent`
rejects a bare event id [[f:namespace-prefix-is-optional]], and the fake rejects it too rather than
being more permissive than what it stands in for [[r:fakes-match-observed-engine-behaviour]].

## Validity

Validity is
per object and not per entity: a component or effect reads invalid when its own flag is
set or its owner's is, which is what lets one entity invalidation reach everything derived from it
while a removed effect still reads invalid under a valid owner
[[f:effect-members-throw-plain-error]] [[d:invalidation-propagates-to-derived-objects]].

What each member does in that state comes from a table transcribed from the probe runs, not from
the declarations' `@throws` annotations, which under-report the guard: `nameTag` and `isSneaking`
throw despite carrying no annotation [[f:invalidation-guard-list-complete]]. The table is
non-uniform in three ways the fake reproduces [[r:fakes-match-observed-engine-behaviour]]. Exactly
four `Entity` properties stay readable after removal — `id`, `isValid`, `typeId`, and
`scoreboardIdentity`, the last reading `undefined` — and every other property throws
`InvalidEntityError` [[f:invalidation-guard-list-complete]]. On an attribute component the error
class splits: `setCurrentValue` and `entity` throw `InvalidEntityError` while the four value
getters and all three resets throw a plain `Error`, with `isValid` and `typeId` still readable
[[f:attribute-guard-classes-observed]]. On an `Effect` — whether the effect was removed or its
owner was — the four value members throw a plain `Error` and `isValid` answers false
[[f:effect-members-throw-plain-error]]. A member the table does not cover throws the
not-implemented error rather than a guessed engine error, which is the honest reading of the 27
`Entity` methods whose invalid-state behaviour is unobserved because the engine's arity check fired
first [[f:arity-checked-before-validity-guard]] [[d:guard-table-from-observation]].

## Events

Event signals are fake objects with the real `subscribe`/`unsubscribe` shape. Registration is
set-shaped — the same closure subscribed twice delivers once — and distinct subscribers are called
in subscription order [[f:subscription-semantics-observed]].

Delivery is synchronous, inside the causing call [[r:synchronous-event-delivery]] [[d:no-clock]].
Within that call the dispatch point is its end, after the mutation has landed, which is what
preserves the one property handlers actually depend on: a handler observes post-write state
[[f:after-events-deferred]]. An event a handler itself causes dispatches inside that handler
[[d:dispatch-is-depth-first-at-mutation-end]].

## Entity state: components and effects

Components are stored keyed by canonical id, and the control plane can add and remove them on a
live entity, because the real API reshapes an entity's components only through data-driven paths
the fakes do not model [[r:control-plane-component-mutation]]. An attribute component holds and
reads back what the test set — current value, default, and effective bounds — but writes nothing
itself: `setCurrentValue` and the three resets hand the write to the mutation pipeline below, which
is where the bounds check and its `ArgumentOutOfBoundsError` live, so one place enforces bounds and
emits [[f:set-current-value-bounds-observed]] [[r:fakes-behave-not-record]]
[[d:one-mutation-pipeline-for-health]].

`addEffect` returns the `Effect` object on both a fresh add and an update, following the
declaration rather than the pinned TSDoc that contradicts it
[[f:addeffect-returns-the-effect]]. An effect added with no amplifier option carries amplifier 0
[[f:effect-amplifier-defaults-to-zero]]. Re-adding an effect already present is conditional and the
fake reproduces the observed rule: a higher amplifier replaces; an equal amplifier replaces when
the new duration is at least as long; a lower amplifier never replaces
[[f:effect-replacement-rule-observed]] [[r:fakes-match-observed-engine-behaviour]]. A live effect
answers all its members, `displayName` included — a populated human-readable string in the engine
[[f:live-effect-fields-populated]] — but the mapping from effect id and amplifier to that string is
vanilla data, so the fake reads back what the test supplied and fails loudly otherwise
[[r:fakes-never-fabricate]]. Duration is static: with no tick there is nothing to decay it
[[d:no-clock]].

## Damage, health, and death

Every health mutation runs through one pipeline that writes the value and emits the sequence that
path was observed to emit [[d:one-mutation-pipeline-for-health]] [[r:fakes-behave-not-record]].
`applyDamage` fires `entityHurt`, then `entityHealthChanged`, then `entityDie` on a killing hit,
and the hurt payload carries the requested amount even when it exceeds remaining health
[[f:damage-cascade-order-and-payload]]. The value is not clamped at the minimum: a killing hit
drives `currentValue` below `effectiveMin` and the change event reports the negative number
[[f:health-not-clamped-at-minimum]]. With no options the damage cause is `none`, and with the
projectile options form the fake reports the cause `projectile` the engine derives from that form.
On that path the fake applies exactly the amount asked for: the engine adjusted a requested 1 to
1.045823097229004 from a real arrow, an adjustment the declarations and the API reference state
nowhere and one run cannot pin, so the requested amount is the only value the fake holds evidence
for [[f:applydamage-cause-defaults]] [[r:fakes-never-fabricate]].

`kill()` fires the full cascade — hurt for exactly the current health with cause `selfDestruct`,
the health change to exactly the minimum, then die with the same cause — returns true, and returns
true again on the corpse while firing nothing [[f:kill-and-remove-cascades]]
[[f:health-not-clamped-at-minimum]]. On an entity with no health component it fires only
`entityDie` and the reference reads invalid synchronously [[f:kill-no-health-behaviour]], which the
fake reproduces. The killed mob's corpse is the departure: the engine leaves it valid for several
ticks and despawns it by roughly 27 [[f:death-invalidation-window]], so post-death validity is no
uniform grace period, and a grace period measured in ticks is one a fake with no tick cannot count
down [[d:no-clock]]. The fake's corpse therefore stays valid indefinitely, and a test that needs it
gone invalidates it through the control plane
[[d:corpse-stays-valid-except-on-the-no-health-path]]. Writes through the health component fire
`entityHealthChanged` with no `entityHurt`, and a write that reaches the effective minimum fires
`entityDie` with cause `override` [[f:component-health-writes-cascade]]. `remove()` fires no death
event, and the fake emits nothing else on that path either. The engine's own `remove()` was
followed by five further deliveries — an `entitySpawn`, three `dataDrivenEntityTrigger`, and an
`entityRemove` [[f:kill-and-remove-cascades]] — and two things keep them out of the fake. The run
does not establish what caused which: it is a single run whose payload matching failed once the
entity was gone, so the five are attributed to that entity by what else the world held rather than
by their payloads. And four of the five are data-driven — a spawn and three definition-event
triggers — arising from entity definitions the fake models none of, which is the same absence that
makes `triggerEvent` throw; emitting them would mean inventing both the cause and the payload
[[r:fakes-never-fabricate]]. `entityRemove` is the one delivery a fake could populate from what it
holds, and it is what the open question on this departure turns on.

## The control plane

Everything the real surface cannot express is an exported free function rather than a member on a
fake [[r:only-real-members-free-functions]]
[[d:control-plane-free-functions-take-the-fake-first]]. Keeping them off the classes is what lets
the `implements` clause mean what it says: a fake-only member would sit in the same namespace the
conformance check is proving complete, and a consumer reading a fake could not tell which members
their pack may call. The list is the package's root export list, so it is named here rather than
left to the builder:

| function | what it does |
|---|---|
| `createWorld(init?)` | a world with its always-present object graph and an empty everything else |
| `addDimension(world, init)` | a dimension on that world, id normalized on entry |
| `spawnFake(dimension, typeId, init?)` | an entity fake, id from the world counter unless `init` overrides it |
| `spawnPlayerFake(dimension, init?)` | the same for `Player`, whose `name` `init` supplies |
| `invalidate(fake)` | sets the own flag on an entity, component, or effect [[r:invalidation-is-modeled]] |
| `addComponent(entity, id, init?)` | attaches a component, `init` supplying an attribute one's value and bounds [[r:control-plane-component-mutation]] |
| `removeComponent(entity, id)` | detaches it, leaving the handle invalid |
| `emit(world, signalName, payload)` | delivers to a signal's subscribers without a mutation behind it |
| `getSubscribers(signal)` | the registered closures in subscription order |
| `getDeliveries(world)` | every event the world has dispatched, in order, with its payload |
| `getUnsetFields(fake)` | the fields a read would throw on, so a test can assert its own setup |

The last three are the reads the real API has no member for. Every one of these takes the fake it
acts on first — the spawners act on the dimension they spawn into — leaving `createWorld` the only
entry with nothing to take [[d:control-plane-free-functions-take-the-fake-first]].

## Components

```yaml
components:
  - id: ids-and-types
    responsibility: derived id unions and the entry-point normalizer that canonicalizes to the prefixed form
    excludes: any per-type vanilla data behind an id
  - id: error-model
    responsibility: the library's error classes, engine message shapes, and the not-implemented failure
    excludes: deciding which member throws which error
  - id: validity-model
    responsibility: the own-flag-or-owner validity rule and the transcribed per-member guard table
    excludes: the control-plane function that triggers invalidation
    after: [error-model]
  - id: event-dispatch
    responsibility: >-
      the 55 after-event and 13 before-event signal objects, every payload class a signal hands a
      subscriber, set-shaped registration, and synchronous depth-first delivery of a payload it is
      given
    excludes: which mutation emits which event, and what any payload's fields hold
  - id: world-and-dimensions
    responsibility: the world fake, its always-present object graph, dimension lookup, and the per-world entity id counter
    excludes: the signal objects that graph holds, and constructing the entities the counter numbers
    after: [ids-and-types, event-dispatch, error-model]
  - id: entity-fakes
    responsibility: >-
      the Entity and Player fakes, their spawn-frame field values, their stubbed remainder, and the
      component-store, effect-store, and health-pipeline interfaces the constructor takes and the
      behaving members delegate to
    excludes: every implementation behind those three interfaces
    after: [validity-model, world-and-dimensions]
  - id: component-model
    responsibility: >-
      the component-store implementation — every component class attachable and answering its
      identity members, the attribute-shaped ones holding and reading back value and bounds, their
      mutating members delegating to the injected health-pipeline interface
    excludes: the write path itself — the bounds check, the value write, and the events it emits
    after: [entity-fakes, ids-and-types]
  - id: effect-model
    responsibility: the effect-store implementation — Effect and EffectType fakes, addEffect, and the observed replacement rule
    after: [entity-fakes, ids-and-types]
  - id: lifecycle-cascades
    responsibility: >-
      the health-pipeline implementation and the sole writer of an attribute value — the bounds
      check and its ArgumentOutOfBoundsError, the write through the store, and the populated event
      sequence each of applyDamage, kill, and the component writes emits
    after: [component-model, event-dispatch]
  - id: control-plane
    responsibility: >-
      the eleven exported free functions the specification lists, and the assembly of an entity
      fake from its three collaborators
    after: [lifecycle-cascades, effect-model]
  - id: presets
    responsibility: the vanilla-dimensions preset and the composition rule presets follow
    after: [world-and-dimensions]
  - id: package-surface
    responsibility: >-
      package config, the pinned peer range, the root export list — the fake classes, the error
      classes, the presets, and the control-plane functions — and the type-conformance build check
    after: [control-plane, presets]
```
