# Minecraft dev kit

## Summary

The dev kit answers one question about a workspace of Minecraft Bedrock packages: which packs are
here, and what is each one. It is a typed npm library, and its product is a pack set — one entry per
pack found, marked valid or invalid: a valid entry carrying identity, version, kind, owning package,
source and built-output locations, and the pack's manifest completed to what a server would need to
read; an invalid one carrying the problems that invalidated it alongside everything about it that
did not come from the manifest, so a pack can be named and located even when it cannot be used. The
problem it answers is that
everything downstream of it — deploying, activating, reloading, choosing what to run — needs a
single trustworthy answer to "what packs exist here", and without one each consumer re-derives it
from signals that misclassify real workspaces. The constraint that shapes the whole design is that
the answer must come from a clean checkout, with nothing built, nothing installed, and no server
running: no input the kit reads may be a build product, and no step may wait on one.

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

That line has one exception, and the libraries draw it rather than the kit. A pattern-matched
directory holding no `package.json` is skipped, the other members coming back normally; one holding
a `package.json` that will not parse makes both libraries throw and return nothing at all
[[f:a-malformed-member-manifest-fails-the-whole-enumeration]]. A fault in a single member — a
package with no pack in it, perhaps nothing to do with Minecraft — therefore fails the whole call.
Keeping it pack-level would mean not letting the libraries read member manifests, and neither
exposes an entry point that matches directories without reading them, so the kit would be back to
reproducing each manager's glob semantics itself — the cost the enumeration decision exists to
avoid. The exception is taken rather than engineered around, on two grounds: it is the same answer
the manager gives on that checkout, these being the implementations the managers use
[[f:manager-enumeration-libraries-need-no-install]], and both errors name the offending file, so a
developer is pointed at the repair rather than left with a pack that quietly went missing.

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
filled in, and nothing dropped in transit. Naming a known subset also draws the line between JSON
the kit can work with and JSON it cannot: a file that parses but whose `header`, `modules`, or
`dependencies` is not the object or array the format documents fails there, before any check that
would read inside them, and is a problem on the entry rather than an exception out of the call
[[r:unresolvable-packs-fail-loudly]].

Filling in is the kit's defensible work [[r:kit-completes-partial-source-manifests]]. Three parts
of it need pinning beyond what that requirement fixes.

The first is the version form, where reading and writing take different rules and only one of them
is the kit's to choose. On read the kit accepts both the array and the SemVer string, with
`format_version` 3 the single exception that narrows to the string
[[r:kit-completes-partial-source-manifests]] — the shape of the reference itself, which types every
version as either form and pins only version 3
[[f:manifest-declares-pack-identity-version-and-module-kinds]]. So `version-form-unsupported` has
exactly one trigger, an array version in a manifest declaring format version 3, and placeholder
recognition falls out of the same rule: every placeholder spelling is legal except an array-shaped
one at 3. That check needs no other pack, so it runs with the parse, and `header-version-specified`
fires only on a written version that is not one of the placeholders.

On write there is nothing to decide: completion always sets the version as a SemVer string
[[r:kit-completes-partial-source-manifests]]. That form is legal at every format version — it is the
one form version 3 accepts and one of the two everywhere else — so the write path never reads
`format_version` at all, and a pre-release completes like any other version.

The second is which entries completion touches. Every dependency a pack has is written in that
pack's own manifest, so the entry itself is the discriminator
[[r:kit-completes-partial-source-manifests]]. An entry carries exactly one identifier, and one
carrying both a `uuid` and a `module_name` or carrying neither names nothing the kit can act on
[[f:pack-dependency-entries-name-a-uuid-or-a-module-name-plus-a-version]]. A `uuid` that a
discovered pack claims as its header uuid names a dependency inside the workspace, and the kit
supplies its version; a `module_name`, and a `uuid` no candidate claims, are outside it and the kit
touches neither. The match is made on the lowercased form of both sides, which is the form the pack
record carries and the form the reference writes a uuid in
[[d:uuids-are-compared-and-reported-lowercased]].

That test cannot run until every candidate has been read, which is why classification waits for the
identity index. It reads a uuid no candidate claims as external, and cannot do better: a mistyped
workspace uuid, a sibling whose own manifest never parsed, and a genuine outside pack are the same
input. What keeps that from misleading anyone is that the entry is a problem either way — an
external entry the kit will not complete must carry its own version, so an entry pointing at a
sibling that failed is reported as missing one, and the pack holding it is invalid on that record
alone. The one case that is never ambiguous is an entry naming a workspace pack that also specifies
a version: the kit reports it rather than reading the version as an intent to stay outside
[[d:workspace-uuid-entry-may-not-carry-a-version]]. On an inside entry a placeholder leaves the
version unspecified, which is the form the requirement demands
[[r:kit-completes-partial-source-manifests]]. On an external entry the kit reads nothing at all: it
passes the entry through untouched, so whatever version the author wrote there — placeholder-shaped
or not — is the version that entry carries. Only an entry with no version is missing one. What
`[0, 0, 0]` means outside this workspace is the author's business and not a thing the kit can know.

The third is ordering. The uuid in an entry is the author's, but the version is the depended-on
pack's owning package's, so completing an entry needs a pack other than the one being completed and
cannot run during its parse. The kit reads and per-pack-checks every candidate, indexes identity
across the whole set, completes each candidate against that index, and closes the set last (below).
Completion is keyed on the target sitting unambiguously in the index, not on the target having
survived: an entry whose target bears a pack and then fails is still given its version, and the
depending pack is invalidated with it rather than shipping an entry with a hole in it. Two candidates
claiming one uuid is the exception, because their package versions can differ and nothing but
arrival order would choose — the same reason no claimant of a duplicated uuid is preferred over
another [[r:uuids-are-claimed-once-in-a-workspace]] — so completion leaves that entry alone and
reports the depending pack against an unresolved target, which is where closure would put it
regardless.

Completion can fail on one field and finish the rest, which raises what the document then holds. A
field the kit cannot complete keeps exactly what the source wrote — the placeholder, or the omission
[[d:an-uncompletable-field-keeps-what-the-source-wrote]] — so the document is always the author's
manifest plus whatever the kit could add, and never carries a value the kit invented or a form the
manifest cannot express. The entry is invalid whenever that happens, so nothing deploys a
half-filled manifest; what the rule buys is that the document beside those problems still shows what
the author actually wrote, which is what a developer needs to fix it. It also covers the one way a
dependency version can now fail to arrive: a target whose owning package states no usable version
reports that against itself, so the entry stays as written and the walk below takes the dependent
with it, rather than the same fault being told twice.

## Resolving the set and reporting problems

Identity is what the set is keyed by — queries match on it and every completed dependency entry
points at one — so the index the kit builds is of header uuids and the packs claiming them
[[r:uuids-are-claimed-once-in-a-workspace]]. The format's own reason for that is narrow: a header
uuid is what tells one pack from every other [[f:manifest-declares-pack-identity-version-and-module-kinds]],
and no comparable statement covers the uuid on a module, so the index holds no module uuids and two
modules sharing one are not merely unreported but invisible to the kit by construction. That index
is also what sorts dependency entries into inside and outside the workspace, another question no
single pack's data can answer.

Which entries are valid is then one pass's answer, and it runs after completion rather than before
it, because a candidate can fail at any stage: an unreadable manifest, a header uuid claimed twice, a
package version the manifest's form cannot express, a dependency target that did not survive
[[r:unresolvable-packs-fail-loudly]]. Every earlier stage only records problems against a candidate;
the closing pass alone invalidates. Invalidation is transitive — with A depending on B and B on C,
C's failure takes B and B's takes A — and since a candidate never becomes valid again, that is one
walk backwards along the dependency edges from the candidates that failed on their own, not a pass
repeated until it changes nothing [[d:invalidation-propagates-along-dependency-edges]]. What the
walk guarantees is the rule worth stating: no valid entry points at an entry that is not.

A problem is a record a consumer can act on, not a rendered sentence
[[d:problems-carry-a-closed-set-of-codes]]. Its code is what a CLI groups by, what a test asserts
on, and what tells the dev server whether a pack is worth retrying after a rebuild. A problem no
longer says which pack it is about, because it rides on that pack's entry and the entry already
does; what it still owes is the part of the pack the code is about — which dependency entry failed,
which module, which other pack claims its uuid — and that referent is typed per code rather than rendered into
the message or swept into a shared bag of details. The closed set, the condition each code covers,
and what each carries beside its message, is the interface consumers build against:

| code | raised when | carries |
|---|---|---|
| `manifest-unreadable` | the source manifest cannot be read, or is not valid JSON | — |
| `manifest-shape-invalid` | the manifest is JSON but not the shape the format documents — a top level that is not an object, or a `header`, `modules`, or `dependencies` that is not the object or array it must be | which of them was wrong, and the JSON type found there |
| `header-uuid-missing` | the header carries no uuid, or carries one that is not the documented hex form [[d:a-uuid-is-the-documented-hex-form]] | what the header carried, where it carried anything |
| `header-uuid-duplicated` | another pack in the workspace claims this pack's header uuid | the uuid, and the source directory of every pack claiming it |
| `header-name-specified` | the source manifest specifies a header name | — |
| `header-version-specified` | the source manifest specifies a header version that is not a placeholder | — |
| `version-form-unsupported` | a version is written as an array in a manifest declaring `format_version` 3 | where it was written — the header, or a dependency entry's index |
| `module-type-missing` | a module declares no type | the module's index |
| `kind-uncorroborated` | no module corroborates the kind the pack's directory declares | — |
| `kind-contradicted` | a module of the other kind is present | the offending module's index |
| `package-version-unusable` | the owning package states no version, or states one that is not a version | the version as `package.json` carries it, where it carries anything |
| `dependency-entry-malformed` | a dependency entry carries both a `uuid` and a `module_name`, or neither | the entry's index |
| `dependency-version-specified` | a dependency entry naming a pack in the workspace also specifies a version | the entry |
| `dependency-version-missing` | an external dependency entry — a built-in module, or a uuid no pack in the workspace claims — carries no version at all | the entry |
| `dependency-target-unresolved` | a dependency entry names a pack in the workspace that did not survive as a resolved pack, or one the index cannot resolve to a single candidate | the entry |

"The entry" is its index in the `dependencies` array together with the `uuid` or `module_name` it
carries, since a pack may hold several and an index alone reads as nothing at the console.

Every code above invalidates, so there is no warning tier and no valid entry carries problems. One
candidate can trip several at once — a v2 manifest carrying `"1.2.3"` is both
`header-version-specified` and `version-form-unsupported` — and each trip is its own record on that
entry: there is no precedence among the codes and no primary one to group by
[[d:every-observed-problem-is-reported]]. Electing a primary would make the code a worse answer for
both jobs it holds, since a test asserting on one condition would have to know which other condition
outranked it. What bounds the burst is data rather than ranking: a check whose input an earlier
failure withheld does not run, so an unreadable manifest yields exactly one record.

Exhaustiveness needs no argument now that one list holds every pack found
[[r:pack-discovery]] — a consumer holding the list holds everything the workspace definition admits,
with no second place to look. What is worth stating is that the guarantee is over the definition and
not over the disk, which is where a pack can still vanish quietly: candidates come from the
workspace definition rather than a tree walk [[r:packages-come-from-the-workspace-definition]], and
a matched directory is a member only where it holds a valid `package.json`
[[f:npm-workspaces-is-an-array-of-paths-or-globs]] — so a directory holding
`behavior_pack/manifest.json` but no `package.json` of its own is never a member, never a candidate,
and gets no entry at all, the libraries skipping it and returning the rest
[[f:a-malformed-member-manifest-fails-the-whole-enumeration]]. Repairing a package that fell out of
the definition is the package manager's own error to surface. The other fault in that `package.json`
— present but unparseable — never reaches this list at all, because the call it would have appeared
in throws instead [[d:workspace-failures-throw-and-pack-failures-are-records]].

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
it learned as one value [[d:the-pack-set-is-the-single-returned-value]]: the list of entries and the
queries over it. Keeping the queries on that value is what makes matching by package name, pack
name, pack uuid, or status [[r:pack-search]] a lookup rather than a second traversal — the set is
already in memory and already indexed by those keys, so a query never touches the filesystem and
never disagrees with the set the caller is holding. Two of that requirement's rules are worth
holding together while building the query: criteria conjoin, and a query that names no status sees
only valid entries. So the invalid ones are reachable but never accidental, and the index a query
runs against is the entry list itself rather than a pre-filtered copy of it.

The entry is the whole product, so its fields are pinned here rather than left to the builder —
a consumer receiving data instead of text still has to know the shape of the data
[[r:dev-kit-provides-a-library]] [[r:pack-record-details]]. It is a union discriminated by `status`,
read before anything else [[r:pack-discovery]], and what the invalid arm drops is set by what the
kit managed to read rather than by the status itself
[[d:an-invalid-entry-keeps-every-detail-its-sources-hold]].

| field | form | on an invalid entry |
|---|---|---|
| `status` | `valid` or `invalid` | the discriminant |
| `problems` | the problems that invalidated the entry | present; absent on a valid entry |
| `uuid` | the header uuid, lowercased [[d:uuids-are-compared-and-reported-lowercased]] | present unless the manifest never parsed or declares no header uuid |
| `manifest` | the manifest document, completed as far as it could be [[d:an-uncompletable-field-keeps-what-the-source-wrote]] | present unless the manifest never parsed |
| `name` | the completed `header.name` string | present |
| `version` | the owning package's `version`, the string as `package.json` holds it [[d:pack-record-version-is-the-packages-own-string]] | present unless that package declares none |
| `kind` | `behavior` or `resource` [[d:pack-kind-is-spelled-behavior-or-resource]] | present |
| `packageName` | the owning package's `package.json` `name` | present |
| `packageDir` | the owning package's directory | present |
| `sourceDir` | the pack's source directory, the one holding `manifest.json` | present |
| `outputDir` | the pack's built-output directory, present or not | present |

The right-hand column is the whole point of the change that produced it, and the case it exists for
is a pack invalidated only because something three dependency edges away failed: its manifest parsed,
its header uuid is there, and it keeps both, along with everything else a consumer needs to name it,
locate it, and say what went wrong. Absence is what the kit could not read, never a consequence of
being invalid — a query by uuid restricted to invalid entries has to be able to match
[[r:pack-search]]. What can never go missing is what the workspace definition and the directory
already carried before any manifest was opened: membership guarantees a readable `package.json`
[[f:npm-workspaces-is-an-array-of-paths-or-globs]], the fixed path carries the kind, and the output
location is computed rather than read [[d:built-output-location-is-computed-not-probed]]. That is
also why `name` and `version` are here for a candidate whose manifest never parsed at all. Neither
is ever the manifest's to give — specifying either in the source is an error
[[r:kit-completes-partial-source-manifests]] — so both are derived from the owning package the
moment the candidate is found, and completion only copies them into the manifest document later.
`version` in particular is the package's own string, never the manifest's and never rewritten to
suit one [[d:pack-record-version-is-the-packages-own-string]]. The one entry that carries no version
is the one whose package declares none: the field is omitted rather than filled with something
invented, and that package is a problem in its own right, so the entry is invalid whichever way a
consumer reads it [[r:pack-record-details]]. A third status for "found but unidentified" would name
a distinction the optional fields already make.

The list those entries arrive in is ordered by owning package and then by kind, which is a total
order because a package holds at most one pack of each [[r:membership-from-source-manifest-presence]]
[[d:entries-come-back-in-a-stable-order]]. Neither library promises an order and the two do not
agree, so without one a CLI's output and a test's assertion would both shift under a manager change.

Every path among them, `packageDir` included, is relative to the workspace root and names a
directory, never the manifest file inside it
[[d:pack-record-paths-are-workspace-relative-directories]]. Two forms in that table
are choices a consumer cannot re-derive and would otherwise have to probe for. The version is one:
the manifest's own form varies with its format version, so a set can hold both an array and a
string, and a record field that inherited that variance could not be compared across two packs. The
kind is the other: the enum is not the directory name it was read from, so a consumer building a
path composes it from `outputDir` rather than interpolating the enum. The uuid is canonicalised
rather than passed through for a related reason: a query matches exactly [[r:pack-search]], so a
uuid a caller read off one record has to be the same string as the one indexing it, whatever case
the manifest that carried it used.

## Components

```yaml
components:
  - id: problem-model
    responsibility: the problem union — its closed code set, the referent each code carries, its message, and the constructors other components raise through
    excludes: deciding which conditions are problems, and naming the pack a problem is about
  - id: workspace-packages
    responsibility: resolve a workspace root into its member packages — the root package among them, added where the manager's library omits it — each with name, directory, and parsed package.json
    excludes: anything specific to Minecraft packs
  - id: pack-candidates
    responsibility: probe each package's two fixed source-manifest paths and emit one candidate per hit, carrying package, kind, source and built-output directories, and the pack name and version derived from the owning package — raising where that package states no version or states one that is not a version
    excludes: reading manifest content, and any filesystem probe of the built-output location
    after: [workspace-packages, problem-model]
  - id: manifest-document
    responsibility: parse a candidate's manifest into the open typed document, reject a document whose known subset is not the shape the format documents, and apply every check needing only that pack — header uuid presence and form, kind corroboration, an array version where the format version requires the string, placeholder recognition, and each dependency entry carrying exactly one identifier
    excludes: any check that needs another pack's data, including whether a dependency uuid names a pack in the workspace
    after: [pack-candidates]
  - id: pack-identity-index
    responsibility: index every candidate's header uuid on its lowercased form, flagging every pack claiming a uuid more than one claims, then class each dependency entry as inside or outside the workspace and flag an inside entry specifying a version and an outside one carrying none
    excludes: deciding which entries are valid
    after: [manifest-document]
  - id: manifest-completion
    responsibility: per candidate, copy the candidate's name and version into the manifest document as a SemVer string, and fill the version of each dependency entry the index classed as inside, leaving untouched what it cannot complete — raising where an inside entry resolves to more than one candidate, against the pack whose manifest it is
    excludes: deciding which entries are valid, and deriving the name and version themselves
    after: [pack-identity-index]
  - id: pack-set-closure
    responsibility: mark every candidate carrying a problem invalid, then everything reaching one along the dependency edges, and yield the one list of entries
    excludes: any check other than whether a completed dependency's target is still valid
    after: [manifest-completion]
  - id: pack-set-api
    responsibility: the exported entry point, the entry union keyed on `status`, and the queries over a held set — conjoined criteria, and valid entries only where status goes unnamed
    excludes: filesystem access of its own
    after: [pack-set-closure]
```
