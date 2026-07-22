---
status: draft
---

# How to Plan

This design lays out the tools and process we will use to design Opus applications and
tools, in accordance with the current [vision (docs/vision.md)](../../../docs/vision.md).

It is also design #0: it is written in the format it specifies, so the format gets
exercised before anything is built on it.

## Decisions

```yaml
- id: D1
  choice: design docs are files in git, iterated on and reviewed as pull requests
  falsified_if: I stop opening PRs for designs, or a round trip costs more than editing in chat
  status: proposed

- id: D2
  choice: one folder per design, holding the doc and everything scoped to it
  falsified_if: designs routinely accumulate no scoped facts, requirements, or artifacts
  status: proposed

- id: D3
  choice: facts and requirements exist at three scopes — design, area, global — resolved nearest-first
  falsified_if: nothing ever graduates past its design, or the area tier stays empty across several areas
  status: proposed

- id: D4
  choice: structured data lives in fenced blocks inside design.md, not a sibling data file
  falsified_if: the blocks are edited by tooling more often than they are read beside the prose
  status: proposed

- id: D5
  choice: facts and requirements are plain YAML files, not YAML fenced inside markdown
  falsified_if: entries need enough surrounding prose that the file wants to be a document
  status: proposed

- id: D6
  choice: fixed schemas with no freeform fields on any entry type
  falsified_if: two consecutive designs need a field the schema lacks
  status: proposed

- id: D7
  choice: every decision must state a falsifier
  falsified_if: I routinely write untestable filler to satisfy the field
  status: proposed

- id: D8
  choice: load-bearing prose claims carry [[tokens]] pointing inward at ids or outward at facts and requirements
  falsified_if: I stop writing tokens, or rendered docs become unreadable through the brackets
  status: proposed

- id: D9
  choice: no stored dependency rollup on a design; it is derived from prose tokens on demand
  falsified_if: a cross-design index becomes a daily need and derivation is too slow to run live
  status: proposed

- id: D10
  choice: components are structured entries, and one component is one PR is one abort unit
  falsified_if: components are routinely split or merged mid-implementation
  status: proposed

- id: D11
  choice: a decision is grounded if its citing paragraph also cites a fact or requirement; ungrounded ones form the agent-decision view
  falsified_if: paragraph scope produces enough false flags that I stop reading the view
  status: proposed

- id: D12
  choice: mechanical signals flag a design for my attention; the abort decision stays mine
  falsified_if: a mechanical signal predicts my abort calls well enough that deferring to it would have been right
  status: proposed

- id: D13
  choice: the quality harness for this repo is a schema and citation checker, not lint and typecheck
  falsified_if: this repo grows enough executable code that the checker is the smaller half of the harness
  status: proposed

- id: D14
  choice: package the plugin only after the loop has run on two real designs
  falsified_if: another repo needs the loop before the shakedown finishes
  status: proposed

- id: D15
  choice: a source records a verbatim quote and a locator, never a summary; url+where or description, exactly one
  falsified_if: the sources I actually need turn out to be things with no quotable text
  status: proposed

- id: D16
  choice: anything a verification turns up becomes its own entry, never an annotation on another
  falsified_if: entry count grows faster than I can review it, without the extra entries changing a decision
  status: proposed

- id: D17
  choice: a quote is always a block scalar, unconditionally
  falsified_if: files still break on quoted text with the rule followed, or the ceremony makes me stop quoting
  status: proposed

- id: D18
  choice: every active design-scoped fact must be reachable from the design, and the checker enforces it
  falsified_if: I routinely add a citation only to satisfy the check, rather than because the claim rests on it
  status: proposed

- id: D19
  choice: whether a citation supports the claim it sits on is audited by a reader, in a component separate from the checker
  falsified_if: its findings are mostly false positives, or duplicate what the checker already caught
  status: proposed

- id: D20
  choice: a decision has three statuses; promotion deletes the entry and records provenance on the target
  falsified_if: I want to know what a design decided after the fact and the git history is too coarse to answer it
  status: proposed
```

## Open questions

```yaml
- id: Q1
  q: does paragraph-scoped grounding produce an agent-decision view I actually trust?
  blocks: [D11]

- id: Q2
  q: at real size, does a component stay small enough to be one reviewable PR?
  blocks: [D10, D2]

- id: Q3
  q: is a fenced-YAML design.md pleasant to hand-edit, or does it need generation and formatting to be tolerable?
  blocks: [D4]

- id: Q4
  q: can a useful falsifier be written for boundary decisions, or only for capacity and performance ones?
  blocks: [D7]

# Q5 folded into Q8 once fact:hook-events named the actual events. Id not reused.

- id: Q6
  q: how do the conventions travel to a new repo, given a plugin has no slot for a CLAUDE.md template?
  blocks: [C2, C7]

- id: Q7
  q: on a design I did abort, would the churn proxies have fired before I did?
  blocks: [D12, C6]

- id: Q8
  q: which hook event should the checker hang off — Stop, or the narrower FileChanged and TaskCompleted?
  blocks: [C4, D13]

- id: Q9
  q: can a reader reliably tell an apt citation from an adjacent one, or does it flag too much to read?
  blocks: [C8, D19]
```

## Components

```yaml
- id: C1
  name: repo scaffold
  owns: the docs tree, the global facts and requirements files, and their seeded entries
  excludes: any design content beyond this one
  grounds: [D2, D3, D5]

- id: C2
  name: conventions
  owns: CLAUDE.md — the autonomy rule, the citation rule, and the tactics boundary
  excludes: anything a script can enforce, which belongs to C3
  depends_on: [C1]
  grounds: [D8, req:explicit-intent, req:machine-holds-the-line]

- id: C3
  name: checker
  owns: parsing design.md blocks and YAML files, validating schemas and source shape, resolving every token, emitting the agent-decision view
  excludes: judging whether a design is any good
  depends_on: [C1]
  grounds: [D6, D8, D11, D13, D15, D17, req:node-for-tooling]

- id: C4
  name: harness wiring
  owns: the hook configuration that runs C3 automatically, and the checker's own tests
  excludes: CI configuration, which waits for the shakedown
  depends_on: [C3]
  grounds: [D13, fact:claude-code-hooks, fact:hook-events]

- id: C5
  name: design-new skill
  owns: the skill that scaffolds a design folder from the template, invoked as /design-new
  excludes: authoring guidance, which is C2
  depends_on: [C1]
  grounds: [fact:skills-are-the-command-unit, fact:template-skills-opt-out-of-model-invocation]

- id: C6
  name: coherence reviewer
  owns: the subagent that reads a design against facts and requirements and reports incoherence
  excludes: any authority to decide; it reports
  depends_on: [C3]
  grounds: [D12, fact:llm-cannot-pattern-match-architecture, fact:subagents-get-their-own-context]

- id: C8
  name: citation auditor
  owns: reading each load-bearing claim against the source it cites, and reporting overreach, adjacency, and uncited claims
  excludes: schema and token validity, which is C3; implementation drift, which is C6
  depends_on: [C3]
  grounds: [D8, D15, D19, req:explicit-intent, fact:subagents-get-their-own-context]

- id: C7
  name: plugin
  owns: bundling the skills, subagents, and hooks into one installable unit
  excludes: everything until the shakedown is done
  depends_on: [C2, C3, C4, C5, C6]
  grounds: [D14, fact:claude-code-plugins, fact:plugins-have-no-conventions-slot]
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
abort [[D10]], which is why the decomposition is the main artifact and gets a schema of
its own rather than a paragraph. Get the boundaries right and the big-PR problem and the
abort problem both shrink at once. Whether a component stays small enough for that to
hold at real size is not yet confirmed [[Q2]].

**Cheap to spot: chunky prose anchored to small kernels.** Good boundaries make a wrong
component cheap to remove. They do nothing to help me *find* it — a cleanly-decomposed
design can still be confident prose with nothing under it, wrong in a way I won't see
until it's built and failing. That's a different problem, and it's the one behind most of
the review fatigue, the "I can't see the intent," the wheel-spinning where I can't tell
what's off.

The fix is that chunky prose is only as trustworthy as the small, verifiable kernels it's
anchored to [[req:explicit-intent]]. The facts file holds the kernels — small claims I can
check one at a time. Citations are the anchors [[D8]]. The prose is allowed to be big and
in-flux precisely *because* every load-bearing part of it points at something small I can
verify on its own. That's what lets me review one claim without holding the whole design
doc in my head, which is the actual answer to the fatigue — boundaries don't touch that at
all.

### The knowledge model

Everything a project "knows" sorts on two questions: *does it survive throwing the design
away?* and *what makes it true?* That gives a handful of buckets, and they're worth
keeping separate because each is handled differently.

**Facts** — things discovered to be true, from docs or from testing. Reality decides them;
I don't get a vote. Each one should be small enough to verify on its own, and tagged with
how I know it: *tested* beats *documented* beats *assumed*. New facts get added freely.
*Changing or removing* a fact is the moment that needs review, because things were built
on it. Facts the final system must satisfy should become real tests, so they fail loudly
instead of sitting in a doc I have to trust [[req:machine-holds-the-line]].

**Requirements** — things I decide by fiat as the owner. No amount of testing overrules
them; I do. Tag them by force: a hard gate vs. a soft preference. One trap: I can only
decide things that are actually mine to decide. "Runs a million users on one box" isn't a
requirement, it's a guess about reality wearing a requirement's clothes. If it's really a
bet on what's possible, it's an open question until I've checked.

**Proposals** — proposed design. A proposal is a proto-design: it's true only if the
reasoning holds, and it's *supposed* to be disposable. It either gets abandoned or
graduates into a settled design doc. It should die and get rebuilt freely; that's aborting
working correctly. Every load-bearing claim in it cites what it rests on.

**Open questions** — things I know I don't know yet. They get their own bucket. Once
answered, one graduates into a fact (I tested it) or a requirement (I decided it).

**Agent decisions** — places the agent invented structure that isn't backed by any fact or
requirement. These aren't requirements — the agent has no authority to make requirements.
They're just proposed structure with nothing under it. I don't keep them as a separate
hand-maintained list; they're a *view*, computed from the citations [[D11]]. They die with
the design doc. Like open questions, they graduate: I accept it, I adopt it as a real
requirement, I test it into a fact, or I reject it.

Two things that look like buckets but are really just tags:

- **Assumptions** are just facts with the weakest backing (`assumed`). Keep them with the
  facts, but treat them as the most likely thing to blow up a base.
- **Preferences** are just requirements with soft force, and they're usually global instead
  of design-scoped [[D3]]. They live in the conventions layer and get cited, not
  re-decided, in each design doc.

The payoff: there are exactly two "not safe to build on yet" buckets — open questions and
agent decisions. Both graduate or die. That symmetry is what makes the next part simple.

### The autonomy rule

The whole point of sorting knowledge this way is to tell an agent when it's allowed to
decide and when it has to stop and ask. The test is: *who settles a dispute here?*

- **Build freely on** facts, requirements, and settled designs.
- **Decide on its own:** proposal vs. proposal (that's just design work), and proposal vs.
  fact (fact wins, redesign).
- **Stop and ask me:** fact vs. requirement, requirement vs. requirement, or anything still
  sitting in a "not safe yet" bucket.

The one to get right: a requirement that runs into a contradicting fact — "must work
offline" meets "the login provider needs a connection." Reality wins on what's *true*, but
the requirement doesn't just quietly lose. It's a decision only I can make: change the
requirement, redesign around it, or accept the limit. A lot of "feels off" is an agent
quietly fudging exactly this instead of flagging it. That collision is a stop-and-ask,
always.

### Repo layout

Design docs live as files, edited with commits, reviewed as PRs [[D1]]. That's the setup
that lets me point at an exact line, lets the agent and me both edit, keeps the reasoning
attached, and keeps each round cheap. My agents have their own git identities, so they can
commit and comment like any other contributor [[fact:agents-have-git-identities]].

It's just a doc, reviewed as a PR, merged when it's settled — no approvals, no numbering,
no assigned reviewers. The only things that matter: a dedicated home, PRs as the review
surface, and the habit of resolving designs instead of letting them pile up.

Each design gets its own folder, so the doc and everything scoped to it live together
[[D2]]:

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
│           ├── design.md          # the proposal → design doc itself
│           ├── facts.yaml         # facts discovered while working on THIS design
│           ├── requirements.yaml  # requirements scoped to THIS design
│           └── ...                # supporting artifacts (sketches, data, notes)
├── docs/                          # meta: vision, CONTRIBUTING, policies
├── .claude/
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

A design starts as a folder added in a PR, with `status: draft`. I iterate on the PR, merge
it when it settles (or to keep a living design around), and abandon it by closing the PR.
"Settled" is just `status: settled` on a merged folder — there's no separate directory to
move things into.

### The design doc

The doc itself is `design.md`, inside the design's folder. It holds two kinds of content:
**structured data** (the decisions, open questions, and components) and **prose** (the
design argument that references them). Keep them physically separate inside the file — the
data in fenced blocks a script can parse, the prose in plain markdown a person can read
[[D4]]. Whether that stays pleasant to hand-edit is one of the things the shakedown is
meant to find out [[Q3]].

The section order is fixed: frontmatter, `## Decisions`, `## Open questions`,
`## Components`, `## Design`. Structured content comes first because that's the review
order — the short lists are where a bad base hides, and I read them before the argument.

Frontmatter holds one hand-written field:

```yaml
status: draft            # exploring | draft | settled
```

**The schemas are fixed — these fields, nothing freeform** [[D6]].

A *decision* has `id` (a short handle unique within the design; cited as `[[D1]]`), `choice`
(one line, what was decided), `falsified_if` (the condition that would prove it wrong), and
`status`, one of three:

- `proposed` — not reviewed yet, and not safe to build on.
- `accepted` — reviewed and safe to build on, but still a decision: scoped to this design,
  disposable with it, and it keeps its falsifier.
- `rejected` — considered and turned down.

**A promoted decision is deleted, not marked** [[D20]]. When a choice outgrows the design —
I adopt it as a requirement, or I test it into a fact — the knowledge moves to
`requirements.yaml` or `facts.yaml`, and the prose that cited `[[D1]]` is rewritten to cite
`[[req:...]]` or `[[fact:...]]`, because that is now what the claim rests on. What's left
behind is an entry nothing points at, sitting in the one list I read end to end at review
time. So it goes, leaving a comment line and an unreused id — the same treatment a dead
question gets, for the same reason.

Provenance rides on the *target*, not the source: a requirement promoted out of a design
carries an attested source reading `promoted from the how-to-plan design, decision D1`. That
points in the direction that survives — the requirement outlives the design, the decision
doesn't — and it avoids storing a `promoted_to` pointer, which would be a hand-maintained
copy of a relationship [[D9]].

`rejected` is the exception that stays. Unlike a promoted decision, a rejected one's content
exists nowhere else; deleting it loses the fact that the option was ever weighed, and I'd
re-litigate it in six months. The promotion path moves knowledge somewhere better, so the
entry is redundant. Rejection doesn't, so it isn't.

An incomplete promotion is caught mechanically: delete the decision without rewriting its
citations and the leftover `[[D1]]` is an unresolved inward token [[C3]].

If I can't state a falsifier, I don't understand the decision well enough to keep it
[[D7]]. Whether that holds for boundary decisions as well as it does for capacity ones is
still open [[Q4]].

An *open question* has `id` (cited as `[[Q1]]`), `q` (the question), and optionally
`blocks`, a list of ids it gates. Omit `blocks` if it gates nothing specific.

A question that dies — answered, cut, or folded into a sharper one — is deleted, leaving a
comment line where it stood and its id unreused. That's deliberately weaker than how a fact
retracts. A superseded fact keeps a full entry because things were *built* on it and I need
to trace what leaned on the claim; an open question is by definition something nothing has
been built on, so there's no downstream to trace. A tombstone would just pad the one list
I'm supposed to read end to end at review time.

A *component* has `id` (cited as `[[C1]]`), `name`, `owns` (one line: the responsibility it
holds), and optionally `excludes` (the nearby responsibility it deliberately doesn't hold),
`depends_on` (component ids that must land first), and `grounds` (the facts, requirements,
and decisions it inherits). Components are the decomposition, and each one becomes one
implementation PR [[D10]].

A *fact* has `id` (cited as `[[fact:cursor-pagination]]`), `claim` (one line, small enough
to verify on its own), `backing` (`tested | documented | assumed`), and `status`
(`active | stale | superseded`). Optionally it has `sources`, `risk` (one line: why this
one might not hold), and `test` (the path to the test that enforces it). `superseded_by` is
required once status is `superseded`.

A *requirement* has `id` (cited as `[[req:offline-first]]`), `statement`, `force`
(`hard | soft`), and `status` (`active | retired`), plus optional `sources`.

**A source comes in two shapes**, and they're near mirror images:

- *Documented* — `url` + `where` + `quote` + `checked`. It locates a stable page and proves
  the claim against it.
- *Attested* — `description` + `checked`. It names something that can't be linked or quoted
  — an email exchange, a conversation with a vendor's engineer, my own testing on a staging
  box. The strength rides entirely on `backing` and whatever `risk` is attached.

**A `quote` is always a block scalar** — `quote: |` on its own line, text indented beneath,
even for a single line [[D17]]. This is the one place the format bends to the data instead
of the reverse. `quote` holds verbatim text from sources I don't control, which is exactly
where colons, `#`, leading dashes, and stray quote marks live, and any of those breaks an
inline YAML scalar. A block scalar takes them literally. Making it unconditional is what
makes it checkable — there's no judgment call at write time about whether *this* quote needs
escaping.

That points at the general trade in choosing YAML at all: it's the most pleasant of the
structured formats to read and the least forgiving to write. That's an acceptable bargain
only because a malformed file fails loudly at the checker [[C3]] rather than rotting quietly
[[req:machine-holds-the-line]]. Without the checker I'd want a format with fewer sharp
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

**Absence of documentation is not `documented` backing.** A fact inferred from what a page
*doesn't* say is `assumed`, however carefully the page was read, because a doc omitting
something is not the doc denying it. `plugins-have-no-conventions-slot` is the example in
this design's own facts file: a real quote, a real locator, and `backing: assumed`, because
the quote bounds where the thing would have been rather than establishing it isn't there.

**`stale` is what happens when evidence evaporates.** Re-checking a source and no longer
finding the passage doesn't make the claim false — it makes it unsupported. The fact goes
to `status: stale`, `checked` gets the new date, and the claim stays put with its footing
gone. That distinguishes the two failure modes retraction has to tell apart: `superseded`
means I learned something better, `stale` means I lost the thing I knew it by. Building on
a stale fact is a flag, not an error, but it is never silent.

**Evidence is a quote, never a summary** [[D15]]. A source field that invites prose gets
prose, and agent prose is exactly the confident-flat-text this whole system exists to
stop — so the file holding the anchors would grow the same disease it was built to cure. A
verbatim span is trap-resistant in a way a paraphrase can't be: it isn't in the agent's
voice, and it's checkable at a glance. It also beats a summary at the practical job — a
bare link to a thirty-section page proves nothing, because re-verifying means re-reading
the page, and a paraphrase just adds a second thing to distrust. A quote plus `where` is
jumpable.

That constraint is also the forcing function. Made to produce the actual passage, this
design's own sources corrected themselves twice: quoting the hooks page is what exposed
that a hook is no longer necessarily deterministic, and the claim that background
subagents open PRs turned out to have no citable page at all — it now sits in this
design's facts file as `subagents-open-prs`, superseded, named here in plain text rather
than cited, because citing a retracted fact is precisely what the checker forbids. Neither
correction came from writing notes. Both came from being asked to show the quote.

**There is no freeform field, anywhere** [[D6]]. That's load-bearing rather than
minimalist, because the absence is what routes things to their proper home. When checking
a source turns something up that won't fit `quote` / `where` / `risk` / `superseded_by`,
that's the signal:

- A correction that narrows the truth belongs *in the claim*. If a fact needs a paragraph
  beside it to be read correctly, it isn't atomic yet — that's a rewrite, not an annotation.
- A retraction belongs in `status: superseded` plus `superseded_by`, keeping the dead entry
  so I can trace what leaned on it.
- A calibration ("this is the weakest thing here") belongs in `risk`, in one line. How to
  *test* it is an open question, not a note.
- **Anything newly discovered becomes its own entry** [[D16]]. Verification generates
  knowledge, and that knowledge has to graduate to a first-class fact or open question —
  buried in another entry's margin, it will never reach the decisions-and-questions review,
  which is the one place I actually look.

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
under ~10k/s, which isn't confirmed yet [[Q1]].
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

**How to read the `[[tokens]]`** [[D8]]. Every load-bearing claim in the prose carries one,
and it points in one of two directions:

- **Inward** — `[[D1]]`, `[[Q1]]`, `[[C1]]` point at an entry declared in this same file.
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
[[D11]]. Paragraph scope is a heuristic — narrower than the section, wider than the
sentence — and it's the part of the checker most likely to be wrong in practice [[Q1]].

**No dependency list in the frontmatter** [[D9]]. A generated `depends_on:` / `satisfies:`
rollup at the *design* level would be redundant: it's fully derivable from the outward
tokens in the prose, and storing a copy in the file just invites the exact drift we're
avoiding. So the frontmatter holds only what's hand-written — `status`. If a rollup is ever
useful ("every fact this design touches," a cross-design index), a script generates it on
demand, outside the doc.

**What the checker verifies** [[C3]]:

- Every block parses, and every entry matches its schema exactly — required fields present,
  enums in range, no unknown fields.
- Every inward token (`[[D1]]`, `[[Q1]]`, `[[C1]]`) matches a declared entry in the file.
- Every outward token (`[[fact:*]]` / `[[req:*]]`) matches an entry in a facts or
  requirements file in scope, resolving design → area → global, and no slug is defined at
  more than one tier. A token resolving to a `superseded` fact is an error — that's
  precisely the case retraction exists to catch. A `stale` one is a flag: the claim may
  still hold, but nothing currently backs it.
- Every source is locatable: `url` implies `where`, and a source with neither `url` nor
  `description` fails. Every `quote` is a block scalar.
- Every declared decision and component is referenced at least once in the prose — an
  unreferenced one is either dead (cut it) or a hidden dependency the prose never admitted.
- Every *active* entry is reachable from within its own scope: a design-scoped one from its
  design, an area-scoped one from at least one design in that area — cited in the prose or
  named in a component's `grounds`. An entry nothing points at is either orphaned research or
  a claim something quietly depends on without saying so [[D18]]. Global entries are exempt;
  they exist independently of any one area, and may be waiting on a consumer not yet written.
- Every `depends_on` and `blocks` id resolves, and `depends_on` has no cycles.
- A decision gated by an unanswered open question via `blocks` is flagged as
  not-safe-to-build-on.
- The agent-decision view is emitted: every decision with no outward token in any citing
  paragraph.

What the checker does *not* do is evaluate a `falsified_if`. That condition is natural
language about the world; deciding whether it has come true is a review question, and the
checker's job is to put it in front of me, not to answer it.

**What the checker structurally cannot verify** [[C8]]. Every rule above is about a
citation's *shape* — that it resolves, that its target is active, that its source is
locatable. None of them touch whether the thing cited actually supports the sentence it's
attached to. Three failures live entirely outside the checker's reach:

- **Overreach** — the token resolves, but the prose asserts more than the source establishes.
  The fact `subagents-open-prs` in this design's own history is the example: it claimed
  background subagents open PRs, where the source says a *worktree-isolated background
  session* does, and only against a remote. Both the claim and its citation were perfectly
  well-formed.
- **Adjacency** — the quote is real and lands near the claim without grounding it.
  `plugins-have-no-conventions-slot` is exactly that: its quote bounds the region where a
  conventions slot would appear, but never establishes that none exists. It carries
  `backing: assumed` for that reason, and only because I happened to look.
- **Absence** — a load-bearing claim carrying no token at all. This is the one that matters
  most, and the checker is structurally blind to it: it validates what is on the page and
  has no way to know what should be there and isn't. Only a reader finds a missing citation
  [[req:explicit-intent]].

So citation aptness gets its own component [[D19]], separate from the checker and separate
from the coherence reviewer [[C6]] — different input, different cadence, different failure
mode, and by this design's own rule that makes it a different boundary [[D10]].

Two constraints keep it honest. It **reports and never edits**, like every other reviewer
here [[req:owner-decides-abort]] — a reviewer that silently "fixes" a citation is
manufacturing the exact confidence this whole system exists to strip out. And its findings
are **spans, not essays**: quote the prose, quote the source, name one verdict from a fixed
set. That's `[[D15]]` turned back on the reviewer itself — an auditor allowed to write
paragraphs about why a citation feels weak is the confident-prose problem one level up,
wearing a badge. Whether it can actually tell apt from adjacent often enough to be worth
reading is unsettled [[Q9]].

Only tag claims that carry weight — resting on a fact, meeting a requirement, or following
from a decision. If every sentence sprouts a token, the wall-of-equal-weight problem comes
back with brackets on it. The test: *would it matter if this claim were wrong?*

### The loop

1. **Capture first.** Write down the facts, requirements, and open questions before
   designing, so the design stands on solid ground and treats the rest as unsettled.
   Design-specific ones go in the design's folder; promote to global if they turn out
   broadly true [[D3]].
2. **Design the boundaries first.** The decomposition is the main artifact. Boundaries
   become PRs become abort units [[D10]].
3. **Write the design doc with citations.** Every load-bearing claim cites a fact or
   requirement, or flags itself as an agent decision with a falsifier — what would prove it
   wrong — not a justification [[D7]].
4. **Review the decisions, open questions, and components before the prose.** Those short
   lists are the entire place a bad base can hide; facts and requirements already have
   someone standing behind them. Handle each: accept, adopt, test, or reject.
5. **Clear the review before building on it.** A decision I haven't accepted, or an open
   question I haven't answered, isn't safe to build the dependent components on yet.
   Clearing the list *is* validating the boundaries.
6. **Build one component at a time.** One component, one PR [[D10]]. The agent owns all the
   tactical calls; the harness guards quality [[req:machine-holds-the-line]].
7. **Review only two things:** does it fit the agreed boundaries, and do the tests check the
   *right* behavior. Skim the rest [[req:review-at-the-coherence-level]].
8. **When it feels off, cut the component.** It's cheap, because it's local. Save what you
   learned into the facts file, and restart. Don't band-aid a bad base.

### Code-level decisions are the agent's

Param defaults, parameter objects vs. lists, fixture and test-double design — these are
cheap to reverse, so they're implementation-time calls and the agent makes them freely
[[req:sort-by-reversal-cost]]. They stay *off* the decisions list; flagging them would bury
the list in noise. Persistent tactical preferences ("param objects over long lists") live in
the conventions layer and get cited, not re-decided [[C2]].

Three exceptions:

- **Watch the blast radius.** A "param object" that becomes a shared type 40 modules import
  was never tactical — it's an interface. Sort by reversal cost, not by whether it sounds
  code-level.
- **Test pain is a signal.** Hard-to-test usually means badly-decomposed. Test design isn't
  something I spec up front, but when setup hurts, that's feedback about the boundaries.
- **Refactoring is after, not before.** It answers to the conventions and the tests, not the
  pre-implementation design.

And letting go of the tactics doesn't mean not reading the code. I still read it — for
boundaries and behavior — I just skim past what the linter already blessed.

### Catching ruts automatically

The tempting move is a GitHub Action that watches commits and kicks a PR into rework when it
spots a bad pattern. It doesn't work, though: a bad base is wrong at the level of design
coherence, and you can't regex that [[fact:llm-cannot-pattern-match-architecture]].

What does work, in two pieces:

- **Proxies as a smoke alarm.** Churn, a climbing revision count, a diff that grows while
  tests stay flat, a component that's suddenly wired into everything. These track with the
  band-aid spiral, but they're noisy and late, so they *flag for my attention* — they don't
  decide [[D12]]. Whether they'd fire before I do is testable against a design I already
  abandoned, and untested so far [[Q7]].
- **A semantic reviewer** [[C6]]. An LLM prompted to ask "does this still fit the agreed
  boundaries, or is it thrashing?" Run in CI, advisory only. The Action is fine as the
  trigger; it just can't be the judge.

Keep the abort *decision* mine [[req:owner-decides-abort]]. It's the highest-judgment call
in the loop, and it's hard *because* of sunk cost — handing it to a dumb classifier doesn't
fix that, it just stacks a bad decision on top of the pull I already feel. The real fix is
making abort cheap (good boundaries, small components) so the call is easy. Attack the cost,
not the decision.

The one check worth automating hard: a decision that contradicts a known fact. Both are
structured, so that collision is catchable by a script — at write time, instead of at file
80.

### Claude Code mechanisms

The workflow maps cleanly onto Claude Code's building blocks. Rough rule: a skill for
anything I invoke, whether it's a bare prompt template or real domain logic with scripts
beside it; a subagent when the work needs its own context window; a hook to run something
without being asked [[fact:skills-are-the-command-unit]].

| Piece | Building block | Notes |
|---|---|---|
| Conventions, exemplars, rules of engagement | **CLAUDE.md** [[C2]] | Read every session; where the autonomy rule and citation rule become ambient |
| Quality harness | **Hooks** [[C4]] | `PostToolUse` on `Edit\|Write` and `Stop` run the checker. Deterministic, can't hallucinate |
| Facts + requirements | **plain YAML** [[C1]] | Not a Claude feature, just disciplined files. Must-pass ones become real tests |
| Design doc authoring | **skill** `/design-new` [[C5]] | Scaffolds the folder + template. A template-only skill sets `disable-model-invocation`, so it fires when I ask and not otherwise [[fact:template-skills-opt-out-of-model-invocation]] |
| Schema + citation checker | **Node script** [[C3]] | Runs from hooks and from CI. The deterministic half of the review |
| Citation audit | **subagent** [[C8]] | Reads each cited claim against its source; reports overreach, adjacency, and uncited claims. Advisory |
| Coherence / consistency review | **subagent** [[C6]] | Its own context window [[fact:subagents-get-their-own-context]], with facts + requirements loaded; also the semantic smoke reviewer |
| Component implementation | **subagents** | A worktree-isolated background session commits, pushes, and opens a draft PR unasked [[fact:background-agents-open-prs]]. One validated component → one background session → one draft PR |
| The whole thing, reusable across repos | **plugin** [[C7]] | Bundles the skills, subagents, and hooks into one installable unit [[fact:claude-code-plugins]]. This is the repeatability mechanism — but it has no slot for a CLAUDE.md template [[fact:plugins-have-no-conventions-slot]], so the conventions need another route [[Q6]] |

Note what the harness is *here*: this is a design repo, so format, lint, typecheck, and test
mean the checker running over markdown and YAML, not a compiler running over source
[[D13]]. Which of the thirty hook events [[fact:hook-events]] it should hang off is
unsettled [[Q8]].

### Don't over-build it

The plugin is the finish line, not the starting line [[D14]]. Building the whole harness
before running the loop by hand is the exact premature-structure mistake this design is
against — I'd be committing to boundaries I haven't tested. Same "big rocks first" logic,
pointed at my own tooling: run it manually, let the real friction show me what to encode,
then package it. That's also the documented recommendation, for what it's worth
[[fact:docs-recommend-standalone-before-plugin]] — iterate in `.claude/`, convert when
there's something worth sharing.

### Bootstrap

Stand up `[[C1]]`, `[[C2]]`, `[[C3]]`, `[[C4]]`, and `[[C5]]` — and nothing else:

1. Scaffold the tree: `design/`, with `facts.yaml` and `requirements.yaml` at its root.
2. Write `CLAUDE.md` with the conventions and the rules of engagement (the autonomy rule,
   the citation rule, "tactics are the agent's, the harness guards them").
3. Write the checker, with its own tests.
4. Wire the checker into hooks so it runs without being asked.
5. Write one skill: `/design-new`.
6. Seed the global facts and requirements with the handful of invariants I already know.

Then stop. The citation auditor `[[C8]]`, the coherence reviewer `[[C6]]`, and the plugin
`[[C7]]` come later, built from real friction. Of the two reviewers, the auditor comes
first: the citation mechanism is the load-bearing claim of this whole design and nothing
yet tests whether it holds up under a reader.

The first two design docs after this one are a shakedown, not just two docs. Pick something
small but real, with two or three genuine agent decisions in it. The first runs the loop end
to end and cites the seeded facts, proving the citation mechanism closes. The second shows
me what the first missed — where the template's too heavy, which hook is absent, what a
CLAUDE.md rule failed to catch. Those findings are what goes in the plugin. Package the loop
I've already run, not the one I'm guessing at.

### Guardrails to keep

- Facts hold what I've *confirmed*, not what I *believe*. If it needs arguing, it's a
  proposal.
- Retraction is the most important and most-skipped part of the facts file. When new
  evidence kills a fact, mark it `superseded` with a `superseded_by` pointer and keep the
  history, so I can trace what relied on it. An append-only facts file with no retraction
  becomes confidently wrong.
- Flag, don't justify. Asking the agent to justify each decision invites confident nonsense.
  Ask what it depends on and what would prove it wrong.
- Don't decide feasibility by fiat. Requirements rule the design, not the world.
- Don't over-cite. Load-bearing claims only.
- Don't automate the abort decision. Make aborting cheap instead.
- "Let go of tactics" doesn't mean "stop reading the code." Skim the tactics; keep eyes on
  boundaries and behavior.
- No stored dependency rollup at the design level. It's derived from the inline tokens on
  demand, never hand-maintained.
- Package the plugin after two real runs, not before.
