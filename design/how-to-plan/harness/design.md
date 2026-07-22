---
status: draft
---

# The Harness

Carved out of the original how-to-plan design: the machinery — the checker, the hooks that run it, the reviewers that read what it cannot, and the plugin that makes it portable.

## Decisions

```yaml
- id: D1
  choice: a decision is grounded if its citing paragraph also cites a fact or requirement; ungrounded ones form the agent-decision view
  falsified_if: paragraph scope produces enough false flags that I stop reading the view
  status: proposed
  revisit:
    after: the view has run against three designs

- id: D2
  choice: the quality harness for this repo is a schema and citation checker, not lint and typecheck
  falsified_if: this repo grows enough executable code that the checker is the smaller half of the harness
  status: proposed

- id: D3
  choice: package the plugin only after the loop has run on two real designs
  falsified_if: another repo needs the loop before the shakedown finishes
  status: proposed

- id: D4
  choice: whether a citation supports the claim it sits on is audited by a reader, in a component separate from the checker
  falsified_if: its findings are mostly false positives, or duplicate what the checker already caught
  status: proposed
  revisit:
    after: the auditor has reviewed one design end to end
```

## Open questions

```yaml
# Q1 was deferred, not a gate — it became the revisit condition on D1. Id not reused.

- id: Q2
  q: how do the conventions travel to a new repo, given a plugin has no slot for a CLAUDE.md template?
  blocks: [C1, C6]

- id: Q3
  q: on a design I did abort, would the churn proxies have fired before I did?
  blocks: [C5]

- id: Q4
  q: which hook event should the checker hang off — Stop, or the narrower FileChanged and TaskCompleted?
  blocks: [C3, D2]

# Q5 was deferred, not a gate — it became the revisit condition on D4. Id not reused.
```

## Components

```yaml
- id: C1
  name: conventions
  owns: CLAUDE.md — the autonomy rule, the citation rule, and the tactics boundary
  excludes: anything a script can enforce, which belongs to C2
  grounds: [req:explicit-intent, req:machine-holds-the-line]

- id: C2
  name: checker
  owns: parsing design.md blocks and YAML files, validating schemas and source shape, resolving every token, emitting the agent-decision view
  excludes: judging whether a design is any good
  grounds: [D1, D2, req:node-for-tooling]

- id: C3
  name: harness wiring
  owns: the hook configuration that runs C2 automatically, and the checker's own tests
  excludes: CI configuration, which waits for the shakedown
  depends_on: [C2]
  grounds: [D2, fact:claude-code-hooks, fact:hook-events]

- id: C4
  name: design-new skill
  owns: the skill that scaffolds a design folder from the template, invoked as /design-new
  excludes: authoring guidance, which is C1
  grounds: [fact:skills-are-the-command-unit, fact:template-skills-opt-out-of-model-invocation]

- id: C5
  name: coherence reviewer
  owns: the subagent that reads a design against facts and requirements and reports incoherence
  excludes: any authority to decide; it reports
  depends_on: [C2]
  grounds: [fact:llm-cannot-pattern-match-architecture, fact:subagents-get-their-own-context]

- id: C6
  name: plugin
  owns: bundling the skills, subagents, and hooks into one installable unit
  excludes: everything until the shakedown is done
  depends_on: [C1, C2, C3, C4, C5]
  grounds: [D3, fact:claude-code-plugins, fact:plugins-have-no-conventions-slot]

- id: C7
  name: citation auditor
  owns: reading each load-bearing claim against the source it cites, and reporting overreach, adjacency, and uncited claims
  excludes: schema and token validity, which is C2; implementation drift, which is C5
  depends_on: [C2]
  grounds: [D4, req:explicit-intent, fact:subagents-get-their-own-context]
```

## Design

### What the machine derives, and what it can't

The checker does more than validate shape. It computes the **agent-decision view** — every
decision cited in a paragraph that carries no fact or requirement beside it, meaning nothing
outside the agent's own say-so holds it up [[D1]]. Paragraph scope is a heuristic, narrower
than a section and wider than a sentence, and it is the part of this design most likely to
be wrong in practice: too coarse and everything looks grounded, too fine and every decision
gets flagged. Only running it over several designs will tell, so [[D1]] carries a revisit
condition rather than blocking settlement now.

Everything the checker does is about *shape* — that a citation resolves, that its target is
active, that its source is locatable. Whether the thing cited actually supports the sentence
it sits on is a different question, and it needs a reader [[D4]]. That reader is a separate
component from the coherence reviewer: different input (prose and citations, not a diff),
different cadence (design review, not implementation), different failure mode. Its findings
are spans and a verdict from a fixed set, never an essay — an auditor free to write
paragraphs about why a citation feels weak reintroduces exactly the confident prose the
citations exist to prevent. Whether it can tell an apt citation from a merely adjacent one
often enough to be worth reading cannot be known until it has read one, so [[D4]] defers
that judgement rather than gating on it.

### Catching ruts automatically

The tempting move is a GitHub Action that watches commits and kicks a PR into rework when it
spots a bad pattern. It doesn't work, though: a bad base is wrong at the level of design
coherence, and you can't regex that [[fact:llm-cannot-pattern-match-architecture]].

What does work, in two pieces:

- **Proxies as a smoke alarm.** Churn, a climbing revision count, a diff that grows while
  tests stay flat, a component that's suddenly wired into everything. These track with the
  band-aid spiral, but they're noisy and late, so they *flag for my attention* — they don't
  decide. Whether they'd fire before I do is testable against a design I already
  abandoned, and untested so far [[Q3]].
- **A semantic reviewer** [[C5]]. An LLM prompted to ask "does this still fit the agreed
  boundaries, or is it thrashing?" Run in CI, advisory only. The Action is fine as the
  trigger; it just can't be the judge.

Keep the abort *decision* mine [[req:owner-decides-abort]]. It's the highest-judgment call
in the loop, and it's hard *because* of sunk cost — handing it to a dumb classifier doesn't
fix that, it just stacks a bad decision on top of the pull I already feel. The real fix is
making abort cheap (good boundaries, small components) so the call is easy. Attack the cost,
not the decision.

The one check worth automating hard: a decision that contradicts a known fact. Both are
structured, so that collision is catchable by a script — at write time, instead of at file
80.

### Claude Code mechanisms

The workflow maps cleanly onto Claude Code's building blocks. Rough rule: a skill for
anything I invoke, whether it's a bare prompt template or real domain logic with scripts
beside it; a subagent when the work needs its own context window; a hook to run something
without being asked [[fact:skills-are-the-command-unit]].

| Piece | Building block | Notes |
|---|---|---|
| Conventions, exemplars, rules of engagement | **CLAUDE.md** [[C1]] | Read every session; where the autonomy rule and citation rule become ambient |
| Quality harness | **Hooks** [[C3]] | `PostToolUse` on `Edit\|Write` and `Stop` run the checker. Deterministic, can't hallucinate |
| Facts + requirements | **plain YAML**  | Not a Claude feature, just disciplined files. Must-pass ones become real tests |
| Design doc authoring | **skill** `/design-new` [[C4]] | Scaffolds the folder + template. A template-only skill sets `disable-model-invocation`, so it fires when I ask and not otherwise [[fact:template-skills-opt-out-of-model-invocation]] |
| Schema + citation checker | **Node script** [[C2]] | Runs from hooks and from CI. The deterministic half of the review |
| Citation audit | **subagent** [[C7]] | Reads each cited claim against its source; reports overreach, adjacency, and uncited claims. Advisory |
| Coherence / consistency review | **subagent** [[C5]] | Its own context window [[fact:subagents-get-their-own-context]], with facts + requirements loaded; also the semantic smoke reviewer |
| Component implementation | **subagents** | A worktree-isolated background session commits, pushes, and opens a draft PR unasked [[fact:background-agents-open-prs]]. One validated component → one background session → one draft PR |
| The whole thing, reusable across repos | **plugin** [[C6]] | Bundles the skills, subagents, and hooks into one installable unit [[fact:claude-code-plugins]]. This is the repeatability mechanism — but it has no slot for a CLAUDE.md template [[fact:plugins-have-no-conventions-slot]], so the conventions need another route [[Q2]] |

Note what the harness is *here*: this is a design repo, so format, lint, typecheck, and test
mean the checker running over markdown and YAML, not a compiler running over source
[[D2]]. Which of the thirty hook events [[fact:hook-events]] it should hang off is
unsettled [[Q4]].

### Don't over-build it

The plugin is the finish line, not the starting line [[D3]]. Building the whole harness
before running the loop by hand is the exact premature-structure mistake this design is
against — I'd be committing to boundaries I haven't tested. Same "big rocks first" logic,
pointed at my own tooling: run it manually, let the real friction show me what to encode,
then package it. That's also the documented recommendation, for what it's worth
[[fact:docs-recommend-standalone-before-plugin]] — iterate in `.claude/`, convert when
there's something worth sharing.

### Bootstrap

Stand up ``, `[[C1]]`, `[[C2]]`, `[[C3]]`, and `[[C4]]` — and nothing else:

1. Scaffold the tree: `design/`, with `facts.yaml` and `requirements.yaml` at its root.
2. Write `CLAUDE.md` with the conventions and the rules of engagement (the autonomy rule,
   the citation rule, "tactics are the agent's, the harness guards them").
3. Write the checker, with its own tests.
4. Wire the checker into hooks so it runs without being asked.
5. Write one skill: `/design-new`.
6. Seed the global facts and requirements with the handful of invariants I already know.

Then stop. The citation auditor `[[C7]]`, the coherence reviewer `[[C5]]`, and the plugin
`[[C6]]` come later, built from real friction. Of the two reviewers, the auditor comes
first: the citation mechanism is the load-bearing claim of this whole design and nothing
yet tests whether it holds up under a reader.

The first two design docs after this one are a shakedown, not just two docs. Pick something
small but real, with two or three genuine agent decisions in it. The first runs the loop end
to end and cites the seeded facts, proving the citation mechanism closes. The second shows
me what the first missed — where the template's too heavy, which hook is absent, what a
CLAUDE.md rule failed to catch. Those findings are what goes in the plugin. Package the loop
I've already run, not the one I'm guessing at.
