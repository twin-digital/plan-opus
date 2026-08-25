# Resource packs should be requirable — optional packs render custom entities invisible

The generated compose hard-codes `TEXTUREPACK_REQUIRED: 'false'` ("resource packs offered rather
than required" — a posture from when the workspace held behavior-only packs). With a product that
ships a resource half (mc-rpg-core), a client that skips the optional download joins a world of
standing, named, undamageable — and completely invisible — actors. Observed live 2026-08-11: the
owner's first client session showed nothing at all until the setting was hand-flipped on the
generated compose file and the container recreated.

Wanted: either a `.minecraft.yml` setting for it, or a smarter default — require resource packs
whenever a selected pack has a resource half. The workaround (edit the generated compose, `docker
compose up -d`) is regenerated away on every `minecraft-server start`.

## Measured 2026-08-21

The mc-rpg-core implementation at 003 read this at a Bedrock client and recorded two facts:
`f:a-client-may-decline-a-servers-resource-pack-unless-texturepack-required-is-set` and
`f:a-declined-resource-pack-leaves-a-packs-custom-entities-undrawn`, both against `run-lpficsed`.

- `texturepack-required=false` — the client is offered "Download everything and join" or **"Join"**.
  Declining is one click, carries no warning, and the join completes.
- `texturepack-required=true` — the second option is **"Leave"** instead. There is no
  join-without-the-pack, so the setting is a complete lever, not a nudge.

Two things that make the workaround worse than it looks, and that any fix must respect:

- **The value must be set in the container's environment.** The itzg image rewrites
  `/data/server.properties` from the environment on *every* boot, so editing that file in a running
  container and restarting silently reverts it — a reading taken that way is the permissive one
  wearing the other label.
- **A client caches a server's pack by uuid and version**, so once accepted there is no prompt at
  all. Testing a change here needs the pack's header version bumped (and the depending manifest's
  `dependencies` entry with it) to force a fresh offer.

Whichever shape the fix takes, propose it pinned: the setting is consumer-visible for every pack the
monorepo builds, and flipping it changes what an author's next `pnpm dev` does.

The mc-rpg-core build needed no change of its own — its example README already documents the
workaround, and `rpg-core`'s README now says the manifest dependency settles the world's pack stack
rather than what a client draws.
