---
tags:
  - process
---

# authoring.md says none of it is a validator rule; some of it is

`docs/authoring.md` opens: "The process reference states how the process works
and what the validator enforces; this document states the tests a reviewer
applies where the machine stops, and none of it is a validator rule."

That is no longer true. The validator enforces checklist row 2 outright — a
statement over sixty words fails `statement-budget` — and parts of row 6 through
`term-orphan`, `term-redefinition-reach`, `term-retirement-users`,
`term-slug-unique` and `term-retirement-guarded`. Row 10's citation half is
covered by `citation-resolves` and `citation-not-question`.

Both were felt while authoring a grinbox increment: a 63-word statement was
refused, and a declared term nothing used was reported. Neither is a reviewer
applying judgement; both are the machine.

The framing matters because it tells an author which rows they must grade
themselves. Saying none of the guide is enforced invites treating the enforced
rows as advisory and the advisory rows as equally optional. Mark each row with
what enforces it — the validator, the reviewer, or both — or drop the sentence.
