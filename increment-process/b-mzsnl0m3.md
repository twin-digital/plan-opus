---
tags:
  - tooling
  - design-validator
---

# An in-force entry may cite a closed decision, and nothing says so

`citation-resolves` checks only that a cited id is **declared** by some increment
(`known.has(citation)` in `validate.ts`), never that it is still in force. So an accepted entry
whose `because` names a decision that has since been superseded passes the gate silently.

Facts already have the rule this is missing. `citation-fact-retired` sits right beside it: an
in-force entry citing a retired fact is an error in a draft ("cite its replacement instead") and a
non-gating report for an entry published before the retirement ("a superseding entry re-bases or
revises it at the next landing"). Nothing equivalent exists for a superseded decision or
requirement. The asymmetry reads as accidental — the fact half got written because CLAUDE.md states
that bar plainly, and the claim half never did.

## What to build

Mirror the fact rule, claim-side:

- **In a draft**: an in-force entry citing an entry closed at that fold is an **error**, naming the
  replacement — the `supersedes` chain already gives the successor's id, so the message can say
  which one to cite.
- **Published before the citation was closed**: a **report**, not a gate, the way the fact rule
  treats the same case.

## The worked example

grinbox 012 accepted `d-egkpzkc5` (the heartbeat's deployment variable) with
`because: [d-gzv0jty7, d-mq7vdduz]`, and in the same increment `d-bpj1jclb` superseded
`d-gzv0jty7`. The fold at 012 therefore holds an in-force decision resting on a closed one, and the
check passed clean through a full `land`. This is the draft case, so the rule above would have
caught it at authoring time and named `d-bpj1jclb`.

## While you are in there

`d-eaw3u72o` — the decision defining `because` — states that "superseding or retiring an entry
surfaces its dependents". `grep dependent` over design-process's `src/` returns nothing: no finding,
no `show` section, no `diff` output. That half of the decision is unimplemented, and the dependent
list is exactly what makes the error message above useful — and what you want before deciding
whether a supersession is safe to make.
