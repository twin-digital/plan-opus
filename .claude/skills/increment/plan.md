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
  Search `node bin/foundations.mjs --facts` and cite what exists before recording. A merged
  fact or run is frozen — correcting one is supersede-and-retire, under the debt contract
  `docs/process-reference.md` states at the facts pool.
- **open questions** — `questions.yaml`, for an unknown you cannot answer, routed by `answer`
  (fact, decision, or requirement); raising one is a form of answering now, and beats a guess.
- **decisions** — the big-picture calls that follow from the requirements, entering `proposed`.
  The consumer-visible package set a build would need is proposed here too, as decisions:
  decomposition is design work. A choice that cannot yet be made is recorded as a decision like
  any other — a deferral, its statement naming what is deferred and to whom. The owner ratifies
  it and it stands in force as the license its answer cites; a question routed to a decision may
  close by minting one, and a deferral is not superseded by its answer.
- **contracts** — the shapes the design speaks about, bound through the model as they settle.
- **components and terms** — declared in the requirements source where the design needs them,
  ratified with the increment; `docs/process-reference.md` carries their rules.

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
- The census is transient. It returns as structured YAML — per-package entries the dispatcher
  concatenated — and once every choice is classified and the resulting foundations land in the
  draft's sources, discard it: nothing persists in the tree.

## 5. Ratify — the loop

The owner rules each decision **accepted**, **tolerated**, **delegated**, or **rejected** — a
rejection carries the owner's reason and is closed by a replacement whose `supersedes` names it. A
deferral is not among those four: a decision enters as `deferred` directly and the merge ratifies
it. The session offers `deferred` beside the four rulings all the same, because writing one is
authoring a decision and the session is where the owner already is. A deferred decision is settled
for the purpose of landing — not proposed, and not holding the landing closed.

Clarify and Ratify iterate until the owner declares the draft settled enough. Present the owner
the projection (`npx design-process show <product>`) and the question list at the pull request,
then consume the feedback and raise what it surfaces.

### The pull request is where a draft is ratified

A draft is ratified through its pull request, so **open it when Clarify closes** and you put the
draft to the owner — the ordinary start is the owner pasting a url that already exists, and the
landing's own open step is the fallback for a draft nobody posted. The owner opens their session
on it:

```
npx design-process increment [<product>] [--pr <url>]
```

`--pr` names the pull request to work; without it the session takes the branch the working
directory is on and finds — or opens — the pull request whose head that branch is. The product
argument is optional either way, since it comes from the draft the branch holds. The owner ratifies
and lands from there without locating a branch or a working tree themselves: **one interactive
command carries the draft from ruling to published**, landing entered from the same session and
unlocking exactly when nothing is proposed and no question is open.

**Push everything before handing the url over.** The session runs against the fetched head, so an
uncommitted entry is not there to rule, an increment directory the branch does not touch is not
found at all, and an uncommitted fact goes uncounted in the header. What is not pushed does not
exist for the owner.

**Stand off the branch while a session is open.** Every submit commits and pushes; nobody
force-pushes; an agent revising text mid-sitting loses the race and strands the owner's commit. The
owner says when the sitting is done. Rulings taken in a session stage there and apply to the
draft's own sources in one write, committed on the draft's branch, so **do not re-apply them by
hand** — fetch the branch and read the sources before touching a draft the owner has ruled from a
session, or you will duplicate what is already recorded.

**The owner's credential is theirs alone.** A GitHub personal access token entered at the terminal,
the first time a submit actually posts something, held in the session's memory for the rest of that
sitting and nowhere else — not a file, not the environment, not an argument; a later session asks
again. **Never supply one.** It is spent on the reviews a submit and the landing post and on
nothing else: opening the pull request, pushing, and setting the merge to complete on its own use
the credentials the environment already holds. Ratifying and publishing one draft asks the owner to
approve once, and no step afterwards discards that approval and asks again.

### A comment directs a ruling; the sources are the ruling

Ratifying does not require the session. The owner rules by saying so where they are — a comment on
the pull request, made from anywhere — and both surfaces stand. **A comment directs a ruling and
does not make one:** the draft's sources are the only record of one, so it takes effect when an
agent writes it into them. Nothing reconciles the two surfaces because only one of them writes.

An unresolved review thread is a direction nobody has applied, and a draft does not publish over
one. Applying it means replying with the commit that did it and resolving the thread — CLAUDE.md
already requires that, and it is the whole of the bookkeeping.

Every surveyed choice is classified — decided, deferred, or omitted as an implementation
detail — before the draft publishes. Then land it: SKILL.md carries the command.
