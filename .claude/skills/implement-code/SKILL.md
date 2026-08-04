---
version: "9"
name: implement-code
description: Implement one code package (npm-library, npm-cli, minecraft-addon) inside a running implementation, through the Define, Stub, Code, Document waves. Invoked by the implement skill; use directly when asked to build one code package against a product's fold.
---

# Implement a code package

The wave shape for code kinds. Full rules: `docs/process-reference.md` (Dispatch, Proving a claim is met). Design
consequences land in the companion increment as they happen — see the `implement` skill for
the escalation rules.

| wave | phase | produces | validated against |
|---|---|---|---|
| **Define** | prepare | the test plan | the requirements and decisions |
| **Stub** | prepare | tests and API stubs | the test plan |
| **Code** | implement | the implementation | the stubs, by compiling; the tests, by passing |
| **Document** | implement | READMEs and user-facing documentation | the implementation |

**survey** precedes the waves and maps to none of them: read-only against a fold or draft
fold, it returns its census and builds nothing. **prepare** ends with the Stub wave: the package's public surface exists and siblings can
compile against it. Prepare may return as soon as the API stubs stand — test authoring can
finish inside implement — so dependents unblock at the earliest honest moment; a stub reworked
while tests are written follows the ordinary churn path (update, re-merge, dependents rebase). **implement** runs prepare first where it has not run, then Code and
Document. Expect a pause between the phases in a parallel run — the orchestrator merges
prepare outputs before implement begins.

## Survey

Read-only, against a fold or draft fold — edit nothing, commit nothing. Walk what building
this package would take and return the choices the build would meet that the fold neither
decides nor defers, with your reading of each, as the census in the dispatcher's shape (the
`implement` skill defines it). Classifying is Clarify's: where your reading finds an
implementation detail — no consumer could observe it, no reimplementation must preserve
it — say so in the reading and return the choice anyway. It is the same test the Code wave
applies at wrap-up; `docs/process-reference.md` states it.

## Define

List the claims this package carries (requirement and decision ids from the fold), the tests
that will demonstrate each, and which coverage kind each claim is expected to get. The test
plan is transient — an input to the work, not a deliverable; keep it in a scratch location.

## Stub

Write the tests and the public API stubs from the test plan. Coverage `code-test` entries
begin here as the tests come into existence; `conformance-case` entries join only as the owner
writes or vets a case.

**Minimise the public contract** — every export is surface a reimplementation must preserve
and a consumer can come to depend on. Working defaults, each departure a companion-increment
decision:

- one entry point
- no subpath wildcards — a `"./*"` pattern surrenders the boundary
- no `export *` from an entry point; named re-exports only
- internals unreachable from outside

Internal structure stays free to reorganise.

## Code

Implement until the stubs compile and the tests pass. Make the smallest decisions that
complete the work: a question the fold left open is settled narrowly and recorded, not
generalised from. A choice a consumer could observe, or a
reimplementation must preserve, is a companion-increment decision; anything below that bar
lives in the code. Record an `attestation` for every claim you
implemented, alongside whatever better evidence exists.

## Document

Write the README and user-facing documentation against the implementation as built.
Documentation is a deliverable of the product, not a by-product. `manual-check` coverage
entries land here, where a claim is verified by following documented steps.

Run the package's full verification (build, typecheck, lint, tests) before handing back.
