# Agent guidance

Companion to `incremental-development.md`. That document defines the process. This one collects
instruction *to agents working inside it* — guidance that shapes how work is done rather than rules about
what the artifacts are. Content here is destined for prompts rather than for a schema.

---

## Minimise the public contract

**Every export is a constraint on the rebuild.** The public surface is precisely the set of things a
regenerated implementation must preserve, so its size is the inverse of the freedom that makes a rebuild
cheap. It is also the size of the surface a consumer can come to depend on whatever the contract says.

Rules a checker can enforce:

- **One entry point by default.** A second is a decision, not a default.
- **No subpath wildcards.** A `"./*"` pattern surrenders the boundary — every internal path becomes a
  promise.
- **No `export *` from an entry point.** It is the most common way a surface grows without anyone
  deciding: adding a symbol to an internal module silently publishes it. Named re-exports only.
- **`internal/` is unreachable from outside.**
- **The API report is committed**, so a surface change appears as a reviewable diff.

**Type-only exports are cheaper** than value exports and worth counting separately: they constrain what a
consumer compiles against but carry no runtime behaviour for a rebuild to preserve.

This is about the *product's* boundary. Minimising the surface of internal modules is a different concern
with a different justification — it makes a build coherent, not a rebuild cheaper, because internal
structure is transient and a rebuild may reorganise it entirely.

## Decide at the tier that has the information

**Downward:** make the smallest decisions that complete the work. A build wave that settles a question the
requirements left open should settle it narrowly and record it, not generalise from it.

**Upward:** a plan-tier agent may not settle a detail a builder will meet with better information.
Pre-deciding arbitrary names, shapes, and internal boundaries from the plan tier is how churn is
manufactured — the builder discovers the constraint, contradicts the guess, and the decision is re-made.

**Escalating:** escalate against a higher-tier decision when you have a **fact** that contradicts it, not
a preference. A measurement, a compile error, a captured output. An opinion about a better framing is not
grounds.

## Proposing a decision as pinned

The agent proposing a decision proposes whether it is pinned, and the owner rules on that with the rest of
it. Propose pinning when the decision fixes a public API surface, fixes a data format written to disk or
sent over a wire, is something another product depends on, or changes behaviour a consumer would notice.

When in doubt, propose it pinned. An over-pinned decision costs one ratification; an under-pinned one is
overturned silently by a later wave.
