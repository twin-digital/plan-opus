# The plan workflow: surveys, deferrals, and the account

The argument behind this increment's proposed set.

## What the old spec did, and what survived

The old process ended Plan with a spec, and the spec passed two tests: a builder could
implement the product from it, and everything it stated was backed by a decision or
requirement. The second test survived the migration — it is the shadow-claim audit, in the
authoring checklist at Plan time and the Check wave at build time. The first did not: nothing
in the new process reads the fold as a builder before the build does, so gaps surface as
companion decisions, litigated exactly where the owner does not want to litigate them.

The spec also stalled, and the stall had a cause worth naming: prose conflates completeness
of account with completeness of decision. A spec sentence either decides or is silent — it
cannot say "the implementer decides this" — so a complete spec had to decide everything,
including what only the implementer should care about.

## The account

The fix is a classification that can say it. Every choice a build meets is exactly one of:

- **decided** — a foundation determines it;
- **deferred** — a ruled decision names the choice and hands it to the implementer;
- **an implementation detail** — no consumer could observe it and no reimplementation must
  preserve it, the test d-rx3s2hqo already sets, applied identically by the Clarify agent
  omitting a surveyed choice and the implementer declining to record one.

> d-rx3s2hqo — decisions record the observable: "a decision is recorded when a consumer
> could observe its outcome or a reimplementation must preserve it; choices below that bar
> live in the code, and a reimplementation is free to re-make them."

Silence is the only gap. This is also where the over-planning dial and the anti-stall valve
stop fighting: decide what the evidence determines, defer what it does not, leave the rest to the
implementer in silence.

## The survey

The builder's reading is not a persona but a phase: implementers expose survey beside
prepare and implement — read-only, build nothing, return the choices your package's build
would meet that the fold neither decides nor defers, with your reading of each. Clarify
dispatches the implement orchestrator in survey mode against the draft increment on its
branch and classifies what returns: the implementer enumerates, Clarify rules. Per-kind
implementers give sharper readings than a generic reviewer, and the run is cheap: no
worktrees, no companion.

The plan skill offers the survey rather than always running it: it reports what is captured,
recommends from the delta's shape — packages, contracts, or consumer surfaces touched
recommends for; a norm-only delta recommends against — and the owner calls it.

## License and overturn, concretely

The deferral (in the plan increment, entered as deferred directly; the merge ratifies it):

```yaml
- id: d-yyyyyyyy
  title: the facts flag layout is the implementer's
  statement: exact flags and output layout of design-process facts are deferred to the
    implementer.
  status: deferred
```

The licensed answer (in the companion increment — rubber stamp):

```yaml
- id: d-aaaaaaaa
  title: facts takes a search term and a json flag
  statement: |
    design-process facts lists every fact; --search <text> filters by id and claim, and
    --json emits entries as JSON instead of the one-line rendering.
  status: delegated
  because:
    - d-yyyyyyyy
```

The overturn (in the companion increment — the counted failure, the short list the owner
actually reads):

```yaml
- id: d-bbbbbbbb
  title: facts emits ndjson
  statement: ...
  status: delegated
  supersedes: d-zzzzzzzz   # a plan-ruled decision, re-made during build
  because:
    - f:streaming-probe    # the discovery that forced it
```

The partition is mechanical off existing fields, and the
overturn count is the empirical feedback for the dial: overturns climbing means over-planning
is manufacturing churn; companions bloating with unlicensed entries means under-planning.

## Questions gain a closure route

Questions still never publish. A question routed to a decision whose honest answer is "not
determinable at plan tier" closes by minting the deferral, ruled by the owner; the deferral
is the closure record.

## Coverage closes the loop

A deferral is not implementable, so no record entry may cover one directly; it is covered
when an in-force decision citing it in `because` carries coverage. For coverage to be
complete, every deferred choice has been made, and the choice made has evidence.
