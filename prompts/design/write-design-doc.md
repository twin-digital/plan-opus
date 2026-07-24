# Write a spec

You are writing the spec for one design in this repository, from its inputs. The output is two
files — `spec.md` and, beside it, `decisions.yaml` — in the format the `doc-structure` design
specifies. Your job is to derive the *design* — what to build, and the decisions behind it —
from settled inputs. The *format* is already fixed; conform to it.

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
When the spec is done, commit the two files there, push the branch, and open a pull request
against `main`.

---

## Read, in this order

**1. The format — `design/how-to-plan/doc-structure/spec.md`.** This is the settled
specification of what a spec is: its required sections and their order, the schema of every
entry kind, how a citation token is written and resolved, and what lives in `spec.md` versus the
sibling `decisions.yaml`. Conform to it exactly. Its `## Invariants` section is the checklist
your output has to pass.

**2. The target's inputs — the files directly in `design/<area>/<design>/`.**

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

**4. The authoring rules — `design/how-to-plan/authoring/spec.md`** (and its `requirements.yaml`).
These govern the *contents* of any design here, this one included: that the `spec.md` is a build
document stating what to build and how with a minimum of why, that it opens by orienting and does
not re-narrate the extracted lists, what must be cited, that falsifiers are real and evidence is
quoted, and that an unknown answerable now is answered rather than deferred. Read them as the
constraints on your prose — this prompt does not restate them. (When the design you are writing
*is* authoring, its spec is being rebuilt, so its `requirements.yaml` and `brief.md` are the
source.)

**5. Background — `docs/vision.md`.** The problem the whole repository answers.

---

## Then delete the old outputs — do not read them

The two output files are disposable and you are regenerating them from scratch. Delete them
first, if they exist:

```
rm -f design/<area>/<design>/spec.md design/<area>/<design>/decisions.yaml
```

**Do not open, read, or consider the content of a pre-existing `spec.md` or `decisions.yaml` at
all.** Reading the old outputs makes you paraphrase their choices instead of deriving the design
afresh from the inputs — and if the old spec was incoherent, that is exactly the mistake you are
here to undo. The inputs are the source of truth; the outputs are yours to rebuild.

---

## Rules

- **Do not invent facts or requirements.** They are the owner's inputs. If the design needs
  one that does not exist, that is a finding — record it as an open question, or in your
  handoff — do not quietly add it.
- **Do decide.** Decisions are what a design *is*: yours to propose, scoped to this design,
  and a different competent agent could reasonably decide differently. Every choice that
  carries weight and the requirements do not already settle is a decision you make and record
  in `decisions.yaml`, cited from the prose. Each is `proposed` — acceptance is the owner's
  act, performed in review.
- **Do not ask; record.** Work from the inputs. A genuine unknown the inputs cannot settle
  becomes an open question in the spec — naming the kind of foundation that would close it —
  not a question to a human.

---

## Write

Conform to `doc-structure` for the **format** and `authoring` for the **content** — you read
both above; they own these rules and this prompt does not restate them. One operational gate to
keep in view: every live design-scoped requirement and every accepted decision must be cited
somewhere in the spec, or the design cannot settle. Capture is otherwise free — a fact or a
requirement you record but do not yet cite is fine, at any scope.

---

## Validate

Run `npm run check` and fix everything it reports. The checker enforces the format's invariants —
an unresolved citation, a malformed or mis-scoped entry, and, for a design otherwise ready to
settle, a design-scoped requirement or accepted decision that no claim cites. Passing means the
spec is *well-formed*, not that it is *well-built*; green is the floor, not the goal.

---

## Hand back

Commit the two files, push the branch, and open a pull request against `main`. The spec and its
`decisions.yaml` are in the diff, so the PR body does not re-list the decisions or the open
questions — the reviewer reads those in the files. The PR body orients the reviewer and points at
what to weigh:

- **What this spec designs** — a couple of sentences: the thing being specified and the shape you
  landed on, so the reviewer knows what they are about to read.
- **Where it is most contestable** — the decisions a different competent agent might have made
  differently, and for each, the input that would settle it. This is where review time should go:
  each is a candidate to accept as written or to lift into a requirement.
- **What you could not resolve** — any requirement you could not satisfy and why; any input that
  went unused (either unneeded, or a sign you missed something); any unknown you had to leave as
  an open question rather than settle.

Keep it short — the spec carries the design, the PR body carries your judgement about it. The
design lands as a **draft**: decisions are `proposed` and any open question is still open, so
nothing is built on it until review clears the list.
