# mc-test-lib arity, expiry, handler-write and filter probes

A Bedrock behavior pack for `minecraft/test-lib`. It settles four questions the spec currently
carries as inference, each one named in a falsifier of the decision it belongs to:

| Set | Question | Decision it bears on |
|---|---|---|
| `mctest8:arity` | does a member called with **more** arguments than its declared maximum throw? | `d:generated-members-check-arity-before-the-guard` |
| `mctest8:expiry` | where does an effect's duration land on the tick it expires? | `d:effect-expiry-is-the-librarys-own` |
| `mctest8:handlerwrite` | what does the engine do with an **out-of-range** duration written by a `beforeEvents.effectAdd` handler? | `d:handler-written-effect-duration-is-normalised` |
| `mctest8:filters` | do subscribe options **intersect** or **union** across fields, and which payload entity do they read? | `d:subscribe-options-filter-on-the-raised-signals` |

Each probe emits observation lines — it reports what the engine did rather than asserting what it
should do. **There are no results yet: this pack is the instrument, not the answer.**

This pack uses the `mctest8:` namespace with command names of its own, so it coexists with the seven
earlier packs. The `[mctest]` line prefix is shared deliberately, so one log filter collects every
pack's output; probe names disambiguate.

## Install

1. Copy this folder into the server's `development_behavior_packs/` (or `behavior_packs/`). No
   experiments are required: the script module targets stable `@minecraft/server` 2.8.0.
2. Add it to the world's `world_behavior_packs.json` with this manifest's uuid
   (`080eede9-d882-4606-a68d-9240d3fc3f92`) and version `[0, 1, 0]`, then **restart the server** —
   `/reload` does not register a new custom command. Confirm
   `mc-test-lib arity, expiry, handler-write and filter probes` in the boot `Pack Stack` lines
   before trusting a run.
3. Cheats must be enabled (the commands are registered at `GameDirectors` permission).

## Run

Use a **stationary source well inside a ticking area** — an armor stand on solid ground at a fixed
point. A wandering source crashed every probe in an earlier run once it left the area, and a run
driven from outside the ticking area fails with `LocationInUnloadedChunkError` when probes spawn.
Probes spawn their subjects at offsets from the source rather than on top of it.

From the server console:

```
execute as <entity> run scriptevent mctest8:arity
execute as <entity> run scriptevent mctest8:expiry
execute as <entity> run scriptevent mctest8:handlerwrite
execute as <entity> run scriptevent mctest8:filters
```

or as a player in the world: `/mctest8:arity`, `/mctest8:expiry`, `/mctest8:handlerwrite`,
`/mctest8:filters`.

A single probe can be named as the message argument:

```
execute as <entity> run scriptevent mctest8:arity surplus-arguments
execute as <entity> run scriptevent mctest8:expiry effect-expiry-boundary
execute as <entity> run scriptevent mctest8:handlerwrite out-of-range-duration-write
execute as <entity> run scriptevent mctest8:filters hurt-filter-semantics
execute as <entity> run scriptevent mctest8:filters die-filter-semantics
```

No set reads a player, so an armor-stand source covers all four.

**Runtime.** `arity` about **3 s** (18 subjects, one tick apart). `expiry` about **5 s** (six cases
read one tick at a time). `handlerwrite` about **5 s** (11 cases, each subscribing, adding and
waiting two ticks). `filters` is the long one: the hurt probe spaces its four events 20 ticks apart
to clear the damage-immunity window, and the die probe 10 ticks apart, so allow **10 s**. Nothing
waits on effect decay beyond the expiry set's own window; a set that appears to hang has stopped.

Every line appears both in chat (`world.sendMessage`) and in the content log (`console.warn`), so a
dedicated server can collect them from the log file.

**`n = 3`.** One run establishes nothing. Run each set three times and record all three; the
`SUMMARY HEADLINE` lines are what to compare across runs.

## Set A — `mctest8:arity`

### `surplus-arguments`

Every arity observation on the record is of **too few** arguments: the reflective sweep called all
46 `Entity` methods with zero arguments, 27 threw `TypeError`, and the follow-up showed those 27
reach the validity guard when called correctly. Nothing has ever called a member with **too many**.
The engine's own message declares an upper bound — `Incorrect number of arguments to function.
Expected 1-2, received 0` — which suggests it tracks one, but native bindings commonly ignore
surplus arguments rather than rejecting them.

Eighteen `Entity` members, each on its own freshly spawned **valid** sheep, three cases per member:

| Case | What it passes |
|---|---|
| `control` | exactly the declared **maximum** number of arguments, all legal |
| `plus1` | the same arguments plus one surplus (`"mctest_surplus_arg"`) |
| `plus2` | the same arguments plus two surplus (`"mctest_surplus_arg"`, `42`) |

The subject is valid throughout and `subject-isValid` is on every line, so a throw cannot be the
invalidation guard; the control proves the arguments themselves are good, so a throw on `plus1`
cannot be a bad argument either.

The spread covers every arity shape the declarations carry: five zero-arity methods (`getTags`,
`getVelocity`, `getEffects`, `getDynamicPropertyIds`, `clearVelocity`), one `0-1`
(`extinguishFire`), seven fixed `1` (`addTag`, `hasTag`, `getComponent`, `getEffect`,
`removeEffect`, `triggerEvent`, `getDynamicProperty`), four `1-2` (`setDynamicProperty`,
`applyDamage`, `setOnFire`, `teleport`) and one `2-3` (`addEffect`).

Three members carry a **witness** read after the call — `addTag` reads `hasTag` back,
`setDynamicProperty` reads the property back, `addEffect` reads `getEffect` back — and each case
passes a distinct value (a per-case tag, `1`/`2`/`3`, duration `100`/`200`/`300`). So the witness
says not only whether the surplus call threw but whether it **did its work**: a call that returns
and leaves the tag unset is a third answer neither verdict covers on its own.

**Which outcome contradicts the spec.** The spec says the generated member checks *the minimum
only*, and that no maximum is checked and extra arguments pass through. So:

- **`SURPLUS-ACCEPTED` on every member confirms the ruling.** Extra arguments are ignored by the
  engine, and the fake ignoring them matches.
- **`SURPLUS-THREW-TYPE-ERROR` on any member contradicts it** — this is
  `d:generated-members-check-arity-before-the-guard`'s first falsifier firing. The fake would be
  permissive on a real difference: a test passes against the fake where the engine throws. The
  member list on the `SUMMARY HEADLINE max+1` line is what the spec would have to build the maximum
  check from.
- A **split** — some members rejecting surplus and some not — is the third possibility, and the
  member lists say which is which. The zero-arity headline is called out separately because a
  zero-arity member has no minimum to check, so its verdict is the upper bound and nothing else.

### Verdict vocabulary

| Verdict | Meaning |
|---|---|
| `CONTROL-RETURNED` | the declared-maximum call succeeded — the member scores |
| `CONTROL-THREW-<name>` | the maximum-arity call was itself rejected; that member's surplus lines are void |
| `SURPLUS-ACCEPTED` | the surplus call returned without throwing |
| `SURPLUS-THREW-TYPE-ERROR` | the engine rejected the surplus arguments, with the message on the line |
| `SURPLUS-THREW-OTHER-<name>` | it threw something that is not a `TypeError`; read the message before calling it an arity rejection |

## Set B — `mctest8:expiry`

### `effect-expiry-boundary`

The library removes an effect on the tick its duration reaches 0, so the last readable tick is the
one reading 1 and it is never readable at 0. That is the library's own rule; the engine's boundary
is unmeasured, and `d:effect-expiry-is-the-librarys-own` is waiting on exactly this probe.

Three short durations (3, 5, 8 ticks) × two repeats, `minecraft:speed` at amplifier 1 on a fresh
sheep each time. Tick 0 is the same tick as the `addEffect` — nothing is awaited between them —
and each subsequent tick is one `system.runTimeout`. Every tick reports:

- `getEffect(speed)`: present, `duration`, `amplifier`,
- `getEffects()`: whether speed is in the list, its duration there, and the list length,
- the `duration` read off the `Effect` **`addEffect` itself returned**, which says whether that
  handle tracks the entity or is a snapshot,
- `sources-agree`, comparing presence and duration between the two reads.

The window runs to `duration + 4` ticks, so the disappearance falls inside it.

**Which outcome contradicts the spec.**

- **`MATCHES-SPEC-LAST-READ-1`** in every case — the last tick the effect is readable reads
  `duration` 1, and the next tick it is absent — confirms the ruling.
- **`CONTRADICTS-SPEC-DURATION-0-WAS-READABLE`** — the effect is readable with `duration` 0 on some
  tick — contradicts it directly. The `SUMMARY HEADLINE duration-0-ever-readable=true` line is that
  verdict in one place, and it is the decision's first falsifier ("an effect readable at 0").
- **`CONTRADICTS-SPEC-LAST-READ-<n>`** for `n` other than 1 — the effect disappears while still
  reading 2, say — is the same falsifier's other half ("gone a tick earlier").
- **A non-empty `source-disagreements-at-ticks`** is its own finding: `getEffect` and `getEffects`
  are stated to agree at every step, and a tick where they do not is a difference the spec does not
  model.
- **`STILL-PRESENT-AT-END-OF-WINDOW`** means the window was too short — the case scores nothing and
  the durations list says how far it got.

Read the six per-case `SUMMARY` lines together. A boundary read off a single sample is not a
boundary; the three durations and the two repeats are there so the same answer has to appear six
times in a run and eighteen times across `n = 3`.

## Set C — `mctest8:handlerwrite`

### `out-of-range-duration-write`

`f:before-event-field-writes-take-effect` records **in-range** writes only (100 raised to 600, 400
lowered to 100). The spec normalises a handler's write — truncate toward zero, then bounds-check
`1…20000000`, and an out-of-range result produces no effect at all. The engine's behaviour there is
unobserved, and `d:handler-written-effect-duration-is-normalised` is waiting on this probe.

Eleven cases. Each spawns a sheep, subscribes a `world.beforeEvents.effectAdd` handler that
**filters on that sheep's id**, calls `addEffect(minecraft:speed, 400, {amplifier: 2})`, and reads
back in the same tick and again two ticks later. The handler sets its own `handler-ran` flag and
records what the field held on entry and what it read back after the write, so *"the engine ignored
the write"* and *"the before-event never fired"* cannot be confused — the trap the earlier
before-event probe hit. Every subscription is unsubscribed in a `finally`.

| Case | writes | spec predicts |
|---|---|---|
| `control-in-range` | `300` | effect present, duration 300 |
| `zero` | `0` | no effect |
| `negative-one` | `-1` | no effect |
| `negative-large` | `-400` | no effect |
| `non-integer-small` | `2.5` | effect present, duration **2** |
| `non-integer-large` | `300.7` | effect present, duration **300** |
| `at-max` | `20000000` | effect present, duration 20000000 |
| `above-max` | `20000001` | no effect |
| `far-above-max` | `100000000` | no effect |
| `not-a-number` | `NaN` | no effect |
| `infinity` | `Infinity` | no effect |

Each line carries `spec-predicts=…` and `matches-spec=…`, so the verdict is readable without
re-deriving the rule. The requested duration is 400 and no case writes 400, so `WRITE-IGNORED` and
`WRITE-TOOK` are always distinguishable.

**Which outcome contradicts the spec.**

- Every case reading `matches-spec=true` confirms the ruling.
- **An out-of-range case that leaves an effect on the entity** — `WRITE-TOOK-AS-WRITTEN-0`,
  `WRITE-IGNORED`, or any `EFFECT-PRESENT-OTHER-DURATION-…` — contradicts it, and is the decision's
  first falsifier ("the engine applies it as given … so the fake refuses an add the engine
  performs"). A readable duration of 0 here is the same reading the expiry set looks for by another
  route.
- **`ADD-THREW-ArgumentOutOfBoundsError`** on an out-of-range case is the decision's *second*
  falsifier: the engine raises back at the `addEffect` caller, and returning `undefined` would
  swallow an error the pack under test was written to catch. It is reported as a verdict, not as a
  crash.
- **`non-integer-small` reading duration 3 rather than 2** (or `non-integer-large` reading 301) is
  the third falsifier: the handler path rounds where the argument path truncates, so borrowing
  `addEffect`'s coercion is the wrong rule.
- **`control-in-range` not reading `WRITE-TOOK-AS-WRITTEN-300`** voids the whole run: the existing
  fact says an in-range write takes, and a run disagreeing with it is measuring something else.
- **`BEFORE-EVENT-NOT-RAISED`** on any case scores nothing for that case — rerun rather than read it.

A write that throws inside the handler is recorded in `handler-notes` as a
`DELIBERATE-THROW-CANDIDATE`; it means the field rejected the assignment, which is itself an answer,
and it is not a probe crash.

## Set D — `mctest8:filters`

The fakes honour four filter fields on the five raised signals that declare options, and
**intersect** them. Two things are guesses: whether the engine intersects or unions across fields,
and which payload member each field reads. Both are named in
`d:subscribe-options-filter-on-the-raised-signals`'s falsifiers.

Both probes subscribe every handler **before** driving any event, record deliveries into per-handler
lists rather than emitting from inside a handler, drive real events, and unsubscribe every handler
in a `finally`. Deliveries that match none of the driven events are counted separately as
`foreign-deliveries` — ambient world activity, not a filter reading.

### `hurt-filter-semantics`

Stage: `sheepA`, `sheepB` (a second entity of the same type), a `cow`, and a `pig` that is only ever
the **damaging** entity and is never hurt. `sheepA` alone carries the tag `mctest_filter_marker`.

Four events, each 20 ticks apart so the damage-immunity window cannot swallow the second hurt on
`sheepA`:

| Event | Call |
|---|---|
| `sheepA-entityAttack-by-pig` | `sheepA.applyDamage(2, {cause: entityAttack, damagingEntity: pig})` |
| `sheepB-entityAttack-by-pig` | same, on `sheepB` |
| `cow-entityAttack-by-pig` | same, on the cow |
| `sheepA-lava-no-damager` | `sheepA.applyDamage(2, {cause: lava})` |

An event is identified in a handler by the pair (hurt entity id, damage cause), which is unique
across the four.

Fifteen handlers subscribe to `world.afterEvents.entityHurt`: no options (the control);
`entityTypes` alone for sheep, for sheep **unqualified** (`'sheep'`), for cow, and for **pig**;
`allowedDamageCauses` alone for `entityAttack` and for `lava`; the four combinations
`sheep+entityAttack`, `sheep+lava`, `cow+lava`, `entities=[sheepA]+entityTypes=[cow]`; `entities`
for `sheepA` and for `sheepB`; `entityFilter={tags:[mctest_filter_marker]}` alone; and
`entityTypes=[cow] + entityFilter={tags:[…]}`.

### `die-filter-semantics`

`EntityEventOptions` carries only `entityTypes` and `entities`, which makes crossing them a second,
independent intersect-versus-union reading. Stage: `sheepVictim`, `sheepOther`, `cowVictim`, and a
pig as the damaging entity; all three victims are killed with
`applyDamage(1000, {cause: entityAttack, damagingEntity: pig})`, 10 ticks apart. Seven handlers on
`world.afterEvents.entityDie`: no options; `entityTypes` for sheep and for cow; `entities` for
`sheepVictim` and for `sheepOther`; and the two crossings `entityTypes=[sheep]+entities=[cowVictim]`
and `entityTypes=[sheep]+entities=[sheepOther]`.

### Which outcome contradicts the spec

The headline is the intersect-versus-union case, and it appears four times over — twice on
`entityHurt` and twice on `entityDie`, so no single handler carries the verdict:

| Handler | Intersect (**confirms the spec**) | Union (**contradicts it**) |
|---|---|---|
| `types-sheep+cause-lava` | receives `sheepA-lava-no-damager` only | also receives an `entityAttack` event |
| `entities-sheepA+types-cow` | receives nothing | receives the sheepA events or the cow event |
| `types-cow+filter-tag-sheepA` | receives nothing | receives the sheepA events or the cow event |
| `types-sheep+entities-cowVictim` | receives nothing | receives a sheep death or the cow death |
| `types-sheep+entities-sheepOther` | receives `sheepOther` only | receives both sheep deaths |

`types-cow+filter-tag-sheepA` is the pair the decision's third falsifier names outright — "an
options object naming both `entityTypes` and `entityFilter` firing for a match on either". Union on
any of these five is that falsifier firing, and it means every subscriber carrying two fields hears
*less* from the fake than from the engine.

The second falsifier — "the engine is observed filtering against a payload member other than the
subject named per signal" — is what `types-pig` reads. The spec has `entityTypes` evaluated against
`hurtEntity`. **Any delivery to `types-pig` means the filter reads the damaging entity**, since no
pig is ever hurt in the run; silence means it reads the hurt entity, which confirms the spec.

`entities` is stated as reference identity against the subject entity. **`entities-sheepA`
receiving a `sheepB` event, or `entities-sheepVictim` receiving `sheepOther`'s death, contradicts
that** — the field would be behaving as a type filter.

`types-sheep` against `types-sheep-unqualified` settles the id format the field wants, which is not
a verdict on the spec but decides whether the rest of the set is readable at all.

### Run validity for set D

Two lines gate everything else, and both are emitted as `SUMMARY RUN-VALIDITY`:

- **The `no-options` control must receive every driven event.** An event missing from the control
  never happened — an `applyDamage` returning `false` (damage immunity) is the usual cause, and the
  `applyDamage-returns` list on the same line says which. Nothing downstream of a missing event
  counts.
- **`types-sheep+cause-entityAttack` must receive the two sheep `entityAttack` events.** Both its
  fields match those events, so silence there means the type string or the cause enum is wrong and
  the intersect/union reading is void, not that the engine intersects. Likewise
  `filter-tag-sheepA` must receive the two `sheepA` events, or the `entityFilter` crossing is void.

## What a correct run looks like

- A `start` line naming the probe count and a `complete` line for each set. A run with no `complete`
  line stopped early — rerun it.
- **No `:: PROBE CRASHED` line.** Every probe is wrapped, so one failure cannot abort the set; a
  crash line names the probe and carries the stack. A deliberate throw is never a crash: surplus
  arguments rejected read `SURPLUS-THREW-…`, an `addEffect` rejected under a handler write reads
  `ADD-THREW-…`, and a rejected field assignment appears in `handler-notes`.
- `mctest8:arity`: one opening line, **54** case lines (18 members × 3), one control-tally
  `SUMMARY`, one `SUMMARY` per distinct verdict per surplus label, and the two `SUMMARY HEADLINE`
  lines. Every `[control]` line must read `CONTROL-RETURNED`.
- `mctest8:expiry`: one opening line, **62** per-tick lines (8 + 10 + 13 ticks, each twice), **6**
  per-case `SUMMARY` lines and **3** closing `SUMMARY` lines. Every case must reach a
  `first-absent-tick`; every `sources-agree` should read `true`.
- `mctest8:handlerwrite`: one opening line, **22** case lines (11 cases × a verdict line and a
  `handler-notes` line), a `handler-ran` tally, the control `SUMMARY`, **11** per-case `SUMMARY`
  lines and one `SUMMARY HEADLINE`. Every case must read `handler-ran=true`.
- `mctest8:filters`: `hurt-filter-semantics` emits a stage line, **4** `drove` lines, one delivery
  line per delivery, **15** per-handler `SUMMARY` lines, **2** `SUMMARY RUN-VALIDITY` lines and
  **5** `SUMMARY HEADLINE` lines; `die-filter-semantics` emits a stage line, **3** `drove` lines,
  the deliveries, **7** per-handler `SUMMARY` lines, one `RUN-VALIDITY` and **3** `HEADLINE` lines.

Sample line shapes:

```
[mctest] surplus-arguments :: [plus1] addTag declared-arity=1 passed=2 (declared-max=1, surplus=1) subject=-123 subject-isValid=true call("mctest_arity_plus1", "mctest_surplus_arg") ok value=boolean:true witness=hasTag("mctest_arity_plus1")=true verdict=SURPLUS-ACCEPTED
[mctest] surplus-arguments :: SUMMARY HEADLINE max+1 SURPLUS-THREW=0/18 SURPLUS-ACCEPTED=18/18 threw=[] accepted=[getTags, …] — …
[mctest] effect-expiry-boundary :: [d5/r0] tick=4 subject=-124 getEffect present=true duration=1 amplifier=1 getEffects speed-present=true duration=1 count=1 addEffect-return.duration=1 sources-agree=true
[mctest] effect-expiry-boundary :: SUMMARY [d5/r0] requested=5 durations=[5, 4, 3, 2, 1, absent, absent, absent, absent] last-present-tick=4 last-readable-duration=1 first-absent-tick=5 duration-0-read-at-ticks=[] source-disagreements-at-ticks=[] verdict=MATCHES-SPEC-LAST-READ-1
[mctest] out-of-range-duration-write :: [zero] subject=-125 requested=400 handler-writes-duration=0 truncated-toward-zero=0 handler-ran=true addEffect ok value=undefined returned-effect=false immediate(present=false duration=undefined amplifier=undefined) after-2-ticks(present=false duration=undefined amplifier=undefined) spec-predicts="NO-EFFECT" matches-spec=true verdict=NO-EFFECT
[mctest] out-of-range-duration-write :: [zero] handler-notes=[handler-entered duration-as-delivered=400 | wrote duration=0 readback-in-handler=0]
[mctest] hurt-filter-semantics :: [types-sheep+cause-lava] delivery event=sheepA-lava-no-damager hurt=-126 hurtType=minecraft:sheep cause="lava" damagingType=undefined damage=2
[mctest] hurt-filter-semantics :: SUMMARY HEADLINE intersect-vs-union handler=types-sheep+cause-lava received=["sheepA-lava-no-damager"] received-an-entityAttack-event=false — …
[mctest] die-filter-semantics :: SUMMARY [types-sheep+entities-cowVictim] options="entityTypes=[sheep] AND entities=[cowVictim] — HEADLINE: no death is both" received=[] count=0 foreign-deliveries=0
```

The values above are line **shapes**, not results: nothing here is a prediction of what the engine
does.

## Where results go

Save the observed output as `../mctest-arity-expiry-and-filter-probe-results.md`, following the
structure the existing results files use (`../mctest-access-guard-probe-results.md` is the closest
model): a **Run provenance** table (date, server build, `@minecraft/server` version, pack
name/version/uuid, trigger, source entity and its coordinates, coverage as
`3 × each set, no PROBE CRASHED lines, every complete line present`), a section per question
answered, a **Reading the log** section for any line that misleads without the source in hand,
run-validity notes, then the raw `[mctest]` logs for all three runs of each set verbatim, in
delivery order with server timestamps, one fenced block per set.

## Caveats

- **The source must be stationary and well inside a ticking area.** Every set spawns subjects at
  offsets up to 4 blocks out and removes them; outside a ticking area the spawns fail and the
  effect-decay readings mean nothing.
- **`n = 3`.** One run establishes nothing; record three and compare the `SUMMARY HEADLINE` blocks.
  The expiry boundary and the filter semantics are both behavioural claims under timing, where a
  single run is the least trustworthy.
- **The arity controls damage their own subjects.** `applyDamage(1, …)` takes a health point and
  `setOnFire(1, false)` sets the sheep alight for a second. That is the control working, not an
  accident; each member gets its own sheep and it is removed straight after.
- **`at-max` leaves a 20000000-tick effect** on its subject for the two ticks before the subject is
  removed. Nothing outlives the set.
- **The filter probes kill entities.** `die-filter-semantics` kills three animals by design; the
  hurt probe leaves four alive and removes them with the set.
- **Damage immunity is the filter set's main hazard.** The two hurts on `sheepA` are 20 ticks apart
  for that reason, and the `applyDamage-returns` list on the run-validity line is what says whether
  each one actually landed. A `false` there means the engine raised no event and the handlers were
  never given the chance to filter.
- **Foreign deliveries are expected on a shared world.** Any other pack, or an ambient mob taking
  damage, reaches the unfiltered control. They are counted separately and never scored.
- **The slash-command path stays unexercised** if the run goes through `scriptevent`, as every
  earlier run did. Say which trigger was used in the provenance table.
