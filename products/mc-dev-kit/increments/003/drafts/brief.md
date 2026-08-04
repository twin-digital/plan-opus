# Brief — pack-build

## What this design is for

Every package in the Minecraft Bedrock monorepo needs the same build: bundle its script module, put
every other file the pack is made of into the output tree, and get its manifests written out
complete, so the output is a loadable pack. That work has no owner today. Each package carries its
own build wiring, so the output layout and the completion rules are copied into every package that
wants a loadable pack, and a package that copies them slightly wrong ships output that fails at the
server with nothing reporting why.

What this design produces is exported for a pack package's bundler configuration to use, plus
documentation of how to use it, plus the archive a released pack is cut into. No command line, no
bundler embedded here, and nothing for a pack to implement.

The form follows the monorepo it ships into rather than a choice made here: shared build behaviour
reaches a package there as a value its config merges, never as a command the package runs
(`f:opus-bundler-config-merges-partial-fragments`), and an artifact reaches a GitHub release only
through a hook the package itself declares (`f:opus-release-assets-come-from-a-per-package-script`).
Those two facts are why the product is an export and why the archive is one too.

It ships in the same distributable as `minecraft/dev-kit` — one package, two designs, a split of
subject matter rather than of artifacts. The kit's side reads a workspace, validates it, normalises
it into a pack set, and fills in the values a source manifest deliberately leaves out; this side
turns a package's source into the built tree those values land in. The kit is settled and built, so
what this design rests on is recorded rather than awaited: it reports where each pack's built output
is expected and produces none of it
(`f:dev-kit-reports-a-fixed-kind-named-output-location-and-writes-none`), alongside the entry
details `f:dev-kit-pack-set-entry-names-package-kind-source-and-identity` already carries.

## In scope

- **What gets exported, and in what form** — what it configures or does, and what a consumer has to
  hand it.
- **Bundling** — the script module to where the pack's output tree expects it, with the modules the
  game provides at runtime left external.
- **Assembly** — a pack is mostly not TypeScript. Functions, entity and item definitions, textures,
  and `.lang` files all have to reach the output tree, and the tree has to hold what the current
  source declares and nothing else.
- **Rebuild triggers** — those files and `package.json` are imported by nothing, so a module graph
  will never see them change. They are declared inputs, or an asset edit and a version bump rebuild
  nothing. That splits rebuilds in two: a source change that rebundles, and a manifest-input change
  that only brings the completed manifests up to date.
- **Versioning** — a pack's version comes from `package.json`, so raising it and building is what
  produces a new version of the pack. The bump itself is the release process's
  (`f:opus-package-versions-are-written-by-changesets`); nothing here writes a version.
- **The release archive** — what a pack is cut into for distribution, produced from the output tree
  this design already owns. A `.mcpack` is one zipped pack and an `.mcaddon` a zip of those
  (`f:release-archives-follow-pack-content`); which one a pack ships is the design's to choose.
- **The documentation of the export** — how a consumer uses it, and what using it produces.

## Out of scope

- **How a monorepo wires the export and the archive into its packages.** A package's config is
  generated from the monorepo's own declarative configuration
  (`f:opus-package-config-is-generated-from-one-root-file`), and which rule generates it, when it
  fires, and what the generated snippet looks like are that config manager's. This design produces
  what those files point at, and nothing about the pointing.
- **Getting the archive onto a release.** Where an asset lands and who uploads it is the monorepo's
  release convention — a per-package hook, a `.release-assets/` directory, a CI job
  (`f:opus-release-assets-come-from-a-per-package-script`). This design produces the archive that
  hook calls for, and neither declares the hook nor publishes anything.
- **Discovery, validation, and manifest completion** — `minecraft/dev-kit`.
- **Watching at the workspace level, deploying into a server pool, activating, and reloading** —
  `minecraft/dev-server`.
- **The bundler.** This design configures tsdown; it does not wrap it, replace it, or fix how the
  repository invokes it.

## Done looks like

A pack package takes up the export in its tsdown config, runs the repository's ordinary build, and
its output tree holds a complete loadable pack — script bundled, every asset in place, manifests
complete — with a file deleted in source gone from the output on the next build. A second
pack package does the same, with no build rule copied between the two.

## What the design must still decide

- **What form the export takes — a config fragment, a rolldown plugin, or a fragment carrying one.**
  The prototype used a fragment with tsdown's `onSuccess`; a plugin is the more standard shape for
  the behavioural half, and it is the only one of the two that can declare extra watch inputs, since
  a plugin gets `this.addWatchFile()` and a fragment gets nothing equivalent. Against it, a plugin
  cannot set `entry` or `dts`, so a fragment of some size survives either way. tsdown accepts
  rolldown plugins directly, and rolldown carries the Rollup hook set — `resolveId`, `writeBundle`,
  `closeBundle`, `watchChange` — so both are open. `unplugin` is the third option and looks like a
  poor fit: it buys portability across bundlers this design does not target.
- **What the export needs from its consumer.** The prototype's took `import.meta.url` to locate the
  package directory; whether that is the right interface, and what else it has to be told, is open.
  The archive export faces the same question separately.
- **What the archive holds and what format it takes** — one pack or a package's packs together, and
  whether anything beside the output tree goes in.
- **A package holding two packs.** The kit fixes the shape: a package structurally holds at most one
  pack of each kind, and each reported pack carries its own output location, so two packs means two
  entries and two output trees. What is open is this side — one config across both trees, when only
  the behavior pack has a script module at all.
- **Where manifest completion runs** — as a hook in the bundler's own lifecycle, or as a step beside
  it. The manifest-only rebuild path hangs on the same answer.
- **How the extra watch inputs are declared.** This is the same question as the form of the export,
  from the other end: `addWatchFile` is a plugin's to call, so the answer here constrains the answer
  there.
- **Whether this side reads the pack set at build time at all**, or works from the package it is
  used by and leaves the set to the consumers downstream. The kit calls no build and never
  reads the output tree, so the seam is one-way; which way this side crosses it is open.
- **What a rebuild reports.** A watching consumer needs to know which packs a rebuild changed before
  it can redeploy them; nothing here fixes how it learns that.
- **Whether a non-default output root is needed at all.** The kit settled this by not having one: an
  output location is computed from the package directory and the kind and is never probed, so there
  is nowhere for a package to state its own. If this design needs one, that is a change to the kit
  rather than an open question here.

## Known tensions

- **One package, two designs.** A discovery library a consumer imports to read a workspace begins
  carrying a bundler configuration it never calls. That is the price of the single distributable,
  and it surfaces in a dependency list rather than anywhere a reader of either design would look.
- **The export has to fit a merge convention this design does not own.** Fragments are
  shallow-merged, so a top-level key one sets replaces the base's wholesale — which means only one
  fragment in a package can own `plugins` before they start clobbering each other. The mechanism
  producing those files sits outside this spec, so if the convention moves, the export's interface
  follows something it cannot see.
- **Manifest completion is the kit's, but completed manifests land in this side's output tree.** The
  two halves of one package have to meet somewhere, and every option costs something — a build that
  calls the kit couples them, and one that does not duplicates completion.
- **Assembly is authoritative over a tree something else is watching.** The dev server deploys from
  the output tree while a build deletes and rewrites it. Nobody has looked at what a deploy sees
  mid-build.
