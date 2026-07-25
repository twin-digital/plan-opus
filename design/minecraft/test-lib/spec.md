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
      the engine adjusts projectile-path damage by a velocity-dependent amount that varies per
      run, so the fake can only apply the requested damage; which requirement documents that
      departure?
    closes: requirement
    gates: [one-mutation-pipeline-for-health]
  - id: entity-id-form-departure
    question: >-
      the engine issues entity ids as negative integers and the fake issues decimal counter
      strings; which requirement documents that departure?
    closes: requirement
    gates: [sequential-opaque-entity-ids]
  - id: per-type-spawn-quirk-departure
    question: >-
      the engine's spawn frame carries per-type placement offsets and rotation settles the fake
      does not apply; which requirement documents that departure, given a decision currently
      carries it?
    closes: requirement
    gates: [per-type-spawn-quirks-not-modeled]
  - id: remove-side-effect-departure
    question: >-
      the engine's `remove()` was followed by five unrelated after-event deliveries the fake
      emits none of; which requirement documents that departure?
    closes: requirement
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

The built surface is drawn as counts, because "the components" and "the signals" each name a set
the declarations already close, and a builder needs to know which side of the throw each member
falls on. All 55 after-event signals [[f:world-resting-state-observed]] exist as objects a test can
subscribe to; only those a modelled mutation emits — the damage, health, and death cascades below —
ever deliver, and the rest stay silent rather than throwing, since a pack subscribing to a signal
it never triggers is doing nothing wrong. All 68 entity component classes
[[f:component-ids-are-derivable-from-types]] can be attached to an entity and answer their identity
members, so the control plane can shape any component set a test needs; only the 7 attribute-shaped
ones behave beyond that, and a non-attribute component's other members throw not-implemented
[[d:built-surface-v1]]. World, dimension, entity and player, effect and effect type complete the
list; every other declared class is a stub throughout.

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

Three failure modes are distinct and the library keeps them distinct. A member outside the built
surface throws a not-implemented error naming the class and member. A read of state the test never
supplied, where the engine could not have lacked it, throws the same way rather than returning an
invented value. Absence the engine can genuinely exhibit — a component an entity does not carry, an
effect it does not have — is not a failure and reads back exactly as the engine reports it
[[r:fakes-never-fabricate]].

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

All state belongs to a world instance the test creates; the library holds no module-level mutable
state, so suites cannot leak into each other [[r:instance-scoped-world]]. Construction populating
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
to supply, and unset ones fail loudly.

A populated starting point is a named preset the caller invokes, never constructor behaviour, and a
preset here supplies only values a fact pins [[r:presets-are-opt-in]]. Exactly one clears that bar:
the three vanilla dimensions, whose ids resolve from either spelling, whose height ranges are
−64..320, 0..128, and 0..256, and whose localization keys are recorded
[[f:vanilla-dimensions-resolve-with-populated-fields]] [[d:vanilla-dimensions-is-the-only-preset]].
The rest of the engine's resting state is per-type vanilla data and belongs to a package built on
this one. So does the engine's per-type spawn-frame behaviour: the fake places an entity exactly
where asked and models neither the boat's constant 0.2 placement offset
[[f:boat-spawn-location-offset]], nor the arrow's one-time rotation settle to −72
[[f:resting-arrow-turns-once-and-stays-valid]], nor post-spawn AI drift — which is drawn per run
rather than fixed per type, so no fake could reproduce it deterministically anyway
[[f:post-spawn-mob-motion-is-per-run-not-per-type]] [[d:per-type-spawn-quirks-not-modeled]].

## Identity and ids

The id `spawnFake` assigns unless the caller overrides it [[r:ids-auto-assigned-typeid-required]]
comes from a per-world counter as a decimal string and is never reissued, matching the engine's
observed non-reissue after removal
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

A fake can be put into the invalid state a stale engine reference occupies, and the transition can
happen mid-test on a reference the test already holds [[r:invalidation-is-modeled]]. Validity is
therefore per object and not per entity: a component or effect reads invalid when its own flag is
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
the fakes do not model [[r:control-plane-component-mutation]]. The attribute components behave:
current value, default, and effective bounds are what the test set, and `setCurrentValue` enforces
the bounds it was given [[f:set-current-value-bounds-observed]] [[r:fakes-behave-not-record]].

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
[[f:health-not-clamped-at-minimum]]. With no options the damage cause is `none`
[[f:applydamage-cause-defaults]].

`kill()` fires the full cascade — hurt for exactly the current health with cause `selfDestruct`,
the health change to exactly the minimum, then die with the same cause — returns true, and returns
true again on the corpse while firing nothing [[f:kill-and-remove-cascades]]
[[f:health-not-clamped-at-minimum]]. On an entity with no health component it fires only
`entityDie` and the reference reads invalid synchronously, in contrast to a killed mob's corpse,
which stays valid for several ticks — post-death validity is not a uniform grace period
[[f:kill-no-health-behaviour]] [[f:death-invalidation-window]]. The fake takes the synchronous
invalidation for the no-health path and leaves the corpse valid otherwise, since the observed grace
period is measured in ticks a tickless fake cannot count down; a test that needs the corpse gone
invalidates it through the control plane [[d:corpse-stays-valid-except-on-the-no-health-path]]
[[d:no-clock]]. Writes through the health component fire
`entityHealthChanged` with no `entityHurt`, and a write that reaches the effective minimum fires
`entityDie` with cause `override` [[f:component-health-writes-cascade]]. `remove()` fires no death
event and is the control plane's business rather than a modelled event cascade: the engine's own
`remove()` was followed by five unrelated deliveries, which is engine bookkeeping a fake has no
reason to reproduce [[f:kill-and-remove-cascades]].

## The control plane

The operations the real surface cannot express — creating a world, spawning entities, invalidating
a reference, adding and removing components [[r:control-plane-component-mutation]], emitting an
event directly, and reading state the real API has no member for — are exported free functions
rather than members on the fakes [[r:only-real-members-free-functions]]
[[d:control-plane-free-functions-take-the-fake-first]]. Keeping them off the classes is what lets
the `implements` clause mean what it says: a fake-only member would sit in the same namespace the
conformance check is proving complete, and a consumer reading a fake could not tell which members
their pack may call.

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
    responsibility: the 55 after-event signal objects, set-shaped registration, and synchronous depth-first delivery
    excludes: knowing which mutation emits which event
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
      the component-store implementation — all 68 classes attachable and answering their identity
      members, the 7 attribute-shaped ones behaving in full
    excludes: the events a health write emits
    after: [entity-fakes, ids-and-types]
  - id: effect-model
    responsibility: the effect-store implementation — Effect and EffectType fakes, addEffect, and the observed replacement rule
    after: [entity-fakes, ids-and-types]
  - id: lifecycle-cascades
    responsibility: the health-pipeline implementation behind applyDamage, kill, and the component writes, and the sequence each path emits
    after: [component-model, event-dispatch]
  - id: control-plane
    responsibility: >-
      the exported free functions — world creation, spawnFake, invalidation, component mutation, and
      emission — and the assembly of an entity fake from its three collaborators
    after: [lifecycle-cascades, effect-model]
  - id: presets
    responsibility: the vanilla-dimensions preset and the composition rule presets follow
    after: [world-and-dimensions]
  - id: package-surface
    responsibility: package config, the pinned peer range, the root export list, and the type-conformance build check
    after: [control-plane, presets]
```
