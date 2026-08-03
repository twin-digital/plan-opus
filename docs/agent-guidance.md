---
version: 0.1.0
---

# Agent guidance

Companion to `process-reference.md`. That document defines the process; this one collects
instruction *to agents working inside it* — guidance that shapes how work is done rather than
rules about what the artifacts are. Content here is destined for prompts rather than for a
schema.

## Decide at the tier that has the information

**Downward:** make the smallest decisions that complete the work. An implementation wave that
settles a question the requirements left open should settle it narrowly and record it, not
generalise from it.

**Upward:** a plan-tier agent may not settle a detail an implementer will meet with better
information. Pre-deciding arbitrary names, shapes, and internal boundaries from the plan tier
is how churn is manufactured — the implementer discovers the constraint, contradicts the guess,
and the decision is re-made.

**Escalating:** escalation fires only to change a requirement, change a pinned decision, or
propose a decision that would be pinned. A fact that contradicts an *unpinned* decision is not
an escalation — overturn it and record the supersession in the companion increment. Where
escalation does fire, bring a **fact**, not a preference: a measurement, a compile error, a
captured output. An opinion about a better framing is never grounds against a ratified entry.

## Raise questions instead of guessing

An unknown you cannot answer becomes an open question in the increment's questions source, not
a plausible answer written ahead of its evidence — a month later, nothing in the artifact
distinguishes the two, and the decision set then carries entries that look ruled and are not.
The discipline cuts both ways: an unknown the evidence in hand already determines is settled
now, and raising a question is itself a form of answering now rather than a deferral. Name
which kind of foundation would answer it — a fact sends someone to measure, a decision needs a
call someone is competent to make, a requirement is the owner's alone. A question whose author
cannot name that kind is usually not a question yet.

## Writing verification

A fiat requirement cannot rot — whatever its verification names, the owner now expects, and the
naming makes it normative. That is the discipline, not a hazard: name a path, a flag, a file
layout, and you have bound it as surely as the statement binds. So verification binds only what
the requirement means to bind: interact with the product the way a consumer does — through its
published packages and public surfaces — exercising the intent of the requirement rather than
its form. A step that reaches past the surface into internals has done one of two things: found
a missing piece of the fiat, which is then stated deliberately, or overbound an implementation
detail, which is then rewritten against the surface. Where a product's own tooling does not
exist yet, its contracted surfaces do — bound schemas, the repository, the gate — and
verification is written against those.

## The synthesis draft

Clarify's instrument is a written synthesis: connected prose arguing the increment from capture
to implementation. Write it to find what is missing — the paragraph that does not follow is the
decision not yet made. Before the increment publishes, run the remainder check: every claim in
the draft either cites a foundation or is extracted into a decision, a fact, or an open
question. Publish is allowed only at zero remainder. Polish is never the point; extraction is.
The draft freezes in the increment's `drafts/` folder at publish, as the record of the argument
rather than a second authority.

## Proposing a decision as pinned

The agent proposing a decision proposes whether it is pinned, and the owner rules on that with
the rest of it. Propose pinning when the decision fixes a public API surface, fixes a data
format written to disk or sent over a wire, is something another product depends on, or changes
behaviour a consumer would notice.

When in doubt, propose it pinned. An over-pinned decision costs one ratification; an
under-pinned one is overturned silently by a later wave.

## Minimise the public contract

**Every export is a constraint on the reimplementation.** The public surface is precisely the
set of things a regenerated implementation must preserve, so its size is the inverse of the
freedom that makes a reimplementation cheap. It is also the size of the surface a consumer can
come to depend on whatever the contract says.

Rules the design validator can enforce:

- **One entry point by default.** A second is a decision, not a default.
- **No subpath wildcards.** A `"./*"` pattern surrenders the boundary — every internal path
  becomes a promise.
- **No `export *` from an entry point.** It is the most common way a surface grows without
  anyone deciding. Named re-exports only.
- **`internal/` is unreachable from outside.**
- **The API report is committed**, so a surface change appears as a reviewable diff.

Type-only exports are cheaper than value exports and worth counting separately: they constrain
what a consumer compiles against but carry no runtime behaviour to preserve.

This is about the *product's* boundary. Minimising the surface of internal modules is a
different concern with a different justification — it makes an implementation coherent, not a
reimplementation cheaper, because internal structure is transient.

## Name what carries the claim

A coverage entry's `ref` names the artifacts that carry the claim — the test whose failure
would mean the claim is false, the files whose content is what the claim asserts. One path or
several, but chosen by that test, not by reachability: the generic error type, the logging
library, and everything else a code path touches are reachable from almost any claim and
evidence for none. If removing the file would not touch whether the claim holds, it does not
belong in the `ref`. The implementer records an attestation for every claim it implemented,
alongside whatever better evidence exists.

## Orchestration flavours

The process fixes what must escalate; when an implementation stops is chosen per product, by
risk, as an orchestration instruction rather than a process rule. The flavours:

- **wave-by-wave** — pause after each wave for owner review before the next begins
- **run-to-completion** — run every wave, review once at the end
- **escalation-only** — stop only when an escalation fires
