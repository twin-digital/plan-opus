# Minecraft Dev Kit

## Summary

The dev kit is the library that answers, for a workspace of Minecraft Bedrock packages, which packs
exist here and what each one is — and then completes each pack's manifest on the way to build
output. It produces a normalised pack set, one record per pack carrying its owning package, its
kind, the identity its manifest declares, its source directory and where its built output is
expected, returned together with every problem found while assembling it; and it produces the
manifests that reach build output, with the fields source deliberately leaves out filled in. The
problem it answers is that everything downstream (deploying into a server pool, reloading, watching,
gating a CI build) needs a single trustworthy answer to what the workspace holds, and each consumer
left to work it out alone reaches for a signal that picks the wrong packages — or reimplements the
rules for filling in what a pack's own source omits.

One constraint shapes the whole design: a source manifest is partial on purpose. A pack's name, its
version, and the version of every dependency it has inside this workspace are absent from source and
supplied later, which is why the kit both reads the workspace and writes into build output. What
source does settle is available on a clean checkout with nothing built; what source omits is the
kit's to inject, and never a problem to report.

## Open questions

```yaml
questions:
  - id: injected-version-source
    question: where does the injected `header.version` come from? The requirements fix where the
      injected name comes from and that a version is injected, but not what it is read from — the
      owning package's `package.json` `version` is the obvious candidate and is not stated.
    closes: requirement
    gates: [completion-is-a-post-build-pass-over-the-output-tree]
  - id: completion-outside-the-kit-build-entry-point
    question: must a build run any way other than through the kit still produce completed manifests
      — a package's own `npm run build`, or a watch process the dev server drives? If so the
      completion rules cannot live only behind the kit's build call, and the kit needs a form a
      package's own build can invoke.
    closes: requirement
    gates: [completion-is-a-post-build-pass-over-the-output-tree, build-is-delegated-per-package]
  - id: explicit-version-naming-a-workspace-pack
    question: a dependency entry carrying an explicit version whose uuid nonetheless matches a
      discovered pack contradicts itself — the version says external, the uuid says in-workspace.
      Is that a reported problem, or a legitimate pin the kit leaves alone?
    closes: requirement
    gates: [explicit-version-marks-a-dependency-external]
```

## The pack set

One flat list of pack records is the kit's whole data structure, and every capability is a function
over it [[r:pack-set-is-a-flat-record-list]]. A package contributing two packs contributes two
records; nothing in the shape expresses an addon, a package grouping, or a pack of a kind the
records cannot carry [[r:one-pack-of-each-kind-per-package]]. Consumers narrow with ordinary
array filtering, so a selection is a value the caller holds rather than state the kit keeps, and no
narrowing can change what a later call reports [[r:selection-filters-the-discovered-set]]
[[r:kit-is-consumed-as-a-library]].

Illustrative, not the API:

```ts
type Pack = {
  package: string        // owning workspace package name
  kind: 'behavior' | 'resource'
  id: string             // manifest header uuid
  version?: [number, number, number]   // injected at completion; absent before then
  sourceDir: string      // e.g. packages/mc-pack-1/behavior_pack
  outputDir: string      // e.g. packages/mc-pack-1/dist/behavior_pack — expected, not asserted
}
```

`sourceDir` and `outputDir` are both present on every record, because both are computable from source
alone. `outputDir` is where the kit will look; that something is there is a separate question the kit
answers only when asked (below) [[r:packs-enumerable-without-a-build]]. `version` is the one field a
record cannot always carry: source does not state it [[r:source-manifests-omit-injected-name-and-version]],
so it is present only once completion has determined it.

## Finding packs

Discovery runs in two steps. The candidate packages come from the workspace's own package-manager
definition rather than from walking the tree [[r:packages-come-from-the-workspace-definition]], and
two definition formats are read [[r:workspace-definitions-are-npm-and-pnpm]] — the definition is
also where the owning package's name and directory come from, all three of which the records, the
injected name, and the build step need. Each candidate is then probed at two fixed paths under its
root, `behavior_pack/manifest.json` and `resource_pack/manifest.json`, with no recursive search:
those two paths are the whole membership test [[r:membership-from-source-manifest-presence]], and
the same two kind-named directories are what a package's output root mirrors
[[r:built-output-mirrors-the-source-layout]]. A probe that hits is a pack; a package where neither
probe hits is not pack-bearing and produces no record and no problem.

Nothing else about a package is consulted to decide membership — not its name, not its dependencies,
not its scripts, not its position in the tree. Each of those selects packages that are not packs, or
misses packs that are [[f:name-dependency-script-and-location-heuristics-misfire]].

## Reading a pack

A record's identity and kind are read from the manifest at the probed path and nowhere else
[[r:pack-identity-and-kind-declared-only-by-the-manifest]]. Kind is derived from the `type`
values across the manifest's `modules`, mapping `data` and `script` to behavior and `resources` to
resource [[f:manifest-declares-pack-identity-version-and-module-kinds]] [[r:kind-derived-from-module-types]];
a manifest whose modules map to neither, or that spans both, yields a problem instead of a record.
Kind derived this way is then checked
against the directory it was found in, and a disagreement is a problem naming both sides.

What the manifest does not carry at this point is a name or a version, and the reader does not treat
either as missing [[r:source-manifests-omit-injected-name-and-version]] — a source manifest that
parses, declares a uuid, and declares recognised modules is complete for every purpose before
completion runs.

`outputDir` is `dist/` joined to the same kind-named subdirectory the source probe used, and that
subdirectory is always present, however many packs the package has
[[r:built-output-defaults-to-dist]] [[r:built-output-mirrors-the-source-layout]]. A package moves the
root, never the subdirectory, with a `minecraft.outDir` key
[[d:output-root-overridden-in-package-json]]. Both halves of that path resolve from the owning
package's own files, so a record can state where output is expected on a clean checkout. The
`minecraft.outDir` key is read only
for a package already known to bear packs; it is never a membership signal.

## Validation

Every capability returns the pack set and a list of problems together, and a location the kit could
not normalise leaves the set but appears in the list, naming the package and the path examined
[[r:unresolvable-packs-fail-loudly]] [[d:problems-returned-beside-the-pack-set]]. Each problem is
a record with a stable code, so a CI check can classify and count what it found without a human
reading a line of it, and the dev server can decide per code whether to proceed
[[r:consumers-are-the-dev-server-and-ci]].

Source-level checks always run, on the pack set as a whole: a manifest that parses, a header uuid
present and unique across the set, a module type in the recognised mapping, and a kind agreeing with
the directory that located it.

Dependency checking follows from what an absent version means. An entry that names a `uuid` and
carries no version has to resolve to a discovered pack, because the version stamped there at
completion can only come from that pack [[r:absent-dependency-version-denotes-a-workspace-pack]];
one carrying an explicit version is a pack the workspace does not hold, and is left alone rather
than failed for being unresolvable [[d:explicit-version-marks-a-dependency-external]]. An entry
naming a `module_name` names a built-in scripting module and is exempt from both, so the set is
never treated as closed [[f:pack-dependencies-name-an-exact-uuid-and-version]]
[[r:unresolvable-packs-fail-loudly]].

The one check that cannot run on a clean checkout is built output, and it runs only when the caller
asks for it [[d:built-output-checks-are-opt-in]]. Asked for, a pack with nothing at its `outputDir`
is a problem naming the package and that path; not asked for, its absence is not a finding
[[r:packs-enumerable-without-a-build]].

## Completing a manifest

Three fields source omits are the kit's to supply [[r:kit-owns-manifest-completion]]. `header.name`
comes from the owning package — its `productName`, or its scope-stripped package name
[[r:injected-name-comes-from-the-package]] — which is the second thing the workspace definition is
read for. `header.version` is injected too [[r:source-manifests-omit-injected-name-and-version]].
Each unversioned dependency entry is stamped with the version of the pack its uuid resolved to
[[r:absent-dependency-version-denotes-a-workspace-pack]], which is the same resolution validation
already performed, so completion consumes the validated pack set rather than re-reading the
workspace.

Completion rewrites the manifest that sits under the package's output root, after the package's own
build script has put it there, and leaves the source manifest untouched
[[d:completion-is-a-post-build-pass-over-the-output-tree]]. Source therefore stays partial, which is
what makes the same source tree buildable at more than one version, and the injected values never
have to be reconciled with a copy of themselves on disk.

## Building

Building a selection runs once per owning package, not once per pack, so a caller that selected one
of a package's two packs gets both rebuilt and both reported as affected, with completion run over
that package's output root once the script returns [[d:build-is-delegated-per-package]]. The kit
still defines nothing about how the package assembles its output; it only invokes the script and
then fills in the fields the script left blank [[r:kit-owns-manifest-completion]]. That attribution
is exact where a package's two packs are built by one script [[r:one-pack-of-each-kind-per-package]].
A package with no build script to invoke is a problem, not a silent no-op.

## Where the kit stops

Deploying into a pool, activating, reloading, and the selection UX are the dev server's; release
archives are a consumer's too, and a completed output tree is sufficient input for one — packaging
is a zip of that tree and nothing more [[r:built-output-mirrors-the-source-layout]], which the
format's archives already match, an `.mcpack` being a single zipped pack and an `.mcaddon` a zip
over those [[f:release-archives-follow-pack-content]].

## Components

```yaml
components:
  - id: problem-model
    responsibility: the problem record — stable code, owning package, path examined, message — and
      the result pairing that carries problems beside a pack set
    excludes: deciding which conditions raise a problem
  - id: workspace-scan
    responsibility: enumerate the workspace's packages and probe each for pack-bearing source
      directories, yielding each located pack directory with the name and root of the package
      owning it
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
    responsibility: the validation rules — uuid uniqueness across the set, per-pack kind/directory
      agreement, dependency resolution, and the opt-in built-output check
    after: [pack-set]
  - id: manifest-completion
    responsibility: inject header name, header version, and resolved in-workspace dependency
      versions into the manifests under a package's output root
    excludes: producing the output tree those manifests sit in
    after: [validation]
  - id: build-runner
    responsibility: invoke owning packages' build scripts for a selection, run completion over each
      package's output root, and report the packs each build affected
    excludes: defining build semantics
    after: [pack-set, manifest-completion]
```
