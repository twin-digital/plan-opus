# Capture a design's inputs

You produce the **inputs** a design is built from — `brief.md`, `requirements.yaml`, and
and the facts they rest on — for a design that does not have them yet. This is the "capture first" step: the
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
3. **`CLAUDE.md`** — who owns each kind and who settles a dispute between them; that an agent may
   *propose* facts only when each meets the evidence bar, with proposed facts called out for owner
   review in the pull request; and the trap this step exists to avoid — a *requirement* that is
   really a bet about reality wearing a requirement's clothes, which is an open question until
   something checks it.
4. **Existing foundations.** Run `node bin/foundations.mjs --facts` for every fact in the
   repository — any design may cite any of them, so an existing entry is one to cite, not to
   restate under a new id. File a new fact at the narrowest scope that describes its *subject*,
   not the design that happens to need it; a second consumer never moves it. For requirements,
   read `design/<area>/`, `design/`, and the `sets.yaml` beside them: notice when the one you are
   about to write already exists at a wider scope, or belongs at one. A requirement written above
   design scope states which designs it binds: give it an `applies_to` unless it truly binds every
   design in its tier, and name a `set:` where the group is a product rather than a directory.
   Every design it binds must honour it, so binding widely is not the safe default — and it can
   only ever narrow, so a rule reaching designs in more than one area is a **global** requirement,
   not an area one. Sets follow the same line: an area's `design/<area>/sets.yaml` holds that
   area's designs, `design/sets.yaml` holds the ones that span areas.
5. **Background — `docs/vision.md`.** The problem the whole repository answers.

---

## Who owns each kind — the guardrails that shape everything below

- **Requirements are owner fiat.** You have no authority to *make* a requirement — only to elicit
  one from the owner (interview) or to *draft* one for the owner to ratify (convert). A drafted
  requirement is a proposal until the owner accepts it, and every one you write must be called out
  for that in the hand-off. Apply the reality test to each: a requirement is something the owner
  gets to decree — "the server keeps running after Ctrl+C". A claim about what is *possible* —
  "one box serves a million users" — is not a requirement, it is a bet about reality, and it
  becomes a **fact to establish** or an open question, never a requirement.
- **A lean the owner won't decree is `force: soft`.** When they state a preference and hand the
  call to the design — "leaning hard toward one bundle, but that's the design's to weigh" —
  neither dropping it nor writing it hard is right. A soft requirement is the shape that fits: the
  design may depart from it, but only by recording a decision that cites it, so the departure is
  argued rather than silent. Hard stays the default and stays unwritten.
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
  yet — so at capture, an unresolved matter goes in the brief's *What the design must still
  decide* section (below), and in interview mode, anything the owner can settle in a sentence you resolve now
  by asking, rather than parking it.

---

## What the brief holds

Nothing checks the brief, so it is held to a convention instead — the one every existing brief
follows, plus the section this step adds. Match it; a reader who knows one brief should recognise
the next. Six H2 sections, in this order:

- **What this design is for** — a short paragraph: the subject, and what the design produces.
- **In scope** — the questions this design answers.
- **Out of scope** — the questions it does not, each naming the design or document that owns it
  instead. A boundary is stated from the far side or it is not stated.
- **Done looks like** — the outcome that would tell the owner the design worked, written as
  something observable rather than a quality.
- **What the design must still decide** — every choice you deliberately left open, and for each,
  what the design will have to weigh to close it. This is where an unsettled matter goes at
  capture, since open questions live in a `spec.md` that does not exist yet.
- **Known tensions** — the pulls the design will have to resolve, including the ones you expect it
  to lose something to.

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

### When the inputs already exist somewhere else

A design is often carved out of one that grew too broad, and then its seed is a requirement the
owner already ratified, sitting in a sibling's `requirements.yaml`. That is neither an interview
nor a conversion: the entry is already the owner's, already at the bar, and the work is to
**relocate it unchanged**. Move it, keep its id — a move is not a change of meaning, and a fresh id
would strand every reference — and do not rewrite the statement or the rationale to suit the new
home. If it reads wrong where it now sits, that is a question for the hand-off, not an edit.

Three checks before you move one, and one after:

- **Which designs it constrains** — not which cite it. Requirements are fenced where facts are
  not, so a design-scoped requirement that moves stops resolving for the design it left. The
  tempting test is to grep for the id, and it is the wrong one: the sibling you are splitting from
  is usually `legacy` or `draft` and cites nothing yet, so the grep passes and tells you nothing.
  Read the statement instead and ask who would have to change their spec if it were reversed. One
  that names the sibling as the actor — "*the harness* publishes the bundle" — constrains both,
  whatever the citation count says.
- **The tier, then the binding — they are different questions.** The tier is what a design may
  *cite*: its own, its area's, and global. `applies_to` is what a requirement *binds*, it sits only
  above design scope, and it can only ever narrow — an area requirement that omits it binds every
  design in the area. So a requirement two designs must both honour goes to the area tier, and
  carries an `applies_to` naming exactly those two only because the rest of the area is not bound
  by it. Do not reach for `applies_to` to grant a sibling access; the tier already did that.
- **One requirement, or a group.** Name the design scopes directly. A set is worth declaring when
  the split leaves *several* requirements binding the same designs — then the roster lives once in
  `design/<area>/sets.yaml` (or `design/sets.yaml` where it spans areas) instead of being repeated
  in every `applies_to`, and adding a design to the group is a one-line edit. One shared
  requirement does not pay for a set.
- **`npm run check` after the move**, which catches a citation the reading missed.

The narrowest scope that covers every design the requirement constrains is the right one, and it
is design scope far more often than a carve-out makes it feel. Elevate on a second design that
genuinely depends on the entry, not on the suspicion that one might.

Call every relocation out in the hand-off as its own list — moved-verbatim entries are not
drafted requirements, and the owner reads them differently.

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
  spot-check against the live source before it is ratified. **None is a normal answer**, and one
  worth stating plainly rather than padding: a new subject whose evidence is exactly what the
  design phase will go and gather yields no facts at capture, and recording them now would be
  choosing the design's answer ahead of its evidence. Say that, and say where the evidence has to
  come from.
- **Call out every drafted requirement for the owner's fiat** — a list to accept, amend, or reject.
  An elicited requirement the owner already stated in interview is theirs; a requirement you drafted
  in convert mode is a proposal and says so. Keep a relocated requirement off this list and in its
  own, saying where it came from and that its text is unchanged — the owner has already ratified
  it, and what they are checking is the move.
- **Name what is left open for the design** — the choices you deliberately did not make.

Keep it short and honest: a fact you could not evidence is an open question, not a quiet assumption,
and a requirement you were unsure was the owner's is a question, not a decree.

---

## Capture discipline

- **Capture only load-bearing foundations.** A fact nothing will rest on and a requirement that
  decrees nothing are noise; the shortest input set that lets a design begin is the goal.
- **Never invent a requirement.** Elicit it, draft it and flag it, or relocate one the owner
  already ratified without touching its text. The owner decrees; you do not.
- **Evidence, or it is a question.** No verbatim quote, no committed repro, no stated mechanism —
  then it is an open question, not a fact.
- **Leave the design open.** Every choice the requirements and facts do not force is the design's
  to make. Naming it as open is capture; making it is not.
- **Converge.** Ask what you must to close a load-bearing unknown, and stop. The step has to cost
  less than skipping it.
