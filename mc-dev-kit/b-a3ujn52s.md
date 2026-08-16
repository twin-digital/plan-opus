# Extend the rewriter's modeled kinds

With namespacing on, a pack's own source may hold only the modeled content kinds; a `.json`,
`.material`, `.lang`, or `.mcfunction` file outside the modeled locations fails the build
(d-3bmgnb25), and a vendored pack is confined to the same modeled set (d-7aqne91n). Every
extension widens both boundaries in step.

The bar an added kind must meet is fixed by r-c9bu8xes: rewrite every name the kind can carry,
or fail on what cannot be parsed — never copy a name unexamined. Per-kind, the work tiers:

- **Schema walks** — items, blocks, spawn rules, loot tables, recipes, trade tables: JSON with
  identifiers in enumerable positions, the same exercise the client-entity rewriter already
  does (enumerate reference positions per d-l12ch4vq's pattern, rewrite there, copy elsewhere).
  A modest increment each. Blocks persist in chunks by id, so they take the author's namespace
  like entities do.
- **Embedded grammars** — `.mcfunction` is the command language (selectors, `execute` chains,
  a large evolving command set), and the same grammar hides inside Tier-1 kinds: dialogue
  buttons carry command strings, Molang carries `query.is_family(...)`. Admitting these means
  a conservative-failing parser: any line or expression not fully classified fails the build,
  never passes through. Buildable — community pipelines do such transforms — but its own
  project.
- **Binary formats** — `.mcstructure` embeds block and entity ids in NBT.

The boundary only binds packs that turn namespacing on; everything builds as before with it
off. Extend Tier 1 kinds when a consumer needs them; take the command grammar as a separate
bite.
