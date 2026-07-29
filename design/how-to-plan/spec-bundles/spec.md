# Publishing Specs

## Summary

This design specifies how a settled spec leaves this repository and becomes something an agent
elsewhere can build from: what the published bundle holds, what it is called, how its version is
decided, where it lands, and how a consumer reaches it. Its product is a contract — a bundle
layout, a naming scheme, a bump rule, a dependency manifest, a version record kept in this
repository's own tags, and the store guarantees the publishing automation must meet — stated
tightly enough that the automation, which belongs to
`harness`, can be built against it without reopening any of these choices. The problem it answers
is that builders work in other repositories and nothing crosses the boundary today: the bundle is
the only thing that will, and none of it exists. The constraint that shapes everything below is
that a version, once fetched, must resolve to the same bytes forever, which rules out every store
whose content is a moving reference and makes the choice of store the first thing settled.

## What a bundle holds

A bundle is a directory of four files, plus whatever the spec incorporates by reference
[[d:bundle-is-four-files-plus-incorporated-content]]:

```text
README.md         how to use a bundle of this format: what the files are, and how to fetch
                  the dependencies
spec.md           the spec's prose, every citation token struck
commitments.yaml  one flat list of what the design is committed to
package.json      name, version, description, files, repository, dependencies
```

`README.md` orients a builder who has just unpacked a bundle and has never seen one
[[d:bundle-carries-an-orientation-file]]. What it explains is the *format*, not the design: the
other three files and what each is for, that the spec's prose is the primary source and
`commitments.yaml` a flat list of what the design is committed to, that the design's upstream
dependencies are not vendored, and the commands that fetch them. It is fixed boilerplate written by the deriver, identical in every npm bundle
except for the bundle's own name, which appears in the example commands
[[d:orientation-file-is-a-boilerplate-readme]]. `README.md` is the name because it is where both a
consumer unpacking a tarball and the registry's own package page already look, so the orientation
lands without a builder being told where to look for it. Its content is tied to the publication
format: were bundles to move off npm, this file is what changes, since the commands in it are npm's.

`spec.md` is the source spec byte-for-byte apart from the removal of every citation token — the
token being `[[<k>:<id>]]` with a kind letter of `f`, `r`, or `d`
[[f:spec-citation-token-grammar]]. Removing one leaves the line's spacing to repair, and the repair
is stated because it is what a reader sees: a run of spaces the removal left doubled collapses to
one, and a token that ended a line takes the space before it with it, so no line ends in whitespace
[[r:token-strip-leaves-the-line-as-written]] — two trailing spaces are a hard line break
[[f:trailing-spaces-are-a-hard-line-break]], a rendering change the strip never intends. Nothing
else is rewritten, reordered, or summarised, so the derivation is auditable by diffing the two
files. The `## Open questions` section never survives, because a settled spec is one whose spec.md
holds no open question [[f:settled-state-is-computed-from-spec-content]].

`commitments.yaml` is the streamlined extraction the builder reads as a crib beside the prose
[[r:derived-implementer-view]], and it is a YAML document [[d:commitments-are-a-yaml-document]]. It
carries every active requirement binding the design — its own and every wider-scope one whose
`applies_to` reaches it — and every decision the design holds at `accepted` or `tolerated`, which is
the reviewable foundation list minus the one kind that issues no obligation
[[r:easily-reviewable-foundations]]. Rejected decisions, retired requirements,
and open questions are left out [[d:extraction-carries-live-commitments-only]]. Facts are left out
entirely, and so are the citation tokens that pointed at them: a token marks a claim that would
change were its foundation false [[r:explicit-intent]], which is the argument the spec was settled
on rather than anything a builder following it has to re-run [[r:derived-implementer-view]].

The two kinds arrive as **one flat list**, and nothing in the document tells them apart
[[d:commitments-are-one-flat-list-of-id-and-statement]]. The top-level key `commitments` maps to a
sequence, and an entry carries exactly two fields: an `id` prefixed with its kind letter — `r:` or
`d:`, the same letters a citation token uses [[f:spec-citation-token-grammar]] — and a `statement`,
copied from the source entry:

```yaml
commitments:
  - id: d:first-version-is-one-zero-zero
    statement: a bundle's first published version is 1.0.0, backfilled bundles included
  - id: r:bundle-is-fetched-by-name-and-version
    statement: |
      a builder outside this repository obtains a spec's bundle from the spec's name and a
      version, or from the name alone to get the latest
```

The prefix is there to keep two ids from colliding, since the one list draws from two id namespaces,
and nothing in the bundle explains what it means. A requirement's `force` and a decision's `status`
do not travel [[f:requirement-entry-fields]] [[f:decision-status-values]]: what reaches the builder
is that the design is committed to the statement, and whether it got there by the owner's fiat or by
the spec's own reasoning changes nothing about what to build.

The `commitments` key is always present, mapping to an empty sequence where a design has none.
Entries are ordered by the id with its prefix ignored, ties broken by the full id — the one
rendering rule the document keeps, because the publish gate below compares a derived bundle byte for
byte against the bundle re-derived at its last tag, and an unstable order would read as a change
that never happened. Ignoring the prefix in the sort is what keeps the list flat on the page rather
than grouped into the two sections it was just collapsed out of.

A bundle carries its own design in full, so any file the spec links by a repo-relative path that
resolves inside the design's own directory — an `artifacts/` script, a diagram — is copied into the
bundle at that same relative path, and the link in `spec.md` is left untouched and therefore still
resolves. A link that resolves outside the design's directory is left as written and is not
vendored [[r:a-bundle-is-self-contained]] [[d:incorporated-content-is-vendored-by-relative-path]].
What the spec depends on from *another* design is not vendored either; it is named in the manifest
and fetched separately (below).

`package.json` carries exactly six fields — `name`, `version`, `description`, `files`,
`repository`, and `dependencies` — and no others [[d:bundle-manifest-is-minimal]]. `name` is the
scoped bundle name and `dependencies` the derived block, both below. `files` lists the four files
plus any vendored paths. `description` is the first sentence of the bundle's own `spec.md`
`## Summary` — its text up to the first period followed by whitespace, collapsed onto one line.
`repository` is the same literal in every bundle, in the object form, and is where a reader goes to
see the argument the bundle omits:

```json
"repository": { "type": "git", "url": "git+https://github.com/twin-digital/plan-opus.git" }
```

`version` is the one field the deriver cannot fill, because the version is computed by diffing the
derived bundle against the last one this repository tagged. The deriver emits the manifest without
it, and the publisher writes the computed version in immediately before publishing.

## Naming a bundle

A bundle is named by a **product**, and by a **feature** within that product where the product is
large enough to subdivide. Every bundle has a product; a feature is optional. Neither is derived
from where the design sits on disk — a product is not an area and a feature is not a design
directory — and the planning repository's own name appears in no bundle name, because there is only
one of them and it distinguishes nothing [[d:bundle-identity-is-product-and-feature]].

Every bundle publishes under one fixed npm scope, the literal `@td-spec`, which is a registered npm
organization and does not vary. The product follows the slash and the feature, where there is one,
follows a dot [[r:bundle-name-is-the-td-spec-scope]]:

```text
@td-spec/<product>              a product that does not subdivide
@td-spec/<product>.<feature>    one feature of a product that does
```

Product and feature names are kebab-case, so the dot is the only period in a bundle name and
separates the two unambiguously. npm accepts a period inside a scoped package's name part — its own
name validator reports `@jane/foo.js` valid [[f:npm-package-name-may-contain-a-dot]] — so the
separator needs nothing from the registry beyond what it already does. The login feature of the
`my-app` product therefore publishes as `@td-spec/my-app.login`, and a consumer fetches
`@td-spec/my-app.login@2.1.0`, or `@td-spec/my-app.login` for the latest.

Because the mapping is not derivable from the tree, it is declared. The **product manifest** is the
file `products.yaml` at the repository root — the path `products.yaml`, outside the `design/` tree
— and naming a spec there is what makes it publishable at all
[[r:settle-publishes-a-versioned-bundle]]. It maps each product name to what it publishes: either one design scope directly, for a product with no features, or a mapping
of feature names to design scopes [[r:product-manifest-declares-bundle-identity]]:

```yaml
my-app:
  login: how-to-plan/authoring
  billing: minecraft/dev-kit
some-lib: minecraft/test-lib
```

That file names three bundles: `@td-spec/my-app.login`, `@td-spec/my-app.billing`, and
`@td-spec/some-lib`. A product's value is one or the other, never both — a product that publishes a
bundle of its own holds no features, and one that holds features publishes no bundle of its own, so
`@td-spec/my-app` names nothing. Product names are unique across the file, feature names are unique
within their product, and a design scope appears at most once in the whole file, since a spec has
one bundle identity. Every design scope named must resolve to a design that exists.

A design the manifest does not name publishes nothing [[r:settle-publishes-a-versioned-bundle]],
and that is a perfectly good end state — a design that produces no software has nothing to publish
and is not made to invent a product for the sake of it. The checker still reports a settled spec
with no bundle identity, as a warning: not a gate on the merge, but a nudge for the case where the
manifest entry was simply forgotten [[d:undeclared-identity-publishes-nothing]].

## Where bundles land

Bundles are published as packages on the public npm registry at `registry.npmjs.org`, with
`--access public` [[d:npm-registry-is-the-publication-target]] [[d:bundles-publish-publicly]]. The
repository is public, so a public bundle exposes nothing the design tree does not already.

The registry is chosen because it already provides, as documented behaviour, all three guarantees
this design has to hold, and none of them then has to be built:

- **Fetch by name and version, from outside.** `npm install @td-spec/my-app.login@2.1.0` fetches that exact
  bundle, and its upstream bundles with it
  [[f:npm-install-fetches-a-package-and-its-dependencies]], with no clone and no knowledge of this
  repository's layout [[r:bundle-is-fetched-by-name-and-version]]. To read one bundle without its
  upstreams, `npm pack @td-spec/my-app.login@2.1.0` writes that tarball and nothing else
  [[f:npm-pack-fetches-a-published-package-by-spec]].
- **Fetch by name alone.** The registry keeps a moving `latest` tag per package that an install
  with no version specifier resolves through, and publishing moves it to the version just published
  [[f:npm-latest-tag-serves-versionless-installs]], so `npm install @td-spec/my-app.login` is the "latest"
  half of the same requirement.
- **Immutability.** A name and version combination, once published, can never carry different
  content — not even after the version is removed [[f:npm-version-identity-is-permanent]] — which
  is the requirement, enforced by the store rather than by our own discipline
  [[r:published-bundle-versions-are-immutable]].

One hole in that last guarantee is worth a builder knowing, and it does not close with age. A
package with no dependents in the registry, under 300 downloads a week, and a single owner may be
unpublished whenever its owner likes — a spec bundle's profile exactly
[[f:npm-unpublish-is-conditional-not-time-limited]]. So content never changes under a pin, but
availability is not the store's promise at any age: what it guarantees is immutability, and a
withdrawn version cannot be republished under the same name and version by anyone, us included
[[f:npm-version-identity-is-permanent]].

## Dependencies

A bundle states what it depends on in `package.json`'s `dependencies`, as bundle names and version
ranges. That list is derived, not authored: for each fact the spec cites, if the fact's source is a
`url` written relative to the repository root [[f:in-repo-source-url-is-repo-relative]] and
resolves to another design's `requirements.yaml` or `spec.md`, that design's bundle is a dependency
[[r:bundle-dependencies-come-from-cited-fact-sources]]. This works because a reliance on
another design's output is already recorded that way — as a fact sourced by repo-relative url and
verbatim quote to the upstream's requirement [[f:cross-design-dependency-is-recorded-as-a-fact]] —
so the dependency edge is already in the tree and needs only reading, and the facts themselves can
be dropped from the bundle without losing it.

Those two filenames are the whole of the rule, and the narrowness is the point: any other source is
evidence provenance rather than a commitment leaned on. A `run` names captured output and carries no
url at all, so it yields no edge — deliberately, since what a probe observed is not something an
upstream promised. Two limits are worth stating because the filenames alone do not give them: a
source resolving inside the citing design's own directory yields nothing, a bundle never depending
on itself; and a source resolving into a design with no entry in `products.yaml` yields nothing
either, reported alongside the warning above, since there is no bundle there to depend on.

Each dependency is written as a caret range on the version the upstream bundle's newest tag
records at the moment of publish: an upstream tagged at 2.1.0 is depended on as `^2.1.0`
[[d:dependency-ranges-are-carets-on-the-latest-tag]]. A caret admits later minor and patch
versions, which by the bump rule below add commitments or change prose but never remove or alter
one, and excludes the next major, which does.

The derivation therefore runs in two passes, and they are separable. The first reads a bundle's
cited facts and yields its edges alone — which bundles it depends on, with no version attached —
and it needs nothing tagged to run. The second fills in that bundle's ranges at the moment the
bundle is derived, reading each upstream's newest tag then.

Pinning the upstream's current version is what forces the split, and it puts one precondition on
deriving any bundle: every bundle it depends on already carries a tag, either from an earlier run or
from this one. A bundle whose upstream has never been tagged cannot be derived, and waits. That is a
condition on one bundle rather than a rule about what a run covers — whoever schedules a run
satisfies it by taking bundles in the order the first pass's edges give, and scheduling is
`harness`'s. Because a bundle tagged moments earlier is tagged, a single run can satisfy the
precondition for a whole graph, which is what lets the cold-start backfill below stand up every
bundle at `1.0.0` at once. A bundle inside a dependency cycle can never satisfy it: it is
never derived, publishes nothing, and the cycle is reported.

The consumer's verb is `npm install`, not `npm pack`: `npm install @td-spec/my-app.login@2.1.0` in an empty
directory fetches that bundle *and* the packages it depends on
[[f:npm-install-fetches-a-package-and-its-dependencies]], unpacking each under `node_modules/` at
its own scoped name — the bundle at `node_modules/@td-spec/my-app.login`, each upstream beside it. `npm
pack` retrieves one tarball and resolves no `dependencies` at all, so it is the verb for reading a
single bundle and never for building against one. Installing is what makes it correct for a bundle
to carry only its own design and leave the rest to be fetched separately
[[r:a-bundle-is-self-contained]].

## Versions and bumps

Each spec carries its own version line; there is no repository-wide version
[[r:settle-publishes-a-versioned-bundle]]. That line is recorded **here, by git tags** — a bundle's
last published version is the version its newest tag names, and the registry is distribution only
[[d:version-record-is-a-git-tag]]. A bundle's first published version is `1.0.0`
[[d:first-version-is-one-zero-zero]].

A tag is the bundle name, an at sign, and the version: `@td-spec/my-app.login@2.1.0`, or
`@td-spec/some-lib@1.4.0` for a product with no feature
[[d:tag-names-the-bundle-and-version]]. Git takes that name as written — a ref may carry slashes as
hierarchical separators so long as no component starts with a dot or ends with `.lock`, and an at
sign is barred only as the whole name or in the sequence `@{`
[[f:git-ref-names-admit-at-sign-and-slash]] — so the tag reads as the exact string a consumer would
type at `npm install`, and the two names never have to be translated into each other. Two bundles
sharing this repository never collide, because the bundle name is already unique.

The tags have to be in the checkout the run reads. A clone without them is not an error — it looks
exactly like a repository where nothing has ever been published, so every bundle re-derives, finds
no prior version, and republishes at `1.0.0`. That is a silent wrong answer rather than a failure,
and it is the default a workflow falls into: `actions/checkout` fetches one commit and no tags
unless asked [[f:checkout-action-fetches-no-tags-by-default]]. Fetching the tags is therefore a
condition the run must meet, and meeting it is `harness`'s.

Every later version is computed by diffing the new bundle's commitments — the requirement list and
the decision list in `commitments.yaml`, plus the components block in `spec.md` — against the previous
published version's [[d:bump-is-computed-from-the-commitment-diff]]:

- **major** — a commitment is removed or altered in place: a requirement no longer binds or its
  statement changed, a decision's statement changed or the decision left the accepted-or-tolerated
  set [[f:decision-status-values]], a component's `id`, `responsibility`, or `excludes` changed or the
  component is gone — those three being a component's whole interface, so nothing else about one
  can move [[f:component-interface-fields]] — or a dependency's major moved.
- **minor** — a commitment is added: a newly binding requirement, a newly accepted or tolerated
  decision, a new component.
- **patch** — anything else: prose, vendored content, a dependency's minor or patch.

The previous side of that diff is **re-derived, not downloaded**
[[d:previous-commitments-are-re-derived-at-the-tag]]. The planner takes the bundle's newest tag,
reads the commit it names, and runs the deriver over the design as it stood at that commit — the
same deriver, over the same sources — producing the bundle that commit would have published. It
then diffs the two derived bundles. Nothing parses a published artifact: the registry is never read
during a publish, and a bundle unpublished, unpublishable, or simply never fetched changes nothing
about what version comes next. A bundle with no tag has nothing to diff and takes `1.0.0`.

Re-deriving an old commit gives back what that commit published because the commitments are a
re-read rather than a re-render: each one is the `statement` of an entry sitting in a
`requirements.yaml` or a `decisions.yaml` at that commit, and those files do not change under a tag
that already names the commit. The one thing that can move both sides is the deriver itself — change
what travels into a bundle and every bundle re-scores at once, on the old side as much as the new.
That is the honest behaviour rather than a defect to design around, and it is worth knowing before
the derivation rules are edited.

The diff keys on the entry id [[d:bump-is-computed-from-the-commitment-diff]]. Two versions hold
the same commitment when they hold the same id, and its content is what the bundle carries for it:
the `statement` for a requirement or decision, and the `responsibility` and `excludes` for a
component. Renaming an id while leaving those untouched therefore reads as one commitment removed
and another added, and scores major. That is the intended reading rather than a gap in the rule: the
id is itself part of what a bundle commits to, since the crib names entries by it and a builder who
noted one down finds nothing under the old name.

Nothing outside those fields is compared, because nothing else reaches the bundle. A requirement
that hardened from `soft` to `hard`, or a decision that moved between `accepted` and `tolerated`,
changes no byte of `commitments.yaml` and so bumps nothing at all — those fields stopped travelling
when the list went flat, and a builder who never saw them cannot be broken by their moving. What
still scores is an entry leaving the list outright: a decision rejected, or a requirement retired or
no longer binding, is a commitment removed, and removal is major as it always was.

Where both a removal and an addition are present, the higher bump wins. The settling author may
raise the computed bump — a prose rewrite they judge breaking is theirs to call major — but never
lower it; the rule is the floor, not the proposal.

## Publishing at settle

Publishing happens when a settled spec merges to main [[r:settle-publishes-a-versioned-bundle]].
The moment is the merge, so `main` is the only thing published from. Everything below is stated of
one bundle, taken on its own: it goes through the same sequence whenever it is put through — resolve
its dependencies, derive it, compute its version, publish — and a bundle nothing has changed under
falls out at the third gate having published nothing. So which bundles a given merge puts through is
not this design's to say: putting every bundle through each time is correct, and so is any narrower
selection, because the gates make the two indistinguishable to a consumer. The harness is the actor
that publishes [[r:settle-publishes-a-versioned-bundle]]: the components below are what it runs, and
building the workflow around them — along with holding the npm credential that authenticates to the
`@td-spec` organization — belongs to `harness`. What is fixed here is the contract it publishes
against.

Three things stop a publish, each quietly:

- The spec is not settled — settled being what the checker computes: a `spec.md` holding no
  proposed decision, no open question, and no uncited live design-scoped requirement or
  accepted-or-tolerated decision [[f:settled-state-is-computed-from-spec-content]]. A spec that had
  been settled and is reopened publishes nothing further, and every version it already published
  stays fetchable [[d:leaving-settled-publishes-nothing]].
- The design has no bundle identity [[d:undeclared-identity-publishes-nothing]].
- The derived bundle matches the one re-derived at its newest tag. The comparison is file by file
  — `README.md`, `spec.md`, `commitments.yaml`, every vendored path, and `package.json` with
  `version` excluded, that field differing by construction on every publish. A dependency range
  that moved because an upstream was tagged at a new version is a difference like any other and
  publishes a patch; only a bundle unchanged in every other byte is skipped. Nothing is published
  and no version is burned, so a merge that only touched a brief or a fact does not march the
  version line forward for a consumer who would see no difference [[r:must-beat-doing-it-myself]]
  [[d:identical-bundle-skips-publish]].

`latest` only ever moves forward: it names the highest version ever published for that bundle. The
registry does not hold that line for us — publishing sets `latest` to the version just published
[[f:npm-latest-tag-serves-versionless-installs]], and `npm dist-tag add` will point `latest` at any
published version at all [[f:npm-dist-tag-can-retag-any-version]] — so the publisher enforces it
itself: it publishes only versions above the one this repository's newest tag records for that
bundle, and issues no dist-tag command against `latest` ever. Reversing that pointer would change what a versionless fetch returns, which
is the moving-reference behaviour this design exists to avoid [[d:latest-never-moves-backward]].

A spec that is superseded, rejected, or withdrawn therefore stops publishing and nothing else
happens: `latest` stays on the last version that was published, every published version stays
fetchable at its pin, and the bundle simply goes quiet. The registry carries no signal that the
spec is gone, and a consumer who wants to know goes to `products.yaml` and the design tree, where a
name that has left the map is the record. A feature repointed at a different design is not a
withdrawal at all — the bundle name is the identity, so the same version line continues with the
new design's content.

**Cold start.** Specs that settled before any of this existed — `how-to-plan/doc-structure` and
`minecraft/dev-kit` among them — are published by the first publishing run, at `1.0.0`, rather than
waiting for a next settle that may never come [[d:settled-specs-are-backfilled-on-the-first-run]].
A settled spec with no bundle is indistinguishable to a builder from a spec that does not exist,
and waiting leaves the store lying about what is settled. Backfill covers only designs given an
identity in `products.yaml`.

## Components

```yaml
components:
  - id: product-map
    responsibility: parse products.yaml, resolve a design scope to its bundle name, and report settled designs with no identity
    excludes: deciding what a product or feature should be called
  - id: dependency-resolver
    responsibility: two passes over cited fact sources — emit one bundle's versionless upstream edges, and emit its dependencies block with each upstream at a caret on the version its newest tag records; report a bundle whose edges put it in a cycle
    excludes: scheduling anything from the edges it emits, deciding any bundle's version, or publishing anything
    after: [product-map]
  - id: bundle-deriver
    responsibility: produce a bundle directory for one design — the boilerplate README.md, stripped spec.md, commitments.yaml, vendored content, and a package.json carrying every field but version
    excludes: deciding the version or pushing anything to a registry
    after: [product-map, dependency-resolver]
  - id: version-planner
    responsibility: find the bundle's newest tag, re-derive that commit's bundle, diff the new bundle's commitments, components, and dependency ranges against it, and compute the next version or report that nothing changed
    excludes: publishing or tagging the version it computed, and reading anything from the registry
    after: [bundle-deriver]
  - id: publisher
    responsibility: stamp a computed version into its derived bundle, publish it with public access, and tag the published commit with the bundle name and version
    excludes: the CI workflow, hooks, and run scheduling that invoke it, which are harness's
    after: [version-planner]
```
