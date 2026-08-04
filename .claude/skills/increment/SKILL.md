---
version: "14"
name: increment
description: Run one phase of a product's increment in this repository. Plan — open a draft increment on its own branch, work Clarify in the foundation sources, loop Ratify through its pull request, and land it into the next number; use when asked to plan an increment, capture or adopt a backlog item, run the Plan phase, or drive a product's design to a mergeable state. Implement — build the fold at a published increment, dispatch one implementer per package, accumulate design consequences in a companion increment, and file the implementation record; use when asked to implement a product, an increment, or the fold of a design. Invoked as `/increment plan` or `/increment implement`.
---

# Work an increment

`/increment <phase>`, where the phase is `plan` or `implement` and the rest of the invocation
carries whatever the caller wants to say.

**Settle the phase before doing anything else.** Where the invocation names it, that is the
phase. Where it names neither the skill nor a phase — someone described the work rather than
typing the command — settle it from the request where the request is unambiguous, and ask where
it is not. A phase that is neither `plan` nor `implement` is refused, naming the two that are.

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

So expect three findings from `npm run check` in flight — the `increment-dir-name` finding for
the `wip-` directory, plus the proposed-decision and open-question findings. All three are
expected, and all three clear before the merge. **The `increment-dir-name` finding is cleared by
the landing rename and by nothing else**, so the check never exits 0 while a draft is in flight.

The density gate reads published numbers only. A wip ordinal is not one, so a draft neither
fills a gap nor makes one.

## Land

Landing claims the number and publishes by merging. On the draft's branch, in order:

1. **Land after any draft this one builds on.** Ancestry is the ordering: a dependent lands after
   its ancestor, and independent drafts land in any order. Once the ancestor merges, this
   landing's diff shrinks to the draft's own changes.
2. **Run the conflict check against the fold at head.** No two in-flight drafts rule the same
   choice or duplicate one another's rulings; landing is where that is checked, before the merge
   claims the slot.

   ```
   npx design-process conflicts <product>
   ```

   It reads every increment directory in the working tree carrying no published number, plus any
   numbered above the head — what this branch would add to the sequence. `--against` names the
   head to check against and defaults to `origin/main`, then `main`, so reach for the bare
   command. It **exits non-zero when it finds anything — treat that as a stop.**

   Two overlaps are findings: a foundation id the draft declares that the head already declares
   (`landing-duplicate-id`), and an `amends:`, `supersedes:`, or `retires:` aimed at an entry not
   in force at the head (`landing-already-closed`). Semantic overlap — two drafts ruling the same
   choice under different ids — is the owner's scan of the open drafts. No gate reads in-flight
   drafts against each other, and the later of two overlapping drafts recomputes when the head
   moves; `npx design-process diff <product> --from-ref <gitref>` shows what moved. Building on
   another draft's foundations is a dependency, not a conflict. If the head moves before you
   merge, run it again.
3. **Rename the directory into the number.** `npx design-process where <product> --next` prints
   the number the landing claims, zero-padded to three digits, as one token for shell
   substitution. Rename `increments/wip-<NNN>-<slug>/` to it on the branch, before the merge —
   `main` never holds a wip directory. The published number must be dense; landing out of
   ancestry order shows up here, as a tree that skips or repeats a number is refused by the
   density gate.
4. **`npm run check` clean**, with no decision still `proposed` and no open question still
   carried.

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
