---
version: "4"
name: implement-document
description: Implement one tree-consumed package (document or agent-skill kind) inside a running implementation, through the Claims, Compose, Check waves. Invoked by the implement skill; use directly when asked to ship or revise a document or skill against a product's fold.
---

# Implement a document or agent-skill package

The wave shape for tree-consumed kinds. Each wave produces one artifact, validated against
what came before it. Full rules: `docs/process-reference.md` (Dispatch, A product maps to its
packages). A document at a permanent path goes live at merge — so
its changes ride the implementation's pull request and merge only after the design increment
they target has published.

| wave | phase | produces | validated against |
|---|---|---|---|
| **Claims** | prepare | the list of claims the document must state | the effective design at the targeted increment |
| **Compose** | implement | the document at its permanent home | the claim list; every draft claim checked against the fold |
| **Check** | implement | coverage entries per claim | the document, read against each claim |

**prepare** is the Claims wave — the allocation is what sibling documents check against, and
running every document's Claims before any Compose is what surfaces a claim two documents own
or none does; reconciling those collisions and gaps across siblings is the orchestrator's
job, at the prepare merge. **implement** runs Claims first where it has not run, then Compose
and Check.

## Claims

A selection and an allocation, not a restatement: from everything in force at the target, the
claims *this* document is responsible for stating, each mapped to where it will be stated.
Surface the problems before composing: a claim no document owns, two documents owning one
claim, a claim no planned section could state. For an agent-skill, the claims are the process
rules the skill operationalizes. The list is transient; keep it in a scratch location.

## Compose

Write the document at its permanent home (`product.yaml` names it), drawing on the increments'
frozen `drafts/` — raw material, never normative. Make the smallest decisions that complete
the work: a question the fold left open is settled narrowly and recorded, not generalised
from. Check every draft claim against the fold as
you go: drafts predate rulings, so expect drift. What you find superseded, you write to the
fold's state, not the draft's. A claim in the draft resting on no foundation is extracted into
the companion increment or dropped, never transcribed.

## Check

Read the finished document against the claim list, claim by claim — preferably with fresh
eyes (a separate agent). Fix what is missing or misstated, then write the coverage entries:
`attestation` with the document as `ref` for claims the document states, alongside any
stronger evidence. A tree-consumed package declares its version in its frontmatter — the
string form of the increment this revision reflects; set it when you change the file, and the
record quotes it.
