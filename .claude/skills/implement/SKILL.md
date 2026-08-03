---
version: "4"
name: implement
description: Run an implementation of a product against its published design — dispatch one implementer per package by kind, accumulate design consequences in a companion increment, and land the implementation record. Use when asked to implement a product, an increment, or the fold of a design in this repository.
---

# Implement a product

You are running one implementation of `<product>` against the fold at a published increment.
The normative rules are `docs/process-reference.md` (the Implement phase); this skill is the
operational sequence. Validate every change with
`npm run check`.

## 1. Bind to the design

- The target is the product's **newest published increment** on main. A record with a stale
  target is refused at merge — re-check before landing, and if a new increment published while
  you worked, retarget: read its declared delta and carry on.
- Read the effective design: `npx design-process show <product>`, then every `requirements.yaml`
  and `decisions.yaml` of the product's increments, in full. The fold binds; `drafts/` are raw
  material, never normative.

## 2. Open the companion increment

Before building anything, create a branch holding the product's next increment
(`products/<product>/increments/<NNN>/`, the next number in the sequence). Everything
design-relevant lands there **as it happens**:

- **decisions** — `delegated` where nothing pins them; `proposed` where a requirement, a
  pinned decision, or a decision that would be pinned is at stake
- **open questions** — `questions.yaml`, for an unknown you cannot answer or a requirement
  change to ask for; never guess instead
- **contracts** — any new external-facing schema or API surface, as a pool version bound
  through the increment's model

A `proposed` entry, an addition or change to an external-facing schema or API surface, or an
open question is an escalation: pause only what depends on the answer, keep building
everything else. Overturning an *unpinned* decision is not an
escalation — record the supersession and continue. Where escalation does fire, bring a fact, not a
preference — CLAUDE.md carries the bar. Generate ids with `npx design-process id`.

## 3. Dispatch one implementer per package

The package set comes from the fold's decisions and the existing `product.yaml`. For each
package, the `kind` selects the agent skill to use when implementing that package:

| kind | skill |
|---|---|
| `npm-library`, `npm-cli`, `minecraft-addon` | `implement-code` |
| `document`, `agent-skill` | `implement-document` |
| anything else | raise an open question — the kind has no shape yet |

Every implementer skill exposes **prepare** — stand up what siblings compile or check
against — and **implement** — run prepare where it has not run, then complete the package; a
kind with nothing to stand up treats prepare as a no-op.

Update `product.yaml` in the same change that creates, moves, or removes a package's files —
the mapping is descriptive, never aspirational. In a multi-implementer run that file is yours
alone; see below.

## 3a. Running implementers in parallel

- Create **one integration branch per repository** receiving changes; each implementer works
  in its own worktree, on a branch off it. Never share a worktree between implementers.
- **Two-pass dispatch:** run every package's prepare phase in parallel; merge each finished
  prepare to the integration branch and have dependents rebase, so they build against real
  stubs and allocations. Then run implement phases in parallel, merging completions in
  workspace dependency order — a consumer's tests go green after its providers merge. Only
  completion is ordered, never the work.
- **An implementer's diff stays within its package's path** — the directory, or single file,
  that `product.yaml` names. Every other shared file — `product.yaml`, lockfiles, the record,
  the companion increment's sources — has you, the orchestrator, as its only writer. Implementers report what they cannot edit: proposed
  decisions, open questions, overturns, and needed shared-file changes arrive as structured
  findings, and you triage and record them in the companion increment.
- **The findings loop.** Nothing pushes into a working implementer, so the loop is built on
  phase boundaries: an implementer returns its findings — proposed decisions, open questions,
  overturns, shared-file change requests, coverage entries — as structured data with each
  phase's result, and anything it must learn (a ruling, an answered question, a moved
  contract) arrives in its next dispatch. A change needed from **another package** — a
  sibling's surface or behaviour a dependent discovers it needs — is a finding like any
  other: it comes to you, and you route it to that package's implementer with its next
  dispatch, never implementer-to-implementer. An implementer that hits an escalation mid-phase
  keeps building what does not depend on it; wholly blocked, it ends the phase early and
  returns its findings and state. You record findings in the companion increment as they
  arrive, escalate what needs the owner, and fold rulings into the next dispatch.
- **Reconcile the claim allocation at the prepare merge.** When every prepare has returned,
  diff the union of the documents' claim lists against the full in-force claim set: a claim
  two documents own, or one that no document states and no other package's evidence will
  carry, is resolved before any Compose is dispatched.
- A provider surface that shifts mid-implement follows the ordinary rules: unpinned — update
  the stub, merge, dependents rebase, record the supersession; bound or pinned — escalate,
  pausing exactly the dependents.
- **Reconcile coverage before filing the record.** Assemble the record from every
  implementer's coverage entries, then run `npx design-process show <product>`: the record
  must cover every claim in force at the target — the validator refuses a record with gaps —
  so the uncovered count reads zero before you file. A claim may be carried by any package's
  evidence, not only a document's.
- The owner approves **one pull request, integration branch to main**, opened after the
  companion increment merges.
- Two implementers that genuinely must edit one file are a decomposition problem, not an
  orchestration one — split the file or merge the packages, and raise it as design work.

## Orchestration flavours

The process fixes what must escalate; when an implementation pauses beyond that is chosen per
product, by risk, as orchestration configuration:

- **wave-by-wave** — pause after each wave for owner review before the next begins
- **run-to-completion** — run every wave, review once at the end
- **escalation-only** — stop only when an escalation fires

## 4. Land

1. The companion increment is ratified as a whole — every decision ruled (the gate blocks only
   `proposed`), every question answered or removed — and merges through the gate. If it stayed
   empty, close it unmerged.
2. Only then do implementation changes merge and packages release: no release and no in-tree
   deliverable goes live before the design it targets is published.
3. File the record at `implementations/<product>/<NNN>-<k>.yaml` (`NNN` = the target, `k`
   dense from 1), conforming to `/design-process/implementation@1`: `product`, `target`,
   `built_at`, `packages` (path + version; tree-consumed kinds carry their file's frontmatter
   `version`), and `coverage`.
4. Coverage names every claim in force at the target: an `attestation` from you on every claim
   you implemented — always — plus `code-test`, `manual-check`, or `conformance-case` entries
   where those artifacts exist. A `ref` names what carries the claim: if deleting the file
   would not touch whether the claim holds, it does not belong.
5. Verify the merged result passes `npx design-process check` with zero findings.
