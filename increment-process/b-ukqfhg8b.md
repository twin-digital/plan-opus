---
tags:
  - prompts
  - presets
---

# An agent-skill requirement preset

Increment wip-001-skill-composition captured `r-w2m32yl6` — "the instruction an agent receives
carries what applies to the work it was dispatched for and not what applies to a different
role, kind, or phase" — and raised `q-pd7w1o2w` asking whether that is genuine owner fiat or a
preference. The owner's answer: it is fiat, and it belongs in a preset rather than restated by
every increment that ships a skill.

So: an `agent-skill` requirement preset, adopted in bulk by any increment whose delta touches
an agent-skill package, carrying at least `r-w2m32yl6`.

Worth weighing when this is planned:

- `r-15psk4yp` (a rule governing more than one role is stated once, as narrowed) is the
  natural second member — it governs the same artifacts and was captured alongside.
- Presets already exist as a mechanism: `r-bwtud1e5` has the validator enforce adoption rules
  and identity conflicts, and requirement@1 carries the `version` required-when-adopted /
  forbidden-when-dropped conditional. So this is a preset to author, not a mechanism to build.
- Check whether the preset should also carry the authoring-side rules a skill is subject to,
  or only the composition ones. The two captured requirements are both about composition.
- If a preset can only be adopted whole, decide what an increment does when it ships one skill
  package among several of other kinds.
