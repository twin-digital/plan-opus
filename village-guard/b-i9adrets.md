---
tags:
  - pack-runtime
---

# is a village golem's retaliation a second route the documented limit does not cover?

`d-qgpu7qp0` records that the pack leaves an iron golem's retaliation alone, and `ISSUES.md` states
it to the installer. Both describe one route: `minecraft:behavior.hurt_by_target`, gated on the
attacker's family, which the golem probe measured directly.

A golem in a real village also carries `minecraft:behavior.defend_village_target`, which targets
players on village reputation and has nothing to do with who hit whom. Every golem in the probe was
`spawnEntity`'d and carried neither `village_created` nor `player_created`, so that route was never
exercised — and `minecraft:from_player`, the remedy the owner declined, does not touch it either.

The owner's own report that started this — hit a golem in a live world, no visible reaction, golem
kills them — happened in a **real village**. If the retaliation came through the village route rather
than the hurt-by-target one, then the limit `ISSUES.md` documents is describing the wrong mechanism,
and the entry needs rewriting rather than merely being true.

**The check**: in a real village, with the pack installed, hit a golem carrying `village_created` and
see whether it retaliates; compare against a summoned golem in the same world. Needs a client, and it
is the same session as `b-myudtbdv`.

If the village route does retaliate, the follow-on question is whether anything can reach it at all —
the probe established the API exposes no target or anger surface, so the remedy space may be empty,
which would make this a documentation fix rather than a defect to fix.
