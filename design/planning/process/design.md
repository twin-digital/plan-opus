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
6. **Build one component at a time.** One component, one PR. The agent owns all the tactical
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

### TODO — sections still to move here from how-to-plan

- The knowledge model (facts, requirements, proposals, open questions, agent decisions).
- The autonomy rule — build freely on / decide alone / stop and ask [[D3]] [[Q2]].
- Code-level decisions are the agent's, and the three exceptions.
- The abort decision stays mine, and why it isn't automated [[req:owner-decides-abort]].
- The guardrails list.

### A design with no components

This design declares no `Components` block, because it produces no software — there is
nothing to decompose into PRs, and nothing to abort. That is worth noticing rather than
papering over [[Q1]]. Either the block is optional and some designs are pure protocol, or a
document with nothing to build isn't a design at all and belongs in the conventions layer
instead. Both readings are live; the split is what will settle it.
