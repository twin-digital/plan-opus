# A pack build needs an extension point for a product's own checks and generation

`packBuild()` takes one option, `packageDir`, and returns a fragment whose `plugins` array is the single
plugin that performs the whole build. `@twin-digital/tsdown-config` shallow-merges `tsdown.config.d/*.ts` in
filename order, so a second fragment supplying `plugins` **replaces** the kit's plugin rather than adding to
it. Combined with `r-cyd08e6q` (a pack implements no build logic of its own) and `r-82ck2fax` (the
configuration is generated and not edited in the package), a product has no way to add a build-time check or
a generation step to its own packs.

Three consumers of such a point are already known, all from mc-rpg-core:

- a **namespace lint** — every name a pack declares carries the prefix its major version implies
- a **withdrawal check** — a release within a major exposes every actor identifier the previous one did,
  which additionally needs somewhere a prior release's identifier set is recorded; nothing in the kit, the
  package, or the monorepo holds one today, since versions come from changesets and the kit reads only the
  current source tree
- **generation** — entity definitions produced from a registry the product owns, so the identifiers a
  library names and the definitions a pack holds cannot disagree

Shapes worth weighing: an options bag on `packBuild` taking extra plugins; a documented convention for a
second fragment that composes rather than replaces; or a declared per-package check hook the kit invokes.
The generation case may want a different answer from the check cases, since it writes files rather than
failing a build.

mc-rpg-core's `d-lgaqtx4c` defers to this.
