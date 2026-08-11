---
version: "36"
---

# The incremental design process

The normative reference for the incremental design process: what the owner and agents read to
run it. Instruction to agents working inside the process ships as this repository's agent
skills and `CLAUDE.md`; what the process retired from earlier practice, and how existing
designs convert, is in `process-migration.md`. Everything this reference states is a ratified requirement or
decision of the `increment-process` product — it adds nothing of its own — and the design
validator enforces the rules that are mechanical.

## Summary

The process is a loop: **capture** requirements; **clarify** — research and reason about
alternatives to drive decisions; **ratify** — the owner rules; repeat. Everything drives toward
one goal: structured decisions that are reviewable separately, viewable topologically, and
comprehensive enough to drive implementation in a constrained and directed manner.

The unit of change is an **increment**, scoped to a **product**: a declared delta of
requirements, decisions, and contract bindings, drafted on a branch and published by merging —
after which it is immutable, and the effective state of the product is the **fold** of its
published increments. Implementation is separately scheduled work against the fold at a
published increment, recorded where evidence lives rather than where design lives.

## The foundations

Everything the owner ratifies is a foundation entry in an increment's sources, and each kind
has a job, an author, and a lifecycle:

- **Requirements** are owner fiat: what the product must do to be accepted. Captured by the
  owner and agents at the start of an increment, directly into its requirements source;
  replaced by successor entries (`supersedes`), retired with a reason, applied in bulk from
  presets. An entry's binding content is its `statement`; `commentary` beside it binds nothing
  (see *Statements, commentary, and cases*).
- **Decisions** are the path taken to meet them — each choice a consumer could observe or a
  reimplementation must preserve; choices below that bar live in the code, and a
  reimplementation is free to re-make them. Proposed by whoever does the design work, then
  ruled by the owner. While still proposed and inside its own increment, a decision may be
  removed outright; once in force, it persists, closed only by a successor's `supersedes` or a
  retirement. `because:` records what a decision rests on; `pinned` marks the ones that cannot
  be freely overturned.
- **Model entries** bind the contracts the design speaks about — entity name to a pooled schema
  or authored surface at a pinned version, in the `model:` block of the requirements source.
  Written as the shapes settle, ratified with the increment's requirements, folded by entity
  name.
- **Components and terms** are further blocks of the requirements source — a product's named
  parts, which foundations scope to, and its defined vocabulary (see *Components and scope* and
  *Terms*). Like presets and model entries, they are state-shaped: declared and redeclared,
  with the latest declaration the current state.
- **Facts** live in the repo-wide `facts/` pool, with the runs and artifacts that establish
  them under `evidence/`: findings about the world, citable from anywhere and validated by
  `design-process check` — the one merge gate — against their pool schemas and the evidence bar,
  like every other source (see *The facts pool and its evidence*).

One further entity is defined like a foundation but is not one: the **open question**, the
structured ask an agent puts to the owner while an increment is a draft. It has a formally
defined shape (`/design-process/question@1`) and never publishes; see *Open questions* below.

The owner and agents author foundations directly, as plain files; review is an ordinary
pull-request diff, and the owner reads every claim in full. Because the spec is gone, the
decision set is the owner's only window on what was built — so decisions are not minimised;
they are rich enough to comprehend a product from, read as a set.

A product is declared by a `product.yaml` or `product.yml` at any depth under `products/`. The
declaring file's directory is the **product root**, and that directory's name is the product id;
two products declaring the same id are a validator failure, whatever their paths. Products may
be grouped into subfolders, and the tooling finds a product wherever it is placed: the id names
a product wherever it sits and nothing records its path, so CLI arguments, `applies_to`, preset
adoptions, and cross-product citations all survive a move untouched. The scan stops at a product
root and does not descend into it, so a declaration nested inside a product's own tree — a probe
fixture under `increments/`, say — declares nothing, and products do not nest. `products/` is
the one directory scanned, configured nowhere.

Increment artifacts live at `<product root>/increments/<NNN>/` — `requirements.yaml`,
`decisions.yaml`, a `drafts/` folder, and the sources later process increments define, with
`.yaml` and `.yml` both accepted wherever a source is named. The increment is its directory,
with no manifest file of its own. While an increment is an in-flight draft it holds no number,
and its directory is `wip-<NNN>-<slug>` on its own branch (see *Drafts run in parallel*); a
plain number is what main holds. Wherever this reference writes `products/<product>/`, read the
product root.

Lifecycle is uniform: **an increment declares changes, and state is the fold** — and what an
entry says is never edited once it publishes. One word, `retired`, marks an entry leaving
force; one relation marks succession; every closure carries a reason (see *Lifecycle — the
three change regimes*).

## The process

```
Backlog:
  future work captured outside any increment, adopted by whichever increment plans it

Plan:
  Capture → Clarify → Ratify    (loops until the owner declares it settled enough)
  Several drafts of one product run this at once; a draft claims its number at landing.

Implement:
  prepare → implement, one implementer per package — prepare stands up what siblings
  compile or check against, implement completes the package; each kind maps its own
  waves onto those two phases. Implementers also expose survey, the read-only phase
  Clarify dispatches. Plan hands Implement the ratified fold.
```

Plan and Implement are the two phases an agent runs, invoked as `/increment <phase>` — the
phase naming which, and the rest of the invocation carrying whatever the caller wants to say.

### Capture

Capture is the step where the owner and agents create the increment and populate its initial
requirements, directly into its requirements source. An increment's scope is nothing more than
the changes its sources declare.

Opening an increment never requires targeting the product's next head number: a new increment
opens as a parallel draft at any time (see *Drafts run in parallel*). Capture's material comes
from the owner and agents directly, and from the backlog — and a capture flow, the backlog's
send among them, targets a newly opened draft as readily as one already in flight.

### The backlog

An idea for future work — planned at no particular time — is captured the moment it arises and
held durably, without opening an increment. The owner reviews what is held, and a later
increment adopts an item when its work is planned.

Capturing an item is a single ceremony-free action: one commit, no pull request, no increment,
and no review gate at capture. The owner and agents alike write to the channel. An item's
content is reviewed when an increment adopts it, never when it is captured.

Every item belongs to exactly one product, and that association is visible wherever items are
listed or searched.

**An item is a braindump.** Capture accepts near free-form markdown — whatever the capturer
has, from one line to several paragraphs. Any structure the channel imposes stays light, and
foundation-bar prose is never required at capture; the ordinary bar is applied when an
increment adopts the item.

The backlog lives on a branch named `backlog`, created orphan, with no shared history with main
and holding only backlog files. Capture pushes commits straight to it, which the rulesets
permit, and the branch is never merged anywhere: its history is the only residue of items that
have left. An item is `<product>/<id>.md` on that branch — the directory names the product, the
filename is the tooling-generated id (`b-` and eight lowercase base36 characters), the first
heading is the title, and the body is free prose. Optional YAML frontmatter carries tags for
filtering and nothing else; there is no other structured data.

The owner and agents work the backlog through the tooling rather than by hand against the
store — `design-process backlog add|list|search|show|update|delete|send`. `add <product>` takes
the item body on stdin and prints only the new id, so `ID=$(design-process backlog add ...)` is
the capture idiom. Writes go to the branch through git plumbing: a backlog write never touches
the working tree or the checked-out branch, so an agent captures mid-task against a dirty tree
and nothing it was doing is interrupted.

### Adopting a backlog item

A later increment adopts an item by writing the foundations it plans into its own sources at
the ordinary bar. The send operation is what moves the raw material into reach:

```
design-process backlog send <increment-dir> [--item <id>]... [--product <id>] [--tag <tag>]...
```

`<increment-dir>` is a repo-relative `<product root>/increments/<name>` — a draft's `wip-`
directory as readily as a numbered increment. Send takes one item, all of a product's, or those
matching a tag filter. Each sent item lands at
`<product root>/increments/<name>/drafts/backlog/<id>.md` and is deleted from the backlog
branch in the same action: it arrives as raw material in `drafts/`, not in the increment's
foundation sources. The increment's sources are the record, and the backlog keeps none.

### Clarify

Find the places missing research and do the spikes. Identify the open questions and answer the
ones that can be answered. Make the big-picture decisions that follow from the requirements
alone, without low-level code knowledge.

What research finds lands as **facts** — documented with an upstream citation, or tested with
the artifacts and a recorded run — and capturing them is the ideal way to ground a decision in
truth or to answer an open question. Outputs are those facts, plus a ratified set of
requirements, with any owner-approved amendments, and decisions reached from research, also
owner-approved.

Clarify works directly in the foundation sources. Where connected prose helps — an argument
that must hold together can expose the decision not yet made and the question not yet asked —
an increment *may* keep working drafts in its `drafts/` folder, merging with the increment and
freezing at publish; most increments need none. A draft is raw material, never normative: the fold is what binds.

The design phase produces **no prose specification** for an implementer to follow.
Implementation works strictly from the fold — requirements, decisions, and bound contracts —
and later converts drafts into shipped documents, checking the drafts' claims against the fold
as it goes.

### Every choice is accounted for

When an increment is planned, every choice an implementer would meet is decided by a
foundation, explicitly deferred, or found to be an implementation detail — something no
consumer could observe and no reimplementation must preserve. A choice that is none of the
three is a gap: silence is the only gap. Decide what the evidence determines, defer what it
does not, and leave the rest to the implementer.

Whether a choice is an implementation detail is one test — no consumer could observe it, and
no reimplementation must preserve it — applied identically at two moments: the Clarify agent
omitting a surveyed choice, and the implementer declining to record one at wrap-up.

The survey phase is how choices are enumerated (see *Dispatch: kind selects the wave shape*):
Clarify may dispatch the implementers in survey mode against the draft fold and classify what
returns — the implementer enumerates, Clarify rules.

### Open questions

An agent that meets a question it cannot answer raises it to the owner as an open question
rather than guessing an answer or dropping it. **A question is the structured form** an agent
uses to put something to the owner, and the list the owner works down when responding.

Questions live in `questions.yaml` beside the increment's other sources, carrying one
`questions:` block:

```yaml
version: "1"
questions:
  - id: q-p3v6icfy
    question: |
      should a preset be able to declare a requirement that applies to only one package of an
      adopting product?
    answer: requirement
```

`answer` names which kind of foundation would answer the question, and its job is routing: a
`fact` sends someone to measure, a `decision` needs a call someone is competent to make, and a
`requirement` is owner fiat nobody else can supply. A question whose author cannot name that
kind is usually not a question yet.

A question is not a foundation and never enters the fold: no claim, decision, or requirement
may cite one, and no citation resolves to one. It lives only while the increment is a draft,
removable outright with no record, exactly like a decision still proposed. **No increment
publishes carrying an open question**: every question is answered by the fact, requirement, or
decision the increment ratifies, or removed as no longer relevant, before the merge — the same
shape of check as "no decision still proposed", and for the same reason. There is no
retirement form, no supersession, and no closure record; on main the file is absent or holds no
questions.


### Ratify

**Clarify and Ratify iterate** — agents raise questions and decisions,
the owner responds, agents consume that feedback and raise more. The loop runs until the owner
declares it settled enough to implement.

The owner's ruling on each decision put to them is one of four values:

- **accepted** — the owner determined the decision is acceptable without caveats or reservation
- **tolerated** — the owner judged the decision and left it standing, but found it sub-optimal
  or undesirable in some way
- **delegated** — the owner abstained from reviewing the decision, which is left standing as is
- **rejected** — the owner determined the decision non-viable; carries the owner's reason on
  the entry, and is closed by a replacement proposed by whoever proposed the rejected one

Distaste is not rejection. A decision the owner dislikes but can live with is tolerated, and
may stand indefinitely; if the owner does want it changed, that becomes a requirement in some
future increment — a deliberate choice, never an automatic consequence (see *Implement
forward*). A rejection's reason is the one required reasoning, because it is the input to the
rework; the replacement's `supersedes` is what closes the rejected entry.

A deferral takes none of these values: it enters as `deferred` directly, ratified by the
merge like a requirement — a recorded handing-off, not a ruling on a proposal (see
*Deferrals*).

Where the owner takes those rulings, and how a settled draft reaches main from there, is
*Ratifying and landing a draft*.

**`tolerated` and `delegated` are opposite states, not degrees of the same one.** Tolerating is
a judgement; delegating is an abstention. Keeping them apart is what lets anyone ask,
product-wide, how much the owner engaged and judged versus passed over — the projection labels
each decision and counts the abstentions. The count of delegated decisions is the honest
measure of how much of a product was reviewed.

### Drafts run in parallel

Several increments of one product run Clarify at once, none committed to a sequence number
while drafting. The landing order is chosen when planning is done, and a draft claims its
number only as it lands.

An unnumbered draft is `<product root>/increments/wip-<NNN>-<slug>/` on its own
pull-request branch, which agents name `plan/<product>/<slug>` — no check requires that name;
it is the default agents reach for rather than deliberate over. `<NNN>` is a three-digit
ordinal and `<slug>` names what the draft is about. Landing renames the directory into the next
published number on that branch before the merge, so main never holds a wip directory.

**The ordinal orders the draft increments one tree holds, and nothing else.** It is not a claim
on a published number, and two drafts on unrelated branches may carry the same one. A tree holds
more than one draft only when one is stacked on another, and then the ordinal is their relative
order — a stack lands in it, `wip-001` before `wip-002`. The ordinals are not dense and no gate
checks them: when an ancestor lands, the dependent keeps its ordinal rather than renumbering,
and gaps are ordinary. A tree holding two drafts that are not ancestor and dependent is not
supported.

**The merge gate reads a draft increment while it is worked**, so an author sees what is wrong
before landing rather than after. A wip directory is read as a draft increment in flight: its
sources validate against their schemas, its citations resolve, and its proposed decisions and
open questions are reported — every rule the gate applies to a published increment, applied to
it too. What keeps it out of main is the increment-dir-name finding, unchanged: the landing
rename clears it and nothing else does, and the check stays the merge gate it is. The density
gate reads published numbers only, so a wip ordinal neither fills a gap nor makes one.

**A draft's foundations project.** The projection folds a tree's draft increments after every
published increment, ordered by their wip ordinals — the order their landings would claim. Each
one's foundations appear in the fold, its supersessions close what they name, and the coverage
summary counts its claims. A draft shows as its directory name, since it holds no published
number until it lands. That is the default projection only — asked for a named increment or a
git ref, the projection shows published state and excludes drafts, since a draft holds no number
to name; `diff`, `where`, and the head side of `conflicts` stay published-only.

### Dependencies between drafts

A draft depends on another when it builds on it: branching from it and citing, superseding, or
retiring its foundations. Nothing is declared — the dependency is git ancestry. A dependent
draft's tree carries its ancestor's content, and its landing diff shrinks to its own changes
once the ancestor merges. A dependent draft lands only after the draft it builds on;
independent drafts land in any order. A tree that skips or repeats a published number is refused
by the density gate; a wip ordinal is not a published number and the density gate does not read
it.

### Landing claims the number

No two in-flight drafts rule the same choice or duplicate one another's rulings — building on
another draft's foundations is a dependency, not a conflict. Landing into the sequence checks
for overlapping or conflicting rulings against the fold at head before the merge claims the
slot, and the later of two overlapping drafts recomputes when the head moves.

The check is its own command:

```
design-process conflicts <product> [--against <increment> | --against-ref <gitref>]
```

`--against` names the head to check against and defaults to `origin/main`, then `main`. It
exits 1 on findings, and it applies two mechanical rules only: an id the head already
declares, and an `amends`/`supersedes`/`retires` aimed at an entry already closed at head. No
gate reads in-flight drafts against each other; semantic overlap between open drafts is the
owner's scan, and that is what covers the window.

### Publish is the merge

An increment is draft or published, and the boundary is main — draft is a location, not a
stored field. A draft lives on its increment's branch, freely editable the whole time: proposed
decisions and questions may be removed outright, and it holds no number. Another draft may
build on it by branching from it (see *Dependencies between drafts*); nothing on main does.
Merging to main is the publish act, and the gate runs there:

- no decision still `proposed`
- no open question still carried
- the number is the next in the product's sequence — the landing rename claims it, and the
  conflict check runs against the fold at head first (see *Landing claims the number*)

The gate is a required pull-request check: the design validator runs on every pull request,
applies every rule in force at that point, and any failure blocks the merge — the gate is not
advisory, and nothing publishes over a failing check. The wiring is thin repository
configuration: this repository commits a small workflow that installs the tooling packages and
runs the check, branch protection marks the check required, and the validator logic lives
entirely in the tooling packages.

**The check's output has two severities.** A **finding** gates any merge and sets the nonzero
exit; a **report** gates nothing repo-wide. Each names the product it concerns where one does,
and a report the fact-staleness model scopes to a product is enforced by that product's own
landing sequence, not by the check's exit (see *The facts pool and its evidence*).

Main therefore holds only published increments, dense and immutable, and the validator refuses
any edit to one: **a published increment is never unsettled by later work** — drafting
increment N+1 changes nothing about increment N. What a tree-consumed deliverable shows on
main is always what a published increment built.

The merge is reached rather than performed by hand: the landing sequence pushes the branch,
opens its pull request where it has none, approves it as the owner, and sets the merge to
complete on its own once the gate is green (see *Ratifying and landing a draft*).

### Ratifying and landing a draft

**Ruling a draft is one sitting in one place.** The owner reaches every open entry the draft
carries, reads each in full, and rules it without leaving for another tool — and takes the draft
from its first ruling to published in that same sitting. **Publishing a settled draft takes no
agent**: a draft whose rulings are complete publishes mechanically, the owner landing it without
an agent performing any step of the landing.

**A draft is ratified through its pull request.** The owner opens a session by naming one, and
ratifies and lands from there without locating a branch or a working tree themselves; a draft
being ratified has a pull request, whoever opened it. This governs ratification, not when a
draft is created or how it is worked before that.

One interactive command carries the draft from ruling to published:

```
design-process increment [<product>] [--pr <url>] [--root <dir>]
```

It is a full-screen terminal application over a draft's pull request, and it is the whole flow
— the owner rules from it and publishes from it, never switching commands. No new package, no
service, and no browser: it reaches the fold, the projection, and the conflict check as library
calls rather than reimplementing them.

`--pr` names the pull request to work and is not required. Given one, the session resolves it to
its head branch and works that: where the current tree is already on that branch it works in
place, and otherwise it fetches the branch, materialises a temporary git worktree from it, runs
there, and removes the worktree when the session ends. It needs a local clone of the pull
request's repository, found from the working directory the command ran in. Given no `--pr`, the
session takes the branch the working directory is on and works the pull request whose head is
that branch; where the branch has none, the session pushes it — setting its upstream where it
has none — and opens one, titled for the draft it carries. That is the ordinary case rather than
an error: a branch carrying a draft and no pull request is a draft nobody has posted yet, and
posting it is what the owner came to do.

Four things it refuses instead, saying which: the branch is the repository's default branch,
which never carries a draft and cannot be the head of a pull request into itself; the tree holds
no draft increment, so there is nothing to rule; the tree has uncommitted changes, which the
owner would be ruling without having written; and the head branch lives on a fork the local
clone cannot push to.

**The pull request's diff names the draft.** The increment directories the diff touches are the
drafts it carries, and the `products/<product>/` above each is its product — nothing is declared
and nothing is passed. The diff rather than a `wip-` name, because a branch at landing has
already renamed its directory into the number it claims, and a session opened on a landing
branch would find no draft by name. Where the diff carries exactly one draft the session opens
on it; where it carries several, a selection screen comes first, listing each by product and
directory, and choosing one opens the ordinary view — a tree holds more than one draft only
where they are stacked, so this is the uncommon path. A product named on the command line
narrows the list to that product's drafts, and where that leaves one the selection screen is
skipped; the product argument is optional throughout, since the draft the diff names carries it.
Where the diff carries no increment, the session says so and exits.

The session has modes. **Ratify** is offered for every draft the session opens on, whatever
statuses that draft's entries hold. **Landing** becomes available exactly when nothing is
proposed and no question is open, and is entered from the same session — that condition is on
landing, not on the session opening or on ratify being among the modes it offers.

#### The screen is an authored contract

What ratify mode renders is an authored surface in the `surfaces/` pool, bound through the
increment's model as `ratify-screen`. The contract carries the layout and the form of every
field; the decisions carry the choices — which entries the list holds, how a cited id is
resolved, what a submit writes. A screen is a public surface in the sense the pool already
means: it is what the owner interacts with, and it is falsifiable, since a render can be diffed
against the authored shape where a layout written as paragraphs would drift from the build with
nothing catching it.

`/design-process/ratify-screen@1` is read as follows, and this says nothing about how any other
surface is written. The file has two halves that say the same thing twice on purpose: `mock:`
carries rendered frames, and the sections beside it carry the same shape as rules. The frames
are what a render is compared against; the rules settle a case no frame happens to show, and
where the two appear to disagree the rules govern — a frame is one instance and a rule is the
statement. What the surface commits to is arrangement, the order of things within a region, and
the form of each field. What it does not commit to — and what an implementer therefore settles
as an ordinary implementation detail — is everything the frames incidentally have: column
widths, separator and rule glyphs, the selection marker, the truncation width, colour, and any
behaviour no section names, among them key bindings, scrolling, an empty list, and a terminal
too narrow to hold both panes. Silence there is not a gap to escalate. A key path addresses the
thing it names — `detail-pane.metadata.pinned` — and that is how prose cites a region of this
surface; the paths are an addressing scheme for this file, not a vocabulary another surface
inherits or a structure the pool enforces. A render conforms when it matches the frames in
arrangement, order, and field form, differing only in what the surface leaves open.

#### The header, and the list

**A header spans the top of every mode**, naming the product, the increment directory, the
branch, and the pull request: the session is started from a pull request url and runs in a
worktree the tool made, so nothing else on screen says which draft is open. The header also
names the draft's changed inputs that the ruling list does not hold — schema pool versions,
authored surfaces, facts, evidence, and drafts — counted from the branch's merge-base with the
head the conflict check uses, so what the head gained meanwhile is not counted as the draft's.
The count is of entries where a file holds them and of files where it does not: a facts file
gaining two facts reads as two. The header says they are there and does not render them, because
the owner does not approve a draft whose contract bindings, facts, or schema versions they were
never told about, and a list of decisions alone does not show them. It names one thing more —
how many review threads on the pull request are unresolved.

**The ratify list holds every decision the draft carries**, in whatever status, and every
question still open. A decision the draft already rules carries that ruling as its staged value;
a proposed one carries none. A draft is worked over several sittings, and a list holding only
what is still open hides the rulings the owner is deciding against and offers no way back to one
already made — so any of them is re-ruled from the list, a rejection included. That a ruled
entry is closed against later change binds a *published* increment: while the draft is
unpublished a ruling is an edit to a file nobody has read yet, and the owner changing their mind
before the merge is what ratify is.

**An entry is identified by what it says.** Wherever the session names an entry — in the list,
in the heading of the pane, in the entries a shown entry cites — it shows that entry's title
with the id beside it, and no place in the session identifies an entry by its id alone. The
entries a shown entry cites — its `because`, what it supersedes, what a question's answer routes
to — are resolved against the fold the draft sits on and the repo-wide facts pool, the kind read
from the id's prefix. An id that resolves to nothing is shown as the id alone, and that is the
whole of the handling: a dangling citation is already a merge-gate finding, and the session is
not where it is reported. A cited fact is shown by its title, with the first line of its claim
standing in where the fact carries none; a question's `answer` names the kind its answer routes
to rather than an entry, so it is shown as that word and is not resolved.

#### Ruling, noting, and submitting

**Rulings stage in the session and apply in one write.** Ruling an entry stages it and writes
nothing; the staged set applies to the draft's own sources and commits on its branch in one
write, when the owner submits it or when landing takes it. A session abandoned before that
leaves the tree untouched.

The statuses ratify mode offers for a decision are the four rulings and `deferred` — every
status a decision may carry is reachable from the place the owner is ruling it, without writing
the entry by hand or leaving for another tool. The owner writing a deferral is authoring one
rather than ratifying it, since the process already has a deferral enter directly and the merge
ratify it; a deferred decision is settled for the purpose of landing, being neither proposed nor
a hold on it. A rejection carries the owner's reason.

A question is answered in the same pass, and where the answer routes decides what is written: a
`fact` route closes the question and writes no entry, while a `decision` or `requirement` route
writes the entry into the draft with its id already generated and the owner's answer text as a
placeholder, for the owner to state. That placeholder enters `accepted` where the owner answered
the question — the session is the owner in the loop, and the ruling is theirs to have already
made — and `delegated` where an autonomous agent authored the answer. Neither path enters
`proposed`, which in the owner's would leave the draft unsettleable by the session that wrote it.
Staging refuses what the sources could not carry — a rejection with no reason, a routed answer
with no entry — so a submitted set validates.

One bulk action sits beside the per-entry ruling and not instead of it: setting every decision
still unruled to one status. It reaches decisions only and leaves open questions untouched — a
question needs an answer, and an answer is not a status — so a draft carrying questions is never
fully settled by the bulk path alone. It is the secondary path; a draft is ruled entry by entry,
and the bulk action is for the tail the owner has already decided as a group.

**A note asks for a wording change without ruling on it.** While reading an entry the owner
attaches a note asking for its text to be revised; it settles nothing and gates nothing, and an
entry can carry a note and be ruled in the same submit.

**Wherever the session takes text from the owner, the position the next character will occupy is
visible** — including in a field whose text is not echoed back.

**A submit changes only what it ruled.** An entry the owner did not rule and did not note comes
out of a submit exactly as it went in, byte for byte, so the pull request's diff shows the
sitting and nothing else. The write is an edit to the source, not a re-serialisation of it: a
submit rewriting the file through a YAML serialiser would reflow every entry it did not touch,
the values surviving and the diff not, and the pull request would stop showing what the sitting
did. So the session edits the spans it ruled and leaves every other byte where it found it, the
scalar style of the surrounding entries included.

**What the owner types is stored as they wrote it.** Every field the session writes from text
the owner typed — a rejection's reason, the answer a routed question carries, the placeholder
statement that answer writes — is written as a YAML block scalar, whatever its length, so a
colon, a leading dash, a `#`, or a quote in the owner's prose cannot break the file and no
escaping rule has to be right. The scalar is the folded one, `field: >`, so the session can wrap
what it writes without the wrapping becoming part of what it wrote: folding turns a line break
between two non-empty lines back into the space it replaced and keeps a blank line as the
paragraph break the owner typed, where a literal `|` would store every break the wrapper
inserted and hand the owner's text back in a shape the tool chose. Where the owner's text does
not survive folding — a line begun with whitespace, which a folded block would keep literally —
the session writes a literal block instead and does not wrap. Round-tripping the value is the
rule; folding is how it is met in the ordinary case, and the width and the wrapping algorithm
are the implementer's.

**The session loses no work to a failed GitHub write.** When a write from
`design-process increment` to GitHub fails — a refused review or a rejected push included — the
work it carried is kept and shown in the session, ready to retry or to save; nothing the owner
entered is lost. The push and token handling below are instances of this rule.

**The commit a submit writes tallies what it ruled, and the submit pushes.** The body names each
status the set took and how many entries took it — `3 accepted, 1 rejected` — in a fixed status
order, omitting any status no entry took and counting answered questions as their own clause,
since an answer is not a status. A sitting that changed nothing writes no commit. Pushing is
what makes a sitting durable: a draft is ruled over several of them, and rulings that live only
in a local branch are lost to whichever machine held them. A push the remote refuses is reported
and the commit left standing — the session does not rebase, because rewriting the owner's branch
under them is worse than a sitting they are told to resolve.

**A submit that carries notes posts exactly one `COMMENT` review** to the draft's pull request,
after the commit and the push, so the review anchors to the state it describes. Each note is a
comment in that review, against the lines of the entry it concerns in the source file that
carries it; a note whose anchored lines fall in no diff hunk goes into the review's body naming
the entry, because GitHub refuses a comment on a line outside the diff. A submit carrying no
note posts nothing — the commit already records the statuses it changed, and an empty review
repeats it while burying the reviews that say something.

**No submit approves.** Approving stays the landing's own step, because an approval posted
earlier is dismissed by the next push — and a submit pushes, as does the landing's rename
commit. Ratifying and publishing one draft asks the owner to approve it once, and no step taken
afterwards throws that approval away and asks again.

**A credential acting as the owner is never written down.** The credential that acts as the
owner is a GitHub personal access token entered at the terminal the first time a session needs
one — the first submit that actually posts something, never one that does not — with the input
not echoed. It lives in the process's memory for the rest of that session and nowhere else: not
in a file, not in the environment, not in an argument. A later session asks again, and so does
the next submit after an empty answer. A session that cannot obtain one still stages, commits,
and pushes; it reports the notes it could not post and keeps them for the rest of the session,
so a token supplied later carries them, and it says so before ending a session that loses them.
`design-process land`, having no session, asks at its own terminal where it has one and reports
the pull request as awaiting approval where it has none.

**The token is spent on the reviews and nothing else.** The calls that carry it are the reviews
a submit and a landing post, in an authorization header read from memory. Opening the pull
request, pushing, and setting the merge to complete on its own use the credentials the
environment already holds — the agent opened the draft's pull request, and the owner reviewing
it is the point. The token's reach is the reviews, so what the owner's identity is spent on is
exactly what carries their judgement.

#### Ruling from the pull request

**Ratifying does not require the session.** The owner rules by saying so where they are — a
comment on the pull request, made from anywhere — and both surfaces stand. The draft's sources
are the only record of a ruling: a comment directs one and does not make one, so it takes effect
when an agent writes it into the sources, and nothing reconciles the two surfaces because only
one of them writes. An unresolved review thread is a direction nobody has applied; the agent
that applies one replies with the commit that did it and resolves the thread, as `CLAUDE.md`
already requires, and that is the whole of the bookkeeping. What a comment must not become is a
second record — a direction applied to the sources is settled there, and the thread is closed
rather than kept as a rival copy. A draft does not publish over a direction nobody acted on, and
the header's unresolved count is what holds it.

#### What the agent does around the session

The agent working a draft opens its pull request when Clarify closes and it puts the draft to
the owner, so the ordinary start is the owner pasting a url that already exists and the
landing's own open step is the fallback for a draft no agent posted. Before handing the url
over, the agent pushes everything: the session runs in a worktree made from the fetched head, so
an uncommitted entry is not there to rule, an increment directory the branch does not touch is
not found at all, and an uncommitted fact goes uncounted in the header. What is not pushed does
not exist for the owner. While a session is open on a branch the agent does not write to it —
every submit commits and pushes, nobody force-pushes, and an agent revising text mid-sitting
loses the race and strands the owner's commit. The owner says when the sitting is done.

#### Landing

**Land is one fixed sequence that stops at the first failure**, reporting what to fix and
leaving the branch as it found it: apply any staged rulings, run the conflict check against the
head, rename the wip directory into the number the head yields, run the full design check,
commit, push, open the pull request where the branch has none, approve it as the owner, and set
the merge to complete on its own once the gate is green. Nothing in the sequence needs
judgement, and an increment carrying a proposed decision or an open question is refused before
any of it runs.

The order of the last three steps is forced. Opening follows the push because the branch must
exist on the remote before a pull request can name it; approving follows the open because there
is nothing to approve before it; and approving follows the push in any case, because a push
after an approval dismisses it. The landing opens a pull request rather than stopping short of
one because publishing *is* the merge, and a repository admitting changes to `main` only through
a pull request cannot merge a branch that has none — a landing that left the branch pushed and
unproposed would report success over an increment that could not publish. Where the branch
already has a pull request the open step is a no-op.

The auto-merge step reads the repository's own `allow_merge_commit`, `allow_squash_merge`, and
`allow_rebase_merge` and sets the method enabled there, preferring a merge commit, then a
squash, then a rebase where more than one is — a fixed order, so two landings against one
repository set the same method. The landing serves repositories that differ, so any built-in
default would be wrong for one of them. Where the repository enables none, or cannot be asked,
or the API refuses to enable auto-merge, the landing reports the pull request as approved and
awaiting a manual merge: the increment is pushed, opened, and approved, and what is left is a
merge the landing could not ask for.

The same sequence is also

```
design-process land <product> [--root <dir>]
```

non-interactive, for an agent or a script that has no session to land from. It takes `--root`
and no other option — no `--no-push`, no `--against` — because the sequence is fixed and there
is nothing to select; it runs the conflict check against that check's own default head,
`origin/main`, then `main`. It is the secondary surface: the interactive command runs the
sequence itself rather than shelling out to it.

### Design and implementation keep their own schedules

An increment need not run Implement. Capture → Clarify → Ratify → publish is a complete
increment — a preset's only shape, and any product's option. Its ratified requirements sit in
the fold as claims with no coverage, which the projected view shows for what they are: ratified
and unbuilt. Several design increments may accumulate before any implementation; one
implementation may target the consolidated fold, and nothing obliges one per increment. An
implementation durably records the increment it targeted, and an implementation never amends
the design it targets: an escalated change lands as an ordinary design increment, and the
implementation retargets the fold that contains it.

## Mechanics

### Pinned decisions

A decision's **status** records the owner's ruling. Separately and independently, a decision
may be **pinned** — meaning it cannot be freely overturned.

- **`pinned`** — `false` (the default), or `{ reason, notes? }`. A pinned decision requires
  owner ratification to change; an unpinned one does not, whatever its status.
- **`reason`** is an enum — `data-format`, `public-api`, and `other` as the escape. `notes` is
  required with `other`, because there it is the reason; alongside a named reason it is almost
  never provided — only where why the named reason applies is unclear.

**Pinning, not status, is what escalation reads.** No status on its own obliges an
implementer to stop.

### Deferrals

During a Plan phase, a choice that cannot yet be made is recorded as a decision like any
other: its statement names what is deferred and to whom, the owner ratifies it, and it
stands in force as the license its answer cites. A question routed to a decision may close
by minting a deferral. A deferral is not superseded by its answer — the answer is an
ordinary decision whose `because:` cites the deferral (see *The companion increment*).

`deferred` joins the status values, and a deferral enters as `deferred` directly — the
merge ratifies it, like a requirement. The decision dialect carries `deferred` in its
status enum from `/design-process/decision@2` on.

Coverage skips a deferral (see *Proving a claim is met*).

### Lifecycle — the three change regimes

An increment declares what changed, and the effective state is the fold across the product's
increments. The owner reads the effective set, computed; the history is preserved and is not
what anyone reads.

**Entries change in one of three ways**, by kind:

- **Log entries** — requirements and decisions — never change once published: a later
  increment writes a successor or a retirement.
- **State entries** — presets, model entries, components, and terms — are redeclared: the same
  name written again, and the latest declaration is the current state.
- **Pool entries** — facts and runs — are frozen where they sit: the one edit is marking one
  retired (see *The facts pool and its evidence*).

**`retired` is the one closure status**, with a free-text `reason`, wherever an entry leaves
force by status — uniformly across entity kinds. **Succession is one relation with two
spellings.** A requirement or decision is replaced by a new entry that names the one it
replaces: `supersedes`, carrying the reason in its own content — `amends` is retired as a
spelling, requirement successors writing `supersedes` too. Everything else points the other
way: the write that marks an entry retired — a redeclaration of the same name for state
entries, the one permitted edit for facts and runs — names the replacement with
`superseded_by`. A rejection's reason field is `reason`. A retirement with no successor stays
a `retires:` entry — one id, one one-line `reason` — in the increment source whose file scopes
its kind; the reason is the only thing distinguishing it from an oversight, and when one event
retires several claims the reason repeats, keeping every retirement independently greppable.

**One increment declares a name once.** A source declaring the same preset, component, term,
or model entity twice in one increment is a validator failure — the folded state would
otherwise depend on entry order. Applying and retiring one preset in a single increment is the
same failure.

**A consumer of a changed entity is protected by one of three models, assigned by citation
geometry.** Version-pinned channels — schemas, surfaces, applied presets — *drift*: the
consumer moves by explicitly taking the new version. Product-local vocabularies — components,
terms — *guard*: the retiring increment fixes its own citations. Unpinned cross-product
citation — facts alone — is *loud staleness*: the corrector acts now, and each citing product
answers at its own next landing. The model a future entity kind gets is read off this
assignment.

**A product retires in its own declaration**: `status: retired` with a `reason` in its
`product.yaml`. A retired product's fold stays readable and its published increments stand;
applying a retired preset at a new version is a validator finding, and versions already
applied are untouched.

Within the increment that created it, a decision still `proposed` may be removed outright with
no record. Once in force, an entry persists and is closed only through these mechanisms, so the
owner can follow what became of it.

**Recording is required; asking is not.** An unpinned decision may be overturned by an
implementation wave without escalating. It must still be recorded — a decision silently out of
force makes the record lie, and the record is what the owner reads. Overturns land as
superseding entries in the implementation's companion increment (see *The companion
increment*).

**Concurrent increments cannot collide on the number.** A draft holds no number while it is in
flight, so two drafts never claim one and nothing collides at the merge. The number is claimed
serially, by the landing rename. What landing checks is overlapping or duplicated rulings
against the fold at head, and the later of two overlapping drafts recomputes against the head
that moved (see *Landing claims the number*).

### Statements, commentary, and cases

**A foundation's statement is separate from its commentary**, and commentary never carries
anything the product must do or preserve; where the two read differently, the statement wins.
Requirement and decision entries take an optional `commentary` field: prose that binds
nothing, is never citable, and never resolves a question the statement leaves open. The field
is named `commentary` because `notes` already means two other things in this product — a pin's
notes and the owner's session notes. `/design-process/requirement@2` and
`/design-process/decision@3` carry the field.

**A statement fits a budget the validator checks mechanically.** In the dialects that carry
`commentary`, a statement over sixty words is a validator finding, and a `when`, `then`, or
`otherwise` clause over twenty-five. Commentary is unbudgeted — it is the drain. Published
sources in earlier dialects are not read against the budget.

**A decision enumerates its branches as cases.** A decision entry takes an optional `cases:`
list — ordered `when`/`then` pairs with an optional terminal `otherwise` — normative like the
statement, the first matching case governing. A list needs at least two cases; one case is a
sentence. Requirements carry none: a requirement with branches is carve-outs, which authoring
routes to decisions. `/design-process/decision@3` carries the field.

What makes a statement good — the statement-form tests, the EARS templates offered for
requirement statements — is `docs/authoring.md`'s business, reviewer-applied and never a
validator rule.

### Schemas pool by identity, and the model binds them

**There are two contract pools, and the axis between them is a data shape against a public
surface**: schemas live under `schemas/` and public surfaces under `surfaces/` (see *Authored
surfaces*). Both file by namespace today, and a namespace large enough to want it may nest
below that — any organisational or naming convention within a pool is an aid to navigation,
non-normative and unenforced. Identity is declared in-file in both.

Schemas are any file at any depth under `schemas/`. Each declares
`$id: /<namespace>/<entity>@<version>` beside `$schema` — JSON Schema draft 2020-12, authored
as YAML — names unique across the repository, versions dense integers per entity, the leading
slash mandatory and its omission a validator failure. Root-relative identities resolve to
themselves regardless of base, which is what lets a schema depend on schemas: a `$ref` is such
an identity, resolved from the pool as the registry, and binds transitively. References resolve
by identity and never by path, so the tree may be reorganised freely.

A version is immutable once an increment binding it publishes, directly or transitively, and
stays present as long as anything published relies on it. The validator refuses to edit or
remove one that any published increment binds; it also fails when two pool files claim one
identity, and fails an increment whose schema reference — a model binding or a source file's
`version` field — resolves to no pool schema. A new version is a new file, proposed by the
increment introducing it and ratified with it. Drift is legal: no product is rebound by a new
version appearing.

An increment binds contracts through its **model** — a top-level block of its requirements
source, beside the requirements and preset declarations it ratifies with, folding by entity
name:

```yaml
model:
  - name: pack-manifest
    schema: /minecraft/pack-manifest@2
    description: the manifest a behaviour pack ships, as the build writes it
```

The entity name is the design's word for the thing, free to differ from the pool entry's name,
and the description anchors what the entity is in the design. **An entry names its contract or
is retired**: one contract reference — `schema:` or `surface:`, each written
`/<namespace>/<entity>@<version>` — and an optional `description`, or `status: retired` with a
`reason`. There is no shapeless state: an entity whose contract is not yet settled is carried
by a deferral, like any other unmade choice. Entries fold by name like presets, the entity
name staying the design's word for the thing, with no duplicate entity names in force;
wherever prose references an entity, its bound contract is the authoritative shape.
`/design-process/requirements@3` carries the enum; sources already written keep `bound` and
`unbound` in their dialect. Model entries are part of the increment's requirements — ratified
with it, binding on implementers.

The key is `surface:` because the pool it points into is `surfaces/`. Sources already written
stay readable in the dialect they declare: `/design-process/requirements@1` keeps `api:`, and
`@2` is what a source opts into to say `surface:`.

Foundation files need no model entry to be interpretable: each names its own schema's pool
version in its `version` field. The model is for the shapes a design defines and speaks about.

**An implementer reads the bound contracts as part of reading the fold.** The projection prints
a model entry's name, reference, and description and none of the contract's content, so an
implementer working from the projection alone cannot see the shape it is bound to. A reference
resolves by scanning the pool for the file whose identity declaration matches it: pool layout is
not normative, so the path is not derivable and a convention would be a second, contradictable
answer. The pool is the planning repository's — a package built in another repository reads its
contracts from the planning repository's checkout, where the increment that bound them lives,
and the pool does not travel with the code. That is the ordinary case rather than the exception:
the tooling this process ships is built outside the repository that plans it.

### Every structured file names its own schema version

Every structured file this process defines — `product.yaml`, the increment sources, the
implementation records, the repo-wide `facts/` and `evidence/` pool files, and any source a
later increment adds — carries `version`: the pool version of the file's own schema. A
requirements source with `version: "3"` is interpreted by the pool schema
`/design-process/requirements@3` — one lookup, no fold. The field is what makes schema evolution
compatible with immutability: a published file stays readable forever in the dialect it was
written in, and a format change is an ordinary new pool version that later files opt into.
Carrying the field means a foundation file is a mapping, not a bare list: `version` sits beside
the top-level keys — `requirements:`, `decisions:`, `facts:`, `runs:` — that name what the file
holds.

### Identifiers

Generated ids are `{prefix}-{8 lowercase base36 characters}`, the rest random, produced by a
CLI generator; the validator enforces format and uniqueness, so a collision is a regenerate at
creation rather than a latent bug. A new entity kind's prefix defaults to three letters, and
the owner names a different one — minimum one letter — per kind, by how critical the entity
is. Ratified now: `r-`, `d-`, `q-`, `b-`, `f-` at one letter; `run-` at three. The id is the
citation form; `title` carries the human label and may churn freely.

Nothing reads structure out of an id. Question ids are
unique within the increment that raised them — the only scope in which a question exists.

Increments stay plain numbers once published, claimed serially by the landing rename; an
in-flight draft is identified by its `wip-<NNN>-<slug>` directory name instead. Products and
presets are named by their directory, and adoption uses that name. Components and terms are
named by their declared slugs, not generated ids (see *Components and scope* and *Terms*).

### Components and scope

**A requirement or decision may name the part of the product it concerns** in a form the
tooling reads, so which claims reach which part is answerable without interpreting prose. The
named parts are **components**, declared in a `components:` block of the requirements source,
beside `presets:`, `model:`, and `terms:` — state-shaped entries that fold by id, ratified
with the increment that declares them. `/design-process/requirements@3` carries the block.

A component entry carries a slug id unique within its product, a one-line `description`, an
optional `parent`, and a `status` of `active` (the default) or `retired`. It carries nothing
else — no package information and no configuration; what realizes a component is the package
mapping's business (see *A product maps to its packages*). Components form a tree rooted at
the product, ancestry carried by the `parent` reference; ids are flat slugs, never
path-shaped, so re-parenting is the redeclaration of one entry and touches no published
foundation. A parent that does not resolve is a validator finding, and a component never
appears among its own ancestors: a declaration or redeclaration that would close a cycle is
refused at the increment that declares it.

A later increment redeclares a component to change its description or parent, and the fold
shows current state. **Retirement is refused** while any in-force foundation is scoped to the
component or a live component names it as parent — unless the retiring entry carries
`superseded_by` naming another component, through which the scope references in published
sources resolve. **Re-parenting is reported, not guarded**: a redeclaration changing a
component's parent is legal whenever the new parent resolves acyclically, and the projection
reports the in-force claims whose reach the move changes, for the owner to rule the
redeclaration with that reach in view — a use-keyed guard would freeze the tree the moment
anything is scoped beneath it.

**Scope names a subtree.** A foundation scoped to a component applies to that component and
everything beneath it; a foundation carrying no scope applies to the whole product. There is
no container-only reading — what a scope denotes does not change when children are added
beneath it. So splitting a part of the product into finer parts neither restates nor re-homes
foundations already in force: growth of the decomposition is additive. Requirement and
decision entries take an optional `scope:` — one component id or a list — resolved against the
product's component fold; a scope naming no live component is a validator finding.
`/design-process/requirement@2` and `/design-process/decision@3` carry the field.

**Facets are retired**: `requirement@2`, `decision@3`, and `product@2` carry no facets field,
and the projection filters and groups by scope instead. Published sources keep the field in
the dialect they declare.

### Requirement presets

No requirement outside a product's own increments binds it; a preset applied at a pinned
version is the only way an external requirement takes force. A **requirement preset** is a
product that defines requirements and builds nothing. It has increments like any other
product, and they are Plan-only.

A product applies presets at pinned versions in its requirements source, as a `presets:`
block; entries are state-shaped and fold by preset name:

```yaml
presets:
  - name: nodejs-library
    version: 3
    scope: server
  - name: minecraft-addon
    status: retired
    reason: the addon packages moved to their own product
```

A preset entry is name, version, and a `status` of `applied` — the default, normally omitted —
or `retired` with its `reason`; `version` is required when applied and forbidden when retired.
Rules:

- Applying and retiring are direct owner action — fiat, like adding or removing any other
  requirement; the increment that declares the change is the record.
- A preset is applied whole. There are no exceptions or partial adoptions.
- **A preset applies to part of a product.** A preset entry takes an optional `scope:` — one
  component id or a list, naming components of the product declaring the entry — and every
  requirement the preset brings in, its own and those of presets it names in turn, applies at
  that scope with the ordinary subtree reading; absent scope applies the preset to the whole
  product. A preset brought in twice, at two scopes, applies at both.
- **A preset declares no components**, and its own requirements carry no scope — either is a
  validator finding. The preset entry's scope — the applying product's — is the only scoping a
  preset's requirement gets; its statement's subject names the kind of thing it binds.
- **A preset applies presets.** A preset's own requirements source carries the same `presets:`
  block, so it applies them like any other product — the declaration is a property of the
  requirements source and was never conditioned on the applying product's kind. Application is
  transitive: a product's requirements are its own, plus those of every preset in the closure
  its declarations reach.
- **The closure is a directed acyclic graph.** A cycle is a finding, naming the path that closes
  it. A preset reached by more than one path contributes its requirements once — requirement ids
  are opaque and unique, so one id arriving by two paths is one requirement, and deduplicating by
  id is exact.
- **Every hop pins.** A preset names the version of each preset it applies, exactly as a product
  does. One preset reached at two different versions within a single closure is a finding rather
  than a resolution — nothing chooses between them.
- Applying and retiring one preset in a single increment is a validator failure — an instance
  of the one-name-once rule (see *Lifecycle — the three change regimes*).

**A conflict is a double declaration, not a double path.** The mechanical conflict the merge gate
blocks on is identity collision between two declarations of one requirement id: declared by an
applied preset and by the product applying it, or declared by two presets in the closure. A retired
declaration does not count — an id whose only remaining declaration is in force collides with
nothing, so a requirement may move from a product into a preset the product applies, retired in
the one and declared in the other, without the gate reading the move as a collision. An id
reached by more than one path through the closure is not a collision: it is one declaration seen
twice, and deduplication is what handles it. A semantic conflict between differently-numbered
requirements stays with review and the open-question channel.

Drift is expected and not forced: products may sit on old preset versions indefinitely, and
nothing obliges an upgrade.

### Terms

**A term the design leans on is defined once, owner-ratified; statements then use the word
without restating its definition.** Coining a term or changing a definition's meaning is an
input change the owner rules. A product's terms are declared in a `terms:` block of the
requirements source, beside `components:`, `presets:`, and `model:` — state-shaped entries
folding by id, ratified with the increment that declares them; a definition is binding and one
line. `/design-process/requirements@3` carries the block.

A term entry carries a slug id, a one-line binding `definition`, an optional `display` for a
natural written form the slug cannot carry — capitalization or punctuation — an optional
component `scope`, and a `status` of `active` or `retired`. There is no aliases field: one
term, one written form. **The name is the identity** — no opaque id — and statements use the
natural form, resolved by normalization: case-insensitive, hyphen and space interchangeable,
`display` matched where declared. Slugs are unique across the product's closure, and a
collision with an adopted term is a validator finding.

**Clarify in place; a meaning change is a new term.** A later increment redeclares a term to
tighten its wording; a change of meaning mints a new term and retires the old with
`superseded_by`, since a definition is imported into the meaning of every statement using it.
Retirement is refused while an in-force foundation uses the term, unless `superseded_by`
resolves it.

**Terms travel with the preset and resolve at the declaring scope.** A preset's requirements
use only terms it declares or brings in, and a brought-in requirement's terms resolve against
the declaring product's fold, never the applying product's. Sharing is opt-in: two products
may define one word locally and diverge, as applied presets may drift.

**Declaration checks gate; usage checks report.** The validator gates on declarations — slug
collisions in the closure, an unresolved `superseded_by`, a retirement without reason. Usage
detection in unmarked prose is heuristic and reports instead: a redefinition's reach, a
retirement's apparent users, orphan terms. The reviewer-applied tests and the extraction
triggers live in the authoring guidance. The term-retirement guard is the one usage-fed gate:
it reads the same matcher, and over-blocking resolves by `superseded_by` or a prose edit, both
local to the product.

### Projection replaces a written spec document

If decisions are the owner's window, they have to read as a set — and that assembly is most of
what a spec was doing. The job moves to tooling. The two words are deliberate: the **fold** is
the state — declared deltas combined into the effective sets, authoritative wherever it is
computed — and the **projection** is its rendering for a reader, joined, filtered, and ordered.
A projected view of a product shows, for one product at one increment:

- the effective requirement set, product-local and preset-applied, with each application's
  preset and version
- the effective decision set, with status and pinning, ordered by `because:` topology where
  cited rather than by file order — and each decision labelled by ruling, with the abstentions
  counted and the deferrals counted beside them
- for each claim, its coverage and what provides it — deferred decisions omitted from the claim
  list, with the summary naming how many were excluded
- open questions blocking the increment from settling
- what this increment changed against the fold before it

— the whole of it filterable and groupable by scope, where the product declares components.

**What an implementer builds from carries the requirements and decisions in force and none of
the commentary.** The projection omits commentary unless asked for it, and at a published
increment refuses the ask — that projection is what implementers build from. Commentary lives
in the sources and is shown to the owner at ratify. An entry whose statement needs its
commentary to be built correctly is an authoring defect, and this exclusion is what surfaces
it.

### The fold at an increment is the bundle

What an implementer implements against is the fold at a published increment — the effective
requirements, decisions, and bound contracts of `<product>@N`. Publication made every input
immutable, so the view is derivable on demand and identical forever: nothing is archived,
nothing is separately published, the increment number is the version, and the declared delta is
the changelog.

**A fold version is an increment number or a git ref, and the parameter says which.** Wherever
the tooling takes a fold version it takes two parameters rather than one: the bare parameter
names an increment, its `-ref` counterpart names a git ref — `--at` and `--at-ref`, `--from`
and `--from-ref`, `--to` and `--to-ref`, `--against` and `--against-ref`. Giving both members
of a pair is an error. An increment argument is the number with or without padding, `9` and
`009` alike; a ref resolves to the product's latest published increment at that ref. The
resolver answers where a product stands, and the diff reports what changed between two folds —
the foundations added, amended, superseded, and retired:

```
design-process where <product> [--at <increment> | --at-ref <gitref>] [--next]
design-process diff <product> (--from <increment> | --from-ref <gitref>)
                              [--to <increment> | --to-ref <gitref>] [--json]
```

`--at` and `--to` default to the working tree; `diff` requires one of `--from` or `--from-ref`.
`where` prints the increment number zero-padded to three digits and nothing else, so it drops
straight into a path.

### The facts pool and its evidence

**Facts and their evidence carry forward in the repo-wide `facts/` pool** — findings about the
world, with the runs and artifacts that establish them under `evidence/`, filed by subject and
citable from any product. They are validated by `design-process check`, the one merge gate, like
every other source: an entry that fails its bar — a missing field, a quote absent from the
in-repo source it cites, a `run` or `superseded_by` reference resolving to nothing, a documented
fact with no url or a tested one with no run — is a finding that blocks the merge. The discipline
holds under a single checker, so a fact filed anywhere in the repository is held to its bar
before a design cites it.

A `facts/` file is a `facts:` sequence of fact entries; an `evidence/` file is a `runs:`
sequence of run entries. A fact carries `id`, `claim`, `backing` — `tested`, `documented`, or
`assumed` — and its `sources`, with an optional `status` of `active` or `retired`; a run
carries `id`, `command`, `output`, and `ran_at`. `/design-process/fact@3` carries an optional
one-line `title` beside the id — what the fact is named by wherever it is shown, with the claim
staying the body that holds what was measured. `fact@2` and `run@2` carry generated ids — `f-`
and `run-` — and a free-text retirement `reason`; `@1` files keep their kebab ids and dialect,
and references resolve across every dialect. **The `version:` wrapper is what marks a pool
file**: other YAML under `evidence/` — a probe's fixtures and inputs — carries none and is
artifact material, not a run source. Entry shape is the schema pool's to check, so the facts
pool evolves its shape by the same versioning every other source uses.

**A fact is cited by its bare id**, the kind read from the prefix as for a requirement or a
decision. The `f:` form resolves to the same fact and is the only spelling for a kebab id, which
matches no pattern without it.

**A merged fact or run is frozen**: once it merges, what it says never changes, and the gate
refuses any edit to one beyond marking it retired — with its reason, and `superseded_by`
naming the replacement where one exists. To say something different, write a new entry.

Beyond entry shape, the checker enforces the rules that make the evidence hold — the checks a
schema cannot express:

- a documented fact carries at least one `url` source, a tested fact at least one `run` source,
  and an assumed fact at least one `description`
- a quote at an in-repo source is verified verbatim, whitespace normalised on both sides; an
  in-repo source path that resolves to no file is itself a finding, and an off-repo url — one
  carrying a scheme — is not read
- a `run:` source resolves to a live run entry — a retired run may not be cited by an in-force
  fact, satisfiable in one pool change — belongs only on a tested fact, and the run's recorded
  output file holds the quote
- every run entry's recorded output exists in the tree, whether or not a fact cites the run: the
  output is the entry's own claim about the tree, so a dangling one is a finding where it is
  written rather than where it is later cited
- a url into an `artifacts/` path backs only a tested fact
- a retired fact or run carries a free-text `reason`, and a superseded fact or run names a
  `superseded_by` that resolves within the pool and is not itself
- entry ids are unique across the whole pool, facts and runs sharing one namespace

**Correcting the facts pool is never blocked by a fact's citers.** Retiring a cited fact is
never refused: supersede-and-retire lands in one change, and the gate requires that change to
carry a backlog item per citing product, naming the retired fact, its replacement, and the
citing entries. An in-force foundation resting on a retired fact is told loudly — a report
scoped to the citing product, blocking only that product's own next landing, until a
superseding entry re-bases or revises it (see *Publish is the merge* for the finding/report
split). An entry declared after the retirement that cites the retired fact is an ordinary
finding; staleness covers only citers that predate it.

### Citing what a claim rests on

- **`because:` on a decision** — what it rests on: the requirements it follows from, the facts
  that drove it, and the decisions it builds on. Citations give the projection a dependency
  order, and superseding or retiring an entry surfaces its dependents. Optional: a fact is
  deliberately non-trivial to record, and requiring a citation per decision would manufacture
  them rather than find them. Where nothing is cited, the decision's own statement carries the
  reasoning.
- **`informed_by:` on a requirement** — a pointer, explicitly not justification, since
  requirements are fiat and need none. It exists so that a fact contradicting a requirement can
  be found rather than noticed.

### A product maps to its packages

A product spans one or more packages. A product exists exactly when a `product.yaml` sits at its
root (see *The foundations*); the mapping carries `path` and `kind` per package, plus an
optional `repo` — GitHub `owner/repo` form, `twin-digital/opus` when unstated:

```yaml
version: "2"
kind: process
packages:
  - path: nodejs/plan/design-process
    kind: npm-cli
    component: tooling
  - path: docs/process-reference.md
    kind: document
    repo: twin-digital/plan-opus
```

The `path` is the workspace-relative directory or file, and it is also where an implementer
works; anything else a kind might call for is read from the package at that path rather than
duplicated, so the mapping cannot drift from what it maps.

**A package entry declares the components it realizes**: an optional `component:` — one id or
a list — descriptive and implementer-maintained like the rest of the mapping; absent reads as
the product root. Coverage resolution maps a claim's scope through the component tree to the
packages declaring those components. **Scope narrows what answers, never what an agent
reads**: dispatch hands every implementer the whole fold, and a claim's scope decides which
packages answer for it, through the component mapping, never which foundations an implementer
reads. Survey stays whole-fold — a filter computed from a descriptive mapping would hide
exactly the gaps survey exists to find.

Creating, splitting, or moving a package is a decision like any other — proposed and ratified
in Plan. The mapping
reflects the state those decisions produced, and it is descriptive, never aspirational:
`product.yaml` is current state, freely edited rather than increment-locked, because the record
of a package change is the decision that made it. An implementer adds, removes, or updates
package entries at the same time it changes the implementation files they reference.

Consequences: released versions are per-package; coverage refs resolve through the mapping —
the package path prefixes a `ref`, and the package's `repo` anchors it to a repository; a
preset may read against one package of several, with the coverage manifest showing which
package carries each claim a preset brings in.

**A package need not be code.** For some products the deliverable is a document — a format's
normative reference, a process description. Such a package takes `kind: document`, a `path`
that is the document's permanent home, and often a non-default `repo`. This does not bend the
no-spec rule: what the process discards is the design-phase document that *describes* a
product; a document a product *ships* is implementation, produced and revised by implementation
waves like any other deliverable.

The difference a document does have is how it is consumed. Code is consumed through released
versions, so work-in-progress on the default branch touches no consumer; a document at a
permanent path is read straight from the tree, so merge is what makes it live — its changes
ride an implementation's pull request, drawing on the increments' frozen drafts, and go live
only when it lands. Shipped document packages live at permanent homes under `docs/<domain>/` —
the process's own documents are the one carve-out, sitting at the `docs/` root — entering
`product.yaml` at the merge that ships them.

**A tree-consumed package declares its own version in frontmatter.** The `document` and
`agent-skill` kinds carry a `version` field in their file's YAML frontmatter: the string form of
the design increment number the content reflects, set by the implementation that changes the
file, with no semantic versioning process. An implementation record carries that declared
version.

### Implement forward

Resolving a tension that is merely unwelcome is not part of the current increment: the owner
may capture it as a requirement in some future increment — optionally, whenever they choose, or
never; nothing in the process does so automatically. Amend in place only when something is
**impossible, non-viable, or incorrect**. "Incorrect" earns its place in that list: a guard
that silently answers false, so a handler returns early and its test passes green, breaks
nothing visibly — and is the product not working. That cannot wait.

## The Implement phase

Plan hands Implement the ratified fold at a published increment.

### Decomposition is design work

The consumer-visible package set — each package's existence, kind, and home — is proposed and
ratified in Plan, as decisions of the increment that calls for it. The information is available
there, and the boundaries are pinned territory the owner rules on regardless, so settling them
anywhere else is the ratification loop with extra steps and a blocked implementer in the
middle.

The line holds in both directions. Plan fixes the public shape only: structure below the
package surface — a shared internal library, how code splits inside a package — is the
implementer's, and pre-deciding it from the plan tier manufactures churn. And `product.yaml`
stays descriptive: intent lives in the increment's decisions, and the mapping reflects the
packages an implementation has realized.

### Dispatch: kind selects the wave shape

An implementation dispatches one implementer per package, and the package's `kind` — already in
the mapping — selects its wave shape. Every kind exposes the same three phases the dispatcher
calls, so dispatch never depends on a kind's waves:

- **survey** — read-only against a fold or draft fold: return the choices the package's build
  would meet that the fold neither decides nor defers, with the implementer's reading of each,
  for Clarify to classify (see *Every choice is accounted for*)
- **prepare** — standing up what sibling packages compile or check against: a package's public
  surface, or its share of a cross-package allocation. A kind with nothing to stand up treats
  prepare as a no-op
- **implement** — running prepare where it has not run, then completing the package

Survey maps to no wave; a shape partitions its waves across prepare and implement.

The shape for code kinds — `npm-library`, `npm-cli`, `minecraft-addon`, `node-service`, and
`web-app`:

| wave | phase | produces | validated against |
|---|---|---|---|
| **Define** | prepare | the test plan | the requirements and decisions |
| **Stub** | prepare | tests and API stubs | the test plan |
| **Code** | implement | the implementation | the stubs, by compiling; the tests, by passing |
| **Document** | implement | READMEs and user-facing documentation | the implementation |

Prepare may return as soon as the API stubs stand, with test authoring finishing inside
implement, so dependents unblock at the earliest honest moment. What a code kind stands up in
prepare is whatever a sibling compiles against: a `node-service` — a long-running process
deployed and operated rather than installed by a consumer — stands up the surface it serves,
while a `web-app` — a browser application built and served rather than imported — has nothing
compiling against it, so its prepare is the no-op the shape already provides for.

The shape for the `document` and `agent-skill` kinds:

| wave | phase | produces | validated against |
|---|---|---|---|
| **Claims** | prepare | the list of claims the document must state | the effective design at the targeted increment |
| **Compose** | implement | the document at its permanent home, drawing on the increments' frozen drafts | the claim list; every draft claim checked against the fold |
| **Check** | implement | coverage entries per claim | the document, read against each claim |

The claim list is a selection and an allocation, not a restatement. From everything in force at
the targeted increment, it names the claims *this document* is responsible for stating and maps
each to where the document will state it.

Further kinds name their shapes as they earn them, each its own decision — the shapes are the
process's initial vocabulary, not a closed set.

### The companion increment

An implementation never amends the design it targets; it accumulates amendments in a
**companion increment** — a branch holding the product's next increment, opened when the
implementation begins. Everything design-relevant the work produces lands there as it happens:

- **decisions** — entering as `delegated` where nothing pins them; as `proposed` where a
  requirement, a pinned decision, or a decision that would be pinned is at stake
- **open questions** — a requirement change to ask for, an unknown the implementer cannot
  answer
- **contracts** — a new external-facing surface or schema, as a pool version bound through
  the companion increment's model

A companion increment entry is one of three: **licensed** — its `because:` cites the deferral
it answers; an **overturn** — it supersedes a plan-ruled decision, legal when unpinned and
counted at the companion's ratify; or a **discovery** — neither. Licensed entries and
discoveries pass; overturns are litigated.

**A proposed entry is an escalation**: it requires the owner's ratification, and the build
pauses where — and only where — it is blocked on the answer, progressing everywhere else until
forced to stop. An open question blocks the same way. Only delegated entries accumulate without
interrupting anything. An implementation wave
escalates only to change a requirement, change a pinned decision, propose a decision that
would be pinned, or add or change an external-facing contract surface; otherwise agents decide
and record, including overturning unpinned decisions.

The companion increment is the **only channel**: every design change an implementation produces
lands through it, as an ordinary design increment, and the implementation record carries no
design content — target, packages, and coverage only. The merge gate reads `proposed` entries
and open questions, so a companion increment whose escalations were ruled as they arose lands
gated by pull-request review and the validation checks rather than by per-entry rulings; ruling
a delegated entry up — or reversing it — is implement-forward, whenever the owner chooses.

At completion the orchestrator puts the companion increment to the owner as the Plan phase puts
a draft: the pull request opened, everything pushed, the url handed over, and the branch left
alone while a sitting is open. What stays whole is the companion's **gate**, not its review —
an all-`delegated` companion lands without a per-entry ruling, while every entry stays reachable
in the ratify session for the owner who wants one.

The companion merges through the ordinary gate, and **only then does the implementation
publish**: a design with no implementation is a safe state the process supports, and an
implementation whose backing design has not published is not — so no package
version releases and no document deliverable goes live before the design increment its
implementation targets is published. An implementation whose companion increment stayed empty
simply closes it — an increment that declares nothing is not published.

The ordering holds in either discovery order. A design-first increment publishes its intent,
then builds against it. A **code-first** increment inverts the discovery, not the invariant: the
owner builds by hand, an agent then captures the design the code embodies into an increment, and
only once that capture publishes does the code release. Code built ahead of its capture is
**provisional** — unreleased, depended on by no one, a foundation for no one; publishing the
capture is the act that makes it extensible.

Capture reads what was built and proposes, for each choice the code embodies, whether it is a
requirement, a decision, or an incidental implementation detail — the test being whether an
agent later extending the code would have to be bound by the choice or be left free to change
it. Bound choices become the requirements and decisions the owner rules; free ones are left
uncaptured, the code merely happening to embody them. The owner's ruling is the fast kind —
affirm a requirement, or send a transcribed choice back to incidental — and it is the guard
against a code-first increment's characteristic failure, freezing a thousand incidental choices
as law and handcuffing the agents meant to extend it. Coverage is complete by construction: the
captured claims are drawn from code that already meets them.

**An implementation targeting a captured increment opens no companion increment.** The build
already happened, so there are no design consequences arising during it for a companion to
catch, and one opened here could only close unmerged. The run is: bind to the fold, assemble
coverage from the built artifact, file the record — nothing dispatches.

The plan side needs no new control for this. An implementation record cannot target an
unpublished increment, so uncaptured code has no record and is not shipped; a code repository
keeping an unpublished package unreleased is discipline this process recommends and does not
itself reach in to enforce. A captured increment reuses the increment artifacts unchanged — the
same requirements and decisions sources, the same version regime, the same implementation record
and coverage — and carries no marker recording that its design was read from code rather than
written ahead of it. It is ordinary to everything downstream: it folds, agents extend it, its
record covers its claims, and it claims its number like any other. The merge gate is indifferent
to discovery order, and that indifference is what lets the two kinds interleave in one product.

### Everything lands at head

A record's `target` is the product's newest published increment at the moment the record
merges; a stale target is refused, and the implementation retargets first — recomputing against
the declared deltas of whatever landed meanwhile — so
merge order and target order coincide at every landing. When later design increments have
already landed, this is **abort-and-retarget**: the companion increment lands at head, above
whatever arrived meanwhile; the implementation retargets to the increment it produced; and the
loop repeats if further increments land first. Under fast enough design landings, nothing ever
finishes implementing — accepted for a single owner authoring increments, where the race is
rare and losing it is cheap.

### Proving a claim is met

**Every claim in force
carries coverage** — deferred decisions the one exception — and how much of the product rests
on an agent's word alone is visible without reading the code. A claim is a requirement or a decision: both are assertions about the
product, and an assertion nothing checks can quietly become false. **Requirements carry no
verification procedure**: coverage evidence demonstrates the statement read literally. Where
how a claim is checked is the owner's business, a conformance case carries it — owner-vetted,
tied to the claim, filed with the implementation that covers it.

**Coverage is the implementation's artifact, not the design's.** An implementation produces a
record in the `implementations/` pool — a repo pool like `evidence/`, one record per
implementation, immutable once its artifacts ship — linking the package versions produced to
the design increment targeted, and carrying the coverage manifest. A record is filed at
`implementations/<product>/<NNN>-<k>.yaml`, `NNN` the increment it targeted and `k` a dense
ordinal from 1. Run by hand — the owner and agents working the increment's own branch — or
autonomously by an orchestrated Implement phase, an implementation is the same mechanism either
way, and both write this record:

```yaml
version: "1"
product: minecraft-test-lib
target: 7
built_at: 2026-08-01
packages:
  - path: minecraft/test-lib
    version: 0.4.0
coverage:
  - claim: r-h97o555y
    covered_by:
      - kind: conformance-case
        ref: conformance/typecheck.txtar
  - claim: d-qaq43q3x
    covered_by:
      - kind: code-test
        ref:
          - test/exports.spec.ts
          - test/control.spec.ts
      - kind: attestation
        note: the exports map declares ./control, and the build fails without it
```

`kind` + `ref` + an optional `note`, uniform across kinds, so new kinds land without a schema
change. `ref` is one path or a list, naming what carries the claim.

| kind | what it is | what still rests on the implementer's word |
|---|---|---|
| `attestation` | an agent asserts it; no artifact | everything |
| `code-test` | a test in the project's own suite, written by the implementer | that the test measures the claim |
| `manual-check` | recorded steps a human follows and re-runs | that the steps measure the claim |
| `conformance-case` | a case the owner wrote or vetted, tied to the claim it checks — automated or manual | nothing |

What makes evidence strong is **provenance and coupling** — who vetted the check and its tie to
the claim — not automation: a manual conformance case outranks an automated implementer's
test.

**A manifest names only claims in force at the increment its implementation targeted.** Once
an implementation targets an increment, every requirement and decision in force there carries
a coverage entry, applied preset requirements included — except deferred decisions: no entry
may cover one directly, and a deferral without an answer is not a gap. An answered deferral's
answer is an ordinary decision and carries ordinary coverage. Completeness is checked against
the fold at the record's numeric target with draft increments excluded, so a record lands
cleanly in a tree that holds one; the projection's coverage summary still counts a draft's
claims and shows them uncovered, and the two readers are separate. The validator refuses a
record with gaps; "ratified and unbuilt" describes increments no implementation has targeted,
never a hole inside a record. A claim still `proposed` never appears — coverage is evidence about
something the owner has ruled on.

The implementer records an `attestation` for every claim it implemented — always — alongside
whatever better evidence exists.

### Authored surfaces

A product's public surfaces are authored contracts in the repo-wide `surfaces/` pool —
commitments the implementation must satisfy, never extracted projections, though the validator
may extract from the built thing and diff against the authored surface, which is what makes an
authored one falsifiable. **A surface is anything a consumer meets and holds the product to**: a
code interface, a wire format, a command's arguments, a screen. The pool is named for that
breadth rather than `apis/`, because "api" names one kind of surface, and reading a terminal
screen as an api takes a word that means a code interface and asks it to mean something else.

Each version declares its identity root-relative as `/<namespace>/<name>@<version>`. Versions
are dense integers per name, immutable once an increment binding one publishes, and present as
long as anything published binds them; drift is legal — no product is rebound by a new version
appearing. Only public surfaces enter the pool: the internal stubs the Stub wave produces stay
implementation.

**A surface declares its identity inside itself**, in whatever way the file's own technology
already has for carrying metadata, and the file's extension and content tell the validator which
extractor reads it. Nothing outside the file names it, so a surface keeps its identity when it
moves and the pool's layout stays non-normative. Which convention each technology uses is a
decision per technology, so a technology is added by ruling one:

| authored as | identity |
|---|---|
| TypeScript | `// surface: /<namespace>/<name>@<version>`, on a line of its own |
| YAML | `# surface: /<namespace>/<name>@<version>`, on a line of its own |
| Markdown | the frontmatter key `io.twindigital.surface` |
| OpenAPI | `info.x-api-id` |

Markdown has no comment syntax that survives rendering, so its identity goes in the frontmatter
the file already carries; the key is namespaced because frontmatter is shared with every other
tool that reads the file and a bare `id` is a name many of them already use, and it ends in
`surface` because that is the word the other formats use for the same thing. OpenAPI is the one
exception to that word: `info.x-api-id` is the extension key OpenAPI already defines for the
purpose, it belongs to that format rather than to this process, and a document carrying a
renamed key would stop being an ordinary OpenAPI document.

The model binds a surface the way it binds a schema — an entry carries `surface:` instead of
`schema:` — so bindings ratify as requirements, and an implementer needing a surface change
proposes a new pool version and a rebinding as an ordinary design increment,
abort-and-retarget applying.

## The tooling, and the documents

The process tooling — the validator, the projection, the id generator, the backlog operations,
the fold resolver and diff, and the landing conflict check — ships as packages in
the opus workspace (`twin-digital/opus`), and this repository installs them at pinned versions
through its top-level `package.json`; the merge gate wires to their commands.

The process's normative reference is itself a shipped deliverable: separate document-kind
packages, each scoped so an agent loads only the context its task needs, at
permanent homes under `docs/` in this repository — this reference and the migration record —
with instruction to agents shipping as agent-skill packages and `CLAUDE.md` rather than as a
document. The content-quality tests for foundations — what makes a statement, a
decision, or a model entry good — are their own document package at
`docs/authoring.md`, beside the reference and the migration record: one body of tests binding
the writer of what each governs, reviewer-applied and never a validator rule.

### Instruction is scoped to the dispatch

Two rules divide that instruction, and the skill packages are laid out to satisfy them.

**An agent reads only what its dispatch needs.** The instruction an agent receives carries what
applies to the work it was dispatched for and not what applies to a different role, kind, or
phase; guidance that does not bear on this dispatch is neither in the file it reads nor loaded
alongside it.

**A rule governing more than one role is stated once.** Within the instruction agents read,
where one rule governs more than one role, kind, or phase, it is written in one place and
reached from each, not restated per audience — two copies that must be updated together are the
failure this forbids. Where two roles each perform part of one exchange, each states its own
part, and that is not a copy; nor is a normative document like this one restating what the
instruction operationalizes.

The Plan and Implement phases ship as one agent-skill package, `.claude/skills/increment`: its
`SKILL.md` carries the draft-increment lifecycle both phases perform, and each phase is a file
beside it, read only by an agent running that phase. `implement.md` is the dispatcher every
implementation of every product runs through, and a kind with no wave file is an open question
for the implementation that meets it.

Every implementer is one package, `.claude/skills/implement-package`, whatever the kind
dispatched: its `SKILL.md` carries what every implementer does — the three phases and their
contract, survey, the implementation-detail test, findings and escalation, the transient working
list, the narrow scoping of a decision — and nothing kind-specific. Each kind's wave shape is a
file beside it under `waves/`, linked from `SKILL.md` and read only by an implementer dispatched
for that kind: `waves/code.md` carries the Define–Stub–Code–Document shape and governs
`npm-library`, `npm-cli`, `minecraft-addon`, `node-service`, and `web-app`; `waves/document.md`
carries the Claims–Compose–Check shape and governs `document` and `agent-skill`. Adding a kind
is a file under `waves/` and its own wave-shape decision.
