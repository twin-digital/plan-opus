# An opt-in run-time position lock an adventure can apply to an actor

Component-level immobility does not reach every displacement vector: on Bedrock 1.26.43.1 an actor
carrying the full documented set (`pushable` false for entities and pistons, `knockback_resistance`
1, zeroed movement system, `water_movement.drag_factor` 0) is still moved by a piston and by a water
current — measured live 2026-08-11, actors shoved 1.7 blocks in x and one 5.3 blocks in z. The
requirement is being narrowed to match what the format governs, which leaves adventures that DO want
an immovable character with nothing to reach for.

Wanted: a library call an adventure opts into per actor — roughly `lockPosition(handle)` — that
enforces the placement position at run time and `unlockPosition(handle)` (or a disposable) to stop.
Whatever mechanism it uses (an interval, an entity-moved event if one exists, a periodic teleport
back) is the design's to settle.

**What to settle when this is taken up:**

- Who owns the loop. The library owns no tick today; a lock means it does, for as long as any actor
  is locked. What happens across a world reload — does a lock survive, and if so where is it
  recorded (the durable-name record is the obvious home)?
- Cost per locked actor, and whether the enforcement is per-tick or sampled. A sampled lock lets an
  actor visibly drift and snap back; a per-tick one costs more. Which reads better is a product
  question, not a performance one.
- What "its position" means after a legitimate move — an adventure that teleports its own actor
  should not be fighting the lock. Probably the lock re-anchors on any library-initiated move.
- Whether gravity is excepted, matching the owner's ruling that gravity may move an actor: a lock
  that also defeats gravity would restore the hovering behavior that was rejected as looking like a
  bug.
- Whether it belongs on the spawn call as an option rather than a separate verb.
