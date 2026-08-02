# Authoring

Draft of the third reference document. The process reference states how the process works and what
the validator enforces; this document states what makes authored content *good* — tests a reviewer
applies where the machine stops. None of it is a validator rule. Each test binds the writer of what
it governs: the author self-checks against the closing checklist, and the post-Clarify review gate's
agents load the same checklist as their rubric. Finding nothing to raise is a successful review.

---

## Statements

A requirement's statement is one proposition of owner fiat, in product terms — what must be true,
naming no mechanism and no observation procedure. The test of one is a reversal: would the owner
overturn a decision to hold it? A statement failing that test is design work, and belongs in the
increment as a decision that can be argued with. A statement needing carve-outs, exceptions, or an
absolute a later sentence qualifies is a decision wearing the wrong hat — the excess moves.

`rationale` appears only where casually reversing the requirement would be a mistake the statement
alone does not warn of; a rationale arguing that the requirement is correct fails whatever else it
says.

## Verification

Present only where the statement is not self-verifying — where it carries a term an observer cannot
decide directly. The tests:

- **Grounded.** Every `verify` asserts about something a preceding `do` surfaced. A `verify` with no
  grounding `do`, or one whose content words are all the statement's — "verify the library ships
  ESM only" — is a restatement, the one forbidden shape.
- **Performable.** Each `do` is an action someone could take today against the product's published
  surfaces, exercising the requirement's intent rather than its form. Whatever a step names, the
  owner now expects — naming is binding — so internals appear only where binding them is the point.
- **Tested now.** A step performable at authoring time is performed at authoring time; what it
  surfaces lands as facts cited in `because:`, not as speculation the procedure carries.
- **Judgement is named.** Where only judgement can verify, the final pair names the judge and the
  moment. "Not mechanically checkable" alone is a hand-wave, not a procedure.

## Decisions

- **The bar.** A decision is recorded when a consumer could observe its outcome or a
  reimplementation must preserve it. Below that bar, the choice lives in the code — recording it
  anyway floods the one window the owner reads in full.
- **The statement names the choice** — not the reasoning, not the entailments. Argument belongs in
  the synthesis draft; consequences belong to the reader.
- **`because:` carries only what the decision rests on** — the requirements it follows from, the
  facts that drove it, the decisions it builds on. A citation on motivation or illustration is a
  false signal; an absent citation on a real dependency hides one. Both directions are tested.
- **Pinning is proposed with the decision.** Propose it pinned when it fixes a public surface or a
  data format, when another product depends on it, or when a consumer would notice the change; when
  in doubt, propose it pinned — an over-pin costs one ratification, an under-pin is overturned
  silently. `notes` almost never appears on a named reason: only where why the reason applies is
  unclear.
- **`revisit_when` is rare and deliberate** — a condition the owner sets on purpose, not a
  falsification regime. Most decisions carry none; the reasoning that considered alternatives
  discharges into facts and the frozen draft.

## Model entries

An entity's name is the design's word for the thing — the word prose actually uses — and the
description anchors what the entity does in this design, not what the schema already says. Bind
what the design speaks about; a bound entity nothing references is ballast.

## Facts and evidence

The old rules carry forward unchanged, because the fact pool did:

- A `documented` fact cites the upstream original, never a repository transcription; the quote is
  verbatim and states the claim the fact makes — genuine-but-beside-the-point fails as surely as a
  paraphrase.
- A `tested` fact's run can be run again: command, output, and the state it ran against, with the
  dependence recorded where a different version or fixture would change the result.
- Search before recording — a duplicate is not a copy but a rival, two settled-looking ids for one
  claim. File by subject, not by the increment that needed it.
- A fact found wrong is corrected by a superseding evidenced fact, not cited as-is or merely
  flagged.

## Drafts and extraction

The synthesis draft is an instrument: a claim in it that cites no foundation is a shadow decision,
and extraction into requirements, decisions, facts, and open questions is Clarify's discipline. The
draft freezes with the increment as the record of the argument — never as a second authority. A
mostly complete document drafted for a document deliverable is content, not spec: the fold still
binds, and implementation still checks the draft's claims against it.

---

## The checklist

| # | judges | the test |
|---|---|---|
| 1 | statement | Would the owner overturn a decision to hold it — and is it one proposition, free of mechanism, carve-outs, and observation procedure? |
| 2 | rationale | Present only where casual reversal is a mistake the statement does not warn of, and nowhere arguing the requirement is correct? |
| 3 | verification — presence | Absent where the statement is self-verifying; present where an undecidable term needs binding? |
| 4 | verification — grounding | Does every `verify` assert about what a preceding `do` surfaced, with no verify-that restatement? |
| 5 | verification — surface | Is every `do` performable against published surfaces, exercising intent, naming internals only to bind them? |
| 6 | verification — tested now | Was every step performable at authoring time performed, its findings landed as facts? |
| 7 | decision — the bar | Could a consumer observe the outcome, or must a reimplementation preserve it? |
| 8 | decision — statement | Does it name the choice alone, argument left to the draft? |
| 9 | decision — because | Does every citation carry a real dependency, and every real dependency a citation? |
| 10 | decision — pinning | Proposed pinned where a surface, format, dependant, or consumer is fixed — and `notes` only where the reason is unclear? |
| 11 | decision — revisit_when | Rare, deliberate, owner-facing — or absent? |
| 12 | model | Entities named in the design's words, described for this design, each referenced by prose? |
| 13 | facts | Upstream originals, verbatim claim-carrying quotes, re-runnable runs, no duplicates, wrong ones corrected? |
| 14 | draft | Every claim extracted or citing a foundation — no shadow decisions frozen in? |
