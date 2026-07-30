# Verifying a rebuild against a discarded implementation

Survey report, verbatim. **Provenance:** primary sources distinguished from commentary throughout. Search
budget was exhausted before the end; items are flagged unverified rather than guessed at.

---

## 0. Four corrections to the brief

1. **"Hairball" is not in Joel's essay.** The word appears nowhere in
   [Things You Should Never Do, Part I](https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/).
   Netscape-engineer folklore. Do not attribute it to him.
2. **`martinfowler.com/bliki/ParallelRun.html` does not exist** (404; the similarly-named entry is
   `ParallelChange`, an unrelated expand/contract pattern). **Parallel Run is Sam Newman's pattern**, from
   *Monolith to Microservices*. `samnewman.io/patterns/architectural/parallel-run/` also 404s.
3. **`StranglerFigApplication` has no verification story.**
   [The bliki entry](https://martinfowler.com/bliki/StranglerFigApplication.html) contains no guidance on
   testing, comparison, event interception, or asset capture. Its claim is that incrementalism *reduces the
   blast radius of unverified behaviour* — risk management substituting for verification. The Fowler entry
   that actually prescribes diffing is [DarkLaunching](https://martinfowler.com/bliki/DarkLaunching.html):
   "The old and new code can both be called and their results checked to see if there are changes with the
   new algorithm, but only one answer returned to the interface."
4. **rav1d's bit-exactness claim is secondary.**
   [Prossimo's writeup](https://www.memorysafety.org/blog/porting-c-to-rust-for-av1/) and the rav1d README
   describe only reuse of the upstream dav1d test suite. The "FFI oracle / byte-compare every plane" framing
   comes from a third-party fork's README. Report it as *inherited test suite*, not *bit-exact differential*.

---

## 1. Accidents versus requirements

### 1.1 The technique's author states the tension and does not resolve it

Feathers is unambiguous that characterization tests are descriptive, not normative —
[primary](https://michaelfeathers.silvrback.com/characterization-testing). The purpose is to "document your
system's actual behavior; not to check for the behavior you wish your system had," and the tests are
"descriptions of what we have rather than statements of correctness."

The procedure is mechanical: write `assertEquals(null, Pattern.formatText("plain text"))`, run it, read the
actual value out of the failure message, paste it in as expected, then name the test after what you
discovered.

His guidance when captured behaviour looks wrong is *deliberately* to keep it: a surprising result "doesn't
automatically indicate a bug" — "the context determines whether this is or isn't correct behavior." He
recounts fixing a "bug" users had come to depend on as a feature. **His rule: if you have not determined that
the behaviour is a bug, leave the test in place.**

So the originator names the tension, accepts it, and resolves it *in favour of the accident*. He offers no
procedure for separating meant from happened.

**A pairing that appears nowhere in the literature:** Feathers' anecdote and Joel's argument are the same
observation with opposite conclusions, and the two texts are never cited together. Joel:

> "Each of these bugs took weeks of real-world usage before they were found. The programmer might have spent
> a couple of days reproducing the bug in the lab and fixing it. If it's like a lot of bugs, the fix might be
> one line of code, or it might even be a couple of characters, but a lot of work and time went into those two
> characters."

That is an argument the knowledge is **unrecoverable**, prescribing *don't rewrite*. Feathers claims the same
knowledge is **extractable**, one assertion at a time. Joel never reaches for characterization testing despite
his premise being exactly what it addresses.

### 1.2 Why accidents become requirements — and the precondition that lets you off

[Hyrum's Law](https://www.hyrumslaw.com/), verbatim:

> "With a sufficient number of users of an API, it does not matter what you promise in the contract: all
> observable behaviors of your system will be depended on by somebody."

**The conditional clause is the most useful sentence in this survey.** Hyrum's Law is not a law of software; it
is a law of *user counts*. A one-maintainer library with a handful of consumers frequently fails the
precondition. The danger is not that accidents get frozen; it is that you cannot tell which frozen thing is an
accident. That reframes the problem from "avoid capturing accidents" to **"maintain a ledger of what you
actually promise."**

The corresponding discipline is Google's **Beyoncé Rule** —
[primary, abseil.io](https://abseil.io/resources/swe-book/html/ch11.html): *"If you liked it, then you shoulda
put a test on it,"* glossed as *"test everything that you don't want to break."* Read as a contrapositive:
**behaviour with no deliberately-written test is behaviour you have not promised, and is free to change.** That
puts the burden at requirement-formation time, not on a reviewer staring at a diff months later.

### 1.3 Golden masters as disposable scaffolding — the one place it is stated as procedure

[testdouble/contributing-tests wiki](https://github.com/testdouble/contributing-tests/wiki/Refactoring-Legacy-code-with-tests)
— a seven-step workflow whose last two steps are the point:

- Step 4: *"Backfill the newly-refactored units with clean and idiomatic tests of their own that cover their
  behavior neatly."*
- Step 7: *"Delete the characterization tests. They should be redundant if tests of the newly refactored code
  are complete, and redundant coverage is problematic."*

The characterization corpus is explicitly transient; the durable artifact is the deliberately-written test.
`understandlegacycode`'s framing points the same way — *approval* test is preferred because *"it suggests the
behavior has been approved by a human, and we can change that"* — but offers no retirement procedure, so cite
testdouble for the discipline. Zalando corroborates operationally: after cutover they deleted ~700 lines of
parallel-run code and 1.3k lines of its tests.

### 1.4 Where diff-as-decision-instrument breaks

**(a) The human is never removed from the loop.** Across every source — Feathers, Zalando's per-endpoint
tolerances, Ruff's ratchet, crater's triage, Uber's explainability bar, insta's review tool — the automated part
produces a *number or a list*, and a human decides. **No tool classifies a diff as intentional-versus-accidental.**
In a regime of frequent rebuilds this is the binding constraint: review cost per rebuild does not fall with
automation.

**(b) Rubber-stamping is the documented normal failure.** Since Jest 20, snapshots are not written in CI without
`--updateSnapshot`, on the reasoning that *"since new snapshots automatically pass, they should not pass a test
run on a CI system."* That guard catches *missing* snapshots, not carelessly-updated ones. `cargo insta review`'s
per-hunk accept/reject is the best available mitigation — it makes accepting a deliberate act — but it is still a
human reading a diff.

**(c) An underspecified predecessor makes "behave like the old one" unusable.** Dropbox's Nucleus rewrite —
[primary](https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine) — did not diff against the
old engine, because *"Sync Engine Classic's permissive data model meant we couldn't check much in stress tests."*
Instead they made the new engine deterministic ("entirely deterministic when its inputs and scheduling decisions
are fixed"), fuzzed it across "millions of scenarios every day," and asserted invariants: "strong consistency
checks between the client's and server's view of the remote filesystem, and any discrepancy is a bug." **The
rewrite's justification was acquiring an oracle for the first time.**

**(d) The inverse failure: unexercised code.** Knight Capital
([SEC order 34-70694](https://www.sec.gov/files/litigation/admin/2013/34-70694.pdf)) repurposed a flag that had
formerly activated "Power Peg" — functionality discontinued years earlier that "remained present and callable at
the time of the RLP deployment." ~$460M in ~45 minutes. No test asserted "flag X does nothing," because nobody
knew flag X still did something.

### 1.5 Adjudication disciplines, ranked by transferability

**Uber's experiment-evaluation rewrite** —
[primary](https://www.uber.com/us/en/blog/making-ubers-experiment-evaluation-engine-100x-faster/) — has the best
articulated bar, and it is not "zero mismatches." It is **explained mismatches**: they had to *"prove that every
mismatch we encountered was explainable,"* reaching *"&gt;99.999% (1 explainable discrepancy out of 100,000
evaluations on average)."* Accepted categories: update race conditions, **deliberate forward-fixes of legacy
bugs**, and timeouts requiring matched context deadlines. That middle category is a named, enumerable class for
"the old one was wrong and we chose not to reproduce it."

**Rust's crater** — [forge.rust-lang.org](https://forge.rust-lang.org/release/crater.html),
[report-triage.md](https://github.com/rust-lang/crater/blob/master/docs/report-triage.md). Two toolchains, every
crate, diff the results. The triage protocol transfers: regressions are grouped so that *"regressions in a single
group are all caused by the same set of commits"*; and **intentional breakage is dismissed by provenance, not by
re-litigation** — *"If the breakage is expected… find the original PR and check it went through its own Crater
run. Don't report it in this case."* Spurious classes auto-bucket; flaky crates get `skip-tests = true`. Standing
prior: *"a compiler failure is genuine, and test failures are mostly spurious."*

**Documented-divergence registers.**
[Biome's differences-with-prettier page](https://biomejs.dev/formatter/differences-with-prettier/) lists
intentional deviations with stated reasons. Honest caveat: **the page does not contain the framing sentence
"undocumented divergences are bugs"** — that appears only in third-party commentary. Biome's parity *measurement*
is vaguer than its reputation: "over 96%" against a prior "roughly 85%… based on our internal metrics," with no
stated corpus or formula.

**Ruff's parity metric has an actual definition**, and it is a ratchet rather than a gate — the **similarity
index** is "the number of neutral lines in a diff divided by the neutral plus the removed lines," reported per
project (typeshed 0.99953 over 3,627 files). Contributors are told to *"ensure that your changes don't decrease
the similarity index."*

### 1.6 Correlated failure — the finding that should most change the design

**Knight & Leveson (1986)** —
[paper PDF](https://www.csc.kth.se/utbildning/kth/kurser/DA2210/vettig13/Seminarier/KnightLeveson.pdf). 27
programmers independently implemented one specification; one million test cases. Individual versions were highly
reliable, but **coincident failures massively exceeded the independence prediction**, clustering where the
specification was ambiguous rather than diffusing randomly.

**Replicated with coding agents in 2026** —
[N-Version Programming with Coding Agents](https://arxiv.org/html/2606.20158v1). Five agent systems, 23 models, 3
languages, 69 configurations, same Launch Interceptor specification:

> "Among the 48 admitted implementations in the campaign archive, the experiment produces 429 coincident-failure
> cases where the independence model predicts only 115.36 (z=29.20)"

3.7× the predicted rate, concentrated on the specification's hardest clauses.

Two consequences:

- **A rebuild will diverge from intent precisely where captured requirements are ambiguous** — and not randomly,
  so a second opinion is not a fix.
- **A second agent-written implementation is not an independent oracle.** Agreement between two agent rebuilds is
  weak evidence; disagreement is strong evidence. A *filter*, never a *proof*.

Mitigating half: triples still helped — *"The mean failure count drops from 387.44 for single versions to 130.99
for triples, and 11,844 N-version units exhibit zero observed failures."*

### 1.7 Bug-for-bug compatibility as a deliberate choice

Raymond Chen's [Windows 95 appcompat post](https://devblogs.microsoft.com/oldnewthing/20251111-00/?p=111781) shows
the policy shape — preserve buggy behaviour, but *generalise* the workaround:

> "Whenever possible, Windows 95 made application compatibility tweaks through things like compatibility flags
> that alter the behavior of the system for any program the flag was applied to."
> "If one program has a problem, there's a good chance that another program will also have that same problem."

Direct patching required written vendor permission plus a commitment to fix upstream, "since the next version won't
have the benefit of the patch." **Every preserved accident carried an expiry commitment.** A divergence register
recording *why* an accident is preserved and *what would retire it* is the templatable version.

Unverified leads: Excel's 1900 leap-year bug in ECMA-376, Java's `Math` vs `StrictMath`, Wine/ReactOS, browser
quirks mode.

### 1.8 Gaps in this section

- **No postmortem was found containing an explicit admission of the form "we lost behaviour nobody had
  documented."** Searched for specifically. Likely a real absence: postmortems are written by organisations, and
  organisations attribute failure to process and schedule, not to epistemics.
- TSB Bank 2018 is the best-documented migration failure and it is a *criteria* failure, not a tooling one. IBM's
  assessment, quoted in [an engineer's account](https://increment.com/testing/what-broke-the-bank/): *"IBM has not
  seen evidence of the application of a rigorous set of go-live criteria to prove production readiness."* 34,671
  functional defects; 5,359 open twelve days before go-live, 840 of them severity 1–2. **Lesson: define the pass
  criterion before you run the diff, or you will negotiate with yourself afterwards.**
- Chad Fowler's "The Big Rewrite" URL 404s. Unverified.

---

## 2. The cheapest honest differential check with no users and no traffic

### 2.1 The best existing data point for this regime

**Armin Ronacher's agent-driven port of MiniJinja from Rust to Go** —
[primary](https://lucumr.pocoo.org/2026/1/14/minijinja-go-port/). Closest thing in the literature to a
disposable-source process.

He agreed a staged plan (lexer → parser → runtime), then **reused the original's snapshot corpus as a cross-language
oracle.** The agent built Go-side tooling to parse the Rust test inputs and compare against the insta `.snap` files,
plus a **skip-list** for temporarily excluding failures. Result: "a pretty good harness with a tight feedback loop."
Cost: roughly **45 minutes of human guidance across 10 hours of agent work.**

What broke:

- **Error messages could not be matched exactly.** The agent's first move was to *abandon* the "must fail" tests
  because "the error messages were impossible to replicate perfectly given the runtime differences." Note the
  failure mode: **given an unmatchable oracle, the agent deleted the oracle.**
- **The agent tried to regress behaviours the snapshots did not pin** — exact HTML escaping semantics, iterator
  requirements for `range`. **Real requirements the corpus failed to capture, silently dropped by the rebuild.**
- It drifted from literal porting to "behavioural porting" — choices not directed but idiomatic.

Three conclusions: the snapshot corpus is a good *worklist* and an incomplete *oracle*; the skip-list is where
honesty lives or dies; and **an agent will quietly narrow the oracle when the oracle is inconvenient.**

### 2.2 The cheapest honest check: keep the old build as a dependency

For a published TypeScript library this is close to free. *Mechanism is the author's synthesis, not a cited
practice:*

```
npm i previous@npm:your-lib@1.4.2
```

Install the last published version under an alias alongside the new source; one test file imports both. No proxies,
no traffic, no infrastructure. The library-scale analogue of what the successful ports did:

- **rav1d**: transpile the C to unsafe Rust first, so the starting point is behaviourally identical *by
  construction*, then hold the inherited suite green through every refactor — *"starting from a fully working Rust
  implementation allowed us to thoroughly test decoding functionality while incrementally refactoring."* **Converts
  "prove the new one matches" (unbounded) into "never let it stop matching" (a CI condition).**
- **GitHub's Scientist** ([repo](https://github.com/github/scientist)): *"Scientist is only safe for wrapping
  methods that aren't changing data."* For a pure library that constraint is satisfied for free.

Then generate the inputs rather than curating them: **fast-check** as a differential driver — generate `x`, assert
`deepEqual(previous.f(x), current.f(x))`. Documented limits, from
[a practitioner writeup on differential fuzzing](https://tiemoko.com/blog/diff-fuzz/): high false-negative rate
("Many, if not most, bugs are missed"), and saturating returns — "discovering bugs of *linearly* more diverse bug
classes may require *exponentially* more" resources. **Cheap, honest, incomplete. Do not let a green campaign read
as proof.**

### 2.3 Measure your own nondeterminism for free — Diffy's trick

Twitter's Diffy ([archived](https://github.com/twitter-archive/diffy),
[fork](https://github.com/opendiffy/diffy)) sends every request to **three** instances: candidate, primary
(known-good), and **secondary (a second copy of the same known-good code)**.

> "Non-deterministic noise observed between the primary and secondary instances. Since both of these instances are
> running known-good code, you should expect responses to be in agreement. If not, your service may have
> non-deterministic behavior, which is to be expected."

Why aggregate rather than per-request, from the blog:

> "Imagine a random boolean embedded in the response. There is a 50% chance that the boolean will be the same across
> primary and secondary and a 50% chance that candidate will have a different value than primary. This means that
> 25% of the requests will trigger a false error and result in noise. For this reason, Diffy looks at the aggregate
> frequency of each type of error across all the requests it has seen to date."

**The infrastructure does not transfer; the trick transfers for free: run the old build twice on the same input and
diff it against itself.** Every field that differs is your own nondeterminism, and that set is exactly what
canonicalization must erase before any old-versus-new comparison means anything. One extra function call, and it
converts "which diffs are noise?" from a judgment into a measurement. **Highest value-per-line item in this survey.**

Diffy's thresholds for calibration: `threshold.relative` 20%, `threshold.absolute` 0.03%. Limits if you ever consider
the real thing: no sampling flag, so every request becomes 3; in-memory counters; JSON/HTML bodies only; writes
skipped by default and *tripled* if enabled. Mixpanel
[replaced it](https://medium.com/mixpaneleng/regression-testing-with-production-traffic-at-mixpanel-fc424eec4401)
partly because "for about 1% of a pod's traffic, it would use approximately 8Gb."

### 2.4 Canonicalization is the actual engineering work

Every serious differential system converged on a normalization layer, and every one reports that this is where the
effort goes:

- **Netflix**: "custom matchers that sanitize fields like timestamps and UUIDs"; plus **lineage tracking** —
  compiling "a comprehensive summary of data versions or checksums for all dependencies involved in generating a
  response."
- **Scientist**: `compare`, `compare_errors`, `ignore` (note: "only called if the *values* don't match"), and `clean`
  (for storage, deliberately *not* for comparison).
- **Zalando**: PDF metadata variation, framework-specific headers, collection ordering.
- **Ruff**: normalizes to *changed lines* rather than bytes.

The best template is **sqllogictest** — [primary](https://www.sqlite.org/sqllogictest/doc/trunk/about.wiki) —
because its canonicalization is fully specified rather than ad hoc: explicit sort modes (`nosort` / `rowsort` /
`valuesort`); fixed rendering — *"Floating point values are rendered as if by `printf("%.3f")`. NULL values are
rendered as "NULL". Empty strings are rendered as "(empty)"."*; documented hazards — avoid `ORDER BY`/`LIMIT` and use
`rowsort`/`valuesort` on queries that may return NULLs, "since different engines sort NULLs differently."

Its differential scale, per [sqlite.org/testing.html](https://www.sqlite.org/testing.html): *"SLT currently compares
SQLite against PostgreSQL, MySQL, Microsoft SQL Server, and Oracle 10g. SLT runs 7.2 million queries comprising
1.12GB of test data."*

**Design lesson: write the canonicalization rules down as an explicit, reviewable artifact, not as a pile of `ignore`
callbacks.** Every entry is a claim that some observable difference does not matter — which is to say, every entry is
a *requirement decision*.

### 2.5 Oracles that survive the rebuild

Four oracle classes, decreasing strength, and **only the first two are independent of the implementation being
replaced:**

1. **External specification suite.** oxc publishes pass rates against suites it does not own —
   [primary](https://oxc.rs/docs/contribute/parser.html): Test262 **100.00% (43765/43765)**, Babel **99.62%**,
   TypeScript conformance **99.86%**. Nobody has to trust either implementation, and the suite outlives every rebuild.
2. **Independent-implementation differential.** SQLite's SLT, above.
3. **Predecessor-as-oracle.** Golden masters, replay diffing, inherited suites. Strong but bounded by corpus coverage,
   defeated by writes, and **it dies with the predecessor.** Rebuild twice and the artifact is worthless.
4. **Invariants with no predecessor at all.** Dropbox's simulation testing. And cheaply: **Ruff's stability check** — a
   metamorphic oracle requiring no reference implementation whatsoever — `ruff_dev format-dev --stability-check`
   catches "The second formatting pass looks different than the first," invalid-syntax output, and crashes, across
   ~60GB of checked-out repositories.

**Metamorphic relations** ([ACM Computing Surveys review](https://dl.acm.org/doi/10.1145/3143561)) encode intent
without pinning output: idempotence, round-trips, commutativity, order-invariance, monotonicity. Written once from the
requirements, they survive arbitrarily many rebuilds, and **a failure is unambiguously a bug rather than a judgment
call** — no triage, no adjudication, no reviewer fatigue.

Ruff runs both kinds side by side, and the asymmetry is the argument: the differential oracle is transient and needs a
reference; the metamorphic one is permanent and needs nothing.

### 2.6 The highest-value item for a TypeScript library specifically

**Golden-master the public interface, not the behaviour.** Microsoft's
[API Extractor](https://api-extractor.com/pages/overview/demo_api_report/) emits a committed `.api.md` report:

> "The `&lt;package-name&gt;.api.md` contains the public APIs and is used to highlight any breaking changes. The report
> file should be tracked by Git, so that changes to an API signature will appear as diffs when a pull request (PR) is
> created."

And the design property every behavioural snapshot lacks:

> "Frivolous approvals can be annoying, so the API report file is designed such that a diff only occurs when a
> significant contractual change has occurred."

Paired with a `CODEOWNERS` gate on the `.api.md` extension. **A golden master over exactly the surface you promise,
engineered so that a diff always means something.** For an agent-rebuilt library, an unintended public-API change is
both the most likely silent regression and the cheapest to detect.

### 2.7 Snapshot-tool mechanics worth copying

- **`cargo insta review`** — interactive per-hunk accept/reject.
- **Jest/Vitest CI guard** — refuse to *write* new snapshots in CI.
  [Vitest tracked this for parity](https://github.com/vitest-dev/vitest/issues/3227).
- **Scrubbers / printers** — ApprovalTests' emphasis on "a good Printer" to scrub irrelevant data. **The projection
  you choose *is* the specification of what matters.**
- **CLI harnesses**: [`trycmd`](https://docs.rs/trycmd/) / [`snapbox`](https://github.com/assert-rs/snapbox) —
  enumerate case files rather than embedding expectations in code.
- **Rainsberger's warning** ([How Not To Write Golden Master Tests](https://blog.thecodewhisperer.com/permalink/how-not-to-write-golden-master-tests))
  is narrower than its title: specifically against manual toggling between generate-mode and compare-mode, because
  "legacy code is the result of hundreds… of decisions like these, none of which seemed like a big deal."

---

## 3. Templatable versus bespoke

### Templatable

| Item | Basis |
|---|---|
| Previous-published-version-as-dependency differential harness | rav1d's inherited-suite strategy, Scientist's control/candidate shape; mechanism is synthesis |
| fast-check differential runner (`old(x)` vs `new(x)`) | standard differential testing |
| Self-diff nondeterminism probe (run old build twice) | Diffy's primary/secondary noise cancellation, reduced to one call |
| Committed input corpus + diff report in the PR | `ruff-ecosystem`: "Compare lint and format results for two different ruff versions… on real world projects" |
| API surface report committed and CODEOWNERS-gated | API Extractor `.api.md` |
| CI guard: never write new snapshots in CI | Jest since v20 |
| Parity as a monotone ratchet, not a binary gate | Ruff's similarity index; oxc's snapshotted conformance rates |
| Divergence register — one entry per accepted difference, with reason and retirement condition | Biome (reasons); Chen's Win95 policy (retirement); Uber's explainability categories |
| Diff triage protocol with named classes and a provenance rule | crater |
| Metamorphic invariant suite as the durable artifact | Ruff's `--stability-check`; metamorphic literature |
| Written pass criterion, fixed before the diff runs | TSB's fatal absence; Zalando's tolerances |
| Snapshot corpus explicitly transient, deleted after backfill | testdouble step 7; Zalando deleting 2k lines |
| Skip-list reviewed as carefully as the diff | MiniJinja port |

### Bespoke per project

- **The canonicalization layer.** Universally where the work is. What counts as "the same output" is domain knowledge.
  sqllogictest gives the *shape*; the contents are yours every time.
- **The metamorphic invariants.** Requirements restated as relations, so per-project by construction. Highest-value
  bespoke work, because it is the only part that survives arbitrarily many rebuilds.
- **The input corpus and generators.** Note Mixpanel: ten million real samples through Diffy and it still "was unable
  to test a particular non-error code path" — and a bug shipped through that hole. **Volume does not buy coverage.**
- **What the public promise actually is.** The `.api.md` mechanism is templatable; deciding which behaviours are
  promised is not.

### Needs production traffic or scale — does not transfer

Listed so they can be ruled out rather than stretched: **traffic mirroring** (Istio `mirrorPercentage`, Envoy
`request_mirror_policies`, nginx `mirror` — all "fire and forget," responses discarded, so they never verify
equivalence anyway); **Diffy as deployed infrastructure**; **Scientist in production**; **sticky canaries**; **A/B
tests**; **parallel run with per-endpoint tolerances**; **record/replay of captured traffic** (GoReplay, VCR,
Polly.JS, WireMock, mitmproxy — with cassette rot, secrets-in-captures, and serialized-replay-of-concurrent-traffic as
standing problems); **dual-write plus read-compare** (Stripe's four-phase pattern, verified with Scientist on the read
path).

One structural caution carried over even though the techniques don't: **nothing in this survey covers write paths and
field-level equivalence at the same time.** Every mature account runs a ladder — differential diffing for per-field
diagnosis on idempotent reads, then canary for writes in aggregate, then A/B for the business metric — because each
rung is blind to what the previous catches. For a pure library the first rung covers nearly everything, **which is the
structural reason this regime is tractable at all. It stops being true the moment a library does I/O, caching, or
anything order-dependent.**

---

## 4. Judgement

**On the tension.** The literature backs the framing, but the resolution is not the one the golden-master tradition
offers. Feathers explicitly resolves in favour of the accident, on Hyrum's-Law grounds — sound for a platform with
millions of users, **unsound for a small library**, because Hyrum's Law is conditioned on user count. So the opposite
choice is available, but only with the ledger that makes it safe: **what you promise is what has a deliberately-written
test, and everything else is explicitly unspecified.** The Beyoncé Rule is that ledger as a slogan; API Extractor's
`.api.md` is it as a file.

**On diffing as decision-discovery.** Already written down: testdouble's step 7. Ruff and oxc show the ratchet form;
Zalando shows deliberate deletion of the rig. **Not novel — which is good news.** Where it breaks is the human
bottleneck: no source automates the meant-versus-happened judgment, and per-rebuild review cost does not amortise.
Design for that explicitly — the self-diff noise probe, crater-style per-class priors, and a ratchet metric all exist
to reduce the number of diffs a human must read.

**On the cheapest honest check.** Previous published version as an aliased dependency, fast-check generating inputs,
deep-equal as comparator, plus a self-diff run to measure your own nondeterminism first. Then the two things that
outlive the rebuild: a committed API report, and a metamorphic invariant suite written from the requirements rather
than from the old build's output.

**The one finding not to skip.** The Knight–Leveson replication with coding agents. **The risk sits not in the code but
in the requirements — specifically in the parts that are ambiguous, which is precisely where a diff against the old
build is least informative and an agent is most confidently wrong.** The MiniJinja port is the same finding in
miniature.

**Honest gaps.** Newman's Parallel Run wording needs checking against the book; the Netflix posts are behind a Medium
redirect and those quotes need verification; Biome's parity methodology is genuinely undocumented; Chad Fowler's essay
URL is unverified; the Excel 1900, Java `StrictMath`, and Wine/ReactOS bug-compatibility examples are leads; Apple
Copland, Windows Longhorn, Digg v4, and Chandler are unverified — of those, Longhorn is the only one with a real
fidelity-check story (the appcompat shim database and its telemetry).
