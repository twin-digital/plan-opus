# pnpm-node-modules-probe

Three never-installed fixture workspaces under `fixtures/`, asking whether each manager's
enumeration library returns packages that sit under a `node_modules` path:

- `pnpm-no-packages-field-with-node-modules` — a `pnpm-workspace.yaml` holding only a `catalog:`, so
  the library runs on its own default patterns
- `pnpm-explicit-double-star-with-node-modules` — the same tree with `packages: ['**']`, a pattern
  broad enough to reach into `node_modules`
- `npm-explicit-double-star-with-node-modules` — the same tree with `workspaces: ["**"]`

Each holds a root `package.json`, `packages/alpha` as a control outside `node_modules`, and two
packages inside it — `node_modules/plain-dep` and `node_modules/@scope/scoped-dep`. The control is
what makes the answer readable: a library returning nothing at all would otherwise be
indistinguishable from one that skipped `node_modules` correctly.

This is the case `pnpm-default-patterns-probe` could not answer — its fixtures hold no
`node_modules`, so the whole-tree sweep it recorded said nothing about what happens on an installed
workspace.

The `node_modules` trees here are hand-written fixture content, not the product of an install: no
`npm`/`pnpm` install has ever run in these directories, and the probe prints the absence of a
lockfile, of `node_modules/.package-lock.json`, and of `node_modules/.modules.yaml` to show it. The
probe's own dependencies are installed outside this directory so the fixtures stay that way. The
repository `.gitignore` carries a negation for `design/**/artifacts/**/fixtures/**/node_modules/`,
without which these fixture packages would not be committed at all.

Re-run (network required):

```
mkdir /tmp/nmprobe && cd /tmp/nmprobe && npm init -y
npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
cp <this dir>/probe.mjs . && node probe.mjs <this dir>/fixtures > <this dir>/OUTPUT.txt
```

`OUTPUT.txt` beside this file is the captured stdout of that command, run 2026-07-27 with Node
24.16.0, `@npmcli/map-workspaces` 6.0.0, `@pnpm/workspace.find-packages` 1000.0.65,
`@pnpm/workspace.read-manifest` 1000.3.1.
