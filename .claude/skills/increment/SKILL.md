---
version: "23"
name: increment
description: Run one phase of a product's increment in this repository. Plan — open a draft increment on its own branch, work Clarify in the foundation sources, loop Ratify through its pull request, and land it into the next number; use when asked to plan an increment, capture or adopt a backlog item, run the Plan phase, or drive a product's design to a mergeable state. Implement — build the fold at a published increment, dispatch one implementer per package, accumulate design consequences in a companion increment, and file the implementation record; use when asked to implement a product, an increment, or the fold of a design. Invoked as `/increment plan` or `/increment implement`.
---

# Work an increment

`/increment <phase>`, where the phase is `plan` or `implement` and the rest of the invocation
carries whatever the caller wants to say.

**Settle the phase before doing anything else.** Where the invocation names a phase, that is the
phase. Where it names none — a bare `/increment`, or a request that describes the work without
naming the skill at all — settle it from the request where the request is unambiguous, and ask
the caller where it is not. A phase that is neither `plan` nor `implement` is refused, naming the
two that are.

Then read that phase's file, and only that one:

| phase | file | covers |
|---|---|---|
| `plan` | [plan.md](plan.md) | Capture, Clarify, the check before Ratify, the survey offer, the Ratify loop |
| `implement` | [implement.md](implement.md) | binding to the fold, the companion increment, dispatch, running implementers in parallel, survey mode, the record |

This file carries what both phases do: every phase works a **draft increment** — opening it,
carrying it in flight, and landing it into a published number. The normative rules are
`docs/process-reference.md`; the content-quality rubric is `docs/authoring.md`. Validate every
change with `npm run check`.

## Open a draft increment

- A draft increment is `products/<product>/increments/wip-<NNN>-<slug>/` on its own pull-request
  branch — a three-digit ordinal, then a slug naming what the draft is about. Name the branch
  `plan/<product>/<slug>`: no check requires the name, it is the default to reach for.
- **A draft holds no number while it is worked.** Several drafts of a product run at once, none
  committed to a sequence position; the number is claimed only at landing. Opening a draft never
  requires targeting the product's next head number and never waits on another draft — and a
  capture flow, send-to-capture among them, can target a newly opened draft as readily as one
  already in flight.
- **The ordinal orders the draft increments a tree holds, and nothing else.** It is not a claim on
  a published number, and two drafts on unrelated branches may carry the same one. Ordinals are
  not dense and no gate checks them; when an ancestor lands, the dependent keeps its ordinal
  rather than renumbering, and gaps are ordinary.
- A draft that builds on another **branches from it** — that git ancestry is the dependency, and
  nothing is declared. Its tree carries the ancestor's content while both are in flight, and the
  ordinals are their relative order: a stack lands in it, `wip-001` before `wip-002`.
- **One tree holds one draft increment unless they are stacked.** Before opening, look for a
  `wip-` directory the tree already holds. If there is one and this draft does not build on it,
  work in a fresh worktree rather than adding a second — branched from the ancestor when
  stacking, from `main` otherwise. A tree holding two drafts that are not ancestor and dependent
  is not supported.
- Generate ids with `npx design-process id {r|d|q}`.

## In flight

The merge gate reads a draft increment while it is worked: its sources validate against their
schemas, its citations resolve, and its proposed decisions and open questions are reported —
every rule the gate applies to a published increment, applied to this one too. The projection —
`npx design-process show <product>` with no fold version asked for — folds the tree's drafts
after every published increment, in ordinal order, each shown by its directory name; its
supersessions close what they name and the coverage summary counts its claims.

So expect findings from `npm run check` in flight — one `increment-dir-name` finding per wip
directory the tree holds, plus the proposed-decision and open-question findings, plus a
`draft-ordinal-unique` finding if two drafts share an ordinal. All of them are expected, and all
of them clear before the merge — `land` runs the full check itself, after the rename, and stops if
anything survives. **The `increment-dir-name` finding is cleared by the landing rename and by
nothing else**, so the check never exits 0 while a draft is in flight.

The density gate reads published numbers only. A wip ordinal is not one, so a draft neither
fills a gap nor makes one.

## Land

Landing claims the number and publishes by merging, and it is one command, run on the draft's
branch:

```
npx design-process land <product> [--root <dir>]
```

That is the whole landing. Nobody performs a step of it by hand — the owner lands a settled draft
with no agent in the loop at all, from the interactive session
(`npx design-process increment <product>`, where ruling and landing happen in one sitting and
landing unlocks exactly when nothing is proposed and no question is open), and `land` is the
non-interactive surface for an agent or a script with no session to land from. It takes `--root`
and nothing else — no head to name and no push to suppress, since no step of the sequence needs
judgement and the conflict check inside it uses its own default head.

One thing to settle before running it: **land after any draft this one builds on.** Ancestry is the
ordering — a dependent lands after its ancestor, and independent drafts land in any order. Once the
ancestor merges, this landing's diff shrinks to the draft's own changes.

`land` runs a fixed sequence in order, **stops at the first step that fails**, reports what to fix,
and leaves the branch as it found it: apply any staged rulings, run the conflict check against the
head, rename the wip directory into the number the head yields, run the full design check, commit,
push, open the pull request where the branch has none, approve it as the owner, and set the merge to
complete on its own once the gate is green. The approval follows the push, because a push after an
approval dismisses it. A draft still carrying a proposed decision or an open question is **refused
before any of it runs**, naming what is unsettled — settle those first.

You need not open the pull request yourself. Where one already exists for the branch the open step
is a no-op, so a pull request opened earlier to run Ratify through is the one the landing approves.

Three steps of that sequence are worth knowing from the outside:

- **The conflict check.** No two in-flight drafts rule the same choice or duplicate one another's
  rulings, and landing is where that is checked, before the merge claims the slot. It covers every
  increment directory in the working tree carrying no published number, plus any numbered above the
  head — what this branch would add to the sequence — against `origin/main`, then `main`. Two
  overlaps are findings: a foundation id the draft declares that the head already declares
  (`landing-duplicate-id`), and an `amends:`, `supersedes:`, or `retires:` aimed at an entry not in
  force at the head (`landing-already-closed`). Semantic overlap — two drafts ruling the same choice
  under different ids — is the owner's scan of the open drafts. No gate reads in-flight drafts
  against each other, and the later of two overlapping drafts recomputes when the head moves;
  `npx design-process diff <product> --from-ref <gitref>` shows what moved. Building on another
  draft's foundations is a dependency, not a conflict.
- **The rename.** `increments/wip-<NNN>-<slug>/` becomes the number the head yields, on the branch
  and before the merge — `main` never holds a wip directory. Published numbers must be dense, so
  landing out of ancestry order surfaces here, as a tree that skips or repeats a number is refused
  by the density gate.
- **The approval.** The approving credential is the owner's own, typed at the terminal for that one
  run and held nowhere else — not in a file, not in the environment, not in an argument. **Never
  supply one.** The credentials an agent holds never approve; a landing that obtains none publishes
  everything up to the approval and reports the pull request as awaiting it, which is what an
  agent's landing looks like. Pushing uses the credentials the environment already holds.

Wherever a command takes a fold version it takes a pair of parameters: the bare one names an
increment — `9` and `009` alike — and its `-ref` counterpart names a git ref. `--at`/`--at-ref`,
`--from`/`--from-ref`, `--to`/`--to-ref`, `--against`/`--against-ref`. Giving both members of a
pair is an error.

## Bounds

- **Who settles a dispute** governs throughout — CLAUDE.md carries the rule. The collision to get
  right is a fact meeting a requirement: stop and ask.
- **Propose pinning with each decision** that fixes a public surface or a written format; the
  owner rules on both at once.
- Escalation brings a fact, not a preference — CLAUDE.md carries the bar.
