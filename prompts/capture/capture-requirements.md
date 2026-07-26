# Capture a design's inputs

You produce the **inputs** a design is built from — `brief.md`, `requirements.yaml`, and
`facts.yaml` — for a design that does not have them yet. This is the "capture first" step: the
foundations get written down before anyone designs, so the spec that follows stands on settled
ground. Everything downstream (`write-design-doc.md`, `generate-spec.md`, `build-from-spec.md`)
assumes these files exist; you are the step that creates them.

You do **not** write a `spec.md` or `decisions.yaml`, and you do not design. The design stays open:
your job is to record what is *known* (facts), what the owner *decrees* (requirements), and what
the problem *is* (the brief) — and to leave every genuine design choice for the design phase.

**Target.** A new design named `<area>/<design>` — its directory is `design/<area>/<design>/`.
You will be told the name, or you will propose one and confirm it.

---

## Set up an isolated workspace first

Give yourself a worktree and branch off `origin/main`, exactly as `prompts/design/write-design-doc.md`
does, so nothing touches the main checkout. Do all reading, writing, and `npm run check` there.

---

## Read, in this order

1. **The format — `design/how-to-plan/doc-structure/spec.md`.** The schema of a fact and a
   requirement, the three tiers a foundation can sit at, and the rule that every id is kebab-case
   and **unique per kind across the whole repository**. You write to this schema; the checker
   enforces it even with no spec present.
2. **The content rules — `design/how-to-plan/authoring/spec.md`.** Its evidence rules bind whoever
   *captures* a fact — that is you. A fact's outside evidence is quoted verbatim at its source, an
   assumed fact carries the mechanism it rests on, and a claim you cannot evidence is not a fact.
3. **The process — `design/how-to-plan/process/spec.md`.** The knowledge model (who owns each
   kind), the autonomy rule, and the trap this step exists to avoid: a *requirement* that is really
   a bet about reality wearing a requirement's clothes.
4. **`CLAUDE.md`** — the repository's rule that an agent may *propose* facts only when each meets
   the evidence bar, and that proposed facts get owner review called out in the PR.
5. **Existing scoped foundations** — `design/<area>/`, `design/`, `design/sets.yaml`, and every
   current design's `facts.yaml` / `requirements.yaml`. Read these to avoid a duplicate id
   (uniqueness is repo-wide) and to notice when a fact or requirement you are about to write
   already exists at a wider scope, or belongs at one. A requirement written above design scope
   states which designs it binds: give it an `applies_to` unless it truly binds every design in
   its tier, and name a `set:` from `design/sets.yaml` where the group is a product rather than a
   directory. Every design it binds must honour it, so binding widely is not the safe default.
6. **Background — `docs/vision.md`.** The problem the whole repository answers.

---

## Who owns each kind — the guardrails that shape everything below

- **Requirements are owner fiat.** You have no authority to *make* a requirement — only to elicit
  one from the owner (interview) or to *draft* one for the owner to ratify (convert). A drafted
  requirement is a proposal until the owner accepts it, and every one you write must be called out
  for that in the hand-off. Apply the reality test to each: a requirement is something the owner
  gets to decree — "the server keeps running after Ctrl+C". A claim about what is *possible* —
  "one box serves a million users" — is not a requirement, it is a bet about reality, and it
  becomes a **fact to establish** or an open question, never a requirement.
- **Keep a requirement bare.** A `statement`, and a `rationale` only when the statement's intent is
  genuinely non-obvious — then **one line**. Omit it by default: the schema allows it and the
  checker won't ask for it, and a bloated rationale is the most common way these inputs rot. When
  tempted to write one, run the three-way test: if it *restates* the statement, delete it; if it is
  *load-bearing*, fold it into the statement; if it is an *argument* — a because, a trade-off, a
  what-happens-if-wrong — then what you are writing is a decision, not a requirement, and it does
  not belong in the inputs at all — leave it for the design.
- **Facts are held on evidence**, ranked `tested` > `documented` > `assumed`. A tested fact commits
  its evidence: put the scripts, inputs, and recorded outputs under the design's `artifacts/`
  subfolder and name them in the source. A documented fact carries a `url` with `where` and a
  **verbatim** quote. An assumed fact carries the mechanism it rests on. A claim that meets none of
  these bars is **not a fact** — it is an open question.
- **You produce no decisions and no spec.** Where the prototype or the conversation implies a
  *choice* — a transport, a structure, an algorithm — that choice is the design's to make. Do not
  bake it into a requirement or a fact. Name it in the brief as deliberately left open.
- **The unsettled has an honest home.** Open questions live in a `spec.md`, which does not exist
  yet — so at capture, an unresolved matter goes in the brief's prose as "what the design must
  still decide", and in interview mode, anything the owner can settle in a sentence you resolve now
  by asking, rather than parking it.

---

## Pick a mode

**Interview** — you start from a stated intent and little else. You converge on the brief and the
requirements by asking the owner. **Convert** — you start from an existing prototype, session
transcript, code, or review history, and you distill the inputs from it. **Hybrid** — you convert
first, then interview the gaps; **this is the default whenever a prototype or transcript exists**,
because a distilled draft plus a few targeted questions beats both a blank interview and an
unreviewed conversion.

### Mode: Interview

Elicit; do not invent. Ask in small batches and converge — a capture that sprawls into a hundred
requirements fails `must-beat-doing-it-myself` as surely as one that captures nothing. Draw out, in
roughly this order:

- **The problem and the intended outcome** — enough to write the brief: what the thing is for, what
  "working" feels like, what is in and out of scope.
- **The requirements** — the outcomes the owner will decree. For each, confirm it is theirs to
  decree (the reality test above) and record their words, not your gloss. Tag force only when it is
  soft (a preference that may bend); hard is the default and stays unwritten.
- **The facts the owner asserts** — and their real backing. When the owner states something as true
  that is actually a bet about reality, record it as a fact to establish (assumed, with the
  mechanism) or an open question, not as settled — and say so.

Stop when you can write a brief and a requirements list the owner recognizes as *theirs*, with no
load-bearing unknown you could have closed by asking still open.

### Mode: Convert

Distill, separating three things the source blends together: what the work *learned about reality*
(facts), what it *should achieve* (requirements), and *how it happened to be built* (decisions —
which you drop, because they are the design's to remake). From the source produce:

- **Facts** — the hard reality the work established, each meeting the evidence bar. Recreate a
  minimal, runnable repro for each tested fact and commit it under `artifacts/` with its observed
  output; capture a verbatim quote for each documented one. A finding you cannot evidence this way
  is an open question in the brief, not a fact.
- **Requirements** — the outcomes the work implies, **drafted for ratification** and every one
  flagged in the hand-off. Resist promoting an implementation choice to a requirement: "deploys via
  compose watch" is a decision the redesign may overturn; "a saved edit is live within seconds" is
  the outcome that survives it.
- **The brief** — the problem, the intended loop, and what the conversion deliberately leaves open
  for the design (the choices the source made that a fresh design should re-weigh on the evidence).

### Mode: Hybrid

Run Convert to a draft, then Interview against it — but the questions are now sharp: walk the owner
through each drafted requirement to accept, amend, or reject; surface every tension and gap the
distillation exposed; and put each still-ambiguous matter to them. Finalize the inputs after that
pass.

---

## Validate

Run `npm run check`. With no `spec.md`, the design reads as `exploring`; the checker still enforces
every fact and requirement schema rule — kebab-case and repo-wide-unique ids, a valid `backing`
and at least one well-formed source per fact, no `sources` on a requirement, block-scalar quotes
and rationales, and no field written at its default. Fix everything it reports. Green means the
inputs are *well-formed*; whether they are *right* is what the owner review is for.

---

## Hand off

Commit the inputs (and any `artifacts/`), push the branch, and open a pull request against `main`.
The design lands as **`exploring`**: no spec is written and nothing is built until the owner
ratifies the inputs. Because requirements and proposed facts are the owner's to settle, the PR body
does the routing work — it must:

- **State the problem and intent** in a couple of sentences.
- **Call out every proposed fact** — its backing, and for a tested fact where its `artifacts/`
  evidence sits; flag any documented quote captured indirectly (e.g. via a fetch tool) as worth a
  spot-check against the live source before it is ratified.
- **Call out every drafted requirement for the owner's fiat** — a list to accept, amend, or reject.
  An elicited requirement the owner already stated in interview is theirs; a requirement you drafted
  in convert mode is a proposal and says so.
- **Name what is left open for the design** — the choices you deliberately did not make.

Keep it short and honest: a fact you could not evidence is an open question, not a quiet assumption,
and a requirement you were unsure was the owner's is a question, not a decree.

---

## Capture discipline

- **Capture only load-bearing foundations.** A fact nothing will rest on and a requirement that
  decrees nothing are noise; the shortest input set that lets a design begin is the goal.
- **Never invent a requirement.** Elicit it, or draft it and flag it. The owner decrees; you do not.
- **Evidence, or it is a question.** No verbatim quote, no committed repro, no stated mechanism —
  then it is an open question, not a fact.
- **Leave the design open.** Every choice the requirements and facts do not force is the design's
  to make. Naming it as open is capture; making it is not.
- **Converge.** Ask what you must to close a load-bearing unknown, and stop. The step has to cost
  less than skipping it.
