# What the incremental process replaces

Companion to `incremental-development.md`. That document states the process as it is meant to work. This
one records what it retires and why, so the reasoning survives without the affirmative document carrying
it.

---

## Wider requirement scopes

**Retired:** global-scope and area-scope requirements, the `applies_to` field, and `sets.yaml`.

**Replaced by:** requirement presets, adopted by a product at a pinned increment.

### Why

The flaw was not a gap in the rules — it was immutability violated from outside. **A published
increment's compliance could change without the increment changing.** Add a global requirement this
morning and a design that was complete last night is incomplete, having done nothing. The same held for
an `applies_to` that reached a design after the fact. No amount of care inside an increment defended
against it.

Pinning is the move that makes a durable claim possible at all. "Conforms to test262" is not a sayable
sentence, because the suite is living and a claim against it decays silently; CommonMark and the JSON
Schema test suite version cleanly because an implementation pins a frozen revision. Adopting
`nodejs-library@3` is the same shape.

### What else changed with it

**Set membership moved from the group to the member.** `sets.yaml` declared centrally which designs
belonged to a group. A product now declares what it adopts, so adding a product to a group is a change to
that product rather than to a shared file.

---

## Spec citation as evidence of compliance

**Retired:** the checker rule that every requirement binding a design must be cited somewhere in its
`spec.md`.

**Replaced by:** the coverage manifest, which maps every claim — requirement or decision — to evidence
that something checks it.

### Why

The rule was the only mechanical evidence of compliance the process had, and it was theatre: a citation
proves a document *mentions* a requirement, nothing more. An agent could satisfy it by writing the
requirement's name into a paragraph. The spec-value comparisons found that most of a spec restated its
foundations, which means citations were largely decoration.

It also could not survive the spec's removal, and requirement presets made its absence urgent — adopting
a newer preset increment ought to be able to fail, and with nothing checking compliance, nothing would.

### A rejected replacement

"A decision addresses this requirement" was considered as a coverage kind and rejected. Traceability is
not coverage — it is the same mechanism under a new filename, proving only that something mentions
something. Coverage entries name evidence that something *checks* the claim.

---

## Reversal cost as a decision attribute

**Retired:** the framing of decisions as carrying a designer-set "reversal cost", with escalation reading
off whether a change was cheap or costly.

**Replaced by:** `pinned` and `pinnedReason` on a decision.

### Why

"Costly to reverse" is one reason among several for wanting owner ratification before a decision changes,
and building the vocabulary around it made that one reason look like the whole category. Pinning names the
consequence directly — this cannot be freely overturned — and leaves the reasons open to grow as they are
understood.
