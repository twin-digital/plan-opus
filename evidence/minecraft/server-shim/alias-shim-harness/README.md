# Alias-shim harness

The committed repro behind `f:alias-shim-runs-unmodified-pack-code` and the control half of
`f:server-import-fails-without-an-alias`. It runs two unmodified public packs' engine-facing code
against `@twin-digital/minecraft-test-lib`, with `@minecraft/server` aliased to `stub/`.

## What is here

| path | what it is |
| --- | --- |
| `stub/minecraft-server.js` | the shim: enum re-exports, `Player`/`Entity` brands, live `world`/`system` bindings with a `__useServer` setter |
| `stub/enums.generated.js` | 64 enums generated from the pinned `@minecraft/server` 2.8.0 declarations |
| `vitest.config.ts` | the alias that installs the shim |
| `no-alias.config.ts` | the control: same suite, no alias |
| `combat-handler.test.ts`, `adapters.test.ts` | `bencrob/marron-town-mod` (MIT) at `2c025b4` |
| `gunfight.test.ts` | `xigma0512/GunFight-Arena` (MIT) at `0f16e88` |
| `generate-enums.mjs` | reads the installed `index.d.ts` and writes `stub/enums.generated.js` |
| `harness.out.txt`, `no-alias.out.txt`, `generate-enums.out.txt` | captured output of the three runs |

The pack sources are not committed; `fetch-packs.mjs` clones them at those commits.

## Running it

`@twin-digital/minecraft-test-lib` is not published, so point `MC_TEST_LIB` at its source in an
opus checkout.

```sh
npm install
node fetch-packs.mjs
export MC_TEST_LIB=<opus>/nodejs/minecraft/test-lib/src/index.ts
npx vitest run --reporter=verbose      # 26 passed
npx vitest run -c no-alias.config.ts   # fails to resolve @minecraft/server
```

`node generate-enums.mjs` rewrites `stub/enums.generated.js` from the installed declarations; on
2.8.0 it reproduces the committed file byte for byte.
