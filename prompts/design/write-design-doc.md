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

**3. Wider scopes, nearest first.**

- `design/<area>/requirements.yaml`
- `design/requirements.yaml`
- `design/sets.yaml` and `design/<area>/sets.yaml` — named sets of designs a requirement can bind

**4. Every fact in the repository — `node bin/foundations.mjs --facts`.** A fact is citable from
any design, whichever scope files it, so this index is your search surface: read it before you
record a new fact, and cite the existing entry rather than writing a second id for the same claim.
Requirements are fenced — you may cite only your own, your area's, and the global ones — and a
decision is citable only by the design that made it.

**Which of them bind you is a separate question from which you may cite.** A wider-scope
requirement binds the designs its `applies_to` names, or its whole tier when it names none — never
further, so nothing outside those three files can bind you — and every requirement that binds you
must be honoured — a hard one without exception, a soft one
unless a decision of yours records the departure. Run `node bin/foundations.mjs <area>/<design>`
for exactly that list; it resolves the sets for you.

**5. The authoring rules — `design/how-to-plan/authoring/spec.md`** (and its `requirements.yaml`).
These govern the *contents* of any design here, this one included: that the `spec.md` is a build
document stating what to build and how with a minimum of why, that it opens by orienting, that it
states every value the build turns on rather than leaving it to a citation to fetch, what must be
cited, that falsifiers are real and evidence is quoted, and that an unknown answerable now is
answered rather than deferred. Read them as the
constraints on your prose — this prompt does not restate them. (When the design you are writing
*is* authoring, its spec is being rebuilt, so its `requirements.yaml` and `brief.md` are the
source.)

**6. Background — `docs/vision.md`.** The problem the whole repository answers.

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

- **Do not invent requirements.** They are the owner's fiat. If the design needs one that
  does not exist, that is a finding — record it as an open question, or in your handoff — do
  not quietly add it.
- **Facts you may propose, at the bar `CLAUDE.md` sets.** A fact is an objective claim with
  evidence, so an agent that has the evidence may add one: documented upstream with a `url`,
  a `where`, and a verbatim quote that states the claim, or tested by you with the scripts,
  inputs, and captured output in the design's `artifacts/`. Same bar for repairing one — an
  inherited fact you find wrong, or whose evidence does not carry its claim, is corrected
  rather than cited as-is or merely flagged, per `r:facts-proven-wrong-are-corrected`: record
  the properly-evidenced replacement, and retire the fact it contradicts with a `reason` and a
  `superseded_by` naming the replacement. A retired fact may not be cited, so move every
  citation of it to the replacement. A claim you cannot evidence to that bar is an open
  question, not a fact. Every fact
  you add or retire is an input change and gets owner review: call each one out in the PR body.
- **Do decide.** Decisions are what a design *is*: yours to propose, scoped to this design,
  and a different competent agent could reasonably decide differently. Every choice that
  carries weight and the requirements do not already settle is a decision you make and record
  in `decisions.yaml`, cited from the prose. Each is `proposed` — acceptance is the owner's
  act, performed in review. The exception is a default the owner ruled on at the gate below,
  which enters `accepted` because that act already happened.
- **Do not ask; record.** Work from the inputs. A genuine unknown the inputs cannot settle
  becomes an open question in the spec — naming the kind of foundation that would close it —
  not a question to a human.
- **Default simple.** The requirements do not enumerate every edge case and are not meant to.
  Where one is quiet, take the obvious cheap behaviour and state it in a line, rather than
  designing around the gap or raising it as a question. An edge case with documented behaviour
  is resolved. Say it in the words a builder would use, not the words a reviewer would.

  Defaulting is about not spending a round on it, **not** about keeping it out of
  `decisions.yaml`. A default still earns an entry whenever a competent agent could have set it
  differently and a consumer, a builder, or a sibling design could tell the difference. How cheap
  it is to reverse is not the test: the entry is how the owner finds and reviews a choice without
  reading the spec, and a cheap choice they cannot find is one they never got to make. Keep out of
  the list only what nobody could observe or would argue with. The prose still states the value —
  the builder reads with the tokens struck — and the entry carries the choice and its falsifier.

---

## Before you write — declare your defaults

Once you have read the inputs and before you write anything, report the choices you intend to
**default simple**: places the inputs do not settle, where you will pick the obvious behaviour and
document it. One short line each — the case, and what you will do. Then stop and wait.

Most of the list is things nobody will want to discuss, and that is the point: the owner sees them
once, cheaply, instead of meeting them as review findings. Do not pad it. A choice the requirements
already settle is not a default, and neither is a decision you are making on the merits — those go
in `decisions.yaml` as your own `proposed` work.

**An empty list is a normal answer.** Say so and carry on.

You will be told to proceed, or given different behaviour for some entries. Every entry that
survives becomes a decision in `decisions.yaml` with `status: accepted` — the owner has ruled on it
already. Where they replaced your default, the decision states theirs, not yours. Then write.

---

## Write

Conform to `doc-structure` for the **format** and `authoring` for the **content** — you read
both above; they own these rules and this prompt does not restate them. One operational gate to
keep in view: every requirement that **binds** this design — its own, and every wider-scope one
whose `applies_to` reaches it — and every accepted decision must be cited somewhere in the spec, or
the design cannot settle. `node bin/foundations.mjs <area>/<design>` is that list. Capture is
otherwise free: a fact you record but do not cite is fine, as is a requirement that binds someone
else.

---

## Validate

Run `npm run check` and fix everything it reports. The checker enforces the format's invariants —
an unresolved citation, a malformed or mis-scoped entry, and, for a design otherwise ready to
settle, a requirement binding it or an accepted decision that no claim cites. Passing means the
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
