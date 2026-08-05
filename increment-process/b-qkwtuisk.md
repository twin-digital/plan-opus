---
tags:
  - schema
  - pools
---

# non-breaking schema changes should not force a new pool version

Today a pool entry's version is the whole of its identity, so any edit to a schema or a surface
means a new version — and a new version means every source that wants the change opts into it by
hand. That is the right cost for a breaking change and too much for an additive one.

The case that prompted this: `requirements@2` exists because the model's contract key became
`surface:` alongside `schema:`. A source written against `@1` still parses fine under `@2`'s rules
— nothing was removed and nothing changed meaning. But `@1` and `@2` are separate pool entries, so
every increment carrying an `@1` source is frozen out of the addition until someone rewrites its
version field, and the pool now holds two near-identical files that drift apart.

Some directions, none of them ruled:

- Version on breaking changes only. An optional field, a widened enum, a new alternative in a
  `oneOf` — anything a document valid under the old rules is still valid under — edits the version
  in place. Then the pool's immutability rule needs a different shape, because today it is exactly
  "a published version's bytes never change" and that is what makes a fold reproducible.
- Keep strict versioning, but let a source declare a floor rather than a point — `requirements@>=1`
  or similar — so an additive change reaches every source that already tolerates it.
- Keep strict versioning, and make the additive case cheap instead: the validator reads an `@1`
  source under `@2`'s schema where `@2` declares itself a superset, so no rewrite is needed and
  the pool still holds one file per shape.

What has to be settled either way: what "non-breaking" means precisely enough for a gate to check
it (JSON Schema has no built-in notion of it), whether a fold at an old increment must still
validate against the bytes that were in force then, and what happens to a surface — the same
question lands on `surfaces/`, where a screen gaining a field is additive in exactly the same way.

Worth checking whether anything outside this repository has solved it already; schema registries
have compatibility modes (backward, forward, full) that name these cases.
