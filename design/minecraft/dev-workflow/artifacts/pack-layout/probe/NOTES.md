# Pool-layout probe

Asks what the dedicated server does with the two pack kinds, since that is what a later
resource-pack scope would make the reconciler duplicate. `node run.mjs` (after `docker compose up
-d`) drives a real `itzg/minecraft-bedrock-server` container; `OUTPUT.txt` is the captured stdout
from Compose v5.2.0 against a remote daemon (`DOCKER_HOST=ssh://…`), no bind mount.

## What it shows

The server's own `/data` listing carries kind-partitioned pools as siblings:
`behavior_packs`, `resource_packs`, `development_behavior_packs`, `development_resource_packs`,
`development_skin_packs`, `world_templates`.

| case | result |
|---|---|
| behavior pack in `development_behavior_packs`, resource pack in `development_resource_packs`, each named in its own world list | `Pack Stack - [00] layout probe behavior pack (id: d3c9f2a1-…, version: 1.0.0) @ development_behavior_packs/probe-bp` |
| resource pack moved into the behavior pool and named in `world_behavior_packs.json` | unchanged — only the behavior pack in the stack, no error, no mention of the misfiled pack |
| back to correct pools | as the first case |

Both packs keep their own directory in their own pool, each with its `manifest.json` at that
directory's root.

Two readings worth keeping straight:

- **Kind is not inferred from the pool.** A `resources` pack sitting in the behavior pool and
  listed as a behavior pack is ignored in silence — the same failure mode as a wrong uuid. A
  harness that deploys by kind has to know the kind before it copies.
- **UNVERIFIED: whether the resource pack was actually loaded.** The server logs a Pack Stack line
  for behavior packs and says nothing about resource packs, and no client connected during the
  probe, so this run shows only that the layout is accepted — not that the resource pack reached
  a client. Confirming that needs a connected client, or a texture change visible in game.
