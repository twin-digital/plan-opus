---
version: "7"
---

# Authoring

The content-quality tests for foundations: what makes a statement, a verification procedure, a
decision, a model entry, or a fact good. The process reference states how the process works and
what the validator enforces; this document states the tests a reviewer applies where the machine
stops, and none of it is a validator rule. Technique and orchestration stay with the agent
skills. Each test binds the writer of what it governs: authors self-check against the closing
checklist, and the post-Clarify review gate's agents load the same checklist as their rubric.

---

## Statements

A requirement's statement is one proposition of owner fiat, in product terms — what must be
true, naming no mechanism and no observation procedure. The test is reversal: would the owner
overturn a decision to hold it? A statement failing that test is design work and enters the
increment as a decision that can be argued with; carve-outs, exceptions, and qualified absolutes
move the same way.

`rationale` appears only where casually reversing the requirement would be a mistake the
statement alone does not warn of. A rationale arguing that the requirement is correct fails
whatever else it says.

## Verification

A requirement's verification is present only where its statement is not self-verifying — where
it carries a term an observer cannot decide directly. The tests:

- **Grounded.** Every `verify` asserts about something a preceding `do` surfaced. A `verify`
  whose content words are all the statement's — "verify the library ships ESM only" — is a
  restatement, the one forbidden shape.
- **Performable.** Every `do` is performable today against the product's published surfaces,
  exercising the requirement's intent rather than its form.
- **Tested now.** A step performable at authoring time is performed at authoring time; what it
  surfaces lands as facts cited in `because:` rather than speculation the procedure carries.
- **Judgement is named.** Where only judgement can verify, the final pair names the judge and
  the moment.

Whatever a verification step names, the owner now expects — a fiat requirement cannot rot,
because the naming is what makes it normative. That gives the reviewer a two-way diagnostic for
a step that reaches past the published surface into internals: either it found a missing piece
of the fiat, which is then stated deliberately, or it overbound an implementation detail, which
is then rewritten against the surface. Where a product's own tooling does not exist yet, its
contracted surfaces do — bound schemas, the repository, the gate — and verification is written
against those.

## Decisions

- **The bar.** A decision is recorded when a consumer could observe its outcome or a
  reimplementation must preserve it; choices below that bar live in the code, and a
  reimplementation is free to re-make them.
- **The statement names the choice.** The argument belongs to the increment's drafts, the
  consequences to the reader.
- **`because:` carries only what the decision rests on** — the requirements it follows from,
  the facts that drove it, the decisions it builds on. The test runs both directions: a
  citation on motivation or illustration is a false signal, and an absent citation on a real
  dependency hides one.
- **Pinning is proposed with the decision**, and the owner rules on both together: pinned when
  it fixes a public surface or a data format, when another product depends on it, or when a
  consumer would notice the change — and when in doubt, since an over-pin costs one
  ratification while an under-pin is overturned silently. `notes` appears only where why the
  named reason applies is unclear.
- **`revisit_when` is rare and deliberate** — a condition the owner sets on purpose — and most
  decisions carry none: the reasoning that considered alternatives discharges into facts and
  the frozen draft.

## Model entries

An entry's name is the design's word for the thing — the word the prose actually uses — and its
description anchors what the entity does in this design rather than what the schema already
says. The model binds what the design speaks about; a bound entity nothing references is
ballast.

## Facts and evidence

- A documented fact cites the upstream original, with a verbatim quote that states the claim
  the fact makes. A repository transcription is not a source, and a genuine quote beside the
  point fails like a paraphrase.
- A tested fact's run can be run again: command, output, and the state it ran against, with the
  dependence recorded where a different version or fixture would change the result.
- An author searches the pool before recording — a duplicate is a rival, two settled-looking
  ids for one claim — and files by subject rather than by the increment that needed the fact.
- A fact found wrong is corrected by a superseding evidenced fact.

## Drafts and extraction

A claim in a working draft that cites no foundation is a shadow decision, and extracting it
into requirements, decisions, facts, and open questions is Clarify's discipline. The draft
freezes with the increment as the record of the argument, with the fold as the only authority.
A mostly complete document drafted for a document deliverable is content, not spec: the fold
still binds, and implementation still checks the draft's claims against it.

---

## The checklist

| # | judges | the test |
|---|---|---|
| 1 | statement | Would the owner overturn a decision to hold it — and is it one proposition of owner fiat, free of mechanism, carve-outs, and observation procedure? |
| 2 | rationale | Present only where casual reversal is a mistake the statement does not warn of, and nowhere arguing the requirement is correct? |
| 3 | verification — presence | Absent where the statement is self-verifying; present where a term an observer cannot decide directly needs binding? |
| 4 | verification — grounding | Does every `verify` assert about what a preceding `do` surfaced, with none restating the statement in its own words? |
| 5 | verification — surface | Is every `do` performable today against published surfaces, exercising the requirement's intent rather than its form? |
| 6 | verification — internals | Does any step reaching past the published surface either surface a missing piece of the fiat, then stated deliberately, or get rewritten against the surface — contracted surfaces standing in where the product's tooling does not exist yet? |
| 7 | verification — tested now | Was every step performable at authoring time performed, its findings landed as facts cited in `because:`? |
| 8 | verification — judgement | Where only judgement can verify, does the final pair name the judge and the moment? |
| 9 | decision — the bar | Could a consumer observe the outcome, or must a reimplementation preserve it? |
| 10 | decision — statement | Does it name the choice, with the argument left to the increment's drafts? |
| 11 | decision — because | Does every citation carry a real dependency, and every real dependency a citation? |
| 12 | decision — pinning | Proposed pinned where a public surface, a data format, a dependent product, or a consumer-visible behaviour is fixed — and `notes` only where the named reason's application is unclear? |
| 13 | decision — revisit_when | Rare, deliberate, a condition the owner set on purpose — or absent? |
| 14 | model | Entities named in the design's words, described for this design, each referenced by the prose? |
| 15 | facts | Upstream originals with claim-carrying verbatim quotes, re-runnable runs, the pool searched first, filed by subject, wrong ones superseded? |
| 16 | draft | Every claim citing a foundation or extracted — no shadow decisions frozen in? |
