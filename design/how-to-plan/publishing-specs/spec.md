# Publishing Specs

## Summary

This design specifies how a settled spec leaves this repository and becomes something an agent
elsewhere can build from: what the published bundle holds, what it is called, how its version is
decided, where it lands, and how a consumer reaches it. Its product is a contract — a bundle
layout, a naming scheme, a bump rule, a dependency manifest, and the store guarantees the
publishing automation must meet — stated tightly enough that the automation, which belongs to
`harness`, can be built against it without reopening any of these choices. The problem it answers
is that builders work in other repositories and nothing crosses the boundary today: the bundle is
the only thing that will, and none of it exists. The constraint that shapes everything below is
that a version, once fetched, must resolve to the same bytes forever, which rules out every store
whose content is a moving reference and makes the choice of store the first thing settled.

## Open questions

```yaml
questions:
  - id: settle-gate-fails-or-warns-without-an-identity
    question: r:settle-publishes-a-versioned-bundle is hard and unconditional, while d:undeclared-identity-publishes-nothing exempts a design absent from products.yaml and has the checker warn — should the requirement be qualified to admit that exemption, or should the gate fail the merge instead?
    closes: requirement
    gates: [undeclared-identity-publishes-nothing]
  - id: deprecation-trigger-and-message
    question: what records that a design has been superseded and by what, so a bundle can be deprecated — and what version range and message does the deprecation carry?
    closes: decision
    gates: [latest-never-moves-backward]
```

## What a bundle holds

A bundle is a directory of three files, plus whatever the spec incorporates by reference
[[d:bundle-is-three-files-plus-incorporated-content]]:

```text
spec.md           the spec's prose, every citation token struck
commitments.md    the requirements binding the design and the decisions it holds
package.json      name, version, description, files, repository, dependencies
```

`spec.md` is the source spec byte-for-byte apart from the removal of every citation token — the
token being `[[<k>:<id>]]` with a kind letter of `f`, `r`, or `d`
[[f:spec-citation-token-grammar]]. Removing one leaves the line's spacing to repair, and the repair
is stated because it is what a reader sees: a run of spaces the removal left doubled collapses to
one, and a token that ended a line takes the space before it with it, so no line ends in whitespace
[[d:token-strip-repairs-the-line]] — two trailing spaces are a hard line break
[[f:trailing-spaces-are-a-hard-line-break]], a rendering change the strip never intends. Nothing
else is rewritten, reordered, or summarised, so the derivation is auditable by diffing the two
files. The `## Open questions` section never survives, because a settled spec is one whose spec.md
holds no open question [[f:settled-state-is-computed-from-spec-content]].

`commitments.md` is the streamlined extraction the builder reads as a crib beside the prose
[[r:derived-implementer-view]]. It carries two lists — every active requirement binding the
design, its own and every wider-scope one whose `applies_to` reaches it, each with its id,
statement, and `force` [[f:requirement-entry-fields]]; and every decision the design holds at
`accepted` or `tolerated`, each with its id and statement [[f:decision-status-values]] — which is
the reviewable foundation list minus the one kind that issues no obligation
[[r:easily-reviewable-foundations]]. Rejected decisions, retired requirements, and open questions
are left out [[d:extraction-carries-live-commitments-only]]. Facts are left out entirely, and so
are the citation tokens that pointed at them: a token marks a claim that would change were its
foundation false [[r:explicit-intent]], which is the argument the spec was settled on rather than
anything a builder following it has to re-run [[r:derived-implementer-view]].

Its layout is fixed, because the version planner below diffs one release's `commitments.md`
against the previous one's, and two builders rendering the same commitments differently would diff
as a change that never happened:

```text
# Commitments

## Requirements

### <requirement id>

force: hard | soft

<statement>

## Decisions

### <decision id>

status: accepted | tolerated

<statement>
```

Both H2 sections are always present, holding no entries where the design has none of that kind.
Entries sit under their section ordered lexicographically by id. The `force` and `status` lines are
always written, `force` included where it takes its default of `hard` [[f:requirement-entry-fields]],
so an absent line never has to be read two ways. A statement is copied verbatim from its entry,
its internal line breaks kept and its trailing whitespace dropped.

The extraction is rendered markdown and there is no second, machine-readable copy of it
[[d:commitments-are-rendered-markdown]]. The only thing that parses it is the version planner, for
which the fixed layout is enough; a second serialisation of the same list is a thing to keep in
sync for a reader that does not exist [[r:must-beat-doing-it-myself]].

A bundle carries its own design in full, so any file the spec links by a repo-relative path that
resolves inside the design's own directory — an `artifacts/` script, a diagram — is copied into the
bundle at that same relative path, and the link in `spec.md` is left untouched and therefore still
resolves. A link that resolves outside the design's directory is left as written and is not
vendored [[r:a-bundle-is-self-contained]] [[d:incorporated-content-is-vendored-by-relative-path]].
What the spec depends on from *another* design is not vendored either; it is named in the manifest
and fetched separately (below).

`package.json` carries exactly six fields — `name`, `version`, `description`, `files`,
`repository`, and `dependencies` — and no others [[d:bundle-manifest-is-minimal]]. `name` is the
scoped bundle name and `dependencies` the derived block, both below. `files` lists the three files
plus any vendored paths. `description` is the first sentence of the bundle's own `spec.md`
`## Summary` — its text up to the first period followed by whitespace, collapsed onto one line.
`repository` is the same literal in every bundle, in the object form, and is where a reader goes to
see the argument the bundle omits:

```json
"repository": { "type": "git", "url": "git+https://github.com/twin-digital/plan-opus.git" }
```

`version` is the one field the deriver cannot fill, because the version is computed by diffing the
derived bundle against what is already published. The deriver emits the manifest without it, and
the publisher writes the computed version in immediately before publishing.

## Naming a bundle

A bundle is named by a **product**, and by a **feature** within that product where the product is
large enough to subdivide. Every bundle has a product; a feature is optional. Neither is derived
from where the design sits on disk — a product is not an area and a feature is not a design
directory — and the planning repository's own name appears in no bundle name, because there is only
one of them and it distinguishes nothing [[d:bundle-identity-is-product-and-feature]].

Every bundle publishes under one fixed npm scope, the literal `@td-spec`, which is a registered npm
organization and does not vary. The product follows the slash and the feature, where there is one,
follows a dot [[d:bundle-name-is-a-scoped-package]]:

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

Because the mapping is not derivable from the tree, it is declared. The file `products.yaml` at the
repository root — the path `products.yaml`, outside the `design/` tree — maps each product name to
what it publishes: either one design scope directly, for a product with no features, or a mapping
of feature names to design scopes [[d:product-map-declares-bundle-identity]]:

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

A design with no entry in `products.yaml` publishes nothing. The checker reports a settled spec
with no bundle identity as a warning and does not fail its settle gate, because a design that
produces no software has nothing to publish and should not be forced to invent a product
[[d:undeclared-identity-publishes-nothing]].

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
[[d:dependencies-are-derived-from-cited-fact-sources]]. This works because a reliance on
another design's output is already recorded that way — as a fact sourced by repo-relative url and
verbatim quote to the upstream's requirement [[f:cross-design-dependency-is-recorded-as-a-fact]] —
so the dependency edge is already in the tree and needs only reading, and the facts themselves can
be dropped from the bundle without losing it.

Those two filenames are the whole of the rule, and the narrowness is the point: a source pointing
anywhere else under a design directory is evidence provenance rather than a commitment leaned on.
An `artifacts/` url in particular is captured test output, which a fact may cite from any design's
directory — twenty of the pool's thirty-seven in-repo sources today — and deriving a dependency
from one puts a spurious edge into the publish order and a spurious entry into the manifest.

A directory counts as a design for this rule when it holds a `spec.md` or is named in
`products.yaml`; `design/minecraft/artifacts/`, which is neither, is not one. Three further rules
keep the derivation from over-reaching. A source resolving inside the citing design's *own*
directory yields no dependency; a bundle never depends on itself. A source resolving into a design
with no entry in `products.yaml` yields none, and the checker reports it alongside the warning
above. And several cited facts sourcing one upstream design yield one entry between them, not one
apiece.

Each dependency is written as a caret range on the upstream bundle's `latest` version at the moment
of publish: an upstream at 2.1.0 is depended on as `^2.1.0`. A caret admits later minor and patch
versions, which by the bump rule below add commitments or change prose but never remove or alter
one, and excludes the next major, which does.

The derivation therefore runs in two passes, and they happen at different moments. The first reads
every bundle's cited facts and yields the edges alone — which bundle depends on which, with no
version attached — and it runs for the whole set before anything is derived, because the run's
order is the topological sort of those edges. The second fills in one bundle's ranges at the moment
that bundle is derived, reading each upstream's `latest` then.

Pinning `latest` is what forces that split: the upstream must already be published when the
downstream's manifest is derived, so a publishing run takes its bundles in dependency order and
each upstream is derived, versioned, and published before any bundle depending on it is derived. An
upstream published in the same run therefore has a `latest` by the time its dependent reads for
one, which is what lets the cold-start backfill below publish a whole graph of bundles at `1.0.0`
in a single run. The order exists only where the graph is acyclic: a cycle publishes nothing, the
run leaving every bundle in it unpublished and reporting the cycle.

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
[[r:settle-publishes-a-versioned-bundle]]. That line lives in the registry — the versions published
under the bundle's name are the whole record of it, and nothing in this repository stores a second
copy. A bundle's first published version is `1.0.0` [[d:first-version-is-one-zero-zero]].

Every later version is computed by diffing the new bundle's commitments — the requirement list and
the decision list in `commitments.md`, plus the components block in `spec.md` — against the previous
published version's [[d:bump-is-computed-from-the-commitment-diff]]:

- **major** — a commitment is removed or altered in place: a requirement no longer binds or its
  statement changed, a decision's statement changed or its status left `accepted`/`tolerated`
  [[f:decision-status-values]], a component's `id`, `responsibility`, or `excludes` changed or the
  component is gone — those three being a component's whole interface, so nothing else about one
  can move [[f:component-interface-fields]] — or a dependency's major moved.
- **minor** — a commitment is added: a newly binding requirement, a newly accepted or tolerated
  decision, a new component.
- **patch** — anything else: prose, vendored content, a dependency's minor or patch.

The previous version is fetched rather than remembered: the planner runs `npm pack
@td-spec/<product>[.<feature>]@latest`, unpacks the tarball, and reads the `commitments.md` and `spec.md`
inside it [[f:npm-pack-fetches-a-published-package-by-spec]]. The commitments parse back into ids,
statements, and force or status by the fixed layout above, the components block out of the unpacked
`spec.md`, and the dependency ranges out of its `package.json`. Nothing else in the repository
records what a published bundle committed to. A bundle whose name has no published version has
nothing to diff and takes `1.0.0`.

Where both a removal and an addition are present, the higher bump wins. The settling author may
raise the computed bump — a prose rewrite they judge breaking is theirs to call major — but never
lower it; the rule is the floor, not the proposal.

## Publishing at settle

Publishing happens when a settled spec merges to main [[r:settle-publishes-a-versioned-bundle]].
The moment is the merge, so `main` is the only thing published from. A run derives *every* bundle
in `products.yaml`, not the ones a diff suggests changed: the ones that did not change fall out at
the third gate below having published nothing, which is what that gate is for, and no rule is
needed for deciding which merge touched what [[d:every-bundle-is-derived-each-run]]. Each bundle
goes through the same sequence — resolve its dependencies, derive it, compute its version, publish
— and the run takes them in the dependency order set out above. The harness is the actor that
publishes [[r:settle-publishes-a-versioned-bundle]]: the components below are what it runs, and
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
- The derived bundle matches the current `latest`. The comparison is file by file against the
  unpacked `latest` tarball — `spec.md`, `commitments.md`, every vendored path, and `package.json`
  with `version` excluded, that field differing by construction on every publish. A dependency
  range that moved because an upstream's `latest` moved is a difference like any other and
  publishes a patch; only a bundle unchanged in every other byte is skipped. Nothing is published
  and no version is burned, so a merge that only touched a brief or a fact does not march the
  version line forward for a consumer who would see no difference [[r:must-beat-doing-it-myself]]
  [[d:identical-bundle-skips-publish]].

`latest` only ever moves forward: it names the highest version ever published for that bundle. The
registry does not hold that line for us — publishing sets `latest` to the version just published
[[f:npm-latest-tag-serves-versionless-installs]], and `npm dist-tag add` will point `latest` at any
published version at all [[f:npm-dist-tag-can-retag-any-version]] — so the publisher enforces it
itself: it publishes only versions above the current `latest`, and issues no dist-tag command
against `latest` ever. Reversing that pointer would change what a versionless fetch returns, which
is the moving-reference behaviour this design exists to avoid. A spec that is superseded or
withdrawn is therefore deprecated instead, the registry showing the message to anyone installing it
while the content stays downloadable [[f:npm-deprecate-warns-on-install]]
[[d:latest-never-moves-backward]]. What records that a design was superseded, and what the
deprecation says, is the open question above: no artifact in the repository carries that today.

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
    responsibility: two passes over cited fact sources — emit the versionless upstream edges for every bundle in the run, and emit one bundle's dependencies block with each upstream at a caret on its published latest
    excludes: ordering the run from the edges it emits, deciding any bundle's version, or publishing anything
    after: [product-map]
  - id: bundle-deriver
    responsibility: produce a bundle directory for one design — stripped spec.md, commitments.md, vendored content, and a package.json carrying every field but version
    excludes: deciding the version or pushing anything to a registry
    after: [product-map, dependency-resolver]
  - id: version-planner
    responsibility: fetch and unpack the bundle's published latest, diff the derived bundle's commitments, components, and dependency ranges against it, and compute the next version or report that nothing changed
    excludes: publishing the version it computed
    after: [bundle-deriver]
  - id: publisher
    responsibility: order a run's bundles from the resolver's edge graph or report a cycle, then stamp each computed version into its derived bundle and publish it with public access
    excludes: the CI workflow and hooks that invoke it, which are harness's
    after: [version-planner]
```
