# How to Plan

This design lays out the tools and process we will use to design Opus applications and tools, in accordance with the current [vision (docs/vision.md)](../../vision.md).

## The Two Big Ideas: Make Being Wrong Cheap
 
The whole design rests on one goal — make being wrong cheap — but that goal has two halves, and they're separate. Being wrong should be cheap to *spot* and cheap to *cut out*. The system stands on two legs, not one.
 
### Cheap to excise: good boundaries make wrongness local
 
Most "this feels off, and patching isn't fixing it" moments come from bad decomposition. When the boundaries between components are in the wrong place, one concern smears across five files. Every fix touches all five, and none of them comes out clean. That's the band-aid spiral.
 
Good boundaries do the opposite. When they're in the right place, a wrong component is wrong *by itself*, and I can cut just that piece out. So decomposition quality and abortability are the same thing. The decomposition is the main artifact: boundaries become PR boundaries become the components I abort. Get the boundaries right and the big-PR problem and the abort problem both shrink at once.
 
### Cheap to spot: chunky prose anchored to small kernels
 
Good boundaries make a wrong component cheap to remove. They do nothing to help me *find* it — a cleanly-decomposed design can still be confident prose with nothing under it, wrong in a way I won't see until it's built and failing. That's a different problem, and it's the one behind most of what I opened with: the review fatigue, the "I can't see the intent," the wheel-spinning where I can't tell what's off.
 
The fix is that chunky prose is only as trustworthy as the small, verifiable kernels it's anchored to. The facts file holds the kernels — small claims I can check one at a time. Citations are the anchors. The prose is allowed to be big and in-flux precisely *because* every load-bearing part of it points at something small I can verify on its own. That's what lets me review one claim without holding the whole design doc in my head, which is the actual answer to the fatigue — boundaries don't touch that at all.

## The Knowledge Model

Everything a project "knows" sorts on two questions: *does it survive throwing the design away?* and *what makes it true?* That gives a handful of buckets, and they're worth keeping separate because each is handled differently.

**Facts** — things discovered to be true, from docs or from testing. Reality decides them; I don't get a vote. Each one should be small enough to verify on its own, and tagged with how I know it: *tested* beats *documented* beats *assumed*. New facts get added freely. *Changing or removing* a fact is the moment that needs review, because things were built on it. Facts the final system must satisfy should become real tests, so they fail loudly instead of sitting in a doc I have to trust.

**Requirements** — things I decide by fiat as the owner. No amount of testing overrules them; I do. Tag them by force: a hard gate vs. a soft preference. One trap: I can only decide things that are actually mine to decide. "Runs a million users on one box" isn't a requirement, it's a guess about reality wearing a requirement's clothes. If it's really a bet on what's possible, it's an open question until I've checked.

**Proposals** — proposed design. A proposal is a proto-design: it's true only if the reasoning holds, and it's *supposed* to be disposable. It either gets abandoned or graduates into a settled design doc. It should die and get rebuilt freely; that's aborting working correctly. Every load-bearing claim in it cites what it rests on.

**Open questions** — things I know I don't know yet. They get their own bucket. Once answered, one graduates into a fact (I tested it) or a requirement (I decided it).

**Agent decisions** — places the agent invented structure that isn't backed by any fact or requirement. These aren't requirements — the agent has no authority to make requirements. They're just proposed structure with nothing under it. I don't keep them as a separate hand-maintained list; they're a *view* — "show me every claim backed only by the agent's own say-so." They die with the design doc. Like open questions, they graduate: I bless it, I adopt it as a real requirement, I test it into a fact, or I reject it.

Two things that look like buckets but are really just tags:

- **Assumptions** are just facts with the weakest backing (*assumed*). Keep them with the facts, but treat them as the most likely thing to blow up a base.
- **Preferences** are just requirements with soft force, and they're usually global instead of design-scoped. They live in the conventions layer and get cited, not re-decided, in each design doc.

The payoff: there are exactly two "not safe to build on yet" buckets — open questions and agent decisions. Both graduate or die. That symmetry is what makes the next part simple.

## The Autonomy Rule

The whole point of sorting knowledge this way is to tell an agent when it's allowed to decide and when it has to stop and ask. The test is: *who settles a dispute here?*

- **Build freely on** facts, requirements, and settled designs.
- **Decide on its own:** proposal vs. proposal (that's just design work), and proposal vs. fact (fact wins, redesign).
- **Stop and ask me:** fact vs. requirement, requirement vs. requirement, or anything still sitting in a "not safe yet" bucket.

The one to get right: a requirement that runs into a contradicting fact — "must work offline" meets "the login provider needs a connection." Reality wins on what's *true*, but the requirement doesn't just quietly lose. It's a decision only I can make: change the requirement, redesign around it, or accept the limit. A lot of "feels off" is an agent quietly fudging exactly this instead of flagging it. That collision is a stop-and-ask, always.

## Repo Layout

Design docs live as files, edited with commits, reviewed as PRs. That's the only setup that lets me point at an exact line, lets the agent and me both edit, keeps the reasoning attached, and keeps each round cheap. My agents have their own git identities, so they can commit and comment like any other contributor.

It's just a doc, reviewed as a PR, merged when it's settled — no approvals, no numbering, no assigned reviewers. The only things that matter: a dedicated home, PRs as the review surface, and the habit of resolving designs instead of letting them pile up.

Each design gets **its own folder**, so the doc and everything scoped to it live together:

```
repo/  (a dedicated design repo, OR docs/ inside the code repo)
├── CLAUDE.md                      # conventions, exemplars, rules of engagement
├── docs/
│   ├── facts.md                   # GLOBAL discovered invariants
│   ├── requirements.md            # GLOBAL owner fiat
│   └── design/
│       └── offline-sync/          # one folder per proposal / design
│           ├── design.md          # the proposal → design doc itself
│           ├── facts.md           # facts discovered while working on THIS design
│           ├── requirements.md    # requirements scoped to THIS design
│           └── ...                # supporting artifacts (sketches, data, notes)
├── .claude/
│   ├── commands/                  # slash commands (authoring, pre-review)
│   ├── agents/                    # subagents (checker, component implementers)
│   └── hooks/ (or settings.json)  # the quality harness
└── tests/                         # must-pass validations, as real tests
```

**Facts and requirements come in two scopes.** Global ones (`docs/facts.md`, `docs/requirements.md`) are true across the whole project. Design-scoped ones (inside a design's folder) were discovered or decided while working on that one design. A citation resolves against the design's own files first, then the global ones. A design-scoped fact that turns out to be broadly true can graduate up to global — same abandon-or-graduate lifecycle the proposals follow. Keep them as single files for now; if one gets unwieldy, split it into a `facts/` folder later.

A design starts as a folder added in a PR, with `status: draft`. I iterate on the PR, merge it when it settles (or to keep a living design around), and abandon it by closing the PR. "Settled" is just `status: settled` on a merged folder — there's no separate directory to move things into.

## The Design Doc

The doc itself is `design.md`, inside the design's folder. It holds two kinds of content: **structured data** (the decisions and open questions) and **prose** (the design argument that references them). Keep them physically separate inside the file — the data in fenced blocks a script can parse, the prose in plain markdown a person can read.

Here's what a `design.md` looks like, section by section.

Frontmatter — just the one hand-written field:

```yaml
status: draft            # exploring | draft | settled
```

`## Decisions` — a fenced YAML block; each decision is one object:

```yaml
- id: D1
  choice: event-sourced write model
  falsified_if: sustained writes exceed ~10k/s
  status: proposed         # proposed | blessed | promoted-to-req | rejected
```

`## Open questions` — same idea, its own fenced block:

```yaml
- id: Q1
  q: does the vendor API paginate stably under concurrent writes?
  blocks: [D1]             # decision ids this question gates
```

`## Design` — plain prose, the part a person reads. Load-bearing claims carry a `[[token]]`:

```
We use an event-sourced write model [[D1]] because the vendor API returns
cursors, not offsets [[fact:cursor-pagination]]. This assumes writes stay
under ~10k/s, which isn't confirmed yet [[Q1]].
```

`## Components` — the decomposition, as a list; each component becomes one implementation PR.

**Why fence the data.** The fence is the delimiter. It draws a hard line between "parse this" and "read this," so there's never a question of whether an indented line is a real field or just prose that happens to look structured — which is the ambiguity a loose markdown list leaves open. XML tags around every claim would solve the parsing but bury the prose in markup; a fenced data block keeps the two cleanly apart.

**The schema is fixed — these fields, nothing freeform.** A *decision* has:

- `id` (required) — a short handle unique within this design; the prose cites it as `[[D1]]`.
- `choice` (required) — one line, what was decided.
- `falsified_if` (required) — the condition that would prove it wrong. If I can't state one, I don't understand the decision well enough to keep it.
- `status` (required) — one of `proposed | blessed | promoted-to-req | rejected`.

An *open question* has:

- `id` (required) — cited as `[[Q1]]`.
- `q` (required) — the question.
- `blocks` (optional) — a list of decision ids it gates; omit it if it gates nothing specific.

That's the whole schema — a field is either required or the single optional `blocks`, nothing illustrative. There's deliberately no "backing" field on a decision: its backing lives in the prose that cites it. A decision the prose cites next to a `[[fact:]]` or `[[req:]]` is grounded; one cited with nothing external beside it is an agent-decision, by definition.

**How to read the `[[tokens]]`.** Every load-bearing claim in the prose carries one, and it points in one of two directions:

- **Inward** — `[[D1]]` and `[[Q1]]` point at a decision or open question in this same file. Hit `[[D1]]`, scroll up to the Decisions block for the actual choice and its falsifier.
- **Outward** — `[[fact:cursor-pagination]]` and `[[req:offline-first]]` point at an entry in a `facts.md` or `requirements.md` — this design's own, or the global one. Hit `[[fact:...]]`, and I know the claim rests on something already confirmed.

So the prose never asserts anything load-bearing on its own authority. Each claim points either inward ("a choice I made — here's the falsifier") or outward ("rests on a confirmed fact or a stated requirement"). Reading the doc means following those pointers, but only the ones I doubt — I don't have to hold the whole thing in my head.

**No dependency list in the frontmatter.** A generated `depends_on:` / `satisfies:` rollup would be redundant: it's fully derivable from the outward tokens in the prose, and storing a copy in the file just invites the exact drift we're avoiding. So the frontmatter holds only what's hand-written — `status`. If a rollup is ever useful ("every fact this design touches," a cross-design index), a script generates it on demand, outside the doc.

**What the checker verifies:**

- Every inward token (`[[D1]]`) matches a declared decision or open question in the file.
- Every outward token (`[[fact:*]]` / `[[req:*]]`) matches a real entry in a facts/requirements file in scope.
- Every declared decision is referenced at least once in the prose — an unreferenced one is either dead (cut it) or a hidden dependency the prose never admitted.
- A decision whose `falsified_if` has come true, or that leans on an open question via `blocks`, gets flagged as not-safe-to-build-on.

Only tag claims that carry weight — resting on a fact, meeting a requirement, or following from a decision. If every sentence sprouts a token, the wall-of-equal-weight problem comes back with brackets on it. The test: *would it matter if this claim were wrong?*

## The Loop

1. **Capture first.** Write down the facts, requirements, and open questions before designing, so the design stands on solid ground and treats the rest as unsettled. Design-specific ones go in the design's folder; promote to global if they turn out broadly true.
2. **Design the boundaries first.** The decomposition is the main artifact. Boundaries become PRs become abort units.
3. **Write the design doc with citations.** Every load-bearing claim cites a fact or requirement, or flags itself as an agent decision with a `falsified_if` — what would prove it wrong — not a justification.
4. **Review the decisions and open questions before the prose.** That short list is the entire place a bad base can hide; facts and requirements already have someone standing behind them. Handle each: bless, adopt, test, or reject.
5. **Clear the review before building on it.** A decision I haven't blessed, or an open question I haven't answered, isn't safe to build the dependent components on yet. Clearing the list *is* validating the boundaries.
6. **Build one component at a time.** One component, one PR. The agent owns all the tactical calls; the harness guards quality.
7. **Review only two things:** does it fit the agreed boundaries, and do the tests check the *right* behavior. Skim the rest.
8. **When it feels off, cut the component.** It's cheap, because it's local. Save what you learned into `facts.md`, and restart. Don't band-aid a bad base.

## Code-Level Decisions Are the Agent's

Param defaults, parameter objects vs. lists, fixture and test-double design — these are cheap to reverse, so they're implementation-time calls and the agent makes them freely. They stay *off* the decisions list; flagging them would bury the list in noise. Persistent tactical preferences ("param objects over long lists") live in the conventions layer and get cited, not re-decided.

Three exceptions:

- **Watch the blast radius.** A "param object" that becomes a shared type 40 modules import was never tactical — it's an interface. Sort by reversal cost, not by whether it sounds code-level.
- **Test pain is a signal.** Hard-to-test usually means badly-decomposed. Test design isn't something I spec up front, but when setup hurts, that's feedback about the boundaries.
- **Refactoring is after, not before.** It answers to the conventions and the tests, not the pre-implementation design.

And letting go of the tactics doesn't mean not reading the code. I still read it — for boundaries and behavior — I just skim past what the linter already blessed.

## Catching Ruts Automatically

The tempting move is a GitHub Action that watches commits and kicks a PR into rework when it spots a bad pattern. It doesn't work, though: a bad base is wrong at the level of *design coherence*, and you can't regex that. If you could pattern-match "this architecture is wrong," AI review would already be solved.

What does work, in two pieces:

- **Proxies as a smoke alarm.** Churn, a climbing revision count, a diff that grows while tests stay flat, a component that's suddenly wired into everything. These track with the band-aid spiral, but they're noisy and late, so they *flag for my attention* — they don't decide.
- **A semantic reviewer.** An LLM prompted to ask "does this still fit the agreed boundaries, or is it thrashing?" Run in CI, advisory only. The Action is fine as the trigger; it just can't be the judge.

Keep the abort *decision* mine. It's the highest-judgment call in the loop, and it's hard *because* of sunk cost — handing it to a dumb classifier doesn't fix that, it just stacks a bad decision on top of the pull I already feel. The real fix is making abort cheap (good boundaries, small components) so the call is easy. Attack the cost, not the decision.

The one check worth automating hard: a decision that contradicts a known fact. Both are structured, so that collision is catchable by a script — at write time, instead of at file 80.

## Claude Code Mechanisms

The workflow maps cleanly onto Claude Code's building blocks (current as of July 2026). Rough rule: slash command for a prompt template, skill for real domain logic with helper files, subagent for isolated or parallel work, hook to enforce a rule with code.

| Piece | Building block | Notes |
|---|---|---|
| Conventions, exemplars, rules of engagement | **CLAUDE.md** | Read every session; where the autonomy rule and citation rule become ambient |
| Quality harness (format / lint / type / test) | **Hooks** (`settings.json` or `.claude/hooks/`) | `PostToolUse` on `Edit\|Write` → format/lint; `Stop` → typecheck + tests. Deterministic, can't hallucinate |
| Facts + requirements | **plain markdown** | Not a Claude feature, just disciplined files. Must-pass ones become real tests |
| Design doc authoring | **slash command** `/design-new` | Scaffolds the folder + template. It's a prompt template, so a command — not a skill, until it needs scripts |
| Pre-review extraction | **slash command** `/design-decisions` (or a subagent for isolation) | Pulls out the decisions + open-questions list |
| Coherence / consistency checker | **subagent** (`.claude/agents/`) | Isolated context with facts + requirements loaded; also the semantic smoke reviewer. Runs in CI |
| Component implementation | **subagents** | Background subagents can commit, push, and open a draft PR when they finish (v2.1.198). One validated component → one subagent → one draft PR |
| The whole thing, reusable across repos | **plugin** | Bundles the commands, subagents, hooks, and CLAUDE.md template into one installable unit. This is the repeatability mechanism |

## Don't Over-Build It

The plugin is the finish line, not the starting line. Building the whole harness before running the loop by hand is the exact premature-structure mistake this design is against — I'd be committing to boundaries I haven't tested. Same "big rocks first" logic, pointed at my own tooling: run it manually, let the real friction show me what to encode, then package it.

## Bootstrap

Stand up only this:

1. Scaffold the tree: `docs/facts.md`, `docs/requirements.md`, and an empty `docs/design/` (the first design creates the first folder under it).
2. Write `CLAUDE.md` with the conventions and the rules of engagement (the autonomy rule, the citation rule, "tactics are the agent's, the harness guards them").
3. Wire two hooks: format/lint on write, typecheck + tests on stop.
4. Write one slash command: `/design-new`.
5. Seed the global `facts.md` with the handful of invariants I already know; turn the must-pass ones into tests.

Then stop. The review subagents, the semantic checker, and the plugin come later, built from real friction.

The first two design docs are a shakedown, not just two docs. Pick something small but real, with two or three genuine agent-decisions in it. The first one runs the loop end to end and cites the seeded facts, proving the citation mechanism closes. The second one shows me what the first missed — where the template's too heavy, which hook is absent, what a CLAUDE.md rule failed to catch. Those findings are what goes in the plugin. Package the loop I've already run, not the one I'm guessing at.

## Guardrails to Keep

- Facts hold what I've *confirmed*, not what I *believe*. If it needs arguing, it's a proposal.
- Retraction is the most important and most-skipped part of the facts file. When new evidence kills a fact, mark it superseded and keep the history, so I can trace what relied on it. An append-only facts file with no retraction becomes confidently wrong.
- Flag, don't justify. Asking the agent to justify each decision invites confident nonsense. Ask what it depends on and what would prove it wrong.
- Don't decide feasibility by fiat. Requirements rule the design, not the world.
- Don't over-cite. Load-bearing claims only.
- Don't automate the abort decision. Make aborting cheap instead.
- "Let go of tactics" doesn't mean "stop reading the code." Skim the tactics; keep eyes on boundaries and behavior.
- No stored dependency list. It's derived from the inline tokens on demand, never hand-maintained.
- Package the plugin after two real runs, not before.