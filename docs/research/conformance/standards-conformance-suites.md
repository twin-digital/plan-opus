# Standards conformance suites — how they are built, and what fails

Survey report, verbatim. **Provenance:** the author fetched primary sources directly and counted sizes by hand where
numbers appear. Sections flagged *thin* rest on recollection and were not re-verified; treat them as leads.

---

## 1. CommonMark `spec.txt` — the mechanics (strongest case, fully verified)

**The artifact.** One file:
[`spec.txt`](https://github.com/commonmark/commonmark-spec/blob/master/spec.txt). At `master` (version `0.31.2`,
dated `2024-01-28`) it is **9,811 lines / 205,025 bytes / 655 examples** (delimiters counted by hand). Prose and
conformance cases are the same document.

**The example shorthand.** Exactly 32 backticks, a space, `example`; markdown source; a line containing only `.`;
expected HTML; 32 backticks. Real block from the Tabs section:

````
```````````````````````````````` example
→foo→baz→→bim
.
<pre><code>foo→baz→→bim
</code></pre>
````````````````````````````````
````

`→` stands for a literal tab (the extractor substitutes it), so cases stay diffable and whitespace-safe. The
32-backtick fence is chosen so no case content can collide with it.

**The extractor** is one 40-line state machine,
[`test/spec_tests.py`](https://github.com/commonmark/commonmark-spec/blob/master/test/spec_tests.py) — `get_tests()`:

- three states: prose / markdown / expected-output
- ``l == "`"*32 + " example"`` → state 1; a bare `.` → state 2; closing fence → emit
- section name carried from the most recent `#+ ` heading
- emits `{"markdown", "html", "example", "start_line", "end_line", "section"}`

That is the whole spec-to-tests bridge. Notable flags:

- `--dump-tests` → the corpus as JSON, no execution. Published per version at a frozen URL:
  [`spec.commonmark.org/0.31.2/spec.json`](https://spec.commonmark.org/0.31.2/spec.json). Third parties consume
  extracted cases without running Python.
- `-P/--pattern` filters by section; `-n` by example number.
- **`--track <path>`** stores per-example pass/fail JSON and reports *only changes* — prints `fixed!` when a
  previously failing case passes. An expectations file compressed to one file, in 15 lines of code.

**Two design decisions that keep cases from over-specifying.**

1. `test/normalize.py` normalizes both expected and actual HTML (collapses insignificant whitespace, ignores it
   inside `<pre>`) before comparison. **Cases assert structure, not byte-exact rendering.**
2. The spec says so explicitly. Verbatim from **About this document**:

> These are intended to double as conformance tests. […] Note that not every feature of the HTML samples is mandated
> by the spec. For example, the spec says what counts as a link destination, but it doesn't mandate that non-ASCII
> characters in the URL be percent-encoded. To use the automatic tests, implementers will need to provide a renderer
> that conforms to the expectations of the spec examples (percent-encoding non-ASCII characters in URLs). But a
> conforming implementation can use a different renderer and may choose not to percent-encode non-ASCII characters in
> URLs.

And on why HTML at all rather than an AST:

> Since this document describes how Markdown is to be parsed into an abstract syntax tree, it would have made sense
> to use an abstract representation of the syntax tree instead of HTML. But HTML is capable of representing the
> structural distinctions we need to make, and the choice of HTML for the tests makes it possible to run the tests
> against an implementation without writing an abstract syntax tree renderer.

**That second quote is the most transferable sentence in this survey: they picked the assertion vocabulary to minimize
what an implementation must build before it can be tested at all.** For a rebuild-from-scratch artifact that is the
governing constraint.

**One corpus, several oracles.** `test/roundtrip_tests.py` imports `get_tests` and `do_test` from `spec_tests.py` and
swaps the converter: markdown → CommonMark → HTML, then compares against the same expected HTML. Same 655 cases,
second property, ~40 lines.

**Where non-spec cases live.** cmark's `test/` has `regression.txt` (5,963 B) and `smart_punct.txt` (4,175 B) in the
*identical* format, run by the same runner via `--spec`. Regression cases carry provenance as prose:

```
Issue #113: EOL character weirdness on Windows
(Important: first line ends with CR + CR + LF)
```

So: the spec file holds normative cases; sibling files in the same format hold bug-derived cases; one extractor serves
all. Plus `pathological_tests.py` (timing/blowup) and `entity_tests.py` for things the format can't express.

**Size ratio.** Hand-written cmark sources (`src/*.{c,h,re}` excluding the three generated tables) = **251,981 bytes**.
`spec.txt` = **205,025 bytes**. **The artifact that determines the implementation is ~0.8× the size of the
implementation.** This is the empirical answer to "how big does a rebuild-fidelity artifact have to be": same order as
the code.

**Versioning.** Frozen, dated, immutable revisions from 0.5 (2014-10-25) to 0.31.2 (2024-01-28), each at its own URL
with its own `spec.txt` and `spec.json`. An implementation genuinely can say "passes 0.31.2" and you can check it. The
*only* suite here that does versioning cleanly, and it is clean precisely because the file is small enough to snapshot.

**Documented weaknesses** (both primary, from the maintainer's forum):

- ["Is the spec too big?"](https://talk.commonmark.org/t/is-the-spec-too-big/1967) — §6.4 (emphasis) alone is 17 rules
  over ~10 pages, and the whole spec (~74 pages) exceeds the SGML spec and rivals the C90 language definition, to
  describe `*` and `_`. jgm's answer on the examples' status is the key governance statement: **"The intent isn't to
  lay down law with examples, but to illustrate law already laid down. If there are exceptions to this, point them out
  and we can fix them."**
- ["Which is correct: spec or example?"](https://talk.commonmark.org/t/which-is-correct-spec-or-example/3868) — prose
  said an ATX `#` run must be followed by "a space"; example 10 used a tab. Resolution: the **prose** was wrong and was
  amended. The example was not treated as authority, **but it is what caught the defect.**

---

## 2. ECMAScript test262 (verified: format, size, governance, versioning)

**Size.** ≥**50,434** `.js` files under `test/`, ~**78 MB** (the tree API truncated, so a floor). Split: `built-ins`
23,812 · `language` 22,063 · `intl402` 3,357 · `annexB` 1,086. Plus **45** files in `harness/`.

**A real case**, verbatim (`test/built-ins/Array/prototype/at/returns-item.js`):

```js
// Copyright (C) 2020 Rick Waldron. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-array.prototype.at
description: >
  Returns the item value at the specified index
info: |
  Array.prototype.at ( )

  Let O be ? ToObject(this value).
  Let len be ? LengthOfArrayLike(O).
  ...
features: [Array.prototype.at]
---*/
assert.sameValue(typeof Array.prototype.at, 'function', ...);
let a = [1, 2, 3, 4,,5];
assert.sameValue(a.at(0), 1, 'a.at(0) must return 1');
```

Note the shape: **`esid` is a pointer into the spec** (the anchor id of the clause), and `info` transcribes the
algorithm steps the case exercises. **The case carries its own traceability to the requirement.** Cheap, and worth
copying.

**Frontmatter / flags** (from [INTERPRETING.md](https://github.com/tc39/test262/blob/main/INTERPRETING.md)): `esid`,
`description`, `info`, `features`, `includes`, `flags`, `negative` (`{phase: parse|resolution|runtime, type: <ctor>}`),
`locale`. Flag values, verbatim: `onlyStrict` "The test must be executed just once--in strict mode, only."; `noStrict`;
`module`; `raw` "the test source code must not be modified in any way, files from the `harness/` directory must not be
evaluated"; `async`; `generated`; `CanBlockIsFalse`/`CanBlockIsTrue`; `non-deterministic`. `harness/assert.js` and
`harness/sta.js` are evaluated before every non-`raw` test; `includes` names extras.

**Staged features.** `features: [...]` values come from `features.txt`; runners filter on it. Tests are accepted for
Stage 3 proposals and normative PRs. `staging/` holds not-yet-normative material.

**Governance rule worth stealing**, verbatim from
[CONTRIBUTING.md](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md): **"Any test that restricts potentially
valid extensions to the ECMAScript Language will not be accepted."** An explicit, enforceable rule against encoding
accidents — the discipline CommonMark's normalizer achieves mechanically, test262 achieves by review policy.

**Versioning: this is where test262 fails.**
[tc39/test262#569, "Encoding Tests' Targeted Spec Version"](https://github.com/tc39/test262/issues/569) (opened 2016,
still open). Practice is living-suite: when a spec revision invalidates a test, consensus is **"delete the tests."**
The filed objection is that pinning to an old tag "would be cutting them off from new tests written for older
features," and that deletion "allows for inconsistency where it was previously forbidden." Proposed
`introducedin`/`invalidatedby` metadata was never adopted. **You cannot meaningfully claim "conformance to test262
revision X."** Engines instead vendor a snapshot plus a per-engine expected-failure file (V8's `test262.status` and
equivalents — *not re-verified; recollection*).

---

## 3. W3C web-platform-tests (partly thin)

**Verified: the two case formats.**

testharness.js test, verbatim minimal:

```html
<!doctype html>
<meta charset=utf-8>
<script src="/resources/testharness.js"></script>
<script src="/resources/testharnessreport.js"></script>
<body>
  <script>
    test(() => {
      assert_equals(document.characterSet, "UTF-8");
    }, "Ensure UTF-8 declaration is observed");
  </script>
</body>
```

Metadata is in-file comments: `// META: timeout=long`, `// META: script=...`, `// META: global=window,serviceworker`,
`// META: variant=?suffix`. **The `.any.js` mechanism generates `.any.html`, `.any.worker.html` etc. from one source —
one authored case, N execution environments, zero extra authoring.** Direct analogue to running one corpus against
multiple adapters.

Reftests: the test carries `<link rel=match href=test-ref.html>` (or `rel=mismatch`); pass = pixel-identical in an
800×600 window. Tolerance is declared in-file: `<meta name=fuzzy content="maxDifference=15;totalPixels=300">`,
optionally per-reference. With multiple refs: at least one `match` must match, all `mismatch` must differ.

**The reftest idea generalizes past pixels: assert equivalence between two inputs rather than an absolute expected
value.** No golden output to maintain, and it cannot encode an accident of your renderer — an oracle-free invariant.

**Thin / not re-verified:** total test and subtest counts, the wpt.fyi results API shape, MANIFEST.json details, `.ini`
expectation formats, wpt-import/wpt-export bot specifics.

**Verified on cost.** From Bocoup's ["WPT: An overview and history"](https://www.bocoup.com/blog/wpt-an-overview-and-history)
(vendor blog by participants — first-hand but secondary): "Rick Byers from Google liked this idea and funded Bocoup to
operationalize the regular execution of tests and publication of results"; "Mike Pennisi from Bocoup spent the next 2
years leading a team to build the infrastructure to run WPTs in automation every time a new browser version released";
Microsoft separately "funded Bocoup to port their manual tests to WPT." **Multi-year, multi-vendor funded engineering,
for the results infrastructure alone.**

---

## 4. sqllogictest and SQLite (verified numbers)

**Format** (from [about.wiki](https://sqlite.org/sqllogictest/doc/trunk/about.wiki)): line-oriented records.
`statement ok` / `statement error`; `query <type-string> <sort-mode> <label>` where type letters are `T` text / `I`
integer / `R` float; `----` separates query from expected result; sort modes `nosort` / `rowsort` / `valuesort`;
control records `halt` and `hash-threshold <max-result-set-size>`; and crucially **`skipif <db>` / `onlyif <db>`** to
carve out per-engine divergence inline.

Two reusable mechanisms:

- **`hash-threshold`** — above a size limit, the expected result is stored as a hash of the concatenated rows instead
  of the rows. Large expectations stop bloating the corpus. Cost: a failure diff tells you nothing. Good trade for
  machine verification, bad for human review.
- **`skipif`/`onlyif`** — the divergence annotation lives *in the case*, next to the claim, not in a side-car
  expectations file. Opposite of the WPT/Chromium `*-expected.txt` model and much cheaper for one maintainer.

**The oracle design**, verbatim: "The sqllogictest program is designed to sidestep this tedium by **using
independently developed database engines to generate the reference test results automatically**." And from
[sqlite.org/testing.html](https://www.sqlite.org/testing.html): "SLT ... is used to run huge numbers of SQL statements
against both SQLite and several other SQL database engines and verify that they all get the same answers. **SLT
currently compares SQLite against PostgreSQL, MySQL, Microsoft SQL Server, and Oracle 10g.**"

**The expected answers were never authored. They were harvested from a consensus of independent implementations.** That
is how you get a huge corpus with no authoring budget — but it only works when independent implementations already
exist. **The one technique here fundamentally unavailable to a novel library.**

**Scale, verbatim from testing.html:** "the SQLite library consists of approximately 155.8 KSLOC of C code ... By
comparison, the project has **590 times as much test code and test scripts - 92053.1 KSLOC**." Harness breakdown: TCL
tests 51,445 cases across 1,390 files (23.2 MB); TH3 50,362 cases / 1,055.4 KSLOC; **SLT 7.2 million queries, 1.12 GB**;
dbsqlfuzz ~1 billion mutations/day from 336 seed files. TH3 gives "100% branch test coverage in an as-deployed
configuration."

**Note what 590× actually is: mostly generated and harvested, not written.** The hand-authored fraction is the TCL
suite. Don't read 590× as an authoring target.

**Thin:** downstream reuse of the format (DuckDB, CockroachDB logictests, `sqllogictest-rs`, DataFusion) — exists but
not verified this session. sqllogictest itself is not versioned and makes no conformance claim; it is a
differential-testing tool, not a certification.

---

## 5. Kubernetes conformance (partly verified) and OCI (verified)

**Kubernetes — what a claim consists of**
([cncf/k8s-conformance instructions](https://github.com/cncf/k8s-conformance/blob/master/instructions.md)). Submit a PR
adding `vX.Y/<vendor-product>/` containing:

- `PRODUCT.yaml` — `vendor`, `name`, `version` ("the version of the product being certified (not the version of
  Kubernetes it runs)"), `website_url`, `documentation_url`, `type`, `description`, `contact_email_address`
- `README.md` — "A script or human-readable description of how to reproduce your results"
- `e2e.log` — "Test log output (from Sonobuoy)"
- `junit_01.xml` — "Machine-readable test log (from Sonobuoy)"

One command produces the evidence: `sonobuoy run --mode=certified-conformance` ("required for certification runs since
Kubernetes v1.16").

Versioning is the strong part: the directory *is* `vX.Y`, and **"Only the current release version and two version prior
is supported for conformance certification."** Conformance is a dated, expiring claim against a specific minor release,
and the artifact of the claim is a reproducibility script plus raw machine-readable output. **The transferable idea: a
conformance claim is a reproduction recipe plus its output, not a badge.**

**Thin:** the `[Conformance]` promotion criteria verbatim, and conformance-vs-total e2e test counts.

**OCI distribution-spec**
([conformance/README.md](https://github.com/opencontainers/distribution-spec/blob/main/conformance/README.md)). A
Go/ginkgo suite pointed at a live registry, configured entirely by environment variables in four groups: API surface
(`OCI_API_PULL`, `OCI_API_PUSH`, `OCI_API_BLOBS_*`, `OCI_API_MANIFESTS_*`, `OCI_API_TAGS_*`, `OCI_API_REFERRER`), data
generation (`OCI_DATA_IMAGE`, `OCI_DATA_INDEX`, `OCI_DATA_ARTIFACT`, `OCI_DATA_SUBJECT`), read-only mode
(`OCI_RO_DATA_*`), and config (`OCI_REGISTRY`, `OCI_TLS`, `OCI_REPO1`, `OCI_REPO2`, `OCI_VERSION`, `OCI_LOG`). Output:
`result.yaml`, `report.html` (full request/response transcripts), `junit.xml`.

**`OCI_VERSION` takes `"1.1"`, `"stable"`, or `"dev"`** and changes default API-test behavior. **The cheapest
version-gating mechanism found: one variable selects which spec revision's expectations apply, so a single suite serves
multiple frozen revisions without forking.** Compare test262, which deletes.

The **partial-conformance** model matters too: a registry declares which workflow categories it implements and is judged
only on those. **Optionality is declared by the implementation, not hidden in a skip list.**

**Thin:** OCI image-spec/runtime-spec suites, `runtime-tools`, the `oci-conformance` submission flow.

---

## 6. Older traditions (SQL and UNIX verified; C/Ada thin)

**SQL — the honest failure of conformance-by-taxonomy.** PostgreSQL's
[SQL Conformance appendix](https://www.postgresql.org/docs/current/features.html), verbatim:

> Starting with SQL:1999, the SQL standard defines a large set of individual features rather than the ineffectively
> broad three levels found in SQL-92. A large subset of these features represents the "Core" features, which every
> conforming SQL implementation must supply. The rest of the features are purely optional.

> Out of 177 mandatory features required for full Core conformance, PostgreSQL conforms to at least 170. In addition,
> there is a long list of supported optional features. **It might be worth noting that at the time of writing, no
> current version of any database management system claims full conformance to Core SQL:2023.**

> Both of these lists are approximate: There might be minor details that are nonconforming for a feature that is listed
> as supported, and large parts of an unsupported feature might in fact be implemented. **The main body of the
> documentation always contains the most accurate information about what does and does not work.**

Read that last paragraph as a warning label. **A feature-ID taxonomy with no executable suite degrades to
self-assessment so approximate that the vendor tells you to go read the prose docs instead.** NIST stopped validating
SQL in the mid-90s and nothing replaced it (*NIST FIPS 127-2 details unverified*). Meanwhile sqllogictest, which *is*
executable, makes no conformance claim at all. The two halves never joined up.

**UNIX/POSIX — conformance as trademark law.** The [Open Group register](https://www.opengroup.org/openbrand/register/)
lists UNIX 95 / 98 / 03 / V7; "Only systems that are fully compliant and certified according to the Single UNIX
Specification are qualified to use the UNIX® trademark." Current entries include **macOS 26 Tahoe**, IBM z/OS 3.1 and
AIX 7, HP-UX 11i v3. Structure: a versioned brand, a per-product certificate, a queryable register. Submission
mechanics — **thin**.

**C/C++ and Ada — thin, unverified this session.** ISO ships no official C or C++ suite; validation is commercial (Plum
Hall, Perennial) and "conformance" in practice means a compiler-support table. Ada's ACATS/ACVC was the counterexample
(mandatory government-run validation). Same for Knuth's TeX `trip` test — the URL 404'd, and **it deserves a proper
look because "you may not call it TeX unless it passes trip" is the purest version of one artifact defining an
implementation.**

---

## 7. Executable specification — the pattern, and the tool that fits best

### go-testmark — CommonMark's mechanic, generalized and language-agnostic

[warpfork/go-testmark](https://github.com/warpfork/go-testmark/). Format: a markdown comment labels the next code block.

````
[testmark]:# (my-data-name)
```json
{"key": "value"}
```
````

Hunk names are hierarchical (`foo/bar/baz`) and indexable as a tree. Stated motivation, verbatim: **"deduplicate the
work of spec fixtures and docs, both saving time, and getting more confident in the results, simultaneously"**, and
"Formats for test fixtures and example data are extremely useful. Some kind of language-agnostic format is critically
important any time you're working on a project that involves codebases in more than one language."

The feature that matters most for agent-written code: **`-testmark.regen`** rewrites the expected-output hunks in place,
"when you make a change to code and would rather review the result via something like `git diff` instead of editing the
fixture content manually" — and it is surgical: **"only the testmark data blocks change. (No markdown gets reformated;
nothing tries to normalize anything.)"** Prose is untouched by regeneration.

Used in production by IPLD (`specs/selectors/selector-fixtures-1.md` consumed by `go-ipld/selector/spec_test.go`).

**Why this beats CommonMark's format for heterogeneous projects: labelled named hunks are schema-free.** CommonMark's
`md . html` shape hard-codes a two-part, one-transform case. Testmark hunks let a case be `input` + `options` +
`expected` + `expected-error`, or three inputs and two outputs, without changing the extractor. One extractor,
heterogeneous project kinds.

The regen flag is also the honest answer to snapshot rot: **it makes accepting a change a reviewed git diff of the spec
document, not a `-u` keypress in a test runner.** The failure mode isn't eliminated, it's relocated to the place you
already review.

### JSON Schema Test Suite + Bowtie — the small-spec reference model

[JSON-Schema-Test-Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite): **432 JSON files, 2.58 MB** under
`tests/`, partitioned per draft — `draft2020-12` 80 files, `draft2019-09` 77, `draft7` 63, `draft6` 52, `draft4` 43,
`draft3` 39, `v1` 78. Verbatim case format:

```json
{
    "description": "The test case description",
    "schema": { "type": "string" },
    "tests": [
        { "description": "a test with a valid instance",   "data": "a string", "valid": true },
        { "description": "a test with an invalid instance", "data": 15,         "valid": false }
    ]
}
```

Three structural moves to copy:

- **`optional/`** — non-mandatory cases separated from the required core. **Partial conformance is expressed by
  directory, not by a skip list.**
- **`proposals/`** — per-proposal subfolders holding amendments that merge if the proposal is adopted.
- **per-revision directories with `draft4`/`draft3` marked frozen, and a `latest/` symlink.** Old revisions kept, not
  deleted (test262's mistake) and not gated by a variable (OCI's shortcut).

[Bowtie](https://docs.bowtie.report/en/stable/) is the harness: a "meta-validator of the JSON Schema specification" that
"coordinates executing *other* validator implementations, collecting and reporting on their results." Each
implementation is wrapped in a container speaking **a common JSON protocol over stdin/stdout**; Bowtie runs the corpus
across all of them and publishes a compliance report. Named for its dataflow: "it fans in lots of JSON then fans out
lots of results: `>·<`".

**Bowtie is the fleet pattern, proven.** One harness, one wire protocol, N heterogeneous implementations in N languages,
each contributing only a thin adapter.

### Archetype harnesses already in the wild

The evidence that "one declarative case format, many projects" works is strong, and it is *always* archetype-scoped:

- **ESLint `RuleTester`** — `{valid: [...], invalid: [{code, options, output, errors: [{messageId, line, column}]}]}`.
  **Thousands of third-party plugin projects, one harness, zero per-project harness cost.** Note `output` for autofix:
  input, expected diagnostics, and expected transformed output in one declarative case.
- **WPT `testharness.js`** — one harness format spanning dozens of unrelated specs.
- **`sqllogictest`** — one format, many query engines.
- **JSON-LD test suite** — a machine-readable *manifest* declaring each case's type (`PositiveEvaluationTest`,
  `NegativeEvaluationTest`) with `input`/`expect`/`options`, per operation. The runner dispatches on `@type`. **How you
  support heterogeneous case shapes in one corpus without a bespoke runner per shape.**
- **Schemathesis** — cases *derived* from an OpenAPI/GraphQL schema rather than authored.
- **MCP conformance** ([modelcontextprotocol/conformance](https://github.com/modelcontextprotocol/conformance)) —
  scenarios as TypeScript classes implementing `Scenario`; results as `checks.json`; implementation launched as a
  subprocess; `--spec-version` filters. Tradeoff: **scenarios as code, not data** — expressive, but not extractable
  from prose and not language-agnostic.
- **`fast-check` `modelRun`/`commands`** — for stateful libraries the corpus is *commands plus a model*, and the oracle
  is the model.

### Doctests: what works and what breaks

**Go example functions** are the best-designed version. From [`pkg.go.dev/testing`](https://pkg.go.dev/testing): naming
is `Example`, `ExampleF`, `ExampleT`, `ExampleT_M`, with `_suffix` for multiples. Assertion is a trailing comment:

```go
func ExampleHello() {
    fmt.Println("hello")
    // Output: hello
}
```

`// Unordered output:` matches any line order. And the decisive rule: **"Example functions without output comments are
compiled but not executed."** So an example that can't be made deterministic degrades gracefully to a compile-check
instead of becoming flaky or skipped.

**Rust doctests** are more powerful and correspondingly leakier. Attributes `ignore`, `should_panic`, `no_run`,
`compile_fail`, `edition*`, `ignore-{target}`, `standalone_crate`. Preprocessing inserts `allow` attributes, injects
`extern crate`, and **wraps in `fn main()` if absent**. Lines prefixed `#` compile but don't render. You can test your
README:

```rust
#[doc = include_str!("../README.md")]
#[cfg(doctest)]
pub struct ReadmeDoctests;
```

**`compile_fail` makes rejection a documented, executable case.** For a typed library that is the missing half of most
suites — "this must be a type error" is a requirement and needs a case format.

The leak: hidden `#` lines mean executable content and readable content diverge by design. Every doctest system
eventually needs an escape hatch for setup, and the escape hatch is where prose and test drift apart.

**Deno** runs `ts` code blocks from markdown and JSDoc via `deno test --doc` — *from search summaries only, not a
verified fetch.* **Thin.**

**Transcript formats.** [cram](https://bitheap.org/cram/) `.t` files: `  $ command`, `  > continuation`, expected output
indented two spaces, everything else is prose. Matchers append to the output line — `(re)` PCRE, `(glob)`, `(no-eol)`,
`(esc)`. Verbatim from cram's own suite:

```
  $ cram -h
  [Uu]sage: cram \[OPTIONS\] TESTS\.\.\. (re)
```

And `-i/--interactive`: "you'll be prompted to merge the actual output back into the test." Rust's `trycmd`/`snapbox`
are the descendants. **The per-line matcher idea is the good part and it's underused: tolerance declared inline, per
assertion, next to the thing it loosens** — same instinct as WPT's `<meta name=fuzzy>` and CommonMark's normalizer, and
far better than a global "ignore whitespace" flag.

---

## 8. Failure modes, with sources

### Overfitting one implementation, and single-number conformance

**Primary, and the best source found.** David Baron (Mozilla) on Acid3,
["Teaching to the test"](https://dbaron.org/log/20080406-acid3):

> I don't think it's *possible* to construct a fair measure of standards support in browsers. That involves having
> somebody sit down and decide which standards count...and which are more important than others.

His argument is that a team's standards commitment shows in work done *before* knowing which questions are on the test,
and he notes Acid3's cases were required to be broken in either Firefox or Safari — **the corpus was selected relative
to existing implementations, which is overfitting by construction.** He also caught Acid3 cases written against a 2002
Media Queries draft that had since changed — cases pinned to a spec revision nobody was implementing any more.

### Conformance passing while interoperability broke

**Primary-ish (Google's own blog).** [Interop 2022](https://web.dev/blog/interop-2022) exists because high WPT pass
rates coexisted with developers hitting incompatibilities constantly. Focus areas were chosen from **developer-reported
pain** — the MDN Browser Compatibility Report and State of CSS 2021 — not from coverage gaps. **The suite measured what
it contained, and what it contained had drifted from what mattered. The correction was not more cases; it was
re-deriving the corpus from observed pain.**

Related, from the Bocoup history (secondary but by participants): wpt.fyi deliberately computes an **interop** metric
instead of per-browser pass rates so "everyone wins as interoperability increases and there is no way for tech press to
report negatively on the 'worst scoring' browser." **The scoring function was designed around how the number would be
misused.**

**Secondary.** Java's TCK: the Apache/Oracle fight was over field-of-use restrictions on the TCK license, not test
quality ([ASF statement](https://news.apache.org/foundation/entry/the_asf_s_position_on)). The structural lesson: once
conformance is a gate that grants something, the suite's governance becomes about the gate rather than the behavior.

**Vulkan CTS** has a formal **waiver** process — file a bug against the CTS and get an exemption while still shipping as
conformant. Verified that the mechanism exists; no substantive critique found. Note the design: **a mature conformance
regime needs a documented escape hatch, or implementers route around it silently.**

**SQL** is the terminal case, and PostgreSQL says it out loud (§6).

### Versioning as a maintenance failure

test262 #569 (§2) is the cleanest instance: a living suite that deletes invalidated cases cannot support any claim of
the form "conforms to revision X," and the fix was proposed and never landed because the corpus is too large to snapshot
meaningfully. CommonMark's frozen dated files and JSON Schema's frozen per-draft directories both work — **and both are
small. Version-pinnable conformance is a function of corpus size.**

### Living documentation that stops being read

**Primary-ish (Cucumber's own project lead).** Matt Wynne,
["When Cucumbers Go Bad"](https://cucumber.io/blog/bdd/when-cucumbers-go-bad/): "most teams who adopt BDD hit a stage of
disillusionment, where they question whether their Cucumber tests are giving them enough value," and "If your plain
language sentences are boring or awkward to read, that's the complexity in your underlying code creeping out."

**His diagnosis is that the artifact reflects the code's complexity rather than the requirement's.** That is the specific
risk for a prose-plus-cases artifact written by agents: it will faithfully mirror whatever the implementation happened to
do, at whatever granularity the implementation happened to have. CommonMark's normalizer, test262's
no-restricting-extensions rule, and WPT's fuzzy matching are all mechanisms that *prevent* that mirroring. **Those
mechanisms are the important prior art, not the file formats.**

The snapshot-rot literature ("a 500-line snapshot that changes every sprint produces diffs nobody reads — they just press
`u`") was **blog-quality only** and is not leaned on here. go-testmark's answer — regeneration produces a diff in the
spec document you already review — is the mitigation to adopt.

### Governance: what wins when prose and cases disagree

CommonMark has the clearest answer, from the maintainer: cases "illustrate law already laid down," and when the
ATX-heading example contradicted the prose, **the prose was amended and the example stood.** test262's version is the
CONTRIBUTING rule that a test may not restrict valid extensions — also prose-wins, enforced at review.

**Both projects needed an explicit, written rule. Neither could leave it implicit.** For an agent-authored artifact this
rule has to exist in the artifact itself, because the agent will otherwise treat whichever it read last as authority.

---

## 9. Judgement

### Affordable only because a consortium pays

- **Results infrastructure.** wpt.fyi took multi-year funded teams (§3).
- **Six-figure corpora.** 50,000+ files (test262), 7.2M queries (SLT), 92 MSLOC (SQLite) — all generated, harvested, or
  funded. None hand-authored.
- **Review-policy-based discipline.** "Any test that restricts potentially valid extensions will not be accepted" works
  because humans staff a review rota. **With agent-written cases you need this enforced mechanically — a normalizer, a
  comparison that cannot see the accident — or not at all.**
- **Two-way vendor sync, per-implementation expectation trees.** Chromium-style `*-expected.txt` forests exist because
  many parties ship independently from one corpus.
- **Certification-as-gate.** All governance for a claim made *to third parties*. Keep only the mechanical core: a
  reproduction recipe plus its output (§5).
- **Differential testing against independent implementations.** sqllogictest's oracle trick requires peers to exist. Its
  substitutes do transfer: reftest-style equivalence between two inputs, roundtrip properties, model-based testing.

### Transfers directly

**The core mechanic: one markdown document, prose plus labelled extractable case hunks, extracted by a shared ~50-line
tool.** CommonMark proves the concept at 655 cases and proves the ratio (~0.8× the implementation). go-testmark proves
the generalized, schema-free, language-agnostic version with in-place regeneration. **Adopt testmark's named-hunk
labelling rather than CommonMark's fixed two-part shape.**

**Frozen, dated revisions of the whole artifact, published as both prose and extracted JSON.** Cheap because the
artifact is one file. What makes "the rebuild is faithful to revision X" checkable, and exactly what test262 cannot do.

**Assertion vocabulary chosen to minimize what a rebuild must construct before any case can run.** The CommonMark
AST-vs-HTML quote is the design rule. For a TypeScript library: assert over the public API surface and
JSON-serializable values only. **No internal structures, no class identities, no property order — nothing that
constrains how the inside gets rebuilt.**

**Tolerance declared inline, per case, next to the claim it loosens.** WPT's fuzzy meta, cram's `(re)`/`(glob)`,
sqllogictest's `skipif`/`onlyif`. Strictly better than global normalizer flags for a corpus an agent will regenerate.

**A structural normalizer applied to both sides before comparison.** CommonMark's `normalize.py` is the mechanism that
stops cases encoding rendering accidents. **The single highest-leverage anti-overfitting device in this survey, and it
is ~100 lines.**

**One corpus, several oracles.** `roundtrip_tests.py` reuses all 655 cases through a different pipeline in ~40 lines.
**Best coverage-per-authored-line in the survey.**

**Required/optional by directory, not by skip list**, and per-revision directories frozen rather than deleted. **Retiring
a case must be an explicit, reviewable act, or an agent will quietly delete what it cannot satisfy** — test262's failure
mode arrived at deliberately, and it would arrive by accident.

**A written rule in the artifact about what wins.** Prose is normative; cases enforce it. Both mature projects needed
this in writing. An agent needs it more.

**A case format that can express rejection.** Rust's `compile_fail`, test262's `negative: {phase, type}`, JSON Schema's
`"valid": false`. Most homegrown suites have no slot for it.

**Provenance in the case.** test262's `esid` + `info`; cmark's `Issue #113: EOL character weirdness on Windows`. One
line per case, and **it is what lets you later decide whether a case encodes a requirement or an accident. Without it
that judgement is unrecoverable.**

**Bowtie's adapter model.** Shared corpus + shared runner + a per-project stdio adapter. ESLint's `RuleTester` and WPT's
`testharness.js` show the same economics: the harness is archetype-generic, and per-project cost collapses to
declarative data.

### Would not adopt

- **Hash-only expectations** (`hash-threshold`). Machine-verifiable but unreviewable.
- **Scenarios-as-code** (MCP conformance). Forfeits extractability from prose and language-agnosticism — the two
  properties being bought.
- **Gherkin/Cucumber.** The project lead documents the disillusionment curve himself. The natural-language layer buys
  nothing when the audience is you and an agent, and adds a step-definition indirection that is pure per-project cost.
- **Aggregate pass-rate reporting.** dbaron's argument and wpt.fyi's deliberate avoidance both say the number gets
  optimized instead of the behavior. **For rebuild verification you want a binary — every required case passes, every
  knowingly-unsatisfied case is declared — not a percentage.**

### Gaps

Thin or unverified: WPT test/subtest counts, wpt.fyi results API, MANIFEST.json, `.ini` expectation formats;
Kubernetes `[Conformance]` promotion criteria and test counts; OCI image-spec/runtime-spec suites and submission flow;
sqllogictest downstream reuse; NIST FIPS 127-2; Plum Hall/Perennial and Ada ACATS; Open Group POSIX submission
mechanics; Deno `--doc`; TypeScript's compiler baseline model. **The TeX `trip` test is the one real omission** and the
first thing to chase next.
