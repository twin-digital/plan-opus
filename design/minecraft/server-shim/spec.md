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

## What a consumer installs

The consumer adds `@twin-digital/minecraft-server-shim` as a dev dependency and one alias entry to
their runner config, mapping the specifier `@minecraft/server` to the bare specifier
`@twin-digital/minecraft-server-shim`. Under vitest that entry is `resolve.alias`. Nothing else
changes: no pack source is edited, no setup file is registered, and no `tsconfig` entry is added
[[r:unmodified-pack-code-loads-under-test]].

That single entry is the whole of the *runner configuration*, and it ships as a documented snippet in
the package README rather than as a helper the shim exports [[d:install-is-a-documented-snippet]]. The
test file, though, is not free-form, because the shim carries an ordering contract (below). A test
does two things in `beforeEach` — construct a server with whatever library it is using, hand it to the
shim — and reaches the pack module only afterwards:

```ts
import { __useServer } from '@twin-digital/minecraft-server-shim/control'
import { createServer } from '@twin-digital/minecraft-test-lib'

beforeEach(() => { __useServer(createServer()) })

it('reacts to a hit', async () => {
  const { onHit } = await import('../src/combat-handler.js')
  // …
})
```

### The pack module may not be imported before the install

A behavior pack's entry module does its work at module scope: `world.afterEvents.entityHurt.subscribe(…)`
and `system.runInterval(…)` run while the module is evaluating, not when a function is called. A
static `import` of that module at the top of a test file is evaluated before any `beforeEach` runs, so
it would touch the singletons before a server was installed and take the whole file down at collection
rather than failing one test [[d:unset-singletons-throw]].

The contract is therefore: **a server is installed before the pack module evaluates.** The shipped
shape is a dynamic `await import(…)` of the pack module inside the test, after `__useServer`
[[d:pack-module-loads-after-install]]. A module is evaluated once per registry, so a pack that
subscribes at module scope registers its handlers against whichever server was installed at that first
evaluation. A test that needs a fresh subscription per test calls `vi.resetModules()` first and then
re-imports **both** entries dynamically, control before pack — a reset registry yields a fresh internal
state module, and the `__useServer` a static import bound at the top of the file writes to the old one.

The brief's "one entry to their runner config" holds for the resolution half and does not hold for the
test file: the archetypal pack, which subscribes at module scope, costs the consumer a dynamic import
and, where per-test isolation is wanted, a `resetModules` prelude. A setup file that installed a
default server would move that cost into configuration, but it would install a server no test chose,
which is the state `__useServer` exists to keep out of a test.

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
[[r:enum-values-come-from-the-pinned-declarations]]. `values.ts` carries one named export per enum and
one per module constant — `export const GameMode = Object.freeze({ … })`, `export const TicksPerDay = 24000`
— because that is the shape the root entry re-exports and a pack's `import { GameMode }` needs; there
is no umbrella record. Generation runs at author time and its output is
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
`^2.8.0`, with no `peerDependenciesMeta` entry [[d:pinned-version-is-declared-as-a-peer-range]].

What that costs is not a warning everywhere. Against a consumer pinned to `^1.17.0`, npm 11.13.0 exits
1 with `ERESOLVE unable to resolve dependency tree` and installs nothing at all — neither the shim nor
the server package — so a 1.x consumer on npm cannot install the shim, and there is no run time for a
warning to reach. pnpm 11.17.0 and yarn 1.22.22 exit 0, install the consumer's 1.x resolution beside
the shim, and report the mismatch as a warning; the shim imports cleanly afterwards
[[f:an-unsatisfiable-peer-range-fails-npm-and-warns-pnpm-and-yarn]]. Marking the peer
`optional` is not the escape: `optional` covers a peer that is *absent*, not one present at a
conflicting version, so npm still exits 1 against a `peerOptional` edge, pnpm's warning and
`pnpm peers check` are unchanged, and the only thing it buys is suppressing yarn classic's warning —
which is the one signal worth keeping. So it is left off.

The README states this outright: the supported answer for a 1.x consumer is to move
`@minecraft/server` into the 2.x range, because the values the shim supplies are 2.8.0's and would be
wrong for them either way. A hard install failure is the intended shape of that message on npm.

The same fact carries a trap for the shim's own suite: where the shim reaches `node_modules` through a
`file:` spec pointing at a source directory, npm installs it silently, exit 0, the peer range
unenforced, while the same manifest delivered as an `npm pack` tarball fails
[[f:an-unsatisfiable-peer-range-fails-npm-and-warns-pnpm-and-yarn]]. Any check of the peer range
installs a packed tarball; a `file:` install proves nothing about it.

A name the pinned declarations do not declare is simply not exported. There is no `Proxy`, no
auto-vivified stub, and no fallback value: importing an undeclared name fails the way a missing
export normally fails [[d:undeclared-exports-stay-absent]].

## Classes and `instanceof`

Every class the pinned declarations export is exported by the shim — all of them, generated from the
same pass over `index.d.ts`, so any class a pack imports resolves [[d:every-declared-class-is-exported]].
What each export *is* depends on whether it is an error type. A declared class whose ancestry reaches
`Error` — `InvalidEntityError` and its siblings — is emitted as a real class extending `Error` whose
constructor takes the ordinary `(message?: string)` and sets `name` to its own class name, so a test
can construct and throw one. Its declared readonly members are left unset; a thrower who wants one
populated assigns it on the instance after construction
[[d:declared-error-classes-are-real-classes]] [[f:invalid-entity-error-shape]]. Every other class is a
plain object carrying a `Symbol.hasInstance` implementation and its constant statics; it is not
callable, so `new Player()` is a `TypeError`.

### The statics a class carries

A class export that carries only `Symbol.hasInstance` is short of what a pack imports it for. The
pinned declarations put 112 static members on the 439 exported classes, and the largest group is
values, not behaviour: 86 `static readonly componentId` strings, one per component class
[[f:engine-surface-outside-instances]]. `entity.getComponent(EntityHealthComponent.componentId)` is
how a pack asks for a component, and against a class object without it the pack passes `undefined` and
gets nothing back, with no error to read. A `componentId` is a constant string in `index.d.ts` — the
kind of thing a module import must carry [[r:shim-supplies-values-not-behaviour]] — so the generator
emits it, along with the four other literal statics the declarations carry
(`AimAssistRegistry.DefaultCategoryId`, `AimAssistRegistry.DefaultPresetId`,
`FluidContainer.maxFillLevel` 6, `FluidContainer.minFillLevel` 0), as own properties of the exported
class object [[d:constant-statics-are-emitted-onto-the-classes]].

The remaining 22 are methods that perform a lookup: the `get`/`getAll` pairs on the eight registry
classes, five on `Potions`, and `BlockPermutation.resolve` — the only way to obtain a
`BlockPermutation`, whose constructor is private [[f:engine-surface-outside-instances]]. A shim cannot
answer these without modelling a registry, which is exactly what it does not do
[[r:shim-supplies-values-not-behaviour]], and leaving them off turns
`BlockPermutation.resolve('minecraft:stone')` into `resolve is not a function`. So each is emitted as a
function that throws `ShimUnsupportedError`, whose message names the member and says that the shim
supplies no registry and the test's own server must stand in for it
[[d:behavioural-statics-throw-unsupported]]. `ShimUnsupportedError` is exported from the control
subpath beside `ShimNotInstalledError`.

`instanceof` answers from a nominal brand and from nothing else. The shim reads the well-known
symbol `Symbol.for('@twin-digital/minecraft-server-shim.classes')` off the value; the property holds
an iterable of class-name strings. `value instanceof Player` is true when that iterable contains
`Player`, or contains any class the pinned declarations declare as a descendant of `Player` — so a value branded
`Player` also satisfies `instanceof Entity` [[d:instanceof-answers-only-to-the-brand]]. The ancestry is
generated rather than walked at run time: `src/generated/classes.ts` exports `classAncestry`, a record
from each declared class name to its self-inclusive ancestor list — the class first, then each declared
ancestor outward, `Error` included where the chain reaches it — so `instanceof C` is the test
`classAncestry[b]?.includes(C)` over the value's branded names `b`, and the error classes are exactly
those whose list contains `Error` [[d:class-table-is-a-self-inclusive-ancestry-record]]. An error
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
`brandAs(value, ...classNames)`, which returns the value, so a test can brand its own doubles in one
call and satisfy the requirement without any change to the library.

Three things about `brandAs` a consumer can tell apart, and so are fixed here
[[d:brandas-unions-and-rejects-unknown-classes]]. It **unions**: a value branded `Player` and then
branded `Entity` carries both, and stays a `Player`, because a second call narrowing a fake's identity
by surprise is the failure a test would spend an afternoon on. It **rejects an undeclared name**: a
class name `classAncestry` does not hold throws a `TypeError` naming it, since a typo'd brand would
otherwise leave `instanceof` quietly false forever, which is the silence
[[r:instanceof-answers-for-a-fake]] is there to prevent. And it writes the property with
`Object.defineProperty` as non-enumerable, writable and configurable, so the brand does not appear in
a fake's `Object.keys` or spread and a later call can extend it; on a frozen value the define throws,
so a fake that is frozen is branded before it is frozen.

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
no argument returns them to the unset state. Together these are what make a test see its own world and
carry nothing over from the previous one [[r:module-singletons-are-test-controlled]].

### How the unset state throws

An unset binding must fail loudly rather than read `undefined` and surface later as a property access
on nothing [[d:unset-singletons-throw]]. A live ESM binding has no read hook — a namespace property
cannot be an accessor — so the throw cannot fire on the read itself. What the unset state holds instead
is a sentinel `Proxy` over an empty object, every trap of which — `get`, `set`, `has`, `deleteProperty`,
`ownKeys`, `getOwnPropertyDescriptor`, `apply`, `construct` — throws `ShimNotInstalledError` with the
message `no server installed — call __useServer(server) before the code under test runs`
[[d:unset-bindings-hold-a-throwing-proxy]]. `__useServer(server)` overwrites both bindings with
`server.world` and `server.system`; `__useServer()` puts the two sentinels back.

What that is observably, and what a builder must not promise instead: `world` is **not** `undefined`,
`typeof world` is `'object'`, `world == null` is false, and a truthiness guard on it passes. The throw
fires on the first property touch — `world.getDimension('overworld')`, `system.runInterval(fn, 1)`,
`'afterEvents' in world` — which is where pack code touches it, and at module scope that is during
import, which is what the load-order contract above exists to keep behind the install. Destructuring
`const { getDimension } = world` is a property read and throws; binding `const w = world` alone does
not.

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
`brandAs`, `ShimNotInstalledError`, `ShimUnsupportedError` and `__serverVersion`, with its own
declarations [[d:control-surface-is-a-real-subpath]]. Because a test imports the control surface by its own name
rather than from the aliased specifier, `tsc` resolves it by ordinary node resolution and the
consumer adds no `paths` entry to any `tsconfig`. A TypeScript consumer's suite therefore typechecks
with no cast and no `any` on either half [[r:a-consumer-suite-still-typechecks]].

This turns on the control subpath and the aliased module being one module instance at run time; if a
runner resolves them to two, the test's `__useServer` writes bindings the pack never reads. The
package's module graph is what keeps them together: neither entry re-exports from the other — the root
must not carry `__useServer`, or the control surface would be extra exports of the aliased specifier,
which is what `./control` exists to avoid [[d:control-surface-is-a-real-subpath]] — so both entries
re-export from one internal module, `src/state.ts`, which holds the two bindings, `__useServer`, and
the shim's error classes. The root takes `world` and `system` from it; `./control` takes `__useServer`
and the errors from it, and `brandAs` — which holds no state — from the brands module
[[d:both-entries-re-export-one-internal-module]].

That shape is measured, not hoped for. Under vitest 4.1.10 on node 24, a `resolve.alias` from
`@minecraft/server` to the shim and an ordinary import of its `./control` subpath reach the same
instance of that internal module, and the pack read back the exact `world` and `system` the test
installed through `./control` — across two alias shapes (the bare package name, the resolved entry
file) crossed with two install shapes (a `file:` symlink, an unpacked `npm pack` tarball), all four
runs reporting one evaluation of the state module
[[f:alias-and-control-subpath-are-one-module-instance]]. That is a vitest result: jest, bun, CJS and a
duplicate install of the shim at two `node_modules` depths were not exercised, which is the same reach
the runner choice below already commits to.

The second alias shape is therefore a documented option rather than a repair: a consumer who prefers to
alias `@minecraft/server` to the shim's resolved entry *file* — the shape one surveyed pack already
uses — pairs it with a `paths` entry in a `tsconfig.test.json` pointing `@minecraft/server` at that
file's declarations, and gets the same single instance. The README leads with the bare-specifier recipe
and documents the file-plus-`paths` shape beside it.

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
has declarations to read [[d:one-package-one-aliasable-module]].

The manifest sets `"type": "module"` and an `exports` map with exactly those two keys, each carrying a
`types` and a `default` condition:

```json
{
  "type": "module",
  "exports": {
    ".":        { "types": "./dist/index.d.ts",   "default": "./dist/index.js" },
    "./control":{ "types": "./dist/control.d.ts", "default": "./dist/control.js" }
  }
}
```

Four source files sit behind that: `src/index.ts`, the aliased root entry, re-exporting the generated
values, the class objects, and `world`/`system`; `src/control.ts`, the control entry; `src/state.ts`,
the internal module both entries re-export from; and `src/generated/values.ts` and
`src/generated/classes.ts`, which nothing outside the package imports directly. `tsc` compiles `src/`
to `dist/` with declarations emitted; `dist/` is published and not committed. The package scripts are
`generate` (run the generator over the pinned declarations), `build` (`tsc`), `test` (`vitest run`),
and `check`, which runs `generate`, fails on a dirty tree, then `build` and `test` — the one command CI
invokes.

A consumer who wants nothing but the enum values takes the same package and imports them; there is no separate values-only package,
because the runtime cost of the rest is a brand table and two bindings.

A second `@minecraft/*` module — `server-ui`, `server-net` — is out of this cycle. When one is
wanted, it is a second generated module and a second alias entry under the same package, built by the
same generator against the same pinned family.

## The shim's own suite

The package's tests are what hold the two requirements a consumer cannot check for themselves. They
cover, at minimum:

- a fixture pack module importing an enum member and a class, loaded through the alias unmodified and
  driven through the singletons;
- a second fixture pack whose entry module subscribes at module scope — `world.afterEvents…subscribe`
  and `system.runInterval` at import time — reached by a dynamic import after `__useServer`, plus the
  `vi.resetModules()` case that re-imports control and pack in that order and asserts the second test
  sees its own server;
- the control run with the alias removed, asserting the resolution failure returns;
- `instanceof` answering true for a branded fake, true for a branded subclass against its declared
  ancestor, and false for a fake branded as a different class; `brandAs` unioning across two calls, and
  throwing on an undeclared class name;
- `EntityHealthComponent.componentId` reading the declared id string, and a registry static throwing
  `ShimUnsupportedError`;
- a property access on `world` before install throwing `ShimNotInstalledError`;
- the peer range refusing an install against a 1.x consumer under npm, exercised through a packed
  tarball rather than a `file:` spec, which npm does not enforce the range on
  [[f:an-unsatisfiable-peer-range-fails-npm-and-warns-pnpm-and-yarn]];
- and a typecheck of a TypeScript test file that imports the control surface, run by the `build`
  script.

## Components

```yaml
components:
  - id: values-generator
    responsibility: >-
      emit src/generated/values.ts (one named export per enum and module constant) and
      src/generated/classes.ts (the classAncestry and constant-statics records) from the pinned
      @minecraft/server index.d.ts
    excludes: >-
      emitting the class objects and Error subclasses themselves, which class-brands builds from
      these records
  - id: class-brands
    responsibility: >-
      the registered brand symbol, brandAs, the Symbol.hasInstance implementation answering
      instanceof over classAncestry, the emitted class objects with their constant statics and
      throwing lookup statics, and the real Error subclasses
    excludes: deciding what a fake's shape is
    after: [values-generator, shim-state]
  - id: shim-state
    responsibility: >-
      src/state.ts — the live world and system bindings, the throwing sentinel Proxy they hold while
      unset, __useServer as install and reset, ShimNotInstalledError and ShimUnsupportedError
    excludes: any state beyond the two bindings
  - id: root-entry
    responsibility: >-
      src/index.ts — the module a consumer aliases, re-exporting the generated values, the class
      objects, and world and system, and nothing from the control surface
    after: [class-brands, shim-state]
  - id: control-entry
    responsibility: the ./control subpath, its exports and its declarations
    after: [class-brands, shim-state]
  - id: package-and-recipes
    responsibility: >-
      the manifest — name, type module, exports map, peer range, engines, scripts — the tsc build,
      and the README install recipes and load-order contract for vitest, bun and jest-ESM
    after: [root-entry, control-entry]
  - id: conformance-suite
    responsibility: >-
      the two fixture packs loaded through the alias, the no-alias control, the instanceof, brandAs,
      statics and unset-access cases, the packed-tarball peer check, and the typecheck of a
      consumer-shaped test file
    after: [package-and-recipes]
```
