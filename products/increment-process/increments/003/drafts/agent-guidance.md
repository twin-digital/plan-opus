# Agent guidance — Implement phase

Draft of increment 003's additions to the agent guidance drafted in increment 001.

## Minimise the public contract

**Every export is a constraint on the reimplementation.** The public surface is precisely the set of
things a regenerated implementation must preserve, so its size is the inverse of the freedom that
makes a reimplementation cheap. It is also the size of the surface a consumer can come to depend on
whatever the contract says.

Rules the design validator can enforce:

- **One entry point by default.** A second is a decision, not a default.
- **No subpath wildcards.** A `"./*"` pattern surrenders the boundary — every internal path becomes a
  promise.
- **No `export *` from an entry point.** It is the most common way a surface grows without anyone
  deciding: adding a symbol to an internal module silently publishes it. Named re-exports only.
- **`internal/` is unreachable from outside.**
- **The API report is committed**, so a surface change appears as a reviewable diff.

**Type-only exports are cheaper** than value exports and worth counting separately: they constrain
what a consumer compiles against but carry no runtime behaviour for a reimplementation to preserve.

This is about the *product's* boundary. Minimising the surface of internal modules is a different
concern with a different justification — it makes an implementation coherent, not a reimplementation
cheaper, because internal structure is transient and a reimplementation may reorganise it entirely.

## Name what carries the claim

A coverage entry's `ref` names the artifacts that carry the claim — the test whose failure would
mean the claim is false, the files whose content is what the claim asserts. One path or several, but
chosen by that test, not by reachability: the generic error type, the logging library, and
everything else a code path touches are reachable from almost any claim and evidence for none. If
removing the file would not touch whether the claim holds, it does not belong in the `ref`.

## Orchestration flavours

The process fixes what must escalate; when an implementation stops is chosen per product, by risk,
as an orchestration instruction rather than a process rule. The flavours:

- **wave-by-wave** — pause after each wave for owner review before the next begins
- **run-to-completion** — run every wave, review once at the end
- **escalation-only** — stop only when an escalation fires
