# Minecraft test lib

## Summary

`@twin-digital/minecraft-test-lib` is a test double library for Minecraft Bedrock behavior
packs: in-memory TypeScript fakes of the `@minecraft/server` object model — entities,
components, worlds, and events — that hold real state and mutate it, so a test asserts on the
state that results rather than on which methods were called. It exists because the real package
ships type declarations with no runtime JavaScript, leaving a test process nothing to construct
or mock.

What shapes it most is fidelity: a fake is only worth what a passing test predicts about the
engine. So the fakes reproduce the real API's observable behaviour including its quirks —
invalidated references that throw on member access, non-uniformly; ids that may omit their
`minecraft:` prefix — and where a behaviour has no reference to be faithful to, the fake fails
loudly rather than inventing a value.

## Object-granular substitution

There is no module to replace: `@minecraft/server` resolves to type declarations with no
runtime entry point [[f:server-package-ships-types-only]]. The library therefore substitutes at
object granularity — it constructs fake entities, worlds, and signals for the test to pass into
the code under test, and takes no position on module aliasing or import interception
[[d:object-substitution-not-module-mocking]]. Code that can only reach the engine through a
direct module import is outside its reach; making helpers take their world and entities as
parameters is the consumer's side of the contract.

Fake classes are declared against the real types, so a fake is accepted anywhere the real type
is expected, without casts [[d:fakes-implement-real-types]] — available because the declared
classes carry no private members or brand fields to defeat structural typing
[[f:server-classes-are-structurally-assignable]]. The test and the code under test
then share one `Entity` type, and every read goes through the genuine API
[[r:no-shadowing-of-real-api]]. Assignability admits nothing less than the full class shape,
so a fake declares every public member, those outside the built surface present as
not-implemented stubs — unfaked access throws rather than reading `undefined`
[[d:full-shape-with-stubs]].

The pinned version is `@minecraft/server` 2.8.0, declared as the peer range a consumer must
satisfy; every derivation, guard list, and behaviour reading below is taken from that
version's declarations [[d:pinned-server-version]]. And because the package's enums have
types but no values [[f:server-package-ships-types-only]], the library exports runtime
mirrors of the enum values its surface needs, each type-checked against the declared enum so
drift fails the build [[d:runtime-enum-mirrors]] — for the first surface,
`EntityComponentTypes` and `EntityDamageCause`, exported as const objects named exactly as
the declared enums [[d:enum-mirrors-named-as-declared]].

The published package has no runtime dependencies [[d:zero-runtime-dependencies]]:
`@minecraft/server` contributes only types, and no test framework is required or referenced —
the fakes are plain objects that behave identically under any runner
[[r:no-test-framework-dependency]].

## A world instance per test

All fake state hangs off a world the test creates; the library keeps no module-level state
[[d:instance-scoped-world]]. Isolation between tests is object lifetime — make a new world —
rather than a reset hook a framework would have to run [[r:no-test-framework-dependency]]. A
created world carries the three vanilla dimensions, since a world without them is not a state
the engine can exhibit [[r:faithful-to-observable-api]] [[d:worlds-carry-vanilla-dimensions]];
everything else starts empty. The world has no clock: nothing time-dependent advances, and an
effect's duration reads exactly as the test staged or set it [[d:no-tick-clock]].

Entity and component fakes are thin handles over records the world owns
[[d:entities-are-handles]]. Methods mutate the record, and every handle to the same entity
observes the result. The handle/record split is also the invalidation mechanism: unloading
removes the record while every existing handle survives to throw — the same stale-reference
shape the real API leaves, produced mid-test on a reference the test already holds
[[r:invalidation-is-modeled]].

## Behaviour, not recording

A fake's methods implement the real semantics against the record: applying damage lowers the
health component's `currentValue`, adding an effect makes `getEffect` return it, and outcomes
the real API encodes in return values are encoded the same way — `getComponent` on a bare
entity returns `undefined`, not a throw and not a default [[r:fakes-behave-not-record]]
[[r:faithful-to-observable-api]]. Nothing records call arguments; a caller who wants spies
wraps the fakes with their own library.

Absence is answerable for every component id, modeled or not — `getComponent` returns
`undefined` and `hasComponent` `false` — while presence is expressible only for modeled
types, which the spawn-spec type enforces at compile time
[[d:absence-is-answerable-for-any-id]]. Effects replace unconditionally: `addEffect` on an
effect already present overwrites its amplifier and duration [[d:effect-add-replaces]], and
`Effect.displayName`, a localized string no fake can produce, stays a not-implemented stub
[[d:unverified-members-throw]].

The fidelity reference is the pinned version's own documentation: the TSDoc in the exact
`.d.ts` the consumer compiles against, backed by the official script API docs
[[d:tsdoc-is-fidelity-authority]]. Where both are silent the fake does not guess — a member
whose behaviour is unverified throws a distinctive not-implemented error, trading a false pass
for a visible gap [[d:unverified-members-throw]] [[r:faithful-to-observable-api]].

## Ids: accept both forms, store one

Every id-taking input accepts the bare or the prefixed form and normalizes on entry; state and
reads carry only the canonical `minecraft:`-prefixed form, matching the uniform rule the engine
applies [[f:namespace-prefix-is-optional]] [[d:canonical-prefixed-storage]]. Reads therefore
compare equal against the `@minecraft/vanilla-data` constants a test typically holds, which are
the prefixed strings [[f:vanilla-data-provides-prefixed-id-constants]].

The id unions and per-id component typings are derived from `@minecraft/server`'s own type
declarations — `keyof EntityComponentTypeMap` and its relatives — so a version bump updates
them with no hand-maintained list to rot [[f:component-ids-are-derivable-from-types]]
[[d:ids-derived-not-transcribed]].

## Invalidation

Validity is enforced member by member: each member the `.d.ts` annotates as throwing consults
the record and throws `InvalidEntityError` when it is gone, while `id`, `typeId`, `isValid`,
and `nameTag` keep answering — `isValid` is the probe and does not throw — and a component
handle follows its owner, its own `isValid` and `typeId` readable while `entity` throws
[[f:invalidation-throws-non-uniformly]] [[d:per-member-guards]]. Reading the guard list off the
same `@throws` annotations that document the behaviour copies the non-uniformity instead of
approximating it [[r:faithful-to-observable-api]]. The derivation is mechanical: in the pinned
declarations every Entity `@throws` names `InvalidEntityError`, and the six members without
one — `id`, `typeId`, `isValid`, `nameTag`, `isSneaking`, `scoreboardIdentity` — carry no
`@throws` at all [[f:invalidation-throws-are-mechanically-derivable]]. Attribute members whose
`@throws` names no error are guarded the same way, an invalid owner being the only failure a
fake can exhibit there [[d:generic-throws-members-follow-owner]]. Where a member carries both
guards, validity is checked first: an invalid entity throws `InvalidEntityError` even where
unstaged state would throw `NotImplementedError` [[d:validity-guard-runs-first]].

What a guard throws is the library's own exported `InvalidEntityError`, matching the declared
name and shape — extends `Error`, carrying the invalid entity's `id` and `type`
[[f:invalid-entity-error-shape]] — because the package's class is types-only and cannot be
imported at runtime [[d:library-defined-error-classes]]. The not-implemented throw is likewise
the exported `NotImplementedError`, so a test can catch either by class.

The real removal members behave: `remove()` invalidates the record and fires no death event;
`kill()` drives health to its minimum and the death cascade with it, leaving the reference
valid [[d:remove-and-kill-behave]].

## Construction: nothing unasked

A factory adds nothing the caller did not specify — a bare entity has no components
[[r:no-implicit-defaults]]. Populated starting points are bases: exported plain partial-spec
objects a test merges in explicitly (`spawnFake(world, { ...livingMob, typeId })`), composable
because they are data [[d:bases-are-data]]. A factory never applies a base on its own.

`spawnFake` requires a `typeId` and assigns each entity a unique opaque id, overridable in
the spec — in the engine, too, the spawner never chooses the id
[[d:ids-auto-assigned-typeid-required]]. An attribute component in a spawn spec names its
full value set — current, default, min, and max; no bound is derived from another
[[d:attribute-init-is-explicit]]
[[r:no-implicit-defaults]] — and the shipped bases carry the vanilla-typical sets so tests
rarely write them out. State the spec never supplied stays loud rather than fabricated:
reading what the engine could not lack — a spawned entity's location or dimension — throws
`NotImplementedError` naming the missing field, while absence the engine can exhibit, like a
missing component, reads back exactly as the engine reports it [[d:unstaged-state-throws]]
[[r:faithful-to-observable-api]].

## The control plane

What the real surface cannot express, the library exports as free functions over the fakes
rather than as extra members on them: constructing worlds and entities, adding and removing
components on a live entity — the real API reshapes components only through data-driven paths
the fakes do not model [[d:control-plane-component-mutation]] — unloading
(`invalidate(entity)`), and firing events from the engine's side
[[d:control-plane-is-free-functions]]. A fake carries only real members, so nothing on it
competes with the genuine access path, and a read the real API cannot express is a
free-function selector, not a fake-only getter [[r:no-shadowing-of-real-api]].

Event signal fakes implement `subscribe` and `unsubscribe` as declared; delivery has two
sources. A behaving method synchronously dispatches the after-events its real counterpart
causes — `applyDamage` fires `entityHurt` and `entityHealthChanged`, health reaching its
minimum fires `entityDie`; a cascade the fidelity sources leave unknown fires nothing, and
the test stages it instead [[d:behaving-methods-fire-their-events]]
[[r:faithful-to-observable-api]]. Dispatch order is fixed — `entityHurt`, then
`entityHealthChanged`, then `entityDie` — `entityHealthChanged` fires only on an actual
change, and the fired `damageSource` carries the caller's options, its cause `none` when no
options were given [[d:damage-event-dispatch-order]]. The rule is keyed to the change, not
the path: `setCurrentValue` and the resets fire `entityHealthChanged` just as damage does
[[d:health-writes-fire-health-changed]]. A behaving death leaves the reference valid —
despawn timing is not modeled, and a test that wants the dead entity gone calls `invalidate`
itself [[d:death-does-not-auto-invalidate]]. The control-plane emit covers events whose engine-side
cause lies outside the faked surface: it delivers a payload typed from the signal's handler
parameter and mutates nothing [[d:emit-delivers-only]] — including delivery to an entity the
same staged hit has already invalidated, the case the library exists to make testable
[[r:invalidation-is-modeled]].

## First surface

The initial build covers the slice the motivating tests exercise: the entity core,
attribute-shaped components with health first, effects, the damage-related event signals, and
the minimum of world and dimension needed to hold them [[d:initial-surface-damage-path]]. The
signals are exactly `world.afterEvents.entityHurt`, `entityHealthChanged`, and `entityDie` —
no others, and no beforeEvents [[d:first-signals-list]]. Of the world surface,
`world.getDimension`, `world.getEntity`, and `dimension.getEntities` behave — a spawned
entity joins its staged dimension's entity set — and passing query options throws
`NotImplementedError` [[d:first-surface-world-members]]. Everything further waits for a
consumer test that needs it.

## Components

```yaml
components:
  - id: world-store
    responsibility: per-test world instance owning entity records, their component and effect
      state, validity, and the vanilla dimensions
    excludes: event subscription and dispatch (event-signals)
  - id: id-canonicalization
    responsibility: normalize namespace-optional ids to the prefixed form; export the
      type-derived id unions and the runtime enum mirrors
    excludes: deciding which ids the faked surface supports
  - id: errors
    responsibility: exported error classes — InvalidEntityError matching the declared shape,
      NotImplementedError
  - id: entity-fake
    responsibility: Entity handle over a world-store record — real members only, behaving
      methods, validity guards, not-implemented stubs for the unbuilt surface
    excludes: component instances (component-fakes)
    after: [world-store, id-canonicalization, errors]
  - id: component-fakes
    responsibility: attribute-shaped EntityComponent handles, health first, following their
      owner's validity
    after: [entity-fake]
  - id: effect-fakes
    responsibility: entity effect state and Effect handles with add, get, and remove
      semantics
    after: [entity-fake]
  - id: event-signals
    responsibility: event signal fakes with subscribe and unsubscribe, dispatch invoked by
      behaving methods and the control plane
    excludes: choosing which events a behaving method fires (entity-fake) and what emit
      delivers (control-plane)
    after: [world-store]
  - id: control-plane
    responsibility: free functions for what the real API cannot express — construct, add and
      remove components, unload, emit
    after: [entity-fake, event-signals]
  - id: bases
    responsibility: shipped opt-in partial-spec bases, such as a living mob
    after: [control-plane]
```
