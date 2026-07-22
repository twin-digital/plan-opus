---
status: draft
---

# Authoring

What makes the *contents* of a design acceptable, as distinct from its shape. The format
guarantees a decision carries a `falsified_if` field; this design says what makes the value
in it real. `doc-structure` is the grammar and this is the standard — and almost nothing
here can be settled by a machine, which is exactly what separates the two.

## Decisions

```yaml
- id: D1
  choice: anything a verification turns up becomes its own entry, never an annotation on another
  falsified_if: entry count grows faster than I can review it, without the extra entries changing a decision
  status: proposed

- id: D2
  choice: an unknown is filed by when it can be answered — a gate, a revisit on the decision, or an assumed fact
  falsified_if: revisit becomes where I park questions I could have answered by reading
  status: proposed
```

## Design

### A falsifier that could actually fire

The format requires a decision to carry a `falsified_if`; it cannot require that the
condition would ever fire. That gap is this design's to close
[[req:decisions-state-their-falsifier]]. A falsifier written to satisfy the field —
"if this turns out to be wrong" — passes every mechanical check and tells a reviewer
nothing. A real one names an observation: a threshold crossed, a behaviour seen, a count
exceeded. If none can be stated, the decision is not understood well enough to keep, and
the honest move is to cut it rather than dress it.

Whether that is always achievable is not settled. Capacity and performance decisions yield
sharp conditions easily; boundary decisions yield softer ones, and it remains an assumption
that they yield anything useful at all
[[fact:falsifiers-are-writable-for-boundaries]].

### What to cite

Only cite claims that carry weight [[req:explicit-intent]] — a claim is
load-bearing when some decision, component, or other claim would have to change were it
false. Motivation, illustration, restatement of something already cited, and editorial
asides all fail that test. If every sentence sprouts a token, the wall-of-equal-weight
problem comes back with brackets on it, and a doc where everything is cited signals exactly
as much as one where nothing is. When it's genuinely unclear, cut the sentence and see
whether the argument has a hole or just less colour.

### Filing an unknown

**An open question is a gate, and gates must be answerable now** [[D2]]. Putting an
unknown here asserts two things: that investigation could settle it today, and that
something is waiting on the answer. `blocks` is what makes the second half real — the
checker treats a gated decision as not-safe-to-build-on.

That contract is why not every unknown belongs here. An unknown that only *use* can settle
— whether a component stays PR-sized, whether hand-editing a fenced block stays tolerable —
cannot be answered by any amount of design-time work. Filing it as a gate is a deadlock: the
decision it blocks can never clear review, so the design can never settle, and the checker
will enforce that forever. Such an unknown attaches instead to the decision it might
overturn, as a `revisit` condition.

A third kind is about the method rather than the artifact — *can a useful falsifier be
written at all?* That is a claim about whether this way of working works, confirmed or
killed by evidence, which is precisely a fact with `backing: assumed` and a `risk` line. It
needs no bucket of its own.

The triage is one question: **could I answer this before I build?** Yes, and something rests
on it — open question. No, only building tells me — `revisit` on the decision. No, and it's
about whether the process itself works — an assumed fact. All three of this design's
original questions answered *no* while sitting in the *yes* bucket, which is what made them
feel unanswerable.

### Evidence

**Evidence is a quote, never a summary** [[req:evidence-is-verbatim]]. A source field that invites prose gets
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

**Absence of documentation is not `documented` backing.** A fact inferred from what a page
*doesn't* say is `assumed`, however carefully the page was read, because a doc omitting
something is not the doc denying it. `plugins-have-no-conventions-slot` is the example in
this design's own facts file: a real quote, a real locator, and `backing: assumed`, because
the quote bounds where the thing would have been rather than establishing it isn't there.

### Where a stray observation goes

Nothing in the format is freeform, so every observation has to land somewhere specific.
When checking a source turns something up that won't fit `quote` / `where` / `risk` /
`superseded_by`, that's the signal:

- A correction that narrows the truth belongs *in the claim*. If a fact needs a paragraph
  beside it to be read correctly, it isn't atomic yet — that's a rewrite, not an annotation.
- A retraction belongs in `status: superseded` plus `superseded_by`, keeping the dead entry
  so I can trace what leaned on it.
- A calibration ("this is the weakest thing here") belongs in `risk`, in one line. How to
  *test* it is an open question, not a note.
- **Anything newly discovered becomes its own entry** [[D1]]. Verification generates
  knowledge, and that knowledge has to graduate to a first-class fact or open question —
  buried in another entry's margin, it will never reach the decisions-and-questions review,
  which is the one place I actually look.

### What no checker can reach

**What the checker structurally cannot verify**. Every rule above is about a
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

So citation aptness needs a reader rather than a rule. Which reader, and what it may do
with what it finds, is the harness design's business; this design only fixes what it is
looking for.

Two constraints keep it honest. It **reports and never edits**, like every other reviewer
here — a reviewer that silently "fixes" a citation is
manufacturing the exact confidence this whole system exists to strip out. And its findings
are **spans, not essays**: quote the prose, quote the source, name one verdict from a fixed
set. That's the verbatim-evidence rule turned back on the reviewer itself — an auditor allowed to write
paragraphs about why a citation feels weak is the confident-prose problem one level up,
wearing a badge. Whether it can actually tell apt from adjacent often enough to be worth
reading is unsettled.
