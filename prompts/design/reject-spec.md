# Reject a spec

A design was written, reviewed, and turned out to be the wrong design. This prompt retires it and
returns the design to its inputs, so the next attempt starts from what is known rather than from
what was tried.

**Target.** A design given as `<area>/<design>` whose `spec.md` is **unpublished** — it exists on a
branch or an open pull request and has never merged to `main`.

**If the spec has merged to `main`, stop.** Its history cannot be removed without rewriting shared
history, and other designs may already cite it. A published spec is superseded, not rejected: leave
it in place, record what replaced it, and use `write-design-doc.md` for the replacement.

---

## The rule that shapes everything else

**Facts survive. Fiat does not.**

A rejection says the design was wrong. The design was derived from the requirements, so carrying
the requirements forward unexamined regenerates the same design with different words — which is the
most common way a rejection wastes the second attempt as well as the first.

| what | carries forward | why |
|---|---|---|
| `facts.yaml` | **yes, wholesale** | Observations do not become false because a design failed. A fact nothing cites is still true and still free to hold. |
| `artifacts/` | **yes** | The evidence the facts rest on. Throwing it away means re-running probes to learn what is already known. |
| `brief.md` | **yes, amended** | The problem is still the problem. What the attempt taught about scope or approach belongs here. |
| `requirements.yaml` | **no — each is re-affirmed or dropped** | These are the fiat that produced the rejected design. Re-affirming is a deliberate act, not a default. |
| `spec.md`, `decisions.yaml` | **no** | The thing being rejected. |

---

## First, take the lesson out

Do this before touching a branch. A rejection that preserves only the artifact loses the reason,
and the reason is the expensive part — it is what the attempt bought.

Work out what the attempt established that outlives it, and write each into an input:

- **Something now known to be true about the world** — an engine behaviour, a measurement, a cost
  observed — is a fact, with its evidence, under the bar in `CLAUDE.md`.
- **Something the owner now rules** — an approach that must not be taken again, a constraint the
  attempt revealed — is a requirement, and the owner writes it.
- **Something about the shape of the problem** — what is in scope, what "done" looks like now, a
  tension the attempt exposed — is a `brief.md` amendment.

A lesson that fits none of these is probably about the artifact rather than the design, and dies
with it. Say so rather than inventing a home for it.

**Nothing may point at the rejected spec.** Not a fact source, not a brief line, not a comment. A
citation of a dead design is how the next agent ends up reading it.

---

## Mechanics

**1. Preserve the tip.** Tag the branch head so the work is recoverable by a human without being in
anyone's way:

```
git tag -a rejected/<area>/<design> <branch-tip> -m "<why it was rejected, in a few lines>"
git push origin rejected/<area>/<design>
```

An annotated tag, not a branch: it does not appear in branch listings, nothing tracks it, and
nothing will be built on it by accident. The message is where the rejection rationale lives — it is
the one place the full story is kept, and it is for people, not for agents. If the design has been
rejected before, suffix the ref (`rejected/<area>/<design>-2`).

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

Apply the surviving inputs by writing them, not by cherry-picking: `facts.yaml` and `artifacts/` as
they stood, `brief.md` amended, `requirements.yaml` holding only what the owner re-affirmed. Then
`npm run check`, commit, and open a pull request against `main`.

Because `main` never held the spec and this branch descends only from `main`, the rejected design is
absent from the new history — the point of branching this way rather than reverting.

---

## Why the history matters

An agent writing the next spec is told to derive the design from the inputs. If the rejected spec is
reachable in the branch's history, it will be found — by a `git log`, by a stray grep, by an agent
being thorough — and once read it anchors the next attempt to the choices that were just rejected.
The tag keeps it recoverable for a person who wants it; the history keeps it out of the path of
anyone who does not.

This is the same reasoning as `write-design-doc.md`'s instruction to delete the old outputs without
reading them, applied to a case where deleting the file is not enough.

---

## Hand off

The pull request body says what a reader needs and nothing about the artifact's internals:

- **What was rejected and why** — a short, plain account. This is the durable record; the tag
  message is the long version.
- **What was carried forward** — the facts and artifacts kept, the brief amendment, and
  **explicitly, which requirements were re-affirmed and which were dropped**. That list is the
  substance of the rejection and the thing to review.
- **What the attempt taught**, as the inputs that now hold it.
- **What the next attempt should not assume** — anything the owner wants ruled out that is not
  already a requirement, flagged as still needing to become one.

The design returns to `exploring`: inputs only, no spec, nothing settled.
