# Peer range mismatch probe

Settles what each package manager does when a package declares `@minecraft/server` as a peer
dependency at `^2.8.0` and the consumer installing it has pinned a 1.x range — a warning, or a
failed install — and what `peerDependenciesMeta.optional` changes about that.

## What is here

| path | what it is |
| --- | --- |
| `shim/package.json` | a package peer-declaring `@minecraft/server` at `^2.8.0` and nothing else |
| `shim/index.js` | its entry, which must load with no peer installed |
| `consumer/package.json` | a consumer depending on `@minecraft/server` at `^1.17.0` and on the shim |
| `consumer/run-time-check.mjs` | imports the shim and reports the installed versions after the attempt |
| `run.mjs` | runs the matrix and writes `peer-range-mismatch.out.txt` |
| `peer-range-mismatch.out.txt` | captured output of the 12 runs |

`^1.17.0` resolves to `@minecraft/server` 1.19.0, the newest 1.x on the registry, so the mismatch is
against a real published version rather than a fabricated one.

The matrix is three managers × two `peerDependenciesMeta` variants × two install shapes. The two
shapes are `file:../shim`, which puts the source directory into `node_modules`, and a `file:` spec
pointing at an `npm pack` tarball, which is the shape a published install takes. Each case gets its
own work directory, with no lockfile, and its own shim version so no manager's content cache carries
one case's manifest into another. pnpm's install summary defers the detail to `pnpm peers check`, so
each pnpm case runs that too and captures its exit code and listing.

## Running it

```sh
node run.mjs
```

It needs registry access to fetch `@minecraft/server`. A manager that is not installed is reported
as skipped in the output rather than omitted. `run.mjs` removes its `work/` directory when it
finishes.
