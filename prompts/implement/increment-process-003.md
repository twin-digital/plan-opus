# Implement `increment-process`, targeting increment 003

You are running the first implementation of the `increment-process` product — the process
implementing itself. The design is published; your job is to build its deliverables, record the
design consequences properly, and land the first entry in the `implementations/` pool.

## What binds you

The effective design is the fold of `products/increment-process/increments/001..003` —
`requirements.yaml` and `decisions.yaml` of each, read in full, plus the model bindings they carry
and the pool schemas under `schemas/design-process/`. The `drafts/` folders are raw material for
the documents you will ship — never normative. Where a draft claim and a foundation entry
disagree, the foundation wins; a draft claim resting on nothing is extracted or dropped, not
transcribed.

Before starting, confirm the target: `d-ki941p9b` requires your record's `target` to be the
**newest published increment at the moment it merges**. Increment 004 (the authoring document,
PR #136) may publish while you work. If it does, retarget: read its declared delta — for 004 that
is one draft, no foundation changes — and carry on. Check again before landing.

## The companion increment (open this first)

Per `d-ig8vxolb` and the "Amending the implemented design" section of 003's draft: open a branch
holding the product's **next free increment number** before you build anything. Everything
design-relevant you produce lands there as it happens:

- **decisions** — entering `delegated` where nothing pins them (`d-n23bxend`); `proposed` where a
  requirement, a pinned decision, or a decision that would be pinned is at stake
- **open questions** — a requirement change to ask for, an unknown you cannot answer
  (`questions.yaml`, per increment 002; a question blocks whatever depends on its answer)
- **contracts** — any new external-facing surface, as a pool version bound through the model

A `proposed` entry is an escalation: pause what depends on it, ask the owner, keep building
everything else. At completion the whole increment is ratified — every decision ruled, every
question answered or removed — merges through the gate, and **only then** does the implementation
publish (`d-rputf2bx`). If the companion increment stays empty, close it unmerged.

Ids come from the opaque-id regime (`d-e5ted839`, `d-vx26i23m`): `{r|d|q}-` + 8 random lowercase
base36 characters. Until the id-generator CLI exists (you are building it), generate them the same
way and check uniqueness across the product.

## The deliverables (decomposition is ratified — build to it)

### 1. Tooling — opus workspace packages (`d-cfe28w5z`, accepted, pinned)

The validator, the projection, and the id generator ship as packages in the **opus monorepo**
(`twin-digital/opus`), and this repository installs them at pinned versions through its top-level
`package.json`. How many packages and their internal structure is yours — record the choices as
delegated decisions in the companion increment. Wave shape: Define → Stub → Code → Document
(`d-rvvijts2`).

What the validator must enforce is enumerated by the `design-validator`-faceted claims across
001–003. The inventory, by source:

- **001**: gate on every PR, any failure blocks (`r-zcvxh2ty`); published increments are
  immutable — refuse any edit (`r-caao9k3z`); no `proposed` decision at merge (`r-0axqvtcc`);
  pool identity — unique `$id`, immutable once bound-published, references resolve
  (`r-2fytqadu`); model references resolve, no duplicate entity names in force (`r-bua9wl1s`);
  no global/area requirement scopes; preset conflicts block (`r-bwtud1e5`); every structured
  file validates against the pool schema its `version` names (`d-i47qv6oa`); id format and
  uniqueness (`d-e5ted839`).
- **002**: no citation resolves to a question (`r-m36ie8ee`); no `questions.yaml` with entries on
  main (`r-ygg7q7rh`, `d-uzygmhfc`).
- **003**: api pool identity per-tech headers (`d-u3u3sbmb`, `r-lll68661`); a record's target is
  the newest published increment at merge (`d-ki941p9b`); record naming
  `implementations/<product>/<NNN>-<k>.yaml` (`d-vsrxwv8u`); records validate against
  `/design-process/implementation@1`.

The legacy `design/` tree is still live: `bin/check-design.mjs` keeps validating it until the
migration empties it (001's migration draft: the validator accepts both trees until the last
design moves). Don't break `npm run check` for the old tree; the cheapest path is the new
validator running beside it.

### 2. Documents — top-level `docs/` in this repository (`d-lm8br2p2`, `d-hdz4drvp`, accepted, pinned)

Separate documents, each scoped so an agent loads only what its task needs. The initial set, each
a `document`-kind package with `repo: twin-digital/plan-opus`:

| document | drawn from |
|---|---|
| the process reference | 001 `incremental-development.md`, 002 `open-questions.md`, 003 `implementation-process.md` |
| the agent guidance | 001 + 003 `agent-guidance.md` |
| the migration record | 001 + 003 `process-migration.md` |

Wave shape: Claims → Compose → Check (`d-o81xclq7`, delegated — the shape is yours to refine).
The claim list is a **selection and an allocation, not a restatement**: from everything in force
at the target, the claims *this* document is responsible for stating, each mapped to where it will
be stated. Compose from the frozen drafts, checking every draft claim against the fold as you go —
the drafts predate several rulings, so expect drift: rung vocabulary is gone, "the fold" never
names a version, escalation and wrap-up are one companion increment. What you find superseded, you
write to the fold, not the draft. Exact filenames under `docs/` are yours; record them as
delegated decisions.

The authoring document is **not** yours: `d-y775xabw` gives it its own package, and increment 004
(PR #136) carries its draft. Skip it unless 004 publishes before you land, in which case its
Claims allocation joins your pass or waits for a later implementation — your call, recorded.

### 3. Merge-gate wiring — thin repository configuration (`d-jenq1f31`, accepted)

Commit a small workflow in this repo that installs the tooling packages and runs the check.
Branch protection marking it required is **set by hand once** — you cannot do this; ask the owner
at the point it's needed, and cover the claim with a `manual-check` entry recording the steps.

### 4. `product.yaml` — update as you realize packages (`d-8itv1czm`)

Add each package entry in the same change that creates its files: the document packages, the
tooling packages (their `path` is workspace-relative in opus), the mapping never aspirational.

## Landing

1. Companion increment ratified and merged (gate-clean: no proposed, no questions).
2. Implementation changes merged — documents go live at their `docs/` homes on merge.
3. The record: `implementations/increment-process/<NNN>-1.yaml` where `<NNN>` is the newest
   published increment at that moment, conforming to `/design-process/implementation@1`:
   `product`, `target`, `built_at`, `packages` (path + version), `coverage`.
4. Coverage: every requirement and decision **in force at the target** gets an entry
   (`r-tue7kfgt`) — an `attestation` from you at minimum (`d-4s0zoh1v`), `code-test` where the
   validator's own suite carries a claim, `manual-check` for the branch-protection setup. Name in
   `ref` what carries the claim — if deleting the file wouldn't touch whether the claim holds, it
   doesn't belong.

One known wrinkle you will hit: the record schema requires a `version` per package, and document
packages have no released version. Decide something sensible (the merge commit, a date), record
it as a delegated decision in the companion increment, and move on — it is exactly the kind of
choice the process expects you to make and record rather than ask about.

## Conduct

- The owner rules; you propose. Facts follow the evidence bar in `CLAUDE.md` — documented means
  upstream citation, tested means artifacts plus a run under `evidence/`.
- Published increments are read-only. 001's drafts contain stale vocabulary; they stay as they
  are.
- Decide at the tier that has the information: don't re-open ratified decisions for phrasing; a
  fact that contradicts one is a stop-and-ask.
- Validate every change with `npm run check`, and with your own validator once it runs.
