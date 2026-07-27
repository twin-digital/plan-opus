# mc-test-lib damage-threshold probes

A fourth Bedrock behavior pack for `minecraft/test-lib`, covering four rulings the spec makes that
no run has yet observed. Each is currently a reasoned guess, and each has a shape of result that
would overturn it.

- **`mctest4:nohealth`** — `applyDamage` on an entity with **no health component**. The spec says it
  "changes nothing, fires nothing, and returns `false`" (`d:damage-without-health-is-a-no-op`).
  The only adjacent observation is `kill-no-health-behaviour`, which called `kill()` on an arrow;
  `applyDamage` on such an entity has never been called.
- **`mctest4:threshold`** — the **killing-hit boundary**. The spec says `entityDie` fires when a
  write leaves `currentValue` at or below `effectiveMin`, boundary included
  (`d:killing-hit-lands-at-or-below-minimum`). Every observation behind that reached the minimum
  through `resetToMinValue`; neither `setCurrentValue` nor `applyDamage` has ever landed exactly on
  it. The set also surveys what `effectiveMin` actually reads across entity types — the design has
  only ever seen `0`, on a sheep.
- **`mctest4:handlers`** — a **throwing after-event handler**. The spec says a handler that throws
  propagates out of the call that dispatched it and the remaining subscribers do not run
  (`d:handler-errors-propagate`). Neither half is observed on the engine. This set asks what the
  engine does, which is the input the decision is choosing whether to match.
- **`mctest4:beforeevents`** — **before-event cancellation, and the writable non-`cancel` fields.**
  The spec says a cancelled `applyDamage` returns `false` and a cancelled `addEffect` returns
  `undefined` (`d:cancelled-actions-return-the-no-op-value`); neither the declarations nor the API
  reference say what a cancelled call returns. Separately, `EntityHurtBeforeEvent.damage` and
  `EffectAddBeforeEvent.duration` are declared **mutable**, so a handler can rewrite the action
  rather than only veto it — a pattern the spec does not model at all.

Each probe emits observation lines — it reports what the engine did rather than asserting what it
should do. There are no results yet: this pack is the instrument, not the answer.

## Install

1. Copy this folder into the world's or server's `behavior_packs/` (or
   `development_behavior_packs/`) directory and enable it on a world. No experiments are required:
   the script module targets stable `@minecraft/server` 2.8.0.
2. Add it to the world's `world_behavior_packs.json` with this manifest's uuid
   (`37965a8f-ab62-4107-b040-d7c7e0587ed4`) and version `[0, 1, 0]`, then **restart the server** —
   `/reload` does not register a new custom command, and a manifest version bump must be mirrored
   in `world_behavior_packs.json`. Check the boot `Pack Stack` lines for
   `mc-test-lib damage-threshold probes` before trusting a run.
3. Cheats must be enabled (the commands are registered at `GameDirectors` permission).

This pack uses the `mctest4:` command namespace, so it can be enabled alongside `engine-probe-pack`
(`mctest:`), `resting-state-probe-pack` (`mctest2:`) and `guard-and-effect-probe-pack` (`mctest3:`)
on the same world without colliding. The `[mctest]` line prefix is shared deliberately, so one log
filter collects every pack's output; probe names disambiguate.

## Run

As a player in the world:

```
/mctest4:nohealth
/mctest4:threshold
/mctest4:handlers
/mctest4:beforeevents
```

or, from the server console (the path every earlier run actually used), naming a source entity that
stays inside the loaded ticking area:

```
execute as <entity> run scriptevent mctest4:nohealth
execute as <entity> run scriptevent mctest4:threshold
execute as <entity> run scriptevent mctest4:handlers
execute as <entity> run scriptevent mctest4:beforeevents
```

A single probe can be named as the message argument:

```
execute as <entity> run scriptevent mctest4:nohealth no-health-type-survey
execute as <entity> run scriptevent mctest4:nohealth damage-without-health
execute as <entity> run scriptevent mctest4:threshold effective-minimum-survey
execute as <entity> run scriptevent mctest4:threshold killing-hit-boundary
execute as <entity> run scriptevent mctest4:handlers throwing-handler-propagation
execute as <entity> run scriptevent mctest4:beforeevents before-entity-hurt
execute as <entity> run scriptevent mctest4:beforeevents before-effect-add
```

Run the `scriptevent` form `execute as <player>` or otherwise from inside the loaded ticking area:
a run driven from outside it fails with `LocationInUnloadedChunkError` when probes spawn. Prefer a
**stationary** source (an armor stand at a fixed point well inside the ticking area) — a wandering
source crashed every probe in an earlier run once it left the area.

Runtime: each set finishes in **well under a minute** — roughly 5 s for `nohealth`, 20 s for
`threshold`, 10 s for `handlers`, 5 s for `beforeevents`. Nothing here waits on effect decay, so a
set that appears to hang has stopped.

Every line appears both in chat (`world.sendMessage`) and in the content log (`console.warn`), so a
dedicated server can collect them from the log file.

## Set A — `mctest4:nohealth`

`no-health-type-survey` spawns each candidate type and reports `getComponent('minecraft:health')`,
`hasComponent`, and the full component list. This is the record that the subject genuinely has no
health component; the same check is repeated immediately before each damage call, so a silent
`false` is attributable to the missing component rather than to an unlucky spawn.

`damage-without-health` then calls `applyDamage` on each subject twice — once with a plain amount
(`applyDamage(2)`) and once with the options form (`applyDamage(2, { cause: 'entity_attack' })`) —
with the **whole `world.afterEvents` surface subscribed**, so "no `entityHurt`" is recorded as "no
signal at all". Each call reports the return value, whether it threw, the health readback either
side, and every signal delivered in the following four ticks, tagged `(ours)` when the payload
references the subject.

| Subject | Why |
|---|---|
| `minecraft:arrow` | the type `kill-no-health-behaviour` already established has no health component |
| `minecraft:snowball`, `minecraft:xp_orb` | two more types with no combat presence — a second and third sample so an arrow-specific answer is visible as one |
| `minecraft:sheep` (**control**) | has health; the same two calls must return `true` and deliver `entityHurt` + `entityHealthChanged`, or the harness is not measuring what it claims |

**What would contradict the spec:** any subject call reporting `CONTRADICTS-SPEC-RETURNED-TRUE`,
`CONTRADICTS-SPEC-THREW`, or `CONTRADICTS-SPEC-SIGNAL-DELIVERED`. The matching verdict is
`MATCHES-SPEC-SILENT-FALSE`. The summary counts the contradicting calls and names them.

## Set B — `mctest4:threshold`

### `effective-minimum-survey`

Spawns eleven entity types and reads `currentValue`, `defaultValue`, `effectiveMin` and
`effectiveMax` off each health component, each read independently so one unreadable member does not
hide the others. A type whose `effectiveMin` is not `0` gets a `!!! NONZERO MINIMUM !!!` line and is
**added to the boundary set**, since that is the case the ruling is least tested on.

A nonzero minimum anywhere is a result in its own right — the design has only ever observed `0`, on
a sheep (`fresh-health-component-values-populated`) — whether or not the boundary case that follows
finds anything.

### `killing-hit-boundary`

For each boundary type, four cases on four fresh entities:

| Case | Write | Expected under the current ruling |
|---|---|---|
| `setCurrentValue/at-min` | `setCurrentValue(effectiveMin)` | dies, cause `override` |
| `setCurrentValue/min+1` (**control**) | `setCurrentValue(effectiveMin + 1)` | lives |
| `applyDamage/at-min` | `applyDamage(currentValue - effectiveMin)` | dies, cause from the damage |
| `applyDamage/min+1` (**control**) | `applyDamage(currentValue - effectiveMin - 1)` | lives |

The one-above control is what separates "died because the write landed on the minimum" from "this
entity type dies on any health write at all". Boundary types are passive (`sheep`, `cow`,
`armor_stand`, plus any nonzero-minimum type the survey found): a hostile subject takes
environmental damage of its own between the write and the readback, and the case stops
discriminating.

Each case line carries the pre-write attributes, the target, the write's outcome, the health
readback, `landed-exactly-on-effectiveMin`, the delivered cascade, and one of:

| Verdict | Meaning |
|---|---|
| `REACHED-MINIMUM-AND-DIED` | the readback is exactly `effectiveMin` and `entityDie` was delivered |
| `REACHED-MINIMUM-AND-LIVED` | the readback is exactly `effectiveMin` and no `entityDie` was delivered |
| `WRITE-THREW` | the write itself threw; the boundary was never reached, and the error text is on the line |
| `MINIMUM-NOT-REACHED` | the write returned but the readback is not the minimum — the case discriminates nothing, read the readback |
| `CONTROL-ABOVE-MINIMUM-LIVED` / `CONTROL-ABOVE-MINIMUM-DIED` | the one-above control |

**What would contradict the spec:** `REACHED-MINIMUM-AND-LIVED` on any at-min case — it puts the
boundary on the survivor side, which is exactly the falsifier
`d:killing-hit-lands-at-or-below-minimum` names. It is emitted three times: on the case line, on its
own `!!! BOUNDARY SURVIVED !!!` line, and in the summary. Search the log for `BOUNDARY SURVIVED`.
`CONTROL-ABOVE-MINIMUM-DIED` contradicts nothing about the boundary but invalidates that type's
pair — a type that dies one above the minimum cannot tell you what the minimum does.

## Set C — `mctest4:handlers`

Four cases, each on a fresh sheep killed with `applyDamage(100)`. Two handlers subscribe to one
event of the engine's own damage cascade (`f:component-health-writes-cascade`,
`f:kill-and-remove-cascades`); a separate recorder subscribed **after** the pair watches the whole
cascade, so a dispatch aborted by the throw shows up as a missing line there.

| Case | Signal | Thrower | What it answers |
|---|---|---|---|
| `control-no-throw` | `entityHurt` | none | the baseline delivery order the other three are read against |
| `first-of-two-throws` | `entityHurt` | first subscriber | does the second subscriber still run; does the throw reach `applyDamage` |
| `second-of-two-throws` | `entityHurt` | second subscriber | the same, with the throw at the end of the subscriber list |
| `mid-cascade-throw` | `entityHealthChanged` | first subscriber | do the **later** cascade events — `entityDie` — still fire |

Every handler entry and exit is logged with a step number, interleaved with the `applyDamage called`
/ `applyDamage returned` steps, so the delivery order is readable straight off the `order=[…]` line.
Each case line then carries three verdicts:

| Field | Values |
|---|---|
| `propagation` | `THROW-REACHED-THE-CALLER` / `THROW-DID-NOT-REACH-THE-CALLER` |
| `siblings` | `OTHER-SUBSCRIBER-STILL-RAN` / `OTHER-SUBSCRIBER-DID-NOT-RUN` |
| `cascade-tail` | `LATER-CASCADE-EVENTS-STILL-FIRED` / `LATER-CASCADE-EVENTS-MISSING` |

**What would contradict the spec:** `THROW-DID-NOT-REACH-THE-CALLER` contradicts the first half of
`d:handler-errors-propagate`, and `OTHER-SUBSCRIBER-STILL-RAN` contradicts the second.
`LATER-CASCADE-EVENTS-STILL-FIRED` on `mid-cascade-throw` is the decision's second falsifier: it
means the engine delivers the rest of the cascade regardless, where the decision aborts it.

Note that `f:after-events-deferred` and `f:after-event-deferral-subtick` already establish that
after-events are delivered *after* the mutating call returns, later in the same tick. If that holds
here, `applyDamage` has already returned by the time any handler runs and
`THROW-DID-NOT-REACH-THE-CALLER` is the mechanical consequence, not a surprise — the `order=[…]`
line shows which it is. That does not settle the decision, which is about the fake's dispatch and
not the engine's; it settles what the engine does, which is the input.

### The deliberate throw is not a crash

The throwing handler is the probe working. It announces itself first:

```
[mctest] throwing-handler-propagation :: [first-of-two-throws] step 3 first-handler DELIBERATE THROW (by design — not a probe crash)
```

and the error it throws carries the marker `mctest4-deliberate-handler-throw`. **A script error in
the content log carrying that marker is expected in three of the four cases.** A `PROBE CRASHED`
line is a different thing entirely, and there should be none.

## Set D — `mctest4:beforeevents`

### What the pinned declarations actually say

Checked against `../type-probes/node_modules/@minecraft/server/index.d.ts` (the pinned 2.8.0
module), not from memory:

| Member | Declaration | TSDoc |
|---|---|---|
| `EntityHurtBeforeEvent.cancel` (line 10811) | `cancel: boolean;` | **none at all** — the member sits bare between `private constructor();` and the next doc comment |
| `EntityHurtBeforeEvent.damage` (line 10817) | `damage: number;` — **mutable**, no `readonly` | "Describes the amount of damage that will be caused." Nothing about writing it |
| `EffectAddBeforeEvent.cancel` (line 8209) | `cancel: boolean;` | "When set to true will cancel the event." |
| `EffectAddBeforeEvent.duration` (line 8215) | `duration: number;` — **mutable**, no `readonly` | "Effect duration." Nothing about writing it |

The two payloads' sibling members are declared `readonly` (`damageSource`, `hurtEntity`,
`effectType`, `entity`), so the mutability of `damage` and `duration` is a deliberate distinction in
the declarations rather than a missing modifier. **Nothing in the declarations states what a
cancelled call returns** — that is what makes the spec's ruling an inference.

### `before-entity-hurt`

Four cases, fresh sheep each, `world.beforeEvents.entityHurt` subscribed for the case and
unsubscribed in a `finally`. The handler acts only on that case's own entity id.

| Case | Requested | Handler does | What it answers |
|---|---|---|---|
| `cancel` | 4 | `cancel = true` | what a cancelled `applyDamage` returns, and whether the damage lands anyway |
| `control-no-write` | 4 | nothing | the baseline: health lost equals the amount requested |
| `lower-damage` | 10 | `damage = 2` | does a written-down `damage` take |
| `raise-damage` | 1 | `damage = 4` | does a written-**up** `damage` take (kept under a sheep's 8 health, so the case stays non-lethal and the health lost stays readable) |

Each line carries the requested amount, what the handler wrote, the `applyDamage` return, the health
either side, the health actually lost, and the after-event `cascade=[hurt(damage=…), health(…)]` —
so the *downstream* payload is on the record next to the health that actually moved. The
`handler-notes=[…]` line carries the value the handler saw delivered and its in-handler readback
after writing.

### `before-effect-add`

Four cases, same shape, on `world.beforeEvents.effectAdd` with `addEffect('minecraft:speed', …,
{ amplifier: 1 })`.

| Case | Requested | Handler does | What it answers |
|---|---|---|---|
| `cancel` | 200 | `cancel = true` | what a cancelled `addEffect` returns, whether the effect is added anyway, and whether health moved |
| `control-no-write` | 200 | nothing | the baseline: the effect reads back at all |
| `extend-duration` | 100 | `duration = 600` | does a written-up `duration` take |
| `shorten-duration` | 400 | `duration = 100` | does a written-down `duration` take |

The read-back is 2 ticks after the add, so a duration that took reads its value minus the elapsed
ticks; the comparison allows 6 ticks of slack, which is far short of the ~300-tick gap between the
two candidate answers.

### Verdicts

| Verdict | Meaning |
|---|---|
| `MATCHES-SPEC-CANCELLED-RETURNED-FALSE` / `-UNDEFINED` | the cancelled call returned the no-op value and the action did not land |
| `CONTRADICTS-SPEC-CANCELLED-RETURNED-TRUE` / `-A-VALUE` | the engine returned `true` / an `Effect` from a cancelled call |
| `CONTRADICTS-SPEC-DAMAGE-LANDED-ANYWAY` / `-EFFECT-ADDED-ANYWAY` | the cancellation did not gate the action |
| `FIELD-WRITE-TOOK` | the observed damage or duration is the value the handler wrote |
| `FIELD-WRITE-IGNORED` | it is the value the probe requested — the write had no effect |
| `FIELD-WRITE-NEITHER` | neither; read the numbers on the line |
| `BEFORE-EVENT-NOT-RAISED` | the handler never ran for this entity, so the case discriminates nothing |
| `CALL-THREW` | the `applyDamage` / `addEffect` call itself threw; the error text is on the line |

**What would contradict the spec:** either `CONTRADICTS-SPEC-CANCELLED-RETURNED-*` verdict is the
falsifier `d:cancelled-actions-return-the-no-op-value` names outright; either
`CONTRADICTS-SPEC-*-LANDED-ANYWAY` verdict contradicts `r:before-events-can-cancel` more broadly.
`FIELD-WRITE-TOOK` contradicts no ruling — there is no ruling — but it is a behaviour the spec's
gate-only model of before-events does not have, which is the point of probing it.

**`BEFORE-EVENT-NOT-RAISED` is the outcome to read before any other.** Whether the engine raises
`beforeEvents.entityHurt` and `beforeEvents.effectAdd` for a *script-initiated* `applyDamage` /
`addEffect` is itself unobserved. If the handler never runs, the cancel case's `applyDamage` returns
`true` and the damage lands — which would read as a contradiction but is only the before-event not
firing. The verdict field says so explicitly rather than leaving it to be inferred from an empty
`handler-notes`.

### Leaked subscribers

Every subscription in set D is taken for one case and released in a `finally`, including on the
paths where the call throws or the case is skipped. A leaked before-event subscriber that cancels
everything would silently corrupt every later probe and every later run in the same session; if a
run of set D ends abnormally, restart the server before running anything else.

## What a correct run looks like

- The set's `start` line names the probe count, and the `complete` line appears at the end. A run
  with no `complete` line stopped early — rerun it.
- **No `PROBE CRASHED` line.** Every probe is wrapped, so one failure cannot abort the set; a crash
  line names the probe and carries the stack. Content-log script errors carrying
  `mctest4-deliberate-handler-throw` are set C working as designed and are not crashes.
- `mctest4:nohealth`: a component list per candidate type, then eight `applyDamage` lines (four
  subjects × two argument forms, one of the four being the sheep control), then
  `SUMMARY subject-calls=6`. The sheep control must return `true` and show
  `hurt(…)` and `health(…)` in its `cascade=[…]`; a control that stays silent means the recorder is
  not seeing the subject and no subject verdict is worth anything.
- `mctest4:threshold`: eleven survey lines, a `SUMMARY surveyed=11 nonzero-minimum=[…]` line, then
  twelve or more boundary cases (three types × two paths × two offsets, plus four per
  nonzero-minimum type found) and a `SUMMARY cases=…` block. Every `min+1` control should read
  `CONTROL-ABOVE-MINIMUM-LIVED`.
- `mctest4:handlers`: four case blocks, each with an `order=[…]` line. The control case must show
  both handlers entering and exiting and a full `cascade=[hurt(…), health(…), die(…)]`; without
  that the other three cases have no baseline.
- `mctest4:beforeevents`: eight case blocks (four damage, four effect), each with a
  `handler-notes=[…]` line. Both `control-no-write` cases must show the handler entering and the
  action landing at the requested value; a control reading `BEFORE-EVENT-NOT-RAISED` means the
  engine does not raise that before-event for a script-driven call and the other three cases of
  that probe say nothing.
- Sample shapes:

```
[mctest] damage-without-health :: [minecraft:arrow/plain] applyDamage(2) ok value=boolean:false verdict=MATCHES-SPEC-SILENT-FALSE ours=[] cascade=[] all-signals-in-window=[] count=0
[mctest] killing-hit-boundary :: [minecraft:sheep/setCurrentValue/at-min] before(currentValue=ok value=number:8 … effectiveMin=ok value=number:0 …) target=0 write(setCurrentValue) ok value=undefined -> readback=ok value=number:0 landed-exactly-on-effectiveMin=true cascade=[health(8->0), die(cause=override)] died=true isValid=true verdict=REACHED-MINIMUM-AND-DIED
[mctest] throwing-handler-propagation :: [first-of-two-throws] signal=entityHurt thrower=first … applyDamage ok value=boolean:true ran.first=true ran.second=true cascade=[…] propagation=THROW-DID-NOT-REACH-THE-CALLER (…) siblings=OTHER-SUBSCRIBER-STILL-RAN cascade-tail=LATER-CASCADE-EVENTS-STILL-FIRED
[mctest] before-entity-hurt :: [lower-damage] requested=10 handler-writes-damage=2 handler-cancels=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:6) health-lost=2 expected-if-the-write-takes=2 cascade=[hurt(damage=2,cause=none), health(8->6)] verdict=FIELD-WRITE-TOOK (…)
[mctest] before-effect-add :: [cancel] requested=200 handler-writes-duration=undefined handler-cancels=true addEffect ok value=undefined -> effect-present=false duration=undefined … verdict=MATCHES-SPEC-CANCELLED-RETURNED-UNDEFINED
```

## Record the results

Copy the complete set of `[mctest]` lines into a new file
`artifacts/mctest-damage-threshold-probe-results.md`, following
`../mctest-guard-and-effect-probe-results.md`: a **Run provenance** table (date, server build,
`@minecraft/server` version, pack name/version/uuid, pack source commit, trigger, source entity and
its coordinates, coverage as `n × nohealth, n × threshold, n × handlers, n × beforeevents, no
PROBE CRASHED lines`), a
**What answered what** section per set, a **Reading the log** section for any line that misleads
without the source in hand, run-validity notes, and then the raw log verbatim in delivery order with
server timestamps, one fenced block per set.

A probe measures what the engine does; whether the fake should *match* that is a design decision the
probe cannot make. Set C in particular measures the engine, while
`d:handler-errors-propagate` is a choice about the fake's dispatch — the run is the input to that
choice, not the answer to it.

Caveats:

- **`n = 1` is not enough for a fact.** Run each set at least three times, as the guard-and-effect
  run did, and say in the provenance table how many runs the record covers. A single contradicting
  verdict is a line to re-run, not a result.
- **The slash-command path stays unexercised** if the run goes through `scriptevent`, as every
  earlier run did. Say which trigger was used in the provenance table.
- **The `(other)` tags in set A's signal sweep are noise from the rest of the world**, including the
  probe's own spawns and removals. Only `(ours)` lines bear on the verdict, and payload matching is
  best-effort: it compares entity ids, which are unreadable on an entity that has already been
  removed.
- **Set B's boundary types are whatever the survey could spawn.** If a type fails to spawn or its
  attributes are unreadable, its four cases are missing rather than failed; the summary count is
  what says whether the set is complete.
- **A throwing handler is a state change in the engine session.** If a later probe in the same
  session behaves oddly, re-run it from a fresh server start before recording it. The same goes for
  a set D run that ends abnormally, on the chance a before-event subscriber outlived it.
- **Set D's field writes are one value each.** A `FIELD-WRITE-TOOK` says the engine honoured *that*
  write, not that it honours every value: a clamp, a floor at zero, or a cap the probe never crossed
  would not show. Recording the numbers rather than the verdict alone is what leaves that visible.
