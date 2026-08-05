---
tags:
  - process-doc
  - tooling
---

# The api pool's first use leaves seven questions unanswered

`apis/design-process/ratify-screen.1.yaml` is the pool's first entry, bound by the ratify-view
increment. Two blockers were closed there (`d-2mvbck4i`: an implementer reads its bound
contracts, resolved by header scan, from the planning repository). Seven refinements were not,
because none of them costs anything today — `npm run check` passes and a build proceeds.

Surfaced by the survey run against the draft fold on 2026-08-05.

1. **docs/authoring.md states no quality test for a contract.** `d-af2v9seu` fixes the document's
   subjects as statements, verification, decisions, and model entries. Writing a contracts
   section unruled would be a shadow claim, and the rubric is what the review gate loads.
2. **What the test would be.** `r-lll68661` rests falsifiability on the validator extracting from
   code and diffing — machinery that exists for TypeScript and OpenAPI, not a terminal screen.
   `d-9zot40jn` asserts a render can be diffed, which is an argument inside one decision.
3. **How much shape belongs in the contract versus the decision.** The ratify-view draft drew the
   line by hand and a surveyor caught it violating its own line once. A general test is derivable
   from `d-ke7709uf` plus `d-8z7j435b` and is stated nowhere.
4. **Whether a contract may defer shape inside itself.** `ratify-screen` carries `truncated-to:
   the implementer's choice of width`. Under `r-lll68661` a pool version is a commitment; a field
   naming no commitment is either unfalsifiable padding or the honest way to say the surface does
   not fix that dimension.
5. **Which coverage kind a screen's conformance carries.** The implementation schema constrains
   `claim` to `^[rd]-`, so a model binding is not coverable and conformance is evidenced under the
   entries citing the contract. `conformance-case` or `code-test` is unruled, and unstated it
   will be filed as `code-test`, which costs the pool its point.
6. **How far an implementer may decide into a contract's silence.** The escalation rule was
   written for schemas, where silence is small and closed by `additionalProperties`. A screen's
   silence is large — key bindings, scroll, colour, the empty-list state, a terminal too narrow
   for both panes. Read strictly, an implementer escalates on each and pauses the build. The
   contract's own preamble arguably settles it; nothing says so.
7. **Whether a pool surface carries a `version:` field, and whether the pool admits a surface no
   extractor reads.** The reference says every structured file this process defines carries
   `version:`; the screen contract does not. The api section says the file's extension and content
   tell the validator which extractor reads it; none reads a rendered screen.
