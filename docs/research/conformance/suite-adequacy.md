# Suite adequacy — can any metric license deleting the source?

Survey report, verbatim. **Provenance:** the author read the Google mutation-testing papers and the
Gopinath tech report as PDFs directly; items marked otherwise came via a subagent or search summaries
and are flagged in place. The core adequacy-metric literature (Just et al. FSE 2014, Papadakis et al.
ICSE 2018, Inozemtseva & Holmes ICSE 2014) was **not** verified in session — see §7.

---

## 1. Mutation score as a fleet-level gate: no

A dashboard of 100 mutation scores cannot rank rebuild-safety, because **the metric is not comparable
across the axis you'd be comparing on.** Six reasons, strongest first:

- **Project variance swamps the signal.** Gopinath et al. (tech report, fetched directly): "mutation
  tools rarely agree, often with large differences, and **the variation due to project, even after
  accounting for difference due to test suites, is significant**" — concluding that "research using a
  single tool, a small number of projects, or small increments in mutation score may not yield reliable
  results." Cross-project ranking on small score differences is precisely the use they say is
  unreliable.
- **Denominator noise varies per project.** TCE (ICSE 2015) measured per-program equivalent-mutant rates
  of **3%–17%**. A 10-point score gap between two projects can be entirely composition of unkillable
  mutants.
- **The score is line-weighted by arbitrary multiplicity.** Google ICSE 2021 RQ4: "&gt;90% of cases, either
  all mutants in a line are killed, or none are." A project with dense arithmetic lines and one with
  sparse lines get different scores at identical suite quality.
- **Language and operator mix shift it.** Google's per-language survivability: TypeScript 10.7%, Dart
  16.3%. Productivity: Java 87.2%, Python 70.6%. SBR alone is 68% of their mutant volume.
- **Goodhart bites hardest with one maintainer.** "Unproductive killable" mutants are Google's **"Very
  common"** category. The cheapest way to raise a score is the change-detector test Google warns
  "violates testing best practices and causes brittle tests and false alarms."
- **De-noising doesn't port.** Google's &gt;100 arid-node rules are "specifically tailored for the
  environment of the developers who provided the feedback, and a different context will require deriving
  new, appropriate heuristics."

**What the dashboard *can* do:** coarse outlier detection. A project at 20% is genuinely worse-constrained
than one at 85%. That's triage — "look here first" — not a gate.

## 2. What Google rejected, and on what grounds

Verbatim from *Practical Mutation Testing at Scale* §2, read as a PDF directly:

> "it remains prohibitively expensive to compute the absolute mutation score for the codebase at any
> given fixed point due to the size of the code repository. It would be even more expensive to keep
> re-computing the mutation score in any fixed time period (e.g., daily or weekly), and it is impossible
> to compute the full score after each commit. In addition to the computational costs of the mutation
> score, we were also unable to find a good way to surface it to the developers in an actionable way,
> **as it is neither concrete nor actionable, and it does not guide testing.**"

From ICSE 2021 §II, also read directly:

> "**Even if it were feasible, the mutation score itself is difficult to act on by developers.**"

Two further quotes came via subagent rather than direct read — flagged: ICSE 2021 §IV-D, "**we do not
compute the mutation score** but rather report mutants as test goals"; and the Mutation 2018 workshop
abstract, "achieving mutation adequacy is **neither practical nor desirable**."

**The grounds are two, and separating them matters.** Cost is a Google-scale problem — 2B LOC, 500M daily
test executions — and does *not* transfer to a small library. **Non-actionability is scale-independent**
and does: "neither concrete nor actionable, and it does not guide testing." That is a claim about what
the number means, not what it costs.

What they use instead: **mutant productivity** (developer marks "Please fix" vs "Not useful") and per-file
**survivability** as a rate. Both are judgments or rates, not an absolute score.

## 3. Published thresholds for gating a rebuild: nobody

Plainly, as a finding: **no published work gates a rebuild, regeneration, or rewrite on a test-suite
adequacy metric.** Further:

- No published account of a mutation score as a hard release/CI gate at any significant organisation, for
  any purpose.
- No tool documentation states a target score. StrykerJS ships
  `thresholds: {high: 80, low: 60, break: null}` — `break` is the build-failing threshold and it defaults
  to **null**, gating off (fetched from the config docs).
- The 2025-26 "regenerate the implementation, tests are the durable artifact" material is blog and vendor
  content with no measurement behind it.

**Caveat on strength:** this is absence across many searches, not a study that counted and reported zero.
The EMSE 2022 "Mutation testing in the wild" study (&gt;3,500 repos) was the right instrument and no CI-gate
count could be extracted from it.

You would be inventing, not adopting. Weight any number accordingly.

## 4. The fault-domain mismatch

In FSM conformance-testing theory, a suite is *m-complete* — provably establishes equivalence to the
specification — **only relative to a fault domain** (the implementation has at most *m* states). Outside
that domain the guarantee evaporates: an implementation can agree on every tested input and diverge
afterwards. *Provenance: search-result summaries of the conformance-testing survey literature, not papers
fetched. Framing sound; phrasing is the author's.*

Mutation score has exactly this shape. Its fault domain is **the operator set** — Google's five are AOR,
LCR, ROR, UOI, SBR. A 100% score means: *no single-token perturbation of this specific source survives.*

A rebuild is not a single-token perturbation. It's an arbitrary program drawn from the same behavioural
neighbourhood, written from a different starting point, with different internal structure. **It is not in
the domain the score quantifies over.** No threshold reconciles that, because the mismatch is categorical,
not a matter of degree.

Two empirical supports, both Google ICSE 2021 (read directly):

- 30% of real high-priority bugs were uncoupled from any mutant, and in **23 of 50** hand-classified
  misses **no mutation operator could plausibly exist**.
- Their scope sentence: mutation testing "is effective in guiding testing to assess whether an
  **algorithm is correctly implemented** but not whether the **correct algorithm is implemented**."

And independent reimplementation from a shared specification is empirically unsafe: Knight & Leveson
(1986), 27 implementations, 1M inputs, "the number of input cases in which more than one failed was
substantially more than would be expected if they were statistically independent" — from shared
misreadings of ambiguous spec. This replicates with agents: *N-Version Programming with Coding Agents*
(2026), https://arxiv.org/abs/2606.20158, 48 agent implementations, "many of those co-occurring failures
can be traced to where the specification is particularly hard or ambiguous." **Agents rebuilding from a
suite will fail together where the suite is vague — and mutation score cannot see suite vagueness at all.**

## 5. What covers the structural gap, ranked by unattended viability

Mutation testing perturbs code that exists. Behaviour nobody implemented has no line to mutate; behaviour
nobody tested shows up as `NoCoverage`, which is just coverage again.

1. **Differential against the old build — best, and fully unattended.** Needs no oracle beyond the artefact
   being replaced, no human judgment per run. Verified precedent: SQLite's SQL Logic Test runs **7.2 million
   queries cross-checked against PostgreSQL, MySQL, SQL Server and Oracle** (fetched from
   sqlite.org/testing.html); WebAssembly ships a reference interpreter as oracle alongside its suite. The
   service-level tooling (Scientist, Diffy, Feathers' golden-master) is blog-grade documentation but a
   well-established pattern.
2. **Property-based generation — good, semi-unattended.** Running properties is unattended; *writing* them
   is not. *Agentic Property-Based Testing* (https://arxiv.org/html/2510.09907v1, fetched) shows agents can
   author them at ~$5.56/report across 100 packages — but **56% valid**, a wide false-discovery interval
   (30.2–57.8%), and a named failure mode ("intent ambiguity"). Generation automates; **triage does not.**
3. **Fuzzing — weakest fit.** Jazzer.js brings libFuzzer to Node, but fuzzing's yield is crashes and
   memory-safety faults, which a memory-safe TypeScript library largely doesn't have.

Only (1) covers divergence never conceived of, without a human in the loop.

## 6. Smallest sufficient composite, and the recommendation

**The composite.** Three signals, none a percentage to optimise:

- **Zero `NoCoverage` mutants on the public API.** Binary; can't be inflated.
- **Zero untriaged surviving mutants** — each killed, or annotated unproductive with a written reason.
  Google's *productivity* discipline at one-maintainer scale.
- **Differential agreement between old and new builds** over a large generated-input budget. This is the
  actual gate; the first two are pre-conditions.

**The recommendation, in full:**

1. **Make the differential harness the gate; everything else is secondary.** Before deleting anything, pin
   the current build as `reference` (published version or copied `dist/`). Write one harness driving both
   implementations over identical inputs and diffing results, fed from three sources: example tests,
   generated inputs over the public API's input types, and a recorded corpus of real inputs. Rebuild, run
   it, and treat every divergence as a decision you must make and record as a test. Drop the reference only
   when the harness is clean over a large budget.
2. **Build the suite from properties, not just examples.** Properties survive source deletion as
   specification; examples pin points. Use fast-check, including model-based mode for anything stateful.
   Agent-authored properties are viable — with triage budgeted, per the 56%-valid figure.
3. **Use StrykerJS as a pre-rebuild finder, never as a release gate.** `coverageAnalysis: "perTest"`,
   `thresholds: { break: null }` — gating off deliberately — `incremental: true`. Run it *once, before* the
   rebuild and work the survivor list to exhaustion. The deliverable is the list, not the percentage. For a
   cheap first pass, restrict to statement-block-removal: 68% of Google's mutant volume and the operator
   closest to "does any test notice this code exists."
4. **Track the two binary numbers, not a score.** With an unsuppressed operator set on a small codebase, the
   fastest way to raise a score is the brittle capacity-asserting tests Google warns degrade a suite.
   Additionally, read the survivor list specifically for mutants in code the tests *execute but never
   observe* — unasserted-but-covered regions look green on every coverage report and constrain nothing.
   (Cheap stand-in for checked coverage; see the addendum.)
5. **Assume the suite is ambiguous wherever rebuilds disagree.** Both N-version results say implementations
   fail together at underspecified points. So every divergence is *two* defects: the behavioural one and the
   specification gap that admitted it. Fix both.
6. **Keep a rebuild retrospective.** Per cycle, log every infidelity the suite missed, classified by why (no
   coverage / covered but unasserted / no property / genuinely unforeseeable). The only adequacy measure here
   with real evidential force, because it measures against actual rebuilds rather than synthetic faults. The
   "escaped defect rate" literature found for it is entirely blog-grade — treat it as own instrumentation,
   not an adopted metric.

**The thing to resist:** "the suite is the only thing standing between me and silent behavioural loss" is
true *only if you choose to delete the reference first*. Don't. Keeping the old build as an oracle through
the rebuild converts an unanswerable question about suite adequacy into a mechanical, high-volume
equivalence check. That substitution is the highest-value move available.

---

## Addendum: assertion quality and test smells

**Checked coverage** (Schuler & Zeller) uses dynamic slicing to ask not "was this statement executed?" but
"did any executed statement actually contribute to a value an oracle checked?" The
[STVR 2013 version](https://www.st.cs.uni-saarland.de/publications/files/schuler-stvr-2013.pdf) reports a
**20 to 66 percentage point** gap against statement coverage, worst case XSTREAM at 66pp. Note the ICST 2011
conference version and the STVR extension **report different numbers from different setups** (43% vs 67%
average) — cite one and say which.

Its authors volunteer the weakness:

> "checked coverage can be fooled. One way to fool checked coverage to obtain a higher score would be to
> introduce weak or nonsensical checks. For example, asserting that an object is equal to itself… In
> general, this is a drawback of checked coverage compared with mutation testing."

So checked coverage resists *omitted* oracles but not *vacuous* ones. **Mutation testing is the more
gaming-resistant of the two.** Also: the `try { …; fail() } catch` idiom contributes almost nothing
(+2.54pp average).

**Test smells: the association is real, the detectors and any aggregate score are not.**
[Spadini et al., ICSME 2018](https://repository.tudelft.nl/file/File_d4ef271e-b50a-4f8c-a329-231c133af975)
(221 releases, 10 systems, &gt;1M test cases, all p&lt;0.0001) finds smelly tests ~47% more change-prone
(RR 1.47) and ~81% more defect-prone (RR 1.81). Two findings cut against the simple reading:

- **Size dominates.** RR climbs 1.56 → 3.55 for defect-proneness purely with test size (&lt;30 vs &gt;60 LOC).
- **Smell count is near-meaningless**: "the co-presence of more test smells in a test method is not
  associated with higher defect-proneness." **Any metric that sums smells is unsupported by the paper
  usually cited for it.**

And the detectors are contested. [Panichella et al., EMSE 2022](https://doi.org/10.1007/s10664-022-10207-5),
against hand-annotated ground truth: "the current vocabulary of test smells is highly mismatched to real
concerns"; the older tool "misclassified over 70% of test smells." Tufano et al., ASE 2016 adds that in ~80%
of cases smells are never removed, mostly from unawareness.

**Confirmed negative:** no study counts assertion-free test methods in human-written code. The only rate
found (~31%) is for *generated* tests, and is unverified. If quoted about human suites, it's folklore.

## 7. What did not survive

The core adequacy-metric literature is **unverified**: Just et al. (FSE 2014), Papadakis et al. (ICSE 2018),
Inozemtseva & Holmes (ICSE 2014), Namin & Andrews, Kochhar et al., and the suite-minimisation fault-loss
numbers. Directions known; coefficients not quoted. The answers above don't rest on them — even a strong
Just-et-al. correlation wouldn't license a rebuild gate, because it correlates mutants with *real faults in
existing code*, not with *infidelity in a replacement*. To fill the gap, fetch Papadakis et al. ICSE 2018
first.
