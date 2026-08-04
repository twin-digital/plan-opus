# Ways to structure the agent skills

Raw material for Clarify. Not normative.

## The measurement

From `implementations/increment-process/012-1.yaml`, the record filed at increment 012:

| skill | lines | claims |
|---|---|---|
| `implement` | 180 | 22 |
| `plan` | 164 | 22 |
| `implement-code` | 76 | 9 |
| `implement-document` | 69 | 10 |

**14 claims are stated by more than one skill.** `d-29fjsjn2` is stated by all four;
`d-cau8oksc` and `d-euwmthl9` by three.

## Two overlaps, not one

**Role overlap.** `implement-code` and `implement-document` share `d-cau8oksc` (survey is a
third phase), `d-29fjsjn2` (the implementation-detail test), `d-euwmthl9` (transient working
lists), `d-i8qe4bmp` (decisions scoped narrowly). These are rules about *being an implementer*.
Only the wave table and its wave descriptions are genuinely kind-specific. Roughly half of each
small skill is shared content.

**Procedure overlap.** `plan` §6 and `implement` §4 state the same landing procedure, because a
companion increment lands exactly as a plan draft does. Seven of the fourteen shared claims are
this. Increment 011 had to change both files identically, and the orchestrator had to write an
explicit split ruling to stop two implementers writing divergent text.

A third overlap is visible but out of the stated scope: **the skills restate the reference.**
`d-29fjsjn2` is stated by `docs/process-reference.md` *and* all four skills — five statements
of one rule. Whether `r-15psk4yp` reaches that far is a question for the owner, below.

## Candidate structures

### A — status quo: four self-contained skills

Each skill restates what it needs. Satisfies `r-w2m32yl6` — an agent reads one file and
everything in it applies. Fails `r-15psk4yp`: a shared rule lives in two to four places.

### B — one implementer skill with kind sections

`implement-package/SKILL.md` carrying both wave tables. Satisfies `r-15psk4yp`, **fails
`r-w2m32yl6`** — a code implementer reads the document waves. This is the shape the owner
ruled out at the outset.

### C — one implementer skill, per-kind wave files inside it

```
.claude/skills/implement-package/
  SKILL.md          the shared implementer rules — phases, survey, the detail test,
                    transient lists, narrow scoping, findings and escalation
  waves/code.md     Define, Stub, Code, Document
  waves/document.md Claims, Compose, Check
```

`SKILL.md` ends by telling the agent to read `waves/<kind>.md` for the kind it was dispatched
for. The shared rules are written once; the agent's context carries its own kind's waves and
not the other's.

Satisfies both requirements **if** bundled files load on demand rather than up front — that is
`q-6fsj8zo0`, and it is the deciding fact. Adding a kind becomes a file in `waves/` plus a
wave-shape decision, which is what `d-qb67fb8s` already contemplates: "the shape for a specific
kind is defined as needed, each its own decision" — a rule about decisions, not about files.

Costs: supersedes `d-x2xw2tp2` and `d-ydcyoa80`, which name the two skill paths. Both are
`delegated`, so neither is pinned. `product.yaml` loses a package and gains none.

### D — a shared implementer skill the per-kind skills cite

`implement-code` and `implement-document` stay, and each cites a third `implementer-core`
skill. Same reuse as C, one more package, and it depends on the harder half of `q-6fsj8zo0`
(one skill citing another, not a file citing its sibling). C dominates it unless there is a
reason the kinds must stay separately named packages.

### E — the orchestrator composes the instruction at dispatch

Shared rules and kind rules kept as fragments the dispatcher concatenates into the prompt.
Maximum reuse, zero irrelevant content — and the shipped artifact stops being a document
anyone can read. The skill is a deliverable of this product, not a template the tooling
assembles. Rejected on that ground, recorded so the option is visible.

### F — the shared rules move to the reference, and skills point at it

`docs/process-reference.md` already carries the normative statement for most of the shared
claims; the skills restate them operationally. Move the shared implementer rules there and have
each skill cite the section.

This is the most honest about where norms live, and it addresses the third overlap as well as
the first. It depends on the same hard half of `q-6fsj8zo0`, and it changes what a skill is
for — an agent would have to read a document to act. Worth putting to the owner, but it is a
larger change than the scope captured here.

## Where this points

**For the role overlap, C** — subject to `q-6fsj8zo0` confirming that bundled files load on
demand. It is the only candidate that satisfies both requirements without depending on the
harder skill-cites-skill mechanism, and it keeps each skill a document a person can read.

**For the procedure overlap, nothing cheap yet.** `plan` and `implement` are different packages
and no bundled-file trick spans them. The options are: accept the duplication, have `implement`
cite `plan` (the hard half of `q-6fsj8zo0`), or move the landing procedure into the reference
and cite it from both (F). Deferring this half and landing the role overlap alone is a
legitimate scope cut, and the requirement as written would then be met for implementers but not
for the plan/implement pair — which the owner should see before it is decided.

## Questions the owner should settle

1. **How far does `r-15psk4yp` reach?** As drafted it forbids restating a shared rule
   anywhere — which would reach the skills-restate-the-reference overlap too, a much larger
   change. If it is meant to govern only the skills among themselves, it should say so.
2. **Is the plan/implement landing duplication in scope for this increment**, or a later one?
