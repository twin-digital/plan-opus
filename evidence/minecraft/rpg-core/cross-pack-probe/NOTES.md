# cross-pack-probe

What crosses a behavior-pack boundary, on Bedrock dedicated server 1.26.43.1. Two questions were
asked; four facts came back.

## What it does

Authors seven behavior packs, then for each scenario: empties the server's behavior pool, copies in
the packs the scenario stages, writes the world's activation list, restarts, and reads what the packs
report. Each scenario runs against its own freshly generated world on one volume.

| scenario | staged in pool | listed active | asks |
| --- | --- | --- | --- |
| `q1dep` | provider, consumer | both | does the entity type resolve, dependency declared |
| `q1nodep` | provider, consumer-nodep | both | …with no dependency declared |
| `q1pull` | provider, consumer | consumer only | does the dependency pull the provider into the stack |
| `q1missing` | consumer | consumer | is an unsatisfiable dependency enforced |
| `q2` | provider, five importers | all | does any import specifier reach another pack's module |

The provider pack defines entity `probe:actor` and exports a token from `scripts/lib.js`. The
consumers spawn `probe:actor` two ways — `spawnEntity` and a `summon` command — and count what the
dimension holds. The importers each carry exactly one import of the provider's module, one specifier
shape per pack, so a failing specifier cannot take the others down with it.

## Findings

- `an-entity-type-resolves-for-a-script-in-any-other-loaded-pack`
- `a-script-module-does-not-resolve-across-packs`
- `a-declared-pack-dependency-activates-the-depended-on-pack`
- `an-unsatisfiable-pack-dependency-is-not-enforced-at-load`

## Four things that cost a run each, worth knowing before writing another probe

**A `[` breaks `say`.** Reporting through `dim.runCommand('say [PROBE …] …')` fails with
`Syntax error: Unexpected "["` and the payload never reaches the log. `console.warn` is the right
channel — but only with `content-log-console-output-enabled` set, which the server itself says on
boot: *"Content logging to console is disabled. Enable it with content-log-console-output-enabled=true
in server.properties."* On the `itzg` image that is `CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true`;
`CONTENT_LOG_FILE_ENABLED` is a different property and does not do it.

**Offline mode plus the image's default allowlist refuses to boot.** `ONLINE_MODE=false` yields
`[ERROR] Using an allowlist without online authentication can be dangerous and is not allowed.`
during world creation, and the server then stalls there rather than exiting — a plain timeout with no
obvious cause. Since no client connects, the fix is to leave online-mode alone. Separately, the image
rejects `FALSE`: property values must be lowercase.

**Spawning needs a ticking chunk, and the chunk check runs first.** With no player connected, an
arbitrary location is not loaded, and `spawnEntity` fails with *"Trying to access location (…) which
is not in a chunk currently loaded and ticking"* in every arrangement alike — which looks exactly
like the identifier failing to resolve and is not. Create a ticking area, then wait: 60 ticks was
enough for later scenarios but not for the first world generated on a fresh volume, so the settle is
200. The distinction matters because the real negative result reads differently —
`'probe:actor' is not a valid entity type` — and only appears once the chunk is ready.

**The pool is on the volume and outlives the world.** A scenario testing "this pack is absent" has to
empty `/data/development_behavior_packs` first; otherwise the previous scenario's packs are still
there, and a pack that was never activated shows up in the stack anyway, which reads as a discovery
rather than as leakage.

## Re-running

```sh
node evidence/minecraft/rpg-core/cross-pack-probe/probe.mjs        # tears down after itself
node evidence/minecraft/rpg-core/cross-pack-probe/probe.mjs --keep # leaves the container up
```

Needs a Docker daemon — `DOCKER_HOST` or the active context, local or remote — and publishes no
ports. The container and volume are named `rpg-crosspack-probe`, so it cannot collide with another
probe's project. Around four minutes for five scenarios, most of it Bedrock startup.
