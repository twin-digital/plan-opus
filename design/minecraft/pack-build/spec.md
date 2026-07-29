# Pack Build

## Summary

Pack build is the half of the Minecraft dev-kit package that turns a pack package's source into a
loadable built pack, and cuts a released package into the archive a player installs. It produces
two things: a function a package's bundler configuration takes up, which bundles the pack's script
module, places every other file the pack is made of into the output tree, and writes the completed
manifests there; and a command a package's release hook runs to cut that output tree into one
archive. The problem it answers is that this work has no owner today — every pack package carries
its own copy of the output layout and the completion rules, and a copy that is slightly wrong ships
output that fails at the server with nothing reporting why. The constraint that shapes the build
half is that it has no invocation of its own: a package's bundler configuration in this monorepo is
assembled from merged partial fragments, so everything a build does has to travel inside that
configuration — as values a fragment sets, and as a plugin the bundler runs.

## Open questions

```yaml
questions:
  - id: archive-interface-wording
    question: |
      the archive half is specified here as a `mc-pack-archive` command the package's release hook
      runs, while `r:a-released-pack-is-an-archive-of-its-output-tree` says the archive is
      "exported for the package's release hook to call". Should that requirement's wording admit a
      command line, as `r:build-is-an-exported-bundler-config` now does, or does the owner want the
      archive exported as a function a hook script imports instead?
    closes: requirement
    gates: [the-archive-ships-as-a-bin-command, the-archive-command-takes-no-arguments]
  - id: manifest-only-rebuild-skips-bundling
    question: |
      `r:rebuild-triggers-are-declared-not-inferred` says a change to a manifest input alone brings
      the output's manifests up to date "without rebundling". This design has one path: any declared
      change re-runs the whole build, and the two paths differ only at write time, where the
      bundle's bytes are unchanged and so are not written. Read as a statement about what the build
      does, the requirement asks for a manifest-only path that skips the bundler and this design
      does not meet it; read as a statement about what the output shows, it is met. Which reading
      does the owner intend?
    closes: requirement
    gates: [output-files-are-written-only-when-their-bytes-change, the-export-is-a-fragment-carrying-a-rolldown-plugin]
```

## What a pack package takes up

Both halves ship in `@twin-digital/mc-dev-kit`, the package the dev kit publishes
[[f:dev-kit-library-is-published-as-mc-dev-kit]] [[r:build-ships-in-the-kit-package]]. Nothing here
is published, versioned or installed on its own, and the build half is written in TypeScript,
published as ESM only with its own type declarations, targeting active Node LTS, like the rest of
that package [[r:node-libraries-are-esm-typescript]].

The build half is one exported function. It embeds no bundler and ships no command line: a package
takes it up in its bundler configuration and the repository's ordinary build runs it
[[r:build-is-an-exported-bundler-config]]. That configuration is composed rather than written — a
shared base plus per-package fragments in a `tsdown.config.d/` directory, each default-exporting a
partial config, applied in filename order and shallow-merged over the base
[[f:opus-bundler-config-merges-partial-fragments]] — so the export is what a fragment returns:

```ts
import { packBuild } from '@twin-digital/mc-dev-kit/pack-build'

export default packBuild({ packageUrl: import.meta.url })
```

`packBuild` takes one required option, `packageUrl`, the `import.meta.url` of the fragment calling
it. A fragment sits in `<package>/tsdown.config.d/`, beside the package's `tsdown.config.ts`
[[f:opus-bundler-config-merges-partial-fragments]], so the package directory is the *parent* of that
url's directory — the directory holding the `package.json` every path below is resolved against
[[d:the-consumer-hands-over-its-config-file-url]]. It returns a partial tsdown config setting
exactly these keys:

- `entry` — `<package>/behavior_pack/scripts/main.ts` when that file exists, and otherwise the
  virtual module id `\0mc-pack-build:empty`, which the plugin resolves and loads as an empty module
  so a package with no script sources still has an input [[d:a-script-less-package-builds-through-a-virtual-entry]]
- `outDir` — `<package>/dist`
- `clean` — `false`
- `dts` — `false`
- `sourcemap` — `false`
- `minify` — `false`
- `format` — `['esm']`
- `noExternal` — `() => false`, so no import is forced into the bundle and the plugin's
  `resolveId` decides what stays external. The shared base sets `noExternal: () => true`, which
  forces every import bundled and which a fragment that stays silent inherits, so the key is set
  here even though its value is the inert one [[f:opus-bundler-base-forces-every-import-bundled]]
  [[r:script-module-is-bundled-with-game-modules-external]]
- `plugins` — a single Rolldown plugin named `mc-pack-build`, which performs everything below

The behaviour lives in that plugin because tsdown is built on Rolldown and takes Rolldown plugins
through the `plugins` array of the configuration, never from a command line
[[f:tsdown-takes-rolldown-plugins-through-its-config]], and because the rebuild inputs a pack has
are computed per pack at `buildStart`, from the pack set and the source tree, which a static `watch`
key cannot express — `addWatchFile` on a plugin's context is what declares them
[[f:a-rolldown-plugin-can-declare-extra-watch-inputs]]. One plugin, in one fragment, because a
top-level key a fragment sets replaces the base's wholesale — two fragments owning `plugins` would
clobber each other [[d:the-export-is-a-fragment-carrying-a-rolldown-plugin]].

`packBuild` and its options type carry TSDoc describing what a consumer hands over and what the
build produces. Both halves are documented in one usage section in the kit package's README: the
fragment above, what a build puts in the output tree, and the `release-assets` script line that runs
`mc-pack-archive` together with what that command writes and where. The archive half has no exported
symbol to hang TSDoc on, so the README section is the whole of its documentation
[[r:the-exported-config-is-documented]] [[d:documentation-ships-as-tsdoc-and-a-readme-section]].

## What the build works from

At `buildStart` the plugin reads `<package>/package.json` for the package's name, walks up from the
package directory to the nearest ancestor holding a `pnpm-workspace.yaml`, or a `package.json` with
a `workspaces` field, and calls the kit's `discoverPacks({ workspace: <that ancestor>, filter: {
package: <the package's name> } })` [[d:the-workspace-root-is-found-by-walking-up]]. The criterion
key is `package` and its value is the npm package name; a filter naming a key the kit does not
recognise is no filter at all, and the call comes back with every pack in the workspace
[[f:dev-kit-pack-search-narrows-by-the-owning-package-name]]. What comes back is the pack set: one
entry per pack of this package, each carrying the pack's kind, its source location, its build output
location, and the full content of its manifest with the fields completion populates
[[f:dev-kit-pack-set-entry-names-package-kind-source-and-identity]]. The build reads its packs from
there rather than from the source manifests at `behavior_pack/manifest.json` and
`resource_pack/manifest.json` itself [[f:pack-sources-sit-at-fixed-kind-named-directories]]
[[d:the-build-reads-the-kit-pack-set]].

Every location an entry carries — its package directory, its source directory, its output
directory — is written relative to the workspace root that was handed to the call, not to the
package [[f:dev-kit-pack-entry-paths-are-workspace-relative]]. The build joins each to that
workspace root before opening or writing anything, and every `<package>/…` path written below is
that absolute result. An entry's path used as it comes back resolves against the process's working
directory and writes into the wrong tree.

Two entries at most come back, one behavior pack and one resource pack, because a package holds at
most one pack of each kind [[f:pack-sources-sit-at-fixed-kind-named-directories]]. Each entry's
output location is `<package>/dist/<kind>/`, where `<kind>` is `behavior_pack` or `resource_pack`;
the kit computes that location and writes nothing there, so this design is the only writer of the
output tree [[f:dev-kit-reports-a-fixed-kind-named-output-location-and-writes-none]].

A pack the kit marks invalid fails the build: the plugin throws, printing that pack's source
directory and kind and its structured problems, and builds neither that pack nor its sibling
[[d:an-invalid-pack-fails-the-build]]. The pack is named by its source directory and kind rather
than by its manifest name, because a pack whose manifest could not be read has no name to print and
those two are on every entry the kit returns, valid or not
[[f:dev-kit-pack-entry-paths-are-workspace-relative]]. A package for which the set is empty fails
the same way, naming the package directory that was searched
[[d:a-package-with-no-pack-fails-the-build]].

## What the build produces

Three things reach each pack's output directory, and nothing else does.

**The manifest.** `<package>/dist/<kind>/manifest.json` is the completed manifest from the pack set
entry, serialised as JSON with two-space indentation and a trailing newline. The source
`manifest.json` is never copied through [[r:built-manifests-are-the-completed-ones]]
[[d:the-completed-manifest-is-two-space-json]]. Its `header.version` is the owning package's
`package.json` version, which the kit put there, so raising that version and building is what
produces a new version of the pack and nothing here writes a version of its own
[[r:the-package-version-is-the-pack-version]] [[f:opus-package-versions-are-written-by-changesets]].

**The script bundle.** A manifest module of type `script` names its entry-point file in an `entry`
string [[f:a-script-module-names-its-entry-point-path]], so the bundle is written to
`<package>/dist/behavior_pack/<that entry>` — `scripts/main.js` in the ordinary case
[[d:the-bundle-lands-at-the-manifest-declared-entry]]. It is ESM, unminified, with no `.d.ts` and no
sourcemap; any further chunk the bundler produces is written beside it in the same directory
[[d:the-bundle-is-one-unminified-esm-chunk]]. The plugin deletes every chunk from the bundle object
in `generateBundle` and writes the code out itself, so the bundler's own emit never lands in the
output tree and one writer owns every file there [[d:the-plugin-places-every-output-file-itself]].
A build where `behavior_pack/scripts/main.ts` exists but the pack's manifest declares no script
module, or a script module with no `entry`, fails naming both.

The modules the game provides at runtime stay external
[[r:script-module-is-bundled-with-game-modules-external]]. The set is read from the pack's completed
manifest: every `dependencies` entry carrying a `module_name` — `@minecraft/server`,
`@minecraft/server-ui`, and any other built-in the pack declares — since that is what a manifest
dependency on a built-in scripting module looks like
[[f:pack-dependency-entries-name-a-uuid-or-a-module-name-plus-a-version]]. The plugin's `resolveId`
marks exactly those specifiers, and subpath imports of them, external. Everything else is bundled,
the `@minecraft/` scope included: `@minecraft/vanilla-data` ships runtime JavaScript and is bundled
like any other dependency, and no manifest dependency entry could name it
[[f:vanilla-data-provides-prefixed-id-constants]].

So the scope alone cannot decide it, and what does is whether there is anything to bundle. For an
undeclared specifier under the `@minecraft/` scope the plugin resolves it itself: where importable
JavaScript resolves, the import is bundled and the build says nothing; where nothing importable
resolves — the shape a module the game provides takes, `@minecraft/server` shipping type
declarations and no runtime code [[f:vanilla-data-provides-prefixed-id-constants]] — the build fails
naming the specifier, the importing file, and the `module_name` dependency the manifest would have
to declare to make it external. Bundling a module the game provides produces a pack that fails at
the server instead [[d:externals-come-from-the-manifests-module-dependencies]].

**Everything else the pack is made of.** Functions, entity and item definitions, textures, `.lang`
files and the rest are copied from `<package>/<kind>/` into `<package>/dist/<kind>/`, preserving
their relative paths, so a finished build is loadable with no further processing downstream
[[r:every-pack-file-reaches-the-output-tree]]. Two exclusions: the source `manifest.json`, replaced
by the completed one, and everything under `scripts/`, which is bundler input
[[d:script-sources-live-in-the-packs-scripts-directory]]. Everything else copies byte for byte,
dotfiles and unrecognised extensions included, with no transformation
[[d:assets-copy-verbatim-except-the-manifest-and-scripts]]. A source directory holding no files
creates no directory in the output [[d:empty-source-directories-produce-no-output-directory]].

The output tree holds what the current source declares and nothing else, with no clean step first
[[r:assembly-is-authoritative-over-the-output-tree]]. The build records every path it wrote —
manifest, bundle, copied files — and at the end walks `<package>/dist/`, the whole of it, deleting
anything absent from that set, then removes the directories left empty. The scope is the package's
`dist/` and not one pack's directory within it, because a pack deleted from source is a pack the
current set does not name: `dist/resource_pack/` left standing after `resource_pack/` is removed
from source would still be zipped into the released archive. A kind-named directory the pack set
does not name goes whole. The build never clears the tree before building
[[d:stale-output-is-pruned-not-wiped]]. Every write is compared against what already sits
at the path and skipped when the bytes match, so an unchanged file keeps its modification time and a
consumer watching the tree mid-build sees only what actually changed
[[d:output-files-are-written-only-when-their-bytes-change]].

Nothing else is produced. A build writes no record of which packs it changed; a consumer that needs
to know reads the output tree it is already watching [[d:a-rebuild-emits-no-report]].

## Rebuilds

A pack's assets, its source manifests and its `package.json` are imported by nothing, so a module
graph never sees them change. The plugin declares them: at `buildStart` it calls `addWatchFile`, whose
argument may be a directory as well as a file [[f:a-rolldown-plugin-can-declare-extra-watch-inputs]],
on each of [[r:rebuild-triggers-are-declared-not-inferred]]:

- every file under each pack's source directory, and every directory under it including the pack
  source directory itself — the directories are what catch a file that does not exist yet, so a
  texture, a function or a `.lang` file added between builds triggers one rather than waiting for
  an unrelated change
- `<package>/behavior_pack/manifest.json` and `<package>/resource_pack/manifest.json` where they
  exist, and `<package>/package.json`
- the `package.json` of every other workspace package holding a pack this package's manifests
  depend on. A dependency entry's version is completed from that package's own `package.json`
  [[f:dev-kit-completes-a-workspace-dependency-version-from-the-owning-package]], so the completed
  manifest this build writes changes when that file does, and a build that reads it is a build it
  triggers. The plugin finds those packages with a second, unfiltered `discoverPacks` call, whose
  entries map each dependency uuid to the package directory that owns it

A change to any of them triggers the rebuild, which re-reads the pack set and re-runs everything
above.

That gives the two rebuild paths their observable difference without a second code path. A source
change rebundles and the bundle is rewritten. A change to a manifest input alone — a manifest edit,
a version bump in this package or in a sibling it depends on — re-completes the manifests and
rewrites them, while the bundle's bytes are unchanged and so are not written at all
[[d:output-files-are-written-only-when-their-bytes-change]].

## The release archive

A package is released as one archive of its whole output tree, and the packs inside it are not
separately releasable [[r:a-released-pack-is-an-archive-of-its-output-tree]]. An artifact reaches a
GitHub release only through a `release-assets` script the package declares, which takes no arguments
and writes flat files into a `.release-assets/` directory in the package
[[f:opus-release-assets-come-from-a-per-package-script]], so the archive half is a command that
script runs: `mc-pack-archive`, declared in the kit package's `bin`
[[d:the-archive-ships-as-a-bin-command]]. It takes no arguments and works on the package directory
it is run in [[d:the-archive-command-takes-no-arguments]].

The format follows what a package contains: an `.mcpack` is one zipped pack and an `.mcaddon` a zip
holding `.mcpack` files [[f:release-archives-follow-pack-content]]. So the command zips each
`<package>/dist/<kind>/` into `<kind>.mcpack` — `behavior_pack.mcpack`, `resource_pack.mcpack` —
and zips those into one `.mcaddon`, whether the package holds one pack or two
[[d:the-archive-is-a-single-mcaddon-per-package]]. The archive is written to
`<package>/.release-assets/<name>-<version>.mcaddon`, where `<name>` is the package's name with its
npm scope stripped (`@twin-digital/village-guard` becomes `village-guard`) and `<version>` is its
`package.json` version [[d:archive-names-come-from-the-package-name-and-version]]. The directory is
created if it does not exist [[d:the-archive-command-takes-no-arguments]].

The command reads the output tree and never produces it: a package whose `dist/` is missing, or
holds no kind-named directory, fails with that path named
[[d:a-missing-output-tree-fails-the-archive]]. It uploads nothing and declares no hook.

## Components

```yaml
components:
  - id: pack-set-access
    responsibility: |
      resolve the package directory from `packageUrl`, find the workspace root, call the kit, and
      hand back this package's valid pack entries or fail with their problems
    excludes: discovering, validating, or completing anything itself
  - id: config-fragment
    responsibility: |
      the exported `packBuild` function — the tsdown keys it sets, the entry it chooses, and the
      TSDoc that documents it
    excludes: doing any of the build's work
  - id: build-plugin
    responsibility: |
      the `mc-pack-build` Rolldown plugin — its hooks, the virtual entry module, the external
      resolution, the order the writers run in, and the script bundle itself: resolving the entry
      path the manifest declares, emptying the bundle object in `generateBundle`, and handing the
      entry chunk and its siblings to the writer at their output paths
    after: [pack-set-access]
  - id: output-writer
    responsibility: |
      the content-compared write, the record of written paths, and the prune-and-tidy pass over a
      pack's output directory
    excludes: deciding what content any file holds
  - id: pack-assembly
    responsibility: copy a pack's non-script, non-manifest files into its output directory, and write its completed manifest
    after: [output-writer]
  - id: watch-inputs
    responsibility: enumerate the files a pack's build reads and declare each with `addWatchFile`
    after: [pack-set-access]
  - id: archive-command
    responsibility: the `mc-pack-archive` bin — reading a package's output tree and writing its `.mcaddon` into `.release-assets/`
    excludes: building anything, and putting the archive anywhere but that directory
  - id: readme-usage-section
    responsibility: |
      the kit package's README usage section — the fragment a consuming package's
      `tsdown.config.d/` file holds, what a build puts in the output tree, and the `release-assets`
      line that runs `mc-pack-archive` with what it writes
    excludes: the TSDoc on the exported function, which ships with that function
    after: [config-fragment, archive-command]
```
