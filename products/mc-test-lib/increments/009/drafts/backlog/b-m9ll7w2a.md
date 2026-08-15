# The fakes cannot express a type family, so a provenance check has no code-test

mc-dev-kit's vendoring increment adds a provenance check that reads an entity's type families to
decide whether the definition that resolved was its own pack's (d-wj60379v, pinned public-api,
resting on tested fact f-1yo29upp). The kit's new engine-side package has to test that check, and
against `@twin-digital/minecraft-test-lib` it currently cannot:

- `EntityTypeFamilyComponent.getTypeFamilies()` and `hasTypeFamily()` both throw `NotImplementedError`.
- `addComponent` refuses a state argument for a non-attribute component, so a family list cannot be
  seeded onto a fake entity.
- The `families` and `excludeFamilies` query fields throw as well, so a family-filtered
  `getEntities` cannot be exercised either.

So the fakes cannot express "an entity carrying this pack's family", which is the entire subject of
the decision. The alternatives are a hand-rolled double — weaker evidence for a pinned public-api
decision — or a manual in-engine check for something a code-test should reach.

What the engine actually does is measured and available to build against: f-1yo29upp records that a
custom family reads back from the component's `getTypeFamilies()` and `hasTypeFamily()`, from
`Entity.matches({ families })`, from `Dimension.getEntities({ families })`, and from the
`@e[family=]` command selector, and that an entity reports no family its definition did not declare.

Surfaced by the survey of mc-dev-kit's wip-011; the need becomes real when that increment is built.
