# workspace-enumeration-probe

Enumerates two never-installed fixture workspaces — `fixtures/npm-ws` (a root `package.json`
`workspaces` array) and `fixtures/pnpm-ws` (a `pnpm-workspace.yaml` with an `!` exclusion) —
using the package managers' own published libraries, and records whether either manager's CLI
is on PATH.

The fixtures are committed uninstalled: no `node_modules`, no lockfile. The probe's own
dependencies are installed outside this directory so the fixtures stay that way.

Re-run (network required):

```
mkdir /tmp/enum && cd /tmp/enum && npm init -y
npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
cp <this dir>/probe.mjs . && node probe.mjs <this dir>/fixtures > <this dir>/OUTPUT.txt
```

`OUTPUT.txt` beside this file is the captured stdout of that command, run 2026-07-26 with
Node 24.16.0, `@npmcli/map-workspaces` 6.0.0, `@pnpm/workspace.find-packages` 1000.0.65.
