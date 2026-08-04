---
version: "12"
name: plan
description: Run the Plan phase for one draft — open it unnumbered on its own branch, work Clarify in the foundation sources, and loop Ratify through the draft's pull request until the owner declares it settled and the merge gate passes, landing it into the next number. Use when asked to plan an increment, run the Plan phase, or drive a product's design to a mergeable state in this repository.
---

# Plan an increment

You are driving one draft increment of `<product>` from creation to publish: Capture, Clarify,
the survey offer, the Ratify loop, and landing. The normative rules are
`docs/process-reference.md` (Capture, Clarify, Open questions, Ratify, Publish is the merge);
the content-quality rubric is `docs/authoring.md`; this skill is the operational sequence.
Validate every change with `npm run check`.

## 1. Capture — open the draft

- Open the draft as `products/<product>/increments/<slug>/` on its own branch, named
  `plan/<product>/<slug>`. No check requires the branch name; it is the default to reach for.
- **The draft holds no number while it is worked.** Several drafts of a product run Clarify at
  once, none committed to a sequence position; the number is claimed only at landing (§6).
  Opening a draft never requires targeting the product's next head number, and never waits on
  another draft.
- A draft that builds on another **branches from it** — that git ancestry is the dependency,
  and nothing is declared. Its tree carries the ancestor's content while both are in flight. A
  draft that builds on nothing in flight branches from `main`.
- Populate the requirements source directly with the owner. The draft's scope is nothing more
  than the changes its sources declare.
- Generate ids with `npx design-process id {r|d|q}`.

### Adopting from the backlog

Send-to-capture pulls held items into this draft:

```
npx design-process backlog send <increment-dir> [--item <id>]... [--product <id>] [--tag <tag>]...
```

`<increment-dir>` is a repo-relative `products/<product>/increments/<name>` — a slug-named
draft as readily as a numbered one. At least one selector is required; a bare `send` is an
error, not a drain of everything.

Sent items land at `products/<product>/increments/<name>/drafts/backlog/<id>.md`, and the
operation deletes them from the backlog in the same action. **That file is raw material.**
Adopt it by writing the foundations you plan into this draft's own sources at the ordinary
bar — never move the text across. The draft's sources are the record; the backlog keeps none.
An item's content is judged here, at adoption, and nowhere earlier.

Capturing *into* the backlog is one ceremony-free action, available to anyone mid-task — no
pull request, no increment, no review gate:

```
ID=$(npx design-process backlog add <product>)   # body on stdin; add prints only the id
```

## 2. Clarify — work the foundation sources

Find the places missing research and do the spikes. Everything lands in the sources as it
happens:

- **facts** — what research finds, at the evidence bar: a documented upstream citation with a
  verbatim quote, or a test you ran with its artifacts and a recorded run under `evidence/`.
  Search `node bin/foundations.mjs --facts` and cite what exists before recording.
- **open questions** — `questions.yaml`, for an unknown you cannot answer, routed by `answer`
  (fact, decision, or requirement); raising one is a form of answering now, and beats a guess.
- **decisions** — the big-picture calls that follow from the requirements, entering
  `proposed`. The consumer-visible package set a build would need is proposed here too, as
  decisions: decomposition is design work. A choice that cannot yet be made is recorded as
  a decision too — a deferral, its statement naming what is deferred and to whom; a
  question routed to a decision may close by minting one.
- **contracts** — the shapes the design speaks about, bound through the model as they settle.

**Plan fixes the public shape only.** Structure below the package surface is the
implementer's; pre-deciding internal names and boundaries from the plan tier manufactures
churn. Files under the draft's `drafts/` directory are optional scaffolding — raw material the
fold outranks.

## 3. Check before Ratify

Check every foundation against the closing checklist of `docs/authoring.md` before putting it
to the owner — the same checklist the post-Clarify review agents load as their rubric.
Finding nothing to raise is a successful review.

While the draft is worked, `npm run check` reports an `increment-dir-name` finding for the
slug-named directory, beside the proposed-decision and open-question findings. All three are
expected in flight and all three clear before the merge. **No validator change ships for
parallel drafting** — the finding is cleared by the landing rename (§6), never by relaxing the
check.

## 4. Survey — offer it and classify the census

Before Ratify, report what the draft has captured and ask the owner whether to dispatch the
survey. Recommend from the delta's shape: for, when packages, contracts, or consumer surfaces
change; against, when norm-only. The owner's word runs it, any number of times across the loop.

- Dispatch the implement orchestrator in survey mode — read-only — against the draft fold on
  the draft's branch. The survey covers every package the draft fold names: those
  `product.yaml` holds and those the draft's decisions propose.
- Classify every choice the census returns: **decided** — a foundation determines it;
  **deferred** — a ruled decision names the choice and whom it is handed to; or omitted as
  an **implementation detail** — no consumer could observe it and no reimplementation must
  preserve it, the one test `docs/process-reference.md` carries — the same test, applied
  identically, that the implementer applies when it declines to record a choice at wrap-up.
  The gaps route back into Clarify.
- A survey returns one census per package: structured YAML whose entries each carry the choice
  met, where in the build it arises, and the implementer's reading. Concatenate them for
  Clarify. A census the draft acted on persists at `drafts/survey-census.yaml` in the draft
  directory that ran it; one acted on in no way is discarded.

## 5. Ratify — the loop

Present the owner the projection (`npx design-process show <product>`) and the question list
through the draft's pull request. The owner rules each decision **accepted**, **tolerated**,
**delegated**, or **rejected** — a rejection carries the owner's reason and is closed by a
replacement whose `supersedes` names it. A deferral is not among these rulings: it enters as
`deferred` directly, and the merge ratifies it. Apply the rulings, consume the feedback, and
raise what it surfaces; Clarify and Ratify iterate until the owner declares the draft settled
enough.

## 6. Land — claim the number and merge

Landing claims the number and publishes by merging. On the draft's branch, in order:

- **Land after any draft this one builds on.** Ancestry is the ordering: a dependent lands
  after its ancestor, and independent drafts land in any order. Once the ancestor merges, this
  landing's diff shrinks to the draft's own changes.
- **Run the conflict check against the fold at head.** No two in-flight drafts rule the same
  choice or duplicate one another's rulings; landing is where that is checked, before the merge
  claims the slot.

  ```
  npx design-process conflicts <product> [--against <version>]
  ```

  It defaults to `origin/main`, then `main`, and **exits non-zero when it finds anything —
  treat that as a stop.** Overlapping or duplicated rulings surface here; the later of two
  overlapping drafts recomputes when the head moves, and `npx design-process diff <product>
  --from <version> [--to <version>]` shows what moved. No gate reads in-flight drafts against
  each other — the owner's scan of open drafts covers that window. Building on another draft's
  foundations is a dependency, not a conflict.

- **Rename the directory into the number.** `npx design-process where <product> --next` prints
  the number the landing claims, zero-padded to three digits, as one token for shell
  substitution. Rename `increments/<slug>/` to it on the branch, before the merge — `main`
  never holds a slug-named increment. **The rename is what clears the `increment-dir-name`
  finding**; the validator is unchanged and stays the merge gate it is. Landing out of ancestry
  order shows up here — a tree that skips or repeats a number is refused by the density gate.
- **`npm run check` clean**, with no decision still `proposed` and no open question still
  carried.

Every surveyed choice is classified — decided, deferred, or omitted as an implementation
detail — before the draft publishes.

Wherever a command takes a version, a three-digit argument names an increment number and
anything else names a git ref.

## Bounds

- **Who settles a dispute** governs throughout — CLAUDE.md carries the rule. The collision to
  get right is a fact meeting a requirement: stop and ask.
- **Propose pinning with each decision** that fixes a public surface or a written format; the
  owner rules on both at once.
- Escalation brings a fact, not a preference — CLAUDE.md carries the bar.
