# Minecraft Dev Kit

## Summary

The dev kit is the library that answers, for a workspace of Minecraft Bedrock packages, which packs
exist here and what each one is. It produces `@twin-digital/mc-dev-kit`: a typed npm package whose
discovery pass returns a normalised pack set — one record per pack, carrying identity, kind, source
and expected output locations, and a manifest completed with what the owning package already knows —
together with a structured list of every problem it found. The problem it answers is that a Bedrock
source manifest is deliberately partial and a workspace's packs are scattered across its packages,
so every tool downstream of them otherwise re-implements the same fragile guesswork about what is a
pack and what a pack's manifest really says. The constraint that shapes the whole design is that
this answer must come from committed source alone: a clean checkout with nothing built and no server
running has to produce the same pack set as a fully built one, which puts every build output and
every running server outside what the kit may read.

## Open questions

```yaml
questions:
  - id: manifest-format-version-3-versions
    question: must the kit accept and emit SemVer string versions, which manifest format version 3 requires in place of the array form?
    closes: requirement
    gates: [completion-writes-array-versions]
  - id: documented-module-types-outside-the-three
    question: the format documents module types beyond data, script, and resources — world_template, and the client_data that Microsoft's own reference behavior-pack manifest declares — which r:kind-derived-from-module-types makes a problem; should such a type be tolerated, ignored for kind derivation, or stay a problem?
    closes: requirement
    gates: [manifest-kind-is-reported-on-disagreement]
  - id: manifest-object-for-an-unparseable-pack
    question: r:pack-record-details gives every discovered pack its manifest in object form while r:unresolvable-packs-fail-loudly keeps a pack whose manifest cannot be parsed in the set — may the record's manifest field be absent, or does an unparseable pack owe an object anyway?
    closes: requirement
    gates: [records-carry-the-completed-manifest-only]
  - id: source-manifest-carrying-a-completed-field
    question: r:kit-completes-partial-source-manifests says a source manifest MUST NOT carry header.name or header.version — when one does, is the field overwritten, reported as a problem, or passed through?
    closes: requirement
    gates: [unknown-manifest-fields-pass-through]
  - id: pack-record-details-embeds-an-entry-id
    question: should r:pack-record-details state completion inline rather than embedding a bare entry id in its statement, so a downstream design can quote the bullet verbatim instead of truncating it?
    closes: requirement
```

## The pack set

Discovery returns one record per pack in a flat list [[r:pack-discovery]], carrying the five details
every consumer needs of a pack [[r:pack-record-details]]. Flatness costs no addressability: a
package's source can hold at most one pack of each kind, so the pair of package name and kind is
already unique across the set [[r:membership-from-source-manifest-presence]].

The record is the interface four components compile against, so its shape is pinned here. `kind` is
`'behavior'` or `'resource'`; the on-disk spellings `behavior_pack` and `resource_pack` are a mapping
applied when a path is built, never the field's own value. Both the source path and the expected
output path are workspace-relative and POSIX-separated, so a record can be logged, serialised, and
compared without carrying the machine it was produced on. Whether the manifest field may be absent is
an open question above.

A record's kind comes off the manifest's module types [[r:kind-derived-from-module-types]], because
the manifest is where a pack states both that it is a pack and which kind
[[f:manifest-declares-pack-identity-version-and-module-kinds]] while the directory holding it states
nothing the server reads [[f:pack-directory-name-carries-no-meaning]]. The kind-named directory a
pack was found under is therefore a membership signal and never a second opinion
[[r:pack-identity-and-kind-declared-only-by-the-manifest]] [[d:manifest-kind-is-reported-on-disagreement]].

The manifest a record carries is the completed one; a consumer that needs the bytes as committed
reads them from the source path the record already gives it
[[d:records-carry-the-completed-manifest-only]].

## Finding the packs

Candidates are enumerated from the workspace's own package-manager definition rather than by walking
the tree [[r:packages-come-from-the-workspace-definition]]: a `pnpm-workspace.yaml` is that
definition when it exists, otherwise the root `package.json`'s `workspaces` field, and nothing else —
no lockfile sniffing, no fallback scan [[d:pnpm-definition-wins-when-both-present]]. What is read out
of either is a list of directory patterns resolved against the workspace root, each a direct path or
a glob. In `pnpm-workspace.yaml` that list is the `packages` sequence, whose entries may be negated
with a leading `!` to drop directories an earlier pattern matched, and whose absence leaves the root
package alone [[f:pnpm-workspace-packages-is-an-include-exclude-glob-list]]. In `package.json` it is
the `workspaces` array, which has no negation form
[[f:npm-workspaces-is-an-array-of-paths-or-globs]]; the field is read only in that array form, and an
object wrapping a `packages` list is not a definition the kit accepts.

A candidate becomes a pack-bearing package by holding `behavior_pack/manifest.json` or
`resource_pack/manifest.json` in its source [[r:membership-from-source-manifest-presence]], which is
the format's own test for a pack applied at a fixed location
[[f:pack-is-a-directory-with-a-manifest-at-its-root]]. The alternative signals — a marker field, a
keyword, a dependency on the scripting API, the presence of build scripts, a package's name or its
position in the tree — were scored against a real workspace and each either missed real packs or
selected packages that are not packs, so none of them is used even as a hint
[[f:name-dependency-script-and-location-heuristics-misfire]].

Everything read in this pass is committed source, which is what lets a clean checkout answer as
completely as a built one [[r:packs-enumerable-without-a-build]]. The pass is also indivisible: the
kit resolves a whole workspace at once and offers no per-pack entry point
[[d:workspace-is-the-unit-of-resolution]], because completing a dependency and checking identity
uniqueness both need the index of every header uuid in the set, which only a full pass can build.

## Completing the manifest

A source manifest omits its header name and version, and may omit the version of a dependency, and
the kit fills all three from the owning package's `package.json` before reporting the manifest
[[r:kit-completes-partial-source-manifests]]. A dependency left unversioned is resolvable because the
entry still names the depended-on pack's exact header uuid: the uuid selects a pack in the set, and
that pack's owning package supplies the version
[[f:pack-dependencies-name-an-exact-uuid-and-version]]. Completion acts only where that uuid selects
exactly one pack; every other case — a uuid matching none, a uuid matching two, an entry naming a
built-in scripting module instead of a uuid, an entry naming neither — is left as committed and
judged once, by validation, so no dependency is ever reported by both sides
[[d:dependency-resolution-judged-only-by-the-validator]].

Versions are written in the manifest's three-element array form, so a package version that is not
three dotted segments — a prerelease or build-metadata suffix included — is reported as a problem
rather than truncated to fit [[d:completion-writes-array-versions]]. Completion writes only these
fields; every other key in the manifest is carried through exactly as committed and is not read
[[d:unknown-manifest-fields-pass-through]].

## Where built output is expected

Output locations are computed, never probed — the kit reports where a pack's build output belongs
whether or not it exists, which is what keeps the answer the same on a clean checkout as on a built
one [[r:packs-enumerable-without-a-build]]. The package's output root is `dist/`
[[r:built-output-defaults-to-dist]], which a package overrides with an `mcDevKit.outDir` field in its
own `package.json` resolved relative to the package root, keeping the override in the same file the
rest of the package's identity comes from [[d:output-root-override-in-package-json]]; an override
that is not a string, or that resolves outside the package, is a problem and the default stands.
Within that root the pack sits in a kind-named subdirectory mirroring its source layout, so the path
is a pure function of the package root, the override, and the kind
[[r:built-output-mirrors-the-source-layout]]. That kind is the source directory's, not the manifest's:
mirroring means the output sits where the source sat, so a pack whose manifest disagrees with the
directory it lives in still builds into the directory it came from
[[d:output-path-follows-the-source-directory]].

## Problems

A problem is data a caller branches on, not a message [[r:structured-validation]]
[[d:problems-are-coded-records]]; of its four fields the owning package is the one that may be
absent, since a candidate whose own `package.json` will not parse has no name to give. A pack the kit
cannot fully resolve stays in the set with its problems attached rather than vanishing
[[r:unresolvable-packs-fail-loudly]].

The union is closed, so it is enumerated here in full — every code, and the component that raises it:

| code | raised when | raised by |
|---|---|---|
| `package-json-unreadable` | a candidate package's `package.json` is absent or does not parse | `workspace-enumerator` |
| `out-dir-invalid` | `mcDevKit.outDir` is not a string, or resolves outside the package | `pack-locator` |
| `manifest-unparseable` | a pack's `manifest.json` is not valid JSON | `manifest-reader` |
| `manifest-shape-invalid` | the parsed manifest misses the shape floor below | `manifest-reader` |
| `module-type-unrecognised` | a module declares a `type` outside `data`, `script`, and `resources` | `kind-deriver` |
| `module-types-span-two-kinds` | a pack's module types map to both behavior and resource | `kind-deriver` |
| `header-uuid-missing` | the manifest's header carries no uuid | `pack-validator` |
| `header-uuid-duplicated` | two or more packs in the set declare the same header uuid | `pack-validator` |
| `kind-disagrees-with-directory` | the manifest-derived kind is not the one the source directory names | `pack-validator` |
| `dependency-entry-unidentified` | a `dependencies` entry names neither a `uuid` nor a `module_name` | `pack-validator` |
| `dependency-unsatisfied` | a dependency's uuid matches no pack in the set | `pack-validator` |
| `dependency-ambiguous` | a dependency's uuid matches more than one pack in the set | `pack-validator` |
| `version-not-three-segments` | a version completion must write is not three dotted segments | `manifest-completer` |

The shape floor `manifest-reader` enforces is the minimum every later component reads: a `header`
object and a `modules` array whose entries are objects each carrying a `type`. A manifest missing
either is `manifest-shape-invalid`; anything beyond them is carried through unread
[[d:unknown-manifest-fields-pass-through]].

A dependency entry naming a built-in scripting module by `module_name` resolves to no pack and is not
a problem under any row above [[f:pack-dependencies-name-an-exact-uuid-and-version]]
[[r:unresolvable-packs-fail-loudly]]. A duplicated uuid is raised against every pack holding it,
because picking one would hand a consumer a pack whose identity is not actually unique
[[d:duplicate-uuid-flags-every-holder]].

Because problems ride in the result, discovery does not throw for them; a thrown error is reserved
for a workspace that cannot be enumerated at all, where there is no result to carry anything
[[d:discovery-returns-problems-not-throws]] [[d:validation-runs-inside-discovery]].

## The library surface

The kit ships as `@twin-digital/mc-dev-kit` [[r:dev-kit-library-name]], exporting typed functions and
typed records, so a consumer imports it and holds the pack set as data with nothing to parse
[[r:dev-kit-provides-a-library]]. Discovery is the only function that touches the filesystem, since a
second one that read from disk would be the per-pack resolution the kit does not offer
[[d:workspace-is-the-unit-of-resolution]]; searching is therefore pure over a pack set already in
hand, returning an array of records and an empty array when nothing matches [[r:pack-search]]. Search
matches a full package name or a completed pack name by exact string equality, with several criteria
combined as a conjunction [[d:search-matches-exact-names]].

## Components

```yaml
components:
  - id: core-types
    responsibility: the pack record type, the problem record type and its closed code union, and the result type pairing packs with problems
    excludes: detecting any of the conditions it can express
  - id: workspace-enumerator
    responsibility: resolve a workspace root to its candidate package directories and each one's parsed package.json
    excludes: deciding which candidates hold packs
    after: [core-types]
  - id: pack-locator
    responsibility: apply the source-manifest membership test to a candidate package and compute each pack's source and expected output paths from the source directory's kind
    excludes: parsing manifest contents
    after: [workspace-enumerator]
  - id: manifest-reader
    responsibility: parse a manifest.json into a typed object and report a parse failure or a breach of the shape floor as a problem
    excludes: filling in absent fields
    after: [core-types]
  - id: uuid-index
    responsibility: build the workspace-wide index from header uuid to the packs declaring it, over every manifest read in the pass
    excludes: judging whether a uuid is duplicated or a dependency resolves
    after: [manifest-reader]
  - id: kind-deriver
    responsibility: derive a pack's kind from its manifest's module types, reporting an unrecognised type or a set spanning two kinds
    excludes: comparing the derived kind against the source directory
    after: [manifest-reader]
  - id: manifest-completer
    responsibility: over the whole pack set, fill header name, header version, and the version of every unversioned dependency whose uuid the index resolves to exactly one pack
    excludes: judging whether a dependency resolves
    after: [pack-locator, uuid-index]
  - id: pack-validator
    responsibility: run the cross-pack checks — uuid presence and uniqueness, kind agreement with the source directory, and dependency satisfaction including the ambiguous and built-in-module cases
    excludes: filling in any manifest field
    after: [manifest-completer, kind-deriver]
  - id: pack-set-query
    responsibility: search a resolved pack set by package name and pack name
    excludes: any filesystem access
    after: [core-types]
  - id: public-api
    responsibility: the published package entry point wiring discovery end to end and exporting the record, result, and problem types
    excludes: any logic not delegated to the components above
    after: [pack-set-query, pack-validator]
```
