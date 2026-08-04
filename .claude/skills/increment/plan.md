# The Plan phase

You are driving one draft increment of `<product>` from creation to publish: Capture, Clarify,
the check before Ratify, the survey offer, the Ratify loop, and landing. The normative rules are
`docs/process-reference.md` (Capture, Clarify, Open questions, Ratify, Publish is the merge).
Opening the draft and landing it are in SKILL.md; this file is what happens between.

## 1. Capture

Open the draft, then populate the requirements source directly with the owner. The draft's scope
is nothing more than the changes its sources declare.

### Adopting from the backlog

Send-to-capture pulls held items into this draft:

```
npx design-process backlog send <increment-dir> [--item <id>]... [--product <id>] [--tag <tag>]...
```

`<increment-dir>` is a repo-relative `products/<product>/increments/<name>` — a `wip-` draft as
readily as a numbered one. At least one selector is required; a bare `send` is an error, not a
drain of everything. Each operation takes `--root <dir>`, `--remote <name>`, and `--offline`, and
each mutating one takes `--no-push`.

Sent items land at `products/<product>/increments/<name>/drafts/backlog/<id>.md`, verbatim in
their stored form so the tags travel with them, and the operation deletes them from the backlog
in the same action. **That file is raw material.** Adopt it by writing the foundations you plan
into this draft's own sources at the ordinary bar — never move the text across. The draft's
sources are the record; the backlog keeps none. An item's content is judged here, at adoption,
and nowhere earlier.

Capturing *into* the backlog is one ceremony-free action, available to the owner and to any
agent mid-task — no pull request, no increment, no review gate:

```
ID=$(npx design-process backlog add <product>)   # body on stdin; add prints only the id
```

The rest of the surface — `list`, `search`, `show`, `update`, `delete` — is
`npx design-process backlog <op> --help`.

## 1b. Capture from code — the code-first path

An increment may be captured after its code exists: the owner builds by hand, and an agent reads
the design back out of what was built. The discovery inverts; the artifacts do not. A captured
increment carries the same requirements and decisions, and at implementation the same record and
coverage, as a designed one, and folds and extends identically — it claims a number and lands
like any draft.

Capture replaces Clarify's from-scratch research with a read of the built artifact. For each
choice the code embodies, propose where it belongs by one test — would an agent later extending
the code have to be **bound** by the choice, or be left **free** to change it:

- **bound** → a requirement or decision the owner rules, recorded at the ordinary bar;
- **free** → left uncaptured, the code merely happening to embody it.

Propose the split; the owner rules it the fast way — affirm a requirement, or send a transcribed
choice back to incidental. This triage is the guard against the code-first failure: freezing a
thousand incidental choices as law and handcuffing the agents meant to extend the code. Capture
the few you would defend, not the many the code contains.

The built code is **provisional** until the capturing increment publishes — unreleased, depended
on by no one; publishing the capture is what makes it extensible. At implementation the record's
coverage is complete by construction, since the captured claims are drawn from code that already
meets them, each carried by the owner's attestation and whatever tests exist.

## 2. Clarify — work the foundation sources

Find the places missing research and do the spikes. Everything lands in the sources as it
happens:

- **facts** — what research finds, at the evidence bar: a documented upstream citation with a
  verbatim quote, or a test you ran with its artifacts and a recorded run under `evidence/`.
  Search `node bin/foundations.mjs --facts` and cite what exists before recording.
- **open questions** — `questions.yaml`, for an unknown you cannot answer, routed by `answer`
  (fact, decision, or requirement); raising one is a form of answering now, and beats a guess.
- **decisions** — the big-picture calls that follow from the requirements, entering `proposed`.
  The consumer-visible package set a build would need is proposed here too, as decisions:
  decomposition is design work. A choice that cannot yet be made is recorded as a decision like
  any other — a deferral, its statement naming what is deferred and to whom. The owner ratifies
  it and it stands in force as the license its answer cites; a question routed to a decision may
  close by minting one, and a deferral is not superseded by its answer.
- **contracts** — the shapes the design speaks about, bound through the model as they settle.

**Plan fixes the public shape only.** Structure below the package surface is the implementer's;
pre-deciding internal names and boundaries from the plan tier manufactures churn. Files under the
draft's `drafts/` directory are optional scaffolding — raw material the fold outranks.

## 3. Check before Ratify

Check every foundation against the closing checklist of `docs/authoring.md` before putting it to
the owner — the same checklist the post-Clarify review agents load as their rubric. Finding
nothing to raise is a successful review.

## 4. Survey — offer it, and classify what returns

Before Ratify, report what the draft has captured and ask the owner whether to dispatch the
survey. Recommend from the delta's shape: for, when packages, contracts, or consumer surfaces
change; against, when norm-only. **The owner's word runs it**, any number of times across the
loop.

- Dispatch the implement phase in survey mode — read-only — against the draft fold on the draft's
  branch.
- Classify every choice the census returns: **decided** — a foundation determines it;
  **deferred** — a ruled decision names the choice and whom it is handed to; or omitted as an
  **implementation detail**, by the test `docs/process-reference.md` carries at *Every choice is
  accounted for*. A choice that is none of the three is a gap, and the gaps route back into
  Clarify.
- A census the draft acted on persists at `drafts/survey-census.yaml` in the draft directory that
  ran it; one acted on in no way is discarded.

## 5. Ratify — the loop

Present the owner the projection (`npx design-process show <product>`) and the question list
through the draft's pull request. The owner rules each decision **accepted**, **tolerated**,
**delegated**, or **rejected** — a rejection carries the owner's reason and is closed by a
replacement whose `supersedes` names it. A deferral is not among these rulings: it enters as
`deferred` directly, and the merge ratifies it. Apply the rulings, consume the feedback, and
raise what it surfaces; Clarify and Ratify iterate until the owner declares the draft settled
enough.

Every surveyed choice is classified — decided, deferred, or omitted as an implementation
detail — before the draft publishes. Then land it: SKILL.md carries the steps.
