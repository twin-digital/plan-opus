# Amend a spec to realign with changed inputs

The owner changed an input — a requirement, a fact, the brief — on a design that already has a
draft `spec.md` and `decisions.yaml`. Your job is to bring the draft back into line with the new
inputs by **editing it in place**, not by rebuilding it from scratch. This is the default way
input changes reach a draft; full regeneration (`write-design-doc.md`) is the reserved fallback,
not the first move. Amending is cheaper, and — when the original author does it — keeps the
context that made the draft coherent in the first place.

**Target.** A design given as `<area>/<design>`; everything is under `design/<area>/<design>/`.

---

## Who should be doing this

The **original author, resumed with its context**, is the right agent to amend: it still holds why
each decision landed where it did and what it deliberately left out, so its edits stay coherent
instead of becoming a patch-job. Resume it rather than spawning a fresh agent whenever it is still
available. Only when that context is gone — a new session, or the agent has been reclaimed — fall
back to a fresh amender handed the current draft plus the input diff.

Unlike `write-design-doc.md`, you **do read the current draft** — you are editing it. Nothing here
is disposable-and-rebuilt; it is disposable-and-realigned.

---

## First, work on current state

Before editing, make sure the draft you are amending is the live one. The owner may have edited
the branch directly — accepting decisions, fixing prose — while you were away. Fetch and integrate
those edits first, so your amendment lands on top of them instead of clobbering them. A component
of coherence is not overwriting a change the owner already made by hand.

Then read what actually moved: `git diff` the input files (`requirements.yaml`, the pool fact files, the
brief) at the design and wider scopes, and read the changed entries at their new state. Work from
that diff, not from a description of it.

---

## Realign surgically

Change what the input changes touch; leave the rest. A review is not a regeneration, and neither
is an amend — do not rewrite past the change. For each input that moved:

- **A new requirement** — add the claim that rests on it and cite it. (Capture is free, so a
  requirement binding some other design can stay uncited here — but every live requirement that
  binds *this* one must be cited for the design to settle.)
- **A removed or renamed entry** — find every claim that cited it and update or drop it. A dangling
  `[[k:id]]` is the most common thing an amend strands.
- **A decision the owner rejected** — remove its citation and the mechanism it carried; a rejected
  decision may not be cited and blocks nothing. If the need it served still exists, that need now
  wants a different decision — propose one, or record an open question; do not leave the prose
  depending on the rejected choice.
- **A changed fact or requirement** — reread every claim that rests on it and correct any the new
  wording has made wrong. A quote that drifted from its source is a finding, not a silent fix.

You do **not** edit inputs to fit the draft — that inverts the direction. If realigning surfaces a
missing fact, an unrecorded open question, or a requirement that now seems wrong, it graduates to a
proper entry or a note to the owner (as in `process-review-comments.md`), not a buried change.

---

## When to stop and regenerate instead

Amending is the default, but it is not always the honest move. Stop and recommend regeneration
(`write-design-doc.md`) when either holds:

- **The drift is structural.** The inputs moved enough that surgical edits would leave a patchwork
  — the spec's organizing shape no longer follows from the inputs, and realigning it edit-by-edit
  would produce something less coherent than a fresh derivation.
- **The context has gone stale.** Enough amend turns have accumulated that the draft is carrying
  drift the original author can no longer see, or that author's context is gone and a fresh
  derivation would be cleaner than reverse-engineering the current draft.

Regeneration is the owner's call — surface the recommendation, say why, and let them choose. Do not
silently regenerate to dodge a hard amend, and do not force an amend that the drift has outgrown.

---

## Validate and hand back

Run `npm run check` and fix everything it reports — the draft must be well-formed again before you
stop. Then commit the changed files on the branch. Do **not** push or open a PR unless you were
told to; an orchestrator handles hand-off.

Return a compact note: what you changed to realign, anything you surfaced to the owner rather than
resolved, and — if you hit either stop condition above — that regeneration is the better path and
why.
