# Regenerate a design

You are writing a design document from scratch for one design in this repository. The point
of the exercise is to test whether that design's **inputs** are sufficient to reconstruct it.
Everything you produce must be traceable to something you were given.

**Target design:** `design/how-to-plan/doc-structure/`

---

## Ground rules

1. **Do not read the target's existing `design.md`.** It may be present in the working tree
   or in git history. Reading it defeats the exercise — you would be paraphrasing rather than
   deriving. If you see its contents by accident, say so in your report.
2. **Do not read `bin/check-design.mjs`.** It encodes decisions the current design made about
   its own format, and reverse-engineering them from the validator is the same leak by
   another route.
3. **Do not read anything under another design's directory** — `authoring/`, `process/`, or
   `harness/`. Their documents are written in the format you are being asked to derive, so
   reading one teaches it by example. Your target's brief already says what belongs to them;
   that is all you need about the boundaries.
4. **Do not invent facts or requirements.** They are inputs and they are the owner's to
   write. If the design needs one that does not exist, that is a finding — record it, do not
   quietly add it.
5. **Do invent decisions.** Decisions are what a design *is*: yours to propose, scoped to
   this design, and a different competent agent could reasonably propose different ones. Any
   choice the requirements do not already settle is yours to make.
6. **Do not ask questions.** Work from the inputs. Where they are silent, decide, and record
   the silence in your report.

---

## What to read, in this order

**1. The target's own inputs — `design/how-to-plan/doc-structure/inputs/`**

| file | what it is |
|---|---|
| `brief.md` | what this design is for, what is in and out of scope, what done looks like, known tensions |
| `requirements.yaml` | owner fiat scoped to this design. Not negotiable, not yours to change |
| `facts.yaml` | things established to be true, with evidence |

**2. Wider scopes, nearest first**

- `design/how-to-plan/requirements.yaml` and `facts.yaml` — bind every design in the area
- `design/requirements.yaml` and `facts.yaml` — bind everything (currently empty)

A reference resolves design → area → global. You may rely on anything visible at those three
tiers and **nothing else** — in particular, never rely on another design's facts,
requirements, or decisions.

**3. Background**

- `docs/vision.md` — the problem all of this answers.

---

## What to produce

The design's outputs: `design.md` (prose and citations) and, beside it, `decisions.yaml`
(the decisions the argument cites). Facts and requirements are inputs — never write them.
Components and open questions live in `design.md`; decisions live only in `decisions.yaml`.
When testing a regeneration against an existing design, write to `design.candidate.md` and a
`decisions.candidate.yaml` rather than overwriting the originals.

**How that document is organised is your decision, not mine.** Its structure, how the
decisions and unknowns are recorded, how a claim points at what it rests on — all of that is
part of what you are being asked to derive. The requirements say what the format must be able
to express; turning that into an actual document shape is design work, and doing it
differently from the current version is a legitimate outcome rather than a failure.

Do not attempt to satisfy any validator. The one in this repository is built for the existing
format and would only push you back toward it.

---

## How to write

The area requirements govern the contents of any design here, including this one — read them
as constraints on your prose, not just as subject matter to describe. Beyond that: do not
restate what you read. A design that reads as a summary of its own inputs has added nothing.
Write the argument.

---

## What to hand back

The file, plus a report containing:

1. **The shape you chose** for the document, and which requirement or brief line drove each
   part of it. Where you had a genuine choice, say what the alternatives were and why you
   picked as you did.
2. **Gaps** — everything you had to decide that the inputs did not determine. For each, what
   you chose and what input would have settled it. This is the most valuable part of the
   exercise: it is the list of things the owner knows but has not written down.
3. **Requirements you could not satisfy**, and why.
4. **Inputs that went unused** — a requirement or fact you were given and found no use for.
   Either it is not needed, or you missed something it implies.
5. **Ambiguities** — where an input admitted two readings, both readings and which you took.

Do not soften any of these. An empty report would mean the inputs were complete, which would
be a surprising result on a first run.
