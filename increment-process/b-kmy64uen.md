---
tags:
  - process-doc
  - design-validator
---

# Facts should carry a title, as requirements and decisions do

A fact carries no title, so nothing names it but its id and its claim body. Requirements and
decisions both carry an optional `title` — `requirement@2` and `decision@3` each declare
`id`, `title`, `statement` — and the projection renders them as `### <id> — <title>`. A fact's
entry declares `id`, `claim`, `backing`, `status`, `reason`, `superseded_by`, `caveat`, `sources`
and nothing else, in `@1` and `@2` alike.

That cost nothing while ids were slugs: `f:entity-type-lookup-misses-return-undefined` said what it
was. `fact@2` requires `^f-[0-9a-z]{8}$` and puts nothing back, so a citation list is now opaque.
From a real projection:

```
because: f:f-o9dbstfj, f:f-i8fx23h0, f:f-86m69stq, f:f-o8xk7go5, f:f-i8kpwzfk, r-0lbj68w9, r-62r76czb, r-v1r7n10i
```

A reader checking whether a decision's citations carry it has to look up five ids by hand. The
same list with titles would be readable in place, which is what a decision's `because:` already
gets for the requirements and decisions in it — those resolve to titled entries in the projection.

Wanted: an optional `title` on a fact entry, the same one-line naming requirements and decisions
have, rendered wherever a fact is shown or cited.

Two things adjacent to it, worth ruling with it or explicitly not:

- **The claim is not a title.** A claim is a paragraph and often several, since it carries what was
  measured. It cannot be a heading, and truncating it would cut mid-sentence.
- **`f:f-` reads badly.** The citation prefix `f:` sits in front of an id that already begins `f-`,
  so every fact citation doubles the letter. Requirements and decisions have no prefix — they are
  cited bare as `r-0lbj68w9` and `d-uky2xju6`. Whether the `f:` prefix is still earning its keep now
  that fact ids are self-identifying is a separate question this raises rather than settles.

Workaround in use meanwhile, in `facts/minecraft/script-api.yml`: the old slug kept as a trailing
YAML comment on the id, `- id: f-o9dbstfj # entity-type-lookup-misses-return-undefined`. Nothing
validates it, nothing renders it, and it drifts the moment a claim is reworded.

Evidence: `schemas/design-process/fact.1.yaml`, `fact.2.yaml`, `requirement.2.yaml`,
`decision.3.yaml`. The projection line above is `npx design-process show mc-test-lib` on
`plan/mc-test-lib/entity-type-registration`, where the nine facts that increment adds were the
first in the repository to take `f-*` ids — every one of the 232 already in the pool still uses a
slug under `@1`.
