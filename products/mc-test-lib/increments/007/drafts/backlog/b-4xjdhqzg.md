# Model entity-type registration, so a pack can test a lookup that misses

`EntityTypes` is listed under out-of-scope surfaces — declared in full and throwing — and
`src/generated/fakes/EntityTypes.ts` has `get()` throw `NotImplementedError`. Separately, `createServer()`
returns the *same static* `FakeEntityTypes` for every bundle, so even reaching past the throw leaves no
per-bundle state to arrange and any test-time reassignment leaks across test files.

That makes a pack unable to test the shape "is this entity type registered in this world" in either
direction, which is the check `mc-rpg-core`'s `d-xobjyw2e` puts on every library entry point — a pack whose
definitions may legitimately be absent has to detect that, and `EntityTypes.get` is the stable, non-throwing
way to.

What is wanted is a per-server registry a test can register types into and leave empty, so both branches are
arrangeable: `EntityTypes.get` returning a type, and returning `undefined`.

This is what `mc-rpg-core`'s `q-sf1l1ypo` puts to its owner. The alternatives there — an injected seam in the
consumer's public surface, or reassigning the static — both read as the hand-rolled double that
`minecraft-addon`'s `r-hear6pun` forbids, which is why the honest fix sits here.
