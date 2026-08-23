---
tags:
  - digests
---

# a digest section is sorted and grouped

A digest section renders its items in the order the window produced them, and a long section of
mixed senders reads as a list the user has to scan. Two per-section knobs were built once against
the old tree and never landed:

- **sort** — order items by a message field (sender, sender's domain, subject, when it arrived) or
  by an extracted tag, ascending or descending. Typed comparison over the stored canonical forms,
  so money sorts by currency then amount and an arrival time sorts numerically; items missing the
  value sort last either way.
- **group by sender or sender's domain** — one entry per sender, largest group first, item lines
  under a label rather than flat.

Both are configuration a user writes and a stored shape, so they want their own increment. The
design questions the old build answered by hand: whether a stale `sort.by` degrades to no
reordering or fails the run, and whether grouping is refused where a section is not a list.

Came out of closing pegasuspad/infrastructure#91, which built this against the pre-opus tree.
