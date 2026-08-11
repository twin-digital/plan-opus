---
tags:
  - surface
  - ratify-screen
---

# the ratify screen's mock frames disagree on blank rows between metadata blocks

`/design-process/ratify-screen@5`'s mock frames disagree on whether a blank row separates one
metadata block of the detail pane from the next.

- The `ratify` frame puts a blank row between `pinned(...)` and `because:`.
- The `scoped` frame runs `scope:`, `pinned(...)` and `because:` together with no blank rows.
- The `requirements` frame shows `because:` immediately under the rule, so it settles nothing
  either way.

Nothing in the `detail-pane.metadata` rules names the separation, and conformance cannot catch
the difference: both the mock reader and the frame shaper drop blank rows before comparing, so
either rendering conforms to both frames. The 036 build kept the separation the `ratify` frame
shows and rendered the new `scope:` block above `pinned(...)` with no blank row, which matches
the `scoped` frame beside it and the `ratify` frame's own habit of a blank row before
`because:` — a form neither frame states.

What an increment would settle: whether the metadata blocks are separated by blank rows, and if
so which pairs, stated in the `metadata` rules so the frames can be brought into line. Changing
either frame to match the other is a surface change, so it waits for a ruling rather than being
inferred from whichever frame is newer.
