# What the Implement phase replaces

Draft of increment 003's additions to the retirement record drafted in increment 001.

## Spec citation as evidence of compliance

**Retired:** the checker rule that every requirement binding a design must be cited somewhere in its
`spec.md`.

**Replaced by:** the coverage manifest, which maps every claim — requirement or decision — to
evidence that something checks it.

### Why

The rule was the only mechanical evidence of compliance the process had, and it was theatre: a
citation proves a document *mentions* a requirement, nothing more. An agent could satisfy it by
writing the requirement's name into a paragraph. With most of a spec restating its foundations,
citations were largely decoration.

It also could not survive the spec's removal, and requirement presets made its absence urgent —
adopting a newer preset increment ought to be able to fail, and with nothing checking compliance,
nothing would.

### A rejected replacement

"A decision addresses this requirement" was considered as a coverage kind and rejected. Traceability
is not coverage — it is the same mechanism under a new filename, proving only that something
mentions something. Coverage entries name evidence that something *checks* the claim.

## Wave tags on decisions

**Retired:** recording which wave proposed a decision.

**Why:** it was justified as telling the owner how much context the proposer had. With `pinned`
governing authority and coverage governing evidence, the tag routed nothing and answered nothing
anyone was asking.
