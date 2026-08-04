# Plugin-install probes

One question, in five captured outputs: can the shim ship something that removes one or both of the
consumer's two config entries — the `resolve.alias` and the `test.setupFiles` entry?

| probe | question | output |
| --- | --- | --- |
| `vi-mock` | can `vi.mock` stand in for the alias — in a test file, and in a setup file | `vi-mock.out.txt` |
| `plugin` | can one plugin contribute both the alias and the setup file from its `config` hook | `plugin.out.txt` |
| `options` | how the plugin's options reach a `setupFiles` module that takes no arguments, and which forms of `setupFiles` entry resolve | `options.out.txt` |
| `merge` | does the plugin survive a consumer who already has their own alias table and setup file | `merge.out.txt` |
| `subpath` | the contrast: no plugin, `setupFiles` naming the shim's published subpath directly | `subpath.out.txt` |

## What is here

| path | what it is |
| --- | --- |
| `shim/` | the shim package: `enums.generated.js` (from `alias-shim-harness/stub/`, unchanged), the `export let` bindings the spec ships, a `./control` subpath, a `./setup` subpath, and `./vite` |
| `shim/vite.js` | the plugin under test — its `config` hook returns `resolve.alias` and `test.setupFiles`, and its options select which form of setup entry and which options channel to use |
| `shim/setup.js` | the setup module the plugin points at; it reads the plugin's options out of `test.env` or a `define` replacement |
| `fake-server/` | the stand-in server the setup installs, and the census a test reads |
| `alt-server.js` | a second factory, selected by the plugin's `serverModule` option |
| `mock-in-test.test.ts` | `vi.mock('@minecraft/server', …)` in the test file, with no alias configured |
| `setup-mock.ts`, `mock-in-setup.test.ts`, `mock-live-binding.test.ts` | the same mock moved into a setup file, and two test files under it |
| `no-install.test.ts` | the control: the same pack and imports, with neither alias nor mock |
| `plugin.test.ts` | the plugin probe's test file — static imports only, assertions driven by `PROBE_EXPECT` |
| `merge.config.ts`, `merge-array.config.ts`, `setup-consumer.ts`, `consumer-marker.js`, `merge.test.ts` | the consumer who already has entries of their own, alias table in object and in array form |
| `stub-server-ui.js` | the pack imports `@minecraft/server-ui`; nothing here drives a form |
| `run.mjs` | runs one probe, or all five, and writes the `.out.txt` files |

The realistic subject is `bencrob/marron-town-mod` (MIT) at `2c025b4`, unmodified: its `src/main.ts`
subscribes to five world events and registers two `system.runInterval` loops while the module
evaluates. Its source is not committed; `fetch-packs.mjs` clones it at that commit.

`fake-server/` is not `@twin-digital/minecraft-test-lib`. The library is unpublished and absent from
this checkout, so these probes carry a ~120-line fake of their own. It records what the pack
subscribes and schedules and answers `world.getDimension` from the dimensions it was built with;
nothing about the library's behaviour is measured here, only what the runner does with a module the
consumer configured.

## Running it

```sh
npm install
node fetch-packs.mjs
node run.mjs           # all five probes
node run.mjs plugin    # one of: vi-mock plugin options merge subpath
```

Two invocations inside `options` exit 1 on purpose: a `setupFiles` entry naming a subpath the
package's `exports` map does not declare, and one naming a plugin's virtual module id, are the two
forms that do not resolve.
