# Selective import from vendored packs

The vendoring built at 012 merges a dependency's whole `vendored_pack/` tree. Selective import
narrows that: the `vendor` block already keys per dependency (`{ prefix }`), and an `include`
list beside it would name the entities and assets to merge, defaulting to everything.

What 012 settled that this builds on, unchanged: per-consumer merging under composed entity ids
(`<ns>:<prefix>.<name>`), asset names by library token + content hash, explicit closure with the
dangling-reference diagnosis. Excluding an item a merged reference needs should fail exactly like
an un-merged supplier does today — the diagnosis machinery extends rather than duplicates.

Two open pieces:

- **The unit of selection.** Entities pull their client definitions, geometry, textures, and
  localization entries with them; whether `include` names entities (closure computed) or files
  (explicit, dumber) is the design's first fork.
- **Inferring the set.** Deriving what a package actually references instead of declaring it is
  a static-analysis job; explicit declaration is the fallback an early version should take.

Earns nothing until vendored asset volume hurts; recorded so the shape is not re-derived.
