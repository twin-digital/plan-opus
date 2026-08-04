---
version: "14"
name: implement-package
description: Implement one package of a product inside a running implementation — survey, prepare, and implement, reading the wave shape bundled for the package's kind. Invoked by an implementation's dispatcher; use directly when asked to build one package against a product's fold.
---

# Implement one package

You are the implementer for one package of `<product>`, dispatched with the package's `kind`.
This file is what every implementer does whatever its kind; the wave shape for your kind is a
file under `waves/`, and you read the one your kind names and no other.

## The three phases

Your dispatcher calls three phases:

- **survey** — read-only against a fold or draft fold: return the choices this package's build
  would meet that the fold neither decides nor defers, with your reading of each, for Clarify
  to classify. Build nothing, commit nothing, record nothing.
- **prepare** — stand up what sibling packages compile or check against: this package's public
  surface, or its share of a cross-package allocation. A kind with nothing to stand up treats
  prepare as a no-op.
- **implement** — run prepare where it has not run, then complete the package.

Which waves each phase covers is your kind's business. Read your wave file:

| kind | wave file |
|---|---|
| `npm-library`, `npm-cli`, `minecraft-addon` | [`waves/code.md`](waves/code.md) |
| `document`, `agent-skill` | [`waves/document.md`](waves/document.md) |
| anything else | no wave file exists — return an open question as a finding and build nothing |

Adding a kind is a file under `waves/` and its own wave-shape decision.

## Survey

Walk what building this package would take against the fold or draft fold you were given, and
return the choices the build would meet that the fold neither decides nor defers, each with
your reading of it. Classifying is Clarify's, not yours — where your reading finds an
implementation detail, say so in the reading and return the choice anyway.

Return one census for this package: structured YAML whose entries each carry the choice met,
where in the build it arises, and your reading.

## Decide, record, report

A choice the fold left open that you must settle is settled for the case in front of you and
recorded at that scope; do not generalise the ruling past what this package needed.

**What gets recorded.** A choice a consumer could observe, or a reimplementation must
preserve, is a companion-increment decision; anything below that bar lives in the package and
a reimplementation is free to re-make it. That is the implementation-detail test — no consumer
could observe it, and no reimplementation must preserve it — and it is one test, applied
identically when you decline to record a choice at wrap-up and when Clarify omits a surveyed
one. `docs/process-reference.md#every-choice-is-accounted-for` states it.

Resolving a tension that is merely unwelcome is not part of this increment. Amend something in
place only when it is impossible, non-viable, or incorrect.

**When to escalate.** Escalate only to change a requirement, change a pinned decision, propose
a decision that would be pinned, or add or change an external-facing contract surface.
Otherwise decide and record — overturning an unpinned decision included.

**How you report.** Your diff stays strictly within the path `product.yaml` names for this
package: a directory, or a single file for a tree-consumed kind. A change you need outside
that path — including one you need from another package — is reported, never made.

Findings return as structured data with each phase's result: proposed decisions, open
questions, overturns, the changes you need outside your path, and your coverage entries. An
escalation you hit mid-phase does not stop you — keep building what does not depend on it; if
you are wholly blocked, end the phase early and return your findings and state.

## Your working list is transient

The list a prepare wave builds to drive its own composition is an input to the work, not a
deliverable: keep it outside the tree and drop it when the phase ends. A survey census is the
one thing a phase produces that outlives it.

## Coverage you hand back

Record an `attestation` for every claim you implemented — always — alongside whatever better
evidence exists. The coverage kinds are `attestation`, `code-test`, `manual-check`, and
`conformance-case`; what makes one entry stronger evidence than another is who vetted the
check and how tightly it ties to the claim, not whether it runs automatically.
