# Pool-layout probe

Asks what the dedicated server does with the two pack kinds, and whether a directory name ever
carries meaning. `node run.mjs` (after `docker compose up -d`) drives a real
`itzg/minecraft-bedrock-server` container; `OUTPUT.txt` is the captured stdout from Compose
v5.2.0 against a remote daemon (`DOCKER_HOST=ssh://…`), no bind mount.

The server's own `/data` listing carries kind-partitioned pools as siblings: `behavior_packs`,
`resource_packs`, `development_behavior_packs`, `development_resource_packs`,
`development_skin_packs`, `world_templates`.

| case | result |
|---|---|
| 1. each pack in its own pool, each in its own world list | `Pack Stack - [00] layout probe behavior pack (id: d3c9f2a1-…, version: 1.0.0) @ development_behavior_packs/probe-bp` |
| 2. resource pack moved into the behavior pool, listed as a behavior pack | unchanged — only the behavior pack loads; no error, no mention of the misfiled pack |
| 3. back to correct pools | as case 1 |
| 4. behavior pack moved into the resource pool, listed as a resource pack | `Pack Stack - None` — the behavior pack does not load |
| 5. pack directories renamed to contradict their manifests | `… @ development_behavior_packs/resource_pack_totally` — loads normally |

## What this establishes

- **The pool is authoritative for kind, and it is a deploy target.** A pack loads only from the
  pool matching its kind (cases 2 and 4, in both directions). Misfiling fails in silence.
- **A pack's own directory name means nothing.** A behavior pack in a directory called
  `resource_pack_totally` loads, and the server prints that name back without complaint (case 5).
  Nothing reads it; the manifest is the only declaration of what a pack is.
- Both packs keep their own directory in their own pool, each with `manifest.json` at that
  directory's root.

**UNVERIFIED: whether the resource pack was actually loaded** in cases 1, 3 and 5. The server logs
a Pack Stack line for behavior packs and says nothing about resource packs, and no client
connected, so these runs show the layout is accepted, not that a resource pack took effect.
Confirming that needs a connected client or a visible texture change.
