# Proxy-swap probes

One question, in four captured outputs: can a stable `Proxy` whose target is swapped per test give a
behavior pack per-test isolation, when the pack subscribed once, at module-evaluation time, and is
never evaluated again.

| probe | question | output |
| --- | --- | --- |
| `swap` | do a pack's module-scope registrations reach the server installed after a swap — under four shim shapes | `swap.out.txt` |
| `capture` | what the two shapes that carried the registrations still miss, for a pack that keeps what the engine gave it | `capture.out.txt` |
| `beneath` | does replacing the state under the fakes, with the bindings never moving, keep the registrations | `beneath.out.txt` |
| `shape` | what a shim could learn from the fake's own shape about which members register | `shape.out.txt` |

## The four shim shapes

| package | shape |
| --- | --- |
| `shim-shallow/` | one stable `Proxy` per binding over a swappable target — `clean-test-file-probes/shim-proxy` unchanged, driven by a swap |
| `shim-deep/` | recursive: every object reached by a string key is itself a `Proxy`, one per path, so `world.afterEvents.entityHurt` has fixed identity and resolves its target at access time |
| `shim-signal/` | `shim-deep` plus the shim holding the subscriber sets: `subscribe` never reaches the fake, and each swap installs one trampoline on the new server's signal. `system.runInterval` has no set to hold, so the scheduler calls are journalled and re-issued |
| `shim-replay/` | `shim-deep` plus a journal of every call made through the proxy tree before the first swap, re-issued against each new server. Positional, not nominal: no member names anywhere |

`shim-signal` names `subscribe`, `unsubscribe`, `run`, `runInterval`, `runTimeout` and `runJob` in its
source. `shim-replay` names none of them.

## What is here

| path | what it is |
| --- | --- |
| `swap-state.ts` | server A, installed at module scope, and the fresh server each swap points at |
| `setup-swap.ts` | the setup file: install A, then swap in a `beforeEach` |
| `swap.test.ts` | the test file — static imports only, the pack imported for its side effects |
| `internals.ts` | the per-server census, read through the library's private `ServerState` |
| `capture-pack.ts` | a pack that keeps a dimension, a scoreboard and two counters at module scope |
| `capture.test.ts` | the same swap, driving that pack, against `shim-signal` and `shim-replay` |
| `beneath.ts`, `setup-beneath.ts`, `beneath.test.ts` | the contrast: one server, never swapped, its state replaced between tests |
| `shape.test.ts` | no shim — what `world.afterEvents`, `world` and `system` reveal about themselves |
| `stub-server-ui.js` | the pack imports `@minecraft/server-ui`; nothing here drives a form |
| `run.mjs` | runs one probe, or all four, and writes the `.out.txt` files |

The realistic subject for `swap` and `beneath` is `bencrob/marron-town-mod` (MIT) at `2c025b4`,
unmodified: its `src/main.ts` subscribes to five world events and registers two `system.runInterval`
loops while the module evaluates. Its source is not committed; `fetch-packs.mjs` clones it.

`internals.ts` and `beneath.ts` are not APIs a consumer could call. `@twin-digital/minecraft-test-lib`
exports neither a census nor a reset, so both reach `src/runtime/state.ts` and `src/runtime/member.ts`
through aliases. They stand for the capability, not for a supported call.

## Running it

The test library is not published; `MC_TEST_LIB` points at its `src/index.ts` in an opus checkout.

```sh
npm install
node fetch-packs.mjs
export MC_TEST_LIB=<opus>/nodejs/minecraft/test-lib/src/index.ts
node run.mjs          # all four probes
node run.mjs swap     # one of: swap capture beneath shape
```

The `swap` probe's first two invocations exit 1 on purpose: the assertion that the pack reacted on
the swapped-in server is the measurement.
