---
version: "4"
name: implement-code
description: Implement one code package (npm-library, npm-cli, minecraft-addon) inside a running implementation, through the Define, Stub, Code, Document waves. Invoked by the implement skill; use directly when asked to build one code package against a product's fold.
---

# Implement a code package

The wave shape for code kinds. Each wave produces one artifact, validated against what came
before it. Full rules: `docs/process-reference.md` (Dispatch, Proving a claim is met) and
`docs/agent-guidance.md`. Design consequences land in the companion increment as they happen —
see the `implement` skill for the escalation rules.

| wave | produces | validated against |
|---|---|---|
| **Define** | the test plan | the requirements and decisions |
| **Stub** | tests and API stubs | the test plan |
| **Code** | the implementation | the stubs, by compiling; the tests, by passing |
| **Document** | READMEs and user-facing documentation | the implementation |

## Define

List the claims this package carries (requirement and decision ids from the fold), the tests
that will demonstrate each, and which coverage kind each claim is expected to get. The test
plan is transient — an input to the work, not a deliverable; keep it in a scratch location.

## Stub

Write the tests and the public API stubs from the test plan. Coverage `code-test` and
`conformance-case` entries begin here, as the artifacts come into existence. Minimise the
public contract — every export is a constraint on reimplementation: one entry point by
default, no subpath wildcards, no `export *`, internals unreachable. A second entry point is a
decision, recorded in the companion increment.

## Code

Implement until the stubs compile and the tests pass. Choices below the recording bar — a
consumer could observe it, or a reimplementation must preserve it — live in the code; choices
at or above it are companion-increment decisions. Record an `attestation` for every claim you
implemented, alongside whatever better evidence exists.

## Document

Write the README and user-facing documentation against the implementation as built.
Documentation is a deliverable of the product, not a by-product. `manual-check` coverage
entries land here, where a claim is verified by following documented steps.

Run the package's full verification (build, typecheck, lint, tests) before handing back.
