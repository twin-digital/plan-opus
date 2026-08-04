# The document wave shape

Your kind is `document` or `agent-skill` — a skill is a shipped instruction document read by
agents, composed and checked claim by claim like any other document deliverable. Three waves
split across the phases: **prepare** is Claims, **implement** is Compose and Check. How a
document package is consumed: `docs/process-reference.md#a-product-maps-to-its-packages`.

| wave | phase | produces | validated against |
|---|---|---|---|
| **Claims** | prepare | the list of claims the document must state | the effective design at the targeted increment |
| **Compose** | implement | the document at its permanent home | the claim list; every claim in the increments' `drafts/` checked against the fold |
| **Check** | implement | coverage entries per claim | the document, read against each claim |

## Claims

A selection and an allocation, not a restatement: from everything in force at the target, the
claims *this* document is responsible for stating, each mapped to where it will be stated. For
an agent-skill, the claims are the process rules the skill operationalizes. Deferred decisions
get no allocation — a deferral without an answer is not a gap.

## Compose

Write the document at its permanent home, the path `product.yaml` names.

Draw on the increments' frozen `drafts/`: raw material, never normative. A draft froze with its
increment and predates later rulings, so check every claim in it against the fold as you go and
expect drift. What you find superseded, you write to the fold's state, not the material's. A
claim in the material citing no foundation is a shadow decision — extract it into the companion
increment or drop it, never transcribe it; the implementation-detail test is what decides
which.

## Check

Check reads in both directions:

1. **Claims against the document** — each allocated claim must be stated where the allocation
   placed it; fix what is missing or misstated.
2. **The document against the fold** — the shadow-claim audit: every normative statement
   ("must", "never", "is refused", a quantity, a name) must trace to a foundation in force. A
   statement asserting a rule no foundation carries is fixed to match the fold where one rules,
   extracted into the companion increment — a decision where the behavior is real, a question
   where the unknown is genuine — or cut. Never left standing.

Then write the coverage entries. A ref into a document cites the file plus a section
breadcrumb — `docs/process-reference.md#the-companion-increment` — narrowing to the section
that carries the claim, with the bare file only where the claim really is the whole file.

Set the document's frontmatter `version` field to the string form of the design increment its
content now reflects, whenever you change the file. The record quotes that declared version.
