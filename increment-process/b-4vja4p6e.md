---
tags:
  - tooling
  - design-validator
---

# A rejected decision's supersession still fires in the fold

Found on 2026-08-05 while working `wip-001-ratify-view`. `d-0qrp80dx` was ruled `rejected`, and
`npx design-process show increment-process` still reported `superseded: d-u3u3sbmb by
d-0qrp80dx`. Had the draft landed that way, the published `d-u3u3sbmb` would have been closed by
a decision the owner refused, leaving nothing in force stating surface identity.

A rejected decision is one the owner determined is not acceptable (`d-9s4d3ww2`), and
`process-reference.md` has a rejection closed by a replacement whose `supersedes` names it — so a
rejected entry is itself dead and should take no effect on the fold. Its `supersedes` firing
reads as a defect in the projection rather than a design choice.

Worked around in that draft by removing the `supersedes:` from the rejected entry by hand, which
is not something an owner ruling from the session can do.

There is a second, smaller thing behind it: `supersedes` takes one id, so a replacement cannot
both close the rejected entry it answers and close the published decision that entry was
replacing. The two rules — "a rejection is closed by a replacement naming it" and "a published
decision is closed by its replacement" — cannot both be satisfied by one entry.
