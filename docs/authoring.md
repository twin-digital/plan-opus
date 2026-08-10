---
version: "34"
---

# Authoring

The content-quality tests for foundations: what makes a statement, a decision, a model entry, a
term, or a fact good. The process reference states how the process works and what the validator
enforces; this document states the tests a reviewer applies where the machine stops, and none of
it is a validator rule. Technique and orchestration stay with the agent skills. Each test binds
the writer of what it governs: authors self-check against the closing checklist, and the
post-Clarify review gate's agents load the same checklist as their rubric.

---

## Statements

A requirement's statement is one proposition of owner fiat, in product terms — what must be
true, naming no mechanism and no observation procedure. The test is reversal: would the owner
overturn a decision to hold it? A statement failing that test is design work and enters the
increment as a decision that can be argued with; carve-outs, exceptions, and qualified absolutes
move the same way. A warning that casually reversing the requirement would be a mistake belongs
in commentary, not the statement.

A statement fits the budget — sixty words, and twenty-five for a `when`, `then`, or `otherwise`
clause. Write to it rather than squeeze under it: what overflows drains into commentary, which
is unbudgeted, and a statement that cannot fit is usually carrying more than one proposition.

As guidance for the statement's shape, the EARS templates — a trial, reviewer-applied, and never
a validator rule; a statement fitting no template is not a finding:

- **Ubiquitous** — `the <thing> <holds/does X>.`
- **Event-driven** — `when <trigger>, the <thing> <does X>.`
- **State-driven** — `while <state>, the <thing> <does X>.`
- **Unwanted behaviour** — `if <undesired condition>, the <thing> <does X>.`
- **Optional feature** — `where <feature is present>, the <thing> <does X>.`

## Commentary

A foundation's statement is separate from its commentary, and where the two read differently the
statement wins. Commentary binds nothing, is never citable, and never resolves a question the
statement leaves open; what an implementer builds from carries none of it, so an obligation
written into commentary is an obligation lost. What belongs there: the warning against casual
reversal, the context a future session needs, the overflow the budget drains. The writer's test
is subtraction — delete the commentary, and the entry must still bind exactly what the owner
ruled.

## Scope

A statement — a requirement's or a decision's — names the thing it binds: the surface, the mode,
the phase, the artifact. A reader who meets the statement alone must not be able to take it wider
than the owner ruled. A statement that genuinely binds everything the product does passes naming no
scope.

A requirement written in a preset names the kind of thing it binds — "a Node.js package", "a pack",
"a Node.js library" — rather than "a package" generically. A preset is adopted by a product, not by
a package, and a product may hold packages of several kinds; nothing declares which of them a preset
governs, so the statement's subject is the only thing an implementer reads to know whether a
requirement reaches the package in front of it, and it is what a coverage note names when one
package carries a claim its siblings do not. The test is the sibling: read the statement against the
product's other packages, and if it is unclear whether it reaches them, the subject is missing.

## Terms

A term the design leans on is defined once, owner-ratified — a one-line binding definition —
and statements then use the word without restating its definition. Coining a term or changing a
definition's meaning is an input change the owner rules; a change of meaning mints a new term
and retires the old, since the definition is imported into every statement using it.

The validator gates on declarations only; usage in prose is the reviewer's, reported rather
than blocked. The tests:

- **Restated.** A statement that re-explains a declared term instead of just using it — the
  definition is the one place the meaning lives.
- **Drifted.** Prose using a declared term in a sense its definition does not carry: either the
  prose or the definition is wrong, and the reviewer names which.
- **Rival.** Two words in force for one thing, or a declared term shadowed by a synonym — one
  term, one written form.

And the extraction triggers — when an ordinary word should become a declared term:

- a statement's meaning turns on one particular reading of the word;
- two or more statements each re-explain the same word;
- review has debated what the word means.

## Decisions

- **The bar.** A decision is recorded when a consumer could observe its outcome or a
  reimplementation must preserve it; choices below that bar live in the code, and a
  reimplementation is free to re-make them.
- **The statement names the choice.** The argument belongs to the increment's drafts, the
  consequences to the reader.
- **Branching is cases.** Where a ruling branches, it is written as ordered `when`/`then` cases
  with an optional terminal `otherwise` — normative like the statement, the first matching case
  governing. A list needs at least two cases; one case is a sentence. A requirement carries no
  branches: a requirement that wants them is carve-outs, which enter as decisions.
- **`because:` carries only what the decision rests on** — the requirements it follows from,
  the facts that drove it, the decisions it builds on. The test runs both directions: a
  citation on motivation or illustration is a false signal, and an absent citation on a real
  dependency hides one.
- **Pinning is proposed with the decision**, and the owner rules on both together: pinned when
  it fixes a public surface or a data format, when another product depends on it, or when a
  consumer would notice the change — and when in doubt, since an over-pin costs one
  ratification while an under-pin is overturned silently. `notes` appears only where why the
  named reason applies is unclear.

## Model entries

An entry's name is the design's word for the thing — the word the prose actually uses — and its
description anchors what the entity does in this design rather than what the bound contract
already says. The model binds what the design speaks about; a bound entity nothing references is
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

## Backlog items

These tests judge foundation-bar work, and an item captured to the backlog is not that: capture
takes whatever the capturer has, and no test in this document reaches it. The bar arrives at
adoption — the increment taking an item up writes the foundations it plans into its own sources,
and the item's prose is raw material rather than text to move across. Anything arriving that way
is judged exactly as what the increment wrote from scratch.

---

## The checklist

| # | judges | the test |
|---|---|---|
| 1 | statement | Would the owner overturn a decision to hold it — and is it one proposition of owner fiat, free of mechanism, carve-outs, and observation procedure? |
| 2 | statement — budget | Within sixty words, each case clause within twenty-five — the overflow drained to commentary rather than compressed into ambiguity? |
| 3 | statement — scope | Does the statement name the thing it binds — the surface, the mode, the phase, the artifact — unless it genuinely binds everything the product does? |
| 4 | statement — preset subject | Does a requirement written in a preset name the kind of thing it binds, so that reading it against the product's other packages settles whether it reaches them? |
| 5 | commentary | Deleted, would the entry still bind exactly what the owner ruled — nothing the product must do or preserve, no answer to a question the statement leaves open? |
| 6 | terms | Every leaned-on word declared once and then just used — no restated definitions, no drifted usage, no rival vocabulary, and the extraction triggers checked? |
| 7 | decision — the bar | Could a consumer observe the outcome, or must a reimplementation preserve it? |
| 8 | decision — statement | Does it name the choice, with the argument left to the increment's drafts? |
| 9 | decision — cases | Is every branch a `when`/`then` case, at least two where cases appear at all, the single case written as a sentence — and does no requirement carry branches? |
| 10 | decision — because | Does every citation carry a real dependency, and every real dependency a citation? |
| 11 | decision — pinning | Proposed pinned where a public surface, a data format, a dependent product, or a consumer-visible behaviour is fixed — and `notes` only where the named reason's application is unclear? |
| 12 | model | Entities named in the design's words, described for this design, each referenced by the prose? |
| 13 | facts | Upstream originals with claim-carrying verbatim quotes, re-runnable runs, the pool searched first, filed by subject, wrong ones superseded? |
| 14 | draft | Every claim citing a foundation or extracted — no shadow decisions frozen in? |
| 15 | backlog adoption | Does everything the adopting increment records meet the ordinary bar, the captured item read as raw material rather than moved text — and is the captured item itself left unjudged by these tests? |
