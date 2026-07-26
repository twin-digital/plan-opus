# Reject a spec

A design was written, reviewed, and turned out to be the wrong design. This prompt discards it and
returns the design to its inputs, so the next cycle starts from what the attempt taught rather than
from what it built.

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

**Requirements are the point of the cycle, not collateral.** Writing a spec is how you find out
which requirements were wrong, missing, or more expensive than they looked. A rejection is where
that lands: the requirements come back refined — reworded, split, dropped, added — and the refined
set is what the next cycle builds on. Carrying them unchanged wastes the attempt; discarding them
wastes it twice.

Refining is the owner's act. Propose the changes and the evidence for each; the owner settles them.

---

## First, take the lesson out

Do this before touching a branch. A rejection that preserves the artifact and loses the reason has
thrown away the expensive part — the reason is what the attempt bought.

Work out what the attempt established that outlives it, and write each into an input:

- **Something now known to be true about the world** — an engine behaviour, a measurement, a cost
  observed — is a fact, with its evidence, under the bar in `CLAUDE.md`.
- **Something the owner now rules** — a constraint the attempt revealed, an approach that must not
  be taken again, a requirement that proved too expensive to keep as written — is a requirement
  change, proposed here and settled by the owner.
- **Something about the shape of the problem** — what is in scope, what "done" looks like now, a
  tension the attempt exposed — is a `brief.md` amendment.

A lesson that fits none of these is about the artifact rather than the design, and dies with it.
Say so rather than inventing a home for it.

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

The pull request body says what a reader needs and nothing about the discarded artifact's internals:

- **What was rejected and why** — a short, plain account. This is the durable record; the tag
  message is the long version.
- **The refined requirements**, each with what the attempt showed: reworded, split, dropped, added.
  This is the substance of the rejection and where review time belongs.
- **What else was carried** — the facts and artifacts kept, and the brief amendment.
- **What the next cycle should not assume** — anything the owner wants ruled out that has not
  become a requirement yet, flagged as still needing to.

With no published spec the design returns to `exploring`: inputs only, nothing settled. With one,
it stays on the published spec until the next cycle replaces it.
