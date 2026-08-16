# packBuild's namespace should be readable from the package's minecraft block

`packBuild`'s `namespace` is a code option — `boolean | string` in `PackBuildOptions` — and nothing
reads it from `package.json`. It is the only per-package Minecraft setting placed that way:
`minecraft.vendor` and `minecraft.defaultAlias` are both read from the manifest
(`src/internal/vendored-packs.ts`). That placement is what puts a namespaced pack out of reach of
the monorepo's config manager.

## Why it matters

repo-kit's `minecraft-pack` recipe writes `tsdown.config.d/minecraft-pack.ts` with `write-file`,
whose body is a fixed string with no templating:

    export default packBuild({ packageDir: new URL('..', import.meta.url).pathname })

Every package holding a `*_pack/manifest.json` gets that same body, and `monorepo-package@1`'s
`r-82ck2fax` forbids hand-editing what the manager writes.

The per-package opt-out is not a substitute. `packages.<name>.rules` is
`Partial<Record<string, boolean>>` — boolean per feature — so disabling `minecraft-pack` for one
package also drops the five scripts it patches in (`build`, `dev`, `dev:stop`, `release-assets`,
`watch`), three devDependencies, and the `private`/`exports: null`/`files: null` patch.

## The shape proposed

`packBuild` reads `minecraft.namespace` from the owning package's `package.json` when the
`namespace` option is absent, with the value space the option already has — `true` to derive from
the package name, a string to name one directly.

The generated fragment then stays byte-identical for every pack, and the per-package value sits
where the kit already looks. No repo-kit change is needed: `json-merge-patch` only sets the keys it
names, and no repo-kit feature writes a `minecraft` key, so a hand-authored block survives `sync`
untouched (checked against `.repo-kit.yml` at opus `fa6362c`).

Worth settling at adoption:

- which wins when both the option and the manifest field are present.
- whether `minecraft.namespace` on a package holding no pack is an error or is ignored.
- **how the block reads once it holds both kinds of token.** `vendor` and `defaultAlias` are
  prefixes — tokens that live *inside* someone else's namespace — while `namespace` is the pack's
  own, and a vendored pack has none at all. Three keys in one block, two of them the opposite kind
  of thing from the third, is a documentation problem as much as a schema one. The kit's own
  `d-7jn9c702` is the distinction to hold onto.

## Alternatives, if the above is rejected

- Split repo-kit's recipe into `minecraft-pack` (scripts, deps, packaging) and
  `minecraft-pack-build` (the fragment), so a package opts out of only the fragment. Pure config
  restructuring, no code — but it leaves a hand-written build file that every namespaced pack
  repeats.
- Widen repo-kit's `rules` to carry values and add templating to `write-file`. The most general and
  the most expensive; a CI drift-check fails any PR where re-running `sync` produces a diff, so the
  templating has to be exactly idempotent.

## Who is waiting

Nobody is blocked. mc-rpg-core's example turns namespacing on through its own `tsdown.config.d/`
fragment, which shallow-merges over the generated one (its `d-i9d989zl`). That works and reads like
a trick — two calls to the same builder, the later winning by filename order. This item is what
retires it, and it is the first namespaced pack in the monorepo, so every namespaced pack after it
inherits whichever answer lands.
