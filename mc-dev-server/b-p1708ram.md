# this fold is a stale duplicate of mc-dev-kit's

All 11 requirements were re-declared into mc-dev-kit at its increment 9 in edited form; this
fold has no decisions and no coverage, and three of its definitions now contradict the kit's:
pack membership (r-ca9w2614 "declares itself a behavior pack" vs kit r-zcdmh9p6 manifest-based,
both kinds), selection (r-739ulzr0 per-run argument vs kit r-u8cg9vi6/d-c1kvyord profile-only),
and stop semantics (r-tdif5vwf "tears it down" vs kit d-zo2yl18y worlds survive). Also
r-ca9w2614 (behavior-only discovery) makes r-o1lozc1k's optional resource-pack support
unreachable. Decide: retire the product, or re-scope it to the two claims the kit lacks
(r-7fnwuaqz remote Docker, r-kts1e4fb single world). Found by the 2026-08-09 vocabulary audit.
