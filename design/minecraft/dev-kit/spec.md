# Minecraft dev kit

## Summary

The dev kit answers one question about a workspace of Minecraft Bedrock packages: which packs are
here, and what is each one. It is a typed npm library, and its product is a pack set — one record
per resolved pack carrying identity, version, kind, owning package, source and built-output
locations, and the pack's manifest completed to what a server would need to read, alongside a
structured problem for every pack found but not resolvable. The problem it answers is that
everything downstream of it — deploying, activating, reloading, choosing what to run — needs a
single trustworthy answer to "what packs exist here", and without one each consumer re-derives it
from signals that misclassify real workspaces. The constraint that shapes the whole design is that
the answer must come from a clean checkout, with nothing built, nothing installed, and no server
running: no input the kit reads may be a build product, and no step may wait on one.

## Open questions

```yaml
questions:
  - id: version-form-restriction-below-format-version-3
    question: >-
      does a manifest below format_version 3 actually reject a version written as a SemVer string?
      The kit treats a version in a form its own format_version does not carry as an error, but the
      published reference types every version as a vector or a SemVer string and pins only version 3
      to the string, so no source found establishes the restriction below it. What the answer moves
      is the `version-form-unsupported` rejection the requirement states, not what completion writes.
    closes: fact
  - id: prerelease-package-version-under-the-array-form
    question: >-
      what should the kit do with a prerelease `package.json` version? Completion writes the
      `[major, minor, revision]` array for every manifest below format version 3 — every
      non-preview manifest in practice — and the array cannot express `1.2.0-beta.1` or
      `0.0.0-canary.4`, so `package-version-unusable` fires. Under changesets or canary publishing
      that is the normal mid-release state of every package at once, so the whole set becomes
      problem records and a dev server has nothing to deploy during exactly the window a developer
      wants to run one. The rule is inherited and the spec adds no escape.
    closes: requirement
    gates: [completion-version-form-follows-format-version]
```

## Finding the candidate packages

Enumeration is the only part of the kit that is not about Minecraft, and it is where the
clean-checkout constraint bites hardest: the workspace definition must be read from the checkout
itself [[r:packages-come-from-the-workspace-definition]] [[r:packs-enumerable-without-a-build]].
Three ways to do that were open. Re-implementing each manager's configuration and glob behaviour
is the most work and drifts from its upstream silently. Shelling out to the manager reuses that
work, but presumes the manager binary is present on a machine that has installed nothing — and
on an uninstalled checkout of a pnpm workspace, the manager the definition names is exactly the
tool that may be absent. The third way carries neither cost: both managers publish the
implementation they use themselves, and both list an uninstalled workspace with no lockfile and no
manager process involved [[f:manager-enumeration-libraries-need-no-install]], so the kit links them
in and calls them directly [[d:workspace-enumeration-uses-the-managers-own-libraries]].

Two seams in those libraries shape the component that wraps them. pnpm's finder does not read
`pnpm-workspace.yaml`; its caller does, and hands over the `packages` patterns — so the kit owns
that file's semantics either way, and the include/exclude glob list it must produce is documented
[[f:pnpm-workspace-packages-is-an-include-exclude-glob-list]], as is the npm `workspaces` array the
other library consumes [[f:npm-workspaces-is-an-array-of-paths-or-globs]]. Those two formats are
also the fallback if a library is ever dropped, which is what keeps the decision cheap to reverse.
The second seam is that the managers disagree about the root: pnpm's workspace includes the root
package and npm's does not. Discovery folds that difference away rather than passing it on, so a
root package holding a pack is found whichever definition file the checkout uses
[[d:workspace-root-package-is-a-candidate]].

Which manager to enumerate as is read from the checkout, not configured
[[d:workspace-definition-file-selects-the-manager]]. When neither definition file is there the kit
raises instead of returning an empty set: an empty pack set is a legitimate answer for a workspace
that holds no packs, so using it for "this is not a workspace" would make a misconfigured root
indistinguishable from a working one. That line — the workspace is the caller's contract, an
individual pack is data — is where every later error lands too
[[d:workspace-failures-throw-and-pack-failures-are-records]].

## What counts as a pack

Membership is two `stat` calls per package, at fixed relative paths
[[r:membership-from-source-manifest-presence]]. The test is cheap enough to run over every member
of a large workspace, needs no build output, and is the format's own definition of a pack rather
than a convention this kit invents [[f:pack-is-a-directory-with-a-manifest-at-its-root]]. The
alternatives it displaces are not hypothetical: package names, dependency sets, script sets, and
tree position each misclassify a real 41-package workspace, picking up scripting libraries and
build configs while a marker field finds nothing at all until every pack is edited to carry one
[[f:name-dependency-script-and-location-heuristics-misfire]].

The fixed path also carries the kind, and the manifest is checked against it rather than asked
[[r:manifest-corroborates-the-directory-kind]]. Neither side is trustworthy alone. A directory name
is not read as a declaration by anything downstream — a behavior pack deployed into a directory
named for the other kind loads normally [[f:pack-directory-name-carries-no-meaning]] — so the
directory is a kit-level convention that the engine would never catch the kit misreading. And the
manifest cannot be asked outright, because the set of module types it may declare is not
enumerable from the format's documentation and Microsoft's own reference pack declares a type
absent from every published list [[f:module-type-enumerations-disagree]]. Corroboration is what a
check can do against a moving target: it looks only for the types that carry the kind, ignores
every other type it meets, and reports the disagreement when it finds one.

## Reading and completing the manifest

The manifest is parsed once into the document the pack record hands back
[[r:pack-record-details]], and the fields the kit itself acts on — the format version, the header,
the modules, the dependencies — are the only ones it types, everything else riding along untyped
[[d:manifest-is-reported-as-an-open-typed-document]]. Typing the rest is not available here even in
principle, since the module type list is open-ended and the format version a source declares
survives into the reported manifest untouched [[r:manifest-format-version-passes-through]]. So a
consumer that hands the document to a server gets back what the author wrote plus what the kit
filled in, and nothing dropped in transit.

Filling in is the kit's defensible work [[r:kit-completes-partial-source-manifests]]. Three parts
of it need pinning beyond what that requirement fixes.

The first is the version form, and one mapping serves every reader of it: the manifest's own
`format_version` fixes the form, the string at 3 or higher and the array below it, absent and
unrecognised versions included [[d:completion-version-form-follows-format-version]] — the form the
reference documents throughout, pinning the string only to version 3
[[f:manifest-declares-pack-identity-version-and-module-kinds]]. Three things read that one answer:
what completion writes, which of the placeholder spellings are legal in a given manifest, and when
`version-form-unsupported` fires against a source version. Placeholder recognition needs no other
pack, so it runs with the parse: a placeholder in the legal form leaves the version unspecified and
`header-version-specified` does not fire, while any other written version does trip it. The open
question above is the other half of that reading: the kit rejects a source version written in the
form its format version does not carry, and below version 3 nothing published establishes that such
a form is wrong.

The second is which entries completion touches. Every dependency a pack has is written in that
pack's own manifest, so the entry itself is the discriminator
[[r:kit-completes-partial-source-manifests]]: a `uuid` that a discovered pack claims as its header
uuid names a dependency inside the workspace, and the kit supplies its version; a `uuid` no
candidate claims, and an entry naming a built-in scripting module by `module_name`, are outside the
workspace and the kit touches neither [[f:pack-dependency-entries-name-a-uuid-or-a-module-name-plus-a-version]].
That test costs the whole set — a uuid is unknown only once every candidate has been read — which is
why classification waits for the identity index rather than running with the parse. It also means a
mistyped workspace uuid and a genuine outside pack are the same input to the kit, and both are read
as external. The one case that is not ambiguous is an entry naming a workspace pack that also
specifies a version: the kit reports it rather than reading the version as an intent to stay outside
[[d:workspace-uuid-entry-may-not-carry-a-version]].

The third is ordering. The uuid in an entry is the author's, but the version is the depended-on
pack's owning package's, so completing an entry needs a pack other than the one being completed and
cannot run during its parse. The kit reads and per-pack-checks every candidate, indexes identity
across the whole set, completes each candidate against that index, and closes the set last (below).
Completion is keyed on the target being in the index, not on the target having survived: an entry
whose target bears a pack and then fails is still given its version, and the depending pack is
demoted with it rather than shipping an entry with a hole in it. That also keeps one failure from
being reported twice — a target whose own package version the required form cannot express fails on
its own header first, so its dependents meet it as an unresolved target and nothing else.

## Resolving the set and reporting problems

Identity is what the set is keyed by: queries match on it, and every completed dependency entry
points at one. So a shared header uuid is not a defect of one pack that another survives — while
two packs claim one identity, neither can be pointed at, and picking a winner would bind
dependencies to an ordering nobody chose. Every sharer fails together, each naming the others so
the developer can see the pair [[d:duplicate-header-uuid-invalidates-every-sharer]]. The index of
every candidate's uuid that this needs is also what sorts dependency entries into inside and outside
the workspace, which no single pack's data can answer: an entry is external precisely when no
candidate claims its uuid.

Which candidates ship as packs is then one pass's answer, and it runs after completion rather than
before it, because a candidate can fail at any stage: an unreadable manifest, a shared uuid, a
package version the required form cannot express, a dependency target that did not survive
[[r:unresolvable-packs-fail-loudly]]. Every earlier stage only records problems against a candidate;
the closing pass alone demotes [[d:pack-set-closure-demotes-to-a-fixed-point]]. It has to iterate,
because each demotion can create the next: with A depending on B and B on C, C's failure demotes B,
and B's demotion then demotes A. So the pass demotes what carries a problem, re-walks the dependency
edges of what is left, and repeats until nothing moves — propagation is transitive, not one step, and
a pack never ships a dependency entry pointing outside the resolved set.

A problem is a record a consumer can act on, not a rendered sentence
[[d:problems-carry-a-closed-set-of-codes]]. Its code is what a CLI groups by, what a test asserts
on, and what tells the dev server whether a pack is worth retrying after a rebuild. The closed set,
and the condition each code covers, is the interface consumers build against:

| code | raised when |
|---|---|
| `manifest-unreadable` | the source manifest cannot be read, or is not valid JSON |
| `header-uuid-missing` | the header carries no uuid, or one that is not a uuid |
| `header-uuid-duplicated` | another discovered pack carries the same header uuid |
| `header-name-specified` | the source manifest specifies a header name |
| `header-version-specified` | the source manifest specifies a header version that is not a placeholder |
| `version-form-unsupported` | a version is written in a form the manifest's format version does not carry |
| `module-type-missing` | a module declares no type |
| `kind-uncorroborated` | no module corroborates the kind the pack's directory declares |
| `kind-contradicted` | a module of the other kind is present |
| `package-version-unusable` | the owning package's version is missing, unparseable, or inexpressible in the required form |
| `dependency-version-specified` | a dependency entry naming a pack in the workspace also specifies a version |
| `dependency-version-missing` | an external dependency entry — a built-in module, or a uuid no pack in the workspace claims — carries no version |
| `dependency-target-unresolved` | a dependency entry names a pack in the workspace that did not survive as a resolved pack |

One candidate can trip several of these at once — a v2 manifest carrying `"1.2.3"` is both
`header-version-specified` and `version-form-unsupported` — and each trip is its own record: there
is no precedence among the codes and no primary one to group by
[[d:every-observed-problem-is-reported]]. Electing a primary would make the code a worse answer for
both jobs it holds, since a test asserting on one condition would have to know which other condition
outranked it. What bounds the burst is data rather than ranking: a check whose input an earlier
failure withheld does not run, so an unreadable manifest yields exactly one record.

Every candidate leaves discovery through exactly one of the two lists [[r:pack-discovery]], so a
consumer that reads both has seen every pack the workspace definition admits. The guarantee is over
the definition, not over the disk, and the difference is worth stating because it is where a pack
can still vanish quietly: candidates come from the workspace definition rather than a tree walk
[[r:packages-come-from-the-workspace-definition]], and a matched directory is a member only where it
holds a valid `package.json` [[f:npm-workspaces-is-an-array-of-paths-or-globs]] — so a directory
holding `behavior_pack/manifest.json` whose own `package.json` is missing or malformed is never a
member, never a candidate, and gets no problem record. Nor does it throw: the workspace itself is
readable, and only workspace-level trouble throws
[[d:workspace-failures-throw-and-pack-failures-are-records]]. A consumer that has seen both lists has
seen the definition's answer, and repairing a package that fell out of the definition is the package
manager's own error to surface.

What is deliberately absent from the table is a code for an unbuilt pack. The built
output location is part of a pack's record whether or not anything is there
[[r:pack-record-details]], and it is derived — the package's output root
[[r:built-output-defaults-to-dist]] and the kind-named subdirectory beneath it
[[r:built-output-mirrors-the-source-layout]] — so the kit computes and reports it without asking
the filesystem [[d:built-output-location-is-computed-not-probed]]. An uninstalled, unbuilt checkout
is the normal case this kit is built for, and a normal case does not produce problems.

## The library surface

The kit is consumed as `@twin-digital/mc-dev-kit` [[r:dev-kit-library-name]], imported and called
[[r:dev-kit-provides-a-library]]. One asynchronous call does the discovery and returns everything
it learned as one value [[d:the-pack-set-is-the-single-returned-value]]: the resolved packs, the
problems, and the queries. Keeping the queries on that value is what makes exact matching by
package name, pack name, or pack uuid [[r:pack-search]] a lookup rather than a second traversal —
the set is already in memory and already indexed by the three keys, so a query never touches the
filesystem and never disagrees with the set the caller is holding.

The record is the whole product, so its fields are pinned here rather than left to the builder —
a consumer receiving data instead of text still has to know the shape of the data
[[r:dev-kit-provides-a-library]] [[r:pack-record-details]]:

| field | form |
|---|---|
| `uuid` | the header uuid, lowercase, as written in the manifest |
| `name` | the completed `header.name` string |
| `version` | the pack version as a SemVer string [[d:pack-record-version-is-a-semver-string]] |
| `kind` | `behavior` or `resource` [[d:pack-kind-is-spelled-behavior-or-resource]] |
| `packageName` | the owning package's `package.json` `name` |
| `packageDir` | the owning package's directory |
| `sourceDir` | the pack's source directory, the one holding `manifest.json` |
| `outputDir` | the pack's built-output directory, present or not |
| `manifest` | the completed manifest document |

Every path among them is relative to the workspace root and names a directory, never the manifest
file inside it [[d:pack-record-paths-are-workspace-relative-directories]]. Two forms in that table
are choices a consumer cannot re-derive and would otherwise have to probe for. The version is one:
the manifest's own form varies with its format version, so a set can hold both an array and a
string, and a record field that inherited that variance could not be compared across two packs. The
kind is the other: the enum is not the directory name it was read from, so a consumer building a
path composes it from `outputDir` rather than interpolating the enum.

## Components

```yaml
components:
  - id: problem-model
    responsibility: the problem record type, its closed code set, and the constructors other components raise through
    excludes: deciding which conditions are problems
  - id: workspace-packages
    responsibility: resolve a workspace root into its member packages — the root package among them, added where the manager's library omits it — each with name, directory, and parsed package.json
    excludes: anything specific to Minecraft packs
  - id: pack-candidates
    responsibility: probe each package's two fixed source-manifest paths and emit one candidate per hit, carrying package, kind, source directory, and the built-output directory computed from the package and kind
    excludes: reading manifest content, and any filesystem probe of the built-output location
    after: [workspace-packages, problem-model]
  - id: manifest-document
    responsibility: parse a candidate's manifest into the open typed document and apply every check needing only that pack — uuid presence, kind corroboration, version form, placeholder recognition, and the version a `module_name` dependency entry must carry
    excludes: any check that needs another pack's data, including whether a dependency uuid names a pack in the workspace
    after: [pack-candidates]
  - id: pack-identity-index
    responsibility: index candidate identities across the set, flagging a uuid two candidates share, and classify each dependency entry's uuid as inside or outside the workspace, flagging an inside entry that specifies a version and an outside one that carries none
    excludes: deciding which candidates survive as packs
    after: [manifest-document]
  - id: manifest-completion
    responsibility: per candidate, fill the header name and version and the version of each dependency entry the index classed as inside the workspace, read from that target's owning package
    excludes: deciding which candidates survive as packs
    after: [pack-identity-index]
  - id: pack-set-closure
    responsibility: demote every candidate carrying a problem, re-walk the dependency edges of the rest, and iterate to a fixed point, yielding the resolved set and the problem list
    excludes: any check other than whether a completed dependency's target is still resolved
    after: [manifest-completion]
  - id: pack-set-api
    responsibility: the exported entry point, the pack record shape, and the exact-match queries over a held set
    excludes: filesystem access of its own
    after: [pack-set-closure]
```
