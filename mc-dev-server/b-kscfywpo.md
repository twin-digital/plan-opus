# Require the resource pack by default

`compose-file.ts` hardcodes `TEXTUREPACK_REQUIRED: 'false'`, described in the compose comment as
"resource packs offered rather than required". A client joining a dev server can therefore decline
the download in one click and enter a world where every entity whose appearance the pack carries
is invisible, while the server reports those entities present, named, and answering selectors.

Two facts record the behaviour, read at a Bedrock client on 2026-08-21:
`f:a-client-may-decline-a-servers-resource-pack-unless-texturepack-required-is-set` and
`f:a-declined-resource-pack-leaves-a-packs-custom-entities-undrawn`. `texturepack-required` is the
lever: set `true`, the client's second option is "Leave" and there is no join without the pack.

Proposal: default `TEXTUREPACK_REQUIRED` to `'true'`.

- The dev server exists to show an author their pack running, and this default silently hides
  the half of it a resource pack carries.
- It is inert for a package with no resource half, so behavior-only packs pay nothing.
- It has already cost debugging time twice: `mc-rpg-core`'s example carries a README warning
  written after its implementer hit it, and the client session that recorded the facts above hit
  it again.

Propose it pinned — the setting is consumer-visible for every pack the monorepo builds, and
flipping it changes what an author's next `pnpm dev` does. Whether the current value should stay
reachable per-project (a `.minecraft.yml` key) is part of the same ruling.

Raised by the mc-rpg-core implementation at increment 003; that build needed no change of its own,
its example already documenting the workaround.
