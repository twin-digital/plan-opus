# Alias/control instance probe

Settles whether a runner's alias onto the shim and an ordinary import of the shim's `./control`
subpath reach one module instance, so a test's `__useServer` writes the bindings the pack under
test reads.

## What is here

| path | what it is |
| --- | --- |
| `shim/` | a real package named `@twin-digital/minecraft-server-shim`, with an `exports` map carrying `.` and `./control` |
| `shim/state.js` | the mutable module both entries re-export from: `world`, `system`, `__useServer`, plus a per-instance uuid and an evaluation counter |
| `shim/index.js` | the entry a consumer aliases over `@minecraft/server` |
| `shim/control.js` | the `./control` subpath: `__useServer`, `brandAs`, `ShimNotInstalledError`, `__serverVersion` |
| `pack.js` | stands in for unmodified pack code; imports `@minecraft/server` and reads the singletons |
| `instance-identity.test.ts` | writes state through `./control`, reads it through the aliased specifier |
| `bare-specifier.config.ts` | shape A: alias `@minecraft/server` at the shim's bare package name |
| `entry-file.config.ts` | shape B: alias it at the shim's resolved entry *file* |
| `run.mjs` | runs both shapes against both install shapes and writes `probe.out.txt` |
| `probe.out.txt` | captured output of the four runs |

The two install shapes are `npm i file:./shim`, which symlinks the source directory into
`node_modules`, and an unpacked `npm pack` tarball, which puts a real directory there.

## Running it

```sh
npm install
node run.mjs   # 4 runs, each 2 passed
```

`run.mjs` restores the symlink install when it finishes.
