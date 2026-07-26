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
[[d:workspace-uuid-entry-may-not-carry-a-version]]. A placeholder is not a version anywhere the kit
reads one, so a single recognition serves both sides to opposite ends
[[d:a-placeholder-version-is-no-version-everywhere]] — on an inside entry it leaves the version
unspecified, which is the form the requirement demands, and on an external entry it is the missing
version the kit has already refused to supply.

The third is ordering. The uuid in an entry is the author's, but the version is the depended-on
pack's owning package's, so completing an entry needs a pack other than the one being completed and
cannot run during its parse. The kit reads and per-pack-checks every candidate, indexes identity
across the whole set, completes each candidate against that index, and closes the set last (below).
Completion is keyed on the target sitting unambiguously in the index, not on the target having
survived: an entry whose target bears a pack and then fails is still given its version, and the
depending pack is invalidated with it rather than shipping an entry with a hole in it. Two candidates
claiming one uuid is the exception, because their package versions can differ and nothing but
arrival order would choose — the same reason no claimant of a duplicated uuid is preferred over
another [[r:uuids-are-claimed-once-in-a-workspace]] — so the entry is left uncompleted and its
dependent is reported against an unresolved target, which is where closure would put it regardless.

What completion writes is the target's package version in the *depending* manifest's form, and the
two manifests need not declare the same format version [[d:completion-version-form-follows-format-version]].
A target at format version 3 carries `1.2.0-beta.1` into its own header without trouble, while a
dependent below 3 cannot express it in the array at all — so that failure is the dependent's own and
no other pack ever reports it. It is a distinct code from the one a pack raises against its own
owning-package version, and the component that writes the entry is the one that raises it.

## Resolving the set and reporting problems

A uuid is claimed once by anything in the workspace, a header and a module alike
[[r:uuids-are-claimed-once-in-a-workspace]], so a claim is what the check is over rather than a pack
or a module: every claim carries what made it — this pack's header, or this module of this pack —
and a uuid two claims share fails all of them, whichever kinds those claims are. That is what covers
a header uuid colliding with a module uuid, which is neither of the two collisions the requirement
lists yet is the same rule broken. The collisions inside one manifest are visible to a pack reading
only itself and are caught there; the rest need the index that holds every claim in the workspace. A
module with no uuid makes no claim — it has its own problem already — so a uuid-less module is never
some other uuid-less module's duplicate. That index is also what sorts dependency entries into
inside and outside the workspace, another question no single pack's data can answer.

Which entries are valid is then one pass's answer, and it runs after completion rather than before
it, because a candidate can fail at any stage: an unreadable manifest, a uuid claimed twice, a
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
which module, which other claimant — and that referent is typed per code rather than rendered into
the message or swept into a shared bag of details. The closed set, the condition each code covers,
and what each carries beside its message, is the interface consumers build against:

| code | raised when | carries |
|---|---|---|
| `manifest-unreadable` | the source manifest cannot be read, or is not valid JSON | — |
| `header-uuid-missing` | the header carries no uuid, or one that is not a uuid | — |
| `uuid-claimed-more-than-once` | a uuid this pack claims, from its header or one of its modules, is claimed by another claim anywhere in the workspace | the uuid, and every claim on it — each as the pack it belongs to, and the module index where a module made it |
| `header-name-specified` | the source manifest specifies a header name | — |
| `header-version-specified` | the source manifest specifies a header version that is not a placeholder | — |
| `version-form-unsupported` | a version is written in a form the manifest's format version does not carry | where it was written — the header, or a dependency entry's index |
| `module-type-missing` | a module declares no type | the module's index |
| `module-uuid-missing` | a module declares no uuid, or one that is not a uuid | the module's index |
| `kind-uncorroborated` | no module corroborates the kind the pack's directory declares | — |
| `kind-contradicted` | a module of the other kind is present | the offending module's index |
| `package-version-unusable` | the owning package's version is missing, unparseable, or cannot be written in the form this manifest's format version requires | the version as `package.json` carries it |
| `dependency-entry-malformed` | a dependency entry carries both a `uuid` and a `module_name`, or neither | the entry's index |
| `dependency-version-specified` | a dependency entry naming a pack in the workspace also specifies a version | the entry |
| `dependency-version-missing` | an external dependency entry — a built-in module, or a uuid no pack in the workspace claims — carries no version, a placeholder counting as none | the entry |
| `dependency-version-unrepresentable` | a dependency target's package version cannot be expressed in the depending manifest's version form | the entry, and the version that could not be expressed |
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
`behavior_pack/manifest.json` whose own `package.json` is missing or malformed is never a member,
never a candidate, and gets no entry at all. Nor does it throw: the workspace itself is readable, and
only workspace-level trouble throws [[d:workspace-failures-throw-and-pack-failures-are-records]].
Repairing a package that fell out of the definition is the package manager's own error to surface.

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
| `manifest` | the completed manifest document | present unless the manifest never parsed |
| `name` | the completed `header.name` string | present |
| `version` | the pack version as a SemVer string [[d:pack-record-version-is-a-semver-string]] | present unless the owning package's version cannot be parsed |
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
moment the candidate is found, and completion only copies them into the manifest document later. A
third status for "found but unidentified" would name a distinction the optional fields already make.

Every path among them, `packageDir` included, is relative to the workspace root and names a
directory, never the manifest file inside it
[[d:pack-record-paths-are-workspace-relative-directories]]. Two forms in that table
are choices a consumer cannot re-derive and would otherwise have to probe for. The version is one:
the manifest's own form varies with its format version, so a set can hold both an array and a
string, and a record field that inherited that variance could not be compared across two packs. The
field is read from the owning package rather than from the manifest for the same reason it is a
string — the two questions are separate, and a version the manifest's array cannot hold is still a
version the record states plainly, which is the case a prerelease raises. The
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
    responsibility: probe each package's two fixed source-manifest paths and emit one candidate per hit, carrying package, kind, source and built-output directories, and the pack name and version derived from the owning package
    excludes: reading manifest content, and any filesystem probe of the built-output location
    after: [workspace-packages, problem-model]
  - id: manifest-document
    responsibility: parse a candidate's manifest into the open typed document and apply every check needing only that pack — header and module uuid presence, a uuid claimed twice within the one manifest, kind corroboration, version form, placeholder recognition, and each dependency entry carrying exactly one identifier
    excludes: any check that needs another pack's data, including whether a dependency uuid names a pack in the workspace
    after: [pack-candidates]
  - id: pack-identity-index
    responsibility: index every uuid claim in the workspace on its lowercased form — each candidate's header, each of its uuid-bearing modules — flagging every claim on a uuid more than one claim carries, then class each dependency entry as inside or outside the workspace and flag an inside entry specifying a version and an outside one carrying none
    excludes: deciding which entries are valid
    after: [manifest-document]
  - id: manifest-completion
    responsibility: per candidate, copy the candidate's name and version into the manifest document in the form its format version requires, and fill the version of each dependency entry the index classed as inside and resolved to one candidate, raising where the form cannot express what has to be written, always against the pack whose manifest it is
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
