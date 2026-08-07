---
tags:
  - dev-loop
---

# delete or regenerate one level, without destroying every world on the volume

`minecraft-server destroy` is the only way to be rid of a world, and it removes the volume and every
world on it. There is no way to reach a single level.

**Why it bites.** `recordSeed` in `src/start/start.ts` states the engine behaviour plainly: "the
server ignores the level seed for a world that already exists". So changing `seed` or `spawn` in
`.minecraft.yaml` does nothing to a level that has already been generated — the config is only read
at generation. Today the only way to act on a changed seed is `destroy`, which takes every other
world with it, or renaming the level, which leaves the old world on the volume forever.

Observed 2026-08-07 while setting up village-guard's dev world: giving the pack a seed and spawn
meant choosing a new level name, because reusing the old one would have kept the old terrain and
silently ignored the new seed. The world that name replaced is still on the volume.

**The harness already has the concept internally.** `recordSeed(level, regenerated)` takes a
`regenerated` flag, documented as "the one case that overwrites, because there the world really is
being made again". Nothing on the command line reaches it.

**What to settle when this is taken up:**

- Shape: a `--level` on `destroy`, or its own subcommand. `destroy` today names the worlds first and
  asks; a per-level form should probably keep that, and should say what it will not touch.
- Delete versus regenerate. Deleting leaves the next `start` to generate it from the current config,
  which may be the whole feature; an explicit regenerate would stop the server, delete, and bring it
  back on the same level in one go.
- Whether the running server must be stopped first, and what happens to a level a harness is
  attached to.
- The seed record: a deleted level's entry should go with it, or the next generation inherits a seed
  the world was not made from.
- `d-zo2yl18y` (mc-dev-kit 009) says the volume outlives a stop and only `destroy` removes it. A
  per-level delete removes a world rather than the volume, so it reads as compatible — but the
  decision names `destroy` as the sole remover, and whoever takes this should check whether the
  wording needs to widen.
