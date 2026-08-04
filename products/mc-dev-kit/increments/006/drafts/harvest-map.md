# Harvest map: the #123 branch's decisions → mc-dev-kit increment 006

PR #123 (branch `design/minecraft-pack-build`, tip `afd5881`) ran a Plan loop on the legacy
`design/minecraft/pack-build` design and closed unmerged. The conversion to this product carried the
loop's requirement amendments (increment 004) and its facts and probes (the pool), but not the
branch's `design/minecraft/pack-build/decisions.yaml`; increment 004's `drafts/carry-forward.md`
recovered the rulings as prose, "not in force". The owner ruled on 2026-08-04 that they enter as
in-force decision entries — this increment reverses that "not in force" disposition.

Every entry carries `facets: build`. Titles, `because:` citations against this product's
requirements and the pool's facts, and the pinning proposals are authored here.

## Carried unchanged (16)

Statements are the branch's, verbatim, and each entry carries the branch's `accepted` ruling.

| branch slug | new id | pinned |
|---|---|---|
| the-export-is-a-fragment-carrying-a-rolldown-plugin | d-5ej8yfki | public-api |
| the-consumer-hands-over-its-package-directory | d-qtq0ccy6 | public-api |
| the-build-reads-the-kit-pack-set | d-vpwz0dps | — |
| externals-come-from-the-manifests-module-dependencies | d-3sb0vrc2 | data-format |
| a-script-less-package-builds-through-a-virtual-entry | d-64tw58t0 | — |
| a-rebuild-emits-no-report | d-3kcr1672 | other |
| the-archive-is-a-single-mcaddon-per-package | d-6ewrh1g3 | data-format |
| assets-copy-verbatim-except-the-manifest-and-scripts | d-h91x9nxz | data-format |
| empty-source-directories-produce-no-output-directory | d-xnnslpns | — |
| the-completed-manifest-is-two-space-json | d-exzp1618 | data-format |
| stale-output-is-pruned-not-wiped | d-p06hnnc0 | — |
| a-package-with-no-pack-fails-the-build | d-4e0kt69q | — |
| the-archive-command-takes-no-arguments | d-s5ymp8ai | public-api |
| archive-names-come-from-the-package-name-and-version | d-9hbe6ixx | data-format |
| a-missing-output-tree-fails-the-archive | d-mle1zwtz | — |
| documentation-ships-as-tsdoc-and-a-readme-section | d-9s4tdc8z | — |

## Carried with the statement changed (7)

A survey of the build facet against this product's fold found each of these contradicting a
requirement, a fact, or another decision. The change is stated per row; each enters `delegated`,
since the statement is no longer the one the owner ruled on.

| branch slug | new id | what changed and why |
|---|---|---|
| the-workspace-root-is-the-nearest-pnpm-workspace-file | d-ai68xorc | the root is the nearest one the kit's own rule recognises, pnpm marker or npm fallback. The pnpm-only form refused to build a pack that `r-4f1obncy` requires the kit to discover. |
| script-sources-live-in-the-packs-scripts-directory | d-d727qv5z | says why the exclusion is not a carve-out of `r-umoo5i1i` — the directory holds build inputs, and the bundle is the pack's script content. |
| the-script-output-path-is-set-in-config-and-checked-against-the-kit | d-oln00v7s | the check applies to this package's behavior pack, and a reported `null` is not a mismatch. As written it failed every resource-pack-only package, whose `scriptOutput` is `null` per `d-jewbwtye`. |
| output-files-are-written-only-when-their-bytes-change | d-nclb1c8l | scoped to every file the build writes. The gloss naming only the manifests and copied assets left out the bundler's chunk, which `f:tsdown-rewrites-an-output-file-whose-bytes-did-not-change` rewrites on every build — so the pin's stated guarantee did not hold. `d-mr3z6vy9` supplies the mechanism. |
| the-bundle-is-one-unminified-esm-chunk | d-jxv1x5ht | the build does not split. The clause permitting a further chunk "written beside the entry file" assumed the game's loader follows a relative hashed `.mjs` import, which nothing establishes. |
| an-invalid-pack-fails-the-build | d-no9a9s0x | scoped to this package's packs. `d-y08itp8j` takes the workspace-wide enumeration failure, which is a different failure with a different message. |
| the-export-takes-over-the-packages-build | d-s1haiu19 | the package devotes its configuration and `dist/` to its packs, and the fragment reaches that configuration through the extension mechanism it already offers. Supplying the whole configuration object is not available where `f:opus-package-config-is-generated-from-one-root-file` holds. |

## Ruled without endorsement (1)

| branch slug | new id | pinned |
|---|---|---|
| the-archive-ships-as-a-bin-command | d-j9qge6s1 | public-api |

The owner tolerated this on the branch (thread 3673915455); `delegated` is this product's status for
a ruling that lets a choice stand without endorsing it.

## Never ruled (3)

Proposed at the branch tip and unchanged here. They enter `delegated`.

`d-llnhw1k1`, `d-5meg5uy7`, `d-wzmofsc8`.

## Authored here (10)

Choices the survey found the fold neither decided nor deferred.

| id | what it settles |
|---|---|
| d-wss8fker | the build export's specifier and name — `@twin-digital/mc-dev-kit/build`, `packBuild` |
| d-0341uo0g | the settings the fragment states rather than inherits, so it behaves the same alone and merged |
| d-mr3z6vy9 | an unchanged chunk leaves the bundle before the bundler writes it |
| d-876m8rnf | a resource-pack-only package builds |
| d-e7a7psq6 | a declared script module with no sources fails the build |
| d-095jgny3 | the watch set `r-v8jjhds5` requires be declared |
| d-y08itp8j | an unreadable workspace fails the build naming the file |
| d-r6vxh2qu | an `.mcpack` holds its pack directory's contents at the archive root |
| d-eb6tfefk | the archive command clears `.release-assets/` before writing |
| d-gbh83fap | the archive reads the output tree and consults nothing else |

## The requirement amendments (2)

- `r-yg1djnta` amends `r-hlnbi41r`: no bundler is a **runtime** dependency. A typed export naming
  tsdown's and Rolldown's types, and a bundler as a development dependency, are what building and
  testing the export takes; the original verification forbade both.
- `r-iavfb8qj` amends `r-1bvvl9k7`: the no-built-output rule is discovery's. The build half ships in
  the same package and reads and writes that tree.

## Not carried: the rejected five

`the-consumer-hands-over-its-config-file-url`, `the-bundle-lands-at-the-manifest-declared-entry`,
`the-bundle-lands-at-a-path-this-design-fixes`, `the-bundle-lands-where-the-pack-entry-says`,
`the-plugin-places-every-output-file-itself`. The rulings and their reasons stay with the preserved
branch and 004's `carry-forward.md`.

## What the harvest does not carry

The branch's `falsifiers` lists were the legacy regime's construct and are not converted to
`revisit_when` — the fold's revisit conditions are the owner's to set deliberately, and the branch
history holds the lists. The dev-kit material the loop routed to a discovery-facet increment
(`scriptOutput` on the pack entry) landed in increment 005; nothing here rules on it.

## Open after this increment

What the pack bundle must be compiled to — the script engine's syntax level, its module semantics,
and whether Node shims are harmful — is undetermined by the pool, so `d-0341uo0g` names the keys the
fragment sets without fixing `target` or `platform`. A probe answers it; until one runs it is not a
decision anyone here can make.
