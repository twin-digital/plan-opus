# `@twin-digital/minecraft-server-shim`

## Summary

This design specifies the module that stands in for `@minecraft/server` under a test runner, so that
unmodified behavior-pack code loads and runs. Its product is one published package: the enum and
constant values a pack imports, a stand-in for every class the engine declares so that `instanceof`
answers, the module-scope `world` and `system` bindings a test points at its own fakes, and the vite
plugin that installs all of it from one entry in a consumer's config. The problem it answers sits before any fake can be used —
the published `@minecraft/server` package has no entry point, so a module importing a value from it
cannot be resolved by a runner at all, and the test library deliberately does not intercept that
import. The constraint that shapes everything below is that the shim carries mutable module state
that must be one instance for every route into it: the pack's import, the test's control calls, and
the type checker's view all have to arrive at the same module.

## What a consumer installs

The consumer adds `@twin-digital/minecraft-server-shim` as a dev dependency and one entry to their
runner config: the shim's vite plugin. No alias, no `setupFiles` entry, no setup file in their tree,
no pack source edited, and no `tsconfig` change [[r:unmodified-pack-code-loads-under-test]]
[[d:the-plugin-is-the-install-shape]].

```ts
import { defineConfig } from 'vitest/config'
import { minecraftShim } from '@twin-digital/minecraft-server-shim/vite'

export default defineConfig({ plugins: [minecraftShim()] })
```

The plugin is a vite plugin with one `config` hook, contributing two things to the resolved config: a
`resolve.alias` entry mapping `@minecraft/server` to the bare specifier
`@twin-digital/minecraft-server-shim`, and a `test.setupFiles` entry naming the package's own
`./vitest` subpath. A consumer config listing only the plugin runs an unmodified pack's suite green
[[f:a-vite-plugin-contributes-an-alias-and-a-setup-file]].

Three things about that hook a builder gets wrong by default. **The `setupFiles` entry must name a
real file.** `setupFiles` is resolved by ordinary node resolution from the project root, not through
the plugin pipeline, so a virtual module id the plugin's own `resolveId` answers fails with
`ERR_MODULE_NOT_FOUND`; a bare specifier naming a subpath the package's `exports` map declares
resolves and runs [[f:setup-files-resolve-as-modules-from-the-project-root]]. **The options travel
out-of-band**, because a setup module takes no arguments: the same `config` hook writes them as JSON
into `test.env`, and the setup module reads them off `process.env`
[[d:plugin-options-travel-in-test-env]]. **The plugin's setup file runs second.** A consumer's own
setup file runs first and the plugin's after it, so the plugin overwrites a server the consumer
installed themselves — the sharp edge, and the README states it. Everything else merges: both alias
tables survive, in either of vite's forms, and both setup files run
[[f:a-plugins-config-merges-with-the-consumers-own-entries]].

### What the setup module installs, and what that costs

The `./vitest` setup module builds a server and hands it to `__useServer` at module scope. It does not
construct one itself: it imports the factory named by the `serverModule` option and calls it, which is
how a plugin option selects an entirely different server factory
[[f:plugin-options-reach-a-setup-file-through-env-or-define]]. The default is
`@twin-digital/minecraft-test-lib`'s `createServer`.

That default is the only place the shim touches a fake library, and it is deliberately the *only* one:
the core — the aliased root, `./control`, the brands — imports nothing from any library, so the
library enters as an **optional peer that only the `./vitest` subpath imports**
[[d:the-library-is-an-optional-peer-of-the-setup-subpath-alone]]. A consumer faking the engine their own
way points `serverModule` at their own factory, or skips the plugin and uses `./control` directly, and
never loads it. `peerDependenciesMeta.optional` covers a peer that is simply *absent*, which is that
case [[f:an-unsatisfiable-peer-range-fails-npm-and-warns-pnpm-and-yarn]].

What the world contains at the start of a file is an option rather than an argument the design has to
win. `createServer()` populates nothing, so a pack's first `world.getDimension('overworld')` throws
against a bare one; the plugin's `world` option names the presets the setup module applies before
installing, and a consumer whose pack needs the vanilla dimensions sets it in the same line that
installs the plugin. The default is the bare factory result with nothing added, because a default world
holding contents the shim chose is the shim modelling engine state
[[r:shim-supplies-values-not-behaviour]] [[d:the-default-world-is-what-the-factory-builds]].

The `./vitest` setup subpath stays exported for a consumer who wants no plugin in their config: naming
it in `setupFiles` beside an alias of their own does the same job, measured with no plugin present
[[f:setup-files-resolve-as-modules-from-the-project-root]] [[d:the-plugin-is-the-install-shape]]. What
it cannot take is options — that is what the plugin buys.

### What the alias substitutes, and the one alternative

The alias is what makes the pack's own `import { world, EntityDamageCause } from '@minecraft/server'`
resolve, and it is not the only thing that could. `vi.mock('@minecraft/server', factory)` with **no
alias configured at all** substitutes a specifier the resolver cannot resolve, reaching the pack's own
nested import rather than only the test file's, and from a setup file it applies to every test file
that follows with the factory re-run per file
[[f:vi-mock-substitutes-a-specifier-vite-cannot-resolve]]
[[f:a-setup-file-vi-mock-applies-to-every-test-file]]. The shim does not use it
[[d:the-alias-is-the-substitution-mechanism]]: it removes the alias entry but not the install — a
factory still has to build and install a server — and the measured factory returned the module
namespace of a real import, an object-literal factory being unmeasured, so the live `export let`
bindings the shim turns on rest on a shape nobody has pinned. The alias is the mechanism; `vi.mock` is
recorded here so a later author does not rediscover it as an unexplored option.

### What the install buys

A test file with no install code in it at all. Vitest evaluates `setupFiles` before the test file's own
module evaluation, so a pack's module-scope `subscribe` and `runInterval` calls land on the installed
server even though the pack is imported statically at the top of the test — the ordering the shim
needs is the runner's, not the consumer's to arrange
[[f:a-setup-file-server-makes-a-pack-test-file-boilerplate-free]]
[[f:a-vite-plugin-contributes-an-alias-and-a-setup-file]]. A consumer's test file is static imports and
assertions:

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
and another test's tick clock. The README says this in those words, beside the plugin snippet, because a
consumer discovering it from a failing assertion is discovering it the expensive way.

There is no supported path to per-test isolation in this cycle. The route to one is not a shim change:
a fake server's state can be cleared in place with the world identity and all five of a pack's
module-scope subscribers intact, but the test library exposes no reset and has decided against one, so
the capability has to come from there [[f:a-fake-server-can-be-cleared-in-place-with-its-subscriptions-intact]]
[[f:test-lib-ships-no-reset-hook]]. That ask is open, not settled, and nothing here is built against it
[[d:per-test-isolation-waits-on-a-library-reset]].

When the reset lands the consumer's config does not change: the plugin registers the per-test reset
hook in the setup module it already contributes, the way `msw`'s `setupServer` and
`@testing-library/jest-dom` register theirs, and the same setup module brands the library's fakes
instead of leaving that to a consumer's `brandAs`. Two things about it are unsettled and stay that way
until the capability exists. **Whether the reset runs in `beforeEach` or `afterEach` is unmeasured** —
the install has to sit at the setup module's module scope so a pack's module-scope subscriptions land
on the right server, while a `beforeEach` reset is the more robust of the two against a test file that
adds setup of its own. And **what a reset must preserve** is the library's to fix, not the shim's.
Nothing here is built against either [[d:per-test-isolation-waits-on-a-library-reset]].

Without the plugin the suite does not fail a test, it fails to start: `@minecraft/server` 2.8.0
publishes no `main`, `module`, `types` or `exports` key, so node reports `ERR_MODULE_NOT_FOUND` and
vitest reports `Failed to resolve entry for package "@minecraft/server"` before any test code runs
[[f:server-import-fails-without-an-alias]]. Taking the plugin out of a consumer's config, with no alias
and no `vi.mock` standing in for it, must put their suite back to exactly that failure; that is the
check that the shim, and not something else, is carrying the import.

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

The brand is a protocol the shim **reads**, not one it owns. The shim implements `Symbol.hasInstance`
because it owns the `Player` object a pack tests against, but who brands a fake and what the brand
looks like belong to whoever builds the fakes: the owner has ruled that
`@twin-digital/minecraft-test-lib` brands its own at construction and defines the protocol, raised as
plan-opus issue #125 and not yet ruled there [[d:shim-cooperates-through-a-registered-brand-symbol]].
Until it is, the symbol and value shape above are the shim's provisional definition, and they move to
whatever #125 settles. Nothing in the shim assumes a library fake arrives branded today.

That is what keeps `brandAs(value, ...classNames)` on the control entry, returning the value. Its
permanent job is a hand-rolled double — a consumer faking the engine their own way brands their own
objects, whatever any library does. Its temporary job is library fakes: today a consumer's test, or
the plugin's setup module, brands them; once #125 lands, nobody does. `Symbol.for` reads from the
global registry, so a fake satisfies the check by setting the property with no import of the shim, and
the shim imports no library to read it.

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

The plugin contributes the bare-specifier alias, and a consumer who writes an alias of their own
instead may use either shape: the resolved entry *file* — what one surveyed pack does — gets the same
single instance, measured alongside the first.

No install shape carries a `tsconfig` `paths` entry, and the README says so rather than leaving it to
inference [[d:control-surface-is-a-real-subpath]]. A `paths` entry pointing `@minecraft/server` at the
shim's declarations would break the half that already works: pack code uses these names in type
position — `(p: Player)`, `cause: EntityDamageCause` — and in the shim's declarations `Player` is a
`const` with no type of that name and `GameMode` is a frozen object rather than an `enum`, so pack code
stops compiling. `tsc` resolving `@minecraft/server` to the real `index.d.ts` is the design, not an
accident to paper over.

## The boundary with the test library

The library stays its own package and the shim stays its own; neither ships inside the other
[[d:one-package-one-aliasable-module]]. The shim's core imports nothing from
`@twin-digital/minecraft-test-lib` — the only import is the `./vitest` setup module's default factory,
behind an optional peer [[d:the-library-is-an-optional-peer-of-the-setup-subpath-alone]] — so no part
of the core build waits on the library. Three consequences a builder acts on.

The enum values are the shim's to generate and it does not ask the library for them
[[d:values-are-generated-and-committed]]. If the library later ships enums of its own, nothing
collides: both derive from the same pinned 2.8.0 declarations, so a test importing `GameMode` from the
library and a pack importing it from the aliased module hold the same literal strings.

`instanceof` needs no predicate export from the library. The shim reads a brand and answers
`Symbol.hasInstance`; it never calls an `isPlayer` or `isEntity` and must not be built against one
[[d:shim-cooperates-through-a-registered-brand-symbol]]. What it does not own is the protocol's
definition, which is the library's under plan-opus issue #125 and is not settled there.

The install documentation lives here. The shim's README is the sole normative install document — the
plugin entry and its options, the `./vitest` fallback and the setup-file ordering, the
one-scenario-per-file cost, the `2.8.0` version statement, the uncovered `@minecraft/*` modules, and
the non-vitest recipes — and the
shim asks nothing of any fake library's documentation and does not depend on one mentioning it
[[d:install-documentation-lives-with-the-shim]]. What that leaves open is a consumer who arrives at
the library first: the failure they meet is the unresolved import, before any shim code exists to
improve the message [[f:server-import-fails-without-an-alias]], and nothing this design ships puts a
pointer in their path.

None of this reaches the library's own fiat that it substitutes objects and does not intercept the
module import [[f:test-lib-does-not-intercept-the-module-import]]. The interception is the consumer's
runner configuration and the shim is the material they configure it with — the plugin contributes the
alias to the *consumer's* config, and the library holds no code path into the shim. The rub is real
and worth naming: the plugin is a config entry a consumer adds once and stops thinking about, which is
as close to the library doing the intercepting as this design goes. It stays on the shim's side of the
line because the shim is the package they install for it, and the library can be built and released
knowing nothing about it.

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
[[d:package-identity-and-runtime-target]]. It has four entry points: `.`, the module the alias points
at; `./control`; `./vite`, the plugin; and `./vitest`, the setup module the plugin names. A runner
integration is a subpath of this package, never a package of its own — a `./jest` or `./bun` entry
joins it if those runners come [[d:one-package-one-aliasable-module]]. It depends on no test framework
at run time; `@minecraft/server` is a peer and a dev dependency, present only so the generator has
declarations to read, `vite` is a peer of the `./vite` entry, and the fake library is an optional peer
of `./vitest` alone [[d:the-library-is-an-optional-peer-of-the-setup-subpath-alone]].

The manifest sets `"type": "module"` and an `exports` map with exactly those four keys, each carrying a
`types` and a `default` condition:

```json
{
  "type": "module",
  "exports": {
    ".":        { "types": "./dist/index.d.ts",   "default": "./dist/index.js" },
    "./control":{ "types": "./dist/control.d.ts", "default": "./dist/control.js" },
    "./vite":   { "types": "./dist/vite.d.ts",    "default": "./dist/vite.js" },
    "./vitest": { "types": "./dist/vitest.d.ts",  "default": "./dist/vitest.js" }
  }
}
```

Every subpath the plugin names has to be declared there: a `setupFiles` entry naming an undeclared
subpath fails to resolve [[f:setup-files-resolve-as-modules-from-the-project-root]].

Nine source files sit behind that — six hand-written, three generated. Hand-written:
`src/index.ts`, the aliased root entry, re-exporting the generated values, the class exports, and
`world`/`system`; `src/control.ts`, the control entry; `src/state.ts`, the internal module both entries
re-export from; `src/brands.ts`, holding the brand symbol, `brandAs`, and the `makeClass` factory;
`src/vite.ts`, the plugin and its option type; and `src/vitest.ts`, the setup module.
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
  a static import of the pack and of `world`/`system`, with the server installed by the plugin alone —
  a config carrying `plugins: [minecraftShim()]` and nothing else;
- the `./vitest` subpath named directly in `setupFiles` with no plugin, and a plugin run whose options
  select a non-default `serverModule` and a non-empty `world`, asserting the setup module saw them;
- a consumer setup file of the suite's own beside the plugin, asserting both ran and the plugin's ran
  second [[f:a-plugins-config-merges-with-the-consumers-own-entries]];
- the control run with the plugin removed, asserting the resolution failure returns;
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
  position, checked under the plugin and with no `paths` entry.

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
  - id: setup-module
    responsibility: >-
      src/vitest.ts — read the options off process.env, import the factory serverModule names,
      apply the world presets, and install the server at module scope
    excludes: registering any per-test hook, which waits on the library reset
    after: [control-entry]
  - id: vite-plugin
    responsibility: >-
      src/vite.ts — the minecraftShim plugin and its option type, whose config hook contributes the
      resolve.alias entry, the test.setupFiles entry naming the ./vitest subpath, and the options as
      JSON in test.env
    excludes: doing any install work itself; the setup module it names does that
    after: [setup-module]
  - id: package-and-recipes
    responsibility: >-
      the manifest — name, type module, the four-key exports map, peer and optional-peer ranges,
      engines, scripts — the tsc build, and the README — the plugin entry and its options, the
      ./vitest fallback and the setup-file ordering, the one-scenario-per-file cost, and the bun and
      jest-ESM recipes
    after: [root-entry, control-entry, vite-plugin]
  - id: conformance-suite
    responsibility: >-
      the two fixture packs installed by the plugin alone, the plugin-removed control, the options
      and setup-ordering cases, the instanceof, brandAs, statics and unset-access cases, the
      packed-tarball peer check, and the typecheck of a consumer-shaped test file
    after: [package-and-recipes]
```
