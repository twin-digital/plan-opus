# Clean-test-file probes

Four probes into what it would take for a consumer's *test file* to carry no shim boilerplate at
all — no dynamic `await import(…)` of the pack, no `vi.resetModules()` prelude. Each is one
captured output.

| probe | question | output |
| --- | --- | --- |
| `stable-bindings` | do stable `Proxy` bindings over a `globalThis` store survive a registry reset, still throw when unset, and what identity semantics change | `stable-bindings.out.txt` |
| `file-scoped` | does one server installed by a setup file at module scope leave the test file clean, and how much state leaks between tests in that shape | `file-scoped.out.txt` |
| `reset` | can a server be cleared in place while the pack's module-scope subscriptions stay bound | `reset.out.txt` |
| `async-context` | does an `AsyncLocalStorage`-backed store resolve correctly for concurrent tests and for deferred callbacks | `async-context.out.txt` |

## What is here

| path | what it is |
| --- | --- |
| `shim-proxy/` | the stable-binding variant: `world` and `system` are `Proxy` objects of fixed identity, resolving the current server out of `globalThis[Symbol.for('@twin-digital/minecraft-server-shim.store')]` |
| `shim-let/` | the shape the spec ships: `export let world` / `export let system`, reassigned by `__useServer`, with a throwing sentinel while unset |
| `shim-als/` | the same stable `Proxy` bindings, resolving through an `AsyncLocalStorage` store instead |
| `stable-bindings.test.ts` | one suite run against both `shim-proxy` and `shim-let`, through the `@probe/shim-control` alias |
| `setup-file-scoped.ts` | probe 2's whole setup: one `createServer()`, installed at module scope |
| `file-scoped.test.ts` | probe 2's test file — static imports only, the pack imported for its side effects |
| `reset-in-place.ts` | probe 3's reset, reaching the library's private `ServerState` through its internal modules |
| `setup-reset.ts` | probe 3's setup: the same one server, plus the reset in a `beforeEach` |
| `reset.test.ts` | probe 3's test file — three tests that do the identical thing |
| `async-context.test.ts` | probe 4: a context from a hook, `describe.concurrent`, and a deferred `system.runInterval` callback |
| `stub-server-ui.js` | the pack imports `@minecraft/server-ui` as well; nothing here drives a form |
| `run.mjs` | runs one probe, or all four, and writes the `.out.txt` files |

The realistic subject for probes 2 and 3 is `bencrob/marron-town-mod` (MIT) at `2c025b4`, unmodified:
its `src/main.ts` subscribes to five world events and registers two `system.runInterval` loops while
the module evaluates. Its source is not committed; `fetch-packs.mjs` clones it at that commit.

`reset-in-place.ts` is not an API a consumer could call. `@twin-digital/minecraft-test-lib` exports
no reset, so the probe imports the library's `src/runtime/state.ts` and `src/runtime/member.ts`
through aliases and writes the private record directly. It stands for the capability, and measures
what surviving a reset costs — not for a supported call.

## Running it

The test library is not published; `MC_TEST_LIB` points at its `src/index.ts` in an opus checkout.

```sh
npm install
node fetch-packs.mjs
export MC_TEST_LIB=<opus>/nodejs/minecraft/test-lib/src/index.ts
node run.mjs                  # all four probes
node run.mjs stable-bindings  # one of them
```

The `reset` probe's second invocation exits 1 on purpose: clearing the scheduled runs is what
unregisters the pack's module-scope loops, and the failing assertion is the measurement.
