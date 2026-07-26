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
```

## The pack set

Discovery returns one record per pack in a flat list — not a tree of packages each holding packs,
and not a map keyed by kind [[r:pack-discovery]]. Each record names the package that owns it, the
pack's kind, the source directory it was found in, the directory its built output is expected at
whether or not anything is there, and the pack's manifest as an object
[[r:pack-record-details]]. Flatness costs nothing in addressability here: a package's source can
hold at most one pack of each kind, so the pair of package name and kind is already unique across
the set and no synthetic key is needed [[r:membership-from-source-manifest-presence]] — and a
consumer that addresses a pack that way is speaking the idiom every surveyed pack tool already uses
[[f:ecosystem-models-one-pack-per-kind-per-project]].

A record's kind is the one its manifest's modules declare [[r:kind-derived-from-module-types]],
because the manifest is where a pack states both that it is a pack and which kind
[[f:manifest-declares-pack-identity-version-and-module-kinds]] while the directory holding it states
nothing the server reads [[f:pack-directory-name-carries-no-meaning]]. The kind-named directory a
pack was found under is therefore a membership signal and never a second opinion: where the two
disagree, the record still reports the manifest's kind and the disagreement is raised as a problem
against that pack, so no consumer silently gets the directory's answer
[[r:pack-identity-and-kind-declared-only-by-the-manifest]] [[d:manifest-kind-is-reported-on-disagreement]].

The manifest a record carries is the completed one; the raw source object is not a second field on
the record, and a consumer that needs the bytes as committed reads them from the source path the
record already gives it [[d:records-carry-the-completed-manifest-only]]. One manifest per record
means a consumer never has to know which of two shapes it is holding.

## Finding the packs

Candidates are enumerated from the workspace's own package-manager definition rather than by walking
the tree [[r:packages-come-from-the-workspace-definition]]: a `pnpm-workspace.yaml` is that
definition when it exists, otherwise the root `package.json`'s `workspaces` field, and nothing else —
no lockfile sniffing, no fallback scan [[d:pnpm-definition-wins-when-both-present]]. A candidate
becomes a pack-bearing package by holding `behavior_pack/manifest.json` or
`resource_pack/manifest.json` in its source [[r:membership-from-source-manifest-presence]], which is
the format's own test for a pack applied at a fixed location [[f:pack-is-a-directory-with-a-manifest-at-its-root]].
The alternative signals — a marker field, a keyword, a dependency on the scripting API, the presence
of build scripts, a package's name or its position in the tree — were scored against a real
workspace and each either missed real packs or selected packages that are not packs, so none of them
is used even as a hint [[f:name-dependency-script-and-location-heuristics-misfire]].

Everything read in this pass is committed source, which is what lets a clean checkout answer as
completely as a built one [[r:packs-enumerable-without-a-build]]. The pass is also indivisible: the
kit resolves a whole workspace at once and offers no per-pack entry point
[[d:workspace-is-the-unit-of-resolution]], because completing a dependency and checking identity
uniqueness both need the index of every header uuid in the set, which only a full pass can build.

## Completing the manifest

A source manifest omits its header name and version, and may omit the version of a dependency, and
the kit fills all three from the owning package's `package.json` before reporting the manifest
[[r:kit-completes-partial-source-manifests]]. A dependency left unversioned is resolvable because
the entry still names the depended-on pack's exact header uuid: the uuid selects a pack in the set,
and that pack's owning package supplies the version [[f:pack-dependencies-name-an-exact-uuid-and-version]].
Versions are written in the manifest's three-element array form, so a package version that is not
three dotted segments — a prerelease or build-metadata suffix included — is reported as a problem
rather than truncated to fit [[d:completion-writes-array-versions]]. Completion writes only these
fields; every other key in the manifest is carried through exactly as committed and is not read
[[d:unknown-manifest-fields-pass-through]].

## Where built output is expected

Output locations are computed, never probed — the kit reports where a pack's build output belongs
whether or not it exists. The package's output root is `dist/` [[r:built-output-defaults-to-dist]],
which a package overrides with an `mcDevKit.outDir` field in its own `package.json` resolved
relative to the package root, keeping the override in the same file the rest of the package's
identity comes from [[d:output-root-override-in-package-json]]. Within that root the pack sits in a
kind-named subdirectory mirroring its source layout, so the path is a pure function of the package
root, the override, and the kind [[r:built-output-mirrors-the-source-layout]].

## Problems

A problem is data, not a message: a record carrying a closed-union code, the owning package, the
path examined, and a human-readable string, so a caller branches on the code and only a human reads
the string [[r:structured-validation]] [[d:problems-are-coded-records]]. Every pack the kit cannot
fully resolve — an unparseable manifest, a missing or duplicated header uuid, an unrecognised module
type or a module set spanning two kinds, an unsatisfied in-workspace dependency, missing or
malformed completion data — appears in the pack set with its problems attached, rather than
vanishing from a quietly shorter list [[r:unresolvable-packs-fail-loudly]] [[r:kind-derived-from-module-types]].
A dependency entry naming a built-in scripting module is not an unsatisfied dependency and is left
alone. Where two packs collide on a header uuid, both are flagged: neither has a better claim to the
id, and picking one would hand a consumer a pack whose identity is not actually unique
[[d:duplicate-uuid-flags-every-holder]].

Because problems ride in the result, discovery does not throw for them; a thrown error is reserved
for a workspace that cannot be enumerated at all, where there is no result to carry anything
[[d:discovery-returns-problems-not-throws]]. Validation is not a mode either — every discovery
validates, so a pack set and its problem list are produced together and no caller can obtain records
that have not been checked [[d:validation-runs-inside-discovery]].

## The library surface

The kit ships as `@twin-digital/mc-dev-kit` [[r:dev-kit-library-name]], exporting typed functions
and typed records, so a consumer imports it and holds the pack set as data with nothing to parse
[[r:dev-kit-provides-a-library]]. Discovery is the only function that touches the filesystem;
searching is a pure operation over a pack set already in hand, returning an array of records and an
empty array when nothing matches [[r:pack-search]]. Search matches a full package name or a
completed pack name by exact string equality, with several criteria combined as a conjunction —
the kit's job is a precise index, and a fuzzier match belongs to whatever UX presents it
[[d:search-matches-exact-names]].

## Components

```yaml
components:
  - id: problem-model
    responsibility: the problem record type, its closed code union, and the result type pairing packs with problems
    excludes: detecting any of the conditions it can express
  - id: workspace-enumerator
    responsibility: resolve a workspace root to its candidate package directories and each one's parsed package.json
    excludes: deciding which candidates hold packs
    after: [problem-model]
  - id: pack-locator
    responsibility: apply the source-manifest membership test to a candidate package and compute each pack's source and expected output paths
    excludes: parsing manifest contents
    after: [workspace-enumerator]
  - id: manifest-reader
    responsibility: parse a manifest.json into a typed object and report a parse or shape failure as a problem
    excludes: filling in absent fields
    after: [problem-model]
  - id: manifest-completer
    responsibility: fill header name, header version, and unversioned dependency versions from package.json and the workspace uuid index
    excludes: judging whether a completed manifest is internally consistent
    after: [pack-locator, manifest-reader]
  - id: pack-validator
    responsibility: run the cross-pack checks — uuid presence and uniqueness, module-type to kind, kind agreement with the source directory, dependency satisfaction
    excludes: deciding which packages were candidates
    after: [manifest-completer]
  - id: pack-set-query
    responsibility: search a resolved pack set by package name and pack name
    excludes: any filesystem access
    after: [pack-validator]
  - id: public-api
    responsibility: the published package entry point wiring discovery end to end and exporting the record, result, and problem types
    excludes: any logic not delegated to the components above
    after: [pack-set-query]
```
