# Carry-forward: the owner's rulings from the rejected shim spec cycle

The shim was specified once before, and the owner rejected that spec (July 2026). These rulings
survive the rejection and bind this increment's Plan loop. They are recorded here so the loop
honours them without the owner restating them.

## Lifted into requirements — constraints, not mechanisms, not open to reargument

Three constraints were ruled to lift into requirements rather than be re-decided. All three were
absent from the legacy `requirements.yaml` and enter this increment as converted requirements:

1. **One package** (`r-3dgnq0sp`): the aliased `@minecraft/server` surface, the fakes, and the
   runner tooling ship as `@twin-digital/minecraft-test-lib`.
2. **`instanceof` answers by class identity** (`r-956kxrsc`): a fake is an instance of the class
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

## Harvest landed

The shim cycle's probe evidence is in the pool: sixteen runs across
`evidence/minecraft/pack-testing.yml`, `evidence/javascript-modules.yml`,
`evidence/vitest-configuration.yml` and `evidence/package-manager-peer-dependencies.yml`, with
their artifacts under `evidence/minecraft/server-shim/` and the facts they back filed beside the
existing pools. The Plan loop reads them from there rather than re-running the probes.

The owner-approved module-surface rulings are this increment's entries: `r-qklf4op9` (injection
suites stay supported) amends the object-substitution fiat `r-wv395rgn`, `r-qayd22z2` (fake state
is instance-scoped) amends `r-892696vk`, and `d-bvhynmr8` narrows the entry-point ruling to the
root barrel — the layout of the module-surface and runner-tooling entry points is this
increment's design to make — superseding `d-19qu2ih2`. The fiat fact
`test-lib-supplies-the-module-surface-and-the-runner-tooling` records the amended commitment, and
`test-lib-does-not-intercept-the-module-import` is retired in its favour.

## The ESM ruling

q-2rr36skd resolved 2026-08-04: the merged package is ESM-only, as the adopted
nodejs-library@1 preset (r-ds3q3en9) already binds. The July note that the shim's writer
designs for CJS consumers too is superseded by the merge into the library; no new foundation
is needed — the adopted requirement is the answer.
