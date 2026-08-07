---
tags:
  - pack-runtime
---

# does a villager with no job site block still serve a player's trades?

The village-structure probe settled most of what a village loses when its blocks are destroyed, and
the answer was mostly "nothing": the village lives in the world's `VILLAGE_*` records, not in the
blocks. Villagers persist, breeding continues against bed points of interest that outlive the beds,
and the record survives a chunk unload with nothing standing. See
`f:a-destroyed-bed-does-not-release-its-village-point-of-interest` and
`evidence/minecraft/gameplay/village-structures-probe/RESULTS.md`.

One question the rig could not reach, and it is the one that would justify extending village-guard's
protection from mobs to blocks: **can a villager restock, and serve its trades, with its job site
block destroyed?** Restocking needs a depleted trade, a depleted trade needs a player, and
`@minecraft/server` 2.8.0 exposes no trade surface at all
(`f:no-village-profession-or-trade-surface-on-a-villager`), so there is no proxy — it is a
client-in-the-loop measurement.

The neighbouring unknown, from the same limit: whether a villager that *earned* its profession at a
job site keeps it when that block is destroyed, and whether trading first locks it. Every villager in
the probe was command-spawned and arrived already employed without ever claiming a job site, so
`f:a-villager-that-never-claimed-a-job-site-keeps-its-profession` says nothing about the earned case.

**Why it matters.** If a lectern's destruction costs a librarian its trades, a griefer who cannot
touch the mobs can still take a server's economy apart, and the pack's protection is incomplete
against its own intent. If it does not, mob-only protection is sound and the limit is a
documentation matter.

Closing it in code would not mean protecting all blocks: it would mean protecting the POI-bearing
blocks — beds, job sites, bell — inside a village's recorded bounds, which the `INFO` record gives
directly. That is a different mechanism from the `entityHurt` split the pack is built on
(`playerBreakBlock`, explosion events, mob griefing), so it is its own increment rather than an
amendment.

Also unresolved and worth folding in if this is taken up: **iron golem spawning is entirely
unmeasured.** No golem spawned in any probe run, including on an intact 30-bed village across locked
day, locked night and a running cycle, so nothing can be read from its absence after a destruction.
If golem spawning does depend on standing blocks, block destruction still costs a village its
defence.
