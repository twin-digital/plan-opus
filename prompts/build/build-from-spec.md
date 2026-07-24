# Build from a spec

You are building what a settled spec specifies — turning a design into the working deliverable it
describes. You are handed a design directory; its `spec.md` is your build instruction.

**Target design.** You will be pointed at a design as `<area>/<design>` — its directory is
`design/<area>/<design>/` in this planning repository. Everything you build *from* lives there.

---

## Read the design

Read, in this order:

1. **`design/<area>/<design>/spec.md`** — the build instruction. It tells you *what to build and
   how*, with a minimum of *why*. Its Components are the units you build; the prose is the how.
   Build to it.
2. **`decisions.yaml`, `requirements.yaml`, `facts.yaml`** in and under the design directory — the
   foundations the spec rests on. The spec's `[[f:...]]` / `[[r:...]]` / `[[d:...]]` citations
   point into these; follow one when you need the fact, requirement, or decision behind a claim.
3. **Wider scopes as needed** — a citation resolves `design → area → global`, so an
   `[[r:...]]` / `[[f:...]]` may live in `design/<area>/` or `design/`. Walk the tree to resolve
   one when the spec leans on it. *(Interim: you read the raw design tree directly; a packaged
   builder bundle will replace this later.)*

**Build only settled work.** Confirm the design is `settled` — present on `main`, with no open
questions and no proposed decisions. If it is still a draft, stop and say so: an unsettled spec
does not license building.

---

## Establish where it is built

Before building, know the target:

- **Ask the user for the repository**, and — if it is a monorepo — the **package or path within
  it** where the deliverable belongs.
- **Skip the ask** when the spec already names the repository and path, or when the deliverable
  needs no repository at all (it produces a document, a configuration, or something that is not
  code landing in a repo). State which case applies.

If the spec's scope plus the repository still leave the target genuinely ambiguous, ask rather
than guess.

---

## Work in a new worktree

In the target repository, give yourself a worktree and branch so the build never touches its main
checkout until it is reviewed:

```
git -C <target-repo> fetch origin <default-branch>
git -C <target-repo> worktree add -b build/<area>-<design> \
    .worktrees/<area>-<design> origin/<default-branch>
```

Do all building and testing inside that worktree, on that branch, until the work is complete.
Match the repository's existing conventions — its language, layout, lint, and test commands are
the local law; discover them before writing code.

---

## Build in waves

Build in three waves, each ending in a review gate you must pass before starting the next. The
waves sort the work by reversal cost — the interface is the expensive thing to get wrong, the
implementation the cheap thing to redo — so a costly mistake is caught when the redo is still
nearly free. Run **wave 1 across all components at once** (the interfaces *between* components are
where the boundaries live, so they must be reviewed together); waves 2 and 3 may go per component,
in parallel.

**Wave 1 — interface and test plan.** Write the stub signatures, the public surface, and its doc
comments (TSDoc or the repository's equivalent), and **document every planned test case** — enough
that the contract and its coverage are legible with no implementation behind them. Write no
implementation yet.
→ *Review — conformance + completeness:* does the surface satisfy the spec's components and their
boundaries, and does the planned coverage hit every requirement the spec is bound by? This is the
load-bearing gate — the cheapest point to catch the most expensive mistake. Do not proceed until
it is clean.

**Wave 2 — tests.** Implement the planned test cases against the stubbed interface. They will fail
— there is nothing behind the stubs yet — and that is expected.
→ *Review — fidelity:* do the tests actually encode the contract, the spec's requirements and the
wave-1 plan, or do they pass while checking the wrong thing? A test that asserts the wrong
behaviour is worse than none.

**Wave 3 — implementation.** Implement behind the interface until the tests pass and the
repository's own checks — types, lint — are green.
→ *Review — correctness + repo-fit:* an adversarial bug hunt (use the `cold-review` skill), plus a
check that it fits the repository and regresses nothing. Passing tests are table stakes here, not
the whole review — this pass looks for what the tests miss.

**Across every wave:** build to the boundaries the spec draws — do not redraw them. If a boundary,
a requirement, or a decision is wrong or impossible to build, stop and flag it: that is a finding
for the owner and a change to the *spec*, not a silent change in the build. Where the spec is
genuinely underspecified for a build choice, make the choice small and reversible, and record it.

**How each gate runs.** Dispatch one or more agents whose question is derived from the spec — its
components and requirements are the checklist. Verify findings before they gate (an adversarial
pass, so a plausible-but-wrong finding does not block). Fix what is confirmed; escalate
design-level findings to the owner; do not relitigate a settled boundary. A gate is clean when its
question is answered *yes*, or every remaining item is a deliberate choice you have recorded.

**Collapsing the waves.** This rhythm is for a deliverable with an interface others build against.
When the deliverable is not test-shaped — a document, a configuration, a one-file script — or is
small enough that three gates cost more attention than the build itself, collapse to a single
build-and-review. If you collapse, keep wave 1's question (does the surface satisfy the spec?) and
wave 3's (is it correct?); the interface-and-test-plan gate is the one never to skip for anything
others will build to.

---

## Hand off

Commit, push the branch, and open a pull request in the target repository against its default
branch. The PR body says:

- **What was built**, mapped to the spec's components — which component each part of the change
  satisfies.
- **Where the spec was underspecified** and the choice you made, plus any boundary or decision you
  had to flag rather than build.
- **How it was reviewed** — the three wave gates, what each surfaced, and how it was resolved (or
  why a wave was collapsed).

Link the design (`<area>/<design>`) so a reader can trace the build back to the spec it came from.
The build is not done until the final gate is clean and the PR is open.
