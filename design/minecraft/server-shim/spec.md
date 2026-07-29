# The `@minecraft/server` module surface

## Summary

This design specifies the module that stands in for `@minecraft/server` under a test runner, so that
unmodified behavior-pack code loads and runs — the shim, the name used throughout for that module
surface and the install that puts it in front of a pack. Its product is not a package of its own but
a set of entry points of `@twin-digital/minecraft-test-lib`, the package that already ships the
fakes: the enum and constant values a pack imports, a stand-in for every class the engine declares
so that `instanceof` answers, the module-scope `world` and `system` bindings a test points at its own
fakes, and the vite plugin that installs all of it from one entry in a consumer's config. The
problem it answers sits before any fake can be used — the published `@minecraft/server` package has
no entry point, so a module importing a value from it cannot be resolved by a runner at all. The
constraint that shapes everything below is that the shim carries mutable module state that must be
one instance for every route into it: the pack's import, the test's control calls, and the type
checker's view all have to arrive at the same module.

## What a consumer installs

The consumer adds `@twin-digital/minecraft-test-lib` as a dev dependency — the same package that
gives them the fakes — and one entry to their runner config: the shim's vite plugin. No alias, no
`setupFiles` entry, no setup file in their tree, no pack source edited, and no `tsconfig` change
[[r:unmodified-pack-code-loads-under-test]] [[d:the-plugin-is-the-install-shape]].

```ts
import { defineConfig } from 'vitest/config'
import { minecraftShim } from '@twin-digital/minecraft-test-lib/vite'

export default defineConfig({ plugins: [minecraftShim()] })
```

The plugin is a vite plugin with one `config` hook, contributing two things to the resolved config: a
`resolve.alias` entry mapping `@minecraft/server` to the specifier
`@twin-digital/minecraft-test-lib/server`, and a `test.setupFiles` entry naming the package's own
`./vitest` subpath. A consumer config listing only the plugin runs an unmodified pack's suite green
[[f:a-vite-plugin-contributes-an-alias-and-a-setup-file]].

Three things about that hook a builder gets wrong by default. **The `setupFiles` entry must name a
real file.** `setupFiles` is resolved by ordinary node resolution from the project root, not through
the plugin pipeline, so a virtual module id the plugin's own `resolveId` answers fails with
`ERR_MODULE_NOT_FOUND`; a bare specifier naming a subpath the package's `exports` map declares
resolves and runs [[f:setup-files-resolve-as-modules-from-the-project-root]]. **The options travel
out-of-band**, because a setup module takes no arguments: the same `config` hook writes them as JSON
into `test.env`, and the setup module reads them off `process.env`
[[f:plugin-options-reach-a-setup-file-through-env-or-define]]
[[d:plugin-options-travel-in-test-env]]. **The plugin's setup file runs second.** A consumer's own
setup file runs first and the plugin's after it, so the plugin overwrites a server the consumer
installed themselves — the sharp edge, and the README states it. Everything else merges: both alias
tables survive, in either of vite's forms, and both setup files run
[[f:a-plugins-config-merges-with-the-consumers-own-entries]].

### What the setup module installs, and what that costs

The `./vitest` setup module calls `createServer()` and hands the result to `__useServer` at module
scope. The factory is in the same package, so it is an ordinary internal import — nothing is resolved
by specifier at run time and no option names it. There is no `serverModule` option
[[d:the-setup-module-builds-the-servers-the-package-ships]]. A consumer who needs `__useServer` to
receive a server object this package's factory does not build writes their own setup file and their
own alias entry, and does not use the plugin; the plugin's setup file runs second and would overwrite
theirs (below). What the option would have bought is a consumer who wants this package's alias and
install with somebody else's fakes, and the fakes ship in this package — that consumer is buying the
thing they mean to replace.

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
module-scope subscribers intact, but the fakes expose no reset and their design has decided against
one, so the capability has to come from there — the same package now, but not this design's surface [[f:a-fake-server-can-be-cleared-in-place-with-its-subscriptions-intact]]
[[f:test-lib-ships-no-reset-hook]]. That ask is open, not settled, and nothing here is built against it
[[d:per-test-isolation-waits-on-a-library-reset]].

When the reset lands the consumer's config does not change: the plugin registers the per-test reset
hook in the setup module it already contributes, the way `msw`'s `setupServer` and
`@testing-library/jest-dom` register theirs. Two things about it are unsettled and stay that way
until the capability exists. **Whether the reset runs in `beforeEach` or `afterEach` is unmeasured** —
the install has to sit at the setup module's module scope so a pack's module-scope subscriptions land
on the right server, while a `beforeEach` reset is the more robust of the two against a test file that
adds setup of its own. And **what a reset must preserve** is the fakes' design to fix, not this one's.
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

There is one pinned version, not two, because there is one manifest: the `@minecraft/server` the
generator reads its declarations from is the same install the fakes are written against, declared
once as a dev dependency and once as a peer range. A generated enum member and a fake's behaviour
cannot be derived from different versions of the engine, and nothing has to coordinate two release
lines to keep them together — a bump is one dependency edit, after which the `generate`-then-clean-tree
check below fails until the values are regenerated [[r:enum-values-come-from-the-pinned-declarations]].

The version the values came from is stated in two places and enforced in neither: the package
exports `__serverVersion`, the string `'2.8.0'`, from its root entry, and the README names it.
The shim performs no runtime comparison against whatever `@minecraft/server` the consumer has
installed and emits no warning [[d:version-statement-is-inert]]. What does tell a mismatched
consumer is the package manager: the package declares `@minecraft/server` as a peer dependency at
`^2.8.0`, with no `peerDependenciesMeta` entry [[d:pinned-version-is-declared-as-a-peer-range]].

What that costs is not a warning everywhere. Against a consumer pinned to `^1.17.0`, npm 11.13.0 exits
1 with `ERESOLVE unable to resolve dependency tree` and installs nothing at all — neither this package
nor the server package — so a 1.x consumer on npm cannot install it, and there is no run time for a
warning to reach. pnpm 11.17.0 and yarn 1.22.22 exit 0, install the consumer's 1.x resolution beside
it, and report the mismatch as a warning; the shim imports cleanly afterwards
[[f:an-unsatisfiable-peer-range-fails-npm-and-warns-pnpm-and-yarn]]. Marking the peer
`optional` is not the escape: `optional` covers a peer that is *absent*, not one present at a
conflicting version, so npm still exits 1 against a `peerOptional` edge, pnpm's warning and
`pnpm peers check` are unchanged, and the only thing it buys is suppressing yarn classic's warning —
which is the one signal worth keeping. So it is left off.

The README states this outright: the supported answer for a 1.x consumer is to move
`@minecraft/server` into the 2.x range, because the values the shim supplies are 2.8.0's and would be
wrong for them either way. A hard install failure is the intended shape of that message on npm.

The same fact carries a trap for the package's own suite: where it reaches `node_modules` through a
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
`src/generated/class-exports.ts`, holding one real `class` declaration per declared class with the
declared `extends` written out — `export class Player extends Entity { … }`. Every class name or
`extends` clause a bump changes moves that file, so the `generate`-then-clean-tree check covers the
class surface the same way it covers the values
[[d:class-exports-are-generated-class-declarations]].

They are real classes because a fake that is a real instance of one is how `instanceof` answers. The
fakes are constructed with these prototypes — an internal import within the package, not a dependency
edge across one — so a pack's `attacker instanceof Player` is answered by the language, over the prototype
chain, with nothing in the shim implementing it and nothing in the consumer's test declaring it
[[r:instanceof-answers-for-a-fake]] [[d:fakes-are-instances-of-the-shims-classes]]. `extends` does the
rest: a fake `Player` satisfies `instanceof Entity` because `Player.prototype` inherits from
`Entity.prototype`, so no ancestry table exists to fall out of step with the declarations. A value
whose prototype came from somewhere else answers false, which is what a pack's guard needs in order to
fall through.

A declared class whose ancestry reaches `Error` — `InvalidEntityError` and its siblings — is a real
class extending `Error` whose constructor takes the ordinary `(message?: string)` and sets `name` to
its own class name, so a test can construct and throw one. Its declared readonly members are left
unset; a thrower who wants one populated assigns it on the instance after construction
[[d:declared-error-classes-are-real-classes]] [[f:invalid-entity-error-shape]]. Every other class
carries its statics and is constructible only where the declarations leave it so (below); the shim
declares no members on any prototype, because members are behaviour and the fakes hold that
[[r:shim-supplies-values-not-behaviour]].

### The statics a class carries

A bare class declaration is short of what a pack imports it for. The
pinned declarations put 112 static members on the 439 exported classes, and the largest group is
values, not behaviour: 86 `static readonly componentId` strings, one per component class
[[f:engine-surface-outside-instances]]. `entity.getComponent(EntityHealthComponent.componentId)` is
how a pack asks for a component, and against a class object without it the pack passes `undefined` and
gets nothing back, with no error to read. A `componentId` is a constant string in `index.d.ts` — the
kind of thing a module import must carry [[r:shim-supplies-values-not-behaviour]] — so the generator
emits it, along with the four other literal statics the declarations carry
(`AimAssistRegistry.DefaultCategoryId`, `AimAssistRegistry.DefaultPresetId`,
`FluidContainer.maxFillLevel` 6, `FluidContainer.minFillLevel` 0), as `static` members of the emitted
class [[d:constant-statics-are-emitted-onto-the-classes]].

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
default one: `CatmullRomSpline`, `LinearSpline`, `MolangVariableMap`. The generator marks those 14 and
emits each with a constructor that throws `ShimUnsupportedError` naming the class, since constructing a
working `ItemStack` would be modelling engine behaviour the shim does not model
[[r:shim-supplies-values-not-behaviour]] [[d:constructible-classes-throw-unsupported]]. The
constructible set is read out of the declarations, not listed by hand, so a bump that makes a class
constructible carries it along. The other 425 keep the declarations' `private constructor()` and throw
on `new` as the engine does — the fakes take these prototypes directly rather than reaching a class
through `new`.

### What prototype identity costs

Two limits come with answering `instanceof` natively rather than by a portable mark, and both are
accepted rather than designed around.

A fake whose prototype does not come from this package answers `false`. A third party faking the
engine their own way imports the shim's classes and extends them; there is no mark to apply instead
[[d:fakes-are-instances-of-the-shims-classes]]. For a **real** engine object the answer is false too,
which is safe because the case does not arise — the alias exists only in a runner's configuration, so
a process holding a real engine object never resolved `@minecraft/server` to the shim.

The package installed at two `node_modules` depths yields two `Player` objects, and a fake built from
one fails `instanceof` against the other with no diagnostic. This is a known limit and the design does
nothing about it: no fallback, no duplicate detection. Short of that, the pack's `Player` and the
fakes' are the same object for the same reason the aliased module and the root entry are — two entry
points of one package reaching one internal module, one resolution, one instance, measured across two
alias shapes and two install shapes [[f:alias-and-control-subpath-are-one-module-instance]]. That is
the shape the fact measured, so nothing here extends it past what was run.

## The module singletons and the control surface

The shim exports `world` and `system` as mutable module-scope bindings — `export let` — because that
is how most packs reach the engine, and because a live binding is what lets a pack that captured
neither at import time read the current one at call time. `system` scheduling alone is reached by 84%
of surveyed public packs [[f:public-packs-reach-past-entities-and-events]].

`__useServer(server)` points both bindings at `server.world` and `server.system`. It takes any object
carrying those two properties — a `createServer()` result satisfies it structurally, and so does an
object literal a consumer assembles — and it is declared over that structure rather than over a fake's
type, so a consumer's own server object is as installable as the package's.

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

That is the whole of what the shim does at run time. It holds two bindings, a set of generated
constants, and a set of memberless classes; it models no engine behaviour, dispatches no event, and stores no state of
its own beyond the two bindings. Every behaviour a test observes comes from the server object the
test installed [[r:shim-supplies-values-not-behaviour]].

## Typing

`tsc` never follows a runner's alias, so a pack's own `import { Player } from '@minecraft/server'`
typechecks against the real `index.d.ts`, which the package does ship — it is a declarations-only
package, which is exactly why the runtime import fails and the type check does not
[[f:server-package-ships-types-only]]. That half needs no design and no consumer configuration.

The half that does is the test file, which imports a control surface `@minecraft/server`'s
declarations do not declare. The shim answers it by putting that surface on a specifier that really
exists and is not the aliased one: the package root, `@twin-digital/minecraft-test-lib`, which
exports `__useServer`, `ShimNotInstalledError`, `ShimUnsupportedError` and `__serverVersion` beside
the fakes' own exports, with declarations of its own [[d:control-surface-joins-the-package-root]].
Because a test imports the control surface by that name rather than from the aliased specifier, `tsc`
resolves it by ordinary node resolution and the consumer adds no `paths` entry to any `tsconfig`; and
because the root is where a test already imports `createServer` from, the arrange half of a test file
is one import line. A TypeScript consumer's suite therefore typechecks with no cast and no `any` on
either half [[r:a-consumer-suite-still-typechecks]].

The root is available for that job because the aliased module is no longer the root. What forced the
split when the shim was its own package still holds in the same words — the module a pack sees as
`@minecraft/server` must carry only names those declarations declare, or `__useServer` becomes an
export of the engine's own specifier — but it now falls on the `./server` subpath, and a separate
`./control` beside a root a test imports anyway would be a third specifier earning nothing.

This turns on the root and the aliased module being one module instance at run time; if a runner
resolves them to two, the test's `__useServer` writes bindings the pack never reads. The package's
module graph is what keeps them together: neither entry re-exports from the other, and both re-export
from one internal module, `src/state.ts`, which holds the two bindings, `__useServer`, and the shim's
error classes. `./server` takes `world` and `system` from it; the root takes `__useServer` and the
errors from it [[d:both-entries-re-export-one-internal-module]].

That shape is measured, not hoped for. Under vitest 4.1.10 on node 24, a `resolve.alias` from
`@minecraft/server` to the shim and an ordinary import of a second entry point of the same package
reach the same instance of that internal module, and the pack read back the exact `world` and `system`
the test installed through that second entry — across two alias shapes (the bare specifier, the
resolved entry file) crossed with two install shapes (a `file:` symlink, an unpacked `npm pack`
tarball), all four runs reporting one evaluation of the state module
[[f:alias-and-control-subpath-are-one-module-instance]]. Two things about the reach of that result.
It is a vitest result: jest, bun, CJS and a duplicate install at two `node_modules` depths were not
exercised, which is the same reach the runner choice below already commits to. And what it aliased
was a package's bare name or its resolved entry file, where the alias here names a *subpath* of the
package — the same mechanism, one resolution shape further, and the conformance suite below asserts
the single instance under the shape actually shipped rather than inferring it.

The plugin contributes the specifier alias, and a consumer who writes an alias of their own instead
may point it at the resolved entry *file* — what one surveyed pack does — which reaches the same
single instance, measured alongside the specifier shape.

No install shape carries a `tsconfig` `paths` entry, and the README says so rather than leaving it to
inference [[d:control-surface-joins-the-package-root]]. A `paths` entry pointing `@minecraft/server` at the
shim's declarations would break the half that already works: pack code uses these names in type
position — `(p: Player)`, `cause: EntityDamageCause` — and in the shim's declarations `Player` is a
`const` with no type of that name and `GameMode` is a frozen object rather than an `enum`, so pack code
stops compiling. `tsc` resolving `@minecraft/server` to the real `index.d.ts` is the design, not an
accident to paper over.

## The boundary with the fakes

The module surface and the fakes ship as one package, `@twin-digital/minecraft-test-lib`
[[d:one-package-carries-the-module-surface-and-the-fakes]]. The boundary between them is still real —
`minecraft/test-lib` specifies every modelled behaviour and this design specifies the module surface,
its generation, and the install — but it is a boundary inside a package, so it is drawn by which
module imports which and not by a dependency edge, a peer range, or a release order. That the library
supplies the module surface a consumer aliases, and the runner tooling that configures the alias, is
the library's own commitment [[f:test-lib-supplies-the-module-surface-and-the-runner-tooling]]; this
design is what that commitment is discharged by. The consumer's runner configuration is still where
the interception happens — the plugin only contributes an entry to the *consumer's* config — and the
plugin being a line they add once and stop thinking about is as close to the package doing the
intercepting as this goes. Four consequences a builder acts on.

The imports run one way. The fakes import the generated classes to build their prototypes; nothing in
`./server`, the root's control exports, or the generated files imports a fake
[[d:fakes-are-instances-of-the-shims-classes]]. The one module that reaches the fakes is `./vitest`,
which calls `createServer` [[d:the-setup-module-builds-the-servers-the-package-ships]] — an ordinary
internal import, since a setup module the consumer's runner loads is not on any path the fakes reach.

The enum values are generated here and the fakes do not supply them
[[d:values-are-generated-and-committed]]. If the fakes come to export an enum-shaped value of their
own, nothing collides: one package has one pinned `@minecraft/server`, so both are read out of the
same declarations and a test and a pack comparing them are comparing the same literal strings.

`instanceof` needs no predicate export and no protocol. The fakes take these prototypes directly, so
the answer comes from the prototype chain and nothing calls an `isPlayer` or an `isEntity`
[[d:fakes-are-instances-of-the-shims-classes]].

The install documentation is the package's README, which is also the fakes' README — the plugin entry
and its options, the `./vitest` fallback and the setup-file ordering, the one-scenario-per-file cost,
the `2.8.0` version statement, the uncovered `@minecraft/*` modules, and the non-vitest recipes
[[d:install-documentation-lives-with-the-shim]]. The consumer who arrives wanting the fakes and
reaches for the module import is reading the install story on the page they are already on, rather
than meeting the unresolved import first [[f:server-import-fails-without-an-alias]].

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

Nothing here publishes a package. `@twin-digital/minecraft-test-lib` is the one package, and this
design contributes three entry points to it and one addition to its root
[[d:one-package-carries-the-module-surface-and-the-fakes]]:

- `./server` — the module the alias points at, carrying only names `@minecraft/server`'s declarations
  declare: the generated values, the generated classes, and `world` and `system`.
- `./vite` — the plugin.
- `./vitest` — the setup module the plugin names.
- and, on the package root `.`, the control surface: `__useServer`, `ShimNotInstalledError`,
  `ShimUnsupportedError` and `__serverVersion`, exported beside the fakes' own exports
  [[d:control-surface-joins-the-package-root]].

A runner integration is a subpath of this package, never a package of its own — a `./jest` or `./bun`
entry joins it if those runners come. `@minecraft/server` is a peer and a dev dependency, present so
the generator has declarations to read and so a mismatched consumer hears from their package manager
[[d:pinned-version-is-declared-as-a-peer-range]]; `vite` is a peer of the `./vite` entry. No entry
here depends on a test framework at run time.

The manifest sets `"type": "module"` and declares each of them in its `exports` map, beside the `.`
key the package already has, each carrying a `types` and a `default` condition:

```json
{
  "type": "module",
  "exports": {
    ".":        { "types": "./dist/index.d.ts",   "default": "./dist/index.js" },
    "./server": { "types": "./dist/server.d.ts",  "default": "./dist/server.js" },
    "./vite":   { "types": "./dist/vite.d.ts",    "default": "./dist/vite.js" },
    "./vitest": { "types": "./dist/vitest.d.ts",  "default": "./dist/vitest.js" }
  }
}
```

Every subpath the plugin names has to be declared there: a `setupFiles` entry naming an undeclared
subpath fails to resolve [[f:setup-files-resolve-as-modules-from-the-project-root]], and so does the
alias target.

Seven source files sit behind that — four hand-written, three generated. Hand-written: `src/server.ts`,
the aliased entry, re-exporting the generated values, the class exports, and `world`/`system`;
`src/state.ts`, the internal module `src/server.ts` and the package root both re-export from;
`src/vite.ts`, the plugin and its option type; and `src/vitest.ts`, the setup module. Generated:
`src/generated/values.ts`, `src/generated/classes.ts`, and `src/generated/class-exports.ts`, which
nothing outside the package imports directly. The package's own `src/index.ts` — the root, the fakes'
entry — re-exports the control surface from `src/state.ts`; that one line is the whole of what this
design asks of a file it does not own. All of it is TypeScript, compiled by `tsc` to `dist/` with
declarations emitted. The package scripts gain `generate`, which runs the generator over the pinned
declarations, and `check` runs it and fails on a dirty tree before building and testing, so a
declarations bump that changes the values fails the build until they are regenerated.

A consumer who wants nothing but the enum values takes the whole package and imports them from
`./server`; there is no values-only package, and the runtime cost of what comes with them is a set of
memberless classes and two bindings.

A second `@minecraft/*` module — `server-ui`, `server-net` — is out of this cycle, and a consumer
meets that on day one rather than eventually: the validation pack imports `@minecraft/server-ui`, and
loading it needed a second alias to a stub of the consumer's own
[[f:a-setup-file-server-makes-a-pack-test-file-boilerplate-free]]. The shim covers `@minecraft/server`
and nothing else, so a pack importing a value from another `@minecraft/*` module aliases that one
itself; the README says so rather than leaving the second `ERR_MODULE_NOT_FOUND` to explain it. When a
second module is wanted here, it is a second generated module on a second subpath — `./server-ui` —
and a second alias entry the same plugin contributes, built by the same generator against the same
pinned family [[d:one-package-carries-the-module-surface-and-the-fakes]].

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
  name a non-empty `world`, asserting the setup module saw them;
- a test reaching `__useServer` from the package root and a fixture pack reading `world` through the
  alias to `./server`, asserting the two are one module instance under the alias shape shipped;
- a consumer setup file of the suite's own beside the plugin, asserting both ran and the plugin's ran
  second [[f:a-plugins-config-merges-with-the-consumers-own-entries]];
- the control run with the plugin removed, asserting the resolution failure returns;
- `instanceof` answering true for an instance of an exported class, true for an instance of a
  declared subclass against its ancestor, and false for a plain object and for an instance of a
  different class;
- `EntityHealthComponent.componentId` reading the declared id string, a registry static throwing
  `ShimUnsupportedError`, and `new ItemStack('minecraft:stone', 1)` throwing it too;
- a count of the classes `src/generated/class-exports.ts` declares against the declarations' own, so
  a class the generator stopped emitting fails a test rather than a consumer's import;
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
      src/generated/classes.ts (the constant-statics, lookup-statics and constructible-class
      records), and src/generated/class-exports.ts (one real class declaration per declared class,
      with its declared extends, its statics, and its constructor)
    excludes: >-
      the shim's own error classes, which shim-state holds and the emitted classes' throwing
      constructors and statics raise
    after: [shim-state]
  - id: shim-state
    responsibility: >-
      src/state.ts — the live world and system bindings, the throwing sentinel Proxy they hold while
      unset, __useServer as install and reset, ShimNotInstalledError and ShimUnsupportedError
    excludes: any state beyond the two bindings
  - id: aliased-entry
    responsibility: >-
      src/server.ts and the ./server export key — the module the alias points at, re-exporting the
      generated values, the generated classes, and world and system, and nothing from the control
      surface
    after: [values-generator, shim-state]
  - id: control-exports
    responsibility: >-
      the control surface on the package root — __useServer, ShimNotInstalledError,
      ShimUnsupportedError and __serverVersion re-exported from src/state.ts by src/index.ts, with
      its declarations
    excludes: everything else the root exports, which the fakes' own design owns
    after: [shim-state]
  - id: setup-module
    responsibility: >-
      src/vitest.ts — read the options off process.env, call createServer, apply the world presets,
      and install the server at module scope
    excludes: registering any per-test hook, which waits on a reset the fakes do not expose
    after: [control-exports]
  - id: vite-plugin
    responsibility: >-
      src/vite.ts — the minecraftShim plugin and its option type, whose config hook contributes the
      resolve.alias entry, the test.setupFiles entry naming the ./vitest subpath, and the options as
      JSON in test.env
    excludes: doing any install work itself; the setup module it names does that
    after: [setup-module]
  - id: manifest-and-recipes
    responsibility: >-
      the manifest entries this design adds — the ./server, ./vite and ./vitest export keys, the
      @minecraft/server peer and dev dependency, the vite peer, the generate script and the
      clean-tree check — the tsc build of these files, and the install half of the README: the
      plugin entry and its options, the ./vitest fallback and the setup-file ordering, the
      one-scenario-per-file cost, and the bun and jest-ESM recipes
    excludes: the package's name, engines and version, which are the package's to set
    after: [aliased-entry, control-exports, vite-plugin]
  - id: conformance-suite
    responsibility: >-
      the two fixture packs installed by the plugin alone, the plugin-removed control, the options
      and setup-ordering cases, the single-instance case across the root and ./server, the
      instanceof, statics and unset-access cases, the packed-tarball peer check, and the typecheck
      of a consumer-shaped test file
    after: [manifest-and-recipes]
```
