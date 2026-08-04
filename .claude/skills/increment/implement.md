# The Implement phase

You are running one implementation of `<product>` against the fold at a published increment, and
this file is the dispatcher every implementation runs through. The normative rules are
`docs/process-reference.md` (the Implement phase). The companion increment is a draft increment
like any other: SKILL.md carries opening it, carrying it in flight, and landing it.

An implementation may be run **by hand** — the owner and agents working the increment's own
branch, a document authored during its pull request — or **autonomously**, through the dispatch
below. Both are the same mechanism, both target an increment, and both write the same
`implementations/` record.

## 1. Bind to the design

- The target is the product's **newest published increment** on main. A record with a stale
  target is refused at merge — re-check before landing, and if a new increment published while
  you worked, retarget: read its declared delta and carry on.
- Read the effective design: `npx design-process show <product>`, then every `requirements.yaml`
  and `decisions.yaml` of the product's increments, in full. The fold binds; `drafts/` are raw
  material, never normative.
- A `deferred` decision binds nothing until answered: it names a choice and whom it is handed to.
  Its answer lands in the companion increment as an ordinary decision citing the deferral in
  `because`.

## 2. Open the companion increment

**The companion opens before any implementation work begins**, so design consequences land as
they happen. It is a draft increment on its own branch; open it as SKILL.md says.

Everything design-relevant lands there as it happens: **decisions**, **open questions** in
`questions.yaml`, and **contracts** for any new external-facing schema or API surface, bound as a
pool version through the increment's model.

Every companion entry is one of three: **licensed** — its `because` cites the deferral it
answers; an **overturn** — it `supersedes` a plan-ruled decision, legal when unpinned and counted
at the companion's ratify; or a **discovery** — neither. Licensed entries and discoveries pass;
overturns are litigated. A choice that is an implementation detail is not recorded at all: apply
the test `docs/process-reference.md` carries at *Every choice is accounted for* when triaging an
implementer's findings at wrap-up, and leave what fails it in the code.

A companion that ends the implementation with nothing declared **closes unmerged** — an increment
that declares nothing is not published.

## 3. Dispatch one implementer per package

The package set comes from the fold's decisions and the existing `product.yaml`. Dispatch **one
implementer per package**, and the package's `kind` selects its wave shape.

Every code and tree-consumed kind is the one skill `.claude/skills/implement-package`; name it and
**pass the kind**, which the implementer routes on. A kind that skill has no wave file for is an
open question for this implementation — raise it rather than guessing a shape.

Each implementer exposes three phases you can call — **survey**, **prepare**, **implement**. You
never know a kind's waves; you choose which phase to call and when.

Update `product.yaml` in the same change that creates, moves, or removes a package's files — the
mapping is descriptive, never aspirational.

## 3a. Running implementers in parallel

- Create **one integration branch per repository** receiving changes; each implementer works in
  its own worktree, on a branch off it. Never share a worktree between implementers. You merge
  finished phases back to the integration branch as they complete, in workspace dependency order.
- **Two-pass dispatch:** run every package's prepare phase in parallel; merge each finished
  prepare to the integration branch and have dependents rebase, so they build against real
  surfaces and allocations. Then run implement phases in parallel, merging completions in workspace
  dependency order — a consumer's tests go green after its providers merge. Only completion is
  ordered, never the work.
- **Every shared file is yours.** `product.yaml`, lockfiles, the implementation record, and the
  companion increment's sources have you as their only writer. An implementer reports what it
  cannot edit rather than editing it, and a change it needs from **another package** — a sibling's
  surface, or behaviour a dependent discovers it needs — comes to you and is routed to that
  package's implementer with its next dispatch, never implementer-to-implementer.
- **The findings loop runs on phase boundaries.** Nothing pushes into a working implementer:
  findings arrive with each phase's result, and anything an implementer must learn — a ruling, an
  answered question, a moved contract — arrives in its next dispatch. Record findings in the
  companion increment as they arrive, escalate what needs the owner, and fold the rulings into the
  next dispatch.
- **Reconcile the claim allocation at the prepare merge.** When every prepare has returned, diff
  the union of the returned lists against the claims in force. That diff is mechanical, and what
  it finds is a claim nobody listed. It does not settle what turns on a package's own judgement —
  whether two packages holding one claim is a deliberate split or a duplicate, whether a claim is
  unstatable in a package rather than merely unclaimed. Those reach you as findings with the
  prepare results. Resolve both kinds before any Compose is dispatched.
- A provider surface that shifts mid-implement follows the ordinary rules: unpinned — update the
  surface, merge, dependents rebase, record the supersession; bound or pinned — escalate, pausing
  exactly the dependents.
- Two implementers that genuinely must edit one file are a decomposition problem, not an
  orchestration one — split the file or merge the packages, and raise it as design work.

## 3b. Survey mode

The Plan phase's Clarify may dispatch you in survey mode against a draft increment on its branch.
The run is read-only — build nothing, record nothing: no worktrees, no integration branch, no
companion increment.

- **The dispatch covers every package the draft fold names**: those `product.yaml` holds and those
  the increment's decisions propose.
- Each package's survey returns one census — structured YAML whose entries each carry the choice
  met, where in the build it arises, and the implementer's reading.
- **Concatenate the per-package censuses and return the result to Clarify.** Persistence is the
  Plan phase's, not yours.

## 4. Land

The companion increment lands by SKILL.md's steps. What a companion's landing adds:

1. **It is ratified as a whole** at its own pull request, rather than entry by entry as a plan
   draft's Ratify loop rules them.
2. **Count its overturns** — entries whose `supersedes` names a plan-ruled decision — and state
   the count in the companion increment's pull request description, where the owner rules at
   ratify.
3. If it stayed empty, **close it unmerged** and skip to the record.
4. Only after it merges do implementation changes merge and packages release: no release and no
   in-tree deliverable goes live before the design it targets is published. The owner approves
   **one pull request, integration branch to main**.
5. **Reconcile coverage before filing the record.** Assemble the record from every implementer's
   coverage entries, then run `npx design-process show <product>`: the record must cover every
   claim in force at the target, deferred decisions excepted — the validator refuses a record with
   gaps — so the uncovered count reads zero before you file. A claim may be carried by any
   package's evidence, not only a document's.
6. **File the record** at `implementations/<product>/<NNN>-<k>.yaml` (`NNN` the target, `k` dense
   from 1), conforming to `/design-process/implementation@1`: `product`, `target`, `built_at`,
   `packages` (path + version; tree-consumed kinds carry their file's frontmatter `version`), and
   `coverage`. Coverage names every requirement and decision in force at the target except
   deferred decisions: no entry may cover a deferral directly, and a deferral without an answer is
   not a gap. An `attestation` from you on every claim you implemented — always — plus
   `code-test`, `manual-check`, or `conformance-case` entries where those artifacts exist. A `ref`
   is package-relative and names what carries the claim.
7. Verify the merged result passes `npm run check` with zero findings.
