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
  - id: post-death-invalidation-without-ticks
    question: >-
      the engine invalidates some entities immediately on death and keeps others valid for
      several ticks; a tickless fake can reproduce the immediate case but not the delayed one,
      so may removal and death leave every reference valid until a test invalidates it?
    closes: requirement
    gates: [invalidation-only-through-the-control-plane]
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
declarations fails the build the moment a member is missing, so completeness needs no generator and
no reviewer. The pin is a single version everywhere, read as the source of every derivation and
every behaviour reading [[r:target-server-version]], and published as a range a consumer's own
install must satisfy [[d:peer-range-admits-2x-minors]].

Every fake's state hangs off a world instance a test constructs, with nothing at module level
[[r:instance-scoped-world]], so suites running in one process cannot leak into each other and no
reset step exists to forget. Nothing in the package imports a runner or an assertion library
[[r:no-test-framework-dependency]]: what a test observes is state it reads back off the fakes
[[r:fakes-behave-not-record]], which is a property of the fakes' own behaviour rather than of any
harness wrapped around them.

## The built surface and its edge

Declaring a full shape and behaving across it are different jobs, and the second is bounded. A
member behaves only where a recorded observation says what it does, and every other declared member
is present as a stub that throws [[d:fact-backed-surface-with-not-implemented-stubs]] — the shape
stays complete while the behaviour stays honest, and an unfaked member is a loud failure rather than
an `undefined` a test quietly asserts against [[r:fakes-never-fabricate]]. Absence is not that kind
of failure: where the engine itself can report nothing — a component an entity does not carry, an
attribute reading back below its minimum — the fake reports the same nothing.

Everything a test needs that the real API has no member for — constructing a world, spawning into
it, invalidating a reference, emitting an event, adding or removing a component on a live entity —
is an exported function taking a fake as its argument, never a method bolted onto one
[[r:only-real-members-free-functions]]. The boundary keeps the fakes assignable and keeps a test's
setup visibly distinct from the code path under test. Component mutation belongs on that side
because the real API has no member for it [[r:control-plane-component-mutation]].

## Identity, construction, and starting state

Every id-taking parameter accepts the bare or the prefixed spelling and stores the prefixed one
[[r:canonical-prefixed-storage]], normalizing once on entry so that no read has to compare both
forms. Which ids are accepted is not a list the library keeps: the component, attribute, and entity
id types come out of the engine's own type map and enums [[d:id-unions-derived-from-declarations]],
which carry exactly that information already [[f:component-ids-are-derivable-from-types]] and carry
both spellings of every component id [[f:namespace-prefix-is-optional]].

Spawning takes a type id and returns an entity carrying an id the caller did not choose
[[r:ids-auto-assigned-typeid-required]], shaped like the engine's — a descending negative integer,
never reissued within a world [[d:engine-shaped-auto-ids]] [[f:entity-ids-not-reused]]. What the new
entity holds is only what was asked for [[r:no-implicit-defaults]]; a bare entity has no health, no
effects, and no tags, and a populated one is built by naming presets at construction
[[d:opt-in-presets-compose]]. The world is the exception: its three vanilla dimensions exist from
construction with no opt-in [[d:vanilla-dimensions-on-every-world]], because a world that could not
resolve them would be reporting an absence the engine cannot exhibit — and an id naming no dimension
fails exactly as the engine fails it [[f:get-dimension-unknown-id-error]].

## Behaviour taken from the engine

The fakes reproduce what the engine was observed to do, quirks included, rather than the tidier
behaviour a hand-rolled double would implement [[r:fakes-match-observed-engine-behaviour]]. Three
clusters carry most of that weight.

*Damage and death.* A damaging call fires its events in the observed order with the requested amount
in the payload, and drives health past its minimum into negative values rather than clamping
[[d:applydamage-mirrors-observed-cascade]] [[f:damage-cascade-order-and-payload]]
[[f:health-not-clamped-at-minimum]] [[f:applydamage-cause-defaults]]. Killing is a different path
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
gets wrong [[f:effect-replacement-rule-observed]] [[f:effect-readd-not-unconditional]].

## Validity

A test can put an entity into the state a stale engine reference is in, at any point, on a reference
the test is already holding [[r:invalidation-is-modeled]]. What that state does is not uniform and
is not readable off the declarations, whose annotations under-report which members throw: the guard
table is transcribed from the observed enumeration and everything outside it throws
[[d:observed-guard-table-not-annotations]] [[f:invalidation-guard-list-complete]]. Owned objects
follow their owner with errors of their own kinds — an attribute component throws the invalidation
error from the members whose annotations name it and a bare error from the rest
[[f:attribute-guard-classes-observed]], and an effect's value members throw a bare error whether the
effect was removed or its owner unloaded [[f:effect-members-throw-plain-error]]. Nothing the fakes
do triggers the transition on their own [[d:invalidation-only-through-the-control-plane]].

Because the invalidation error and every other engine error are declarations with no runtime behind
them [[f:invalid-entity-error-shape]], the library ships its own classes carrying the declared fields
and the observed messages, and throws a bare error where the engine throws one
[[d:reimplemented-engine-errors]] — a test that discriminates on constructor identity or on message
text sees what production would show it.

## Events

After-events are delivered inline, within the call that caused them, and a test reads the event and
the resulting state with no tick to wait for [[r:synchronous-event-delivery]]. This is the design's
one deliberate departure from the engine, which defers delivery past the mutating call's return but
still inside the tick [[f:after-events-deferred]] [[f:after-event-deferral-subtick]]; a fake with no
tick loop has nothing to defer into, and the cost is that code following a mutating call runs after
its handlers rather than before them. Registration and ordering are not departures: subscribing one
function twice delivers to it once, and distinct subscribers run in the order they subscribed
[[d:synchronous-dispatch-in-subscription-order]] [[f:subscription-semantics-observed]]. A handler
that throws takes the dispatching call down with it [[d:handler-exceptions-propagate]], since
swallowing the error would hide the failure the test is usually there to catch.

## Components

```yaml
components:
  - id: package-scaffold
    responsibility: the package, its build and type configuration, the pinned peer dependency, and the compile-only conformance suite that proves each fake assignable to its declared type
    excludes: any faked behaviour of its own
  - id: engine-errors
    responsibility: runtime error classes and message builders mirroring the engine's throws, plus the not-implemented thrower every stub member calls
    excludes: deciding which members throw
    after: [package-scaffold]
  - id: id-normalization
    responsibility: the derived id types and the entry-point normalization that stores and reports the prefixed form
    excludes: validating that an id names something the fake world holds
    after: [package-scaffold]
  - id: event-signals
    responsibility: the after-event signal classes, subscription registration, and inline dispatch in subscription order
    excludes: knowing which state change emits which event
    after: [package-scaffold]
  - id: validity-guard
    responsibility: the invalid state, the transcribed guard table, and the wrapping that makes a guarded member throw for entities, components, and effects
    excludes: exposing the transition to tests
    after: [engine-errors]
  - id: world-and-dimension
    responsibility: the world and dimension fakes, the entity registry, id assignment, and dimension resolution
    excludes: entity behaviour beyond registration
    after: [id-normalization, event-signals]
  - id: entity-fake
    responsibility: the entity and player fakes — stored state, component lookup, and the full stub surface
    excludes: attribute and effect semantics
    after: [validity-guard, world-and-dimension]
  - id: attribute-components
    responsibility: the attribute component fakes, bounds enforcement, and the events a health write emits
    excludes: the damage path
    after: [entity-fake]
  - id: effect-model
    responsibility: the effect and effect-type fakes, amplifier and duration defaults, and the replacement rule
    excludes: effect-driven attribute changes
    after: [entity-fake]
  - id: lifecycle-cascades
    responsibility: damage, kill, and removal — their event sequences, payloads, and resulting health
    after: [attribute-components]
  - id: control-plane
    responsibility: the exported free functions — world construction, spawning, presets, component add and remove, invalidation, and event emission
    excludes: any behaviour reachable through a real member
    after: [entity-fake, attribute-components, effect-model, lifecycle-cascades]
```
