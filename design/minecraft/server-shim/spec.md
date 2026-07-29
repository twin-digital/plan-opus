# `@twin-digital/minecraft-server-shim`

## Summary

This design specifies the module a pack author aliases over `@minecraft/server` in their test
runner's configuration, so that unmodified behavior-pack code loads and runs under test. Its
product is one published package: the enum and constant values a pack imports, a stand-in for every
class the engine declares so that `instanceof` answers, and the module-scope `world` and `system`
bindings a test points at its own fakes. The problem it answers sits before any fake can be used —
the published `@minecraft/server` package has no entry point, so a module importing a value from it
cannot be resolved by a runner at all, and the test library deliberately does not intercept that
import. The constraint that shapes everything below is that the shim carries mutable module state
that must be one instance for every route into it: the pack's import, the test's control calls, and
the type checker's view all have to arrive at the same module.

## Open questions

```yaml
questions:
  - id: alias-and-control-entry-are-one-module-instance
    question: >-
      does a runner alias from `@minecraft/server` to the shim resolve to the same module instance
      that an ordinary import of the shim's `./control` subpath reaches, so a test's
      `__useServer` call is seen by the pack's import?
    closes: fact
    gates: [control-surface-is-a-real-subpath]
```

## What a consumer installs

The consumer adds `@twin-digital/minecraft-server-shim` as a dev dependency and one alias entry to
their runner config, mapping the specifier `@minecraft/server` to the bare specifier
`@twin-digital/minecraft-server-shim`. Under vitest that entry is `resolve.alias`. Nothing else
changes: no pack source is edited, no setup file is registered, and no `tsconfig` entry is added
[[r:unmodified-pack-code-loads-under-test]].

That single entry is the whole install, and it ships as a documented snippet in the package README
rather than as a helper the shim exports [[d:install-is-a-documented-snippet]]. A test then does two
things in `beforeEach`: construct a server with whatever library it is using, and hand it to the
shim.

```ts
import { __useServer } from '@twin-digital/minecraft-server-shim/control'
import { createServer } from '@twin-digital/minecraft-test-lib'

beforeEach(() => { __useServer(createServer()) })
```

The alias is what makes the pack's own `import { world, EntityDamageCause } from '@minecraft/server'`
resolve. Without it the suite does not fail a test, it fails to start: `@minecraft/server` 2.8.0
publishes no `main`, `module`, `types` or `exports` key, so node reports `ERR_MODULE_NOT_FOUND` and
vitest reports `Failed to resolve entry for package "@minecraft/server"` before any test code runs
[[f:server-import-fails-without-an-alias]]. Removing the alias must put a consumer's suite back to
exactly that failure; that is the check that the shim, and not something else, is carrying the
import.

## The values the shim supplies

The shim exports every `export enum` the pinned `@minecraft/server` declarations carry — on 2.8.0
that is 64 enums and 476 members — as frozen objects whose members hold the declared literal values,
plus the five module-level numeric constants those declarations export: `HudElementsCount` 13,
`HudVisibilityCount` 2, `MoonPhaseCount` 8, `TicksPerDay` 24000, and `TicksPerSecond` 20
[[d:generated-values-cover-declared-constants]] [[f:engine-surface-outside-instances]].

None of these values is hand-written. They are extracted from the `index.d.ts` of the
`@minecraft/server` version the shim pins as a dev dependency — 2.8.0 — by a generator in the
repository, which writes `src/generated/values.ts` and `src/generated/classes.ts`
[[r:enum-values-come-from-the-pinned-declarations]]. Generation runs at author time and its output is
committed; `npm run generate` followed by a clean-tree check is a CI step, so a declarations bump
that changes the values fails the build until the generated files are regenerated
[[d:values-are-generated-and-committed]]. The extraction itself is settled ground rather than a
guess: the same script reproduces the validation harness's generated module byte for byte from
2.8.0's declarations, reading the shipped CRLF file and quoting members whose names are reserved
words [[f:alias-shim-runs-unmodified-pack-code]]. Nothing else in the family closes this gap —
`@minecraft/vanilla-data` is the one package that ships runtime JavaScript, and it exports 12 id
namespaces and no API enum [[f:vanilla-data-ships-no-api-enums]].

The version the values came from is stated in two places and enforced in neither: the package
exports `__serverVersion`, the string `'2.8.0'`, from its control entry, and the README names it.
The shim performs no runtime comparison against whatever `@minecraft/server` the consumer has
installed and emits no warning [[d:version-statement-is-inert]]. What does tell a mismatched
consumer is the package manager: the shim declares `@minecraft/server` as a peer dependency at
`^2.8.0`, so a pack pinning a 1.x range gets an install-time peer warning and nothing at run time
[[d:pinned-version-is-declared-as-a-peer-range]].

A name the pinned declarations do not declare is simply not exported. There is no `Proxy`, no
auto-vivified stub, and no fallback value: importing an undeclared name fails the way a missing
export normally fails [[d:undeclared-exports-stay-absent]].

## Classes and `instanceof`

Every class the pinned declarations export is exported by the shim — all of them, generated from the
same pass over `index.d.ts`, so any class a pack imports resolves [[d:every-declared-class-is-exported]].
What each export *is* depends on whether it is an error type. A declared class whose ancestry reaches
`Error` — `InvalidEntityError` and its siblings — is emitted as a real class extending `Error` that
sets `name` to its own class name, so a test can construct and throw one; the declared readonly
members it carries are the thrower's to populate, not the shim's
[[d:declared-error-classes-are-real-classes]] [[f:invalid-entity-error-shape]]. Every other class is
an object carrying a `Symbol.hasInstance` implementation and nothing else.

`instanceof` answers from a nominal brand and from nothing else. The shim reads the well-known
symbol `Symbol.for('@twin-digital/minecraft-server-shim.classes')` off the value; the property holds
an iterable of class-name strings. `value instanceof Player` is true when that iterable contains
`Player`, or contains any class the pinned declarations declare as a descendant of `Player` — the
generator emits the declared `extends` chain into `src/generated/classes.ts`, so a value branded
`Player` also satisfies `instanceof Entity` [[d:instanceof-answers-only-to-the-brand]]. An error
class answers the same brand check, or a genuine prototype-chain match for an instance the test
constructed. A value branded with a different class name answers false, which is what a pack's
`attacker instanceof Player` guard needs in order to fall through
[[r:instanceof-answers-for-a-fake]].

The brand is a protocol, not a dependency. `Symbol.for` reads from the global registry, so anything
that fakes the engine — `@twin-digital/minecraft-test-lib` or a consumer's own double — can satisfy
the shim's `instanceof` by setting that property, with no import of the shim and no import of the
library by the shim [[d:shim-cooperates-through-a-registered-brand-symbol]]. The library commits, as
its own fiat, to not intercepting the module import, so it is not the thing that makes this work
[[f:test-lib-does-not-intercept-the-module-import]]; the shim's job is to be usable by it without
being tied to it. For a fake that carries no brand at all, the shim's control entry exports
`brandAs(value, ...classNames)`, which sets the property and returns the value, so a test can brand
its own doubles in one call and satisfy the requirement without any change to the library.

For a real engine object the answer is false. A real object carries no brand, and the shim's classes
declare no other check — the engine's own classes have no private members or brand fields to test
for, and a valid and an invalidated `Entity` are structurally identical, so no member check
distinguishes reliably [[f:server-classes-are-structurally-assignable]]
[[f:entity-shape-is-identical-valid-or-invalid]]. Answering false is safe because the case does not
arise: the alias exists only in a runner's configuration, so a process holding a real engine object
never resolved `@minecraft/server` to the shim in the first place
[[d:instanceof-answers-only-to-the-brand]].

## The module singletons and the control surface

The shim exports `world` and `system` as mutable module-scope bindings — `export let` — because that
is how most packs reach the engine, and because a live binding is what lets a pack that captured
neither at import time read the current one at call time. `system` scheduling alone is reached by 84%
of surveyed public packs [[f:public-packs-reach-past-entities-and-events]].

`__useServer(server)` points both bindings at `server.world` and `server.system`. It takes any object
carrying those two properties — the library's `createServer()` result satisfies it structurally, and
so does an object literal a consumer assembles — and the shim imports no type from any library to
say so.

The same call is the reset [[d:install-call-is-the-reset]]. Installing replaces both bindings
wholesale, so a test that installs a fresh server starts from what it installed; `__useServer()` with
no argument returns them to the unset state. Reading either binding while unset throws
`ShimNotInstalledError`, rather than reading `undefined` and letting the failure surface later as a
property access on nothing [[d:unset-singletons-throw]]. The message is
`no server installed — call __useServer(server) before the code under test runs`. Together these are
what make a test see its own world and carry nothing over from the previous one
[[r:module-singletons-are-test-controlled]].

That is the whole of what the shim does at run time. It holds two bindings, a brand table, and a set
of generated constants; it models no engine behaviour, dispatches no event, and stores no state of
its own beyond the two bindings. Every behaviour a test observes comes from the server object the
test installed [[r:shim-supplies-values-not-behaviour]].

## Typing

`tsc` never follows a runner's alias, so a pack's own `import { Player } from '@minecraft/server'`
typechecks against the real `index.d.ts`, which the package does ship — it is a declarations-only
package, which is exactly why the runtime import fails and the type check does not
[[f:server-package-ships-types-only]]. That half needs no design and no consumer configuration.

The half that does is the test file, which imports a control surface `@minecraft/server`'s
declarations do not declare. The shim answers it by putting that surface on a specifier that really
exists: `@twin-digital/minecraft-server-shim/control`, a published subpath exporting `__useServer`,
`brandAs`, `ShimNotInstalledError` and `__serverVersion`, with its own declarations
[[d:control-surface-is-a-real-subpath]]. Because a test imports the control surface by its own name
rather than from the aliased specifier, `tsc` resolves it by ordinary node resolution and the
consumer adds no `paths` entry to any `tsconfig`. A TypeScript consumer's suite therefore typechecks
with no cast and no `any` on either half [[r:a-consumer-suite-still-typechecks]].

This turns on the control subpath and the aliased module being one module instance at run time; if a
runner resolves them to two, the test's `__useServer` writes bindings the pack never reads. The
package's own module graph keeps them together — `./control` re-exports from the package root — so
the risk is entirely in how a runner resolves the alias, which is the open question above. The
documented fallback, should a runner resolve them apart, is the shape one surveyed pack already
uses: alias to the shim's resolved entry *file* and add a `paths` entry in a `tsconfig.test.json`
pointing `@minecraft/server` at that same file's declarations. Ship the bare-specifier recipe;
document the fallback beside it.

## Module format and reach

The shim publishes ESM only. Its contract is a single shared mutable module instance, and dual
publishing makes instance identity depend on which resolver reached the package: a CJS copy and an
ESM copy loaded in one process are two modules with two `world` bindings, and a test could install
into one while the pack reads the other. That hazard, not the build cost, is the reason a second
format is not worth its reach [[d:esm-only-single-format]].

Vitest is the runner the shim covers: its install recipe is documented and its own conformance suite
runs there. That is also the only runner with evidence behind it — the validation harness exercised
vitest and ESM, and no jest, bun or CJS consumer was run [[f:alias-shim-runs-unmodified-pack-code]].
Recipes for bun's `mock.module` and for jest in ESM mode with a `moduleNameMapper` entry ship in the
README, marked as untested, and neither appears in the shim's test matrix. The cost of that choice is
stated rather than hidden: a jest consumer running in CJS mode cannot use the shim at all, and a bun
or jest-ESM consumer is following a recipe nobody here has run [[d:vitest-is-the-covered-runner]].

## Packaging

One package, `@twin-digital/minecraft-server-shim`, written in TypeScript, shipping its own type
declarations, targeting active Node LTS with `engines.node` `>=22`
[[d:package-identity-and-runtime-target]]. It has two entry points and no more: `.`, the module a
consumer aliases, and `./control`. It depends on no test framework and on no fake library at run
time; `@minecraft/server` is a peer dependency and a dev dependency, present only so the generator
has declarations to read [[d:one-package-one-aliasable-module]]. A consumer who wants nothing but the
enum values takes the same package and imports them; there is no separate values-only package,
because the runtime cost of the rest is a brand table and two bindings.

A second `@minecraft/*` module — `server-ui`, `server-net` — is out of this cycle. When one is
wanted, it is a second generated module and a second alias entry under the same package, built by the
same generator against the same pinned family.

## The shim's own suite

The package's tests are what hold the two requirements a consumer cannot check for themselves. They
cover, at minimum: a fixture pack module importing an enum member and a class, loaded through the
alias unmodified and driven through the singletons; the control run with the alias removed, asserting
the resolution failure returns; `instanceof` answering true for a branded fake, true for a branded
subclass against its declared ancestor, and false for a fake branded as a different class; a read of
`world` before install throwing `ShimNotInstalledError`; and a typecheck of a TypeScript test file
that imports the control surface, run as part of the build.

## Components

```yaml
components:
  - id: values-generator
    responsibility: >-
      emit src/generated/values.ts and src/generated/classes.ts from the pinned
      @minecraft/server index.d.ts — enums, module constants, and the declared class list with each
      class's extends chain
    excludes: any runtime behaviour of the emitted values
  - id: class-brands
    responsibility: >-
      the registered brand symbol, brandAs, and the Symbol.hasInstance implementation that answers
      instanceof over the generated class table, plus the real Error subclasses
    excludes: deciding what a fake's shape is
    after: [values-generator]
  - id: module-singletons
    responsibility: >-
      the live world and system bindings, __useServer as install and reset, and
      ShimNotInstalledError on an unset read
    excludes: any state beyond the two bindings
  - id: control-entry
    responsibility: the ./control subpath, its exports and its declarations
    after: [class-brands, module-singletons]
  - id: package-and-recipes
    responsibility: >-
      the manifest — name, exports map, peer range, engines — and the README install recipes for
      vitest, bun and jest-ESM
    after: [control-entry]
  - id: conformance-suite
    responsibility: >-
      the fixture pack loaded through the alias, the no-alias control, the instanceof and unset-read
      cases, and the typecheck of a consumer-shaped test file
    after: [package-and-recipes]
```
