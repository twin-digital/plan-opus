# Adopt the dev kit's per-consumer vendoring

`@twin-digital/mc-dev-kit` now vendors a shared pack into each consumer: the shared package puts its
content under `vendored_pack/` and bears no pack of its own, and every package depending on it merges
that content into its own packs under its own namespace. `@twin-digital/mc-pack-runtime` ships the
engine-side half — `packId`, the checked `spawnEntity`/`getEntity`/`getEntities`, and
`foreignNamespaceClaims`. Published as mc-dev-kit increments 011 and 013; read
`nodejs/minecraft/mc-dev-kit/README.md` under "Vendoring shared packs" and `mc-pack-runtime/src/index.ts`
before planning.

This product is the one that drove the capability, and adopting it is a design increment rather than a
port: it removes the constraint several of this product's decisions were written against.

## The shape it takes

One package instead of two. The library's `src/` and the assets pack's content live together, the pack
content under `vendored_pack/behavior_pack/` and `vendored_pack/resource_pack/` with no manifests. An
adventure takes one npm dependency and declares no uuid at all; its build merges the actor content into
its own packs and its archive holds everything, so an install is one file.

Combining is not incidental — it is required. The kit binds a vendored library's `packId` to its prefix
by package-directory containment (`owningVendoredPack`), so a library in a *different* package from the
pack it belongs to composes identifiers without the prefix and every lookup misses. `my-lib/` holding
both is the kit's documented shape.

Identifiers become `<adventure-namespace>:<prefix>.<preset>` — the adventure chooses its namespace, and
the prefix defaults to the unscoped npm name unless its `vendor` block names a shorter one. So the same
wizard is spelled differently in each adventure, which is what makes them isolated.

## What this retires

- `d-6jlj0rl2` — the two-package split. Its reason was two delivery mechanisms (npm for code, a manifest
  uuid for assets); vendoring makes both npm and the reason expires. Pinned, so this is an owner ruling.
- `d-knzip5zc`, `d-3or6phg1` — an adventure declares no uuid and there is no second pack to activate.
- `d-i8pjw2on`, `d-2zclv5ol`, `d-5f011w0o`, `d-orqkexpm` — the whole major-namespace scheme. It exists to
  keep consumers of a *shared* pack from contending; consumers sharing nothing cannot contend. Internal
  asset names get the kit's uuid-and-hash treatment instead (`d-tnhykfkz`), which makes cross-talk
  impossible rather than managed.
- `d-og6f9j6c` — majors advancing together becomes structural in one package.
- `d-kxl9ej80` — the two-archive install, restoring what `d-hybkhum6` originally stated.
- `d-kmw62ki3`, `d-nd1ed8qx` — package identity changes, and the example must declare its own resource
  manifest for vendored resource content to land (kit `d-l4wh3cgf`).
- `d-icz8rnnw`, `d-ipgh0g2d` — the registry stops crossing a package boundary, and a preset's `entityId`
  stops being a static export: it is composed through `packId` at call time.

## What survives untouched

Everything about what an actor *is*: `d-gzoqebyy`, `d-uq70bkcx` and its measured engine limits,
`d-lyvjq8l1`, `d-3ggbl0kl`, `d-cb9jl02i`, `d-qtj99irh`, `d-z7e5isj2`, `d-clemw9ag`. Everything about the
library's surface and behaviour: `d-o9lynydc`, `d-lt24vke1`, `d-cqgi5xms`, `d-gja1pnav`, `d-f7o3vg4n`,
`d-9uu20w3r`, `d-kklnm4j4`, `d-bfdql5tx`, `d-bcybwddk`. Both narrowed requirements from 002
(`r-0fmfslpl`, `r-rytfox4t`) and every fact.

## What to settle

- **The namespace and the prefix.** `rpg` is short and readable; the kit's `d-p00wsgxo` sends an author
  who overrides the package-name default to the Bedrock-OSS registry to claim it, since overriding gives
  up npm's uniqueness. Decide whether this product claims a short token or takes the safe default, and
  what prefix its vendored content carries.
- **The error surface.** `ActorDefinitionsMissingError` (`d-xobjyw2e`) and the runtime's
  `ForeignEntityError` are two failures at one entry point and want reconciling into one story. Note
  `d-xobjyw2e`'s motivating scenario — the operator installed one half — nearly cannot arise once the
  assets ship inside the adventure's own pack.
- **`r-e8p2oto6` read against vendoring.** "An adventure carries no actor content" stays true of what an
  author *writes* and stops being true of what the build *emits*. Settle the reading explicitly; the
  build already inlines the library's code into an adventure's script and nobody counts that against it.
- **Whether actor names move into the pack.** The kit's `d-7aqne91n` admits localization entries keyed by
  an entity identifier and composes `.lang` files entry-wise. That removes the constraint behind
  `d-bfdql5tx` — names live in the library only because `d-ny9lcyjg` barred the whole-file `texts` kind —
  so a name could become localisable.
- **Whether `d-ny9lcyjg` defers to the kit**, which now states its own content-kind list (`d-7aqne91n`).

## Practical notes

- The root `README.md` package list is generated (`pnpm run update-readme`) and only CI catches it being
  stale. Combining packages changes that list.
- Hold the npm release of `@twin-digital/rpg-core` until this lands if it has not published yet, so
  external authors meet the vendored identifier shape first rather than a 1.0.0 they must break from.
