# minecraft-test-lib

## Summary

`@twin-digital/minecraft-test-lib` is a test double library for Minecraft Bedrock behavior packs:
in-memory fakes of the `@minecraft/server` object model — worlds, dimensions, entities, components,
effects, and event signals — that hold state and mutate it as their methods are called. Its product
is a published npm package carrying three things: fake classes assignable wherever the real declared
types are expected, a control plane of free functions for everything the real API cannot express,
and no test-framework dependency at all. It answers the pack author's problem that the engine
package ships types and no runtime, so every suite hand-rolls doubles that cannot express an absent
component, a value the engine reports oddly, or an entity that unloaded mid-event. The constraint
that shapes the rest is that fidelity here is empirical: the engine's real behaviour can only be
asked of a running server, so the library behaves where that behaviour has been observed and
recorded, and its built surface is bounded by those observations rather than by the declarations.

## Open questions

```yaml
questions:
  - id: projectile-damage-adjustment
    question: >-
      the engine adjusts projectile-path damage to a velocity-dependent, run-varying value the
      fake cannot reproduce; may the fake deliver the requested amount instead, and is the
      projectile options form in the built surface at all until then?
    closes: requirement
    gates: [applydamage-mirrors-observed-cascade]
  - id: applydamage-on-an-entity-without-health
    question: >-
      no observation records what applyDamage does to an entity carrying no health component
      (an arrow, an item frame) — the recorded no-health path is kill(), which fires a bare
      death event; does applyDamage fire the same bare death event, fire nothing, or throw?
    closes: fact
    gates: [applydamage-mirrors-observed-cascade]
  - id: post-death-invalidation-without-ticks
    question: >-
      the engine invalidates some entities immediately on death and keeps others valid for
      several ticks; a tickless fake can reproduce the immediate case but not the delayed one,
      so may removal and death leave every reference valid until a test invalidates it?
    closes: requirement
    gates: [invalidation-only-through-the-control-plane]
  - id: vanilla-dimension-set-on-a-world
    question: >-
      no engine observation records which dimensions a script sees on a world, so the trio the
      fake builds rests on the declarations alone; is the set always the three vanilla
      dimensions, and can a pack-registered or absent dimension change it?
    closes: fact
    gates: [vanilla-dimensions-on-every-world]
```

## What is faked, and how it reaches the code under test

The library hands out objects; it never touches module resolution [[r:object-substitution-not-module-mocking]],
which is possible at all only because there is no runtime module to intercept — the engine package
resolves to declarations and nothing else [[f:server-package-ships-types-only]]. That same absence
is why substitution has to be structural: a test cannot obtain the real class to extend or to
`instanceof` against, so a fake must be accepted for the declared type on shape alone, which the
declarations permit [[f:server-classes-are-structurally-assignable]]. Each fake therefore declares
the full public shape of its class rather than the part a given test exercises
[[r:structural-full-shape-fakes]], and the compiler is the mechanism that holds it there
[[d:implements-enforces-the-declared-shape]] — an `implements` clause against the pinned
declarations fails the build the moment a member is missing. The pin is a single version everywhere, read as the source of every derivation and
every behaviour reading [[r:target-server-version]], and published as a range a consumer's own
install must satisfy [[d:peer-range-admits-2x-minors]].

Suites sharing a process cannot leak into each other and no reset step exists to forget, because
every fake's state hangs off the world instance a test constructs [[r:instance-scoped-world]]; and
with no runner or assertion library imported [[r:no-test-framework-dependency]], a test's only
observation channel is state it reads back off the fakes [[r:fakes-behave-not-record]].

## The built surface and its edge

Declaring a full shape and behaving across it are different jobs, and the second is bounded. A
member behaves only where a recorded observation says what it does, and every other declared member
is present as a stub that throws [[d:fact-backed-surface-with-not-implemented-stubs]] — the shape
stays complete while the behaviour stays honest, and an unfaked member is a loud failure rather than
an `undefined` a test quietly asserts against [[r:fakes-never-fabricate]]. Every stub throws the one
class the library exports for it, `NotImplementedError extends Error`, carrying the faked class and
member as `className` and `memberName` and a message of the form
`minecraft-test-lib: Entity.getBlockFromViewDirection is not faked.`, a type no engine throw
collides with. Absence is not that kind of failure: where the
engine itself can report nothing — a component an entity does not carry, an attribute reading back
below its minimum — the fake reports the same nothing.

Everything a test needs that the real API has no member for — constructing a world, spawning into
it, invalidating a reference, emitting an event, adding or removing a component on a live entity
[[r:control-plane-component-mutation]] — is an exported function taking a fake as its argument,
never a method bolted onto one [[r:only-real-members-free-functions]]. Those functions are the whole
control plane, and this is its published surface:

```ts
// ids, derived from the pinned declarations rather than transcribed
type EntityComponentId = keyof EntityComponentTypeMap;
type FakedComponentId = {
  [K in EntityComponentId]: EntityComponentTypeMap[K] extends EntityAttributeComponent ? K : never;
}[EntityComponentId];
type EntityTypeId = string;     // namespaced entity id; bare or prefixed on entry

// construction; presets are applied in array order
function createWorldFake(options?: { presets?: WorldPreset[] }): World;
function spawnFake(dimension: Dimension, typeId: EntityTypeId, options?: SpawnFakeOptions): Entity;
function spawnPlayerFake(dimension: Dimension, options?: SpawnFakeOptions): Player;

interface SpawnFakeOptions {
  id?: string;                  // omitted: auto-assigned
  presets?: EntityPreset[];
}

type WorldPreset = (world: World) => void;
type EntityPreset = (entity: Entity) => void;

// component mutation, which no real member performs; every faked component is attribute-shaped
interface AttributeState {
  currentValue?: number;
  defaultValue?: number;
  effectiveMin?: number;
  effectiveMax?: number;
}
type ComponentStateOf<K extends FakedComponentId> =
  EntityComponentTypeMap[K] extends EntityAttributeComponent ? AttributeState : never;

function addComponentFake<K extends FakedComponentId>(
  entity: Entity,
  componentId: K,
  state?: ComponentStateOf<K>,
): EntityComponentTypeMap[K];
function removeComponentFake(entity: Entity, componentId: FakedComponentId): boolean;

// the invalid transition; nothing else performs it
function invalidateFake(target: Entity | Effect): void;

// events with no fake-side cause: the accessor recovers the fake signal behind a declared-typed
// world, and emission goes through that handle
interface FakeAfterSignal<E> {
  subscribe(handler: (event: E) => void): (event: E) => void;
  unsubscribe(handler: (event: E) => void): void;
}
type AfterEventOf<S> = S extends { subscribe(handler: (event: infer E) => void): unknown }
  ? E
  : never;

function afterSignalFake<K extends keyof WorldAfterEvents>(
  world: World,
  event: K,
): FakeAfterSignal<AfterEventOf<WorldAfterEvents[K]>>;
function emitFake<E>(signal: FakeAfterSignal<E>, event: E): void;
```

`removeComponentFake` answers whether the entity carried the component; `invalidateFake` on an
entity carries its components and effects with it. A test never reaches an emittable signal through
`world.afterEvents`, whose declared member type says nothing of emission: `afterSignalFake` takes
the declared-typed world the constructor returned and the event name, and hands back the fake
signal behind it — so emitting costs no cast at the call site and the fakes stay assignable
[[r:structural-full-shape-fakes]].

## Identity, construction, and starting state

Ids normalize once, on entry [[r:canonical-prefixed-storage]], so no read downstream compares two
spellings. Which ids are accepted is not a list the library keeps: the component and attribute id types
come out of the engine's own type map and enums [[d:id-unions-derived-from-declarations]], which
carry exactly that information already [[f:component-ids-are-derivable-from-types]] and carry both
spellings of every component id [[f:namespace-prefix-is-optional]]. An entity type id has no such
map behind it: `EntityTypeId` is a namespaced string, normalized on the same entry path to the
prefixed form the `@minecraft/vanilla-data` constants a test holds already report
[[f:vanilla-data-provides-prefixed-id-constants]].

Spawning takes a type id and returns an entity carrying an id the caller did not choose
[[r:ids-auto-assigned-typeid-required]], shaped like the engine's — a sequential negative integer,
never reissued within a world [[d:engine-shaped-auto-ids]] [[f:entity-ids-not-reused]]. What the new
entity holds is what a preset put there and nothing besides [[r:no-implicit-defaults]], presets
being named at construction and applied in order [[d:opt-in-presets-compose]]. The world is the
exception: its three vanilla dimensions exist from construction with no opt-in
[[d:vanilla-dimensions-on-every-world]]. The trio's membership rests on the pinned declarations —
the `@minecraft/server` dimension ids read off the 2.8.0 `.d.ts` — and on no engine observation. An
id naming none of them fails exactly as the engine fails it
[[f:get-dimension-unknown-id-error]].

## Behaviour taken from the engine

Three clusters carry most of the weight of matching observed behaviour rather than the tidier
behaviour a hand-rolled double would implement [[r:fakes-match-observed-engine-behaviour]].

*Damage and death.* A damaging call fires its events in the observed order with the requested amount
in the payload, and drives health past its minimum into negative values rather than clamping
[[d:applydamage-mirrors-observed-cascade]] [[f:damage-cascade-order-and-payload]]
[[f:health-not-clamped-at-minimum]]; called with no options it carries the default cause `none`
[[f:applydamage-cause-defaults]]. On an entity carrying no health component there is no cascade to
run and none observed, so the call throws the not-implemented error until an observation says
otherwise, rather than guessing a sequence [[r:fakes-never-fabricate]]. Killing is a different path
with a different cause and a different landing point, is idempotent on an already-dead entity, and
degrades to a bare death event when there is no health component to drive
[[f:kill-and-remove-cascades]] [[f:kill-no-health-behaviour]]; removal fires nothing at all.

*Attributes.* Writes through a health component fire their own event without a hurt event, and a
write that lands on the effective minimum kills [[f:component-health-writes-cascade]]. A write
outside the bounds is rejected with the engine's error and the engine's message, and the bounds
themselves are inclusive [[f:set-current-value-bounds-observed]].

*Effects.* Adding an effect returns the resulting effect object in both the new and the updated case
[[f:addeffect-returns-the-effect]], defaults its amplifier [[f:effect-amplifier-defaults-to-zero]],
and replaces an effect already present only under the observed amplifier-first rule — so a re-add
that loses the comparison leaves the original ticking untouched, which is the case a naive double
gets wrong [[f:effect-replacement-rule-observed]]. The
amplifier is the only default: no observation records what a duration falls back to, so the fake
supplies none and every entry point that creates an effect requires one from the caller and stores
it as passed [[r:fakes-never-fabricate]].

## Validity

The invalid state is reachable mid-test, on a reference the test already holds, and only through the
control plane's call [[r:invalidation-is-modeled]]
[[d:invalidation-only-through-the-control-plane]]. What that state does is not uniform and
is not readable off the declarations, whose annotations under-report which members throw: the guard
table is transcribed from the observed enumeration and everything outside it throws
[[d:observed-guard-table-not-annotations]] [[f:invalidation-guard-list-complete]]. Owned objects
follow their owner with errors of their own kinds — an attribute component throws the invalidation
error from the members whose annotations name it and a bare error from the rest
[[f:attribute-guard-classes-observed]], and an effect's value members throw a bare error whether the
effect was removed or its owner unloaded [[f:effect-members-throw-plain-error]]. The guard outranks
the stub: a member that is both unfaked and reached on an invalidated owner throws the invalidation
error rather than the not-implemented one, which is what the engine shows for every member outside
the readable four [[f:invalidation-guard-list-complete]].

Because the invalidation error and every other engine error are declarations with no runtime behind
them [[f:invalid-entity-error-shape]] [[f:server-package-ships-types-only]], the library ships its own classes carrying the declared fields
and the observed messages, and throws a bare error where the engine throws one
[[d:reimplemented-engine-errors]] — a test that discriminates on constructor identity or on message
text sees what production would show it.

## Events

Inline delivery is this design's one deliberate departure from the engine
[[r:synchronous-event-delivery]], which defers past the mutating call's return but stays inside the
tick [[f:after-events-deferred]] [[f:after-event-deferral-subtick]]. Registration and ordering are
not departures — the fake matches the engine there
[[d:synchronous-dispatch-in-subscription-order]] [[f:subscription-semantics-observed]] — and a
throwing handler is not isolated, so the events later in a cascade go undelivered and the mutating
call itself throws [[d:handler-exceptions-propagate]].

## Components

```yaml
components:
  - id: package-scaffold
    responsibility: the package, its build and type configuration, and the pinned peer dependency
    excludes: any faked behaviour of its own, and the export barrel naming what ships
  - id: engine-errors
    responsibility: runtime error classes and message builders mirroring the engine's throws, plus the not-implemented thrower every stub member calls
    excludes: deciding which members throw
    after: [package-scaffold]
  - id: id-normalization
    responsibility: the derived id types and the entry-point normalization that stores and reports the prefixed form
    excludes: validating that an id names something the fake world holds
    after: [package-scaffold]
  - id: event-signals
    responsibility: the after-event signal classes in their full declared shape — subscription registration, inline dispatch in subscription order, and the stub members of each signal
    excludes: knowing which state change emits which event
    after: [package-scaffold]
  - id: validity-guard
    responsibility: the invalid state, the transcribed guard table, and the wrapping that makes a guarded member throw for entities, components, and effects
    excludes: exposing the transition to tests
    after: [engine-errors]
  - id: world-and-dimension
    responsibility: the world and dimension fakes in their full declared shape — the entity registry, id assignment, dimension resolution, the WorldAfterEvents shape wiring each signal onto the world, and both classes' stub surface
    excludes: entity behaviour beyond registration, and the dispatch semantics of the signals it hangs
    after: [id-normalization, event-signals]
  - id: entity-fake
    responsibility: the entity and player fakes — stored state including the dead/alive flag, component lookup, and the full stub surface
    excludes: attribute and effect semantics, and every rule for when the flag flips
    after: [validity-guard, world-and-dimension]
  - id: attribute-components
    responsibility: the attribute component fakes, bounds enforcement, and the events a health write emits — including the write that reaches the minimum, which sets the entity's dead flag
    excludes: the damage path
    after: [entity-fake]
  - id: effect-model
    responsibility: the effect and effect-type fakes in their full declared shape — the amplifier default, caller-supplied durations, the replacement rule, and both classes' stub surface
    excludes: effect-driven attribute changes
    after: [entity-fake]
  - id: lifecycle-cascades
    responsibility: damage, kill, and removal — their event sequences, payloads, and resulting health
    excludes: bounds enforcement and the events a direct attribute write emits
    after: [attribute-components]
  - id: control-plane
    responsibility: the exported free functions — world construction, spawning, presets, component add and remove, invalidation, signal lookup, and event emission
    excludes: any behaviour reachable through a real member
    after: [entity-fake, attribute-components, effect-model, lifecycle-cascades]
  - id: public-surface
    responsibility: the export barrel naming everything the package ships, and the compile-only conformance suite that proves each fake assignable to its declared type
    excludes: any faked behaviour of its own
    after: [control-plane, world-and-dimension]
```
