# Open questions

Increment 001 defined the process and left one entity out. This increment restores it.

The omission is visible inside 001 itself. Its process reference lists, among what a projected view
of a product shows, "open questions blocking the increment from settling" — an entity with no shape,
no home, and no lifecycle anywhere else in the increment. Its agent guidance closes the synthesis
draft's remainder check with "every claim in the draft either cites a foundation or is extracted
into a decision, a fact, or an open question," naming a destination the process does not provide.
The repository's own agent rules say a fact meeting neither evidence bar "is recorded as an open
question instead," and that anything resting on an open question is a stop-and-ask. Four references,
no entity.

---

## What a question is for

001 already describes the loop a question belongs to, in its account of Ratify: agents raise
questions and decisions, the owner responds, agents consume that feedback and raise more, until the
owner declares the increment settled enough. Decisions are the propose half of that exchange. **A
question is the ask half** — the structured form an agent uses to put something to the owner during
Clarify, and the list the owner works down when responding.

That fixes what the entity is. It is not a durable artifact and never enters the fold; it is the
medium of an iteration, with the same lifetime as a proposed decision and the same freedom — 001
already allows a decision still proposed inside its own increment to be removed outright with no
record, and a question is removable on the same terms and for the same reason. What survives the
increment is what the exchange produced: the fact found, the requirement ruled, the decision made.

Being working state does not make the shape optional. The schema is what lets an agent hand the
owner a list rather than a paragraph, lets the owner answer item by item, and lets tooling say how
many asks are outstanding. Structure earns its place in a conversation, not only in an archive.

The failure it prevents is worth naming precisely: a plausible answer written ahead of its evidence
reads, a month later, exactly like one that was established. Nothing in the artifact distinguishes
them, and the decision set — the owner's only window — then carries entries that look ruled and are
not. So the discipline the prior process stated stands unchanged: an unknown the evidence in hand
already determines is settled now, and raising a question is itself a form of answering now rather
than a deferral.

## The shape

```yaml
version: "1"
questions:
  - id: q-p3v6icfy
    question: |
      should a preset be able to declare a requirement that applies to only one package of an
      adopting product?
    answer: requirement
    facets: [schema]
```

Four fields, one block, nothing to fold.

`answer` is the field doing the most work, and its job is routing rather than classification. The
three kinds reach different actors: a `fact` sends someone to measure, a `decision` needs a call
someone is competent to make, and a `requirement` is owner fiat that nobody else can supply. An
owner looking at eight questions wants to know which three are actually theirs, and this is what
tells them. Without it, "someone will sort this out" silently covers questions that were always the
owner's.

Naming the kind is also what keeps the entity from degenerating into a place to park unease. "Which
kind of thing would end this?" is answerable even when the question is not, and a question whose
author cannot name that kind is usually not a question yet.

There is no field for the decisions a question blocks. Filling one would mean writing the decision
that the unanswered question blocks — a decision composed ahead of its evidence, annotated to say
we knew. That is the failure this entity exists to prevent, one level up. Where a question does
block work, the question text says so in a clause, at no schema cost.

## Its own file, and only while the increment is a draft

Questions live in `questions.yaml` beside the increment's other sources. It is a separate file for
the reason the other sources are separate: each holds one kind, and the sources are organised by
what they hold and who rules on them.

Unlike them, it does not survive. `questions.yaml` is absent from a published increment, and the
merge gate refuses one that still carries entries — the same shape of check as "no decision still
`proposed`", and for the same reason: both are unfinished exchanges with the owner, and an increment
publishes when the exchange is done.

There is consequently no retirement form, no supersession, and no closure record. A question is
answered by what the increment ratifies, or deleted because it stopped mattering, and neither
outcome needs an entry of its own. The argument that produced the answer is in the synthesis draft,
which does freeze and publish; the answer itself is a foundation entry, which folds. A third record
saying the question is now closed would restate both.

## Why nothing is deferred to the implementer

The tempting exception is the question an implementer will settle better than the design can — the
one that could publish as a handoff saying "this is yours." It does not earn a record, because 001
already routes that case by silence. Its agent guidance holds that a plan-tier agent may not settle
a detail an implementer will meet with better information; the implementer meets it, decides
narrowly, and records the decision. A design that says nothing about a detail has already delegated
it.

A published handoff list would therefore duplicate a mechanism that works without one. The
implementer's action is identical either way, and the artifact that appears afterwards — the
implementer's own recorded decision — is the honest one. What the list would add is the distinction
between "we thought about this and left it to you" and "nobody thought about it," and no one acts
differently on the strength of it.

The cases are exhaustive, which is what makes the gate liveable:

- **`answer: fact`** — either the spike runs now, or the decision resting on it cannot be made, so
  the increment is narrower than its author thought. Publishing the narrower increment is correct.
- **`answer: decision`, and it is the implementer's** — silence delegates it already.
- **`answer: decision`, and it is the design's** — that is what Clarify is for, and the increment
  is not finished.
- **`answer: requirement`** — the owner's, and the increment cannot settle until they rule.

Every branch resolves inside the increment.

## What the gate is, and what it is not

The check is mechanical and narrow: no questions source with entries on main. That is genuinely
enforceable, and it means there is no open state for anything to sit in — every question that ever
existed was either answered or judged not to matter, by someone, before the increment published.

What it cannot catch is a question nobody wrote down. No validator reaches that, and none did under
the prior regime either. The defences there are the ones that already exist: the synthesis draft's
remainder check, which allows discard only at zero remainder, and the owner's read of the increment
at ratification. The gate closes the leak of a recorded question drifting unanswered; it does not
close the leak of an unrecorded one, and claiming otherwise would be the same kind of overstatement
the entity is meant to prevent.

## Ids

Question ids are `q-` and eight base36 characters, from the same generator as `r-` and `d-`, unique
within the increment that raised them — the only scope in which a question exists. The id is what
the owner types when answering item three of eight, which is the whole of its job.
