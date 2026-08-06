---
tags:
  - tooling
  - pools
---

# the pools should be searchable, and their content reachable

There is no way to ask the tooling what a pool holds. `bin/foundations.mjs --facts` does it for
facts; `schemas/` and `surfaces/` have nothing. An agent told to cite what is already there, or to
read the contract its model binds, greps for an identity header and hopes.

d-2mvbck4i names the resolution rule — scan the pool for the file whose identity header matches the
reference — because pool layout is not normative and the path is not derivable. That rule is right
and it means a human-or-agent-executed scan is the only way in. Tooling should do it.

Roughly what would help:

- resolve one identity to its file and print it: `design-process pool show /design-process/ratify-screen@1`
- list a pool, or filter it: every version of a name, everything a namespace holds, what is bound
  by some product's model and what is orphaned
- search content, not just identities — the thing an author needs before writing a new entry is
  "does something like this already exist", which is a text search over the pool with the identity
  and path in the result

The same question reaches facts, which already has a reader but not one that resolves a citation.
Whether this is one `pool` verb family or a widening of the facts surface is open. So is whether
`surfaces/` and `schemas/` are one searchable space or two — they are separate pools by
d-qwquvf78, but an implementer asking "what am I bound to" does not care which one an entry is in.

Motivation is implementer cost: every contract read today is a manual scan, and an author who
cannot cheaply find an existing entry writes a duplicate.
