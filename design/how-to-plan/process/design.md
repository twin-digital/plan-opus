---
status: draft
---

# The Process

The working protocol: what I do, what an agent does, and who settles a dispute. Its
companions in this area specify the artifacts the protocol produces (`doc-structure`) and
the machinery that guards them (`harness`). This design is the one a person reads first and
an agent is handed as standing instructions.

It produces no software, so it declares no components — see the note at the end of the
prose.

## Decisions

```yaml
- id: D1
  choice: the loop is eight steps, ordered capture → decompose → cite → review → build → cut
  falsified_if: I routinely skip a step and the result is no worse
  status: proposed

- id: D2
  choice: boundaries are reviewed and cleared before any dependent component is built
  falsified_if: clearing the list stops correlating with components that survive
  status: proposed

- id: D3
  choice: an agent decides freely within a proposal, and stops when a fact meets a requirement
  falsified_if: agents stop so often the loop stalls, or fudge the collision anyway
  status: proposed

- id: D4
  choice: aborting a component is the default response to feeling off, not a last resort
  falsified_if: I abort components that a small fix would have saved, repeatedly
  status: proposed

- id: D6
  choice: one component is one PR is one unit of abort
  falsified_if: components are routinely split or merged mid-implementation
  status: proposed

- id: D5
  choice: mechanical signals flag a design for my attention; the abort decision stays mine
  falsified_if: a mechanical signal predicts my abort calls well enough that deferring to it would have been right
  status: proposed
```

## Open questions

```yaml
- id: Q1
  q: does a design with no components need the block at all, or does its absence mean this isn't a design?
  blocks: [D1]

- id: Q2
  q: is the autonomy rule legible enough that an agent applies it without me restating it each session?
  blocks: [D3]
```

## Design

### The loop

1. **Capture first.** Write down the facts, requirements, and open questions before
   designing, so the design stands on solid ground and treats the rest as unsettled.
   Design-specific ones go in the design's folder; promote up a tier when a second consumer
   depends on them.
2. **Design the boundaries first.** The decomposition is the main artifact. Boundaries
   become PRs become abort units.
3. **Write the design doc with citations.** Every load-bearing claim cites a fact or
   requirement, or flags itself as an agent decision with a falsifier — what would prove it
   wrong — not a justification [[req:explicit-intent]].
4. **Review the decisions, open questions, and components before the prose.** Those short
   lists are the entire place a bad base can hide; facts and requirements already have
   someone standing behind them. Handle each: accept, adopt, test, or reject.
5. **Clear the review before building on it** [[D2]]. A decision I haven't accepted, or an
   open question I haven't answered, isn't safe to build the dependent components on yet.
   Clearing the list *is* validating the boundaries.
6. **Build one component at a time.** One component, one PR, one thing to throw away
   [[D6]]. The agent owns all the tactical
   calls; the harness guards quality [[req:machine-holds-the-line]].
7. **Review only two things:** does it fit the agreed boundaries, and do the tests check the
   *right* behavior. Skim the rest [[req:review-at-the-coherence-level]].
8. **When it feels off, cut the component** [[D4]]. It's cheap, because it's local. Save what
   you learned into the facts file, and restart. Don't band-aid a bad base.

The order is the point [[D1]]. Every step is cheap only because the one before it happened:
decomposition is cheap because the facts are already down, review is cheap because the
decomposition is small, and aborting is cheap because the component is one PR. Run the steps
out of order and each one gets more expensive, which is the failure this whole thing exists
to prevent [[req:sort-by-reversal-cost]].

### A design with no components

This design declares no `Components` block, because it produces no software — there is
nothing to decompose into PRs, and nothing to abort. That is worth noticing rather than
papering over [[Q1]]. Either the block is optional and some designs are pure protocol, or a
document with nothing to build isn't a design at all and belongs in the conventions layer
instead. Both readings are live; the split is what will settle it.

### The knowledge model

Everything a project "knows" sorts on two questions: *does it survive throwing the design
away?* and *what makes it true?* That gives a handful of buckets, and they're worth
keeping separate because each is handled differently.

**Facts** — things discovered to be true, from docs or from testing. Reality decides them;
I don't get a vote. Each one should be small enough to verify on its own, and tagged with
how I know it: *tested* beats *documented* beats *assumed*. New facts get added freely.
*Changing or removing* a fact is the moment that needs review, because things were built
on it. Facts the final system must satisfy should become real tests, so they fail loudly
instead of sitting in a doc I have to trust [[req:machine-holds-the-line]].

**Requirements** — things I decide by fiat as the owner. No amount of testing overrules
them; I do. Tag them by force: a hard gate vs. a soft preference. One trap: I can only
decide things that are actually mine to decide. "Runs a million users on one box" isn't a
requirement, it's a guess about reality wearing a requirement's clothes. If it's really a
bet on what's possible, it's an open question until I've checked.

**Proposals** — proposed design. A proposal is a proto-design: it's true only if the
reasoning holds, and it's *supposed* to be disposable. It either gets abandoned or
graduates into a settled design doc. It should die and get rebuilt freely; that's aborting
working correctly. Every load-bearing claim in it cites what it rests on.

**Open questions** — things I know I don't know yet. They get their own bucket. Once
answered, one graduates into a fact (I tested it) or a requirement (I decided it).

**Agent decisions** — places the agent invented structure that isn't backed by any fact or
requirement. These aren't requirements — the agent has no authority to make requirements.
They're just proposed structure with nothing under it. I don't keep them as a separate
hand-maintained list; they're a *view*, computed from the citations D11. They die with
the design doc. Like open questions, they graduate: I accept it, I adopt it as a real
requirement, I test it into a fact, or I reject it.

Two things that look like buckets but are really just tags:

- **Assumptions** are just facts with the weakest backing (`assumed`). Keep them with the
  facts, but treat them as the most likely thing to blow up a base.
- **Preferences** are just requirements with soft force, and they're usually global instead
  of design-scoped D3. They live in the conventions layer and get cited, not
  re-decided, in each design doc.

The payoff: there are exactly two "not safe to build on yet" buckets — open questions and
agent decisions. Both graduate or die. That symmetry is what makes the next part simple.

### The autonomy rule

The whole point of sorting knowledge this way is to tell an agent when it's allowed to
decide and when it has to stop and ask. The test is: *who settles a dispute here?*

- **Build freely on** facts, requirements, and settled designs.
- **Decide on its own:** proposal vs. proposal (that's just design work), and proposal vs.
  fact (fact wins, redesign).
- **Stop and ask me:** fact vs. requirement, requirement vs. requirement, or anything still
  sitting in a "not safe yet" bucket.

That test is the whole autonomy rule [[D3]], and it only works if an agent can apply it
unprompted — if I have to restate it every session it has failed, whatever the doc says
[[Q2]].

The one to get right: a requirement that runs into a contradicting fact — "must work
offline" meets "the login provider needs a connection." Reality wins on what's *true*, but
the requirement doesn't just quietly lose. It's a decision only I can make: change the
requirement, redesign around it, or accept the limit. A lot of "feels off" is an agent
quietly fudging exactly this instead of flagging it. That collision is a stop-and-ask,
always.

### Code-level decisions are the agent's

Param defaults, parameter objects vs. lists, fixture and test-double design — these are
cheap to reverse, so they're implementation-time calls and the agent makes them freely
[[req:sort-by-reversal-cost]]. They stay *off* the decisions list; flagging them would bury
the list in noise. Persistent tactical preferences ("param objects over long lists") live in
the conventions layer and get cited, not re-decided C2.

Three exceptions:

- **Watch the blast radius.** A "param object" that becomes a shared type 40 modules import
  was never tactical — it's an interface. Sort by reversal cost, not by whether it sounds
  code-level.
- **Test pain is a signal.** Hard-to-test usually means badly-decomposed. Test design isn't
  something I spec up front, but when setup hurts, that's feedback about the boundaries.
- **Refactoring is after, not before.** It answers to the conventions and the tests, not the
  pre-implementation design.

And letting go of the tactics doesn't mean not reading the code. I still read it — for
boundaries and behavior — I just skim past what the linter already blessed.

### Guardrails to keep

- Facts hold what I've *confirmed*, not what I *believe*. If it needs arguing, it's a
  proposal.
- Retraction is the most important and most-skipped part of the facts file. When new
  evidence kills a fact, mark it `superseded` with a `superseded_by` pointer and keep the
  history, so I can trace what relied on it. An append-only facts file with no retraction
  becomes confidently wrong.
- Flag, don't justify. Asking the agent to justify each decision invites confident nonsense.
  Ask what it depends on and what would prove it wrong.
- Don't decide feasibility by fiat. Requirements rule the design, not the world.
- Don't over-cite. Load-bearing claims only.
- Don't automate the abort decision [[D5]]. Churn, a climbing revision count, a diff that
  grows while tests stay flat — those track with the band-aid spiral, so they flag a design
  for my attention. They don't decide. Make aborting cheap instead.
- "Let go of tactics" doesn't mean "stop reading the code." Skim the tactics; keep eyes on
  boundaries and behavior.
- No stored dependency rollup at the design level. It's derived from the inline tokens on
  demand, never hand-maintained.
- Package the plugin after two real runs, not before.
