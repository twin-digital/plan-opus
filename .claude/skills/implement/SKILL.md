---
name: implement
description: Run an implementation of a product against its published design — dispatch one implementer per package by kind, accumulate design consequences in a companion increment, and land the implementation record. Use when asked to implement a product, an increment, or the fold of a design in this repository.
---

# Implement a product

You are running one implementation of `<product>` against the fold at a published increment.
The normative rules are `docs/process-reference.md` (the Implement phase) and
`docs/agent-guidance.md`; this skill is the operational sequence. Validate every change with
`npm run check`.

## 1. Bind to the design

- The target is the product's **newest published increment** on main. A record with a stale
  target is refused at merge — re-check before landing, and if a new increment published while
  you worked, retarget: read its declared delta and carry on.
- Read the effective design: `design-process show <product>`, then every `requirements.yaml`
  and `decisions.yaml` of the product's increments, in full. The fold binds; `drafts/` are raw
  material, never normative. Where a draft claim and a foundation disagree, the foundation
  wins.

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

A `proposed` entry or an open question is an escalation: pause only what depends on the
answer, keep building everything else. Overturning an *unpinned* decision is not an
escalation — record the supersession and continue. Generate ids with `design-process id`.

## 3. Dispatch one implementer per package

The package set comes from the fold's decisions and the existing `product.yaml`. For each
package, the `kind` selects the wave skill:

| kind | skill |
|---|---|
| `npm-library`, `npm-cli`, `minecraft-addon` | `implement-code` |
| `document`, `agent-skill` | `implement-document` |
| anything else | raise an open question — the kind has no shape yet |

Update `product.yaml` in the same change that creates, moves, or removes a package's files —
the mapping is descriptive, never aspirational.

## 4. Land

1. The companion increment is ratified as a whole — every decision ruled (the gate blocks only
   `proposed`), every question answered or removed — and merges through the gate. If it stayed
   empty, close it unmerged.
2. Only then do implementation changes merge and packages release: no release and no in-tree
   deliverable goes live before the design it targets is published.
3. File the record at `implementations/<product>/<NNN>-<k>.yaml` (`NNN` = the target, `k`
   dense from 1), conforming to `/design-process/implementation@1`: `product`, `target`,
   `built_at`, `packages` (path + version; tree-consumed kinds — document, agent-skill — carry
   the `built_at` date as their version), and `coverage`.
4. Coverage names every claim in force at the target: an `attestation` from you on every claim
   you implemented — always — plus `code-test`, `manual-check`, or `conformance-case` entries
   where those artifacts exist. A `ref` names what carries the claim: if deleting the file
   would not touch whether the claim holds, it does not belong.
5. Verify the merged result passes `design-process check` with zero findings.
