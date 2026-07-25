# Minecraft Dev Kit

## Summary

The dev kit is the library that answers, for a workspace of Minecraft Bedrock packages, which packs
exist here and what each one is. It produces a normalised pack set — one record per pack, carrying
its owning package, its kind, the identity and version its manifest declares, its source directory,
and where its built output is expected — returned together with every problem found while assembling
it. The problem it answers is that everything downstream (deploying into a server pool, reloading,
watching, gating a CI build) needs a single trustworthy answer to that question, and each consumer
left to work it out alone reaches for a signal that picks the wrong packages.

One constraint shapes the whole design: the answer has to be complete from source on a clean
checkout, before any build has run. That cuts every capability in two — what a pack's own files
settle, which is always available, and what only a build settles, which a caller asks for
explicitly and the kit never assumes.

## Open questions

```yaml
questions:
  - id: workspace-definitions-in-scope
    question: which package-manager workspace definitions must the kit enumerate packages from, and
      must it serve a directory of packages that declares no workspace at all?
    closes: requirement
    gates: [packages-come-from-the-workspace-definition]
  - id: dependency-version-skew-tolerance
    question: is an in-workspace dependency that resolves by uuid but names a different version a
      reported problem, or expected skew during development?
    closes: requirement
    gates: [dependency-checks-uuid-and-version]
```

## The pack set

One flat list of pack records is the kit's whole data structure, and every capability is a function
over it [[d:pack-set-is-a-flat-record-list]]. A package contributing two packs contributes two
records; nothing in the shape expresses an addon, a package grouping, or a pack of a kind the
records cannot carry [[r:one-pack-of-each-kind-per-package]]. Consumers narrow with ordinary
array filtering, so a selection is a value the caller holds rather than state the kit keeps, and no
narrowing can change what a later call reports [[r:selection-filters-the-discovered-set]]. The
records are data the consumer indexes and destructures, never text [[r:kit-is-consumed-as-a-library]].

Illustrative, not the API:

```ts
type Pack = {
  package: string        // owning workspace package name
  kind: 'behavior' | 'resource'
  id: string             // manifest header uuid
  version: [number, number, number]
  sourceDir: string      // e.g. packages/mc-pack-1/behavior_pack
  outputDir: string      // e.g. packages/mc-pack-1/dist/behavior_pack — expected, not asserted
}
```

`sourceDir` and `outputDir` are both present on every record, because both are computable from source
alone. `outputDir` is where the kit will look; that something is there is a separate question the kit
answers only when asked (below) [[r:packs-enumerable-without-a-build]].

## Finding packs

Discovery runs in two steps. The candidate packages come from the workspace's own package-manager
definition rather than from walking the tree [[d:packages-come-from-the-workspace-definition]] —
the definition is also where the owning package's name and directory come from, both of which every
record carries and the build step needs. Each candidate is then probed at two fixed paths under its
root, `behavior_pack/manifest.json` and `resource_pack/manifest.json`, with no recursive search
[[d:membership-probed-at-fixed-package-root-paths]] [[r:membership-from-source-manifest-presence]].
A probe that hits is a pack, because a directory holding a manifest at its root is the format's own
definition of one [[f:pack-is-a-directory-with-a-manifest-at-its-root]]; a package where neither
probe hits is not pack-bearing and produces no record and no problem.

Nothing else about a package is consulted to decide membership — not its name, not its dependencies,
not its scripts, not its position in the tree. Each of those selects packages that are not packs, or
misses packs that are [[f:content-independent-pack-heuristics-misfire]], and a wrong membership
answer is the one error every capability downstream inherits.

The two probe paths are a locating convention and carry no authority: they say where to look, never
what was found [[f:pack-directory-name-carries-no-meaning]].

## Reading a pack

A record's identity, version, and kind are read from the manifest at the probed path and nowhere
else [[r:pack-identity-and-kind-declared-only-by-the-manifest]]. Kind is derived from the `type`
values across the manifest's `modules`, mapping `data` and `script` to behavior and `resources` to
resource [[f:bedrock-manifest-declares-pack-identity-and-kind]] [[d:kind-derived-from-module-types]];
a manifest whose modules map to neither, or that spans both, yields a problem instead of a record,
since the kit has no ground on which to prefer one reading. Kind derived this way is then checked
against the directory it was found in, and a disagreement is a problem naming both sides — the
directory is not corrected to match, and the manifest is not overruled.

`outputDir` is `dist/` joined to the same kind-named subdirectory the source probe used, so a
package's built layout mirrors its source layout [[r:built-output-defaults-to-dist]]. A package
overrides the `dist/` root — never the subdirectory — with a `minecraft.outDir` key in its own
`package.json` [[d:output-root-overridden-in-package-json]]. That key is read only for a package
already known to bear packs; it is never a membership signal, which is exactly the reading that
picks up nothing at all [[f:content-independent-pack-heuristics-misfire]].

## Validation

Every capability returns the pack set and a list of problems together, and a location the kit could
not normalise leaves the set but appears in the list, naming the package and the path examined
[[r:unresolvable-packs-fail-loudly]] [[d:problems-returned-beside-the-pack-set]]. A caller cannot
obtain packs without also receiving problems, so a shrunken result is never silent. Each problem is
a record with a stable code, so a CI check can classify and count what it found without a human
reading a line of it, and the dev server can decide per code whether to proceed
[[r:consumers-are-the-dev-server-and-ci]].

Source-level checks always run, on the pack set as a whole: a manifest that parses, a header uuid
present and unique across the set, a module type in the recognised mapping, and a kind agreeing with
the directory that located it. Dependencies are checked against the same set — an entry naming a
`uuid` is satisfied by a discovered pack with that header uuid at that version, while an entry
naming a `module_name` names a built-in scripting module and is exempt, so the set is not treated as
closed [[f:pack-dependencies-name-an-exact-uuid-and-version]] [[d:dependency-checks-uuid-and-version]].

The one check that cannot run on a clean checkout is built output, and it runs only when the caller
asks for it [[d:built-output-checks-are-opt-in]]. Asked for, a pack with nothing at its `outputDir`
is a problem naming the package and that path; not asked for, its absence is not a finding
[[r:packs-enumerable-without-a-build]].

## Building

A build is delegated whole to the package that owns the pack: the kit invokes the package's own
build script and reports every pack that package owns as affected, without inspecting what the
build did [[d:build-is-delegated-per-package]] [[r:kit-stops-at-a-validated-pack-set]]. Per-package
attribution is exact for the workspaces in scope, where a package's two packs are built by one
script [[r:one-pack-of-each-kind-per-package]] [[f:ecosystem-models-one-pack-per-kind-per-project]],
and it is what a watching consumer needs to know which deployed packs a rebuild invalidated. A
package with no build script to invoke is a problem, not a silent no-op.

## Where the kit stops

The kit hands back a validated pack set and stops [[r:kit-stops-at-a-validated-pack-set]]. Deploying
into a pool, activating, reloading, and the selection UX are the dev server's; release archives are a
consumer's too, and a pack set is sufficient input for one, since an `.mcpack` is a single zipped
pack and an `.mcaddon` a zip over those [[f:release-archives-follow-pack-content]]. What the kit
would have to grow to own any of them — a notion of a running server, or of a distribution target —
is what it deliberately has not got.

## Components

```yaml
components:
  - id: problem-model
    responsibility: the problem record — stable code, owning package, path examined, message — and
      the result pairing that carries problems beside a pack set
    excludes: deciding which conditions raise a problem
  - id: workspace-scan
    responsibility: enumerate the workspace's packages and probe each for pack-bearing source
      directories, yielding located pack directories
    excludes: reading or parsing any manifest
    after: [problem-model]
  - id: manifest-model
    responsibility: parse one manifest.json and normalise it to identity, version, derived kind, and
      declared dependencies
    excludes: any check spanning more than one pack
    after: [problem-model]
  - id: pack-set
    responsibility: assemble pack records from located directories and parsed manifests, resolving
      each pack's expected output directory including a package's override
    excludes: validating the assembled set
    after: [workspace-scan, manifest-model]
  - id: validation
    responsibility: the set-level rules — uuid uniqueness, kind/directory agreement, dependency
      resolution, and the opt-in built-output check
    after: [pack-set]
  - id: build-runner
    responsibility: invoke owning packages' build scripts for a selection and report the packs each
      build affected
    excludes: defining build semantics or reading build output
    after: [pack-set]
```
