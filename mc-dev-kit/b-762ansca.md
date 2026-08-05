---
tags:
  - dev-loop
  - durability
---

# Start a run from a captured world state

The companion to snapshotting a world: name a captured world state as the one a run starts from, instead of generating a fresh one from a seed.

Where a seed and spawn point (d-41m3iws5) describe a world the server generates, this names a world an author prepared. The aim is to develop against known states — set a scenario up once by hand, snapshot it, then run fresh servers against it as often as the loop restarts.

Surface it the way seed and spawn are surfaced: a config key, a CLI flag, and a profile field, so a profile becomes a complete named scenario — the packs to host and the world to host them against (d-c1kvyord).

Depends on snapshotting existing first.
