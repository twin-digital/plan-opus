# an implementer reads the projection, not the sources behind it

implement.md §1 tells every implementer to read `design-process show <product>` "then every requirements.yaml and decisions.yaml of the product's increments, in full" — the projection and the sources it was computed from. The same sentence says "the fold binds", which sits oddly beside instructing a second read of the un-folded inputs: if the fold binds, the sources are its input, not a second authority.

Measured on increment-process at 024 during the 023 build, 2026-08-05: show renders 130,420 chars and the raw increment sources 156,380, so following the instruction costs ~71k tokens per implementer where the projection alone is ~32k. Across the six implementers that run dispatched, the duplicated read was roughly 235k tokens, about 20% of the 1.15M the implementation spent.

What show omits is closed history — a rejected decision's rejection_reason, and the text of superseded entries. An implementer binding to the fold does not need those. So the change is to read the projection, and reach for an increment's own sources only when what the fold closed over is what you need.

Deliberately NOT proposed: trimming show's own content for implementers. Measured section sizes are decisions 73%, requirements 19%, coverage summary 6%, everything else 1% — so an implementer-only view saves 6-10%, three to four times less than the duplicate read, and the coverage summary is the only real planning-layer content. Filtering the fold by facet is worse than useless: d-i8rwe1sv makes facets labels no rule reads, and the best findings that run produced were cross-cutting ones an agent could only reach by holding the whole fold.

Touches implement.md and .claude/skills/implement-package; process-doc and prompts facets.
