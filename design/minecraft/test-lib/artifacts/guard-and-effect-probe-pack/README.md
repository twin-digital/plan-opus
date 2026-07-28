# mc-test-lib guard-and-effect probes

A third Bedrock behavior pack for `minecraft/test-lib`, covering two points the earlier packs
(`../engine-probe-pack`, `../resting-state-probe-pack`) left open:

- **`mctest3:guards`** — the 27 `Entity` methods whose validity guard the reflective sweep never
  reached. That sweep called all 46 methods with no arguments; 19 threw `InvalidEntityError` and 27
  threw `TypeError: Incorrect number of arguments to function.` before the guard ran (fact
  `arity-checked-before-validity-guard`). For those 27 the guard is **unobserved, not shown
  absent**, which is what `invalidation-guard-list-complete`'s "every other member throws" is
  generalizing over. This set calls each of the 27 with arguments of the declared types, so the
  arity check passes and the call reaches whatever comes next.
- **`mctest3:effects`** — open question `effect-duration-comparison-basis`: when `addEffect`
  re-adds an effect at the same amplifier, does the engine compare the incoming duration against
  the duration **originally applied** or the duration **remaining**? Every sample behind
  `effect-replacement-rule-observed` re-applied a value at or above the duration originally
  applied, which both readings satisfy.

Each probe emits observation lines — it reports what the engine did rather than asserting what it
should do — and its output is transcribed into `../../facts.yaml` the same way. There are no
results yet: this pack is the instrument, not the answer.

## Install

1. Copy this folder into the world's or server's `behavior_packs/` (or
   `development_behavior_packs/`) directory and enable it on a world. No experiments are required:
   the script module targets stable `@minecraft/server` 2.8.0.
2. Add it to the world's `world_behavior_packs.json` with this manifest's uuid
   (`2dd3e74b-f52c-4e93-ba18-2a5d4f3f2de2`) and version `[0, 1, 0]`, then **restart the server** —
   `/reload` does not register a new custom command, and a manifest version bump must be mirrored
   in `world_behavior_packs.json`. Check the boot `Pack Stack` lines for
   `mc-test-lib guard-and-effect probes` before trusting a run.
3. Cheats must be enabled (the commands are registered at `GameDirectors` permission).

This pack uses the `mctest3:` command namespace, so it can be enabled alongside
`engine-probe-pack` (`mctest:`) and `resting-state-probe-pack` (`mctest2:`) on the same world
without colliding. The `[mctest]` line prefix is shared deliberately, so one log filter collects
every pack's output; probe names disambiguate.

## Run

As a player in the world:

```
/mctest3:guards
/mctest3:effects
```

or, from the server console (the path both earlier runs actually used), naming a source entity
that stays inside the loaded ticking area:

```
execute as <entity> run scriptevent mctest3:guards
execute as <entity> run scriptevent mctest3:effects
```

A single probe can be named as the message argument:

```
execute as <entity> run scriptevent mctest3:guards entity-property-discovery
execute as <entity> run scriptevent mctest3:guards guard-with-correct-arity
execute as <entity> run scriptevent mctest3:effects effect-duration-basis
```

Run the `scriptevent` form `execute as <player>` or otherwise from inside the loaded ticking area:
a run driven from outside it fails with `LocationInUnloadedChunkError` when probes spawn. Prefer a
**stationary** source (an armor stand at a fixed point well inside the ticking area) — a wandering
source crashed every probe in an earlier run once it left the area.

`mctest3:guards` takes a few seconds. **`mctest3:effects` takes roughly 90 seconds**: 11 cases,
each waiting 150 ticks for the base effect to decay. Do not assume it has hung; it emits one block
of lines per case as it goes.

Every line appears both in chat (`world.sendMessage`) and in the content log (`console.warn`), so
a dedicated server can collect them from the log file.

## Set A — `mctest3:guards`

### The 27 methods and the arguments used

Taken from the pinned 2.8.0 `index.d.ts` `export class Entity`. Every value is of the declared
parameter type, so the arity check passes and the call proceeds.

| Method | Arguments |
|---|---|
| `addEffect` | `'minecraft:speed', 20, { amplifier: 0, showParticles: false }` |
| `addItem` | `new ItemStack('minecraft:stone', 1)` |
| `addTag` | `'mctest_tag'` |
| `applyDamage` | `1` |
| `applyImpulse` | `{ x: 0, y: 0.1, z: 0 }` |
| `applyKnockback` | `{ x: 0, z: 0.1 }, 0.1` |
| `getComponent` | `'minecraft:health'` |
| `getDynamicProperty` | `'mctest_prop'` |
| `getEffect` | `'minecraft:speed'` |
| `getProperty` | the discovered entity property id (see below) |
| `hasComponent` | `'minecraft:health'` |
| `hasTag` | `'mctest_tag'` |
| `lookAt` | the run's own location |
| `matches` | `{ type: 'minecraft:sheep' }` |
| `playAnimation` | `'animation.quadruped.walk'` |
| `removeEffect` | `'minecraft:speed'` |
| `removeTag` | `'mctest_tag'` |
| `resetProperty` | the discovered entity property id |
| `runCommand` | `'tag @s add mctest_cmd'` |
| `setDynamicProperties` | `{ mctest_prop: 1 }` |
| `setDynamicProperty` | `'mctest_prop', 1` |
| `setOnFire` | `1, false` |
| `setProperty` | the discovered entity property id, and the value the control just read from it |
| `setRotation` | `{ x: 0, y: 0 }` |
| `teleport` | the run's own location |
| `triggerEvent` | `'minecraft:entity_born'` |
| `tryTeleport` | the run's own location |

### Telling an absent guard from a bad argument

Each method is probed **twice with the same arguments**: once on a freshly spawned **control**
entity that is still valid, and once on a **subject** entity removed two ticks earlier. The
control is what separates the two explanations for a call that does not throw. Each method gets
its own control and subject, so one call's side effects cannot carry into the next.

The verdict on each line:

| Verdict | Meaning |
|---|---|
| `GUARD-OBSERVED` | the subject call threw `InvalidEntityError` — the call reached the guard and it fired |
| `GUARD-ABSENT` | the subject call **returned**, and the same arguments returned on the control — the arguments are not the explanation |
| `RETURNED-BUT-CONTROL-THREW` | returned on the removed entity while the control threw; read the control error before calling this an absent guard |
| `GUARD-UNOBSERVED-OTHER-ERROR` | threw something other than `InvalidEntityError` although the control accepted the arguments — a pre-guard rejection, so the guard is still unobserved |
| `GUARD-UNOBSERVED-ARGS-REJECTED` | the control threw too, so the arguments are wrong and nothing was learned |
| `ARITY-STILL-WRONG` | a `TypeError` on argument count again — the argument list in `scripts/main.js` needs fixing and the method re-run |

`GUARD-ABSENT` is the finding the decision `guard-list-comes-from-the-observation` names as a
falsifier, so it is emitted three times: on the method's verdict line, on its own
`!!! GUARD ABSENT !!!` line, and again in the summary. Search the log for `GUARD ABSENT`.

The set closes with a summary listing every method under each verdict, plus an explicit
"no method returned on a removed entity" line when there is nothing to report — so a run that
found nothing is distinguishable from a run that did not finish.

### Entity properties

`getProperty`, `setProperty` and `resetProperty` take an identifier that the entity type must
actually declare, and there is no runtime API listing them. `entity-property-discovery` therefore
*searches*: it spawns each of eight candidate types and calls `getProperty` with a candidate id,
logging every attempt. The first pair the engine accepts is used for the three property methods,
and the value it read back is what `setProperty` writes — so the value is of the property's own
type by construction.

If no candidate is accepted, the probe says so and those three methods report
`GUARD-UNOBSERVED-ARGS-REJECTED`; their guard stays open, and closing it needs either a better
candidate id or a custom entity with a declared property. **This is the part of set A most likely
to come back unresolved.**

### Side effects, and what was left alone

The subject entity is already removed, so nothing done to it can affect the world. The side
effects land on the *control*, which is a sheep (or one candidate-property type) spawned for that
one call and removed immediately after. Calls with a visible effect on the control: `applyDamage`
(1 damage), `applyImpulse` / `applyKnockback` (a small nudge), `setOnFire` (1 second),
`triggerEvent('minecraft:entity_born')` (turns the control into a lamb), `addEffect` (20 ticks of
speed), `teleport` / `tryTeleport` / `lookAt` (to the run's own location, where it already is).

Argument choices made to keep a call from reaching past its own entity:

- **`runCommand`** runs `tag @s add mctest_cmd` — self-scoped, so it cannot touch the world.
  Any command that reads or writes elsewhere would make the probe a world edit.
- **`setOnFire`** passes `useEffects: false`, so the control does not visibly burn.
- **`teleport`, `tryTeleport`, `lookAt`** use the run's own location rather than a fixed
  coordinate: a target in an unloaded chunk throws `LocationInUnloadedChunkError` on the control
  and the comparison is lost.
- **`addItem`** is called with a real `ItemStack`. A sheep has no inventory, so the control is
  expected to throw; that lands as `GUARD-UNOBSERVED-ARGS-REJECTED` unless the removed entity
  answers first, and either outcome is on the log.

No method was skipped outright. `kill` and `remove` are not in this set — they took no arguments
and already reached the guard in the earlier sweep.

## Set B — `mctest3:effects`

### How the case discriminates the two rules

The existing sample re-applied 300 over a base decayed to 290: 300 is longer than both the
remaining duration and the duration originally applied, so both rules predict replacement. The
discriminating case re-applies a value **strictly between** the two:

```
apply    amplifier 1, duration 400
wait     150 ticks          →  remaining ≈ 250
re-apply amplifier 1, duration 320      (250 < 320 < 400)
```

- **Original-applied basis** — 320 is *shorter* than the 400 applied, so no replacement takes and
  the read-back duration is the decaying base, ≈ 250.
- **Remaining basis** — 320 is *longer* than the ≈ 250 remaining, so replacement takes and the
  read-back duration is exactly 320.

The two predictions are ~70 ticks apart, and the readback is taken in the same tick as the
re-application, so the log line alone picks the rule. Each line carries the applied duration, the
ticks waited, the observed remaining duration before re-application, the observed decay per tick,
the re-applied value, whether it was in fact strictly between the two, and the observed duration
and amplifier after — plus a second reading 2 ticks later, so a duration that is not ticking down
is visible rather than silently trusted.

Cases run (11 total):

| Case | Repeats | What it is for |
|---|---|---|
| `equal-amp/between` (amplifier 1 over 1, re-apply 320) | 3 | the discriminating case; the verdict comes from these |
| `higher-amp/between` (amplifier 2 over 1, re-apply 320) | 3 | amplifier-first replacement should take regardless of the basis |
| `lower-amp/between` (amplifier 0 over 1, re-apply 320) | 3 | a lower amplifier should never replace, whatever the duration |
| `equal-amp/below-both` (re-apply 200) | 1 | anchor: shorter than both, neither rule replaces |
| `equal-amp/above-both` (re-apply 500) | 1 | anchor: longer than both, both rules replace |

Three repeats mean a one-off reads as one line out of three rather than as the result. The two
anchors are the sanity check: if an anchor misses its prediction, the harness is measuring
something other than what it thinks and the discriminating verdict should not be believed.

The `verdict=` field on the `equal-amp/between` lines reads `REMAINING-BASIS` or
`ORIGINAL-APPLIED-BASIS` outright, or `UNRESOLVED` when the readback matches neither prediction.

## What a correct run looks like

- The set's `start` line names the probe count, and the `complete` line appears at the end. A run
  with no `complete` line stopped early — rerun it.
- **No `PROBE CRASHED` line.** Every probe is wrapped, so one failure cannot abort the set; a
  crash line names the probe and carries the stack.
- `mctest3:guards`: a `SUMMARY probed=27/27` line, plus one `SUMMARY <verdict>` line per verdict
  that occurred. Anything short of 27 means a spawn or a `remove()` failed mid-set; those lines say
  which method and why.
- `mctest3:effects`: 11 case blocks, each with `strictly-between-remaining-and-applied=true` on
  the `between` cases. A `false` there means the decay rate is not what the design assumed and the
  constants at the top of `scripts/main.js` (`BASE_DURATION`, `DECAY_TICKS`, `BETWEEN`) need
  adjusting before the run counts.
- Sample shapes:

```
[mctest] guard-with-correct-arity :: hasTag("mctest_tag") on minecraft:sheep subject-isValid=false argsUsable=true verdict=GUARD-OBSERVED (the call reached the validity guard and it fired)
[mctest] effect-duration-basis :: [equal-amp/between #1] applied(amp1,dur400) waited=150ticks remaining=250 … reapply(amp1,dur320) strictly-between-remaining-and-applied=true -> readback(amp1,dur320) matches=the-reapplied-value verdict=REMAINING-BASIS (…)
```

## Record the results

Copy the complete set of `[mctest]` lines into a new file
`artifacts/mctest-guard-and-effect-probe-results.md`, following
`../mctest-resting-state-probe-results.md`: a **Run provenance** table (date, server build,
`@minecraft/server` version, pack name/version/uuid, trigger, coverage as
`n/n guards, n/n effects, no PROBE CRASHED lines`), a **Reading the log** section for any line that
misleads without the source in hand, run-validity notes, and then the raw log verbatim in delivery
order with server timestamps, one fenced block per set.

A probe measures what the engine does; whether the fake should *match* that is a design decision
the probe cannot make.

Caveats:

- **The slash-command path stays unexercised** if the run goes through `scriptevent`, as both
  earlier packs' runs did. Say which trigger was used in the provenance table.
- **`GUARD-ABSENT` on a single run is `n = 1`.** Re-run the set before a fact is written on it, and
  say how many runs the record covers.
- **`entity-property-discovery` searches a guessed candidate list.** Which pairs the engine accepts
  is itself an observation worth recording, and a run where none is accepted leaves three of the 27
  methods open rather than answered.
- **Members the engine adds in a later `@minecraft/server` version are not in the hand-written
  27.** The list comes from one sweep against 2.8.0; re-running the reflective probe in
  `../resting-state-probe-pack` on a newer module is what would extend it.
