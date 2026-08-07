---
tags:
  - dev-loop
---

# minecraft-server deploys a pack as a stub and reports it live

`minecraft-server start` runs each selected pack's own `build` script directly (`runBuild` in
`src/package-scripts/scripts.ts` shells out to `<manager> run build` in the package directory),
outside the workspace's task graph. When that build fails, the loop carries on and deploys whatever
is on disk:

    [deploy] @twin-digital/village-guard: nothing built at .../dist/behavior_pack; deployed as a stub

The world then loads with the pack in its pack stack and no script behind it, which reads as success
in the log — an author sees `Pack Stack - [00] village-guard` and no protection in the world.
Observed 2026-08-07 on `impl/village-guard/004`.

The build failure that surfaced this is fixed in opus by declaring a `dev` task in `turbo.json`
(`dependsOn: ["^build"]`), so a dev run builds the workspace dependencies a pack's build imports.
What remains is the harness's own behaviour: a failed build should not deploy a stub and report the
pack as hosted. Either refuse to deploy the pack and say so plainly, or fail the run.

Worth deciding alongside: whether the harness should build through the workspace's task runner at
all, rather than the package script, given its README claims "from a clean checkout ... with every
pack built". The turbo task makes that unnecessary for opus, and does nothing for a consumer
workspace without turbo.
