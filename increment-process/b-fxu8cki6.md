---
tags:
  - process-doc
  - presets
---

# d-x0q4xgd8's one-draft-per-tree rule does not say "of the same product"

`d-x0q4xgd8` says "a tree holding two draft increments that are not ancestor and dependent is
not supported", without scoping that to one product. A coordinated cross-product change needs
several drafts in one tree — the preset-hierarchy landing carried `increment-process` and
`minecraft-addon` drafts together, and had to: `increment-process` retiring `r-w2m32yl6` and
`r-15psk4yp` is only valid because `agent-skill` declares them in the same landing.

**The owner ruled on 2026-08-04 that two products in one tree is fine.** Recorded here rather
than as an amendment, because the existing text arguably already covers it — drafts that must
land together are dependent, even when they are one commit rather than a stack.

Worth settling in words when someone next touches the draft-increment rules, since the next
agent to hit it will ask the same question. If it is narrowed, the shape is: the rule is
per-product, and drafts of different products share a tree freely.

`d-jcvr833x` is the neighbouring decision — a shared ordinal is the detectable case, and an
unsupported pair is prevented by the skill rather than caught by the gate.
