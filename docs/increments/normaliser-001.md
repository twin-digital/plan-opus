# normaliser — increment 1

**Status: draft inputs, awaiting owner ratification.** Requirements below were drafted by an agent and
are not fiat until ruled on.

The first increment run under `docs/proposals/incremental-development.md`, deliberately **by hand** — no
increment artifact, no manifest schema, no re-fenced requirements. Building that machinery before running
the process once would be designing an increment schema before knowing what an increment needs. The
process retrospective is the real deliverable here; the code is the excuse.

---

## Step 0 — Eligibility

**Does it have a data-shaped I/O boundary?** Yes, maximally. The normaliser is a pure function over
text: bytes in, bytes out, no state, no I/O beyond the streams, no ordering across invocations.

**Honest caveat:** this answers the gate so easily that it tests it barely at all. A project chosen to
be the cleanest possible case cannot tell us whether the gate discriminates. The gate still needs
trying against two or three of the existing packages, and that is a separate exercise.

---

## Step 1 — Agenda

**In scope**

1. The **pipeline** — read text, apply rules in a defined order, write text — and specifically the
   ordering discipline that makes regeneration safe.
2. The **interface** — how a harness invokes it and how rules are supplied.
3. **One rule**, to prove the shape end to end. Line endings (CRLF → LF) is the candidate: universal,
   trivially correct, and it exercises the whole path without inviting design argument.

**Out of scope, deliberately**

- Any project-specific redaction rule. Rules are discovered by the self-diff probe against real output,
  not designed in advance. Each becomes its own increment, and its agenda entry will name the project
  and the nondeterminism that surfaced it.
- Format detection, JSON key-order stabilisation, unordered-collection matching. These are a subsystem,
  not a flag, and nothing needs them yet. They may never be reached.
- Integration with `testscript`. That is the next increment, and it depends on this interface existing.

**Why the split falls here:** the pipeline shape and the interface are costly to reverse — every
conformance case that ever says `exec normalise stdout` compiles against them. Every *rule* is cheap to
reverse: additive, independently removable, and invisible to anything but the cases it touches. Pin the
first, defer the second.

---

## Draft requirements

Five. Each is something the owner would plausibly reverse a decision over; anything else belongs in
decisions.

### `r:normaliser-transforms-only`

> The normaliser reads text and writes text. It never compares, diffs, or decides pass or fail.

*Rationale:* a normaliser that also compares can only serve the harness it was written for. As a pure
filter it composes with `testscript`, with `hurl`, with a diff run by hand, and with harnesses that do
not exist yet.

### `r:normalised-is-what-is-stored`

> Stored expectations are already normalised, and actual output is normalised before comparison.
> Nothing is ever un-normalised.

*Rationale:* this is the ordering rule, and it is the requirement that removes an otherwise nasty
problem. Redaction is lossy and has no inverse — once a path becomes `[TMPDIR]` you cannot recover it.
But if both sides are normalised, no inverse is ever needed. Store raw and normalise at comparison time
instead, and every regenerated expectation silently captures the temp path it was meant to scrub.

### `r:normalisation-is-deterministic-and-idempotent`

> The same input and configuration always produce the same output, and normalising already-normalised
> text changes nothing.

*Rationale:* idempotence is the metamorphic invariant this whole tool rests on. Without it, the second
comparison of an unchanged artifact can fail, which makes every downstream case unreliable in a way that
is very hard to diagnose. It is also cheap to check and never needs an expected value.

### `r:rules-are-reviewable-data`

> Rules live in configuration rather than in code, each one named. Adding a rule is a decision the owner
> rules on.

*Rationale:* every rule asserts that some observable difference does not matter — which makes it a claim
about what the product promises, not a formatting preference. A rule that is too broad silently hides
real behavioural change, and that failure is invisible precisely because the rule is working as written.
Keeping rules as named data is also what lets them be added just-in-time without touching the tool.

### `r:an-inapplicable-rule-is-inert`

> A rule that does not match changes nothing and is never an error. One configuration serves every
> project.

*Rationale:* the alternative is per-project configuration, and then the shared component stops being
shared. A timestamp rule must be harmless in a project whose output has no timestamps.

---

## What the clearinghouse should settle

Not answers — the tensions this increment has to resolve into decisions, or measure into facts:

- **Invocation shape.** `exec normalise stdout` composes with `testscript` because it rewrites the
  stdout buffer. Whether the tool is a filter reading stdin, a command taking a file argument, or both,
  and what it does with exit codes.
- **Where configuration comes from**, and how a project adds a rule without forking the shared set.
  Repository-level plus project-level, with what precedence.
- **How a rule is expressed.** A detect-pattern and a replacement token at minimum. Whether rules may be
  ordered relative to one another, and what happens when two match the same span — the overlap case is
  where this gets subtle.
- **Whether the first rule should be line endings at all**, or whether path scrubbing is the more honest
  proof because it exercises replacement rather than simple substitution.
- **What "already normalised" means for idempotence** when a replacement token could itself match a
  detect-pattern.

## Cheap things worth measuring rather than arguing

- Whether `exec normalise stdout` actually rewrites the buffer such that a following `cmp stdout <section>`
  sees normalised text, and whether `-u` then regenerates the normalised form. **This is the mechanism
  the whole composition rests on and it is inference, not a verified result.** One txtar file settles it.
- Whether running any existing package's output through a null normaliser twice produces identical bytes
  — establishing the noise floor before any rule exists.

---

## Retrospective to keep

Recorded as the increment runs, because this is the increment's actual product:

- what each step cost in owner attention, and which felt like ceremony at this size
- which artifacts the process asked for that had nowhere to live
- where the existing repository schema fought the increment model
- what the owner wanted to know that no artifact carried
