# Capturing the triage model

The second increment of the grinbox capture, stacked on `wip-001`. It reads the model itself out
of the code: what an operator is, what it declares, how order is derived from those declarations,
what a triage is and what settles it, and how anything reaches outside the process.

## What was read

`docs/architecture.md` and `docs/pipeline-runtime.md` for the intent, then the code where the two
disagree — `packages/shared/src/{contract,operators,resources}.ts` for the declarative half, and
`packages/server/src/{operators,execution,pipeline,resources}` for the runtime. The code is
ahead of the documents in one place that matters: contract inputs are now derived from a gate's
tag and from the tag references inside a template, which is what makes ordering work at all
(`docs/open-issues.md` I2 and I4). The captured decisions follow the code.

## The bound-or-free split

**Bound.** The primitive itself, and that there is only one of it. That a contract belongs to the
type and code version rather than being stored per instance. The two output forms, closed enum and
typed extraction, and that only the first can be gated on. That order is derived rather than
stated, one producer per tag key, and that the graph is checked at save. That tags belong to their
triage and a re-triage starts empty. That a run snapshots what it was enqueued with. That failure
cascades to dependents and settles the triage partial, and that the retry is a re-triage. That
resources are a closed set, that a client exposes only what was declared, and that a capped
operation is an outcome rather than an error.

**Free.** How the loop finds ready work — the polling tick, the candidate batch size, the worker
pool's size, the optimistic-claim SQL. Timeout values and where the abort signal is threaded. The
retry counts and backoff per operation. That coordination happens through the state DB rather than
in memory, which is a consequence of one process rather than a commitment. The table and column
shapes throughout, and the settlement query.

**Left for later increments.** The built-in operator types and their configuration, including the
`when` gate and the template grammar; accounts, providers, and polling; the digest; and the API.

## One thing worth the owner's eye

`r-zagpfz75` — re-examining a message never repeats an outside effect — is captured as a
requirement rather than as a property of the limit mechanism, because it is the promise that makes
replay usable and the owner would reverse a design decision to keep it. The mechanism that
delivers it today, a per-message limit counter that a replay finds already spent, is
`d-isyan49o`. Read the pair together: if the mechanism is ever replaced, the requirement is what
the replacement has to satisfy.
