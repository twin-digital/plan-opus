# rp-dependency-probe

What a manifest `dependencies` uuid entry for a **resource** pack does, on Bedrock dedicated server
1.26.43.1. Closes the last gap the other two runs left: they measured behavior-pack dependencies only,
and the cross-kind case was inference.

## What it does

One behavior pack — declaring `@minecraft/server` and a uuid dependency on a resource pack, byte-identical
across every scenario — against three worlds that differ only in the resource side.

| scenario | resource pack in pool | in resource activation list | asks |
| --- | --- | --- | --- |
| A `rpdepabsent` | no | no | does the behavior pack still load with its dependency missing |
| B `rpdepactive` | yes | yes | the control |
| C `rpdeppull` | yes | **no** | does the declared dependency activate it anyway |

Checks read through `EntityTypes.get` rather than by spawning, which sidesteps the ticking-chunk
requirement entirely — worth copying, it makes a probe far shorter.

## Findings

**A — an unsatisfiable resource-pack dependency is not enforced.** The behavior pack loaded at stack
position 00, its script evaluated, and its own entity type resolved. No dependency error appeared in the
log; the filter for `dependenc|missing|error|failed` matched nothing. Same as the behavior-pack case, so
`an-unsatisfiable-pack-dependency-is-not-enforced-at-load` now covers both kinds.

**C — a behavior pack's dependency activates a resource pack from the pool.** With the resource activation
list empty, `packstack-client-successCount` read `2` — identical to the fully-listed control B, against `1`
for A where the pack was not in the pool. So `world_resource_packs.json` need not name a resource pack the
active behavior pack depends on; presence in the pool is what matters. This extends
`a-declared-pack-dependency-activates-the-depended-on-pack` across pack kinds.

`entityTypes-total=129` in all three scenarios — the resource pack contributes no entity types, as
expected, and it is a useful invariant to assert against.

## Re-running

```sh
node evidence/minecraft/rpg-core/rp-dependency-probe/probe.mjs        # tears down after itself
node evidence/minecraft/rpg-core/rp-dependency-probe/probe.mjs --keep # leaves the container up
```

Needs a Docker daemon; publishes no ports; container and volume are named `rpg-rpdep-probe`. Roughly two
minutes. The traps documented in `../cross-pack-probe/NOTES.md` all still apply — in particular, do not set
`ONLINE_MODE=false`, and empty **both** pools per scenario.
