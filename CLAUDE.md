# plan-opus

Planning repository. Designs live under `design/<area>/<design>/` and facts in the `facts/` pool;
the artifact format is
specified by `design/how-to-plan/doc-structure/spec.md` and the content rules by
`design/how-to-plan/authoring/spec.md`. Validate every change with `npm run check`.

## Agents may propose facts

An agent writing or revising a spec may add entries to a fact file under `facts/`, provided
each new fact meets one of:

a. **Documented elsewhere** — its sources cite the evidence as `doc-structure` requires: a
   `url` with `where` and a verbatim `quote`, or a `description` of the mechanism for an
   assumed fact. The url is the upstream original, and the quote states the claim, per
   `r:documented-source-is-primary` and `r:quote-carries-the-claim` in
   `design/how-to-plan/authoring/requirements.yaml`. A file you wrote in this repository is
   never the source, however faithfully it transcribes the original.
b. **Tested directly** — the agent ran the test itself, and an `artifacts/` directory holds the
   actual scripts and inputs used, plus their outputs when the test produces any. Record the
   execution as a run under `evidence/` — what was run, what it captured, by whom, when — and
   reach it from the fact's `sources` with a `run:`, a `where`, and a verbatim quote. What
   an artifact contributes is captured output; a prose conclusion the agent wrote there is
   interpretation, and a fact resting on it belongs under (a) or as an open question. This bar
   The run is what makes the evidence re-runnable: name the command, the output, and the state it
   ran against.

A fact meeting neither bar is recorded as an open question instead.

The same bar governs repairing one. An inherited fact an agent finds wrong, or whose evidence does
not carry its claim, is corrected rather than cited as-is or merely flagged, per
`r:facts-proven-wrong-are-corrected`: record the replacement at the bar above, and retire the fact
it contradicts with a `reason` and a `superseded_by` naming the replacement. A retired fact may not
be cited, so every citation of it moves to the replacement.

Proposed and retired facts are input changes and get owner review: the PR description must call
each one out.

## Requirements are the owner's

A requirement is something the owner would reverse a spec decision over. Anything else — however
true — is a decision the spec makes and defends. Requirements are stated in a sentence or two; one
needing paragraphs of carve-outs is a decision wearing the wrong hat.

Building to the requirements as written is the default. An agent may flag a requirement it cannot
satisfy — once, with the measurement that shows the cost: a count, a failed build, a number. It may
propose a requirement the way it proposes a fact, as an input change called out in the PR
description.

An agent may not reopen a requirement because its prose reads inconsistently with another's,
because a rationale no longer matches a superseded regime, or because a better framing suggests
itself. A fact that contradicts a requirement is still a stop-and-ask; an opinion about phrasing is
not. Finding nothing to raise is a successful review.

The owner can only decide what is theirs to decide. "Runs a million users on one box" is not a
requirement, it is a guess about reality wearing one — a bet on what is possible, and so an open
question until something checks it. Requirements rule the design, not the world.

## A decision's status is not a cost

While a design is being worked, an `accepted` decision is reversible. The status records that the
owner ruled on the choice once, not that the choice has since become expensive to revisit. The
artifact is disposable by design and acceptance does not make part of it permanent.

So the only entries in a comparison between two designs are actual impacts on the product: what a
user, a consumer, or a sibling design would experience differently. Decisions to re-open, spec
churn, and review rounds spent are not costs and do not go in the ledger. An agent arguing for what
the spec already says because changing it would reverse an accepted decision has charged the owner
for its own rework.

Name the accepted decisions an alternative would reverse — the owner wants to see them, and
re-ruling is theirs — but name them as consequences, not as reasons against.

## Facts are repo-wide; requirements are not

Any design may cite any fact, whichever scope files it. Before recording one, search
`node bin/foundations.mjs --facts` and cite what is already there. File a new fact at the
narrowest scope that describes its **subject** — not the design that needs it — and leave it
there when a second design comes to depend on it. Requirements are fenced: a design cites its
own, its area's, and the global ones, and is bound by those whose `applies_to` names it. A
decision is citable only by the design that made it.

## Who settles a dispute

Whether an agent may decide something on its own comes down to one question: who settles a dispute
here?

- **Build freely on** facts, requirements, and published designs.
- **Decide alone** where the collision is between two proposed designs — that is design work — or
  between a proposed design and a fact, where the fact wins and the design changes.
- **Stop and ask** where the collision is fact against requirement, requirement against
  requirement, or anything resting on an open question or a decision still proposed.

The one to get right is a requirement meeting a fact that contradicts it — "must work offline" meets
"the login provider needs a connection". Reality wins on what is true, but the requirement does not
quietly lose: changing it, designing around it, or accepting the limit is the owner's call and
nobody else's. An agent quietly resolving that collision is the failure this rule exists to catch.

This only works if it can be applied unprompted. Needing it restated each session means it has
failed, whatever any document says.

## Answering review feedback

After addressing the owner's review comments, reply to each thread with a link to the commit that
addressed it and resolve the thread — without being asked. A thread that is a question, an
information request, or anything needing more discussion stays open for the owner's next pass:
resolving it would hide a conversation the owner wanted.

## Decide at the tier that has the information

Make the smallest decisions that complete the work, at the tier doing it. An unknown the
evidence in hand already determines is settled now; one it does not determine becomes an open
question — raising one is a form of answering now, not a deferral. A plausible answer written
ahead of its evidence reads, a month later, exactly like one that was established, and the
decision set then carries entries that look ruled and are not.

## Propose pinning with the decision

The agent proposing a decision proposes whether it is pinned, and the owner rules on both
together. Propose pinning when the decision fixes a public API surface, fixes a data format
written to disk or sent over a wire, is something another product depends on, or changes
behaviour a consumer would notice. When in doubt, propose it pinned: an over-pinned decision
costs one ratification; an under-pinned one is overturned silently by a later wave.

## Pull request titles

Conventional-commit style, the product as scope, the increment number in brackets at the end:
`plan(increment-process): the backlog and the facts surface [009]`.

- `plan(<product>)` — a design increment.
- `impl(<product>)` — an implementation's companion increment.
- `feat(<product>)`, `fix(<product>)`, etc. — changes shipping this repository's packages.

Omit the bracketed number only when no increment is involved.
