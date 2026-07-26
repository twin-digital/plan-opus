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
component or a reference that went invalid mid-event.

One constraint shapes everything below: the fake has no engine and no tick. Every behaviour it
reproduces is transcribed from a recorded observation of one pinned engine version, so where the
engine's behaviour is per-tick or is per-type vanilla data, the library states the gap rather than
inventing a plausible value.

## What the library substitutes, and how it types itself

Passing fake objects into the code under test is the only substitution available:
`@minecraft/server` publishes `index.d.ts` and nothing importable, so there is neither a runtime
module to intercept nor a real class to instantiate or subclass
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
member, not class by class: a builder needs to know which side of the throw each one falls on. On
`World` it is `getAllPlayers`, `scoreboard`, `gameRules`, `isHardcore`, `seed`, `afterEvents`, and
`beforeEvents` — the members a world with no one connected was observed to answer
[[f:world-resting-state-observed]] — plus `getDimension`, which resolves either spelling of the
three vanilla ids [[f:vanilla-dimensions-resolve-with-populated-fields]] and throws on an id naming
no dimension [[f:get-dimension-unknown-id-error]] [[d:built-surface-v1]]. On `Dimension` it is
`id`, `heightRange`, `localizationKey`, `spawnEntity`, and `getEntities`, which filters on the
state it holds and refuses the rest. `type`, `excludeTypes`, `tags`, `excludeTags`, `name` and
`excludeNames` read an entity's own type id, tag set, and name tag, so the fake evaluates them.
Every other option — `location`, `minDistance`/`maxDistance`, `volume`, `closest`/`farthest`, the
rotation ranges, `families`, `gameMode`, the level ranges, `propertyOptions`, `scoreOptions`, and
their exclusions — needs world geometry, per-type vanilla data, or a surface the fake does not
model, and each throws not-implemented when present: filtering on state is not fabrication, but
silently ignoring a filter and answering a wrong set is [[r:fakes-never-fabricate]]. What it answers
from is the dimension's own registry of live entities, and there is one way in: `spawnFake` calls
the same spawner seam
`Dimension.spawnEntity` does, so an entity registers once however it was created. `remove()`
detaches it, so a removed entity is gone from `getEntities` while the handle a test still holds
answers in the four ways the guard table allows. Every block-shaped member is a stub, since
blocks are outside the surface entirely.

`Entity` declares 16 properties and 46 methods, so its side of the throw is a list rather than a
description. Eight properties behave: `id`, `typeId`, `isValid`, `dimension`, `location`,
`nameTag`, `localizationKey`, and `scoreboardIdentity` — the last always reading `undefined`,
because the fake holds no scoreboard identities and an absence the engine can also exhibit is not
an invented value [[r:fakes-never-fabricate]]. The other eight — the `is…` state flags
(`isClimbing`, `isFalling`, `isInWater`, `isOnGround`, `isSleeping`, `isSneaking`, `isSprinting`,
`isSwimming`) — are stubs, since nothing in the fake moves an entity through those states.
Seventeen methods behave: `getRotation` and `setRotation`, `getVelocity`, the four tag methods
(`addTag`, `removeTag`, `hasTag`, `getTags`), `getComponent`, `getComponents`, `hasComponent`, the
four effect methods (`addEffect`, `getEffect`, `getEffects`, `removeEffect`), `applyDamage`,
`kill`, and `remove`. `triggerEvent` is the one half-case: it rejects a bare id as the engine does
and then throws not-implemented, because what a triggered event does is a data-driven definition
the fake has none of. The remaining 28 methods are stubs — teleportation and impulse,
`runCommand`, the view-direction, AABB and block-standing queries, `matches`, `playAnimation`,
`lookAt`, `setOnFire` and `extinguishFire`, the entity-property surface, and `addItem`, each of
which needs world geometry, a command interpreter, or a class this package does not ship. The
dynamic-property surface is a stub for the plainer reason that no requirement names a consumer
needing it. On `Player` only `name` behaves; its other 17 properties and 22 methods are stubs, all
of them client, inventory, or scoring surfaces.

Two rules keep that list readable rather than something to re-derive. The guard table below
governs behaving members only: a stub throws not-implemented whether its entity is valid or not,
so nothing in the fake answers after invalidation that refused to answer before it. And every
behaving member reads or writes state the fake holds, which is why `localizationKey` is the
caller's to supply rather than derived from a type id.

The event surface divides differently, because a signal and its payload are not the same
commitment. All 55 after-event signals and all 13 before-event signals
[[f:world-resting-state-observed]] exist as objects a test can subscribe to: a pack subscribing to
a signal it never triggers is doing nothing wrong, and a signal that threw on `subscribe` would
break it. Payload classes are narrower. Only four are built —
`EntityHurtAfterEvent`, `EntityHealthChangedAfterEvent`, `EntityDieAfterEvent`, and
`EntityRemoveAfterEvent` — which are exactly the payloads a modelled mutation delivers, the damage,
health, and death cascades below and the removal event beside them. Seventeen of the other 51
declare an `ItemStack`, `Block`, `BlockPermutation`, or `Container` field outright and several more
reach one through a method, so a payload class for them could not be built without the classes this
package does not ship, and a consumer constructing one would need the cast that
[[r:structural-full-shape-fakes]] exists to avoid. Those 51 signals therefore register and stay
silent, which is what a pack subscribing to them already expects, and the fake models no
before-phase to cancel from.

All 68 entity component classes the type map names [[f:component-ids-are-derivable-from-types]] can
be attached to an entity and answer their identity members — `typeId`, `isValid`, and the `entity`
that owns them, the three every entity component declares outside its own behaviour — so the
control plane can shape any component set a test needs; only the 7 attribute-shaped ones behave
beyond that, and a non-attribute component's other members throw not-implemented.

Being outside that surface means two different things. A member of a built class is authored and
throws not-implemented, because the `implements` clause forces a body onto it
[[r:structural-full-shape-fakes]]. A class outside it is absent from the package: there is no fake
of it to import, no stub object to hold, and no component owns one. Which classes those are follows
from the same reading of the requirements — every behaviour they name is a world's, an entity's, a
component's, an effect's, or an event's [[r:fakes-behave-not-record]] [[r:invalidation-is-modeled]]
[[r:control-plane-component-mutation]], and every engine observation held here was taken on those
objects:

| absent from v1 | what it is | why |
|---|---|---|
| `ItemStack`, `Container`, `ContainerSlot`, the item component classes | item stacks and the inventories holding them | the expected next increment, not a permanent boundary: v1 ships the basic shape first |
| `Block`, `BlockPermutation`, `BlockType` and `BlockStates`, `BlockVolume` and its iterators, the block component classes | the voxel layer and everything addressed by block position | the same next increment, and the heavier half of it: a block layer needs world geometry, which is state the library does not yet hold |
| `System` — `run`, `runTimeout`, `runInterval`, `currentTick` | tick scheduling and the tick counter | there is no tick to schedule against [[d:no-clock]] |
| `EntityTypes`, `EffectTypes`, `ItemTypes`, `BlockTypes`, `Potions` and the other static registries | the engine's catalogues of what exists | their contents are per-type vanilla data, which belongs to a package built on this one [[r:presets-are-opt-in]] |
| `StartupEvent`, `ShutdownEvent`, and the custom command and custom component registries | the startup phase where a pack registers its own commands and components | reached through the module's own lifecycle, not through objects a test passes in [[r:object-substitution-not-module-mocking]] |
| `Camera`, `ScreenDisplay`, `PlayerAimAssist`, `InputInfo`, `LocatorBar`, `Structure` and `StructureManager`, the loot table classes, `MolangVariableMap`, `Seat`, `FluidContainer`, and the remaining declared classes | the player-client surface, world authoring, loot generation, and the long tail | no requirement names a consumer needing it |

`Scoreboard`, `ScoreboardObjective`, `ScoreboardIdentity`, and `GameRules` are the one middle case:
built, because the world's graph has to be callable [[f:world-resting-state-observed]], with their
own members stubbed, because nothing modelled reads or writes them.

Id types come from the package's own type maps, so a version bump reshapes them with no
transcription pass [[f:component-ids-are-derivable-from-types]]
[[d:id-unions-derived-from-declarations]]. The values behind those types are a different matter:
the enum members have types but no usable values at runtime [[f:server-package-ships-types-only]],
so any runtime constant the library needs is its own string literal, and a consumer wanting real
constants uses `@minecraft/vanilla-data`, which does ship runtime JavaScript and whose values are
the prefixed form [[f:vanilla-data-provides-prefixed-id-constants]]. The derived unions and the
hand-written stub lists are the two places a version bump surfaces, which is why the pin is a
declared peer range and not an assumption [[r:target-server-version]]. Nothing else is depended on
at runtime [[r:no-test-framework-dependency]], so the fakes ship no spy or call-record machinery; a
caller who wants call records wraps them in whatever their runner provides. The one record they do
keep is the world's delivery log, which no runner could reconstruct, since the events it holds are
dispatched inside the library rather than called across its surface.

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
nothing the caller did not ask for [[r:no-implicit-defaults]] departs from what the engine rests
at — a fresh engine entity always carries components, with a type-dependent set and no common
baseline [[f:fresh-entity-is-never-component-empty]], and a fresh health component answers all four
of its values before any write [[f:fresh-health-component-values-populated]]. Both readings are
per-type vanilla data, which is the outside-the-data-we-hold bound the fidelity rule licenses the
departure on [[r:fakes-match-observed-engine-behaviour]].

Two things are always present regardless. The object graph the API needs in order to be callable —
the event signal objects, the scoreboard, the game rules — is constructed with the world, since a
world whose collections are empty is a real resting state while a world missing those objects is
not callable at all [[f:world-resting-state-observed]] [[r:no-implicit-defaults]]. And a spawned
entity starts at zero rotation and zero velocity for every type
[[r:zero-kinematics-at-spawn]] — the value seven of the eight probed types read on their spawn
frame, bit-identical across runs. `minecraft:xp_orb` is the outlier, and the fake does not
reproduce it: its rotation and velocity are drawn afresh per spawn
[[f:spawn-frame-kinematics-zero-except-xp-orb]], a departure the fidelity rule licenses as
undetermined by evidence [[r:fakes-match-observed-engine-behaviour]]. `nameTag` starts as the empty
string, which is uniform across every type sampled and so needs no per-type data
[[f:fresh-entity-nametag-is-empty-string]]. The other spawn-frame fields the engine populates are
the caller's to supply: `localizationKey` is the entity type's own name key
[[f:fresh-entity-spawn-frame-field-values]], per-type data the library does not hold and so the
same bound again [[r:fakes-match-observed-engine-behaviour]], and `location` the caller passes to
the spawner as they would to the engine. A read of either before it is set throws rather than
answering an invented value [[r:fakes-never-fabricate]].

A populated starting point is a named preset the caller invokes, never constructor behaviour, and a
preset here supplies only values a fact pins [[r:presets-are-opt-in]]. Exactly one clears that bar:
the three vanilla dimensions, whose ids resolve from either spelling, whose height ranges are
−64..320, 0..128, and 0..256, and whose localization keys are recorded
[[f:vanilla-dimensions-resolve-with-populated-fields]] [[d:vanilla-dimensions-is-the-only-preset]].
The rest of the engine's resting state is per-type vanilla data and belongs to a package built on
this one. So does the engine's per-type spawn-frame behaviour: the fake places an entity exactly
where asked and models neither the boat's 0.2 placement offset nor the arrow's one-time rotation
settle to −72, and each is a departure the fidelity rule licenses on a different bound
[[r:fakes-match-observed-engine-behaviour]] [[d:per-type-spawn-quirks-not-modeled]]. The arrow's
settle is pinned to the last digit but is a value of the arrow's own type
[[f:resting-arrow-turns-once-and-stays-valid]], so shipping it means shipping per-type data this
library does not hold. The boat's offset is constant in magnitude with a sign rule the runs do not
establish [[f:boat-spawn-offset-magnitude-constant]] — reproducing it would mean guessing which
way to push, so it is undetermined by evidence as well as per-type. Post-spawn AI drift is drawn
per run rather than fixed per type [[f:post-spawn-mob-motion-is-per-run-not-per-type]], the same
undetermined bound. Eight of the 128 entity types `@minecraft/vanilla-data` names were sampled
[[f:vanilla-data-provides-prefixed-id-constants]], so which types carry a quirk is itself unknown.

## Identity and ids

The id `spawnFake` assigns unless the caller overrides it [[r:ids-auto-assigned-typeid-required]]
comes from a counter on the world — the only place a monotonic sequence can live in a library with
no module state [[r:instance-scoped-world]] — as a decimal string, never reissued, matching the
engine's observed non-reissue after removal
[[f:entity-ids-not-reused]]. The engine's negative-integer form is not reproduced: the API
documents an entity id as carrying no meaning to parse or interpret
[[f:entity-id-is-documented-opaque]], which is the documented-opaque bound the fidelity rule
licenses a departure on [[r:fakes-match-observed-engine-behaviour]], so a test depending on the
shape of an id depends on something the engine does not promise
[[d:sequential-opaque-entity-ids]].

Tolerance of the bare form is per-surface rather than universal:
components, effect types, and entity types accept either, while `triggerEvent`
rejects a bare event id [[f:namespace-prefix-is-optional]], and the fake rejects it too rather than
being more permissive than what it stands in for [[r:fakes-match-observed-engine-behaviour]]. One
normalizer at every entry point, storing and reporting the prefixed form, is what keeps that split
a single exception rather than a rule each surface carries
[[r:canonical-prefixed-storage]] [[d:ids-normalized-at-entry]].

## Validity

The fake models one invalid state, and the evidence behind it is narrower than the states the
engine reaches. Every guard observation was taken on a reference invalidated by `remove()`
[[f:invalidation-guard-list-complete]] [[f:effect-members-throw-plain-error]]; whether a reference
invalidated by its chunk unloading presents the same way is assumed, not observed. A test standing
in for an unload therefore gets the removal behaviour, which is the one the engine was watched
doing.

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
`scoreboardIdentity`, the last reading `undefined` — and every other behaving property throws
`InvalidEntityError` [[f:invalidation-guard-list-complete]]. On an attribute component the error
class splits: `setCurrentValue` and `entity` throw `InvalidEntityError` while the four value
getters and all three resets throw a plain `Error`, with `isValid` and `typeId` still readable
[[f:attribute-guard-classes-observed]]. On an `Effect` — whether the effect was removed or its
owner was — the four value members throw a plain `Error` and `isValid` answers false
[[f:effect-members-throw-plain-error]]. Those exceptions are the table's whole content; a behaving
member it does not name throws `InvalidEntityError`, which is the guard the sweep found everywhere
it reached and the class a pack's `catch` branches on
[[f:invalidation-guard-list-complete]] [[r:invalidation-is-modeled]]
[[d:guard-table-from-observation]]. The 27 `Entity` methods the sweep left unobserved are no
counter-evidence: their `TypeError` is the engine checking arity before the guard, so it says
nothing about what a correctly-called one would raise
[[f:arity-checked-before-validity-guard]]. The not-implemented error stays what it always was, the
answer a stub gives, and never doubles as an invalidation result.

## Events

Event signals are fake objects with the real `subscribe`/`unsubscribe` shape. Registration is
set-shaped — the same closure subscribed twice delivers once — and distinct subscribers are called
in subscription order [[f:subscription-semantics-observed]].

The engine defers an after-event past the mutating call's return and delivers it later in the same
tick [[f:after-event-deferral-subtick]]; that offset is a function of elapsed ticks a clockless fake
cannot represent, so delivery lands inside the causing call instead
[[r:fakes-match-observed-engine-behaviour]] [[r:synchronous-event-delivery]] [[d:no-clock]].
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
vanilla data, outside what this library holds, so the fake reads back what the test supplied and
fails loudly otherwise [[r:fakes-match-observed-engine-behaviour]] [[r:fakes-never-fabricate]]. Duration is static: the engine decays it with the tick
[[f:effect-replacement-rule-observed]], which makes it a function of elapsed ticks a clockless fake
cannot represent — the first of the fidelity rule's bounds
[[r:fakes-match-observed-engine-behaviour]] [[d:no-clock]].

## Damage, health, and death

Every health mutation runs through one pipeline that writes the value and emits the sequence that
path was observed to emit [[d:one-mutation-pipeline-for-health]] [[r:fakes-behave-not-record]].
`applyDamage` fires `entityHurt`, then `entityHealthChanged`, then `entityDie` on a killing hit,
and the hurt payload carries the requested amount even when it exceeds remaining health
[[f:damage-cascade-order-and-payload]]. The value is not clamped at the minimum: a killing hit
drives `currentValue` below `effectiveMin` and the change event reports the negative number
[[f:health-not-clamped-at-minimum]]. The `entityDie` that ends a lethal `applyDamage` carries the
same cause its `entityHurt` did, which is the damage source the caller supplied or `none` where
they supplied nothing: the run recorded that event's order but not its cause
[[f:damage-cascade-order-and-payload]], so carrying the cause forward is the only value the
evidence in hand supports — inventing a distinct one, as `kill()` and the component write have
pinned for their own paths, is what the undetermined-by-evidence bound forbids
[[r:fakes-match-observed-engine-behaviour]] [[r:fakes-never-fabricate]]. With no options the damage
cause is `none`, and with the
projectile options form the fake reports the cause `projectile` the engine derives from that form.
On that path the fake applies exactly the amount asked for: the engine adjusted a requested 1 to
1.045823097229004 from a real arrow, a single sample that pins no rule
[[f:applydamage-cause-defaults]]. That is the fidelity rule's
undetermined-by-evidence bound [[r:fakes-match-observed-engine-behaviour]] — an adjusted number
here would be an invented one [[r:fakes-never-fabricate]].

Both boolean returns follow their declared meaning rather than a guess. `applyDamage` answers
whether the entity took damage: true when it wrote a health value, false when the amount is zero or
less, and false on an entity carrying no health component — nothing to write, so nothing fires and
no cascade runs, the one place `applyDamage` differs from `kill()` on that same entity.
`removeEffect` answers true when an effect was present and is now gone, its handle left invalid,
and false when the entity never carried it.

A corpse takes no second death. Once `entityDie` has fired for an entity, a further `applyDamage`
writes nothing, fires nothing, and returns false, the same answer `kill()` was observed to give a
corpse it fires nothing for [[f:kill-and-remove-cascades]]; without that, one pipeline would happily
drive health further negative and fire a second `entityDie` no run has ever seen.

One pipeline does not mean one gate. The bounds check belongs to the value a caller hands in —
`setCurrentValue`, and only it — where the engine was observed to reject anything outside the
effective range [[f:set-current-value-bounds-observed]]. A damage-derived write passes no
caller value and is not gated: that is what lets a killing hit land at −92 against bounds of
[0, 8] and fire its cascade rather than throwing [[f:health-not-clamped-at-minimum]]. The resets
land on values the component already holds and are likewise ungated.

Both gated and ungated paths still read the bounds — `setCurrentValue` to check against them,
`kill()` and the component writes to recognise the minimum. On a component whose bounds no test
supplied, that read is a read of an unset field and throws the library's unset-field error, not
`ArgumentOutOfBoundsError` — the value is missing, not out of range — and not the not-implemented
error, which says a member was never built rather than that a test has more setup to do
[[r:no-implicit-defaults]] [[r:fakes-never-fabricate]].

`kill()` fires the full cascade — hurt for exactly the current health with cause `selfDestruct`,
the health change to exactly the minimum, then die with the same cause — returns true, and returns
true again on the corpse while firing nothing [[f:kill-and-remove-cascades]]
[[f:health-not-clamped-at-minimum]]. On an entity with no health component it fires only
`entityDie` and the reference reads invalid synchronously [[f:kill-no-health-behaviour]], which the
fake reproduces. The killed mob's corpse is the departure: the engine leaves it valid for several
ticks and despawns it by roughly 27 [[f:death-invalidation-window]], so post-death validity is no
uniform grace period but a countdown in ticks — a function of elapsed ticks a clockless fake cannot
represent, which is the bound the fidelity rule licenses this departure on
[[r:fakes-match-observed-engine-behaviour]] [[d:no-clock]]. The fake's corpse therefore stays valid
indefinitely, and a test that needs it gone invalidates it through the control plane
[[d:corpse-stays-valid-except-on-the-no-health-path]]. Writes through the health component fire
`entityHealthChanged` with no `entityHurt`, and a write that reaches the effective minimum fires
`entityDie` with cause `override` [[f:component-health-writes-cascade]]. `remove()` fires no death
event. It fires `entityRemove` [[f:kill-and-remove-cascades]], whose payload carries exactly the
two readonly strings `removedEntityId` and `typeId` and no entity reference
[[f:entity-remove-after-event-shape]] — both values still readable on a removed fake
[[f:invalidation-guard-list-complete]] — and it reaches the signal the
way every other emitting member does, by handing off to the pipeline the entity fake holds rather
than by reaching for the world itself. The four further deliveries the engine made after its own
`remove()`, an `entitySpawn` and three `dataDrivenEntityTrigger` [[f:kill-and-remove-cascades]],
arise from entity definitions the fake holds none of — the same absence that makes `triggerEvent`
throw, and the outside-the-data bound again [[r:fakes-match-observed-engine-behaviour]].

## The control plane

Keeping the control operations off the fake classes is what lets the `implements` clause mean what
it says: a fake-only member would sit in the same namespace the conformance check is proving
complete [[r:only-real-members-free-functions]]. This table is the package's root export list, so
it is pinned here rather than left to the builder
[[d:control-plane-free-functions-take-the-fake-first]]:

| function | what it does |
|---|---|
| `createWorld(init?)` | a world with its always-present object graph and an empty everything else |
| `addDimension(world, init)` | a dimension on that world, id normalized on entry |
| `spawnFake(dimension, typeId, init?)` | an entity fake, id from the world counter unless `init` overrides it |
| `spawnPlayerFake(dimension, init?)` | the same for `Player`, whose `name` `init` supplies |
| `invalidate(fake)` | sets the own flag on an entity, component, or effect [[r:invalidation-is-modeled]] |
| `addComponent(entity, id, init?)` | attaches a component, `init` supplying an attribute one's four values [[r:control-plane-component-mutation]] |
| `removeComponent(entity, id)` | detaches it, leaving the handle invalid |
| `emit(world, signalName, payload)` | delivers to a signal's subscribers without a mutation behind it |
| `getSubscribers(signal)` | the registered closures in subscription order |
| `getDeliveries(world)` | every event the world has dispatched, in order, with its payload |
| `getUnsetFields(fake)` | the fields a read would throw on, so a test can assert its own setup |

The last three are the reads the real API has no member for. `signalName` is the union of the four
signals whose payload class is built — `entityHurt`, `entityHealthChanged`, `entityDie`,
`entityRemove` — rather than a bare string or all 55, so `emit` can only be asked for a payload the
package can construct, and a misspelled or unbuilt signal is a compile error.

Each `init` is a partial of the fields its target holds, and every field it omits stays unset, so a
read of one throws until a test supplies it [[r:no-implicit-defaults]] [[r:fakes-never-fabricate]].
The fields are fixed here for the same reason the export list is:

| init | fields |
|---|---|
| `createWorld` | `isHardcore`, `seed` |
| `addDimension` | `id` (required), `heightRange`, `localizationKey` |
| `spawnFake` | `id`, `location`, `localizationKey`, `rotation`, `velocity`, `nameTag`, `tags` |
| `spawnPlayerFake` | those, plus `name` |
| `addComponent` | on an attribute component, `currentValue`, `defaultValue`, `effectiveMin`, `effectiveMax`; on any other, nothing |

`rotation`, `velocity` and `nameTag` are the three that start at a value rather than unset — zero,
zero, and the empty string.

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
      the 55 after-event and 13 before-event signal objects, the map from a declared signal name to
      its object, the four payload classes a delivering signal hands a subscriber, set-shaped
      registration,
      synchronous depth-first delivery of a payload it is given, and the per-world delivery log —
      one entry per dispatch holding the signal name and the payload delivered, in dispatch order
    excludes: which mutation emits which event, and what any payload's fields hold
  - id: world-and-dimensions
    responsibility: >-
      the world fake, its always-present object graph, dimension lookup, the per-world entity id
      counter, the spawner seam Dimension.spawnEntity and spawnFake both delegate to, and the
      per-dimension registry of live entities getEntities answers from — its detach hook, and the
      state-only query filter with the not-implemented refusal of every other option
    excludes: the signal objects that graph holds, and the entity fakes the spawner constructs
    after: [ids-and-types, event-dispatch, error-model]
  - id: entity-fakes
    responsibility: >-
      the Entity and Player fakes, their spawn-frame field values, the record of which of those
      fields no test has supplied, their stubbed remainder, and the component-store, effect-store,
      and lifecycle-pipeline interfaces the constructor takes and the behaving members — remove()
      among them — delegate to
    excludes: every implementation behind those three interfaces
    after: [validity-model, world-and-dimensions]
  - id: component-model
    responsibility: >-
      the component-store implementation — every component class attachable and answering its
      identity members, the attribute-shaped ones holding and reading back value and bounds, their
      mutating members delegating to the injected lifecycle-pipeline interface
    excludes: the write path itself — the bounds check, the value write, and the events it emits
    after: [entity-fakes, ids-and-types]
  - id: effect-model
    responsibility: the effect-store implementation — Effect and EffectType fakes, addEffect, and the observed replacement rule
    after: [entity-fakes, ids-and-types]
  - id: lifecycle-cascades
    responsibility: >-
      the lifecycle-pipeline implementation and the sole writer of an attribute value — the bounds
      check and its ArgumentOutOfBoundsError, the write through the store, and the populated event
      sequence each of applyDamage, kill, and the component writes emits — plus the removal path on
      remove(), which writes no attribute value: the detach through the dimension's registry hook
      and the entityRemove payload and its delivery
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
