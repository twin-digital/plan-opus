---
tags:
  - defect
  - process
---

# the post-Clarify review gate has a rubric and no agents

`docs/authoring.md` says its closing checklist is what "the post-Clarify review
gate's agents load as their rubric", and `.claude/skills/increment/plan.md` §3
repeats it. No such gate exists.

`.claude/skills/` holds `increment` and `implement-package` and nothing else,
and neither runs a review pass over foundations. `docs/process-reference.md`
never describes the gate — its only use of the phrase is the backlog having no
review gate at capture. The one artifact in the repository that loads the
authoring rules as a reviewer's rubric is `prompts/design/review-spec.md`, which
belongs to the retired regime: it reviews a `spec.md` under
`design/<area>/<design>/`, a directory that no longer exists, and nothing in the
process reference or the skills references `prompts/` at all.

So the rubric survived the migration to increments and the agents meant to apply
it did not. Of the fifteen checklist rows, the validator enforces parts of two —
the statement budget and the term checks. The rest are graded only by the agent
that wrote the entries, against its own work.

What that costs is not hypothetical. In one grinbox increment an agent shipped
thirteen entries as `accepted` that the owner never ruled, and wrote a `because:`
on a pinned decision that did not carry its statement. The owner caught both by
reading; nothing in the process did.

Either build the gate the two documents promise, or delete the promise and say
plainly that the checklist binds the author alone.
