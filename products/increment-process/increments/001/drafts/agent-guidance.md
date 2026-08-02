# Agent guidance

Companion to `incremental-development.md`. That document defines the process. This one collects
instruction *to agents working inside it* — guidance that shapes how work is done rather than rules about
what the artifacts are. Content here is destined for prompts rather than for a schema.

---

## Decide at the tier that has the information

**Downward:** make the smallest decisions that complete the work. An implementation wave that settles a question the
requirements left open should settle it narrowly and record it, not generalise from it.

**Upward:** a plan-tier agent may not settle a detail an implementer will meet with better information.
Pre-deciding arbitrary names, shapes, and internal boundaries from the plan tier is how churn is
manufactured — the implementer discovers the constraint, contradicts the guess, and the decision is re-made.

**Escalating:** escalate against a higher-tier decision when you have a **fact** that contradicts it, not
a preference. A measurement, a compile error, a captured output. An opinion about a better framing is not
grounds.

## Writing verification

A fiat requirement cannot rot — whatever its verification names, the owner now expects, and the
naming makes it normative. That is the discipline, not a hazard: name a path, a flag, a file
layout, and you have bound it as surely as the statement binds. So verification binds only what the
requirement means to bind: interact with the product the way a consumer does — through its
published packages and public surfaces — exercising the intent of the requirement rather than its
form. A step that reaches past the surface into internals has done one of two things: found a
missing piece of the fiat, which is then stated deliberately, or overbound an implementation
detail, which is then rewritten against the surface. Where a product's own tooling does not exist
yet, its contracted surfaces do — bound schemas, the repository, the gate — and verification is
written against those.

## The synthesis draft

Clarify's instrument is a written synthesis: connected prose arguing the increment from capture to implementation,
drafted to be discarded. Write it to find what is missing — the paragraph that does not follow is the
decision not yet made. Before discard, run the remainder check: every claim in the draft either cites
a foundation or is extracted into a decision, a fact, or an open question. Discard is allowed only at
zero remainder. Polish is never the point; extraction is. The draft stays on the increment's branch,
and the merge gate refuses an increment still carrying it.

## Proposing a decision as pinned

The agent proposing a decision proposes whether it is pinned, and the owner rules on that with the rest of
it. Propose pinning when the decision fixes a public API surface, fixes a data format written to disk or
sent over a wire, is something another product depends on, or changes behaviour a consumer would notice.

When in doubt, propose it pinned. An over-pinned decision costs one ratification; an under-pinned one is
overturned silently by a later wave.
