# Blind build plan — how-to-plan/spec-bundles

Derived from brief.md, requirements.yaml (design + area), decisions.yaml, the cited facts, and
doc-structure/spec.md. spec.md for this design NOT read.

## 0. What is being built

A **deriver + publisher** for spec bundles. `planning-lib` supplies the reads (settled status,
bundle-name resolution, commitment sets, upstream edges, token-stripped prose). This design owns
the *bundle format* and the *publish algorithm*; `harness` owns the CI wiring that calls it.

So the buildable surface is: a `derive(scope) -> BundleTree` function, a `plan(scope) -> PublishPlan`
function (version + skip decision), and a `publish(plan)` action. Everything else is data shape.

---

## 1. Modules

| module | responsibility | excludes |
|---|---|---|
| `product-manifest` | load `products.yaml`, resolve design scope → bundle name and back | anything about the design tree |
| `commitment-extractor` | build `commitments.yaml` content for a scope | reading files off disk (delegates to planning-lib) |
| `spec-renderer` | produce bundle `spec.md` — token-stripped prose | deciding which spec |
| `incorporation-collector` | find in-design-directory links in the spec and collect them for vendoring | rewriting links |
| `dependency-resolver` | cited fact sources → upstream design scopes → bundle names → dependency ranges | fetching anything |
| `manifest-builder` | build `package.json` | writing to disk |
| `readme-builder` | render the fixed orientation README | anything design-specific |
| `deriver` | assemble the four files + vendored content into a tree in memory | version, publish |
| `version-planner` | read tags, re-derive previous commitments, compute bump, apply author floor | tagging |
| `publisher` | byte-compare against latest, `npm publish`, write the git tag | deriving |

`[CHOSE]` This module split. Foundations name no components.

---

## 2. Public interface

```ts
// product-manifest
type ProductManifest = Record<string, string | Record<string, string>>;
loadProductManifest(repoRoot: string): ProductManifest
bundleNameForScope(m: ProductManifest, scope: string): string | null   // "@td-spec/opus-planning.publishing"
scopeForBundleName(m: ProductManifest, name: string): string | null

// commitments
type Commitment = { id: string; statement: string };   // id is "r:<id>" or "d:<id>"
extractCommitments(scope: string): Commitment[]

// derivation
type BundleTree = { files: Map<string, string | Buffer> };  // path relative to bundle root
deriveBundle(scope: string, opts: { version: string; dependencies: Record<string,string> }): BundleTree

// dependencies
type Edge = { scope: string; bundleName: string };
resolveUpstreamEdges(scope: string): Edge[]
dependencyRanges(edges: Edge[]): Record<string, string>   // { "@td-spec/x": "^1.4.0" }

// versioning
type Bump = "major" | "minor" | "patch";
computeBump(prev: Commitment[], next: Commitment[]): Bump
type PublishPlan =
  | { action: "publish"; bundleName: string; version: string; bump: Bump; tree: BundleTree }
  | { action: "skip"; reason: "unchanged" | "not-settled" | "no-bundle-name" };
planPublish(scope: string, opts?: { minimumBump?: Bump }): PublishPlan
```

`[CHOSE]` All names/signatures. Foundations fix none of them.

---

## 3. Concrete values and literals

### 3.1 `products.yaml` (repo root)

Two forms per product, per `r:product-manifest-declares-bundle-identity`:

```yaml
opus-planning:              # subdivided → features
  publishing: how-to-plan/spec-bundles
mc-dev-server: minecraft/dev-server   # not subdivided → single scope
```

Bundle name: `@td-spec/<product>` or `@td-spec/<product>.<feature>`
(`r:bundle-name-is-the-td-spec-scope`). `@td-spec/opus-planning.publishing` is legal npm —
`f:npm-package-name-may-contain-a-dot`.

A scope the manifest does not name has **no** bundle name; it publishes nothing and draws a
**checker warning**, not a settle-gate failure (`d:undeclared-identity-publishes-nothing`,
`r:settle-publishes-a-versioned-bundle`).

### 3.2 Bundle tree

Exactly four files plus incorporated content (`d:bundle-is-four-files-plus-incorporated-content`):

```
README.md            fixed boilerplate, varies only by bundle name
spec.md              spec prose, citation tokens stripped
commitments.yaml     flat commitment list
package.json         minimal manifest
<relative paths>     files the spec links inside its own design directory, same relative path
```

Vendoring rule (`d:incorporated-content-is-vendored-by-relative-path`): a markdown link whose
target resolves inside `design/<area>/<design>/` is copied to the bundle at the same path
relative to the design directory. Links outside it are left as written (they will be dead
inside the bundle; that is the accepted cost). `brief.md`, `requirements.yaml`, `decisions.yaml`
are **not** carried unless the spec links them — the bundle is the derived implementer view
(`r:derived-implementer-view`), and facts are explicitly left out.

`[CHOSE]` Link detection = markdown inline/reference link targets plus bare relative paths in
link syntax only; not arbitrary text. Not resolved by foundations.

### 3.3 `commitments.yaml`

`r:commitments-are-a-flat-id-and-statement-list` — one flat sequence, entries with exactly `id`
and `statement`, `id` prefixed `r:` or `d:`, nothing distinguishing kinds. The rejected
`d:commitments-schema-mirrors-the-source-entries` kills a `requirements:`/`decisions:` mapping,
and rejected `d:commitments-are-rendered-markdown` kills prose.

```yaml
- id: r:derived-implementer-view
  statement: |
    the artifact a spec's implementers build from is derived from the spec…
- id: d:bundle-is-four-files-plus-incorporated-content
  statement: a bundle is a directory holding README.md, spec.md, commitments.yaml, and package.json, …
```

Membership (`d:extraction-carries-live-commitments-only`): every **active** requirement binding
the design — its own, its area's, the global tier, and any wider one whose `applies_to` reaches
it — plus its **accepted** and **tolerated** decisions. Retired requirements, rejected decisions,
and all facts are out.

`[CHOSE]` **Ordering**: requirements first, nearest scope first (design → area → global), each
tier in source-file order; then decisions in `decisions.yaml` file order. Nothing in the
foundations fixes ordering, and ordering matters because
`d:identical-bundle-skips-publish` byte-compares.

`[CHOSE]` Statements are emitted as block scalars (`|`) when multi-line, plain otherwise;
trailing newline normalised. Again required for byte-stability, unstated.

`[CHOSE]` The file is a **bare sequence** at document root, not `commitments: [...]` — "one flat
sequence" reads as the document being that sequence, and it matches foundation files, which are
bare sequences per doc-structure.

### 3.4 `spec.md`

The design's `spec.md` with citation tokens `[[<k>:<id>]]` removed
(`r:derived-implementer-view`, `f:spec-citation-token-grammar`), under
`r:token-strip-leaves-the-line-as-written`:

- remove the token;
- a run of spaces the removal doubles collapses to one;
- a token that ended a line takes the space before it.

`[CHOSE]` Tokens inside fenced blocks and inline-code spans are **not** stripped — they are text,
not citations (`f:citation-token-in-code-is-not-a-citation`), so removing them would alter the
document where no token stood. This is a real fork and I am committing to "leave them".

`[CHOSE]` Everything else is byte-identical, headings included; no front matter, no added title,
no "generated from" banner. `token-strip-leaves-the-line-as-written` says the output "differs
from the source nowhere but where a token stood", which forbids a banner.

Note: this interacts with `f:trailing-spaces-are-a-hard-line-break` — a token at end of line
taking the space before it is exactly what prevents a stripped line from becoming a hard break.

### 3.5 `package.json`

`d:bundle-manifest-is-minimal` — exactly `name`, `version`, `description`, `files`, `repository`,
`dependencies`, nothing else.

```json
{
  "name": "@td-spec/opus-planning.publishing",
  "version": "1.0.0",
  "description": "Spec bundle for how-to-plan/spec-bundles",
  "files": ["README.md", "spec.md", "commitments.yaml"],
  "repository": { "type": "git", "url": "git+https://github.com/<owner>/plan-opus.git" },
  "dependencies": { "@td-spec/opus-planning.format": "^1.2.0" }
}
```

`[CHOSE]` `description` = `Spec bundle for <scope>`. Unstated.
`[CHOSE]` `files` lists the four files plus each vendored path. Unstated.
`[CHOSE]` No `publishConfig` — the minimal-manifest decision forbids the field, so
`d:bundles-publish-publicly` must be honoured with `npm publish --access public` on the command
line. This is a genuine consequence a builder must not miss.
`[CHOSE]` No `private`, no `license`, no `type`. Forbidden by the same decision.

### 3.6 Dependencies

`r:bundle-dependencies-come-from-cited-fact-sources` + `f:bundle-edges-come-from-cited-fact-sources`:
walk the citation tokens in the spec's prose; for each `[[f:…]]`, load the fact; for each source
carrying a `url` that is repo-relative and matches
`design/<area>/<design>/requirements.yaml` or `design/<area>/<design>/spec.md`, emit the edge to
`<area>/<design>`. `run:` and `description:` sources yield nothing. External `url`s yield nothing.
Self-edges dropped.

Range: `^<version of that bundle's newest git tag at publish time>`
(`d:dependency-ranges-are-carets-on-the-latest-tag`).

`[CHOSE]` An upstream design the manifest does not name → **skip the edge with a warning**. The
alternative (fail) would make one unnamed design block every downstream publish, and
`d:undeclared-identity-publishes-nothing` sets the tone that missing identity warns.
`[BLOCKED-ish]` An upstream design that is named but never published (no tag) — I choose to fail
the publish, since a caret range on nothing cannot be written.

The bundle need not vendor upstream content (`r:a-bundle-is-self-contained`, soft, explicitly
allows fetching separately) — `npm install` fetches the package and its dependencies in one
command (`f:npm-install-fetches-a-package-and-its-dependencies`), which is what makes this work.

### 3.7 `README.md`

`d:bundle-carries-an-orientation-file` + `d:orientation-file-is-a-boilerplate-readme`: fixed
boilerplate written by the deriver, varying only by the bundle's own name. Content covers what a
bundle of this format is, that `spec.md` is the primary build document, that `commitments.yaml`
is the crib of commitments with `r:`/`d:` prefixed ids, and how to fetch dependencies
(`npm install @td-spec/<name>` pulls them; `npm pack @td-spec/<name>@<version>` fetches one —
`f:npm-pack-fetches-a-published-package-by-spec`, `f:npm-latest-tag-serves-versionless-installs`).

`[CHOSE]` Exact wording. Unstated.

### 3.8 Tags and versions

- Tag name: `@td-spec/my-app.login@2.1.0` (`d:tag-names-the-bundle-and-version`), legal per
  `f:git-ref-names-admit-at-sign-and-slash`.
- Tags in this repository are the version record; the registry is distribution only
  (`d:version-record-is-a-git-tag`).
- First version `1.0.0`, backfills included (`d:first-version-is-one-zero-zero`).
- Any run reading tags must fetch them — `f:checkout-action-fetches-no-tags-by-default`
  (`fetch-depth: 0` / `fetch-tags: true`). Stated as a contract for `harness`.

---

## 4. Behaviours

### 4.1 Publish algorithm (per design scope, on merge to main)

1. If the design is not settled → skip (`r:settle-publishes-a-versioned-bundle`,
   `f:planning-lib-reports-settled-status`). A spec that stops being settled publishes nothing
   further and its existing versions stay fetchable (`d:leaving-settled-publishes-nothing`).
2. Resolve bundle name. None → warn, skip (`d:undeclared-identity-publishes-nothing`).
3. Find the newest tag for this bundle name.
   - none → version `1.0.0`, publish.
   - some → continue.
4. Re-derive the previous commitment list **at the commit the tag names**
   (`d:previous-commitments-are-re-derived-at-the-tag`) — never read it out of the registry.
5. Compute the bump, keyed on entry id (`d:bump-is-computed-from-the-commitment-diff`):
   - an id present before and absent now → **major**;
   - an id present in both whose `statement` differs → **major**;
   - an id absent before and present now → **minor**;
   - otherwise → **patch**.
   Highest wins. The settling author may raise the bump, never lower it.
6. Derive the new tree at the new version.
7. Byte-compare against the current latest's tree. Identical → publish nothing, burn no version
   (`d:identical-bundle-skips-publish`).
8. `npm publish --access public` to `registry.npmjs.org`
   (`d:npm-registry-is-the-publication-target`, `d:bundles-publish-publicly`).
9. Write and push the tag.

`[CHOSE]` Step order — specifically that the byte-compare happens *after* bump computation and
that the compare excludes `package.json`'s `version` field (otherwise the version stamp makes every
tree differ and the skip never fires). This is a genuine trap; I am choosing to compare the tree
with `version` blanked.

`[CHOSE]` The author's bump floor is declared in the PR/commit; mechanism unspecified in the
foundations. I would take a `bump: minor|major` trailer on the merge commit.

### 4.2 `latest`

`d:latest-never-moves-backward` — latest always names the highest version published, never
repointed at an earlier one whatever becomes of the spec. `npm` moves latest on publish by default
(`f:npm-latest-tag-serves-versionless-installs`) and `npm dist-tag add` could move it backward
(`f:npm-dist-tag-can-retag-any-version`), so the build must simply never call `dist-tag add`.
A superseded or rejected spec's latest stays where it is.

`d:deprecation-triggers-on-a-name-leaving-the-product-map` is **rejected**, so no `npm deprecate`
call exists in the build, despite `f:npm-deprecate-warns-on-install` describing the mechanism.

### 4.3 Backfill

`d:settled-specs-are-backfilled-on-the-first-run` — the first publishing run publishes every
already-settled, manifest-named spec at 1.0.0. `[CHOSE]` "First run" is detected as "no tag exists
for this bundle", i.e. it is not a special mode at all; step 3 already does it.

### 4.4 Immutability

`r:published-bundle-versions-are-immutable`, backed by `f:npm-version-identity-is-permanent`.
Corrections publish a new version. Nothing in the build ever republishes a version or unpublishes.
`f:npm-unpublish-is-conditional-not-time-limited` says availability is not guaranteed for a
low-traffic single-owner package at any age — I note this as a residual risk against the brief's
"a version pinned last month fetches the same content today"; the build does nothing about it.

---

## 5. Error taxonomy

`[CHOSE]` Entirely. The foundations name no errors.

| condition | severity | behaviour |
|---|---|---|
| design not settled | info | skip silently |
| scope not in `products.yaml` | **warning** | skip publish; explicitly not a gate failure |
| two products/features map to the same design scope | error | fail — bundle name ambiguous |
| `products.yaml` names a scope with no design directory | error | fail |
| upstream edge to an unnamed design | warning | drop the edge |
| upstream edge to a named design with no published tag | error | fail the publish |
| spec links a file inside the design directory that does not exist | error | fail |
| commitment id collides after prefixing | error | fail |
| tag exists for the version to be published | error | fail |
| registry rejects the publish | error | fail; no tag written |
| author bump floor lower than computed | warning | ignore the floor, use computed |

---

## 6. Edge cases

- **Product not subdivided** — `mc-dev-server: minecraft/dev-server` → `@td-spec/mc-dev-server`,
  no dot.
- **Design with zero decisions** — `commitments.yaml` still written, holding requirements only.
  Never omitted; the four-file shape is fixed.
- **Design with zero dependencies** — `dependencies: {}` `[CHOSE]` present-but-empty rather than
  omitted, so the manifest field set is constant.
- **Statement reworded, id unchanged** → major. Accepted, and named as a falsifier of
  `d:bump-is-computed-from-the-commitment-diff` (id rename inflating majors).
- **A requirement retired between publishes** → its id disappears → major.
- **A soft requirement departed from via a decision** — the decision is a commitment and appears;
  the requirement stays too. Both are carried.
- **Spec re-settled with no content change** → byte-identical → no publish, no version burned.
- **Two designs in one product** — each feature is its own bundle; they may depend on each other
  through the fact-source rule like any other pair.

---

## 7. `[BLOCKED]` — things I would have to ask

1. **Commitment ordering in `commitments.yaml`.** Nothing fixes it, and byte-comparison for
   `d:identical-bundle-skips-publish` makes it observable. I chose design→area→global then
   decisions in file order.
2. **Whether the byte-compare excludes the version field.** Taken literally,
   "byte-identical to the current latest" can never be true once the version is stamped, making
   `d:identical-bundle-skips-publish` dead code. I chose to blank `version` for the compare.
3. **Tokens inside code spans and fences.** Strip or leave? I chose leave.
4. **`repository` field's exact value** — owner/repo of this planning repo, plus whether a
   `directory` sub-field pointing at the design is wanted. I chose no `directory`.
5. **How the author raises the bump.** No mechanism exists in the repo today.
6. **What an unpublished upstream does to a downstream publish** — fail, or publish without the
   edge? I chose fail.
7. **Whether `files` must enumerate vendored content** or whether the four names suffice.
8. **`description` text.**
9. **README boilerplate wording** — entirely unconstrained.
10. **Where the deriver lives** — `bin/`, `planning-lib`, or the harness repo. The brief pushes
    automation to `harness` and the library reads to `planning-lib`, leaving the deriver's home
    ambiguous. I assumed `planning-lib` exposes the reads and this design's code is a thin
    assembler in `bin/`.
