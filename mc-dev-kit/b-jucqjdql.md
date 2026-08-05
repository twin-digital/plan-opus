---
tags:
  - dev-loop
  - durability
---

# Snapshot a running world

A run generates a fresh world every time (d-zo2yl18y), and a seed and spawn point (d-41m3iws5) fix which world that is at generation. What they cannot fix is a world an author built by hand — terrain shaped for a test, chests filled with the right items, structures placed to exercise a pack.

Snapshot that: capture a running world into an artifact the author keeps, so a hand-built scenario survives the stop that destroys its volume.

Open where it lands — beside the workspace, in a cache directory, somewhere named on the command line — and open what it holds. `docker compose cp` reads a container to the host (f:compose-cp-copies-without-bind-mounts), so the transport exists.

Pairs with restoring one; a snapshot nothing can start from is only half the capability.
