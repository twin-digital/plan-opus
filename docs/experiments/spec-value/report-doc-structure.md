# Experiment result — `how-to-plan/doc-structure`

Agent's Phase 3 report, verbatim. Blind plan: `blind-doc-structure.md`, written before opening
`spec.md`. This target has two consumers — the validator `bin/check-design.mjs` and an author writing
a conforming document — and was evaluated for both. The agent was barred from reading
`bin/check-design.mjs` and any other design's `spec.md`.

## 1. Rough proportions

Counting substantive assertions in `spec.md` (~110):

| consumer | (A) changed my build | (B) confirmed | (C) surplus |
|---|---|---|---|
| checker-builder | **12 items, ~10%** | ~60% | ~30% |
| document-author | **6 items, ~5%** | ~55% | ~40% |

The gap between consumers is real but small, and it runs the opposite way from the interesting
hypothesis: the *checker* gets more out of the spec than the author, and almost all of it from one
section (`## Invariants`, lines 397–430), which is a consolidated checklist of enforcement details
that appear nowhere in the foundations.

## 2. Every (A) item, graded, with its foundation form

### Tier one — breaks the build (5)

| # | what the spec supplied | what I built blind |
|---|---|---|
| A1 | live open-question block key is `questions` (line 285) | `open_questions` |
| A2 | component's ordering field is `after` (line 183) | `depends_on` |
| A3 | open question's closing-kind field is `closes` (line 185) | `closed_by` |
| A5 | "a `run` source … its quote appears in the output that run names" (line 410) | explicitly chose *not* to verify quotes — a whole check missing |
| A9 | settle gate is the **broad** reading: "no live requirement binding the design — its own, or a wider-scope one whose `applies_to` reaches it" (line 429) | `[BLOCKED]` — I refused to pick |

**Foundation forms — A1/A2/A3 collapse into zero new entries.** They are field *spellings* for the
only two entry kinds whose requirements omit them. `r:fact-structure`,
`r:requirement-entry-structure`, `r:decision-structure`, and `r:run-structure` all name their fields
explicitly; `r:component-structure` and `r:question-structure` name the *data* and stop. Amend those
two statements to name `id`/`responsibility`/`excludes`/`after` and `id`/`question`/`closes`/`gates`,
plus one clause on `r:blocks-are-keyed-mappings` fixing the two keys as `components` and `questions`.
**Three edits, no new entries.** Why it isn't there today: `r:fact-structure`'s own rationale says
"The spec's Entry shapes and Examples sections show each field in the form it takes on disk" — the
owner deliberately delegated spelling to the spec, and then did it in the requirements anyway for four
of six kinds. This looks like drift, not a design position.

**A5** is a harness behaviour and belongs there or as one doc-structure decision:
`id: run-quotes-are-verified-against-output` / `statement: the checker verifies a run source's quote
appears verbatim in the file the run's output names`. **One entry.** Plausibly absent because "what
enforces it" is explicitly out of scope per the brief — yet the spec states it anyway.

**A9 needs zero new entries and is a foundations bug, not a spec contribution.**
`r:settled-design-cites-what-binds-it` (broad) and `r:status-derived-from-content` (narrow, "uncited
live **design-scoped** requirement") contradict each other. The spec restates *both verbatim* in
`## Design state` (lines 381–383 vs 391–393) without reconciling, then quietly picks the broad one in
`## Invariants`. The fix is one edit to `r:status-derived-from-content`. The spec is papering over an
inconsistency the owner should see.

### Tier two — different-but-defensible (4)

- **A4**: "a `run` source … sits only on a `tested` fact" (line 409). I permitted a run source on a
  `documented` fact — and I was following `r:backing-demands-its-locator`, which says the demand is a
  floor and "Further sources may take any form". **The spec contradicts its own cited requirement.**
  Foundation form: a decision `run-locator-is-tested-only`, but it is a requirement-vs-spec collision
  that should be raised, not absorbed.
- **A6**: a run's `output` path must exist. **A7**: a set must have ≥1 member. **A8**: an open
  question's `gates` resolve to decisions in the same design. All three plus the already-derivable
  `after` resolves to a sibling fold into **one decision**: `id: reference-fields-resolve` /
  `statement: every path or id a non-citation field names must resolve — a run's output to a file, a
  set to at least one existing design, a component's after to a sibling, a question's gates to a
  decision in the same design`. **One entry absorbing four checks.**

### Cosmetic (3)

- **A10**: closed-schema rejection isn't implemented today (line 129–131). Already a fact
  (`f:unknown-field-rejection-is-not-yet-in-the-harness`); zero new entries. Changes nothing a fresh
  builder would build.
- **A11**: resolution described as repo-wide match plus a separate reach check, rather than
  match-within-scope. Given repo-unique ids the two always agree. Zero.
- **A12**: the unenforced-invariant table is exactly four rows, and `r:explicit-intent` appears on
  neither the enforced nor the unenforced list. I would have marked more as unenforced. Expressible as
  an `enforced:` field on requirements plus their existing `rationale`; a schema change, not new
  entries.

**Total new entries required to close every (A): two decisions, plus four edits to existing
requirements.** Not forty. Not close to forty.

## 3. Genuinely inexpressible as foundations

**Essentially none of the (A) items.** Every tier-one item is a field name, a missing check, or an
inconsistency between two existing requirements — all cheap to express, and two of the five are
foundation defects rather than spec contributions.

Two things in the spec resist foundation form, and neither is an (A) item:

1. **The `## Invariants` section as one consolidated checklist.** The 33 mechanical checks exist as 55
   scattered requirements; the spec is the only place they appear as a list a checker-builder can work
   down in order. That is *collation*, not a claim — you cannot express "here are all of them, in
   order, grouped by entry kind" as an entry. But `bin/foundations.mjs` already collates requirements,
   so this is a tooling gap, not a format one.
2. **The copyable examples** (`r:spec-shows-copyable-type-examples`) and **the layout tree**
   (`r:spec-shows-layout-as-tree`). An example is an illustration, not a proposition; there is nothing
   to review as fiat and no falsifier to attach. This is the strongest case for the spec earning its
   place — but note that the examples are only *carrying weight* because A1–A3 left the field names
   unstated. Fix those three and the examples become confirmation rather than the sole source.

## 4. `[BLOCKED]` list and resolution

| # | blocked on | resolved? |
|---|---|---|
| 1 | settle-gate scope contradiction | **Yes**, in `## Invariants` only — and the spec restates the contradiction verbatim in `## Design state` |
| 2 | live-block key names | **Yes** — `components`, `questions`. I got one of two right |
| 3 | component / question field names | **Yes** — `responsibility`, `excludes`, `after`, `closes`, `gates`. I got three of five right |
| 4 | is an H1 permitted before `## Summary` | **No rule stated.** The spec has one (`# Design Document Structure`), so I infer yes by example only |
| 5 | markdown hygiene (trailing whitespace, inline HTML) | **Resolved by absence** — doc-structure has no such rule. My blind plan was right to omit it. The `facts/markdown-rendering.yml` entries are cited only for the fence-info-string argument |
| 6 | does `run:` hold an id or a path | **Yes** — an id. My choice was right |
| 7 | can a retired requirement say why | **Not addressed.** Still no `reason` field, still unexplained |
| 8 | may a design cite a requirement in its tiers that doesn't bind it | **Yes** — "Citing and binding are different relations" (line 328). My choice was right |
| — | `.yml` vs `.yaml` in the pools | **Not addressed** |

Four of eight resolved cleanly; two resolved but confirming a guess I'd already committed to; two left
open.

## 5. The decisive number

With `spec.md` deleted and foundations exactly as they stand:

- **Checker-builder: ~15% of the build surface at risk, roughly two-thirds of it tier one.**
  Concretely: 3 of ~20 field names wrong (every in-document block rejected), 4 invariants missing, 1
  stop-cold at the settle gate. The checker ships and passes its own tree while rejecting every
  conforming spec anyone else writes.
- **Document-author: ~5% at risk, but it stops them cold.** Three field spellings are a hard
  validation failure on any spec carrying components or open questions, and the settle gate would
  leave them under-citing forever. Everything the author must *decide* is already in the foundations;
  what they would get wrong is spelling — a lookup table, not a document.

## 6. Verdict

**Checker-builder:** No — not from foundations alone today, because three field names are stated
nowhere and the settle gate reads two contradictory ways. But the gap is about two new entries and
four requirement edits wide, and the largest single thing the spec gives them (the consolidated
invariant list) is a collation job `bin/foundations.mjs` could do.

**Document-author:** Yes for every judgement they have to make, no for the lookups. The foundations
carry the whole reasoning surface — what a fact is, what may cite what, what settles a design — and
the spec's contribution to an author is a field-name table and six copyable examples, both of which
are generatable once the two under-specified requirements name their keys.
