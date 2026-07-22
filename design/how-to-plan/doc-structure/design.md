---
status: draft
---

# The Design Doc

Carved out of the original how-to-plan design: the artifact — how designs are laid out on disk, what a design.md contains, and the invariants every entry must satisfy.

## Decisions

```yaml
# D1 promoted to req:designs-live-in-git. Id not reused.

- id: D2
  choice: a design folder separates durable inputs from the regenerable doc — everything under inputs/, design.md beside it
  falsified_if: regenerating from inputs alone produces a doc I cannot work from, meaning the boundary sits in the wrong place
  status: proposed

- id: D3
  choice: facts and requirements exist at three scopes — design, area, global — resolved nearest-first
  falsified_if: nothing ever graduates past its design, or the area tier stays empty across several areas
  status: proposed

- id: D4
  choice: structured data lives in fenced blocks inside design.md, not a sibling data file
  falsified_if: the blocks are edited by tooling more often than they are read beside the prose
  status: proposed
  revisit:
    when: hand-editing a block is painful enough that I reach for a generator

- id: D5
  choice: facts and requirements are plain YAML files, not YAML fenced inside markdown
  falsified_if: entries need enough surrounding prose that the file wants to be a document
  status: proposed

- id: D6
  choice: fixed schemas with no freeform fields on any entry type
  falsified_if: two consecutive designs need a field the schema lacks
  status: proposed

# D7 promoted to req:decisions-state-their-falsifier. Id not reused.

- id: D8
  choice: load-bearing prose claims carry [[tokens]] pointing inward at ids or outward at facts and requirements
  falsified_if: I stop writing tokens, or rendered docs become unreadable through the brackets
  status: proposed

- id: D9
  choice: no stored dependency rollup on a design; it is derived from prose tokens on demand
  falsified_if: a cross-design index becomes a daily need and derivation is too slow to run live
  status: proposed

- id: D10
  choice: the decomposition is carried as structured component entries, not as prose
  falsified_if: the fields go unread and the decomposition is understood from the prose anyway
  status: proposed

# D11 promoted to req:evidence-is-verbatim. Id not reused.

# D12 moved to the authoring design. Id not reused.

- id: D13
  choice: a quote is always a block scalar, unconditionally
  falsified_if: files still break on quoted text with the rule followed, or the ceremony makes me stop quoting
  status: proposed

- id: D14
  choice: every active design-scoped fact must be reachable from the design, and the checker enforces it
  falsified_if: I routinely add a citation only to satisfy the check, rather than because the claim rests on it
  status: proposed

- id: D17
  choice: a design's state is read from which artifacts exist and where, not from a field I maintain
  falsified_if: I need a design's state somewhere the repo isn't at hand, often enough that reading the tree isn't enough
  status: proposed

# D16 moved to the authoring design. Id not reused.

- id: D15
  choice: a decision has three statuses; promotion deletes the entry outright and records nothing
  falsified_if: I want to know what a design decided after the fact and the git history is too coarse to answer it
  status: proposed
```

## Open questions

```yaml
# Q1 was deferred, not a gate — it became a revisit on the process design's D6,
# which now owns "one component is one PR". Id not reused.

# Q2 was deferred, not a gate — it became the revisit condition on D4. Id not reused.

# Q3 was a bet about the method, not this artifact — it is now
# fact:falsifiers-are-writable-for-boundaries. Id not reused.
```

## Components

```yaml
- id: C1
  name: repo scaffold
  owns: the docs tree, the global facts and requirements files, and their seeded entries
  excludes: any design content beyond this one
  grounds: [D2, D3, D5]
```

## Design

### The two big ideas: make being wrong cheap

The whole design rests on one goal — make being wrong cheap — but that goal has two
halves, and they're separate. Being wrong should be cheap to *spot* and cheap to *cut
out*. The system stands on two legs, not one.

**Cheap to excise: good boundaries make wrongness local.** Most "this feels off, and
patching isn't fixing it" moments come from bad decomposition. When the boundaries
between components are in the wrong place, one concern smears across five files. Every
fix touches all five, and none of them comes out clean. That's the band-aid spiral.

Good boundaries do the opposite. When they're in the right place, a wrong component is
wrong *by itself*, and I can cut just that piece out. So decomposition quality and
abortability are the same thing: boundaries become PR boundaries become the components I
abort, which is why the decomposition is the main artifact and gets a schema of
its own rather than a paragraph. Get the boundaries right and the big-PR problem and the
abort problem both shrink at once. Whether a component stays small enough for that to
hold at real size is not something this design can settle; it is a condition the process
design watches.

**Cheap to spot: chunky prose anchored to small kernels.** Good boundaries make a wrong
component cheap to remove. They do nothing to help me *find* it — a cleanly-decomposed
design can still be confident prose with nothing under it, wrong in a way I won't see
until it's built and failing. That's a different problem, and it's the one behind most of
the review fatigue, the "I can't see the intent," the wheel-spinning where I can't tell
what's off.

The fix is that chunky prose is only as trustworthy as the small, verifiable kernels it's
anchored to [[req:explicit-intent]]. Facts and requirements are those kernels, and they are
what a design is built on rather than the argument that cites them
[[req:easily-reviewable-foundations]] — small claims I can check one at a time. Citations are the anchors [[D8]]. The prose is allowed to be big and
in-flux precisely *because* every load-bearing part of it points at something small I can
verify on its own. That's what lets me review one claim without holding the whole design
doc in my head, which is the actual answer to the fatigue — boundaries don't touch that at
all.

### Repo layout

Design docs live as files, edited with commits, reviewed as PRs — the process design owns
that choice; what follows is what it means for the tree. It's the setup
that lets me point at an exact line, lets the agent and me both edit, keeps the reasoning
attached, and keeps each round cheap. My agents have their own git identities, so they can
commit and comment like any other contributor [[fact:agents-have-git-identities]].

It's just a doc, reviewed as a PR, merged when it's settled — no approvals, no numbering,
no assigned reviewers. The only things that matter: a dedicated home, PRs as the review
surface, and the habit of resolving designs instead of letting them pile up.

Each design gets its own folder, split between the inputs I maintain and the doc generated
from them [[D2]]:

```
repo/  (a dedicated design repo, OR design/ inside the code repo)
├── CLAUDE.md                      # conventions, exemplars, rules of engagement
├── design/
│   ├── facts.yaml                 # GLOBAL discovered invariants
│   ├── requirements.yaml          # GLOBAL owner fiat
│   └── sync/                      # an AREA — a group of related designs
│       ├── facts.yaml             # facts shared across THIS area
│       ├── requirements.yaml      # requirements binding THIS area
│       └── offline-sync/          # one folder per proposal / design
│           ├── inputs/            # what I maintain; what a rebuild reads
│           │   ├── brief.md       # what this design is for, in and out of scope
│           │   ├── facts.yaml     # facts discovered while working on THIS design
│           │   ├── requirements.yaml   # requirements scoped to THIS design
│           │   └── ...            # sketches, data, notes
│           └── design.md          # the doc — absent until a PR opens
├── docs/                          # meta: vision, CONTRIBUTING, policies
├──.claude/
│   ├── skills/                    # skills (authoring, pre-review)
│   ├── agents/                    # subagents (coherence reviewer, implementers)
│   └── hooks/ (or settings.json)  # the quality harness
├── bin/                           # the checker
└── tests/                         # must-pass validations, as real tests
```

**Facts and requirements come in three scopes** [[D3]]. A *design* owns what was
discovered or decided while working on it. An **area** is a directory grouping related
designs — `planning`, `sync`, `billing` — and owns what those designs share. **Global**
(`design/facts.yaml`, `design/requirements.yaml`) owns what holds across everything.
`design/` is the tree's root rather than a subdirectory of `docs/`, because it isn't
documentation about the project — it *is* the project. `docs/` keeps the meta material:
the vision, contributing guide, policies.

Facts and requirements arrive already settled [[req:foundations-enter-settled]] — a design
applies them or discovers it cannot, but does not argue them back open. That is what gives
the review a floor to stand on, and it is why they live in `inputs/` rather than in the doc.

A bare citation resolves nearest-first: the design's own files, then its area's, then
global. A slug defined at more than one tier is an error, not a shadow, because silent
shadowing is exactly the drift this is meant to prevent.

The middle tier is what makes splitting a design tractable. Designs in the same area
inevitably share vocabulary, and without an area scope the only ways to share are
duplicating entries or inventing cross-design references — a citation syntax that names
another design's files, with all the coupling that implies. An area sidesteps both: the
shared entry moves up one tier and both designs keep citing it bare.

Promotion is a ladder with a stated bar at each rung, so "feels universal" never qualifies.
An entry rises to its area when a *second design in that area* depends on it, and to global
when designs in a *second area* do. Both global files start empty, and that's the honest
state — even the requirements taken straight from the vision sit design-scoped until
something other than this design cites them. An area is just a directory; it gets no doc of
its own until one earns it. Keep the files single for now; if one gets unwieldy, split it
into a `facts/` folder later.

Standing this tree up — the directories, the empty global and area files, and the seed
entries — is a single component [[C1]], and the only one this design owns; everything that
*reads* the tree belongs to the harness.

**The `inputs/` boundary is what makes restarting possible.** A design doc that has been
patched past the point of coherence is the same failure as a component that has been
band-aided, and it gets the same treatment: throw it out and rebuild rather than patch
again. That only works if everything needed to rebuild sits somewhere the rebuild can't
destroy — so `design.md` is the one file in the folder that is safe to delete, and
`inputs/` is everything a fresh agent needs to write it again. Hand-editing the doc between
rebuilds is expected and fine; it is an artifact I work on, not a build product. The
directory boundary also keeps the instruction stable: *read `inputs/`, write `design.md`*
stays correct as inputs grow, where a list of filenames in a prompt would be one more
hand-maintained rollup [[D9]].

`inputs/` appears at the design level and nowhere else, which looks inconsistent until you
notice it only separates something where there is an output to separate it from. Area and
global scopes hold inputs and nothing else, so a folder there would divide nothing.

**A design's state is read off the tree, not stored** [[D17]]. Inputs with no `design.md`
means exploring — an idea captured, nothing settled, nothing licensed. A `design.md` on a
branch means draft, under review. A `design.md` on `main` means settled, and only that
licenses building on it [[req:only-settled-work-licenses-building]]. So shelved work sits
in the repo without ever reading as in-flight, and no hand-kept index of what is active can
drift from what is actually there. This is also
what lets an idea be captured the moment it appears: the facts and requirements found while
designing something else get a folder and stop being at risk
[[req:enable-easy-capture]].

The `status` field in the frontmatter stays, but it is now a description rather than a
record — generated to match what the tree already says, and kept only so the file still
answers the question when it is read outside the repo.

### The design doc

The doc itself is `design.md`, inside the design's folder. It holds two kinds of content:
**structured data** (the decisions, open questions, and components) and **prose** (the
design argument that references them). Keep them physically separate inside the file — the
data in fenced blocks a script can parse, the prose in plain markdown a person can read
[[D4]]. Whether that stays pleasant to hand-edit is one of the things the shakedown is
meant to find out, which is why [[D4]] carries a revisit condition rather than a gate.

The section order is fixed: frontmatter, `## Decisions`, `## Open questions`,
`## Components`, `## Design`. Structured content comes first because that's the review
order — the short lists are where a bad base hides, and I read them before the argument.

Frontmatter holds one hand-written field:

```yaml
status: draft            # exploring | draft | settled
```

The format carries three kinds of foundation, and fixes what each must record
[[req:foundations-are-expressible]]. That is the whole of what this design promises about
them: the kinds exist, the fields are known, and a reader can tell at a glance which kind
they are looking at. Whether an author had to write one, and whether what they wrote is any
good, are questions for the process and authoring designs.

The schemas favour brevity, and a field with a sensible default may be omitted rather than
restated on every entry [[req:foundation-default-fields]]: a requirement is `force: hard`
and `status: active` unless it says otherwise, and a fact is `status: active`. A decision's
`status` has no default — where it sits in review is the thing being tracked, so leaving it
implicit would defeat the point. **Nothing else is optional, and nothing is freeform**
[[D6]].

A *decision* records what was chosen, what would overturn it, and how far it has got
through review [[req:decision-structure]]: `id` (a short handle unique within the design;
cited as `[[D1]]`), `choice` (one line, what was decided), `falsified_if` (the condition
that would prove it wrong), and `status`, one of three:

- `proposed` — not reviewed yet, and not safe to build on.
- `accepted` — reviewed and safe to build on, but still a decision: scoped to this design,
  disposable with it, and it keeps its falsifier.
- `rejected` — considered and turned down.

None of them outlives the design [[req:decisions-belong-to-their-design]]. A decision is
this design's answer to a question another design might answer differently and just as
well, which is exactly what makes it a decision and not a requirement — and what makes the
whole design cheap to throw away.

**A promoted decision is deleted, not marked** [[D15]]. When a choice outgrows the design —
I adopt it as a requirement, or I test it into a fact — the knowledge moves to
`requirements.yaml` or `facts.yaml`, and the prose that cited `[[D1]]` is rewritten to cite
`[[req:...]]` or `[[fact:...]]`, because that is now what the claim rests on. What's left
behind is an entry nothing points at, sitting in the one list I read end to end at review
time. So it goes, leaving a comment line and an unreused id — the same treatment a dead
question gets, for the same reason.

Nothing records the promotion. Not a `promoted_to` pointer on the decision, and not a
provenance line on the requirement — both are hand-maintained copies of something git
already knows [[D9]], and neither changes what the requirement means. If a requirement
needs its origin story to be understood, the statement is inadequate and the fix is to
rewrite it, not to annotate it.

`rejected` is the exception that stays. Unlike a promoted decision, a rejected one's content
exists nowhere else; deleting it loses the fact that the option was ever weighed, and I'd
re-litigate it in six months. The promotion path moves knowledge somewhere better, so the
entry is redundant. Rejection doesn't, so it isn't.

An incomplete promotion is caught mechanically: delete the decision without rewriting its
citations and the leftover `[[D1]]` is an unresolved inward token.

If I can't state a falsifier, I don't understand the decision well enough to keep it
— what makes a falsifier real rather than a filled-in field is the authoring design's
question, not this one's. Whether it holds for boundary decisions as well as it does for
capacity ones is
still an assumption rather than a finding, recorded in the authoring design's facts.

An *open question* has `id` (cited as ``), `q` (the question), and optionally
`blocks`, a list of ids it gates. Omit `blocks` if it gates nothing specific.

A question that dies — answered, cut, folded into a sharper one, or re-filed as a revisit or
a fact — is deleted, leaving a comment line where it stood and its id unreused. That's deliberately weaker than how a fact
retracts. A superseded fact keeps a full entry because things were *built* on it and I need
to trace what leaned on the claim; an open question is by definition something nothing has
been built on, so there's no downstream to trace. A tombstone would just pad the one list
I'm supposed to read end to end at review time.

A decision may also carry `revisit`, a mapping with exactly one of `after` (a milestone —
`five components have shipped`) or `when` (an observed condition — `hand-editing a block is
painful enough that I reach for a generator`). It is `falsified_if`'s active twin:
`falsified_if` names what would make the decision wrong, `revisit` names the moment to go
look. A decision needs one only when it rests on something use will settle; most don't.

The failure mode is obvious and unpoliceable: `revisit` becomes a snooze button for
questions I could have answered by reading. The checker cannot tell a genuine deferred
unknown from a dodged gate — both are well-formed. Only the honest answer to *could I have
settled this today?* separates them, which makes this one of the few rules here that has no
mechanical backstop at all.

A *component* has `id` (cited as `[[C1]]`), `name`, `owns` (one line: the responsibility it
holds), and optionally `excludes` (the nearby responsibility it deliberately doesn't hold),
`depends_on` (component ids that must land first), and `grounds` (the facts, requirements,
and decisions it inherits). Components are the decomposition [[D10]]; what happens to one after that — that it becomes
a single PR, and a single unit of abort — is the process design's business, not this one's.

A *fact* records its claim, how that claim came to be believed, whether it still holds, and
what backs it [[req:fact-structure]]. Concretely: `id` (cited as
`[[fact:cursor-pagination]]`), `claim` (one line, small enough to verify on its own),
`backing` (`tested | documented | assumed`), `status` (`active | stale | superseded`), and
`sources` — every fact says how it came to be believed, even if that is only "observed in
my own setup". A fact that new evidence kills is marked rather than removed: an append-only
file with no retraction becomes confidently wrong, and keeping the dead entry is what lets
me trace what leaned on it. Optionally it has `risk` (one line: why this one might not
hold) and `test` (the path to the test that enforces it). `superseded_by` is required once
status is `superseded`.

A *requirement* records what is required, how firmly, and whether it still binds
[[req:requirement-structure]]: `id` (cited as `[[req:offline-first]]`), `statement`, `force`
(`hard | soft`), and `status` (`active | retired`), plus an optional `rationale`. It takes
no sources — a requirement is decided rather than discovered, so there is nothing to cite;
the rationale explains it instead.

**A source comes in two shapes**, and they're near mirror images:

- *Documented* — `url` + `where` + `quote` + `checked`. It locates a stable page and proves
  the claim against it.
- *Attested* — `description` + `checked`. It names something that can't be linked or quoted
  — an email exchange, a conversation with a vendor's engineer, my own testing on a staging
  box. The strength rides entirely on `backing` and whatever `risk` is attached.

**A `quote` is always a block scalar** — `quote: |` on its own line, text indented beneath,
even for a single line [[D13]]. This is the one place the format bends to the data instead
of the reverse. `quote` holds verbatim text from sources I don't control, which is exactly
where colons, `#`, leading dashes, and stray quote marks live, and any of those breaks an
inline YAML scalar. A block scalar takes them literally. Making it unconditional is what
makes it checkable — there's no judgment call at write time about whether *this* quote needs
escaping.

That points at the general trade in choosing YAML at all: it's the most pleasant of the
structured formats to read and the least forgiving to write. That's an acceptable bargain
only because a malformed file fails loudly at the checker  rather than rotting quietly
[[req:invariants-are-enforced-or-marked]]. Without the checker I'd want a format with
fewer sharp
edges.

**Every source needs exactly one locator.** A `url` obliges a `where`: a link to a
thirty-section page locates nothing, and the pairing is what makes a source jumpable rather
than merely present. When there's no url, `description` becomes required and *is* the
locator — "email exchange with the maintainer, 2026-06" is the only handle that source has.
A source with neither is unlocatable and fails the check. A url pointing inside this repo is
written from the repo root rather than relative to the file holding it, so an entry survives
being moved between scopes [[D3]] — a relative path rots silently the moment a fact
graduates.

Which is why `description` is omitted whenever a `url` is present. A title restating the
page the link already goes to is noise, and it's recoverable by fetching the url — the same
rule that keeps derived rollups out of the frontmatter [[D9]] applies to a source's own
metadata.

**`stale` is what happens when evidence evaporates.** Re-checking a source and no longer
finding the passage doesn't make the claim false — it makes it unsupported. The fact goes
to `status: stale`, `checked` gets the new date, and the claim stays put with its footing
gone. That distinguishes the two failure modes retraction has to tell apart: `superseded`
means I learned something better, `stale` means I lost the thing I knew it by. Building on
a stale fact is a flag, not an error, but it is never silent.

**There is no freeform field, anywhere** [[D6]]. That is deliberate rather than
minimalist: the absence is what forces an observation to its proper home instead of letting
it accumulate in a margin. Which home, for which kind of observation, is the authoring
design's rule rather than this one's.

Together those make retraction possible. When a fact dies, its sources are how I find out
whether the page moved, whether I misread it, or whether it was never load-bearing to
begin with.

Components carry `grounds` while decisions deliberately carry no backing field. The
difference is real: a decision's backing is *argued*, in the prose that cites it, and a
stored copy would just drift from the argument. A component's backing is *inherited* — it's
the brief you hand an implementer, and it needs to travel with the component rather than be
reconstructed from whichever paragraph happened to mention it. `depends_on` is the same
kind of thing: build order is genuine structure, not a restatement of the prose.

`## Design` is plain prose, the part a person reads. Load-bearing claims carry a `[[token]]`:

```
We use an event-sourced write model [[D1]] because the vendor API returns
cursors, not offsets [[fact:cursor-pagination]]. This assumes writes stay
under ~10k/s, which isn't confirmed yet.
```

**Why fence the data.** The fence is the delimiter. It draws a hard line between "parse
this" and "read this," so there's never a question of whether an indented line is a real
field or just prose that happens to look structured — which is the ambiguity a loose
markdown list leaves open. XML tags around every claim would solve the parsing but bury the
prose in markup; a fenced data block keeps the two cleanly apart.

The corollary is that facts and requirements are *not* fenced — they're plain `.yaml` files
[[D5]]. A fence earns its keep only where data and prose interleave. A facts file is data
end to end, so wrapping it in markdown would add a parse step and a second way to be
malformed for no gain.

**How to read the `[[tokens]]`** [[D8]]. A token is how a claim points at the foundation it
rests on, and it resolves to exactly one entry [[req:claims-can-cite-foundations]] — no
searching, no interpretation. It points in one of two directions:

- **Inward** — `[[D1]]`, ``, `[[C1]]` point at an entry declared in this same file.
  Hit `[[D1]]`, scroll up to the Decisions block for the actual choice and its falsifier.
- **Outward** — `[[fact:cursor-pagination]]` and `[[req:offline-first]]` point at an entry
  in a `facts.yaml` or `requirements.yaml` — this design's own, or the global one. Hit
  `[[fact:...]]`, and I know the claim rests on something already confirmed.

Tokens render literally, and there is no way to soften that: GitHub strips inline CSS
[[fact:no-inline-styles-in-gfm]], so the only lever is an allowed tag like `<sup>` or
`<small>` wrapped around the token. Tried and reverted — the wrapper costs more noise in the
source, which is where PR review actually happens, than it saves in the render. The bare
token stands until `falsified_if` on [[D8]] actually fires.

So the prose never asserts anything load-bearing on its own authority. Each claim points
either inward ("a choice I made — here's the falsifier") or outward ("rests on a confirmed
fact or a stated requirement"). Reading the doc means following those pointers, but only
the ones I doubt — I don't have to hold the whole thing in my head.

That's also what makes the agent-decision view computable rather than hand-maintained: a
decision cited in a paragraph that also cites a fact or requirement is grounded; one cited
in a paragraph with no outward token beside it is an agent decision, by definition
. Paragraph scope is a heuristic — narrower than the section, wider than the
sentence — and it's the part of the checker most likely to be wrong in practice.

**No dependency list in the frontmatter** [[D9]]. A generated `depends_on:` / `satisfies:`
rollup at the *design* level would be redundant: it's fully derivable from the outward
tokens in the prose, and storing a copy in the file just invites the exact drift we're
avoiding. So the frontmatter holds only what's hand-written — `status`. If a rollup is ever
useful ("every fact this design touches," a cross-design index), a script generates it on
demand, outside the doc.

**What the checker verifies** :

- Every block parses, and every entry matches its schema exactly — required fields present,
  enums in range, no unknown fields.
- Every inward token (`[[D1]]`, ``, `[[C1]]`) matches a declared entry in the file.
- Every outward token (`[[fact:*]]` / `[[req:*]]`) matches an entry in a facts or
  requirements file in scope, resolving design → area → global, and no slug is defined at
  more than one tier. A token resolving to a `superseded` fact is an error — that's
  precisely the case retraction exists to catch. A `stale` one is a flag: the claim may
  still hold, but nothing currently backs it.
- Every source is locatable: `url` implies `where`, and a source with neither `url` nor
  `description` fails.
- Every `revisit` carries exactly one of `after` or `when`. Every `quote` is a block scalar.
- Every declared decision and component is referenced at least once in the prose — an
  unreferenced one is either dead (cut it) or a hidden dependency the prose never admitted.
- Every *active* entry is reachable from within its own scope: a design-scoped one from its
  design, an area-scoped one from at least one design in that area — cited in the prose or
  named in a component's `grounds`. An entry nothing points at is either orphaned research or
  a claim something quietly depends on without saying so [[D14]]. Global entries are exempt;
  they exist independently of any one area, and may be waiting on a consumer not yet written.
- Every `depends_on` and `blocks` id resolves, and `depends_on` has no cycles.
- A decision gated by an unanswered open question via `blocks` is flagged as
  not-safe-to-build-on.
- The agent-decision view is emitted: every decision with no outward token in any citing
  paragraph.

What the checker does *not* do is evaluate a `falsified_if`. That condition is natural
language about the world; deciding whether it has come true is a review question, and the
checker's job is to put it in front of me, not to answer it.
