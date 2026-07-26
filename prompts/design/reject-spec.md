# Reject a spec

A design has been iterated on enough. Rather than amend it again, discard it and start the next
cycle from the inputs — which have been absorbing the learning all along and are most of what the
iteration produced.

This is a fresh start, not a post-mortem. The spec and its decisions go; the inputs get a final
review and carry on.

**Target.** A design given as `<area>/<design>`, and the branch or pull request holding the draft
being rejected.

---

## The rule that shapes everything else

**Inputs survive. Outputs die.**

`spec.md` and `decisions.yaml` are the disposable layer, and a rejection disposes of them. The
decisions in particular are the rejected design's own choices — they were reasoned from the inputs
to reach the shape being thrown away, so they go with it. Nothing carries them into the next cycle;
a fresh author reaching the same decision will reach it from the inputs, and if nobody reaches it
again it was not worth keeping.

| what | carries forward |
|---|---|
| `brief.md` | yes, amended with what the attempt taught about the problem |
| `facts.yaml` | yes, wholesale — an observation does not become false because a design failed |
| `artifacts/` | yes — the evidence the facts rest on |
| `requirements.yaml` | **yes, refined** — see below |
| `spec.md`, `decisions.yaml` | no |

**Requirements are the point of the cycle, not collateral.** Writing and reviewing a spec is how you
find out which requirements were wrong, missing, or more expensive than they looked, and most of
that has already landed in `requirements.yaml` by the time you get here. They carry on, reviewed
once more as a set. Discarding them would throw away the most valuable thing the iteration made.

Any further change is the owner's act. Propose it with the evidence; the owner settles it.

---

## The inputs have already moved

By the time a design is rejected it has usually been iterated on for a while, and the inputs have
been carrying the learning as it happened — facts corrected against their evidence, requirements
reworded, new facts recorded from probes and measurements. The rejection is not where that starts.
It is where it gets a last look.

So this is a **review**, not an extraction. Read the inputs as they now stand and ask:

- **Facts** — is each still true, and is each still evidenced? Iteration tends to leave facts that
  were gathered for a question nobody is asking any more. An uncited fact is fine and free to keep;
  a wrong one is not.
- **Requirements** — do they hold together *as a set*, read fresh? This is the question that never
  gets asked during iteration, because each was reviewed on its own as it changed. Look for two
  that now overlap, one whose rationale describes a design rather than a constraint, and one that
  was written to justify something the discarded spec did.
- **The brief** — does it still describe the problem, the scope, and what "done" looks like? Iterating
  on a design routinely changes the answer without anyone editing the brief.

Amend what needs it. If the iteration turned something up that never made it into an input, add it
now — but the common case is that the inputs are close to right and want a trim, not a harvest.

Do this lightly. Once the pull request is open, dispatch `review-inputs.md` to an agent that did not
work on this design: it reads the three files as a set and posts its proposals as review
suggestions the owner accepts or leaves. Restructuring the inputs yourself before that point turns
the owner's final review into a review of your restructuring, which is not the same act.

**Nothing may point at the rejected draft.** Not a fact source, not a brief line, not a requirement
rationale. A citation of a dead draft is how the next agent ends up reading it.

---

## Mechanics

**1. Preserve the tip.** Tag the branch head so the work is recoverable by a person without being in
anyone's way:

```
git tag -a rejected/<area>/<design> <branch-tip> -m "<why it was rejected, in a few lines>"
git push origin rejected/<area>/<design>
```

An annotated tag, not a branch: it does not appear in branch listings, nothing tracks it, and
nothing will be built on it by accident. The message is where the rejection rationale lives in
full — it is for people, not for agents. If the design has been rejected before, suffix the ref
(`rejected/<area>/<design>-2`).

**2. Close the pull requests.** Close, never merge. Comment on each with the reason and the tag
name, so a reader arriving from a link is not left guessing.

**3. Delete the working branch**, local and remote, once the tag is pushed. A branch that still
exists will be pulled, rebased, and built on.

**4. Open the inputs pull request from `main`.** Branch off `origin/main` — not off the rejected
branch, and not off anything descended from it:

```
git fetch origin main
git worktree add -b inputs/<area>-<design> .claude/worktrees/<area>-<design> origin/main
```

Apply the surviving inputs by **writing them, not by cherry-picking**: `facts.yaml` and `artifacts/`
as they stood, `brief.md` amended, `requirements.yaml` as the refined set. Then `npm run check`,
commit, and open a pull request against `main`.

Branching this way rather than reverting is what keeps the rejected draft out of the new history.

---

## If a previous spec is already published

This does not block the rejection, and it changes only what the design reverts to.

A published `spec.md` on `main` is the design's current state and stays that way. Rejecting a draft
built on top of it discards the draft; `main` keeps the last published spec, and the design reverts
to it automatically because the inputs branch comes from `main`. Other designs citing the published
spec keep working.

Two consequences to state in the pull request rather than work around:

- **The published spec now predates its inputs.** It was written against the requirements as they
  were, and the refined set has moved. It is still the current design and still buildable, but it
  no longer reflects fiat exactly, and the next cycle is what closes that gap.
- **The settle gate may fire** — a refined or added requirement that the published spec does not
  cite will fail `npm run check` as uncited. That failure is accurate: the design is mid-cycle. Land
  the inputs and the regenerated spec together if the gate blocks the merge, rather than pinning a
  citation to filler to clear it.

Do not rewrite published history to remove a merged spec. It is shared, and other designs may cite
it.

---

## Why the draft stays out of the new history

An agent writing the next spec is told to derive the design from the inputs. If the rejected draft
is reachable in the branch's history, it will be found — by a `git log`, by a stray grep, by an
agent being thorough — and once read it anchors the next attempt to the choices just rejected. The
tag keeps it recoverable for a person who wants it; the history keeps it out of the path of anyone
who does not.

This is the same reasoning as `write-design-doc.md`'s instruction to delete the old outputs without
reading them, applied to a case where deleting the file is not enough.

---

## Hand off

This pull request is the inputs' final review before another cycle builds on them, so the body puts
the reader in a position to give one. It says nothing about the discarded artifact's internals.

**It opens with what moved and why:**

> Updated requirements, brief, and/or facts (as relevant) based on draft spec iteration.
>
> Key changes:
> - …

That list is the durable record of the whole iteration — the one thing a reader a year from now
will actually use. Everything else in the body supports it:

- **Why the design is being restarted** — a short, plain account. The tag message is the long
  version.
- **What you amended in this pass**, and what you considered and left alone.
- **What you would question but did not change** — a requirement you suspect is over-specified, a
  fact nothing has cited in a while, a brief line the iteration outgrew. Review time belongs here.

### Getting the key changes right

**The list is the owner's, not yours.** Offer it rather than assert it: put the candidates you can
see in front of them as a multiple-select list, each one a short phrase they can accept or leave,
and include a free-text option for what you missed. They know which changes mattered; you know
which ones happened, and those are different lists.

Where the candidates come from depends on what you have:

- **You ran the iteration** — propose from your own context. Prefer the changes that would alter
  how the next spec is written: a requirement whose force or scope moved, a fact that was corrected
  or superseded, a scope line in the brief that shifted. Skip the mechanical ones; "fixed a
  count in a source description" is not a key change.
- **You did not** — derive them by diffing the inputs across the iteration
  (`git diff main...<rejected-tip> -- design/<area>/<design>/brief.md requirements.yaml facts.yaml`)
  and propose from that. Say that is where they came from, so the owner reads them as observed
  rather than remembered.

This is a deliberate exception to the repository's usual "do not ask, record" rule. That rule
governs an agent designing from settled inputs, where a question to a human is a substitute for
doing the work. Here the work *is* the owner's summary of decisions they made across an iteration,
and guessing it is how a rejection ends up with a plausible, wrong record of itself.

Then dispatch `review-inputs.md` against the open pull request, to an agent that did not work on
this design. Its suggestions land as review comments for the owner to accept or leave; you do not
apply them. Say in your hand-off that it has run, so the owner knows the review is complete rather
than pending.

With no published spec the design returns to `exploring`: inputs only, nothing settled. With one,
it stays on the published spec until the next cycle replaces it.
