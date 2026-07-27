# Review a design's inputs

Read a design's `brief.md` and `requirements.yaml`, together with the pool facts they lean on, as a
set and propose what should
change before another cycle builds on them. Used before `generate-spec.md` starts its writer, after
`reject-spec.md` opens its pull request, and standalone whenever inputs have drifted.

**Target.** A design given as `<area>/<design>`, and the pull request holding its inputs, where
there is one.

**You must not have written or revised these inputs.** The point of this pass is a reader who has
not been inside the iteration. An author reads their own wording as obviously meant.

---

## Propose. Do not apply.

**Every finding is a suggestion on the pull request, and you change no file.** Requirements and the
brief are owner fiat, and facts are the owner's record of the world; an agent that quietly merges
two requirements has moved the line between what the owner decided and what was decided for them,
which is the line this repository exists to keep visible.

Post each as a review comment on the line it concerns, using a `suggestion` block wherever the
change is a concrete edit, so the owner can take it in one click:

````
```suggestion
    the fake never fabricates: a member whose behaviour has no fidelity reference …
```
````

A finding with no suggestable edit — "these two requirements now overlap; one should go" — is a
comment naming both and recommending which.

Where there is no pull request yet — the pre-generation run — the same findings go back to whoever
dispatched you, in the same shape: the entry each concerns, the edit you would suggest, and what the
next spec would do differently. Someone else decides what happens to them. You still change no file.

---

## What to look for

The questions iteration never asks, because each input was reviewed alone as it changed.

**Requirements, as a set.**
- Two that overlap, or one that has become a special case of another.
- One whose statement has drifted into describing a design rather than constraining one. A
  requirement that reads like an implementation is a decision wearing the wrong hat.
- One whose rationale argues for a choice the design made, rather than giving the constraint's
  reason for existing.
- One that is unsatisfiable alongside another, or that no longer has anything to bind.
- A requirement written to justify something a discarded spec did.
- One above design scope whose `applies_to` is wrong or missing: it binds designs it plainly was
  not written for, or omits the field and so binds its whole tier by default when it meant a
  subset. Every design it binds must honour it, so over-binding is not the harmless reading.

**Facts.**
- A claim its own cited evidence does not carry, or contradicts.
- A fact whose backing is `documented` on a paraphrase, or `tested` on a prose conclusion rather
  than captured output.
- A fact that was rewritten in place when its meaning changed, rather than superseded.
- A stale fact — still true, but gathered for a question nobody is asking. Say so; uncited facts are
  free to keep, and the owner may want it anyway.

**The brief.**
- Scope that the iteration moved without anyone editing it.
- A "done" statement the design has outgrown.
- A tension the brief names that has since been settled, or one that has appeared and is not named.

---

## Bound it

**At most ten suggestions.** If you have more, keep the ten that would change how the next spec is
written and say how many you dropped.

The test for every one: *would the next spec be written differently if this changed?* A wording
preference, a tidier phrasing, a count in a source description — these are not worth a comment here.
The inputs are about to be built on; the review is for what would misdirect that build, not for what
would read better.

If the inputs are in good shape, say so and post nothing. That is a real result and the likely one
after a long iteration.

---

## Report

- The verdict: what you would change before the next cycle, in a sentence.
- The suggestions posted, grouped by input file.
- **What you questioned and left alone**, and why — a requirement you suspect is over-specified but
  cannot argue down, a fact you would want re-probed. The owner may act where you would not.
- Anything you dropped for the cap.
