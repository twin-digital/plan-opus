# Brief — pack-build

## What this design is for

Every package in the Minecraft Bedrock monorepo needs the same build: bundle its script module, put
every other file the pack is made of into the output tree, and get its manifests written out
complete, so the output is a loadable pack. That work has no owner today. Each package carries its
own build wiring, so the output layout and the completion rules are copied into every package that
wants a loadable pack, and a package that copies them slightly wrong ships output that fails at the
server with nothing reporting why.

What this design produces is a tsdown configuration fragment a pack package merges into its own
config, plus documentation of what merging it produces. No command, no bundler embedded here, and
nothing for a pack to implement.

It ships in the same distributable as `minecraft/dev-kit` — one package, two designs, a split of
subject matter rather than of artifacts. The kit's side reads a workspace, validates it, normalises
it into a pack set, and fills in the values a source manifest deliberately leaves out; this side
turns a package's source into the built tree those values land in. The kit is settled and built, so
what this design rests on is recorded rather than awaited: it reports where each pack's built output
is expected and produces none of it
(`f:dev-kit-reports-a-fixed-kind-named-output-location-and-writes-none`), alongside the entry
details `f:dev-kit-pack-set-entry-names-package-kind-source-and-identity` already carries.

## In scope

- **The exported fragment** — what it configures, and what a consumer has to hand it.
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
  produces a new version of the pack.
- **The documentation of the export** — what a consumer merges, and what merging it produces.

## Out of scope

- **How a monorepo wires the fragment into its packages.** Opus has a `tsdown.config.d/` merge
  convention and a `repo-kit` rule that writes the per-package snippet; that is the monorepo's
  config management, not this design's. It shapes the export — a partial config that shallow-merges
  over a shared base — and that is the whole of its bearing here.
- **Turning a built tree into a release artifact.** Archiving and publishing sit past the far edge
  of this design, which stops at the output tree, and `r:a-pack-does-not-deliver-itself` puts them
  outside the pack as well. No design owns that step today.
- **Discovery, validation, and manifest completion** — `minecraft/dev-kit`.
- **Watching at the workspace level, deploying into a server pool, activating, and reloading** —
  `minecraft/dev-server`.
- **The bundler.** This design configures tsdown; it does not wrap it, replace it, or fix how the
  repository invokes it.

## Done looks like

A pack package merges the exported fragment into its tsdown config, runs the repository's ordinary
build, and its output tree holds a complete loadable pack — script bundled, every asset in place,
manifests complete — with a file deleted in source gone from the output on the next build. A second
pack package does the same, with no build rule copied between the two.

## What the design must still decide

- **What the exported fragment needs from its consumer.** The prototype's took `import.meta.url` to
  locate the package directory; whether that is the right interface, and what else it has to be
  told, is open.
- **A package holding two packs.** The kit fixes the shape: a package structurally holds at most one
  pack of each kind, and each reported pack carries its own output location, so two packs means two
  entries and two output trees. What is open is this side — one config across both trees, when only
  the behavior pack has a script module at all.
- **Where manifest completion runs** — as a hook in the bundler's own lifecycle, or as a step beside
  it. The manifest-only rebuild path hangs on the same answer.
- **How the extra watch inputs are declared.** The option is to be confirmed against the installed
  bundler rather than guessed at here.
- **Whether this side reads the pack set at build time at all**, or works from the package it is
  merged into and leaves the set to the consumers downstream. The kit calls no build and never
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
- **The export has to fit a merge convention this design does not own.** A shallow-merged partial
  config is the shape the fragment is built for, and the mechanism producing it sits outside this
  spec. If that convention moves, the fragment's interface follows something it cannot see.
- **Manifest completion is the kit's, but completed manifests land in this side's output tree.** The
  two halves of one package have to meet somewhere, and every option costs something — a build that
  calls the kit couples them, and one that does not duplicates completion.
- **Assembly is authoritative over a tree something else is watching.** The dev server deploys from
  the output tree while a build deletes and rewrites it. Nobody has looked at what a deploy sees
  mid-build.
