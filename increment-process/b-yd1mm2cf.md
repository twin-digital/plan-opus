---
tags:
  - tooling
  - pools
---

# a fold could link to what it names

The projection prints a model entry's name, reference, and description, and none of the contract's
content — d-2mvbck4i says so explicitly and tells implementers to go read the pool themselves. That
is a hand-off the fold could shorten.

Consider having the fold carry links to what it names, so an implementer reading `show` can reach
the thing rather than reconstruct where it lives:

- a model entry's contract — the pool file the reference resolves to
- a citation — the increment source that declares the requirement or decision cited
- a fact's evidence — the run, and the artifacts under it
- a preset-adopted requirement — the preset product that declares it

Open questions this raises: what a "link" is when the reader may be a terminal, an editor, an agent
reading `--json`, or a person on a web view — a repo-relative path is the honest common
denominator, a file:// URL is not portable, and a URL into a forge assumes one. Whether the
projection should ever inline a contract's content rather than link it, which trades the
projection's size against the second read. And whether the link belongs to the rendered projection,
the json, or both — noting d-iuwoumr1 means the json shape is not something a consumer may pin.

A path is also the one thing the pool deliberately does not make derivable (d-rui9z0lc), so
printing one means resolving it, which is the same work item as pool search — the two are probably
one piece of tooling seen from two directions.

Motivation is implementer cost: an implementer working from the projection alone cannot see the
shape it is bound to, and every step it must take by hand is a step it can get wrong.
