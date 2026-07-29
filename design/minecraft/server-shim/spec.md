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

The consumer adds `@twin-digital/minecraft-server-shim` as a dev dependency and three things: two
entries in their runner config and a setup file. No pack source is edited and no `tsconfig` entry is
added [[r:unmodified-pack-code-loads-under-test]]. The config entries are the alias, mapping the
specifier `@minecraft/server` to the bare specifier `@twin-digital/minecraft-server-shim`, and a
`setupFiles` entry naming the setup file. Under vitest those are `resolve.alias` and
`test.setupFiles`.

The setup file is three lines and names nothing about the consumer's pack:

```ts
import { __useServer } from '@twin-digital/minecraft-server-shim/control'
import { createServer } from '@twin-digital/minecraft-test-lib'

__useServer(createServer())
```

Both entries and the setup file ship as documented snippets in the package README rather than as a
helper the shim exports [[d:install-is-a-documented-snippet]]. This is the one install shape the shim
documents; there is no second recipe [[d:the-setup-file-is-the-install-shape]].

What that buys is a test file with no install code in it at all. Vitest evaluates `setupFiles` before
the test file's own module evaluation, so a pack's module-scope `subscribe` and `runInterval` calls
land on the installed server even though the pack is imported statically at the top of the test — the
ordering the shim needs is the runner's, not the consumer's to arrange
[[f:a-setup-file-server-makes-a-pack-test-file-boilerplate-free]]. A consumer's test file is static
imports and assertions:

```ts
import '../src/main.js'                                    // the pack, for its side effects
import { world, system } from '@minecraft/server'          // to arrange and assert

it('reacts to a hit', () => {
  const player = world.getDimension('overworld').spawnEntity(/* … */)
  // …
})
```

### One server per file, and what it carries

The isolation unit is the **file**, not the test. One server is installed per file, so everything a
test leaves behind is there for the tests after it, and the amount is not marginal. Against
`bencrob/marron-town-mod`, a first test that spawns one player and advances 40 ticks hands the second
test 1 entity, a tick clock at 40, and 11 scoreboard objectives; the second hands the third 2 entities
and a clock at 80, with the first test's player still in the dimension and still being iterated by the
pack's module-scope loops [[f:one-server-per-file-carries-state-into-the-next-test]]. Nothing resets
between tests because nothing can: the state belongs to the one server the file installed.

The shape that works is **one scenario per file**. A consumer who wants a clean world writes another
test file; a suite that puts three unrelated scenarios in one file will read another test's entities
and another test's tick clock. The README says this in those words, beside the setup snippet, because a
consumer discovering it from a failing assertion is discovering it the expensive way.

There is no supported path to per-test isolation in this cycle. The route to one is not a shim change:
a fake server's state can be cleared in place with the world identity and all five of a pack's
module-scope subscribers intact, but the test library exposes no reset and has decided against one, so
the capability has to come from there [[f:a-fake-server-can-be-cleared-in-place-with-its-subscriptions-intact]]
[[f:test-lib-ships-no-reset-hook]]. That ask is open, not settled, and nothing here is built against it
[[d:per-test-isolation-waits-on-a-library-reset]].

Where the install goes when it lands — recorded so the shape now is not mistaken for the destination,
and built by nobody until the reset exists (plan-opus issue #124). The shim would ship a
self-registering setup subpath, `@twin-digital/minecraft-server-shim/vitest`, which on import installs
a server and registers the per-test reset itself, the way `msw`'s `setupServer` and
`@testing-library/jest-dom` do. The consumer writes no setup file at all — `setupFiles:
['@twin-digital/minecraft-server-shim/vitest']` beside the alias — and the subpath can brand the
library's fakes as it goes, which is a consumer's own `brandAs` call today. Four things it turns on,
none of them settled here. **It costs library independence, and only on that subpath**: the core must
keep importing nothing from `@twin-digital/minecraft-test-lib`, so the library enters as an optional
peer that only `/vitest` imports, and a consumer faking the engine their own way uses `./control` and
never loads it — `peerDependenciesMeta.optional` does cover a peer that is simply *absent*, which is
that case [[f:an-unsatisfiable-peer-range-fails-npm-and-warns-pnpm-and-yarn]]. **`setupFiles` takes no
arguments**, so zero-config means baked-in defaults — which fake library, and what the default world
holds — with an exported helper a consumer calls from their own setup file when they want presets or
their own fakes; the subpath is the opinionated path, not the only one. **What the default world holds
is the open one**: `createServer()` populates nothing, so a zero-config server means a pack's first
`world.getDimension('overworld')` throws, while baking in the library's vanilla-dimensions preset is an
opinion about world contents in a package that models none [[r:shim-supplies-values-not-behaviour]].
Neither horn is chosen here; it wants a pack survey behind it when the shape is built. And **whether
the reset runs in `beforeEach` or `afterEach` is unmeasured** — the install has to sit at the setup
module's module scope so a pack's module-scope subscriptions land on the right server, while a
`beforeEach` reset is the more robust of the two against a test file that adds setup of its own.

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

Every class the pinned declarations export is exported by the shim — all 439 of them, so any class a
pack imports resolves [[d:every-declared-class-is-exported]] [[f:engine-surface-outside-instances]].

An ESM named export must be written out statically, so a record of class names cannot become 439
exports at run time. The generator therefore emits the export list itself, as a third generated file,
`src/generated/class-exports.ts`: one literal `export const <Name> = makeClass('<Name>')` line per
declared class, calling a factory the hand-written brands module supplies. Every class name a bump
adds or removes moves that file, so the `generate`-then-clean-tree check covers the export surface the
same way it covers the values [[d:class-exports-are-generated-lines-over-a-hand-written-factory]].
`makeClass` reads the generated records to build one export: its `Symbol.hasInstance`, its constant
statics, its throwing lookup statics, and — for the error classes — a real constructor.

What each export *is* depends on whether it is an error type. A declared class whose ancestry reaches
`Error` — `InvalidEntityError` and its siblings — is emitted as a real class extending `Error` whose
constructor takes the ordinary `(message?: string)` and sets `name` to its own class name, so a test
can construct and throw one. Its declared readonly members are left unset; a thrower who wants one
populated assigns it on the instance after construction
[[d:declared-error-classes-are-real-classes]] [[f:invalid-entity-error-shape]]. Every other class is an
object carrying a `Symbol.hasInstance` implementation and its statics, callable only where the
declarations leave it constructible (below).

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

### The classes a pack constructs

`new ItemStack('minecraft:stone', 1)` is ordinary pack code, and the same reasoning applies to it:
against a plain object it is `ItemStack is not a constructor`, which names nothing a reader can act
on. Of the 439 declared classes, 425 declare `private constructor()` and are unconstructible in the
engine too, so leaving those non-callable is the engine's own behaviour. The other 14 are not: 11
declare a public constructor — `AimAssistCategorySettings`, `AimAssistPresetSettings`, `BlockVolume`,
`EnchantmentType`, `EntityWaypoint`, `ItemStack`, `ListBlockVolume`, `LocationWaypoint`,
`PlayerWaypoint`, `TextPrimitive`, `Trigger` — and three declare no constructor at all and so carry a
default one: `CatmullRomSpline`, `LinearSpline`, `MolangVariableMap`. The generator marks those 14 in
`classes.ts` and the factory emits each as a callable that throws `ShimUnsupportedError` naming the
class, since constructing a working `ItemStack` would be modelling engine behaviour the shim does not
model [[r:shim-supplies-values-not-behaviour]] [[d:constructible-classes-throw-unsupported]]. The
constructible set is read out of the declarations, not listed by hand, so a bump that makes a class
constructible carries it along.

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
library by the shim [[d:shim-cooperates-through-a-registered-brand-symbol]]. For a fake that carries
no brand at all, the shim's control entry exports
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
is a sentinel `Proxy`, every trap of which — `get`, `set`, `has`, `deleteProperty`, `ownKeys`,
`getOwnPropertyDescriptor`, `apply`, `construct` — throws `ShimNotInstalledError` with the
message `no server installed — a setup file must call __useServer(server); see the shim's README`
[[d:unset-bindings-hold-a-throwing-proxy]]. The proxy target is a function, not an empty object,
because `apply` and `construct` never fire on a non-callable target and `system(…)`-shaped misuse
should read as the shim's error rather than a generic one. `__useServer(server)` overwrites both
bindings with `server.world` and `server.system`; `__useServer()` puts the two sentinels back.

What that is observably, and what a builder must not promise instead: while unset, `world` is **not**
`undefined`, `world == null` is false, a truthiness guard on it passes, and `typeof world` reads
`'function'` — the function target decides that, since `typeof` consults no trap — becoming `'object'`
once a plain server object is installed over it
[[f:a-proxy-over-a-function-target-is-typeof-function]]. The throw fires on every access shape
measured: a property read, a method call, a call of the binding itself, a `new`, an `in`, and a spread
[[f:a-proxy-over-a-function-target-is-typeof-function]]. Destructuring `const { getDimension } = world`
is a property read and throws; binding `const w = world` alone does not. A consumer who reaches the
unset state has skipped the `setupFiles` entry, which is what the error message names.

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
uses — gets the same single instance, measured alongside the first. The README leads with the
bare-specifier recipe and documents the file shape beside it.

Neither recipe carries a `tsconfig` `paths` entry, and the README says so rather than leaving it to
inference [[d:control-surface-is-a-real-subpath]]. A `paths` entry pointing `@minecraft/server` at the
shim's declarations would break the half that already works: pack code uses these names in type
position — `(p: Player)`, `cause: EntityDamageCause` — and in the shim's declarations `Player` is a
`const` with no type of that name and `GameMode` is a frozen object rather than an `enum`, so pack code
stops compiling. `tsc` resolving `@minecraft/server` to the real `index.d.ts` is the design, not an
accident to paper over.

## The boundary with the test library

The shim needs no change to `@twin-digital/minecraft-test-lib` and imports nothing from it, so no part
of the build waits on the library. Three consequences a builder acts on.

The enum values are the shim's to generate and it does not ask the library for them
[[d:values-are-generated-and-committed]]. If the library later ships enums of its own, nothing
collides: both derive from the same pinned 2.8.0 declarations, so a test importing `GameMode` from the
library and a pack importing it from the aliased module hold the same literal strings.

`instanceof` needs no predicate export from the library. The registered brand symbol is the whole
protocol and `brandAs` is the fallback for an unbranded fake
[[d:shim-cooperates-through-a-registered-brand-symbol]], so the shim never calls an `isPlayer` or
`isEntity` and must not be built against one.

The install documentation lives here. The shim's README is the sole normative install document — the
two config entries, the setup file, the one-scenario-per-file cost, the `2.8.0` version statement, the
uncovered `@minecraft/*` modules, and the runner recipes — and the
shim asks nothing of any fake library's documentation and does not depend on one mentioning it
[[d:install-documentation-lives-with-the-shim]]. What that leaves open is a consumer who arrives at
the library first: the failure they meet is the unresolved import, before any shim code exists to
improve the message [[f:server-import-fails-without-an-alias]], and nothing this design ships puts a
pointer in their path.

None of this reaches the library's own fiat that it substitutes objects and does not intercept the
module import [[f:test-lib-ships-the-aliasable-module-but-never-installs-the-alias]]. The interception is the consumer's
runner configuration and the shim is the material they configure it with: the shim registers no setup
file with the library, the library holds no code path into the shim, and the two packages can be built
and released without either knowing the other exists.

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

Seven source files sit behind that — four hand-written, three generated. Hand-written:
`src/index.ts`, the aliased root entry, re-exporting the generated values, the class exports, and
`world`/`system`; `src/control.ts`, the control entry; `src/state.ts`, the internal module both entries
re-export from; and `src/brands.ts`, holding the brand symbol, `brandAs`, and the `makeClass` factory.
Generated: `src/generated/values.ts`, `src/generated/classes.ts`, and
`src/generated/class-exports.ts`, which nothing outside the package imports directly. `tsc` compiles `src/`
to `dist/` with declarations emitted; `dist/` is published and not committed. The package scripts are
`generate` (run the generator over the pinned declarations), `build` (`tsc`), `test` (`vitest run`),
and `check`, which runs `generate`, fails on a dirty tree, then `build` and `test` — the one command CI
invokes.

A consumer who wants nothing but the enum values takes the same package and imports them; there is no separate values-only package,
because the runtime cost of the rest is a brand table and two bindings.

A second `@minecraft/*` module — `server-ui`, `server-net` — is out of this cycle, and a consumer
meets that on day one rather than eventually: the validation pack imports `@minecraft/server-ui`, and
loading it needed a second alias to a stub of the consumer's own
[[f:a-setup-file-server-makes-a-pack-test-file-boilerplate-free]]. The shim covers `@minecraft/server`
and nothing else, so a pack importing a value from another `@minecraft/*` module aliases that one
itself; the README says so rather than leaving the second `ERR_MODULE_NOT_FOUND` to explain it. When a
second module is wanted here, it is a second generated module and a second alias entry under the same
package, built by the same generator against the same pinned family
[[d:one-package-one-aliasable-module]].

## The shim's own suite

The package's tests are what hold the two requirements a consumer cannot check for themselves. They
cover, at minimum:

- a fixture pack module importing an enum member and a class, loaded through the alias unmodified and
  driven through the singletons;
- a second fixture pack whose entry module subscribes at module scope — `world.afterEvents…subscribe`
  and `system.runInterval` at import time — driven from a test file that carries no install code, only
  a static import of the pack and of `world`/`system`, with the server installed by the suite's own
  setup file;
- the control run with the alias removed, asserting the resolution failure returns;
- `instanceof` answering true for a branded fake, true for a branded subclass against its declared
  ancestor, and false for a fake branded as a different class; `brandAs` unioning across two calls, and
  throwing on an undeclared class name;
- `EntityHealthComponent.componentId` reading the declared id string, a registry static throwing
  `ShimUnsupportedError`, and `new ItemStack('minecraft:stone', 1)` throwing it too;
- a count of the export lines in `src/generated/class-exports.ts` against the classes `classAncestry`
  holds, so a class the generator stopped emitting fails a test rather than a consumer's import;
- a property access on `world` before install throwing `ShimNotInstalledError`;
- the peer range refusing an install against a 1.x consumer under npm, exercised through a packed
  tarball rather than a `file:` spec, which npm does not enforce the range on
  [[f:an-unsatisfiable-peer-range-fails-npm-and-warns-pnpm-and-yarn]];
- and a typecheck, run by the `build` script, of a consumer-shaped TypeScript pair: a test file
  importing the control surface, and a pack module using `Player` and `EntityDamageCause` in type
  position, checked under both alias recipes and with no `paths` entry.

## Components

```yaml
components:
  - id: values-generator
    responsibility: >-
      emit all three generated files from the pinned @minecraft/server index.d.ts —
      src/generated/values.ts (one named export per enum and module constant),
      src/generated/classes.ts (the classAncestry, constant-statics, lookup-statics and
      constructible-class records), and src/generated/class-exports.ts (one export line per declared
      class, calling makeClass)
    excludes: >-
      the makeClass factory and the brand implementation those export lines call, which class-brands
      supplies
  - id: class-brands
    responsibility: >-
      src/brands.ts — the registered brand symbol, brandAs, the makeClass factory, the
      Symbol.hasInstance implementation answering instanceof over classAncestry, the constant and
      throwing statics it hangs on each class, and the real Error subclasses
    excludes: emitting the export lines themselves, which values-generator writes
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
      and the README — the two config entries, the setup file, the one-scenario-per-file cost, and the
      bun and jest-ESM recipes
    after: [root-entry, control-entry]
  - id: conformance-suite
    responsibility: >-
      the two fixture packs loaded through the alias, the no-alias control, the instanceof, brandAs,
      statics and unset-access cases, the packed-tarball peer check, and the typecheck of a
      consumer-shaped test file
    after: [package-and-recipes]
```
