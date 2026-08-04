# workspace-member-fault-probe

Four never-installed fixture workspaces under `fixtures/`, one per (library, fault) pair. Each has
a healthy `packages/good` member so a skip is visible as a returned result, plus one faulty
directory the workspace pattern also matches:

- `npm-malformed`, `pnpm-malformed` — `packages/broken/package.json` is invalid JSON
- `npm-missing`, `pnpm-missing` — `packages/nomanifest/` holds no `package.json` (only a README,
  so git tracks the directory)

`npm-*` declare a root `workspaces: ["packages/*"]`; `pnpm-*` declare `packages: ["packages/*"]`
in `pnpm-workspace.yaml`. The fixtures are committed uninstalled: no `node_modules`, no lockfile.
The probe's own dependencies are installed outside this directory so the fixtures stay that way.

Re-run (network required):

```
mkdir /tmp/enum && cd /tmp/enum && npm init -y
npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
cp <this dir>/probe.mjs . && node probe.mjs <this dir>/fixtures > <this dir>/OUTPUT.txt
```

`OUTPUT.txt` beside this file is the captured stdout+stderr of that command, run 2026-07-26 with
Node 24.16.0, `@npmcli/map-workspaces` 6.0.0, `@pnpm/workspace.find-packages` 1000.0.65,
`@pnpm/workspace.read-manifest` 1000.3.1. The absolute paths in it are the worktree the run
happened in.
