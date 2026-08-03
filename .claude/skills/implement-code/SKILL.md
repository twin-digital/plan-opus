---
version: "4"
name: implement-code
description: Implement one code package (npm-library, npm-cli, minecraft-addon) inside a running implementation, through the Define, Stub, Code, Document waves. Invoked by the implement skill; use directly when asked to build one code package against a product's fold.
---

# Implement a code package

The wave shape for code kinds. Each wave produces one artifact, validated against what came
before it. Full rules: `docs/process-reference.md` (Dispatch, Proving a claim is met). Design
consequences land in the companion increment as they happen — see the `implement` skill for
the escalation rules.

| wave | phase | produces | validated against |
|---|---|---|---|
| **Define** | prepare | the test plan | the requirements and decisions |
| **Stub** | prepare | tests and API stubs | the test plan |
| **Code** | implement | the implementation | the stubs, by compiling; the tests, by passing |
| **Document** | implement | READMEs and user-facing documentation | the implementation |

**prepare** ends with the Stub wave: the package's public surface exists and siblings can
compile against it. **implement** runs prepare first where it has not run, then Code and
Document. Expect a pause between the phases in a parallel run — the orchestrator merges
prepare outputs before implement begins.

## Define

List the claims this package carries (requirement and decision ids from the fold), the tests
that will demonstrate each, and which coverage kind each claim is expected to get. The test
plan is transient — an input to the work, not a deliverable; keep it in a scratch location.

## Stub

Write the tests and the public API stubs from the test plan. Coverage `code-test` and
`conformance-case` entries begin here, as the artifacts come into existence.

**Minimise the public contract.** Every export is a constraint on the reimplementation: the
public surface is precisely what a regenerated implementation must preserve, and the surface a
consumer can come to depend on whatever the contract says. Rules the design validator can
enforce:

- one entry point by default — a second is a decision, recorded in the companion increment
- no subpath wildcards: a `"./*"` pattern surrenders the boundary
- no `export *` from an entry point — the commonest way a surface grows without anyone
  deciding; named re-exports only
- `internal/` is unreachable from outside
- the API report is committed, so a surface change appears as a reviewable diff

Type-only exports are cheaper than value exports and worth counting separately: they constrain
what a consumer compiles against but carry no runtime behaviour to preserve. This is the
*product's* boundary — minimising internal modules' surfaces is a different concern (coherence,
not reimplementation cost), and internal structure stays free to reorganise.

## Code

Implement until the stubs compile and the tests pass. Make the smallest decisions that
complete the work: a question the fold left open is settled narrowly and recorded, not
generalised from. Choices below the recording bar — a
consumer could observe it, or a reimplementation must preserve it — live in the code; choices
at or above it are companion-increment decisions. Record an `attestation` for every claim you
implemented, alongside whatever better evidence exists.

## Document

Write the README and user-facing documentation against the implementation as built.
Documentation is a deliverable of the product, not a by-product. `manual-check` coverage
entries land here, where a claim is verified by following documented steps.

Run the package's full verification (build, typecheck, lint, tests) before handing back.
