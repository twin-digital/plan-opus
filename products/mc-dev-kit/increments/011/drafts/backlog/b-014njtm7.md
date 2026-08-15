# Stamp a workspace pack dependency per consumer at build time

When several packages in a workspace depend on one shared pack, the build could emit a distinct
*instance* of that pack per consumer rather than one shared copy: a uuid derived from the consumer's
identity, and every asset name inside the pack rewritten into a per-consumer namespace — entity
identifier, geometry, texture paths, materials, render controllers, animations, animation controllers.
The consuming library gets its stamp injected as a build-time constant so its own calls resolve to the
stamped identifiers.

This gives complete isolation between consumers: no shared uuid to contend over, no version skew, and
nothing for a server operator to reconcile.

mc-rpg-core considered this and took a cheaper scheme instead — a namespace derived from the shared
pack's *major version*, so consumers on one major share an identical pack (which deduplicates harmlessly)
and consumers on different majors are isolated. That bounds copies by majors in use rather than by
consumer count, and needs no consumer identity in the identifiers.

Worth taking up if per-consumer isolation is ever needed for real: a consumer that must pin an exact
patch version, or a shared pack that cannot hold an additive-only discipline within a major.

The load-bearing constraint either way: a resource pack's internal asset names are resolved across the
whole pack stack, not scoped to their pack, so a partial rewrite produces cross-talk between consumers —
one consumer's entity rendering with another's geometry — which is harder to diagnose than a missing
pack. Any implementation has to be exhaustive over every name kind.
