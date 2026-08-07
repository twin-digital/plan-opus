---
tags:
  - dev-loop
---

# a pack's dev script does not build the workspace dependencies its own build needs

`minecraft-server start` runs each selected pack's own `build` script directly (`runBuild` in
`src/package-scripts/scripts.ts` shells out to `<manager> run build` in the package directory). That
bypasses the workspace's task graph, so a workspace dependency the pack's build *imports* is never
built.

For a pack built by the dev kit this is fatal on a clean checkout. The pack's
`tsdown.config.d/*.ts` imports `@twin-digital/mc-dev-kit/build`, whose exports map points at
`dist/build.js`. With `@twin-digital/mc-dev-kit` unbuilt, tsdown cannot load the config file at all:

    ERROR  Error: Failed to load the config file.
    Cannot find module '.../village-guard/node_modules/@twin-digital/mc-dev-kit/dist/build.js'
      imported from .../village-guard/tsdown.config.d/minecraft-pack.ts

The loop then carries on and deploys the pack as a stub — the world loads with the pack in its pack
stack and no script behind it, which reads as "it worked" in the log:

    [deploy] @twin-digital/village-guard: nothing built at .../dist/behavior_pack; deployed as a stub

Observed 2026-08-07 on `impl/village-guard/004`, running
`pnpm --filter @twin-digital/village-guard dev --accept-eula`. Running
`turbo run build --filter=<pack>^...` first makes the same command succeed, which locates the gap.

This bears on the minecraft-addon preset's r-992moral, whose verification is "from a clean checkout
of the monorepo, run the pack's dev-server script and nothing else". Whether a build counts as
"nothing else" the way `pnpm install` implicitly does is the owner's call; either way the failure is
silent, and a stub deploy reporting success is worth fixing on its own.

Candidate homes: the harness building through the workspace's task runner rather than the package
script; the generated pack scripts carrying a `predev`; or a turbo `dev` task with `dependsOn:
["^build"]`, which only helps callers who go through turbo.
