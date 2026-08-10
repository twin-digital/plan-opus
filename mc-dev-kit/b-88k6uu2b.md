# An archive must refuse an incomplete addon

`archivePackage` iterates the two kind-named output directories, skips any that is empty, and throws only
when *zero* members were added — its doc states the archive "holds one member per pack whatever the number of
packs". So a package that declares both a behavior pack and a resource pack, but whose resource half failed
to build, publishes a behavior-only `.mcaddon` silently.

For an addon whose resource half carries an entity's appearance that is the worst failure available: the
entity spawns and behaves, and renders as nothing a player can see or point at
(`f:what-a-client-renders-for-a-broken-appearance-definition`).

What is wanted is for the archive to refuse where a pack the package's source declares produced no output —
completeness measured against what discovery found, not against what happened to land in `dist/`.

mc-rpg-core's `d-ro5pj8er` states this as a product guarantee and `d-lgaqtx4c` defers the enforcement here,
because a pack package cannot carry the check itself: `r-cyd08e6q` forbids it build logic of its own.
