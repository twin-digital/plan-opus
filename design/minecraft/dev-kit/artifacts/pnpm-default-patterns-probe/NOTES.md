# pnpm-default-patterns-probe

Two never-installed fixture workspaces under `fixtures/`, asking what each manager's enumeration
library returns when it is handed **no patterns at all** and the workspace **does** hold nested
packages:

- `pnpm-no-packages-field-with-members` — a `pnpm-workspace.yaml` holding only a `catalog:`, plus a
  root `package.json`, `packages/alpha`, and `tooling/nested/beta`
- `npm-no-workspaces-with-members` — a root `package.json` with no `workspaces` array, plus
  `packages/alpha`

This is the case `workspace-root-candidate-probe` could not distinguish: its
`pnpm-no-packages-field` fixture holds nothing but the root, so "returned the root alone" there was
a property of the fixture rather than of the library. With members present, pnpm's finder falls
back to its own default patterns and returns every nested package alongside the root; npm's
returns an empty Map either way.

The fixtures are committed uninstalled: no `node_modules`, no lockfile. The probe's own
dependencies are installed outside this directory so the fixtures stay that way.

Re-run (network required):

```
mkdir /tmp/defaults && cd /tmp/defaults && npm init -y
npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
cp <this dir>/probe.mjs . && node probe.mjs <this dir>/fixtures > <this dir>/OUTPUT.txt
```

`OUTPUT.txt` beside this file is the captured stdout of that command, run 2026-07-27 with Node
24.16.0, `@npmcli/map-workspaces` 6.0.0, `@pnpm/workspace.find-packages` 1000.0.65,
`@pnpm/workspace.read-manifest` 1000.3.1 — the same versions the superseded probe ran against.
