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

The kit ships as a TypeScript library named `@twin-digital/mc-dev-kit` [[r:dev-kit-library-name]],
exporting one async entry point; its module format follows the conventions of the monorepo the
build occurs in. A consumer imports it and receives the pack set as data; nothing is returned as
text to parse [[r:dev-kit-provides-a-library]].

```ts
interface DiscoverOptions {
  workspace?: string      // the workspace root; defaults to process.cwd()
  filter?: PackCriteria   // when given, only the entries matching it are returned
}

declare function discoverPacks(options?: DiscoverOptions): Promise<readonly PackEntry[]>
```

One call carries both jobs: `discoverPacks` hands back the entry array itself, and the criteria that
select among the packs are the `filter` field of its options
[[d:filtering-is-a-parameter-of-the-discovery-call]].

`workspace` defaults to `process.cwd()`, so a bare `discoverPacks()` discovers the packs of the
workspace the process is running in, and a relative `workspace` resolves against that same
directory. `filter` is described under Filtering below. `PackEntry`, `Problem`, `PackCriteria`, and
`PackManifest` with the header, module, and dependency shapes it uses are declared below and
exported alongside the options type and the function.

`discoverPacks` reads the filesystem once per call and builds the whole set eagerly; a `filter` is
applied to that in-memory set once it is built, and the kit neither caches across calls nor watches
for changes — a consumer wanting fresh data, or a second filtering, calls `discoverPacks` again
[[d:the-pack-set-is-read-once-per-call]]. It rejects only when the workspace cannot be enumerated at
all: the root holds neither a readable `pnpm-workspace.yaml` nor a readable `package.json`, or the
root `package.json` an npm workspace is read from is not valid JSON, or the enumeration library
throws — which it does when any workspace member's `package.json` is not valid JSON (below). The
underlying error reaches the caller
unwrapped, so the rejection carries its message. Every fault the kit meets after enumeration is
carried by an entry instead [[d:enumeration-failure-rejects-the-call]].

The returned array is the single flat list of everything found, so nothing appears in one view and
is missing from another, and every entry is `valid` or `invalid` [[r:pack-discovery]]; a call
passing no `filter` returns the whole of it. The two shapes share their non-manifest details:

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
  manifest: PackManifest  // the completed manifest, in the format version it declared
  problems: []
}

interface InvalidPackEntry extends PackEntryBase {
  status: 'invalid'
  uuid?: string
  version?: string
  manifest?: unknown      // whatever the source manifest parsed to, completed as far as it could be
  problems: [Problem, ...Problem[]]
}
```

`PackManifest` is the *completed* manifest a valid entry carries, so it states what such an entry
guarantees rather than what a source file may hold: a field validation demands or completion always
writes is required, and only a field a valid pack may genuinely lack is optional. It declares every
manifest field this design names — the ones the kit reads and completes, and the ones it only
mentions — and each interface carries an index signature so keys it does not model survive to the
consumer unchanged. Every field it declares is checked to the form it declares before an entry is
called valid, so no source value reaches a consumer under a type it does not have
[[r:manifest-fields-are-validated-by-form]]; the checks themselves are under Finding packs below.

```ts
type ManifestVersion = string | [number, number, number]

interface PackManifest {
  format_version?: number | string
  header: ManifestHeader
  modules: [ManifestModule, ...ManifestModule[]]
  dependencies?: ManifestDependency[]
  [key: string]: unknown
}

interface ManifestHeader {
  name: string
  uuid: string
  version: string
  [key: string]: unknown
}

interface ManifestModule {
  type: string
  uuid?: string
  version?: ManifestVersion
  [key: string]: unknown
}

type ManifestDependency = ManifestPackDependency | ManifestModuleDependency

interface ManifestPackDependency {
  uuid: string
  version: ManifestVersion
  [key: string]: unknown
}

interface ManifestModuleDependency {
  module_name: string
  version: ManifestVersion
  [key: string]: unknown
}
```

Each required field is one the rules below leave a valid entry unable to lack, and each declared form
is one they leave it unable to contradict. `header` and its `uuid` are required because a manifest
declaring no `header.uuid` is `manifest-missing-uuid`, and each holds its declared form because a
`header` that is not an object, or a `header.uuid` that is not a string, is `manifest-shape-invalid`.
`header.name` is required and a string because completion always writes
one and a source that wrote a non-string is `manifest-shape-invalid`. `header.version` is required
and a `string` rather than a `ManifestVersion` because completion writes a SemVer string at every
format version: the form check accepts an array there as elsewhere, but an array that is not the
`[0, 0, 0]` placeholder is `header-version-specified` and a placeholder is completed away, so a valid
entry's `header.version` is always the string completion wrote. `modules` is required and non-empty,
and every module carries a string `type`, because a valid pack has a module corroborating its kind —
which no manifest without a module can — and a module with no `type` is `module-missing-type` while
one whose `type` is not a string is `manifest-shape-invalid`. A dependency entry carries exactly one
of `uuid` or `module_name`, since one carrying both or neither is `dependency-entry-malformed`, and
always a `version`: completion writes it where the `uuid` names a pack in the workspace, and an entry
the workspace does not complete that carries none is `dependency-unsatisfied` or
`external-dependency-version-missing`. Those three fields hold the forms declared for them because a
dependency field of any other form is `manifest-shape-invalid`.

The rest stay optional. `format_version` may be absent, because a missing or unrecognised one
restricts nothing and passes through — though a present one is a number or a string, since anything
else is `manifest-shape-invalid`; `dependencies` may be absent, because a pack depending on nothing
is ordinary; and a module's `uuid` and `version` may be absent, because no rule here leaves a valid
entry unable to lack either. Both are declared and both are form-checked all the same: a module's
`uuid` reaches the consumer as the string it is and its `version` as the `ManifestVersion` it is, and
a source that wrote anything else is `manifest-shape-invalid`
[[r:manifest-fields-are-validated-by-form]]. That the kit reads neither — it completes no module
field and does not check module uuids for uniqueness
[[r:uuids-are-claimed-once-in-a-workspace]] — bears on what a fault there suppresses (below), not on
whether the field is typed.

Only a valid entry's `manifest` is a `PackManifest`. An invalid entry's is typed `unknown`, because a
file that parsed to something other than a JSON object — or whose `header`, `modules`, or
`dependencies` is not the container the format documents, or whose `header.uuid` is a number — is
still reported as it parsed (below), and a consumer narrows it before reading. That split is what
makes the valid entry's type sound: every fault above invalidates the entry it was found in, so a
value contradicting `PackManifest` is never reported under it.

A valid entry carries every detail with nothing absent or in doubt. An invalid one carries the
problems that invalidated it plus every detail its sources still hold — always the kind, the owning
package, and the two locations, and the uuid, version, and manifest whenever those survived
[[r:pack-record-details]]. Only those three are ever absent: `uuid`, `version`, and `manifest` are
the manifest-derived details a fault can take away, and the other five are on every entry of either
shape [[d:invalid-entries-omit-only-manifest-derived-details]]. `version` carries the completed
`header.version` — the owning package's `package.json` version as a SemVer string — rather than a
version of its own [[d:entry-version-is-the-completed-package-version]]. `packageName` is among the
details every entry carries, so a pack whose owning `package.json` declares no string `name` is
reported under that package directory's basename — the workspace root directory's own name where
`packageDir` is `.` — and is invalid with `package-name-missing` below
[[d:a-nameless-package-is-named-by-its-directory]]. Every path an entry carries is
workspace-relative, so an entry is stable across machines and readable in a log; a consumer rejoins
them with the workspace root it passed in before touching the filesystem
[[d:pack-locations-are-workspace-relative]]. Each is a normalised POSIX relative path with no `./`
prefix and no trailing slash, and the root package's `packageDir` is the single dot `.` — so the
root's behavior pack is `behavior_pack`, not `./behavior_pack`, and the root sorts ahead of every
nested package [[d:relative-paths-are-posix-with-the-root-as-a-dot]]. Entries are ordered by
`packageDir`, with a package's behavior pack before its resource pack
[[d:entries-ordered-by-package-path]].

A `Problem` is a `code`, a human-readable `message`, and the fields that code carries. Any problem
makes an entry invalid. The set below is the whole of it and is closed: every fault the kit reports
carries one of these codes, so a consumer's switch over them is exhaustive, and a fault class the
kit later learns to report arrives as a new code in a new version
[[d:the-problem-code-set-is-closed]].

```ts
type Problem =
  | { code: 'manifest-unreadable';                message: string; error: string }
  | { code: 'manifest-shape-invalid';             message: string; field: string }
  | { code: 'array-version-at-format-version-3';  message: string; field: string }
  | { code: 'header-name-specified';              message: string }
  | { code: 'header-version-specified';           message: string }
  | { code: 'package-name-missing';               message: string }
  | { code: 'package-version-missing';            message: string; field: string; packageDir: string }
  | { code: 'package-version-invalid';            message: string; field: string; packageDir: string; value: string }
  | { code: 'dependency-version-specified';       message: string; field: string; uuid: string }
  | { code: 'dependency-entry-malformed';         message: string; field: string }
  | { code: 'external-dependency-version-missing'; message: string; field: string; moduleName: string }
  | { code: 'dependency-unsatisfied';              message: string; field: string; uuid: string }
  | { code: 'manifest-missing-uuid';              message: string }
  | { code: 'module-missing-type';                message: string; field: string }
  | { code: 'kind-not-corroborated';              message: string }
  | { code: 'foreign-kind-module';                message: string; field: string; type: string }
  | { code: 'duplicate-uuid';                     message: string; uuid: string; claimants: string[] }
  | { code: 'dependency-invalid';                 message: string; field: string; uuid: string }
```

`field` locates the problem in the source manifest as a dotted path with bracketed array indices —
`header.version`, `dependencies[2].version`, `modules[0].type` — so a code that applies to one entry
of an array names which; the manifest root itself is the empty string. `packageDir` names the
package whose `package.json` is at fault: the entry's own package when completing `header.version`,
and the depended-on pack's package when completing a `dependencies` entry. `error` carries the
underlying read or parse message. `value` is the offending `package.json` `version` as it was
written. `moduleName` on `external-dependency-version-missing` carries the dependency entry's
`module_name` as the source wrote it, and `uuid` on `dependency-unsatisfied` its `uuid`, likewise
as written.

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
  among them; a `pnpm-workspace.yaml` carrying no `packages` field forwards no patterns, which
  leaves the library on its own defaults and yields the root plus every nested package in the tree
  outside `node_modules`
  [[f:enumeration-sweeps-the-tree-outside-node-modules-under-pnpm-and-returns-nothing-under-npm]].
  Forwarding unread is what the kit does here too: it passes the absent field on rather than
  substituting a pattern of its own, so the sweep is the library's answer to a workspace defined
  that loosely.
- **npm** — anything else. The kit parses the root `package.json` and hands it to
  `mapWorkspaces({ cwd: workspaceRoot, pkg })` from `@npmcli/map-workspaces`, whose returned
  name-to-directory map is the members. That map never carries the root package itself, and a root
  declaring no `workspaces` array — or an empty one — comes back empty rather than throwing, even
  where the tree holds a package a conventional pattern would match
  [[f:enumeration-sweeps-the-tree-outside-node-modules-under-pnpm-and-returns-nothing-under-npm]], so
  the kit adds the root package as a candidate of its own [[r:the-root-package-is-a-candidate]] and a single non-monorepo
  package still resolves its own packs.

The candidate set is what the library returned plus, under npm, the root, deduplicated by
workspace-relative path so a directory reached twice yields one candidate and a pack under it is
never reported twice. Pattern dialects, exclusion ordering, and the exclusion of anything under a
`node_modules` path all belong to the libraries: the kit implements none of them and reads no
pattern of its own — under pnpm it does not even inspect the list it forwards. The `node_modules`
exclusion holds on every path enumeration takes: neither library returns a package under such a
path, whether it is handed a pattern broad enough to reach one, pnpm's own defaults where no
`packages` field forwards a pattern at all, or npm's
[[f:enumeration-sweeps-the-tree-outside-node-modules-under-pnpm-and-returns-nothing-under-npm]]. So
an installed workspace yields the same candidate set as the uninstalled one, and an installed
dependency's own `package.json` cannot trigger the whole-call rejection below.

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
[[r:built-output-mirrors-the-source-layout]]. Both are computed from the package directory and the
kind: `outputDir` is reported whether or not it exists, and the kit never reads the output tree
[[d:output-locations-are-computed-not-probed]].

Each located `manifest.json` is read and parsed as JSON. Any failure to open, read, or parse it is
the one problem `manifest-unreadable`, carrying the underlying error message
[[d:unreadable-and-unparseable-manifests-are-one-problem]]; such an entry has no `uuid`, `version`,
or `manifest`, and its remaining details still stand.

A manifest that parses may still not have the format's shape. Two passes check it, and both report
the one problem `manifest-shape-invalid`: the code says a value is not the shape the format
documents, whether that value is a container or a scalar, and its free-form `field` already locates
either. A separate code for scalars would tell a consumer nothing `field` does not — every consumer
does the same thing with both, which is report the path and stop — and would spend an entry in a set
that grows only with a new version [[d:the-problem-code-set-is-closed]]
[[d:field-type-faults-reuse-the-shape-code]]. The manifest is still reported as it parsed, and the
entry's remaining details still stand.

The container pass: the parsed value must be a JSON object; `header`, where present, must be an
object; and `modules` and `dependencies`, where present, must be arrays whose elements are objects.
Anything else is `manifest-shape-invalid`, its `field` naming the offending value — `header`,
`modules`, `dependencies[1]`, or the empty string for the manifest root — and the checks and
completions that read that part are skipped, so one misshapen container does not cascade into derived
problems [[d:manifest-shape-faults-are-one-problem]].

The form pass then checks every remaining field `PackManifest` declares, inside the containers that
survived, against the form declared for it [[r:manifest-fields-are-validated-by-form]]. The table is
the whole of the declared surface the container pass did not already cover, so no field of the type
goes unchecked and a field the type gains gains a row with it:

| field | accepted form |
|---|---|
| `format_version` | a number or a string |
| `header.name` | a string |
| `header.uuid` | a string |
| `header.version` | a string, or an array of three numbers |
| `modules[].type` | a string |
| `modules[].uuid` | a string |
| `modules[].version` | a string, or an array of three numbers |
| `dependencies[].uuid` | a string |
| `dependencies[].module_name` | a string |
| `dependencies[].version` | a string, or an array of three numbers |

Each row tests form and never value [[r:manifest-fields-are-validated-by-form]]. A uuid is any
string, not the 8-4-4-4-12 spelling. A version is a string or a three-number array, and whether that
string parses as SemVer, or names a version that exists, is not asked. A `format_version` is any
number or string, and the kit holds no list of the format versions that exist — the declared one
passes through whatever it is [[r:manifest-format-version-passes-through]]. Checking a value against
a list the format can extend would report problems against packs Minecraft loads happily, which is
why module types are not enumerated either [[f:module-type-enumerations-disagree]]
[[r:manifest-corroborates-the-directory-kind]].

Absence is not a form fault: a field the source omits is the business of the completion and
validation rules below, which is why a manifest with no `header.uuid` is `manifest-missing-uuid` and
a module with no `type` is `module-missing-type`.

One fault yields one problem, so a form fault suppresses every check and completion that reads the
field, exactly as a misshapen container suppresses the checks that read it
[[d:a-form-fault-suppresses-the-checks-that-read-it]]:

| a form fault at | suppresses |
|---|---|
| `format_version` | `array-version-at-format-version-3` — a format version the kit cannot read restricts nothing, as a missing one does |
| `header.name` | `header-name-specified`, and the name completion |
| `header.uuid` | `manifest-missing-uuid`; the pack claims no uuid, so it joins no `duplicate-uuid` and satisfies no dependency |
| `header.version` | `header-version-specified`, and the version completion |
| `modules[].type` | `module-missing-type` for that module, and `kind-not-corroborated` and `foreign-kind-module` for the manifest, since the kit cannot know what that module would have corroborated |
| `modules[].uuid` | nothing downstream — no check or completion reads a module's uuid, uniqueness included |
| `modules[].version` | nothing downstream — no check or completion reads a module's version, `array-version-at-format-version-3` included |
| `dependencies[].uuid` | every later check on that entry: it matches no pack, is never completed, and raises no `dependency-version-specified`, `dependency-unsatisfied`, or `dependency-invalid` |
| `dependencies[].module_name` | `external-dependency-version-missing` for that entry |
| `dependencies[].version` | `dependency-version-specified`, `external-dependency-version-missing`, and `dependency-unsatisfied` for that entry, and the version completion |

Two rows suppress nothing, and that is the honest entry rather than an omission: the kit reads
neither a module's `uuid` nor its `version`, so a fault there costs the entry its validity — every
problem does — and nothing further follows from it.

The dependency discriminator is read before any of that: an entry carrying both `uuid` and
`module_name`, or neither, is `dependency-entry-malformed` and none of its fields is form-checked,
because which fields the entry should carry is what the discriminator settles
[[d:an-ambiguous-dependency-entry-is-a-problem]].

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
completion touches — `header.version` and each `dependencies[].version` — and never a module's
`version`, which the form pass checks and no completion writes. A
`header.name` of `""` reads as unspecified like a placeholder version does; any other present
`header.name` is the specified-field error [[d:empty-header-name-reads-as-unspecified]].

Specified and unspecified are readings of a well-formed field. A field the form pass faulted is
neither: its completion and its specified-field error are both skipped, and the form fault is the
whole of what that field reports [[d:a-form-fault-suppresses-the-checks-that-read-it]].

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
- **workspace dependency versions** — a `dependencies` entry whose `uuid` matches a pack in the
  discovered set has its `version` set to that pack's owning package's `version`, by the same parse
  and the same two problems as above. A specified version on such an entry is
  `dependency-version-specified`.

A dependency entry carries a `version` alongside either a `uuid`, the exact header uuid of the pack
depended on, or a `module_name` naming a built-in scripting module such as `@minecraft/server`
[[f:pack-dependency-entries-name-a-uuid-or-a-module-name-plus-a-version]]. An entry carrying both,
or neither, is `dependency-entry-malformed`, its `field` naming the entry — `dependencies[1]` — and
the kit neither completes nor resolves it rather than picking one of the two fields to believe
[[d:an-ambiguous-dependency-entry-is-a-problem]]. Uuids are matched against the whole discovered
set, valid and invalid alike, after lowercasing both sides [[r:uuids-compare-case-insensitively]].

Every entry the match does not claim passes through untouched, is never completed, and must carry
its own version [[r:kit-completes-partial-source-manifests]]. Which problem a missing version raises
turns on what the entry names. A `module_name` entry names a built-in scripting module, so it is an
external dependency whatever the set holds, and a missing version is
`external-dependency-version-missing`, its `moduleName` carrying the name as the source wrote it. A
`uuid` entry matching no pack and carrying no version is `dependency-unsatisfied`, because the kit
cannot tell which of two things went wrong, and the message says both: it "names no pack in the
workspace and carries no version — either the uuid is wrong, or an external dependency is missing
its version" [[d:an-unsatisfied-dependency-names-both-readings]]. That entry invalidates the pack
carrying it [[r:unresolvable-packs-fail-loudly]]. An unmatched `uuid` entry that does carry its own
version is an ordinary external dependency and not a fault — the pack it names may be built
elsewhere — so it invalidates nothing. Only the pack's own source manifest contributes dependency
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
types is not enumerable — the same reason no row of the form pass tests a value
[[r:manifest-fields-are-validated-by-form]]: Microsoft's reference lists four, its own validator names six and says the
list merely "include"s them, and the reference page's example behavior pack declares a `client_data`
module in neither list [[f:module-type-enumerations-disagree]]. Validating against any published
list would report a problem against Microsoft's own reference pack.

Across the set:

- `duplicate-uuid` — two or more packs claim one header uuid. Every claimant is invalid with no
  preference between them, and the problem carries `uuid` and `claimants`, the workspace-relative
  `sourceDir` of every pack claiming it, so a reader reaches the copies without searching
  [[r:uuids-are-claimed-once-in-a-workspace]]. Module uuids are not checked for uniqueness.
- `dependency-invalid` — a `dependencies` entry names a pack in the set that is itself invalid.

That last is why invalidity propagates along dependency edges [[r:unresolvable-packs-fail-loudly]],
and the set-wide pass repeats until no entry changes status, so invalidity is transitive; a cycle
among packs that are otherwise sound stays valid, since nothing invalid seeds it
[[d:invalidity-propagates-to-a-fixpoint]]. A dependency naming a built-in scripting module is never
a missing pack, and neither is a uuid the set does not claim that carries its own version: both are
external [[r:kit-completes-partial-source-manifests]]. One carrying no version is the
`dependency-unsatisfied` above.

## Filtering

`DiscoverOptions.filter` takes any of four criteria and narrows the array `discoverPacks` returns,
which is empty when nothing matches [[r:pack-search]]:

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
case-varied spelling of the same uuid still matches [[r:uuids-compare-case-insensitively]]. No filter
is applied by default: a `filter` that omits `status` matches valid and invalid entries alike, and a
call passing no `filter`, or an empty one, returns every entry in the set [[r:pack-search]].

The filter runs over the built set rather than narrowing the work that builds it. Validation is
set-wide — duplicate uuids and the propagation of invalidity along dependency edges are decided
across every pack found — so no criterion can be read before the whole set exists, and a filtered
call costs a workspace read exactly as an unfiltered one does
[[d:filtering-is-a-parameter-of-the-discovery-call]]. Filtering one workspace twice is therefore two
reads, which is the price the once-per-call reading already carries and the condition its falsifier
names [[d:the-pack-set-is-read-once-per-call]].

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
    responsibility: run once over all located entries — index every pack's header uuid first, then fill header name, header version, and workspace dependency versions, reporting specified-field and package-version problems
    excludes: the cross-pack checks that decide an entry's status
    after: [pack-locator]
  - id: pack-validation
    responsibility: run the per-pack and set-wide checks and propagate invalidity along dependency edges
    excludes: deciding what an entry exposes to a consumer
    after: [manifest-completion]
  - id: pack-set-api
    responsibility: expose discoverPacks and its options, the entry, problem, and manifest types, and the pack list in its defined order, narrowed by the filter option when one is given
    excludes: producing or deploying built output
    after: [pack-validation]
```
