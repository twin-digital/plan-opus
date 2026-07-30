# Specification forms that survive a rewrite, and what is templatable

Survey report, verbatim. **Provenance is layered and matters here.** The Hughes, Quviq, ShardStore, Goldstein and
Schemathesis material was read by the report's author. Everything in §3 onward came from a subagent that reported
fetching primary sources directly and labelled each PRIMARY or COMMENTARY; the author did not read those. That agent
caught a fabricated statistic in its own inputs (a summariser reporting "47 bugs across 10 projects" where the paper says
755 across fourteen of sixteen), which is mild evidence of care — but treat the second-hand layer as real.

---

## 1. The field evidence on property-based testing

**Goldstein, Cutler, Dickstein, Pierce & Head, "Property-Based Testing in Practice," ICSE 2024 (Distinguished Paper)** —
30 interviews with practitioners at Jane Street.
https://harrisongoldste.in/papers/icse24-pbt-in-practice.pdf

Three findings, all directly on the question of where the cost falls.

> "Many participants (16/30) said the process of writing specifications slowed their progress. P4 summed it up like
> this: **'I think the most common failure mode is actually not knowing what properties to test.'**"

**More than half reported the spec-writing itself as the bottleneck.** Not the tooling, not the generators — deciding
what to assert.

Their frequency table for what people actually write: classical properties 11/30, round-trip 11/30,
catastrophic-failure ("doesn't crash") 7/30, and:

> "**Differential Properties (17/30).** […] Differential properties were by far the most widely implemented kind of
> property."

**Differential — compare against a reference — is the field's most-used kind.**

And the gate to apply before committing to the approach at all:

> P9: "**[PBT is] most useful when … you have a really good abstraction with a complicated implementation.**"

Their companion HATRA 2022 paper names the two failure modes precisely: practitioners "either under-specified the
behavior of the system (for instance, simply testing that a program does not crash), or over-specifying it (for
instance, comparing to a behaviorally complete model of the program under test)" — **the second being the isomorphism
trap, observed in the wild.**

**Apply P9's gate honestly.** If a project is a thin implementation of a complicated spec, the model-based approach
inverts — the model approaches the implementation — and the fallback is metamorphic properties plus example transcripts.
If it is a simple interface over complicated internals, model-based testing is the right call.

## 2. The sharpest argument against relying on invariants

Hughes' own counterexample:

> "Consider this: if every function returning a BST were defined to return nil in every case, then all the properties
> written so far would pass. `insert` could be defined to delete the key instead, or `union` could be defined to
> implement set difference — as long as the invariant is preserved, the properties will still pass."

Combined with his measured result (validity properties caught 3 of 8 planted bugs), this yields a clean framing:
**rank property kinds by how templatable they are and by how many bugs they catch, and you get nearly opposite orders.
Invariants are the most reusable and the weakest; model-based are the least reusable and complete.** There is no free
lunch in the middle, and **a catalogue of generic laws is the tempting wrong answer.**

## 3. The measured ceiling on spec-derived tests

**Hatfield-Dodds & Dygalo, "Deriving Semantics-Aware Fuzzers from Web API Schemas," ICSE 2022** —
https://arxiv.org/abs/2112.10328, §3.2:

> "In all-checks mode, Schemathesis reports a total of 755 bugs across fourteen out of our sixteen targets, including
> 111 HTTP 500 responses, 436 unexpected status codes, 52 non-schema-conforming responses, and 152 responses with a
> wrong or missing content type."

**Of 755 findings, ~15% are crashes and ~58% are "your schema and your code disagree." None are "your code computes the
wrong answer," because nothing in an interface description says what the right answer is.** The authors state the
ceiling themselves — application-level constraints "cannot be expressed in the schema," hence "an ongoing role for human
judgement in customising automatically derived fuzzers […] and hand-coding additional or more precise tests."

**A structural tension worth knowing before investing.** From zod-fast-check's docs: for refinements "which have a very
low probability of matching a random input, it will not be able to generate valid values," throwing
`ZodFastCheckGenerationError`. Schemathesis echoes it.

**The free generator degrades exactly as the description gets more precise.** Every semantic constraint added to make a
schema capture real requirements makes naive generation-from-schema less able to produce valid inputs. **You cannot
escape the 85/15 ceiling by writing a richer schema — past a point a richer schema breaks the generator.** Structural,
not a tooling gap. Schema-derived arbitraries are a convenience for the easy layer, not a route to specifying
requirements.

Confirmed by grep on its export surface: **fast-check ships no law library.** `fp-ts-laws` is dead (last release
2020-10-30; 1,607 downloads/week against fast-check's 30.5M — a 1:19,000 ratio). The live successor `effect-ts-laws`
has 16 stars and one contributor. **If you want reusable law sets in TypeScript you are writing them.** There is also
**no TypeScript equivalent of Python's `hypothesis-jsonschema`.**

## 4. The epistemic point about goldens

**A transcript written from the requirements and then verified is a specification. The same file captured from a passing
run is a characterization test wearing its clothes. Same bytes, opposite epistemic status.**

Emily Bache's own description of the workflow includes the gate everyone skips — "if it correctly describes the
behaviour as you understand it, you can 'approve' it." Every proponent specifies that gate; every critic observes it
doesn't happen. **Where the agent that writes the code also writes the goldens, a captured golden proves only
self-consistency.**

**So template the order of operations, not just the file format.** A `.trycmd`/prysk transcript and a Babel-style
`input`/`output` pair are both hand-writable, which means you can author them from the requirements *before* the
implementation exists. That is what makes them a rebuild check.

Three practical mechanics, all primary:

- **rustc UI tests**: "If the file is missing, then compiletest expects the corresponding output to be empty." **Absence
  is a meaningful assertion**, so "produces no diagnostics" costs nothing to author.
- **Normalization belongs to the harness, not the test.** rustc scrubs paths to `$DIR`/`$SRC_DIR`; cram offers `(re)`
  and `(glob)` suffixes. Jest's docs put this burden on you — "You're responsible for making sure your generated
  snapshots do not include platform specific or other non-deterministic data" — **don't accept that. Write the scrubber
  once.**
- **LLVM is not whole-output golden.** Its suite is `RUN` lines plus FileCheck — hand-written *partial* assertions on
  selected lines. **It survives massive internal rewrites because of that partiality.** rustc is the whole-output case;
  LLVM is the selective case. Choose per assertion.

## 5. Two mechanisms for serial conformance — checking a rebuild against the previous build

Both in production, both directly applicable:

- **CommonMark's `spec_tests.py --track`**: "track which test cases pass/fail in the given JSON file and only report
  changes," printing `fixed!` when a previously-failing case starts passing. **A ledger comparing this run to the last.**
- **SQLLogicTest's completion mode**: a "prototype script" contains only inputs; running it against a *reference* engine
  emits a "full script" with expected results filled in. The rationale is explicitly about authoring cost — "generating
  test vectors is tedious, since the correct solutions must be computed and verifed by hand… This allows millions of
  test vectors to be producted by simple scripts."

**The empirical case for cases-as-data surviving a rewrite: sqllogictest's file format outlived its original C runner and
was independently reimplemented by DuckDB, CockroachDB, and `sqllogictest-rs` — same corpus, four runners, zero corpus
changes.** When a case format is line-oriented text with a two-line grammar, other projects rewrite the runner rather
than fork the format. **That is the signature of a templatable format.**

One concrete technique from **toml-test** for comparing structured output across rebuilds: every value is encoded as
`{"type": "integer", "value": "42"}` — a type tag plus a *string*. "Note that the only JSON values ever used are objects,
arrays and strings." **No float-formatting, integer-width, or date-parsing difference can produce a spurious diff.**

## 6. Governance for when an inherited case is wrong

The Jakarta EE TCK process is the only surveyed source that formalises this, and it is needed the moment cases outlive
the code that first passed them:

> "Specifications are the sole source of truth and considered overruling to the TCK in all senses."

Valid grounds for excluding a test include "claims that a test asserts requirements over and above that of the
specification." Explicitly *not* valid: "challenging the usefulness of a specification requirement." And exclusions must
be machine-readable data "so that as the excludes are updated, the affected tests are automatically removed from the test
suite."

Bowtie does the same at case granularity — `skipped` is a first-class response with a required reason, not a failure.
**For a rebuild that is deliberately incomplete, declaring the gap inside the protocol is the alternative to quietly
editing the corpus** — which is the failure mode that destroys a case file's authority.

---

## 7. Does the archetype carving hold?

**Straight answer: no prior art was found for the carving, and that belongs on the record.** A search for a taxonomy
mapping project kinds to verification strategies — "pure function vs stateful vs CLI vs service" — came back empty. The
closest citable grounding is the classical testability decomposition into **controllability** (can you drive the input
and internal state?) and **observability** (can you see the output?). **The carving into archetypes is inference, not a
sourced finding.**

**But the survey supplies a sharp test for whether a project is harness-able, and it is not the archetype name.** Every
conformance suite that successfully served many independent implementations shares one property, narrower than expected:

> A narrow, data-shaped I/O surface — a **pure function over serialisable data**. `(schema, instance)→bool`. `text→html`.
> `toml→json`. `sql→rows`.

That is the binding precondition, and it **cuts across the archetypes rather than along them**:

| Archetype | Data-shaped I/O boundary? | Standard harness available |
|---|---|---|
| **Pure transform / generator** | Yes, cleanly | Strongest case. Declarative case file + shared out-of-process runner. Babel, prettier, gofmt, CommonMark all live here |
| **CLI** | Yes — argv in, stdout/stderr/exit-code out | Transcript harness (trycmd, prysk, clitest). Near-zero per-project cost |
| **Pure-transform library** | Yes, if you serialise public return values | Case file over the exported surface; works |
| **Stateful library** | Partly — needs operation *sequences*, not pairs | Model-based (`fc.commands`) or sqllogictest-style record scripts. **Real per-project cost: the model** |
| **Service** | Wire contract yes; internal effects no | Schemathesis + Prism for the boundary; the 85/15 ceiling applies. Business logic unharnessed |
| **Host-app plugin** | Only at the host boundary | Manifest/emitted-artifact goldens work; the host-interaction sequence largely does not |

**So the carving holds for roughly half the fleet and degrades for the rest.** Generators, CLIs and pure-transform
libraries decompose into two standard harnesses. Stateful libraries need a per-project model — the irreducible cost.
Services get boundary conformance free and semantics not at all. Host plugins are weakest.

**The load-bearing consequence:** disposable source is affordable where the archetype has a data-shaped boundary,
because the case file is the durable artifact and the code around it genuinely is disposable. Where the boundary isn't
data-shaped, "disposable" costs a model rewrite each time and the economics stop working. **Treat "does this project
have a data-shaped I/O boundary?" as the intake question that decides eligibility — not the archetype label.**

Two honest limits on the reframe from cross-implementation to serial-rebuild conformance:

- **Serial reuse amortises the corpus, not the format or the runner.** The economics of the JSON Schema Test Suite come
  from ~70 teams sharing one corpus *and* one format *and* one runner. Serially you reuse the corpus across rebuilds of
  one project — real — but format and runner amortise only if shared across projects. **That is the actual design
  requirement: one case format and one runner across all projects, or the pattern collapses back to per-project test
  authoring.**
- **N=1 removes the independence that catches ambiguity.** Bowtie's value is the *diff between implementations* — it
  finds where a spec is unclear because two good-faith readings disagree. Serially, the same agent family re-reads the
  same requirements and re-makes the same misreadings; **a wrong expected value stays wrong forever.** Partial
  mitigation is sqllogictest's move: keep the previous build runnable and diff against it.

## 8. Where the fixed cost amortises

| Rank | Technique | Per-project residue |
|---|---|---|
| 1 | Declarative case files + one shared out-of-process runner | a data file + ~15 lines of stdio glue |
| 2 | CLI/generator transcripts as goldens | transcript files, discovered by a shared runner; **zero test code** |
| 3 | Shared harness distribution | a config file |
| 4 | Spec-driven generation (Schemathesis, Prism) | the interface description — wanted anyway — plus every actual requirement |
| 5 | Generic property/law libraries | near-zero shared value for non-algebraic code; you'd be writing the library |

### Write once, use everywhere

1. **One runner that discovers declarative cases by convention and executes the project out-of-process.** toml-test's
   contract is the model and the cheapest integration surveyed: decoder reads TOML on stdin, non-zero exit means
   "invalid", zero exit plus JSON on stdout means "valid". **Per-project cost: one executable, ~15 lines. No test
   framework, no language binding, no vendored corpus.**
2. **The normalizer — the highest-value shared component in the survey.** Every project needs path/time/version/temp-dir
   /hostname scrubbing and key-order stabilisation; none should implement it. **Accepting Jest's "you're responsible"
   framing turns per-project nondeterminism debugging into your dominant authoring cost.**
3. **A completion / `--override` mode so authors write inputs only and the tool fills in expected outputs.** Present
   independently in sqllogictest, `sqllogictest-rs --override`, Go's `-update`, rustc's `--bless`, Babel's
   `OVERWRITE=true`, `UPDATE_EXPECT=1`, `cargo insta review`. **Six unrelated projects converged on this feature; build
   it.**
4. **A skip/exclusion mechanism as data.** Bowtie's `skipped` with a required reason ("Either an issue URL or a
   human-readable message is encouraged to explain the skip"), sqllogictest's `skipif`/`onlyif`, httpwg's
   `must_fail`/`can_fail` (the latter "indicating whether failing this test is acceptable; for SHOULDs"), Jakarta's
   exclusion files, dependency-cruiser's known-violations baseline. **Necessary the moment a suite is shared and an
   implementation is deliberately incomplete — which for agent-written code is always.** The cheap wrong answer is
   editing the corpus.
5. **A schema→arbitrary→property battery for TypeScript**: round-trip, idempotence of normalisation,
   never-throws-on-schema-valid-input, rejects-schema-invalid-input, seeded determinism. **You will be writing this** —
   see §3.
6. **A shared command set for `fc.commands` covering every CLI you own**: `--help` exits 0; unknown flag exits non-zero
   with usage on stderr; `--version` matches package.json; re-run is idempotent. Authored once.
7. **A cross-project results view rather than a hand-maintained table.** The anti-example is OpenTelemetry's
   spec-compliance matrix — a 12-implementation × ~500-row grid maintained by PR, where "blank cell means the status of
   the feature is not known." **That is what you get when the conformance artifact is prose instead of data, and it is
   the failure mode a fleet drifts toward by default.**

### Irreducibly per-project

- **The description** — schema, OpenAPI document, or captured requirements. Fine; it's the point.
- **The case file / transcript.** The only test artifact worth carrying across rebuilds.
- **Step/command implementations for every action in a behavioural model.** Scales with the *action alphabet* (small)
  rather than the case count (large) — a real win — but never to zero. GraphWalker generates paths, not test code.
- **Every actual requirement.** Custom checks, properties, expected values. Four independent primary sources say in
  their own words that no tool reduces this.

## 9. Distribution and enforcement plumbing

*Relevant only to a multi-repository setting; a monorepo makes most of it unnecessary. Retained because the governance
shapes transfer.*

**Reusable GitHub Actions workflows** — "For a workflow to be reusable, the values for `on` must include
`workflow_call`." Inputs via `with`; secrets via `secrets`, or the `inherit` keyword. Max ten levels of nesting.
**Per-project residue: a caller workflow of about five lines.**

**Organization rulesets** — "Ruleset workflows can be configured at the organization or enterprise level to require
workflows to pass before merging pull requests." **Zero-per-repo enforcement.** `workflow_call` plus org rulesets is the
pair that makes a standard binding rather than aspirational.

**Default community health files** — "GitHub will use and display default files for any repository owned by the account
that does not have its own file of that type," and "they won't appear in the file browser or Git history of the
individual repositories." **True zero per-repo cost: nothing is copied.** Limit: covers CODE_OF_CONDUCT, CONTRIBUTING,
SECURITY, SUPPORT, GOVERNANCE and issue/PR templates — **not workflows or tool configs.**

**Shareable configs** — ESLint ("Shareable configs are simply npm packages that export a configuration object or
array"), semantic-release ("It allows for use of the same configuration across several projects"), commitlint presets,
`@tsconfig/*` bases, dependency-cruiser. **Per-project residue: one file per tool containing one `extends` line.**

**Template drift.** `cruft` — "makes sure your code stays in-sync with the template it came from"; `cruft update`
propagates; `cruft link` retrofits. **The important one is `cruft check`: "cruft can quickly validate whether or not a
project is using the latest version of a template."** In CI that converts template drift from invisible to a failing
build. `copier` does a three-way merge instead — "It regenerates a fresh project from the current template version. Then,
it compares both version to get the diff… Finally, it re-applies the previously obtained diff." Warning from its docs:
"Never update `.copier-answers.yml` manually. This will trick Copier."

**Renovate shared presets** — central repo conventionally `renovate-config`, referenced as `"github>owner/name"`.

**Bulk mutation.** Sourcegraph Batch Changes for scale; **multi-gitter** is the single-maintainer equivalent — "allows
you to make changes in multiple repositories simultaneously… by running a script or program in the context of multiple
repositories," and "If any changes are made, a pull request is created that can be merged manually by the set reviewers,
or automatically by multi-gitter when CI pipelines have completed successfully."

**Policy as code** — `github/safe-settings`: settings live centrally in an `admin` repo; "Unlike the GitHub Repository
Settings App, the settings files cannot be in individual repositories." Precedence: "repository > suborg > org". **The
three-tier cascade is the right shape — one baseline, narrow overrides.**

**Scorecards — conformance of the repo itself.** OpenSSF Scorecard runs 19 checks and "can run using just one argument,
the URL of the target repo." **Strongest zero-per-project-cost example, and the shape to imitate: a fleet-wide checker
that reads the repo rather than being configured by it.** (*"Needs no per-repo config" is inference from the one-argument
invocation, not an explicit doc statement.*) `repolinter` had the right pattern — rulesets split into "Rules" and
"Axioms", with recursive `extends` — but **was archived 2026-02-06.**

**Backstage.** Software Templates and Tech Insights ("a way to define facts (data points) and checks (rules)").
**Over-scoped for one maintainer — it's a portal for many teams.** Two transferable pieces: the **fact/check separation**
and the scorecard as an aggregated view. Notable negative finding: the Software Templates page makes no claim about
golden paths or baked-in best practices — that framing is marketing, not docs.

**Platform teams — what they actually standardise.** Spotify "Golden Paths" — "the 'opinionated and supported' path to
'build something'". **Note what is standardised: tool choices and a tutorial, not a test harness.**

**Zalando is the strongest example.** Their RESTful API Guidelines use RFC 2119 keywords — "The requirement level
keywords 'MUST', 'MUST NOT', 'REQUIRED,' 'SHALL,' … are to be interpreted as described in RFC 2119" — teams "are
encouraged to use our API Linter Service for automated rule checks," and Zally is "a linter for OpenAPI specifications,"
with an `x-zally-ignore` extension for per-case exceptions. **Numbered MUST/SHOULD rules in one shared document, a
linter that checks them mechanically, and a per-case ignore annotation.** That is the httpwg `can_fail` idea and the
Jakarta exclusion idea applied to repo-level standards — **and it is also the owner-readable requirements artifact,
since the document is prose a non-coder reads and the linter is the machine half.**

**Thoughtworks Technology Radar Vol 34 (April 2026), Adopt ring — "Curated shared instructions for software teams"**:
"As teams mature in their use of AI, relying on individual developers to write prompts from scratch is emerging as an
anti-pattern. We advocate for curated shared instructions for software teams, treating AI guidance as a collaborative
engineering asset rather than a personal workflow." The entry notes anchoring instructions into service templates via
`CLAUDE.md` / `AGENTS.md` / `.cursorrules`. **For an agent-written fleet the shared instruction file is part of the
harness and should ship with the template — and therefore be subject to `cruft check` like everything else.**

**Monorepo versus polyrepo.** Google's CACM paper was paywalled; only the abstract is quotable, and **the
atomic-large-scale-change claims commonly attributed to it are explicitly not sourced here.** Turborepo: "Turborepo will
search your packages for **scripts in their `package.json` that have the same name as the task**." Nx generators
"standardize how and where projects are created in your workspace."

**Verdict: a monorepo's benefit is that a harness change lands atomically across all consumers.** In a polyrepo,
approximate it with `workflow_call` + `cruft check` in CI + multi-gitter. **And copy Turborepo's convention regardless
of layout: if every project exposes `npm run verify`, the shared workflow needs no per-project knowledge at all.** That
single convention is what makes the caller workflow five lines instead of fifty.

## 10. Case formats, ranked by per-project cost

| Format | Per-project cost | Note |
|---|---|---|
| Two parallel dirs, filename-matched (csv-spectrum, YAML suite) | ~0 — drop two files | No schema to learn. **Start here.** |
| One JSON array of flat records (JSONPath CTS, httpwg, WPT urltestdata) | very low | Add `must_fail`/`can_fail` and `tags` from day one |
| Golden file + `--override`/`-update` | very low | Author writes inputs only. Highest-leverage single feature |
| Line-oriented record script (sqllogictest) | low | Buys sequencing and stateful setup; proven to survive runner rewrites |
| Examples table in prose (Gauge, Concordion, CommonMark) | low–medium | Cases live in the requirements doc; **drift-proof by construction** |
| Gherkin Scenario Outline | medium | Step definitions are real cost. Steal the Examples table, leave the NL step layer |
| Script DSL with rich assertions (`.wast`) | high | Only when the spec distinguishes many failure modes |

**The recommended combination:**

1. **Case format:** one JSON (or Markdown-table) file per project — flat records with `name`, inputs, expected outputs,
   `must_fail`/`can_fail`, `tags`.
2. **Values:** tagged `{"type","value"}` strings (toml-test) wherever types must survive cross-rebuild comparison.
3. **Ambiguity:** singular `result` vs plural `results` for acceptable-answer sets (JSONPath CTS: "Where the spec allows
   non-deterministic results… the testcase should specify an array of all the valid results").
4. **Integration:** subprocess over stdin/stdout, exit code as verdict — ~15 lines, no test framework.
5. **Expected values:** generated by a completion/`--override` mode.
6. **Partial implementations:** explicit skip-with-reason in the protocol (Bowtie), or a checked-in ledger reporting only
   changes (CommonMark's `--track`).
7. **Governance:** requirements overrule the case file; wrong cases excluded as *data*, not by forking (Jakarta).
8. **Reporting:** one shared cross-project view.

**Bowtie's IHOP protocol** — "the *i*nput → *h*arness → *o*utput *p*rotocol" — has four commands (`start`, `stop`,
`dialect`, `run`), is itself described by a JSON Schema so requests and responses can be validated with `bowtie run -V`,
and the docs' Lua tutorial harness is a ~40-line read/dispatch/write loop. Operational gotcha from the docs: "We also
have configured `stdout` for the harness to be line-buffered (by calling `setvbuf`). Ensure you've done the equivalent
for your host language."

**The design tension to choose deliberately**, from the JSON Schema Test Suite README: "This suite expresses its
assertions about the behavior of an implementation *within* JSON Schema itself… This means that the suite of tests can
test against any behavior a schema can describe, and conversely **cannot test against any behavior which a schema is
incapable of representing, even if the behavior is mandated by the specification.**" The declarative case format bounds
what can be asserted.

## 11. Ruled out, with evidence

- **Dredd** — archived Nov 8 2024, read-only; OpenAPI 3 support never left experimental.
- **fp-ts-laws** — last release 2020-10-30; 1,607 downloads/week against fast-check's 30.5M.
- **repolinter** — archived 2026-02-06.
- **`@xstate/test`** — folded into `@xstate/graph`; target the successor (`getShortestPaths`, `getSimplePaths`,
  `createTestModel`).
- **Microsoft P, TLA+, Alloy** — no executable test artifact against the implementation; per-project cost is effectively
  a second implementation. **Worst cost profile surveyed for many small projects.** Take AWS's "capture the essence of a
  design in a few hundred lines of precise description" as an idea, not the tool.
- **RESTler** — measured substantially weaker than Schemathesis in that team's own sixteen-target evaluation.
- **Pact, Microcks** — per-project authoring plus a server; only where two of your projects genuinely integrate.
- **WPT, Jakarta TCK, Backstage** — right ideas, wrong scale. Take reftests from WPT (**assert only that two inputs
  produce identical output — no expected value to author, and the natural form for generators**), the fact/check split
  from Tech Insights, and the exclusion governance from Jakarta.

## 12. Gaps

- **Google's "Change-Detector Tests Considered Harmful"** (Testing on the Toilet, 2015) — the canonical tautological-test
  critique. Blocked on three attempts. **Do not cite without fetching.**
- **Google's monorepo CACM paper body** — 403/paywalled; the atomic-change claims usually attributed to it are unsourced
  here.
- **Netflix's paved-road writeup** — Medium redirect wall.
- **Spotify Soundcheck, Monzo, Zalando's internal platform writeups** — unfetchable or not located.
- **TLA+ trace validation** (connecting a checked model to implementation traces) — real direction, but the Helwer blog
  404'd and the arXiv ID resolved to an unrelated paper. **Potentially the most relevant thing in this list, since it is
  the mechanism for tying a spec to a rebuilt implementation.**
- **"Spotify uses GraphWalker"** — folklore. Only the maintainer's Spotify employment is substantiable, from his GitHub
  bio.
- **Michael Feathers' characterization-test definition** — the gloss "don't check what the code is supposed to do, as
  specification tests do, but what the code actually and currently does" is from an Artima post quoting *Working
  Effectively with Legacy Code* ch. 13, not the book directly.
- **FIT** — quoted from Wikipedia because fit.c2.com no longer serves the original.

## 13. Net recommendation

1. **Add P9's gate as a precondition.** Model-based property testing pays when you have a good abstraction over a
   complicated implementation. If a project is a thin layer over a complicated spec, go metamorphic-plus-transcripts
   instead.
2. **Author transcripts before implementing, not after.** The difference between a specification and a characterization
   test. Free to get right at the start and impossible to retrofit. Write the scrubber/normalizer once, in the harness.
3. **Don't expect schema-derived tests to reach your requirements.** Measured ceiling ~15% real defects, and the
   generator degrades as the schema gets more precise. Interface hygiene, not behavioural specification.
4. **Pick one case format and one runner before anything else.** The serial reframe only pays if corpus, format and
   runner all amortise; serially the corpus amortises per project but format and runner amortise only across projects.
5. **Make the intake question "does this project have a data-shaped I/O boundary?", not "what archetype is it?"**
6. **Build the normalizer and the `--override` mode first.** The two shared components whose absence silently converts
   into per-project cost — nondeterminism debugging and expected-value authoring respectively.
