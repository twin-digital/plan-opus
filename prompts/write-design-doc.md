# Write a design document

You are writing the design document for one design in this repository, from its inputs. The
output is two files — `design.md` and, beside it, `decisions.yaml` — in the format the
`doc-structure` design specifies. Your job is to derive the *design* — the decisions and the
argument for them — from settled inputs. The *format* is already fixed; conform to it.

**Target.** You will be told which design to write, as `<area>/<design>` — for example
`how-to-plan/authoring`. Everything below is relative to `design/<area>/<design>/`.

---

## Set up an isolated workspace first

Before reading or writing anything, give yourself a worktree and branch of your own, so your
work never touches the main checkout or anyone else's branch:

```
git fetch origin main
git worktree add -b design/<area>-<design> .claude/worktrees/<area>-<design> origin/main
cd .claude/worktrees/<area>-<design>
```

`.claude/worktrees/` is git-ignored, so the worktree itself never shows up as a change. Do
all of your reading, writing, and `npm run check` from inside that worktree, on that branch.
When the document is done, commit the two files there, push the branch, and open a pull
request against `main`.

---

## Read, in this order

**1. The format — `design/how-to-plan/doc-structure/design.md`.** This is the settled
specification of what a design document is: its required sections and their order, the schema
of every entry kind, how a citation token is written and resolved, and what lives in
`design.md` versus the sibling `decisions.yaml`. Conform to it exactly. Its `## Invariants`
section is the checklist your output has to pass.

**2. The target's inputs — `design/<area>/<design>/inputs/`.**

| file | what it is |
|---|---|
| `brief.md` | what this design is for, what is in and out of scope, what "done" looks like, known tensions |
| `requirements.yaml` | owner fiat scoped to this design — not negotiable, not yours to change |
| `facts.yaml` | things established to be true, with their evidence |

**3. Wider scopes, nearest first.**

- `design/<area>/requirements.yaml` and `facts.yaml` — bind every design in the area
- `design/requirements.yaml` and `facts.yaml` — bind everything

A citation resolves design → area → global. You may cite anything visible at those three
tiers and **nothing from another design** — a design's decisions bind only itself.

**4. The authoring rules — `design/how-to-plan/authoring/`.** Its requirements govern the
*contents* of any design here, this one included: that a decision states a real falsifier and
not filler, that evidence is quoted rather than paraphrased, that the argument reads as a
derivation and opens by orienting the reader. Read them as constraints on your prose.

**5. Background — `docs/vision.md`.** The problem the whole repository answers.

---

## Rules

- **Do not invent facts or requirements.** They are the owner's inputs. If the design needs
  one that does not exist, that is a finding — record it as an open question, or in your
  handoff — do not quietly add it.
- **Do decide.** Decisions are what a design *is*: yours to propose, scoped to this design,
  and a different competent agent could reasonably decide differently. Every load-bearing
  choice the requirements do not already settle is a decision you make and record in
  `decisions.yaml`, cited from the prose. Each is `proposed` — acceptance is the owner's act,
  performed in review.
- **Do not ask; record.** Work from the inputs. A genuine unknown the inputs cannot settle
  becomes an open question in the document — naming the kind of foundation that would close
  it — not a question to a human.
- **If you are rebuilding an incoherent existing document, do not read the old one.** Derive
  from the inputs instead; reading it makes you paraphrase its mistakes rather than think the
  design through afresh. (A design with no document yet has nothing to avoid.)

---

## Write

Conform to the format, and follow the authoring rules. Two of them shape the whole document
and are worth stating up front:

- **The document is an argument, not a summary of its inputs.** Order it so each claim rests
  on ground already laid — lead from the fixed foundations the design is handed to the
  choices those force. A document that restates its requirements has added nothing.
- **Open by orienting.** Name what the design is and the constraint that shapes it before any
  schema or rule, so a reviewer can judge each choice against the pressure that produced it.

Cite only claims that carry weight — a claim is load-bearing when some decision, component,
or other claim would have to change were the cited entry false. Citing everything signals as
much as citing nothing.

---

## Validate

Run `npm run check` and fix everything it reports. The checker enforces the format's
invariants — an unresolved citation, a decision no claim rests on, a malformed or
mis-scoped entry. Passing means the document is *well-formed*, not that it is *well-argued*;
green is the floor, not the goal.

---

## Hand back

The two files, plus a short handoff for the owner's review:

1. **Decisions you made that the inputs did not determine** — for each, what you chose and
   what input would have settled it. These are the choices the owner most needs to look at:
   each is a candidate to accept as written, or to lift into a requirement.
2. **Requirements you could not satisfy**, and why.
3. **Inputs that went unused** — a requirement or fact you found no use for. Either it is not
   needed here, or you missed something it implies.
4. **Open questions you recorded**, and why the inputs cannot yet close them.

The design is a **draft** when you hand it over: every decision is `proposed` and any open
question is unanswered, so nothing may be built on it until review clears the list.
