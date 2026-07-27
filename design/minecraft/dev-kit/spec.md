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
went wrong. That guarantee starts after enumeration, which each package manager's own library
performs: a member `package.json` that will not parse fails the whole call, and a pack-holding
directory that is no workspace package is never handed to the kit at all.

## What the consumer gets

The kit ships as an ESM TypeScript library named `@twin-digital/mc-dev-kit`
[[r:dev-kit-library-name]], exporting one async entry point. A consumer imports it and receives the
pack set as data; nothing is returned as text to parse [[r:dev-kit-provides-a-library]].

```ts
interface DiscoverOptions {
  workspace: string       // the workspace root; a relative path resolves against process.cwd()
}

interface PackSet {
  readonly packs: readonly PackEntry[]
  search(criteria?: PackCriteria): PackEntry[]
}

declare function discoverPacks(options: DiscoverOptions): Promise<PackSet>
```

`workspace` is required and has no default, so `discoverPacks()` with no argument does not
type-check; a consumer wanting the current directory passes it explicitly. `PackEntry`, `Problem`,
and `PackCriteria` are declared below and exported alongside these three.

`discoverPacks` reads the filesystem once and builds the whole set eagerly; `search` runs over that
in-memory set, and the kit neither caches across calls nor watches for changes — a consumer wanting
fresh data calls `discoverPacks` again [[d:the-pack-set-is-read-once-per-call]]. It rejects only
when the workspace cannot be enumerated at all: the root holds neither a readable
`pnpm-workspace.yaml` nor a readable `package.json`, or the root `package.json` an npm workspace is
read from is not valid JSON, or the enumeration library throws — which it does when any workspace
member's `package.json` is not valid JSON (below). The underlying error reaches the caller
unwrapped, so the rejection carries its message. Every fault the kit meets after enumeration is
carried by an entry instead.

`set.packs` is the single flat list of everything found, so nothing appears in one view and is
missing from another, and every entry is `valid` or `invalid` [[r:pack-discovery]]. The two shapes
share their non-manifest details:

```ts
type PackKind = 'behavior' | 'resource'
type PackEntry = ValidPackEntry | InvalidPackEntry

interface PackEntryBase {
  kind: PackKind          // from the source directory name, corroborated by the manifest
  packageName: string     // the owning package's name, or its directory basename when it has none
  packageDir: string      // workspace-relative, e.g. 'packages/mc-pack-1'
  sourceDir: string       // workspace-relative, e.g. 'packages/mc-pack-1/behavior_pack'
  outputDir: string       // workspace-relative, e.g. 'packages/mc-pack-1/dist/behavior_pack'
}

interface ValidPackEntry extends PackEntryBase {
  status: 'valid'
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
problems that invalidated it plus every detail its sources still hold — always the kind, the owning
package, and the two locations, and the uuid, version, and manifest whenever those survived
[[r:pack-record-details]]. `packageName` is among the details every entry carries, so a pack whose
owning `package.json` declares no string `name` is reported under that package directory's basename
— the workspace root directory's own name where `packageDir` is `.` — and is invalid with
`package-name-missing` below. Every path an entry carries is workspace-relative, so an entry is stable
across machines and readable in a log; a consumer rejoins them with the workspace root it passed in
before touching the filesystem [[d:pack-locations-are-workspace-relative]]. Each is a normalised
POSIX relative path with no `./` prefix and no trailing slash, and the root package's `packageDir` is
the single dot `.` — so the root's behavior pack is `behavior_pack`, not `./behavior_pack`, and the
root sorts ahead of every nested package. Entries are ordered by `packageDir`, with a package's
behavior pack before its resource pack [[d:entries-ordered-by-package-path]].

A `Problem` is a `code`, a human-readable `message`, and the fields that code carries. Any problem
makes an entry invalid. The whole closed set:

```ts
type Problem =
  | { code: 'manifest-unreadable';                message: string; error: string }
  | { code: 'array-version-at-format-version-3';  message: string; field: string }
  | { code: 'header-name-specified';              message: string }
  | { code: 'header-version-specified';           message: string }
  | { code: 'package-name-missing';               message: string }
  | { code: 'package-version-missing';            message: string; field: string; packageDir: string }
  | { code: 'package-version-invalid';            message: string; field: string; packageDir: string; value: string }
  | { code: 'dependency-version-specified';       message: string; field: string; uuid: string }
  | { code: 'external-dependency-version-missing'; message: string; field: string; moduleName: string }
  | { code: 'manifest-missing-uuid';              message: string }
  | { code: 'module-missing-type';                message: string; field: string }
  | { code: 'kind-not-corroborated';              message: string }
  | { code: 'foreign-kind-module';                message: string; field: string; type: string }
  | { code: 'duplicate-uuid';                     message: string; uuid: string; claimants: string[] }
  | { code: 'dependency-unresolved';              message: string; field: string; uuid: string }
  | { code: 'dependency-invalid';                 message: string; field: string; uuid: string }
```

`field` locates the problem in the source manifest as a dotted path with bracketed array indices —
`header.version`, `dependencies[2].version`, `modules[0].type` — so a code that applies to one entry
of an array names which. `packageDir` names the package whose `package.json` is at fault: the entry's
own package when completing `header.version`, and the depended-on pack's package when completing a
`dependencies` entry. `error` carries the underlying read or parse message. `value` is the offending
`package.json` `version` as it was written.

## Candidate packages

Candidates come from the workspace definition rather than from walking the tree
[[r:packages-come-from-the-workspace-definition]], and each manager's own published enumeration
library does the enumerating, called in-process [[r:enumeration-uses-the-managers-own-libraries]].
Both libraries list an uninstalled workspace from its checked-out definition alone, with no
`node_modules`, no lockfile, and no manager binary
[[f:manager-enumeration-libraries-need-no-install]]. Which one runs follows from the root
[[d:pnpm-marker-wins-npm-is-the-fallback]]:

- **pnpm** — the root holds `pnpm-workspace.yaml`. `readWorkspaceManifest(workspaceRoot)` from
  `@pnpm/workspace.read-manifest` reads it, and its `packages` field — the include/exclude list of
  directory patterns [[f:pnpm-workspace-packages-is-an-include-exclude-glob-list]] — is passed
  through unread as the `patterns` option of `findWorkspacePackages(workspaceRoot, { patterns })`
  from `@pnpm/workspace.find-packages`. The projects it returns are the candidates, the root package
  among them; a `pnpm-workspace.yaml` carrying no `packages` field yields the root alone
  [[f:npm-enumeration-returns-no-members-without-a-workspaces-array]].
- **npm** — anything else. The kit parses the root `package.json` and hands it to
  `mapWorkspaces({ cwd: workspaceRoot, pkg })` from `@npmcli/map-workspaces`, whose returned
  name-to-directory map is the members. That map never carries the root package itself, and a root
  declaring no `workspaces` array — or an empty one — comes back empty rather than throwing
  [[f:npm-enumeration-returns-no-members-without-a-workspaces-array]], so the kit adds the root
  package as a candidate of its own and a single non-monorepo package still resolves its own packs.

The candidate set is what the library returned plus, under npm, the root, deduplicated by
workspace-relative path so a directory reached twice yields one candidate and a pack under it is
never reported twice. Pattern dialects, exclusion ordering, and the exclusion of anything under a
`node_modules` path all belong to the libraries: the kit implements none of them and reads no
pattern of its own — under pnpm it does not even inspect the list it forwards.

Every candidate arrives with its `package.json` already parsed, because parsing it is how the
libraries enumerate at all: `findWorkspacePackages` returns each project's manifest with it, and the
kit reads the `package.json` in each directory `mapWorkspaces` names. The owning package's `name`,
`productName`, and `version` come from there, and completion below always has them to read.

Two consequences of delegating reach a builder directly. First, a member `package.json` that is not
valid JSON makes both libraries throw and return nothing at all — `@npmcli/map-workspaces` a
`JSONParseError` with code `EJSONPARSE`, `@pnpm/workspace.find-packages` a `JSONError` with code
`ERR_PNPM_JSON_PARSE` naming the offending file
[[f:a-malformed-member-manifest-fails-the-whole-enumeration]]. One unparseable `package.json`,
possibly in a package holding no pack at all, therefore fails the whole `discoverPacks` call, which
rejects with that error; the caller gets no pack set rather than a set with one entry marked. There
is no narrower report available, because the libraries hand back no members alongside the throw.
Second, a directory a workspace pattern matches that holds no `package.json` is skipped by both
libraries, which return the other members normally [[f:a-malformed-member-manifest-fails-the-whole-enumeration]].
Such a directory never reaches the kit, so a `behavior_pack/manifest.json` sitting inside one
appears nowhere in the pack set and raises no problem — the one silence in the set's exhaustiveness:
what the kit finds it reports, and a pack outside every workspace package is not found.

Nothing in this path needs `node_modules`, a lockfile, a build, or a running server: the definition
and the checked-out sources are the whole input [[r:packs-enumerable-without-a-build]].

## Finding packs

A candidate package holds a pack when its source carries `behavior_pack/manifest.json` or
`resource_pack/manifest.json`, relative to the package directory. That presence is the whole
membership test — no marker field, keyword, or central list — and it is why adding, removing, or
renaming a pack needs no edit outside the package itself [[r:membership-from-source-manifest-presence]].
Only the tail of each path comes from the format, which fixes a pack as a directory whose one
required file is `manifest.json`, sitting at that directory's root
[[f:pack-is-a-directory-with-a-manifest-at-its-root]]; the two directory names in front of it are
this workspace's convention and nothing the format imposes (below). Rules keyed on package names,
dependencies, scripts, or tree position misclassify real workspaces — against a 41-package
monorepo, a dependency on the scripting API also selects a non-pack library, a
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
[[d:only-format-version-3-restricts-version-form]]. The check reads exactly the two version fields
completion touches — `header.version` and each `dependencies[].version` — and never a
`modules[].version`, which the kit neither completes nor validates. A `header.name` of `""` reads
as unspecified like a placeholder version does; any other present `header.name` is the
specified-field error [[d:empty-header-name-reads-as-unspecified]].

Three completions run, and each has a matching error when the source specified what it must not:

- **`header.name`** — set to the owning package's `productName` when that is a non-empty string,
  and otherwise to the package's `name` with its npm scope stripped, so `@scope/mc-pack-1` becomes
  `mc-pack-1` [[d:product-name-must-be-a-non-empty-string]]. A `package.json` that declares no
  string `name` — the ordinary shape of a private root package, and the root is always a candidate —
  is `package-name-missing` whether or not a `productName` stands in for it in the manifest: the
  owning package is a detail every valid entry carries, so an entry that cannot name it is invalid
  even where its `header.name` completed cleanly [[r:pack-record-details]]. Its `packageName` is the
  package directory's basename, and completion falls back to that same basename where it would
  otherwise use the scope-stripped `name`. A specified `header.name` is `header-name-specified`.
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
entry with no manifest matches no `name`, and one with no header uuid matches no `uuid`. The
one departure a builder will meet is `uuid`, which is compared with both sides lowercased, so a
case-varied spelling of the same uuid still matches [[d:uuids-compare-case-insensitively]]. Criteria
that omit `status` return valid entries only, so the common path cannot reach an unusable pack by
forgetting to exclude it; a call constraining nothing at all returns every valid entry
[[d:an-unconstrained-search-returns-every-valid-entry]].

## Components

```yaml
components:
  - id: workspace-enumerator
    responsibility: pick the manager for the workspace root, call that manager's enumeration library, and add the root under npm, yielding candidate packages each with its package.json fields
    excludes: locating or reading any pack manifest
  - id: pack-locator
    responsibility: probe each candidate's two fixed source manifest paths, read the manifests found, and build each entry's kind and its source and output locations
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
    responsibility: expose discoverPacks and its options, the entry and problem types, the pack list in its defined order, and search over the built set
    excludes: producing or deploying built output
    after: [pack-validation]
```
