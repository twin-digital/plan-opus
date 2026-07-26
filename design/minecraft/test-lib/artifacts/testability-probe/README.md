# Testability probe

The pack survey beside this folder measures which `@minecraft/server` APIs public packs
*reference*. Referencing an API is not the same as needing it to write a test — a pack may call
`system.runInterval` in a bootstrap file while its interesting logic is plain functions. This probe
measures the difference.

Three packs from the survey, chosen for different shapes and all near the sample's median size:

| pack | commit | lines | shape |
|---|---|---|---|
| `BlaizerBrumo/SafeGuard` | `9f78f03d43` | 2,156 | anticheat/admin, component-heavy |
| `ForestOfLight/Statistic-Display` | `cd4c89e86f` | 2,129 | 21 event subscriptions, the most event-driven of its size |
| `JaylyDev/terminator` | `5e5b4ee0b6` | 3,325 | entity behaviour |

## Method

For each pack, the ten units a developer would most plausibly unit-test — functions carrying real
decisions, not event wiring or config — were read against the built member lists of the design's
first spec, which has since been discarded,
and each was given one of three verdicts: **testable as specified**, **blocked** (naming what is
missing and quoting the pack line that needs it), or **testable with a seam change** (naming the
refactor and judging whether a pack author would accept it).

The three verdicts matter. Collapsing "seam change" into "blocked" overstates the gap; collapsing it
into "testable" hides a real cost. Each probe also recorded what the fake gets *right* that a
hand-rolled double would get wrong, so the library's value sits in the record beside its gaps.

## The surface these verdicts were measured against

Stated here because the spec that defined it no longer exists, and a verdict is only readable
against a surface. Every "blocked" below means blocked by this list, not by anything the design
must keep.

- **`World`** — `getDimension`, `getAllPlayers`, `scoreboard`, `gameRules`, `isHardcore`, `seed`,
  `afterEvents`, `beforeEvents`. Dynamic properties, `getPlayers`, `getEntity` and `sendMessage`
  were **stubs**.
- **`Dimension`** — `id`, `heightRange`, `localizationKey`, `spawnEntity`, `getEntities` in its
  no-argument form only. Every block-shaped member was a stub.
- **`Entity`/`Player`** — identity, location and dimension, rotation and velocity, the tag methods,
  `getComponent`/`getComponents`/`hasComponent`, the four effect methods, `applyDamage`, `kill`,
  `remove`, and `Player.name`. Dynamic properties, `runCommand`, teleport and impulse, the
  view-direction and AABB queries, and the eight `is…` state flags were stubs.
- **Components** — all of them attachable and answering identity members; only the attribute-shaped
  ones behaved further.
- **Events** — all 55 after-event and 13 before-event signals registrable; only `entityHurt`,
  `entityHealthChanged`, `entityDie` and `entityRemove` ever delivered, and only those four had
  payload classes.
- **Absent entirely** — `ItemStack`, `Container`, `Block`, `BlockPermutation`, `System` and any
  clock, the static type registries, and the startup phase.

## What this cannot support

**Nothing was executed.** The library does not exist. Every verdict reads the spec's member lists
against the pack's source; none reports a test that ran. Ergonomics — how much setup a covered unit
needs — is unmeasured.

**Three packs, three authors, three genres.** Each probe says so in its own words, and each is
right: the anticheat result may be a genre effect, the statistics pack is nearly pure persistence,
and terminator turned out to be a block-manipulating, tick-scheduling pack that is merely *about* an
entity. Convergence across the three is the signal worth reading; any single ranking is not.

**"Blocked" means blocked for the code as written.** Most blocked units are one seam away, and where
a probe judged a seam acceptable it says so. Those judgements are contestable and are recorded per
unit so a different call can be made without redoing the work.
