# workspace-root-candidate-probe

Four never-installed fixture workspaces under `fixtures/`, asking what each manager's enumeration
library returns for the root package and for a root that declares no members:

- `npm-no-workspaces` — root `package.json` with no `workspaces` array
- `npm-empty-workspaces` — root `package.json` with `"workspaces": []`
- `npm-with-workspaces` — root `package.json` with `"workspaces": ["packages/*"]` and one member,
  `packages/good`
- `pnpm-no-packages-field` — `pnpm-workspace.yaml` holding no `packages` field

The fixtures are committed uninstalled: no `node_modules`, no lockfile. The probe's own
dependencies are installed outside this directory so the fixtures stay that way.

Re-run (network required):

```
mkdir /tmp/rootcand && cd /tmp/rootcand && npm init -y
npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
cp <this dir>/probe.mjs . && node probe.mjs <this dir>/fixtures > <this dir>/OUTPUT.txt
```

`OUTPUT.txt` beside this file is the captured stdout of that command, run 2026-07-27 with Node
24.16.0, `@npmcli/map-workspaces` 6.0.0, `@pnpm/workspace.find-packages` 1000.0.65,
`@pnpm/workspace.read-manifest` 1000.3.1.
