---
tags:
  - pack-runtime
---

# confirm a zero-damage hit reacts at a client the way a 0.5 one does

The pack writes a clamped hit's `damage` to zero (d-67dkvr3f). Knockback is measured and unchanged
by that write — `f:a-hit-written-down-to-zero-still-knocks-back`, peak speed 0.533–0.700 against a
vanilla control's 0.578–0.693 — but the flinch and the hurt sound render on the client and reach no
server log, so neither is observed for a zero write.

What covers them today is `f:a-clamped-hit-is-indistinguishable-from-a-vanilla-one-at-a-client`,
which the owner observed at a client against a hit written down to **0.5**. The engine could
plausibly tie the hurt animation to damage actually taken, in which case a zero write would be
silent where a 0.5 one is not, and r-ef113dxi's "flinch, knockback, sound, and panic as vanilla
would" would not hold.

The owner ruled this an accepted risk on 2026-08-07, reasoning that the measured knockback stands in
for the rest, and asked for a bug rather than a gate. This item is that bug's precursor: the check
is a client session like the one behind the existing fact — three villagers penned side by side,
one hit vanilla, one through a zero write, one cancelled, watched at a client.

Closing it means either a fact recording the zero write's client reaction, or a defect if it differs.
