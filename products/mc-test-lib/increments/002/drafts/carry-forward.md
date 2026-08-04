# Carry-forward: the owner's rulings from the rejected shim spec cycle

The shim was specified once before, and the owner rejected that spec (July 2026). These rulings
survive the rejection and bind this increment's Plan loop. They are recorded here so the loop
honours them without the owner restating them.

## Lifted into requirements — constraints, not mechanisms, not open to reargument

Three constraints were ruled to lift into requirements rather than be re-decided. All three were
absent from the legacy `requirements.yaml` and enter this increment as converted requirements:

1. **One package** (`r-3dgnq0sp`): the aliased `@minecraft/server` surface, the fakes, and the
   runner tooling ship as `@twin-digital/minecraft-test-lib`.
2. **`instanceof` answers by class identity** (`r-d5v1hzgp`): a fake is an instance of the class
   the aliased surface exports. Ruled to live in test-lib's requirements; increment 001 does not
   carry it, so it lands here.
3. **Install is one runner-config entry** (`r-uobnqsfg`): the consumer configures the runner in
   one entry and writes no setup file.

## Dropped

A fourth candidate — "misuse that leaves handlers unreached fails loudly" — was dropped. The
shim keeps only a weaker check: throw on a second install within one module-registry generation,
needing nothing from test-lib. The Plan loop does not resurrect the stronger form.

## Deliberately relitigated in this rebuild — not lifted

Two items are open for this Plan loop to argue afresh, on their merits:

1. The zero-boilerplate / no-hand-written-ordering ergonomics rule.
2. Whether the shim's version statement (`r-29dlrp9r`'s "states which version it was derived
   from") is inert or enforced.
