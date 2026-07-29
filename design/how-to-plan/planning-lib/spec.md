# Planning Library

## Summary

This design specifies the planning library: the one program that knows what a planning artifact is.
It types a design, an entry, a fact, a source, a citation, a scope, a product manifest and a bundle
identity; it reads a working tree into those types; it enforces the format's invariants while doing
so; and it answers the questions a consumer would otherwise answer by re-reading the tree — is this
design settled, what is its bundle called, what is it committed to, what does it depend on, and what
does its prose read like with the citation tokens gone. Its product is a published TypeScript
package with a typed model, one loading entry point, a diagnostic list, and five capability
accessors. The problem it answers is that the format already has more than one reader, and every
extra reader is a way for two tools to disagree about what a design says and a place a format change
has to land twice. The constraint that shapes the rest is that the format lives in this repository
and the library is built in another: the two cannot be edited in one commit, so every choice below is
made to keep the seam narrow, visible, and cheap to cross.

## What the library is

The library is `@twin-digital/planning-lib`
[[d:package-name-is-twin-digital-planning-lib]], built in the opus monorepo and published in its own
right [[r:library-is-a-published-package-from-the-opus-monorepo]]. It is an ESM-only TypeScript
package, shipping its own type declarations and targeting active Node LTS
[[r:node-libraries-are-esm-typescript]]. Its build follows the monorepo's own conventions
for a published package; nothing here overrides them. The `@twin-digital` scope is deliberately not
`@td-spec`, which is the scope a published spec bundle takes
[[f:bundle-package-name-is-td-spec-scoped]]: a bundle and the code that reads one are different
namespaces.

Every program that reads a planning artifact reads it through this package rather than parsing the
format itself [[r:library-is-the-one-implementation-of-the-format]]. That is the whole return on the
design, so the library has to be worth reaching for: it reads, it does not write
[[d:library-is-read-only]], and it knows nothing about git [[d:library-does-not-touch-git]]. What the
second costs a consumer is one command: a design as it stood at a past commit is reached by
materialising that commit as a directory (`git worktree add`, `git archive`) and pointing the library
at it, so every other consumer holds a directory rather than a repository.

The consequence worth stating: the library reports a design's `exploring` | `draft` | `settled`
state, and never reports whether it is published, because publication is a property of a git ref and
the library reads no refs [[d:library-does-not-touch-git]].

The library caches nothing, watches nothing, and writes nothing; a fresh reading of a tree means
loading it again [[d:library-holds-no-state-between-loads]].

## Loading a tree

One entry point takes one repository-root directory path and reads the tree beneath it
[[d:load-takes-one-repo-root-path]]:

```ts
function loadPlanningTree(root: string): LoadResult;
```

It reads, in this order: `products.yaml` at the root
[[f:bundle-identity-comes-from-the-product-manifest]]; every `.yml` or `.yaml` file at any depth
under `evidence/` [[f:run-pool-takes-any-yaml-at-any-depth]] and then `facts/`
[[f:fact-pool-takes-any-yaml-at-any-depth]]; `design/requirements.yaml` and `design/sets.yaml`; each
area's `requirements.yaml` and `sets.yaml` — the three requirement tiers, each a directory that may
also carry a `sets.yaml` [[f:requirement-tiers-are-global-area-design]]; and each design's
`requirements.yaml`, `decisions.yaml`, `brief.md` and `spec.md`, its two durable inputs and its two
outputs [[f:design-directory-splits-inputs-from-outputs]]. Runs are read before facts so that a
`run:` source resolves while its fact is being checked. Any other file under `facts/` or `evidence/`
is skipped without comment — the pool path is filing convenience and carries no meaning, so what is
*in* the pool cannot be inferred from where a file sits, only from whether it is YAML
[[d:pool-discovery-takes-any-yaml-at-any-depth]].

An absent `requirements.yaml`, `decisions.yaml`, `sets.yaml` or `products.yaml` loads as no entries
rather than as a failure, and so does an empty one [[d:missing-artifact-files-load-as-empty]]. A
design directory with no `spec.md` loads as a design whose `spec` is `undefined`.

A file the library **can** find but cannot read, or cannot parse as YAML, is different in kind: the
tree was never loaded, so there is nothing to report findings against. The load returns a
discriminated result carrying every such file, and there is no tree on the failure arm
[[d:load-returns-a-discriminated-result]]:

```ts
type LoadResult =
  | { readonly ok: true; readonly tree: PlanningTree }
  | { readonly ok: false; readonly failures: readonly { path: string; reason: string }[] };
```

The absent `tree` key is the whole mechanism. `tree` is carried by one member of the union, so
reading it before `ok` is tested is a compile error [[f:union-member-access-requires-narrowing]] and
the failure cannot be passed over in silence. A thrown error buys none of that: it is invisible to
the type checker, and a bare `catch` discards it with nothing left for a reviewer to see.

Reporting a read failure as a diagnostic on a tree loaded around the hole is the alternative, and it
is rejected for the reason it was always rejected: a design's answers are derived from what the load
found, so a missing file shortens an answer rather than breaking it, and a short answer is
indistinguishable from a complete one. The result shape does not soften that — there is still no
partial tree to hand back, only a result the caller has to open.

Every path the model carries — a design's directory, a fact file, a run's `output`, a diagnostic's
subject — is repository-relative and POSIX-separated, so a diagnostic reads identically on any
platform and a consumer can join it to whatever root it loaded
[[d:model-paths-are-repo-relative-posix]]. Every collection the library returns is deterministically
ordered: entries by id, diagnostics by category and then by subject
[[d:returned-collections-are-deterministically-ordered]].

## The typed model

The library types every artifact this system produces, and grows to cover whatever is added later
[[r:library-covers-every-planning-artifact]]. A new entry kind, a new field, a new file at the root
is a change to this package first and reaches its consumers as a release.

Three kinds are foundations — facts, requirements, and decisions — and are the only kinds a claim
may cite [[r:easily-reviewable-foundations]]. Beside them the model carries runs, the two document
kinds, the design sets, and the product manifest:

```ts
type Kind = "fact" | "requirement" | "decision" | "run";

interface PlanningTree {
  readonly designs: readonly Design[];
  readonly facts: readonly Fact[];
  readonly requirements: readonly Requirement[];
  readonly decisions: readonly Decision[];
  readonly runs: readonly Run[];
  readonly sets: ReadonlyMap<string, DesignSet>;
  readonly products: ProductManifest;
  readonly diagnostics: readonly Diagnostic[];
  readonly hasErrors: boolean;

  design(scope: string): Design | undefined;
  entry(kind: Kind, id: string): Fact | Requirement | Decision | Run | undefined;
}
```

Facts, requirements, decisions and runs share one repository-wide id namespace, so `entry` is a
single lookup and a repeated id is a diagnostic rather than a shadowing override
[[d:entry-ids-share-one-namespace]]. That one namespace is what lets a citation resolve scope-blind
and a `run:` source resolve by the same rule a citation does.

Every entry carries, beside its own schema, where it was found and whether it is still citable:

```ts
type Tier = "global" | "area" | "design" | "pool";

interface Entry {
  readonly id: string;
  readonly kind: Kind;
  readonly tier: Tier;
  readonly scope: string;      // "global", an area name, a design scope, or a pool file's path
  readonly file: string;       // repo-relative, the file the entry was read from
  readonly live: boolean;
  readonly writtenFields: readonly string[];   // the field names the file literally wrote
}
```

`tier`, `scope` and `file` are what a consumer needs to file an entry the way this repository's tools
already do — the checker's per-tier entry counts, the `--facts` view's "in which pool file", and
every diagnostic that names the scope an entry came from. `live` is the format's own word: a live
entry is an active fact or requirement, or a decision that is not rejected, while a retired fact or
requirement and a rejected decision are dead and may not be cited
[[f:live-entry-excludes-retired-and-rejected]]. Dead entries stay in the collections, because
reporting a citation of one is a check the library owes and a dropped entry cannot be reported
against.

`writtenFields` is the one thing the entry keeps about its file that the typed value destroys. The
typed entry fills defaults in, so a `force` reading `hard` no longer says whether the file wrote it,
and the format requires a field at its default to be omitted — a rule checkable only against what was
literally written. Naming the written fields keeps that check inside the model rather than sending
the validator back to the YAML for a second reading.

Each entry type mirrors its on-disk schema field for field, with defaults filled in where the file
omits them — a requirement's `force` reads `hard` and its `status` `active` when the file says
neither, and `appliesTo` is `undefined` on a design-scoped entry [[f:requirement-entry-fields]]:

```ts
interface Fact extends Entry {
  readonly kind: "fact";
  readonly claim: string;
  readonly backing: "tested" | "documented" | "assumed";
  readonly sources: readonly Source[];
  readonly status: "active" | "retired";
  readonly reason?: "superseded" | "disproven" | "stale";
  readonly supersededBy?: string;                  // a bare fact id
  readonly caveat?: string;
}

interface Source {
  readonly description?: string;   // exactly one of description, url, run
  readonly url?: string;
  readonly run?: string;           // a run id
  readonly where?: string;
  readonly quote?: string;
}

interface Requirement extends Entry {
  readonly kind: "requirement";
  readonly statement: string;
  readonly force: "hard" | "soft";
  readonly status: "active" | "retired";
  readonly rationale?: string;
  readonly appliesTo?: readonly string[];          // design scopes and set:<name> items
}

interface Decision extends Entry {
  readonly kind: "decision";
  readonly statement: string;
  readonly status: "proposed" | "accepted" | "tolerated" | "rejected";
  readonly falsifiers: readonly string[];
}

interface Run extends Entry {
  readonly kind: "run";
  readonly command: string;
  readonly output: string;                         // repo-relative
  readonly ranAt: string;                          // YYYY-MM-DD, as written
  readonly environment?: string;
  readonly status: "active" | "retired";
  readonly reason?: "superseded" | "stale" | "invalid";
  readonly supersededBy?: string;
}

interface DesignSet {
  readonly name: string;
  readonly tier: "global" | "area";
  readonly scope: string;                          // "global" or the area name
  readonly file: string;                           // repo-relative
  readonly members: readonly string[];             // design scopes
}
```

A decision's `status` is one of `proposed`, `accepted`, `tolerated`, `rejected`
[[f:decision-status-values]]. A fact's `sources` is a list of source objects, each carrying exactly
one of `description`, `url`, or `run`, with `where` and `quote` beside the latter two
[[f:fact-source-takes-one-of-three-locators]]. Field names take the language's casing —
`supersededBy`, `appliesTo`, `ranAt` — because a consumer reads them as TypeScript rather than as
YAML; the on-disk spelling stays the format's and is what the reader matches. A required field the
file omits is a diagnostic rather than a throw, so such an entry carries `undefined` where its type
says a value: the tree still loads, and the finding is the report.

A field outside an entry kind's schema is carried nowhere and draws no diagnostic
[[d:closed-schema-enforcement-stays-unimplemented]]. The format calls each kind's field set closed
[[f:entry-field-sets-are-closed]] and records unknown-field rejection as enforcement still to land in
the harness rather than something the checker does today
[[f:unknown-field-rejection-is-not-yet-in-the-harness]], and adding it in the library would put the
two readings of this repository's tree out of step at exactly the moment the migration is trying to
prove them identical.

A design's two markdown files are both carried. A `brief.md` is a document the library holds but
does not parse — it is a durable input with no structure the format fixes
[[f:design-directory-splits-inputs-from-outputs]] — while a `spec.md` is parsed into a
`SpecDocument`:

```ts
interface MarkdownDocument {
  readonly path: string;                         // repo-relative
  readonly source: string;                       // the file, verbatim
}

interface SpecDocument extends MarkdownDocument {
  readonly summary: string;                      // the ## Summary section's prose
  readonly components: readonly Component[];     // the live block under ## Components
  readonly questions: readonly OpenQuestion[];   // the live block under ## Open questions
  readonly citations: readonly Citation[];
}

interface Component {
  readonly id: string;
  readonly responsibility: string;
  readonly excludes?: string;
  readonly after?: readonly string[];            // sibling component ids
}

interface OpenQuestion {
  readonly id: string;
  readonly question: string;
  readonly closes: "fact" | "requirement" | "decision";
  readonly gates?: readonly string[];            // decision ids, local to the design
}

interface Citation {
  readonly kind: "f" | "r" | "d";
  readonly id: string;
  readonly offset: number;   // index into `source`
}
```

A citation is the token `[[<k>:<id>]]` with a single-letter kind [[f:spec-citation-token-grammar]].
A token inside a fenced block or an inline-code span is text rather than a citation — it resolves to
nothing and satisfies no obligation [[f:citation-token-in-code-is-not-a-citation]] — so the scan
removes both before it looks for tokens, which is how the current checker reads a spec and is what
keeps a token shown as an example from counting [[d:tokens-are-scanned-outside-code]]. A `yaml` block is read as a live block only under the fixed
`## Components` or `## Open questions` heading; one anywhere else is illustration
[[f:live-block-sits-under-its-fixed-section]]. A component carries `id`, `responsibility`, `excludes`
and `after`, which is the whole of its interface [[f:component-interface-fields]].

The product manifest is the root `products.yaml`, mapping each product either to one design scope or
to a mapping of feature names to design scopes [[f:bundle-identity-comes-from-the-product-manifest]]:

```ts
type ProductManifest = ReadonlyMap<string, string | ReadonlyMap<string, string>>;
```

## Validation

A consumer that loads through the library never decides for itself whether an artifact is
well-formed [[r:library-validates-not-just-parses]]. Every invariant the format states and this
repository's checker enforces today is checked during the load — which is every invariant but one,
the closed-schema rule the format itself records as enforcement still to land in the harness
[[f:unknown-field-rejection-is-not-yet-in-the-harness]] and which the library therefore leaves
unenforced too (above). The findings arrive as one list on the tree
[[d:format-violations-are-diagnostics-with-two-severities]]:

```ts
interface Diagnostic {
  readonly category: string;                  // e.g. "citation unresolved"
  readonly severity: "error" | "warning";
  readonly subject: string;                   // the entry id, design scope, or path it is about
  readonly detail?: string;
}
```

`category` is the finding's identity and the unit of parity. The library is built in another
repository, so the categories are carried across the seam here rather than left as a pointer into a
file the builder does not have: these sixty-six strings are the whole set, each one library check,
verbatim, in the order a report prints them, and the package exports them as that ordered list with
each one's severity, so a reporter that prints a line per category holds no copy of its own.

```text
yaml parse
legacy format — regenerate    (warning)
id not kebab-case
slug not unique per kind
missing required field
bad backing
bad fact status
bad requirement status
bad decision status
bad force
bad retire reason
retired fact without reason
superseded fact without superseded_by
superseded_by unresolved
fact supersedes itself
decision without a falsifier
requirement with sources
rationale not a block scalar
fact file outside the pool
sets.yaml is not a mapping of set name to design scopes
set name not unique
set without members
set holds another set
set member unresolved
area set holds another area's design
applies_to on a design-scoped requirement
applies_to is not a non-empty list
applies_to names an undeclared set
applies_to names no such design
applies_to reaches outside its tier
fact without a source
source has more than one locator
source has no locator
run source unresolved
source cites a retired run
run without where
run source on a non-tested fact
run output not found
run ran_at not a date
bad run status
retired run without reason
superseded run without superseded_by
url without where
in-repo url not repo-root-relative
quote not a block scalar
quote not verbatim at its source
artifact source on a non-tested fact
default stated explicitly
empty questions block
empty components block
component missing id
component missing responsibility
component after unresolved
question missing id
question missing text
question closes bad kind
question gates non-local decision
malformed citation token
citation unresolved
citation kind mismatch
citation of dead entry
citation of non-foundation kind
decision cited across designs
cites another design's requirement
cites another area's requirement
uncited at settle
```

Severity is `error` for every category but one: `legacy format — regenerate` is a `warning`, and it
is the only one, so a tree carrying nothing else still passes. `tree.hasErrors` is true when any
diagnostic is an `error`, and is what a caller exits non-zero on. The two readings agreeing on this
table is what `conformance-corpus` proves; a category the corpus finds this table missing is a
defect in the table, and the table is what a release changes.

Three checks read files the load never opened, and they are part of the validator's contract rather
than the loader's: verifying a quote opens the file a source's `url` names, `run output not found`
stats the path a run's `output` names, and `fact file outside the pool` walks `design/**` for a file
named `facts.yaml` or `facts.yml`, filed where its entries would resolve nowhere. Every one of those reads is a diagnostic
when it fails — an unreadable or absent quote source reports `quote not verbatim at its source`, an
absent run output reports `run output not found` — and none of them turns the load into a failure.
The failure arm belongs to the load and says the tree was never read; a validator that returned it
would discard a tree that had already been read.

One category needs its scope named, because malformed YAML reaches the library two ways and only one
of them is a finding. A file that does not parse ends the load on its failure arm
[[d:load-returns-a-discriminated-result]] and never becomes a diagnostic, so `yaml parse` means exactly the
other case: a live `yaml` block under `## Components` or `## Open questions` whose body does not
parse [[f:live-block-sits-under-its-fixed-section]]. The parser reports it, reads past the block, and
the design's remaining checks all still run — which is what the corpus entry for the category has to
provoke, and the only thing it can.

Diagnostics never abort the load. A tree full of violations is still a tree the library read, and
reporting all of them in one pass is the reason a consumer runs the checker at all
[[r:must-beat-doing-it-myself]] — stopping at the first would turn one run into a dozen. Only a file
the library could not read stops it [[d:load-returns-a-discriminated-result]].

The citation checks are where the format's intent rule becomes mechanical: a claim points at the
foundation it rests on [[r:explicit-intent]], so every token must resolve to exactly one live entry
of the named kind, a fact from anywhere, a requirement only within the citing design's three tiers,
and a decision only within the design that made it [[f:citation-resolves-to-one-entry-within-its-fence]]
[[f:live-entry-excludes-retired-and-rejected]].
What the library cannot check is whether a cited requirement is genuinely honoured, and it does not
pretend to.

Two checks need something a plain typed value cannot hold, and both are served from the model rather
than from a second reading of the file. `default stated explicitly` fires where the file wrote a
field that already holds its default, which is a question about the text and not about the value, and
it is answered from the entry's `writtenFields` (above). `legacy format — regenerate` fires on a
`spec.md` still written to the superseded format — one carrying a bracketed token of the old
letter-and-number shape, a `D`, `Q` or `C` followed by digits, or a live block whose body is a bare
`- id:` sequence rather than a keyed mapping — and the design's
remaining document checks are skipped, because a document in the old shape would draw a cascade of
findings that all say the same thing. Such a design reports `legacyFormat: true` and a `state` of
`draft`: the format fixes the state enum at three values computed from content
[[f:settled-state-is-computed-from-spec-content]], so the legacy condition travels beside the state
rather than as a fourth member of it, and a design whose document cannot be read is plainly not
settled. A reporter prints `legacy` for such a design from the flag.

## The five capabilities

Five answers are decreed to come from the library rather than from each consumer's own reading of
the tree. All five hang off the loaded `Design` rather than sitting as free functions over a tree and
a scope, so a consumer that has a design in hand cannot ask about one that does not exist
[[d:capabilities-hang-off-the-loaded-design]]:

```ts
interface Design {
  readonly scope: string;                             // "how-to-plan/planning-lib"
  readonly area: string;
  readonly name: string;
  readonly dir: string;                               // repo-relative
  readonly requirements: readonly Requirement[];      // its own, design-scoped
  readonly decisions: readonly Decision[];
  readonly brief?: MarkdownDocument;
  readonly spec?: SpecDocument;

  readonly state: "exploring" | "draft" | "settled";
  readonly settled: boolean;
  readonly legacyFormat: boolean;                     // spec.md still in the superseded format
  readonly bundleName: string | null;
  readonly commitments: readonly Commitment[];
  readonly upstreams: readonly string[];              // design scopes

  strippedSpec(): string | null;
}
```

**Settled status.** `state` and `settled` are computed from the design's own content by the format's
rule, so no consumer re-derives that judgement [[r:library-reports-whether-a-design-is-settled]]: a
design with no `spec.md` is `exploring`; a `spec.md` holding a proposed decision, an open question,
or an uncited live binding requirement or accepted-or-tolerated decision is `draft`; one holding none
of those is `settled` [[f:settled-state-is-computed-from-spec-content]]. Which requirements those are
is the whole set binding the design — its own, and every wider-scope one whose `applies_to` reaches
it — not its design-scoped ones alone [[f:settle-gate-covers-every-binding-requirement]], which is
why the settle rule lives with the binding resolution rather than beside the state enum. `settled` is
`state === "settled"`, present because that is the question consumers actually ask.

**Bundle name.** `bundleName` resolves the design's scope through the product manifest — the scope
`@td-spec`, then the product, then a dot and the feature where the product subdivides — and is
`null` for a design the manifest does not name [[r:library-resolves-a-design-to-its-bundle-name]]
[[f:bundle-identity-comes-from-the-product-manifest]] [[f:bundle-package-name-is-td-spec-scoped]]. `null` is the report, not an exception: a
design with no bundle is an ordinary end state and not an error, and `null` in the union is what
makes a consumer that ignores the case fail to compile
[[f:union-member-access-requires-narrowing]] [[d:bundle-name-is-null-when-unnamed]].

**Commitment set.** `commitments` is the design's commitment set as entries carrying their ids and
statements [[r:library-reports-a-designs-commitment-set]] — every active requirement binding the
design, its own and every wider-scope one whose `applies_to` reaches it, plus every decision it
holds at `accepted` or `tolerated` [[f:decision-status-values]]. Retired requirements, rejected and
proposed decisions, and facts are all left out: the set is what the design is committed to, and a
fact issues no obligation [[r:easily-reviewable-foundations]].

```ts
interface Commitment {
  readonly id: string;          // prefixed: "r:<id>" or "d:<id>"
  readonly statement: string;
}
```

Two fields, and the kind rides in the id as the same single letter a citation token uses
[[f:spec-citation-token-grammar]] [[d:commitments-carry-a-prefixed-id-and-statement]]. Folding the
kind into the id loses nothing, because the prefix *is* the kind: splitting at the colon recovers
both halves, so a consumer that wants the entry behind a commitment is still one `entry` call away.

A separate `kind` field beside a bare id was the alternative, and it loses on the only consumer that
exists: what a spec bundle publishes is one flat list whose entries carry a prefixed `id` and a
`statement` and nothing that tells the kinds apart
[[f:bundle-commitments-are-one-flat-list-of-prefixed-id-and-statement]], so that consumer would drop
the field and rebuild the prefix on every entry, every time. The cost of going the other way is that
a consumer wanting the kind as a value parses it out of a string rather than reading a typed field —
real, and smaller than making the known consumer undo the shape on every run.

Resolving *which* requirements bind is the library's job and the fiddly part of it: a design-scoped
requirement binds its own design; a wider-scope one binds the designs its `applies_to` names, each
item a design scope or a `set:<name>` resolved through a `sets.yaml`, and one that omits `applies_to`
binds its whole tier [[f:requirement-entry-fields]].

**Upstream edges.** `upstreams` is the set of design scopes this design depends on, resolved from
its cited fact sources by the format's rule for which sources count
[[r:library-resolves-upstream-edges-from-cited-fact-sources]]: for each fact the spec cites, a source
whose `url` is written relative to the repository root [[f:in-repo-source-url-is-repo-relative]] and
resolves to another design's `requirements.yaml` or `spec.md` yields that design's scope, and no
other source yields anything [[f:bundle-edges-come-from-cited-fact-sources]]. A `run:` source and a
`description` carry no url and yield nothing. A source resolving inside the citing design's own
directory yields nothing, so no design is its own upstream. The edge is already in the tree because a
reliance on another design's output is recorded that way in the first place
[[f:cross-design-dependency-is-recorded-as-a-fact]]; the library only reads it.

What comes back is design scopes, not bundle names [[d:upstream-edges-are-design-scopes]]. Turning
one into a bundle name is `bundleName` on the upstream design, one call away, and a caller that does
so learns which upstreams have no bundle instead of having them silently dropped from a list it
cannot see into.

**Stripped prose.** `strippedSpec()` returns the design's `spec.md` with every citation token
removed, in the form a builder reads [[r:library-strips-citation-tokens-from-spec-prose]], and
`null` where the design has no `spec.md`. The result differs from the source nowhere but where a
token stood: a run of spaces the removal doubles collapses to one, and a token that ended a line
takes the space before it, so no line gains trailing whitespace
[[f:token-strip-preserves-the-line]]. Nothing else is rewritten, reordered, or dropped — the
`## Open questions` section, if present, survives — so the derivation stays auditable by diffing the
two texts. It is a method rather than a field because the result is as large as the file, and a
consumer asking about a hundred designs' bundle names should not pay for a hundred copies of their
prose.

## This repository's tools

`bin/check-design.mjs` and `bin/foundations.mjs` are rebuilt as thin callers over the published
package, and this repository takes `@twin-digital/planning-lib` as a dependency
[[d:repo-tools-become-thin-callers]]. The checker becomes a reporter: load, print the unreadable
files and exit 1 where `ok` is false, and otherwise print a line per category in the exported
table's order with its subjects sorted, print the run and design summary lines, and exit non-zero on
`hasErrors`. Both tools are TypeScript for that reason — the discrimination the result shape
demands is a compile-time guarantee only where something compiles them
[[d:repo-tools-are-typescript]]. `bin/foundations.mjs` becomes a renderer over
`design.commitments` and the tree's facts. Nothing in `bin/lib/` survives as a second reading of the
format.

Keeping the current checker as a second implementation was the alternative, and it fails the only
test that matters here: two readings of the format is exactly the drift this design exists to remove
[[r:library-is-the-one-implementation-of-the-format]], and a repository that ships the format while
validating it with something else is the least defensible place for the second reading to live. The
cost is real and worth naming: this repository gains its first dependency beyond `yaml`, and a
`doc-structure` change lands here as prose but is not enforced here until a library release carries
it. That lag is the honest shape of the seam rather than a defect to design around — the format's
implementation is one thing, and it is in the other repository.

The order follows: the library publishes its first version from the opus monorepo before this
repository's tools are rebuilt on it [[d:library-publishes-before-the-repository-migrates]]. There
is no bootstrap cycle, because the library is built and released from a repository that does not
depend on this one; this repository keeps validating itself with the current checker right up until
the release it migrates onto exists.

**Parity, and how it is proven.** The rebuilt checker must report exactly what today's checker
reports for every design in the tree, with one stated exception: a tree holding a file that does not
parse. Today's checker records a `yaml parse` finding, carries on, prints a full report and exits 1;
the rebuilt one gets a result whose `ok` is false, prints the files it could not read, and exits 1
with no report behind it [[d:load-returns-a-discriminated-result]]. That is the decision's cost
falling due, and it is worth paying — a report assembled from a tree the reader could only half-read
is a report whose green lines mean nothing — but it is a difference the corpus will find, so it is
named here rather than left for the runner to trip over. Parity over the current tree alone cannot prove it, because
the tree is clean: a checker that silently lost a whole category produces identical output on it. So
the proof is a negative corpus — one minimal malformed tree per diagnostic category, each asserted
to draw that category, at that severity, from both readings
[[d:negative-corpus-is-one-tree-per-check-category]]. The corpus is a build-time fixture set, not
part of the published package. A category in the table above with no corpus entry is a gap in the
proof and is treated as a failing test, which is what keeps the corpus growing with the format
rather than falling behind it.

## Format change and versions

The library versions independently of the format it implements, and nothing in a planning tree says
which format revision it was written to. A format change that alters what validates is a major
version of the library, stated as a compatibility contract and not detected: a consumer pinned to an
old major reads a new tree with old rules and reports green
[[d:format-drift-is-a-major-version-contract]]. Detection would need a format-revision marker in the
tree, which is `doc-structure`'s to introduce and not this design's to assume.

What that contract is worth depends on who is pinned, so this repository does not rely on it: its
own tools depend on an exact version, and the change that adopts a format revision here is the same
change that moves the pin. A downstream consumer gets the major-version signal and the release
notes, which is a weaker guarantee honestly labelled rather than a mechanism that is not there.

## Components

```yaml
components:
  - id: entry-schemas
    responsibility: the TypeScript types for every artifact kind — fact, requirement, decision, run, component, open question, design set, product manifest — and the per-kind reader that turns one parsed YAML node into a typed entry with defaults filled in
    excludes: reading files from disk and deciding whether an entry is valid

  - id: tree-loader
    responsibility: walk a repository root, read every artifact file, parse it, build the entry index and the per-design file set, and return the failure arm naming every file it could not read or parse
    excludes: enforcing any format invariant, and assembling the public Design and PlanningTree objects
    after: [entry-schemas, spec-parser]

  - id: spec-parser
    responsibility: parse a spec.md into its sections, its live component and open-question blocks, and its citation tokens with their offsets, produce the token-stripped text, and report a live block whose body does not parse as the yaml parse diagnostic while reading past it
    excludes: resolving a citation to an entry
    after: [entry-schemas]

  - id: validator
    responsibility: produce the diagnostic list for a loaded tree — every entry-schema, id-uniqueness, source, set, applies_to, document and citation check, plus the legacy-format check and the uncited-at-settle report — one check per category at the category and severity the table fixes
    excludes: printing, exit codes, any judgement about whether a cited requirement is honoured, the yaml parse diagnostic for a malformed live block, which spec-parser owns, and deciding which requirements bind a design or whether it settles, which binding-resolver owns
    after: [tree-loader, spec-parser, binding-resolver]

  - id: binding-resolver
    responsibility: resolve which requirements bind a design through tiers, applies_to and sets, own the settle rule — the design's state, its settled and legacyFormat flags, and which bound requirements and held decisions go uncited — and assemble its commitment set
    excludes: bundle naming, dependency edges, and emitting any diagnostic
    after: [tree-loader, spec-parser]

  - id: tree-assembly
    responsibility: the loadPlanningTree entry point — assemble each Design and the PlanningTree from the loader's output and the capability components, attach the diagnostic list and hasErrors, and apply the deterministic ordering to every returned collection
    excludes: reading files, and computing any diagnostic or capability itself
    after: [tree-loader, spec-parser, validator, binding-resolver, bundle-identity, upstream-edges]

  - id: bundle-identity
    responsibility: read the product manifest and resolve a design scope to its scoped bundle name, or to null where the manifest does not name it
    excludes: deciding what a product or feature is called, and anything about versions
    after: [tree-loader]

  - id: upstream-edges
    responsibility: resolve a design's cited fact sources to the upstream design scopes it depends on, dropping every source that is not a repo-relative url into another design's requirements.yaml or spec.md
    excludes: turning a scope into a bundle name, and ordering or scheduling anything from the edges
    after: [tree-loader, spec-parser]

  - id: package-build
    responsibility: the published package itself — public entry point, ESM build, generated type declarations, and the monorepo release wiring that puts @twin-digital/planning-lib on the registry
    excludes: publishing spec bundles, which is a different package under a different scope
    after: [tree-assembly]

  - id: conformance-corpus
    responsibility: one minimal malformed tree per diagnostic category in the table this spec fixes, plus the runner that asserts the library and the pre-migration checker report the same category and severity for each, and that no category lacks an entry
    excludes: shipping in the published package
    after: [validator]

  - id: repo-tool-migration
    responsibility: rebuild bin/check-design.mjs and bin/foundations.mjs as thin callers over the published package, preserving today's report wording, ordering and exit codes, and delete bin/lib
    excludes: changing what the checker reports
    after: [package-build, conformance-corpus]
```
