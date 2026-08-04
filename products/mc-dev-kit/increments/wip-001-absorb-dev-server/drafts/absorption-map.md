# Absorption map: mc-dev-server → mc-dev-kit

Working material for this increment's Plan loop. mc-dev-server and mc-dev-kit are one product:
the dev loop's entire input is the kit's pack set, and the boundary between them was carried by
eleven `f:dev-kit-*` facts that transcribe mc-dev-kit's own `requirements.yaml` into the facts
pool. This increment brings mc-dev-server's published requirements into the kit under a new
`dev-loop` facet, consolidated. The harness may still ship as its own package; the package set is
design work this increment does not do.

## Requirements (9 declared, from 11 absorbed)

| mc-dev-server id | title | new id |
|---|---|---|
| r-hay27p5n | one-command dev loop | r-8et233c9 |
| r-tdif5vwf | server lifecycle outlives the foreground | r-kfu7pcms |
| r-739ulzr0 | hosted packs are a selection | r-u8cg9vi6 |
| r-mty3gfy6 | deploy reconciles to built packs | r-pcq10f2b |
| r-gdsm5ykt | edit to live without disconnect | r-cekp2mcb |
| r-o1lozc1k | behavior packs required, other content optional | r-hpu39brj |
| r-582htwvl + r-zbrdnvnu | the pack/harness boundary | r-97fvutt9 |
| r-kts1e4fb | single-world scope | r-7lroj1cg |
| r-7fnwuaqz | remote Docker supported | r-whacwz1b |

New ids throughout: these are fresh declarations in this product, not amendments of another's.

## Consolidated

- **r-582htwvl + r-zbrdnvnu → r-97fvutt9.** Both stated one boundary from opposite sides —
  "a pack carries no deploy or publish scripts" and "the harness deploys built output and makes no
  assumption about how it was assembled." One requirement carries both, with both verification
  procedures.

## Not carried

- **r-ca9w2614 — packs discovered from the workspace.** Redundant inside this product. The kit's
  `r-zcdmh9p6` already fixes membership as source-manifest presence with "no marker field,
  keyword, or central list is required, and adding, removing, or renaming a pack needs no edit
  anywhere but the package itself"; `r-co6glnme` fixes the flat list of entries and `r-0l79om74`
  fixes discovery from a clean checkout with no build. The harness discovering packs *is* the
  kit's discovery, so the requirement restated a sibling design's guarantee across a boundary that
  no longer exists.
- **`pack-source-layout-is-fixed`** was retired before mc-dev-server increment 001 and never
  converted; its subject is settled by the kit's `r-zcdmh9p6` and `r-un786n7v`.

## Wording

Statements carry over substantively verbatim. Two changes for the new home: r-8et233c9 names the
harness once, so the term the other eight use has a referent inside this product; and r-u8cg9vi6
says "the packs the kit discovers" where the original said "the discovered packs", now that
discovery is this product's own requirement rather than an upstream fact.

## Facets

A `dev-loop` facet joins `discovery` and `build` in `product.yaml`. All nine requirements carry
it.

## Left for the Plan loop

- **The package set.** The harness is expected to ship as its own package beside the library.
  `packages:` in `product.yaml` is descriptive, so nothing is added there until the files exist;
  the decomposition is decision work this increment does not do.
- **The dev-server decisions and open questions.** mc-dev-server's increment 002 draft (PR #168)
  holds sixteen proposed decisions and five open questions. They are not carried here: several are
  written against the product boundary this increment removes, and three of the five questions are
  questions about the kit's API that stop being facts once the two products are one.
- **The `f:dev-kit-*` facts.** Eleven facts in `facts/minecraft/bedrock-server.yml` source
  mc-dev-kit's own requirements. Once the decisions that cite them are rewritten to cite the
  requirements directly, those facts have no remaining citations and are retired.
- **mc-dev-server itself.** Retiring the product is a separate change; this increment only adds.
