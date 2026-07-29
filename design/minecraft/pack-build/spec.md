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
import path from 'node:path'
import { packBuild } from '@twin-digital/mc-dev-kit/pack-build'

export default packBuild({ packageDir: path.join(import.meta.dirname, '..') })
```

`packBuild` takes one required option, `packageDir`: the filesystem path of the package directory
the build is for — the directory holding that package's `package.json`, which every `<package>/…`
path below is resolved against. A relative path resolves against the process's working directory,
so a caller that cannot be sure of that passes an absolute one
[[d:the-consumer-hands-over-its-package-directory]].

The fragment above is a module, so it names its own directory with `import.meta.dirname`, a plain
path string every active Node LTS carries [[f:import-meta-dirname-gives-a-module-its-directory-as-a-path]],
and joins the `..` itself: a fragment sits one level down, in `<package>/tsdown.config.d/`
[[f:opus-bundler-config-merges-partial-fragments]]. The export takes the package directory rather
than deriving it from where the caller sits, so the fragment convention — which this design does not
own and cannot see move — stays out of its interface.

`packBuild` returns a partial tsdown config setting exactly these keys:

- `entry` — `<package>/behavior_pack/scripts/main.ts` when that file exists, and otherwise the
  virtual module id `\0mc-pack-build:empty`, which the plugin resolves and loads as an empty module
  so a package with no script sources still has an input [[d:a-script-less-package-builds-through-a-virtual-entry]]
- `outDir` — `<package>/dist/behavior_pack/scripts`, the directory the pack's built script sits in
- `outputOptions` — `{ entryFileNames: 'main.js' }`
- `clean` — `false`
- `dts` — `false`
- `sourcemap` — `false`
- `minify` — `false`
- `format` — `['esm']`
- `plugins` — a single Rolldown plugin named `mc-pack-build`, which performs everything below the
  bundler does not do itself

`noExternal` is deliberately absent from that list, so the fragment inherits the shared base's
`noExternal: () => true` [[f:opus-bundler-base-forces-every-import-bundled]]. That is what makes
the external set this design's own rather than an upstream default's: tsdown otherwise leaves an
import of a package in the building package's `dependencies` external, and a `noExternal` matching
nothing restores that default rather than switching externalisation off
[[f:tsdown-externalises-a-packages-declared-dependencies-by-default]]. Under `() => true` every
import is forced into the bundle except the ones the plugin's `resolveId` returns as external,
which stay external [[f:a-plugin-resolveid-external-return-wins-over-noexternal]]. The external set
is then exactly what that hook returns, and a pack package listing `@minecraft/vanilla-data` in its
`dependencies` gets it bundled rather than left as a bare import a server cannot resolve
[[r:script-module-is-bundled-with-game-modules-external]].

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
package directory to the nearest ancestor holding a `pnpm-workspace.yaml`, and calls the kit's
`discoverPacks({ workspace: <that ancestor> })`. That one file is the whole test: it is what defines
a pnpm workspace's root [[f:pnpm-workspace-packages-is-an-include-exclude-glob-list]], and a package
directory with no such ancestor fails the build naming the directory the walk started from. A
`workspaces` field in a `package.json` is not looked for — it marks an npm or yarn workspace, which
is not the shape this ships into, and a second marker with no case behind it is a second thing to be
wrong [[d:the-workspace-root-is-the-nearest-pnpm-workspace-file]]. The call passes no filter, so what comes back is
every pack in the workspace [[f:dev-kit-discovery-returns-the-whole-workspace-set-unfiltered]]; the
plugin selects this package's packs from it in memory, by the owning package name each entry
carries. One unfiltered call rather than a filtered one because the build needs the rest of the set
too — it is what maps a manifest's dependency uuids to the packages whose versions complete them
(below), and reading the workspace twice per rebuild is a cost felt in a watch loop
[[d:the-build-reads-the-kit-pack-set]]. Each entry carries the pack's kind, its source location, its
build output location, and the full content of its manifest with the fields completion populates
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

A pack *of this package* the kit marks invalid fails the build — an invalid pack elsewhere in the
workspace is none of this build's business: the plugin throws, printing that pack's source
directory and kind and its structured problems, and builds neither that pack nor its sibling
[[d:an-invalid-pack-fails-the-build]]. The pack is named by its source directory and kind rather
than by its manifest name, because a pack whose manifest could not be read has no name to print and
those two are on every entry the kit returns, valid or not
[[f:dev-kit-pack-entry-paths-are-workspace-relative]]. A package whose selection is empty fails
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

**The script bundle.** The pack's built script is `<package>/dist/behavior_pack/scripts/main.js` —
the script output location the kit computes from the pack's kind and reports beside the pack's
source and output directories [[f:dev-kit-reports-a-packs-script-output-location]]. The bundler
writes it, and the two config keys above are what put it there: `outDir` names that file's
directory, and `entryFileNames` names the file, since tsdown otherwise writes its ESM entry chunk as
`main.mjs` and a manifest naming `scripts/main.js` would load nothing
[[f:tsdown-entry-chunk-name-comes-from-entryfilenames]]
[[d:the-bundler-writes-its-chunks-and-the-plugin-writes-the-rest]]. The path is not taken from the
manifest, though a module of type `script` does name its entry-point file in an `entry` string
[[f:a-script-module-names-its-entry-point-path]]: reading it here would be manifest handling that
belongs to whoever completes manifests.

The configuration fixes that path rather than the plugin reading it from the pack set, because there
is no later moment to read it in. The one hook that can still change where output goes,
`outputOptions`, runs before `buildStart`, so nothing the plugin learns from the workspace can reach
it [[f:the-outputoptions-hook-runs-before-buildstart]]. The plugin closes the gap from the other
side: at `buildStart` it compares the script output location the pack set reports for this package's
behavior pack against `<package>/dist/behavior_pack/scripts/main.js`, and fails the build printing
both when they differ, because a script written where the kit does not say is a script nothing
deploying the pack will look for
[[d:the-script-output-path-is-set-in-config-and-checked-against-the-kit]].

A resource pack's entry reports no script location, so nothing belongs in one. A behavior pack whose
manifest declares no module of type `script` gets no script in its output either, and one whose
manifest declares no script module while `behavior_pack/scripts/main.ts` exists fails the build
naming both — a pack with script sources nothing loads is a mistake worth reporting, and
`modules[].type` is a field the kit declares and checks. A behavior pack with a script module and no
sources still builds and still writes: its script is the empty module the virtual entry loads
[[d:a-script-less-package-builds-through-a-virtual-entry]].

The bundler has one entry and writes it whatever the packs turn out to say, so those cases — and a
package holding only a resource pack — get `main.js` written into
`<package>/dist/behavior_pack/scripts/` anyway. The plugin does not record it among the files the
build placed, so the prune deletes it at the end of the build and takes the directories it emptied
with it [[d:a-chunk-no-pack-claims-is-pruned-like-any-other-stale-output]]. That works because the
bundler's files are already on disk when `writeBundle` runs and nothing rewrites one deleted there
[[f:a-file-the-bundler-wrote-can-be-deleted-from-writebundle]].

The script is ESM, unminified, with no `.d.ts` and no sourcemap; a chunk the bundler splits out is
written beside the entry in the same directory, under the bundler's own hashed name and its `.mjs`
extension, which nothing here renames because no manifest names it
[[d:the-bundle-is-one-unminified-esm-chunk]] [[f:tsdown-entry-chunk-name-comes-from-entryfilenames]].
Sourcemaps and declarations are the bundler's own emit again now that the bundler does the writing,
so turning sourcemaps on is the `sourcemap` key and nothing else: the map arrives as its own entry in
the bundle object beside its chunk, so the plugin learns its name with the rest and the prune keeps
it [[f:the-bundle-object-names-every-file-the-bundler-writes]]. Both stay off — nothing that loads a
pack reads either.

So the division is: the bundler resolves, transforms, tree-shakes, chunks, names and writes the
script, while the plugin decides what is external, supplies the virtual entry, writes the manifests
and the assets, and stays authoritative over the tree the bundler wrote into
[[r:assembly-is-authoritative-over-the-output-tree]]
[[d:the-bundler-writes-its-chunks-and-the-plugin-writes-the-rest]]. What makes that authority hold
across two writers is that the bundle object names every file the bundler wrote, entry chunk, split
chunk and sourcemap alike, and the plugin reads that list in `writeBundle` before it prunes
[[f:the-bundle-object-names-every-file-the-bundler-writes]]. `clean` stays `false` for the same
reason the prune exists: `clean` empties the whole output directory before the first plugin hook
runs [[f:tsdown-clean-empties-the-whole-output-directory-before-buildstart]], which on this `outDir`
would delete the built script at the start of every rebuild to write it back at the end, and the
prune already removes a chunk the current build did not write. Left at `false` the bundler creates
and removes nothing but its own output, so the prune is the only thing deleting from the tree
[[f:emptying-the-bundle-in-generatebundle-leaves-the-bundler-nothing-to-write]].

The modules the game provides at runtime stay external
[[r:script-module-is-bundled-with-game-modules-external]]. The set is read from the pack's completed
manifest: every `dependencies` entry carrying a `module_name` — `@minecraft/server`,
`@minecraft/server-ui`, and any other built-in the pack declares — since that is what a manifest
dependency on a built-in scripting module looks like
[[f:pack-dependency-entries-name-a-uuid-or-a-module-name-plus-a-version]]. The kit's entry types
carry it, so the whole of obtaining that set is:

```ts
// entry: a ValidPackEntry from discoverPacks; manifest is the completed PackManifest
const gameModules = (entry.manifest.dependencies ?? []).flatMap((d) =>
  'module_name' in d ? [d.module_name] : [],
)
```

`PackManifest.dependencies` is an optional array whose every element carries exactly one of `uuid`
or `module_name`, both typed and form-checked before an entry is called valid, and the kit exports
those types alongside `discoverPacks` [[f:dev-kit-types-the-completed-manifests-dependency-entries]].
No new kit field is needed for the external set.

The plugin's `resolveId`
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
[[r:assembly-is-authoritative-over-the-output-tree]]. The build records every path this build put in
the tree — the manifests and copied files the plugin wrote, and the files the bundler wrote, whose
names it takes from the bundle object [[f:the-bundle-object-names-every-file-the-bundler-writes]] —
and at the end walks `<package>/dist/`, the whole of it, deleting
anything absent from that set, then removes the directories left empty. The scope is the package's
`dist/` and not one pack's directory within it, because a pack deleted from source is a pack the
current set does not name: `dist/resource_pack/` left standing after `resource_pack/` is removed
from source would still be zipped into the released archive. A kind-named directory the pack set
does not name goes whole. The build never clears the tree before building
[[d:stale-output-is-pruned-not-wiped]]. Each file the plugin writes is compared against what already
sits at the path and skipped when the bytes match, so an unchanged manifest or asset keeps its
modification time [[d:output-files-are-written-only-when-their-bytes-change]]. The built script is
the exception, and the one file in the tree this design does not write: the bundler rewrites it on
every build, byte-identical or not [[f:tsdown-rewrites-an-output-file-whose-bytes-did-not-change]].

Nothing else is produced. A build writes no record of which packs it changed; a consumer that needs
to know reads the output tree it is already watching [[d:a-rebuild-emits-no-report]]. What makes
that enough is the compared write over what the plugin places: the manifests and assets a rebuild
did not change keep their modification times, so the tree itself says which packs a rebuild altered.
The built script says less — its timestamp moves on every build, so a consumer reading timestamps
alone learns that a build ran rather than that the script changed, and one that needs the difference
compares the bytes it already holds. What
makes a report worse than redundant is where it would have to live. Inside `<package>/dist/` it is a
file the current source does not declare, which the requirement holding that tree authoritative
rules out and the prune would delete [[r:assembly-is-authoritative-over-the-output-tree]]; outside
it, it is a second artifact in a second location that a consumer must be told about, kept in step
with the tree, and cleaned up — where the tree is already the interface both sides agree on.

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
  triggers. The workspace set already read at `buildStart` is what maps each dependency uuid to the
  package directory that owns it

A change to any of them triggers a rebuild, and a rebuild is the whole build: the pack set is read
again, the module graph is bundled again, and every file the plugin places is written again through
the compare. There is no second, shorter path for a change that touches only a manifest input — what
a rebuild has to bring up to date is the output, and skipping work it does not need is this design's
to choose rather than something demanded of it [[r:rebuild-triggers-are-declared-not-inferred]].

What a watching consumer sees is therefore the same on every rebuild as far as the script goes: a
version bump or a manifest edit rewrites `scripts/main.js` with identical bytes, because the bundler
runs and the bundler writes unconditionally [[f:tsdown-rewrites-an-output-file-whose-bytes-did-not-change]].
The manifests and the assets still move only when their content does
[[d:output-files-are-written-only-when-their-bytes-change]], so what a rebuild costs a consumer is a
script it may redeploy for nothing, not a pack-wide false alarm. A path that skipped the bundler for
a change no source file was part of would be an optimisation, and it can be added later behind this
same observable behaviour.

## The release archive

A package releases as a single archive, cut from its built output tree and nothing else, with no
pack inside it released on its own [[r:a-released-pack-is-an-archive-of-its-output-tree]]. An artifact reaches a
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
      walk up from `packageDir` to the workspace root, call the kit, select this package's packs
      from the set, and hand them back valid or fail with their problems
    excludes: discovering, validating, or completing anything itself
  - id: config-fragment
    responsibility: |
      the exported `packBuild` function — the tsdown keys it sets, including the output directory
      and entry filename that place the built script, the entry it chooses, and the TSDoc that
      documents it
    excludes: doing any of the build's work
  - id: build-plugin
    responsibility: |
      the `mc-pack-build` Rolldown plugin — its hooks, the virtual entry module, the external
      resolution, the check of the configured script path against the one the pack set reports,
      and the list of bundler-written files it reads off the bundle object for the prune
    excludes: writing the script itself, which the bundler does
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
