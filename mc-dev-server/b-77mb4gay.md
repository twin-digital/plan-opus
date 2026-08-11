# Destroy a single level without destroying the container

`minecraft-server destroy` removes the container and the volume — every world goes with it. The
common want is smaller: throw away one stale world (a gallery placed at an old stage, a temp
probe world) while the container, the volume, and the other worlds stay.

Wanted: a per-level destroy — e.g. `minecraft-server destroy --level <name>` — that deletes one
world's directory from the volume (stopping or world-switching the server as needed) and leaves
everything else standing. Requested by the owner 2026-08-11 after a stage move left the old
world's gallery standing at the old coordinates: placement is idempotent by durable id, so only a
fresh world shows a new stage, and the only route today is destroying everything.
