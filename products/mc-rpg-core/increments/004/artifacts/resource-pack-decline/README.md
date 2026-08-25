# Resource-pack decline — the reading, and how it was taken

`q-zwn1at3x` asked whether a client that declines an adventure's resource-pack download still
renders its actors. It was read at a Bedrock client on 2026-08-21, in the same session as
increment 003's name-display probe, and it is closed. What it established is recorded as
`f:a-client-may-decline-a-servers-resource-pack-unless-texturepack-required-is-set` and
`f:a-declined-resource-pack-leaves-a-packs-custom-entities-undrawn`; the run is `run-lpficsed`,
with its console and notes under `evidence/minecraft/rpg-core/name-display-and-rp-decline-probe/`.

This directory ships no packs. The run reused increment 003's `name-display-probe` packs,
deployed in an adventure's own shape — the behavior pack activated, the resource pack in the
server pool only and reached through the behavior manifest's `dependencies`, which is what
`d-x60dka1o` describes.

## The reading

| `texturepack-required` | the client is offered | what follows |
|---|---|---|
| `false` | "Download everything and join" / **"Join"** | declining joins the world, and no actor is drawn |
| `true` | "Download everything and join" / **"Leave"** | there is no join without the pack |

So the property is the lever. `d-x60dka1o`'s "the appearance cannot be left behind" holds of the
world's pack stack unconditionally, and of what a player sees only where the server sets
`texturepack-required=true`. Where it does not, declining is a one-click option offered without a
warning, and it yields actors the library reports as present and no player can see — which
`d-xiswv8vb` says the library cannot detect.

## Two things that will bite whoever runs this next

**`TEXTUREPACK_REQUIRED` must be set in the container's environment.** The
itzg/minecraft-bedrock-server image rewrites `/data/server.properties` from the environment on
every boot, so editing that file inside a running container and restarting silently reverts it
before the server starts. A reading taken that way is a duplicate of the permissive one wearing
the other label. Set it in `compose.yaml` and recreate.

**A client caches a server's pack by uuid and version.** Once it has been accepted, rejoining
offers no prompt and there is nothing to decline. Bump the resource pack's header version — and
the behavior manifest's `dependencies` entry to match — to force a fresh offer.

## What it leaves for the owner

There is a server-side lever, so nothing here contradicts a decision. Two follow-ups, neither
this increment's:

- `@twin-digital/mc-dev-server` hardcodes `TEXTUREPACK_REQUIRED: 'false'`
  (`nodejs/minecraft/mc-dev-server/src/docker/compose-file.ts`), so every dev server this monorepo
  starts is in the configuration where an actor's appearance can be left behind.
- What this product's documentation tells an operator to set is unstated.
