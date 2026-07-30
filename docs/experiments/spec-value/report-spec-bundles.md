# Experiment result — `how-to-plan/spec-bundles`

Agent's Phase 3 report, verbatim. Blind plan: `blind-spec-bundles.md`, written before opening
`spec.md` (398 lines).

## 1. Proportions

I counted ~65 substantive assertions in the spec.

| bucket | count | share |
|---|---|---|
| **(A) changed my build** | 13 | ~20% |
| **(B) confirmed my build** | ~35 | ~55% |
| **(C) surplus** | ~17 | ~25% |

Of the 13 (A) items, graded by severity:

- **Breaks the build — 5** (A1, A8, A9, A10, A11)
- **Different-but-defensible — 3** (A6, A7, and the `version`-stamping boundary)
- **Cosmetic — 5** (A2, A3, A4, A5, A12, A13 — collapsing the two trivia)

**The decisive number:** with `spec.md` deleted and the foundations exactly as they stand, the
*bundle content* comes out ~95% correct (one wrong top-level YAML key), the *version algorithm* comes
out ~60% correct (two of its three diff inputs missing entirely), and the *run's preconditions* come
out ~40% correct (cold start hard-fails, cycles hang). Roughly **a fifth of the build is at risk, and
about a third of that risk is tier one.**

## 2. The (A) items, with proposed foundation form

### Tier one — a builder ships something wrong or stops cold

**A1. `commitments.yaml` has a top-level `commitments:` key.**

> "The top-level key `commitments` maps to a sequence"

I chose a **bare sequence at document root**, reasoning that "one flat sequence"
(`r:commitments-are-a-flat-id-and-statement-list`) meant the document *is* the sequence, and that
foundation files in this repo are bare sequences. I was wrong. Every consumer parsing the file breaks.

→ **Fold into the existing requirement.** Append "the sequence sits under a top-level `commitments`
key, always present, empty where a design has none." Absorbs A2 as well. **Zero new entries.**

**A8. An untagged upstream makes a bundle *wait*, not fail.**

> "A bundle whose upstream has never been tagged cannot be derived, and waits. That is a condition on
> one bundle rather than a rule about what a run covers"

I marked this `[BLOCKED]` and chose **hard-fail the publish**. That choice destroys the cold-start
backfill: the first run would fail every bundle that has an upstream, and
`d:settled-specs-are-backfilled-on-the-first-run` never happens. This is the worst error in my blind
plan.

**A9. A dependency cycle is detected and reported; the bundle publishes nothing.**

I never considered cycles at all. My plan would loop or deadlock.

→ **One new decision absorbs both:**

```yaml
- id: an-underivable-bundle-waits-rather-than-failing
  statement: a bundle whose upstream carries no tag is not derived on that pass and waits for one
    rather than failing the run; a bundle whose edges put it in a cycle is never derived, publishes
    nothing, and the cycle is reported
  status: accepted
  falsifiers:
    - a bundle waits indefinitely and nothing surfaces that it is stuck
```

**A10. The bump diff includes the `components` block from `spec.md`, not just `commitments.yaml`.**

> "a component's `id`, `responsibility`, or `excludes` changed or the component is gone — those three
> being a component's whole interface"

I read `d:bump-is-computed-from-the-commitment-diff` as meaning the commitments file only. A
component-interface change would have shipped as **patch** under my plan, sliding under every
consumer's caret range. Note also that `after` is deliberately *not* compared — a field-level detail I
had no way to reach.

**A11. Dependency ranges are a bump input.**

> "or a dependency's major moved" → major; "a dependency's minor or patch" → patch

I omitted dependency ranges from the diff entirely.

→ **Reword the existing decision.** `d:bump-is-computed-from-the-commitment-diff`'s statement names
one surface; it needs to name three and give the component field set. The statement grows to about
three lines and stays reviewable. **Zero new entries.** This is the highest-value cheap fix available.

### Tier two — defensible divergence

**A6.** The deriver emits `package.json` *without* `version`; the publisher stamps it in. My interface
took `version` as a deriver argument and blanked it for the compare — functionally equivalent,
different boundary. → Already carried by the `components` block, which is structured data (see §5).

**A7.** Product/feature names are kebab-case; product names unique, feature names unique within
product, a design scope appears at most once, every named scope must resolve to an existing design, a
product holds a scope *or* features but never both. I had two of these five in my error taxonomy. →
**One new decision**, `product-map-entries-are-unique-and-resolvable`.

### Cosmetic — I would drop these rather than spend entries on them

**A2** empty-sequence rule (folds into A1's edit). **A3** sort order (`id` with prefix ignored, ties by
full id — I chose scope-then-file-order; any *stable* order satisfies the byte-compare, since both
sides run through the same deriver, so nothing downstream could tell). **A4** `description` = first
sentence of the spec's `## Summary` (I chose `Spec bundle for <scope>`). **A5** the literal
`git+https://github.com/twin-digital/plan-opus.git` (I had a placeholder; a builder can read the
repo's own remote). **A12** a feature repointed at a different design continues the same version line.
**A13** which bundles a merge puts through is not this design's call.

## 3. Genuinely inexpressible as foundations

**None of the tier-one items.** All five fit in **two reworded existing entries plus one new
decision** — a net change of one entry to a foundation set of 37. That is the honest headline.

What the spec carries that a foundation entry could not is entirely in bucket (C), and none of it
changes what a builder builds:

- The re-derivation drift warning — "the one thing that can move both sides is the deriver itself…
  That is the honest behaviour rather than a defect to design around." Real engineering knowledge for
  a future maintainer; zero build payload.
- The npm-unpublish hole, restated for a consumer's benefit.
- The argument for why the registry was chosen, and why the dependency rule is exactly two filenames.

The one place **neither** artifact carries the payload is the **README boilerplate's actual wording**.
The spec describes what it must cover and stops; my plan flagged the same gap. A builder still has to
invent it.

## 4. `[BLOCKED]` list — 7 of 10 resolved

| # | blocked on | resolved? |
|---|---|---|
| 1 | commitment ordering | **yes** — differently from my choice, but any stable order works |
| 2 | does the byte-compare exclude `version`? | **yes** — exactly as I chose |
| 3 | tokens inside code spans / fences | **no** — spec says "every citation token"; same inference I made, no more |
| 4 | `repository` value | **yes** — literal given, no `directory` sub-field |
| 5 | how the author raises the bump | **no** — restated with no mechanism |
| 6 | untagged upstream | **yes** — opposite to my choice (this was my worst error) |
| 7 | does `files` enumerate vendored paths | **yes** — as I chose |
| 8 | `description` text | **yes** — differently from my choice |
| 9 | README wording | **no** |
| 10 | where the deriver lives | **yes** — via the components block plus the harness boundary statements |

## 5. The finding I did not expect

The single most build-shaping part of `spec.md` is the **`components` block** — and that is already
structured data, not prose. Five components with `responsibility`/`excludes`/`after` fix the module
boundaries, the deriver/publisher split (A6), the two-pass dependency resolver, and the "reads nothing
from the registry" constraint. It happens to live inside `spec.md` only because `doc-structure` puts
components there. If you deleted the prose and kept the components block, three of my thirteen (A)
items would still be answered.

For a data-shape design, the prose's irreducible field-level payload turned out to be **one YAML key,
one sort rule, one manifest field's derivation, and two additions to a diff rule** — roughly five
field-level facts, and they fit in a handful of entries, not dozens.

## 6. Verdict

A competent builder working from today's foundations alone would have produced a bundle whose content
is right in every respect but one YAML key, and a version algorithm that is quietly, dangerously
wrong — under-scoring component-interface and upstream-major changes as patches — while hard-failing
the very first publishing run. The spec is doing real work, but the work it does that a builder needs
is small and cheap to relocate: two reworded entries and one new decision would close every tier-one
gap, leaving the remaining 80% of the document as confirmation and argument.
