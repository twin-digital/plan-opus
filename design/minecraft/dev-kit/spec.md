# Minecraft Dev Kit

## Summary

The dev kit answers, for a workspace of Minecraft Bedrock packages, which packs exist here and what
each one is. It produces an npm package, `@twin-digital/mc-dev-kit`, whose export hands back a
normalised pack set as typed data: one entry per pack found, marked valid or invalid, carrying
identity, version, kind, source and output locations, the owning package, and the pack's manifest
completed with what the package already knew. The problem it answers is that everything above it —
deployment, activation, reload, watching, the selection UX — needs one already-validated answer to
"what is here", and a source manifest is partial by design, so the answer has to be assembled and
checked before a consumer can act on it. The constraint that shapes the whole design is
exhaustiveness: whatever the kit finds must appear in the list, so a fault becomes a reported entry
rather than a thrown error, and every part of the pipeline is written to keep going and record what
went wrong.

## What the consumer gets

The kit ships as an ESM TypeScript library named `@twin-digital/mc-dev-kit`
[[r:dev-kit-library-name]], exporting one async entry point. A consumer imports it and receives the
pack set as data; nothing is returned as text to parse [[r:dev-kit-provides-a-library]].

```ts
const set = await discoverPacks({ workspace: '/abs/path/to/repo' })
set.packs                       // readonly PackEntry[] — the whole of what was found
set.search({ package: 'mc-pack-1' })  // PackEntry[]
```

`discoverPacks` reads the filesystem once and builds the whole set eagerly; `search` runs over that
in-memory set, and the kit neither caches across calls nor watches for changes — a consumer wanting
fresh data calls `discoverPacks` again [[d:the-pack-set-is-read-once-per-call]]. It throws in
exactly one case: the workspace root holds neither a readable `pnpm-workspace.yaml` nor a readable
`package.json`, so there is no workspace to enumerate. Every other fault is carried by an entry
[[d:only-a-missing-workspace-definition-throws]].

`set.packs` is the single flat list of everything found, so nothing appears in one view and is
missing from another, and every entry is `valid` or `invalid` [[r:pack-discovery]]. The two shapes
share their non-manifest details:

```ts
type PackKind = 'behavior' | 'resource'

interface PackEntryBase {
  kind: PackKind          // from the source directory name, corroborated by the manifest
  packageName?: string    // absent when the owning package.json could not be read
  packageDir: string      // workspace-relative, e.g. 'packages/mc-pack-1'
  sourceDir: string       // workspace-relative, e.g. 'packages/mc-pack-1/behavior_pack'
  outputDir: string       // workspace-relative, e.g. 'packages/mc-pack-1/dist/behavior_pack'
}

interface ValidPackEntry extends PackEntryBase {
  status: 'valid'
  packageName: string
  uuid: string            // the completed manifest's header.uuid, lowercased
  version: string         // the completed manifest's header.version, a SemVer string
  manifest: object        // the completed manifest, in the format version it declared
  problems: []
}

interface InvalidPackEntry extends PackEntryBase {
  status: 'invalid'
  uuid?: string
  version?: string
  manifest?: object
  problems: [Problem, ...Problem[]]
}
```

A valid entry carries every detail with nothing absent or in doubt. An invalid one carries the
problems that invalidated it plus every detail its sources still hold — always the kind and the two
locations, and the package name, uuid, version, and manifest whenever those survived
[[r:pack-record-details]]. All four paths are workspace-relative, so an entry is stable across
machines and readable in a log; a consumer rejoins them with the workspace root it passed in before
touching the filesystem [[d:pack-locations-are-workspace-relative]]. Entries are ordered by
`packageDir`, with a package's behavior pack before its resource pack
[[d:entries-ordered-by-package-path]].

A `Problem` is `{ code, message }` plus the fields its code carries; the codes are enumerated under
Validating below. Any problem makes an entry invalid.

## Candidate packages

Candidates come from the workspace definition rather than from walking the tree
[[r:packages-come-from-the-workspace-definition]]. The kit reads that definition and expands its
patterns itself, instead of calling the managers' published enumeration libraries
[[d:the-kit-resolves-the-workspace-definition-itself]]. Doing the reading itself is what lets a
per-package fault stay with its package and lets a matched directory that is not a package still be
reported, both of which the libraries foreclose: one member `package.json` that is not valid JSON
makes either library throw and return nothing, and a matched directory holding no `package.json` is
skipped silently [[f:a-malformed-member-manifest-fails-the-whole-enumeration]]. What is given up is
a maintained implementation that needs no install and no manager binary
[[f:manager-enumeration-libraries-need-no-install]]; what replaces it is small, because each
definition is an include/exclude list of directory patterns and nothing more.

Resolution runs in this order [[d:pnpm-marker-wins-npm-is-the-fallback]]:

- **pnpm** — the root holds `pnpm-workspace.yaml`. Its `packages` field is the pattern list: a
  direct subdirectory path, a `*` or `**` glob, or a `!`-prefixed pattern excluding directories an
  earlier pattern matched. An omitted `packages` field leaves only the root package, and the root
  package is a member whatever the patterns say [[f:pnpm-workspace-packages-is-an-include-exclude-glob-list]].
- **npm** — anything else. The root `package.json`'s `workspaces` array is the pattern list, each
  entry a direct folder path or a glob resolving to folders
  [[f:npm-workspaces-is-an-array-of-paths-or-globs]]. A root carrying no `workspaces` array is a
  workspace of one, so a single non-monorepo package still resolves its own packs. The root package
  is always a candidate here too.

Patterns are expanded with a glob library (`fast-glob`) against the workspace root, matching
directories only, with `!`-prefixed entries passed as ignore patterns. Any matched path lying under
a `node_modules` segment is dropped [[d:node-modules-directories-are-never-candidates]]. The
surviving directories, plus the root, are the candidate packages.

The kit then reads each candidate's own `package.json` independently, so a fault is that
candidate's alone and the rest of the workspace enumerates normally
[[d:a-package-fault-invalidates-only-its-own-packs]]. A candidate whose `package.json` is missing,
unreadable, or not valid JSON stays a candidate: its packs are still located and reported, invalid,
with `owning-package-unreadable`. When the root's own `package.json` is the one that will not parse
under npm, no patterns can be read from it and the candidate set is the root alone.

Nothing in this path needs `node_modules`, a lockfile, a build, or a running server: the definition
and the checked-out sources are the whole input [[r:packs-enumerable-without-a-build]].

## Finding packs

A candidate package holds a pack when its source carries `behavior_pack/manifest.json` or
`resource_pack/manifest.json`, relative to the package directory. That presence is the whole
membership test — no marker field, keyword, or central list — and it is why adding, removing, or
renaming a pack needs no edit outside the package itself [[r:membership-from-source-manifest-presence]].
The two fixed paths also fall out of the format, where a pack is a directory whose one required
file is `manifest.json` at its root [[f:pack-is-a-directory-with-a-manifest-at-its-root]]. Rules
keyed on package names, dependencies, scripts, or tree position misclassify real workspaces —
against a 41-package monorepo, a dependency on the scripting API also selects a non-pack library, a
build-and-watch script pair selects three unrelated packages, and a `package.json` marker field
selects nothing at all [[f:name-dependency-script-and-location-heuristics-misfire]] — so none of
them is consulted.

Because each of the two paths is fixed, a package structurally cannot hold two packs of the same
kind. A candidate holding neither path yields no entry of any sort
[[d:a-package-with-no-source-manifest-yields-no-entry]].

An entry's `kind` is `behavior` for the first path and `resource` for the second: the directory
name declares the kind, and the manifest corroborates it rather than declaring it
[[r:manifest-corroborates-the-directory-kind]]. That reading is a workspace convention, not a format
rule — a pack's own directory name is free by the format, and a behavior pack deployed into a
directory named `resource_pack_totally` loads normally [[f:pack-directory-name-carries-no-meaning]] —
which is exactly why the manifest has to agree before the pack is called valid.

`sourceDir` is `<packageDir>/<behavior_pack|resource_pack>`. `outputDir` is
`<packageDir>/dist/<behavior_pack|resource_pack>`: built output sits at `dist/` within the package
[[r:built-output-defaults-to-dist]] and the output root mirrors the source layout with one
kind-named subdirectory per pack, a single-pack package included
[[r:built-output-mirrors-the-source-layout]]. `outputDir` is reported whether or not it exists, and
the kit never reads it.

Each located `manifest.json` is read and parsed as JSON. Any failure to open, read, or parse it is
the one problem `manifest-unreadable`, carrying the underlying error message
[[d:unreadable-and-unparseable-manifests-are-one-problem]]; such an entry has no `uuid`, `version`,
or `manifest`, and its remaining details still stand.

A directory the patterns matched that holds no `package.json` but does hold one of the two source
pack paths is reported as an invalid entry too, with `pack-outside-workspace-package`, rather than
vanishing from the list [[d:a-pack-outside-any-workspace-package-is-reported-invalid]]. Its
`packageName` is absent and its `packageDir` is the matched directory.

## Completing the manifest

A source manifest is partial by design, and the kit fills in what the owning package already knows
before reporting it [[r:kit-completes-partial-source-manifests]]. Completion is done on a copy; the
declared `format_version` is left as it stands and no field is translated between format versions
[[r:manifest-format-version-passes-through]]. The manifest's own shape is the format's: the header's
`uuid` identifies the pack, the header's `version` is the pack version, and the `modules` array's
`type` says what the pack holds [[f:manifest-declares-pack-identity-version-and-module-kinds]].

A field counts as **unspecified** when it is absent, or when it holds one of the placeholders: the
empty string, the string `'0.0.0'`, or the array `[0, 0, 0]`. A version is written as a
`[major, minor, revision]` array or as a SemVer string, and both are accepted at every format
version except 3, where it must be the string; a source manifest carrying an array version at
`format_version` 3 is `array-version-at-format-version-3`, placeholder or not. No other format
version restricts the form, and a missing or unrecognised `format_version` restricts nothing
[[d:only-format-version-3-restricts-version-form]]. A `header.name` of `""` reads as unspecified
like a placeholder version does; any other present `header.name` is the specified-field error
[[d:empty-header-name-reads-as-unspecified]].

Three completions run, and each has a matching error when the source specified what it must not:

- **`header.name`** — set to the owning package's `productName` when that is a non-empty string,
  and otherwise to the package's `name` with its npm scope stripped, so `@scope/mc-pack-1` becomes
  `mc-pack-1` [[d:product-name-must-be-a-non-empty-string]]. A specified `header.name` is
  `header-name-specified`.
- **`header.version`** — set to the owning package's `package.json` `version`, written as a SemVer
  string at every format version, so completion never branches on the format version and a
  pre-release completes like any other. What the source held is not consulted. A `package.json`
  `version` that is missing is `package-version-missing`; one that is not a version is
  `package-version-invalid`. A specified `header.version` is `header-version-specified`.
- **workspace dependency versions** — a `dependencies` entry whose `uuid` names a pack in this
  workspace has its `version` set to that pack's owning package's `version`, by the same parse and
  the same two problems as above. A specified version on such an entry is
  `dependency-version-specified`.

A dependency entry carries a `version` alongside either a `uuid`, the exact header uuid of the pack
depended on, or a `module_name` naming a built-in scripting module such as `@minecraft/server`
[[f:pack-dependency-entries-name-a-uuid-or-a-module-name-plus-a-version]]. A `module_name` entry is
external: it passes through untouched, is never completed, and must carry its own version — a
missing one is `external-dependency-version-missing`. Uuids are matched against the whole discovered
set, valid and invalid alike, after lowercasing both sides
[[d:uuids-compare-case-insensitively]]. Only the pack's own source manifest contributes dependency
entries; the owning package's `package.json` `dependencies` are never consulted.

## Validating

Validation runs per pack first, then across the set once every pack's uuid is known.

Per pack, alongside the completion errors above:

- `manifest-missing-uuid` — the manifest declares no `header.uuid`, so the pack has no identity.
- `module-missing-type` — a module in `modules` declares no `type`; every module must.
- `kind-not-corroborated` — no module corroborates the kind the directory declares. A behavior pack
  is corroborated by a `data` or a `script` module, a resource pack by a `resources` module.
- `foreign-kind-module` — the manifest carries a module of the other kind.

Those four types are the whole of what corroboration reads [[r:manifest-corroborates-the-directory-kind]].
Any other module type is ignored — neither corroborating nor a problem — because the set of module
types is not enumerable: Microsoft's reference lists four, its own validator names six and says the
list merely "include"s them, and the reference page's example behavior pack declares a `client_data`
module in neither list [[f:module-type-enumerations-disagree]]. Validating against any published
list would report a problem against Microsoft's own reference pack.

Across the set:

- `duplicate-uuid` — two or more packs claim one header uuid. Every claimant is invalid with no
  preference between them, and the problem carries `uuid` and `claimants`, the workspace-relative
  `sourceDir` of every pack claiming it, so a reader reaches the copies without searching
  [[r:uuids-are-claimed-once-in-a-workspace]]. Module uuids are not checked for uniqueness.
- `dependency-unresolved` — a `dependencies` entry names a `uuid` that no pack in the set claims.
  The entry still passes through uncompleted, and the depending pack is invalid.
- `dependency-invalid` — a `dependencies` entry names a pack in the set that is itself invalid.

The last two are why invalidity propagates along dependency edges, so the pass repeats until no
entry changes status; a `module_name` dependency is never a missing pack
[[r:unresolvable-packs-fail-loudly]]. A cycle among packs that are otherwise sound stays valid,
since nothing invalid seeds it.

## Searching

`search(criteria?)` takes any of four criteria and returns an array, empty when nothing matches
[[r:pack-search]]:

```ts
interface PackCriteria {
  package?: string          // the owning package's name, e.g. '@scope/mc-pack-1'
  name?: string             // the completed manifest's header.name
  uuid?: string             // the header uuid
  status?: 'valid' | 'invalid'
}
```

Every criterion matches exactly — no substring, no case folding — and where more than one is given
an entry must satisfy all of them. Criteria whose value an entry does not carry never match: an
entry with no `packageName` matches no `package`, and one with no manifest matches no `name`. The
one departure a builder will meet is `uuid`, which is compared with both sides lowercased, so a
case-varied spelling of the same uuid still matches [[d:uuids-compare-case-insensitively]]. Criteria
that omit `status` return valid entries only, so the common path cannot reach an unusable pack by
forgetting to exclude it; a call constraining nothing at all returns every valid entry
[[d:an-unconstrained-search-returns-every-valid-entry]].

## Components

```yaml
components:
  - id: workspace-enumerator
    responsibility: resolve the workspace root to candidate packages, each with its package.json read or its read fault
    excludes: locating or reading any pack manifest
  - id: pack-locator
    responsibility: probe each candidate's two fixed source manifest paths and read the manifests found
    excludes: interpreting or completing manifest content
    after: [workspace-enumerator]
  - id: manifest-completion
    responsibility: fill header name, header version, and workspace dependency versions, reporting specified-field and package-version problems
    excludes: cross-pack checks that need the whole set
    after: [pack-locator]
  - id: pack-validation
    responsibility: run the per-pack and set-wide checks and propagate invalidity along dependency edges
    excludes: deciding what an entry exposes to a consumer
    after: [manifest-completion]
  - id: pack-set-api
    responsibility: expose discoverPacks, the entry and problem types, and search over the built set
    excludes: producing or deploying built output
    after: [pack-validation]
```
