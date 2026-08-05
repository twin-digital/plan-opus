---
tags:
  - authoring
  - decisions
---

# Decisions should not carry justification prose

A decision's `statement` is what is in force. Justification — why this rather than the alternative,
what it rests on, what would be true otherwise — keeps ending up in there too, and it rots.

**What goes wrong.** Justification is written relative to the rest of the decision set at the moment
of writing. Reverse a sibling decision and the prose is silently false, while still reading as
settled. Three from one increment of mc-dev-kit, all after the owner reversed one ruling about
whether a world outlives a stop:

- one decision still said "both are only ever meaningful because a world lasts one run"
- another argued "recreating the container is what loses the world" after the volume began
  outliving container recreation
- a third framed the project's identity around protecting a world that had stopped being durable

Each was found by hand, late, and only because something else drew attention to it. Nothing checks
this, and nothing can: it is prose agreeing with prose.

**Why it lands in `statement` at all.** A requirement has a `rationale` field. A decision has none —
`because` carries the machine-checkable dependencies, `rejection_reason` carries the owner's reason
for refusing, and there is nowhere for the proposer's reasoning to go. So it goes in the statement,
where nothing distinguishes it from what is in force.

**Three things worth doing, and they are separable:**

1. **Authoring guidance.** Say plainly that a decision's statement is the ruling and not the argument
   for it, the way `docs/authoring.md` already rules on other content. Cheapest of the three and
   independently useful.

2. **A place for justification to live.** It is genuinely wanted at design time — an owner rules
   better seeing why — and dead weight at implementation time, where an implementer needs the ruling
   and not the debate. That asymmetry suggests somewhere that travels with the increment and does not
   travel with the fold: a field the projection omits, the draft's own working material, or the pull
   request. Worth considering whether `because` plus the cited facts already carry enough of the
   "why" that a prose field is not needed at all.

3. **Existing decisions.** They carry a lot of this already. Whether that is a sweep, a rule applied
   as decisions are next touched, or nothing at all is a real question — a bulk edit across published
   increments runs into immutability, and the value is only realised where the prose is actually
   wrong rather than merely present.
