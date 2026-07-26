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
      to the string, so no source found establishes the restriction below it.
    closes: fact
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
[[r:pack-record-details]], and that document is open: known where the kit acts on it, and
otherwise preserving what it read [[d:manifest-is-reported-as-an-open-typed-document]]. A closed
type is not available here even in principle — the module type list is open-ended, and the format
version a source declares survives into the reported manifest untouched
[[r:manifest-format-version-passes-through]] — so a consumer that hands the document to a server
gets back what the author wrote plus what the kit filled in, and nothing dropped in transit.

Filling in is the kit's defensible work [[r:kit-completes-partial-source-manifests]]. Two parts of
it need pinning beyond what that requirement fixes. The first is the version form: format version
decides it, so the kit needs an answer for a format version it does not recognise, including none
at all. It writes the array there [[d:completion-version-form-follows-format-version]], which is
the form the reference documents throughout and pins the string only to version 3
[[f:manifest-declares-pack-identity-version-and-module-kinds]]. The open question above is the
other half of that reading: the kit rejects a source version written in the form its format
version does not carry, and below version 3 nothing published establishes that such a form is
wrong.

The second is ordering. A completed workspace dependency entry needs the depended-on pack's header
uuid and its owning package's version [[f:pack-dependency-entries-name-a-uuid-or-a-module-name-plus-a-version]],
which is another pack's resolved data — so completion cannot run pack-by-pack during parsing. The
kit therefore reads and per-pack-checks every candidate, settles identity across the whole set,
and only then completes: two passes, with the set boundary between them. The same fact is why a
`dependencies` entry already written in a source manifest is passed through rather than completed —
an entry naming a built-in scripting module carries a `module_name` and no uuid, and there is no
workspace package behind it for the kit to read a version from.

## Resolving the set and reporting problems

Identity is what the set is keyed by: queries match on it, and every completed dependency entry
points at one. So a shared header uuid is not a defect of one pack that another survives — while
two packs claim one identity, neither can be pointed at, and picking a winner would bind
dependencies to an ordering nobody chose. Every sharer fails together, each naming the others so
the developer can see the pair [[d:duplicate-header-uuid-invalidates-every-sharer]]. Failure
propagates one step from there: a pack whose completed dependency target did not resolve cannot be
completed either, and joins the problem list rather than shipping a dependency entry with a hole in
it [[r:unresolvable-packs-fail-loudly]].

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
| `dependency-declares-a-workspace-pack` | a source-written dependency entry names a discovered pack's uuid |
| `dependency-version-missing` | a source-written dependency entry carries no version |
| `dependency-target-unresolved` | a completed dependency's target pack is not in the resolved set |

Every candidate leaves discovery through exactly one of the two lists [[r:pack-discovery]], so a
consumer that reads both has seen everything on disk and a silent drop is impossible by
construction. What is deliberately absent from the table is a code for an unbuilt pack. The built
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

## Components

```yaml
components:
  - id: problem-model
    responsibility: the problem record type, its closed code set, and the constructors other components raise through
    excludes: deciding which conditions are problems
  - id: workspace-packages
    responsibility: resolve a workspace root into its member packages, each with name, directory, and parsed package.json
    excludes: anything specific to Minecraft packs
  - id: pack-candidates
    responsibility: probe each package's two fixed source-manifest paths and emit one candidate per hit, carrying package, kind, and source directory
    excludes: reading manifest content
    after: [workspace-packages, problem-model]
  - id: manifest-document
    responsibility: parse a candidate's manifest into the open typed document and apply every check that needs only that pack
    excludes: any check that needs another pack's data
    after: [pack-candidates]
  - id: pack-set-resolution
    responsibility: settle identity across candidates — uuid presence and uniqueness — and decide which candidates survive as packs
    after: [manifest-document]
  - id: manifest-completion
    responsibility: fill the header name and version and add a dependency entry per prod dependency resolving to a resolved workspace pack
    after: [pack-set-resolution]
  - id: pack-set-api
    responsibility: the exported entry point, the pack record shape, and the exact-match queries over a held set
    excludes: filesystem access of its own
    after: [manifest-completion]
```
