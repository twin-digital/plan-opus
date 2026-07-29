# `@minecraft/server` test shim: Design Brief

## What this design is for

The subject is the piece a pack author installs in their **test runner's configuration** so that
unmodified behavior-pack code can be loaded and driven under test: a module standing in for
`@minecraft/server` at resolution time, supplying the enum values and classes a pack imports and the
module-scope `world`/`system` singletons a pack reaches the engine through. The design produces the
specification of that piece — what it exports, how a consumer installs it, how its values stay in
step with the pinned `@minecraft/server` version, and where its responsibility stops and
`@twin-digital/minecraft-test-lib`'s begins.

It exists because two gaps sit *before* the fakes can be used at all. First, `@minecraft/server`
2.8.0 publishes no `main`, `module`, `types` or `exports` key, so a module importing a value from it
— `EntityDamageCause.entityAttack`, or `Player` for an `instanceof` — cannot be resolved by a test
runner: node throws `ERR_MODULE_NOT_FOUND` and vitest fails the suite before a line of test code
runs [[f:server-import-fails-without-an-alias]]. `@minecraft/vanilla-data`, the one package in the
family that does ship runtime JavaScript, exports 12 id-constant namespaces and no API enum, so it
does not close that gap [[f:vanilla-data-ships-no-api-enums]]. Second, most packs reach the engine
through the module-scope `world` and `system` rather than through an injected parameter, so even a
loadable module has nothing to be driven by. The test library deliberately does not answer either:
it substitutes objects and does not intercept the module import
[[f:test-lib-does-not-intercept-the-module-import]], which is precisely why the shim is a separate
deliverable owned here.

That the shape works is established rather than assumed: a shim of this kind, aliased into vitest,
loads two unmodified public packs and lets 26 tests drive them against the library's fakes
[[f:alias-shim-runs-unmodified-pack-code]].

## In scope

- What the shim must export for a pack's value imports to resolve, and for `instanceof` against an
  exported class to answer correctly for a fake.
- How the module-scope `world` and `system` are made settable by a test, and what a consumer does
  between tests so one test's world does not leak into the next.
- How the enum values are produced, and how they are kept in step with a bump of the pinned
  `@minecraft/server` version.
- How a consumer installs the shim in their runner, and which runners are supported.
- The boundary with `@twin-digital/minecraft-test-lib`: what the shim depends on, what it merely
  cooperates with, and what changes (if any) it needs from the library.
- Whether it ships as one package or several, and under what name.

## Out of scope

- **How the fakes behave** — every modelled engine behaviour, its fidelity, and its coverage belong
  to `minecraft/test-lib`, whose requirements govern them.
- **Whether the library exports brand predicates** (`isPlayer`/`isEntity`) for the shim's
  `instanceof` to use — that is `minecraft/test-lib`'s change, proposed in plan-opus issue #115.
  This design may depend on it; it does not decide it.
- **How a pack is built, discovered or served** — `minecraft/dev-kit` and `minecraft/dev-server`.
- **How a pack is structured for testability** — a pack's own design; the shim's premise is that
  pack code is not edited for it.

## Done looks like

A pack author adds the shim and one entry to their runner config, writes a test that imports their
pack's engine-facing module unmodified, and it runs: the value imports resolve, `instanceof Player`
answers true for a fake player, and the pack's `world.getDimension(...)` reaches the world the test
created. Removing the shim's entry from the config puts the suite back to a resolution failure. No
line of the pack changes, and no enum value is hand-written by the author.

## What the design must still decide

- **One package or several.** Whether the shim ships as its own package, as an entry point of
  `@twin-digital/minecraft-test-lib`, or split between generated values and runtime bindings. To
  weigh: whether a consumer who wants only the enum values should have to take the fakes, and what
  a second `@minecraft/*` module (`server-ui`, `server-net`) would cost under each shape.
- **Documentation or an API.** Whether installing the shim is a documented config snippet the
  consumer copies, or a helper the design ships (`installInVitest`-style) that returns the alias
  entry. To weigh: how much config actually varies between consumers, against carrying an API
  surface bound to a runner's config schema.
- **Which runners, and in what module format.** The evidence in hand is vitest and ESM. Jest users
  realistically need CJS, and bun's `mock.module` is a third install shape. To weigh: what dual
  publishing costs against how many consumers a single-format shim excludes.
- **How the enum values are produced and kept current.** Generated at publish time from the pinned
  declarations, generated in the consumer's `postinstall`, or checked in — and what happens on a
  `@minecraft/server` bump. To weigh: 64 enums is mechanical either way; the question is who owns
  staleness, and how a consumer on a different server version is told.
- **Whether the shim depends on the library or merely cooperates with it.** A dependency lets
  `instanceof` use exported brand predicates (issue #115) and lets `__useServer`-style installation
  take a library server object; cooperation keeps the shim usable by someone who fakes the engine
  their own way.
- **How a consumer resets `world`/`system` between tests.** A setter the test calls in
  `beforeEach`, a runner setup file the shim ships, or per-test module isolation. To weigh: the
  live-binding module state is the one piece of the shim that is not per-test by construction.
- **How exactly `instanceof` answers.** The prototype brands `Player` and `Entity` by testing for a
  member (`'onScreenDisplay' in value`), which asks the consumer to know an implementation detail.
  Which classes get a brand at all, and what a brand answers for a *real* engine object, are open.

## Known tensions

- **The library's fiat versus the consumer's need.** `minecraft/test-lib` decrees that it does not
  intercept the module import [[f:test-lib-does-not-intercept-the-module-import]], and the whole
  value of this design is a module interception. The boundary is that the interception is the
  consumer's own runner configuration, and the shim is the material they configure it with — but
  the closer the shim sits to the library (a shipped setup file, an `installInVitest` helper), the
  more it reads as the library doing the intercepting. Where the line falls is this design's to
  state, and it will not satisfy both readings.
- **Ecosystem shape versus the library's shape.** Every surveyed public pack that tests
  engine-facing code at all does it by aliasing `@minecraft/server` onto a hand-written stub — 6 of
  103, none by injecting the engine as a parameter (`design/minecraft/test-lib/artifacts/
  pack-testing-survey.md`). The library was designed for injection. A shim that only makes value
  imports resolve serves the injection style; one that also holds the singletons serves what packs
  actually do, and pulls module-level mutable state into a project that has none.
- **Fidelity versus staleness.** Enum values generated from a pinned version are exact for that
  version and silently wrong for another. A consumer whose pack declares `^1.17.0` (as one
  validation subject does) gets values from 2.8.0 and no warning.
- **Reach versus surface.** Supporting more runners and both module formats is what makes the shim
  usable by the ecosystem it was measured against; each one is a build target, a test matrix entry,
  and an install path to document.
- **Doing nothing is a live option.** A reading exists in which this is `@minecraft/server`'s defect
  and the right answer is a documented recipe rather than a shipped package. The design should say
  why shipping beats documenting, or ship documentation.
