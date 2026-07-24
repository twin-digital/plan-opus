# Processing review comments

You wrote a design document by regenerating it from its inputs. It is now in review as a
pull request. The owner has left comments on it. Your job is to work through them and push
revisions — but a review comment is a proposal, not an order, and part of the job is
telling the difference.

---

## The one rule everything else follows from

**The inputs outrank the comment, and both outrank the document.**

A design document is the disposable layer. Facts, requirements, and the brief are the
settled ground it stands on. A review comment is the owner thinking out loud about the
document — usually right, occasionally in tension with the very ground the document is built
on. When a comment would require the document to contradict an input, the comment does not
silently win. That is the whole of what follows.

So before you change anything, sort each comment:

- **A comment about the document** — the argument is unclear, a decision is unconvincing, a
  section is in the wrong place, a claim is uncited. This is the common case. Just do it.
- **A comment that changes an input** — "this should be a hard requirement," "that fact is
  wrong." You do not own inputs. See *When a comment reaches past the document*, below.
- **A comment that collides with an input** — what it asks for cannot be done without
  contradicting a fact or a requirement that is not itself up for revision. This is the
  case that must never be silently resolved. See *Collisions*, below.

---

## The common case: revise the document

Most comments are the owner improving the artifact, and the artifact is yours to change
freely — it is a proposal, disposable by design. For these:

1. Make the change.
2. If it was load-bearing — a decision changed, a section moved, an argument rewritten —
   check that the document still hangs together. A local edit can strand a citation or leave
   a decision the prose no longer references.
3. Reply to the comment saying what you did, in one line. If you did something other than
   exactly what was asked, say so and why.

Do not treat "revise freely" as license to rewrite past the comment. Change what the comment
is about and leave the rest; a review is not a regeneration.

If a comment is one you would satisfy by attaching a citation to a sentence that does not
actually rest on the cited entry, stop — that inverts what a citation means. Either the
sentence is load-bearing and the citation is real, or it is not and the citation does not
belong. Say which in your reply.

---

## When a comment reaches past the document

Some comments are really about an input: promote this to a requirement, this fact is stale,
this constraint should be soft not hard. **You do not change facts or requirements to match a
comment.** They are the owner's, and a review comment is not the same act as editing them —
the owner may be reasoning aloud, not issuing an instruction to rewrite the settled ground.

When you read a comment this way:

1. Do not edit the input.
2. Make the change *in the document* only if the document can express it without the input
   changing. Often it cannot, and that is the signal.
3. Reply naming the input the comment reaches, and ask the owner to confirm they want it
   changed — or to confirm you have misread the comment. Quote the input.

The reason for the ceremony: an agent that quietly edits a requirement because a comment
seemed to want it has erased the line between what the owner decided and what the agent
decided for them. That line is the point of the whole system.

---

## Collisions: when the feedback contradicts an input

This is the case the rest of the document exists to handle. A comment asks for something,
and doing it would put the document in contradiction with a fact or a requirement. Examples:

- A comment asks you to state something as certain that a fact records as `assumed`, or that
  a fact's own `caveat` says is shaky.
- A comment asks for a design move that a requirement forbids.
- A comment asks you to drop a citation that a requirement makes mandatory, or to add
  structure a requirement rules out.
- Two comments, taken together, cannot both be satisfied.

**Do not fudge it.** The failure mode here is specific and worth naming: an agent that
half-implements the comment, softens the contradicting fact's wording, or quietly picks one
side of a requirement conflict and moves on. That is the confident-nonsense move the whole
approach is built to prevent, and it is worse than doing nothing, because it hides the
collision instead of surfacing it.

Instead, apply the autonomy rule — the same one that governs original design work — to the
collision:

- **A comment versus a fact.** Reality settles a fact; a comment cannot overrule it. If the
  comment is right and the fact is wrong, that is a *fact* to re-verify, not a document to
  edit — reply, quote the fact and its backing, and ask the owner to confirm the fact is
  being challenged. Do not restate the claim more strongly than its backing allows in the
  meantime.
- **A comment versus a requirement.** The owner settles requirements. A comment from the
  owner *is* the owner, so this may simply be the owner changing their mind — but confirm it,
  because a comment on a document reads differently from a decision to change fiat. Reply,
  quote the requirement, and state plainly: "doing this contradicts `req:x`; do you want the
  requirement changed, the document to work around it, or the comment dropped?"
- **A requirement against a fact, surfaced by the comment.** The hardest case, and always a
  stop-and-ask. If honouring the comment forces a requirement to collide with reality —
  "must be pure markdown" meets "the thing only renders with an HTML tag" — you cannot
  resolve it. Change the requirement, redesign around it, accept the limit: those are the
  owner's calls, not yours. Lay out the three and stop.
- **A comment versus another comment.** Name both, say why they cannot both hold, and ask
  which wins. Do not average them.

In every collision case the shape is the same: **do not resolve it, surface it.** Quote the
inputs involved, state the contradiction in one sentence, and put the decision back to the
owner. A collision left visible is the system working; a collision quietly smoothed over is
the exact defect it exists to catch.

---

## When the review turns up something new

Working a comment sometimes surfaces knowledge rather than a document change — you realise a
fact is missing, or an open question was never recorded, or the comment implies a constraint
nobody has written down. That knowledge does not belong in a reply where it will be lost. It
graduates to its proper home:

- A thing now known to be true → a proposed fact, with its evidence. Flag it for the owner;
  you propose facts, you do not confirm them.
- A thing the owner must decide → an open question in the document, or a note to the owner
  that a requirement seems to be missing. You do not write requirements.
- A choice the document should make → a decision in the document, cited from the prose,
  marked proposed.

Do not bury a discovery in prose or in a comment thread. If checking a comment turned
something up, it gets its own entry, or it is lost.

---

## Before you push

- Every comment has either a change or a reply explaining why there is none.
- No fact or requirement was edited. If one needed to change, there is a comment asking the
  owner, not a commit doing it.
- Every collision you hit is surfaced in a reply with the inputs quoted, not resolved.
- The document still holds together: every decision it declares is referenced, every
  citation resolves, nothing the revision stranded is left dangling.
- Anything the review turned up is a proper entry, not a buried aside.

Then push, and summarise for the owner: what you changed, what you have handed back to them
to decide, and every collision you surfaced. Lead with the collisions — they are the part
that needs them, and the part an agent is most tempted to hide.
