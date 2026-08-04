---
tags:
  - presets
  - dev-loop
---

# The addon dev loop belongs in the preset

The `minecraft-addon` preset names `@twin-digital/mc-dev-kit` for build and release, and
`@twin-digital/minecraft-test-lib` for unit tests. It says nothing about the local
run-and-iterate loop, so a pack is free to hand-roll a server, container, or deploy script.

The owner wants addons to use the shared dev loop rather than their own. This was deferred
rather than written because `mc-dev-server` has shipped no package and so has no name to cite
— a requirement naming a tool that does not exist yet would be unverifiable.

**Revisit when `mc-dev-server` ships and fixes its package name.** The requirement then reads
roughly: a pack is developed against the shared dev server, and stands up no server, container,
or deployment of its own. That mirrors the shape of "a pack does not deliver itself".

Worth settling at the same time: whether an addon depends on the kit alone, with the kit
fronting the dev server, or on both directly. The owner considered the kit-fronts-it option and
set it aside as a design change to two products rather than preset authoring — it stays open,
not rejected. `mc-dev-server` already carries "deployment is not a pack concern", which is the
same boundary seen from the other side.
