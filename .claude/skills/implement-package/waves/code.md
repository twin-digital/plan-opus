# The code wave shape

Your kind is `npm-library`, `npm-cli`, or `minecraft-addon`. Four waves, split across the
phases: **prepare** is Define and Stub, **implement** is Code and Document.

| wave | phase | produces | validated against |
|---|---|---|---|
| **Define** | prepare | the test plan | the requirements and decisions |
| **Stub** | prepare | tests and API stubs | the test plan |
| **Code** | implement | the implementation | the stubs, by compiling; the tests, by passing |
| **Document** | implement | READMEs and user-facing documentation | the implementation |

Prepare may return as soon as the API stubs stand — test authoring can finish inside Code — so
dependents unblock at the earliest honest moment.

## Define

List the claims this package carries — requirement and decision ids from the fold — and the
tests that will demonstrate each.

## Stub

Write the tests and the public API stubs from the test plan.

**Build to a minimal public surface** — every export is surface a reimplementation must
preserve and a consumer can come to depend on:

- one entry point
- no subpath wildcards
- no `export *` from an entry point; named re-exports only
- internals unreachable from outside

These are working defaults, not gates: a package that departs from one records the departure as
a companion-increment decision. Internal structure stays free to reorganise.

## Code

Implement until the stubs compile and the tests pass.

## Document

Write the README and user-facing documentation against the implementation as built.

Before handing back, the stubs compile and the tests pass.
