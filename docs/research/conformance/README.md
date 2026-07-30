# Conformance suites and rebuild verification — a research survey, 2026-07-30

Four parallel literature surveys, run to answer one question: **what would it take to treat source
code as disposable — rebuilt from captured requirements whenever a rewrite beats an extension — with
automated verification that each rebuild is faithful?**

Raw reports, kept without synthesis. Recommendations drawn from them belong in whatever process design
is written on top; what is here is the evidence.

## The surveys

| file | question |
|---|---|
| `standards-conformance-suites.md` | How do suites that define behaviour independently of any implementation actually work? |
| `rewrite-verification.md` | When a team throws an implementation away, how do they verify the replacement? |
| `implementation-independent-specs.md` | What forms of specification survive a rewrite, and what is templatable? |
| `suite-adequacy.md` | How do you know a suite is good enough to trust source deletion against? |

## Read these first

Three findings carry more weight than the rest.

**No threshold can license a rebuild, and the reason is categorical.** Mutation score's fault domain
is the operator set — a perfect score means "no single-token perturbation of *this* source survives."
A rebuild is not a perturbation of that source; it is an arbitrary program from the same behavioural
neighbourhood. It is not in the domain the metric quantifies over, so no threshold reconciles them.
Google's own scope sentence: mutation testing assesses *"whether an algorithm is correctly implemented
but not whether the correct algorithm is implemented."* See `suite-adequacy.md` §4.

**Therefore: do not delete the reference first.** The strongest recommendation in the four surveys is
that "the suite is the only thing standing between me and silent behavioural loss" is true *only if
you choose to delete the predecessor.* Keeping the old build runnable through the rebuild converts an
unanswerable question about suite adequacy into a mechanical, high-volume equivalence check. Every
divergence becomes a decision to record. See `suite-adequacy.md` §6.

**A transcript's epistemic status depends on when it was written, not what it contains.** *"A transcript
written from the requirements and then verified is a specification. The same file captured from a
passing run is a characterization test wearing its clothes. Same bytes, opposite epistemic status."*
Where the agent that writes the code also writes the goldens, a captured golden proves only
self-consistency. So the order of operations is the thing to template, not the file format. See
`implementation-independent-specs.md`.

## Two findings that cut against intuition

**Generic reusable properties are the weakest ones.** Hughes' counterexample: if every function
returning a BST returned `nil`, every invariant property still passes — `insert` could delete instead,
`union` could implement set difference. Rank property kinds by templatability and by bug-catching power
and you get nearly opposite orders. Invariants are the most reusable and the weakest; model-based are
the least reusable and the most complete.

**Version-pinnable conformance is a function of corpus size.** CommonMark and the JSON Schema Test
Suite version cleanly because they are small. test262 cannot — the practice when a spec revision
invalidates a test is to *delete the test*, and the tracking issue for revision metadata has been open
since 2016. "Conforms to test262 revision X" is not a sayable thing.

## Provenance and reliability

The surveys ran on a day with repeated API failures; three of four had delivery problems and were
resumed. Treat provenance labels as load-bearing:

- Each report distinguishes what its author fetched directly from what arrived through a summarising
  layer or a subagent. Those distinctions are preserved verbatim.
- **A summarising layer was caught fabricating a statistic** — reporting "47 bugs across 10 projects"
  where the source paper says 755 across fourteen of sixteen targets. Quotes flagged medium-confidence
  should be verified before being cited as fact anywhere in this repository.
- Two attributions in the original briefs did not survive checking and are corrected in
  `rewrite-verification.md` §0: "hairball" is not in Joel Spolsky's essay, and Fowler has no
  `ParallelRun` entry (Parallel Run is Sam Newman's pattern). `StranglerFigApplication` contains no
  verification guidance at all.
- **Google's "Change-Detector Tests Considered Harmful"** was unfetchable across several attempts. It
  is the canonical statement of the tautological-test critique and should not be cited until someone
  reads it.
- `standards-conformance-suites.md` flags the TeX `trip` test as its one real omission — *"you may not
  call it TeX unless it passes trip"* is the purest precedent for a single artifact defining an
  implementation, and the URL 404'd.

## The scale these were run against, and the scale that applies

The surveys were briefed for a fleet of "dozens to hundreds" of projects with one maintainer, which
pushed their judgement toward zero-per-project-cost techniques and away from anything requiring human
authoring.

The actual setting is smaller: **~34 packages in one pnpm/turbo monorepo, growing 3–5 per month, most
of them 1–5k lines**, with bounded manual work acceptable where it is time-efficient. Read the
templatability verdicts with that correction in mind — several techniques the surveys ruled out on
per-project cost become affordable at this scale, and the monorepo makes the whole
cross-repo-propagation section (reusable workflows, template drift, bulk mutation) unnecessary.

What does not change: the adequacy conclusion, the keep-the-reference discipline, the ordering point
about transcripts, and the finding that a data-shaped I/O boundary — not a project archetype — predicts
whether a project can be harnessed cheaply.
