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
