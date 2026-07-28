# mctest return-value probe results

Observed output from running `return-value-probe-pack` against a real Bedrock dedicated server:
`mctest5:returns` (what a call's boolean reports when the action does not land) and
`mctest5:nohealth` (the isolated re-run of the no-health damage question). Each set was run three
times. The probes report what the engine did; nothing here is an assertion about what the fake
should do.

## Run provenance

| | |
|---|---|
| Date | 2026-07-27 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `return-value-probe-pack` 0.1.0, uuid `9c4e1f7a-3b62-4d18-a5e0-7f2c8d4b6019` |
| Trigger | `execute as <armor stand> run scriptevent mctest5:<set>` from the server console |
| Source | stationary armor stand at `(38.5, 81, 22.5)`, on a placed stone platform inside the `mctest` ticking area |
| Coverage | 3 × each set, no `PROBE CRASHED` lines, every `complete` line present |

Installed alongside the five earlier packs and loaded as `[05] mc-test-lib return-value probes`.

**Reproducibility.** Both sets' `SUMMARY` blocks are byte-identical across their three runs (md5
match) and the verdict multisets are identical. Nothing below rests on a single observation.

## The no-op ruling, tested against the complete set

`d:cancelled-actions-return-the-no-op-value` can only be tested where a call is **script-initiable**,
its before-event is **cancellable**, and the call returns **non-void**. From the 2.8.0 declarations
that is exactly three calls — `entity.applyDamage`, `entity.addEffect`, `dimension.createExplosion`.
All three have now been observed:

| call | returns when cancelled | action landed? | matches the no-op value? |
|---|---|---|---|
| `entity.applyDamage` | `true` | no | **no** |
| `entity.addEffect` | `undefined` | no | yes |
| `dimension.createExplosion` | `false` | no | yes |

`createExplosion`'s control confirms the set discriminates: the before-event handler entered, the
call returned `true`, the witness sheep at the blast centre lost all 8 health, and the `explosion`
after-event fired once. Cancelled, the same call returns `false`, the witness is untouched, and the
after-event does not fire.

**`applyDamage` is the sole outlier across the complete set.** Cancellation gates the action on all
three surfaces; only `applyDamage` reports a value that says otherwise.

## What the `applyDamage` boolean actually reports

Seven cases, each on a freshly spawned subject so no case inherits the invulnerability window of the
one before it. Identical in 3/3 runs:

| case | amount | returned | health lost | verdict |
|---|---|---|---|---|
| `amount=-1` | `-1` | `false` | 0 | `RETURNED-FALSE-AND-NOTHING-LANDED` |
| `amount=0` | `0` | `false` | 0 | `RETURNED-FALSE-AND-NOTHING-LANDED` |
| `amount=0.5` | `0.5` | `true` | 0.5 | `RETURNED-TRUE-AND-DAMAGE-LANDED` |
| `amount=2-control` | `2` | `true` | 2 | `RETURNED-TRUE-AND-DAMAGE-LANDED` |
| `no-health` (`xp_orb`) | `2` | `false` | — | `NO-HEALTH-TO-MEASURE` |
| `cancelled` | `4` | **`true`** | **0** | `RETURNED-TRUE-BUT-NOTHING-LANDED` |
| `invulnerability-window` | `2` | **`true`** | **0** | `RETURNED-TRUE-BUT-NOTHING-LANDED` |

The declared contract in `index.d.ts` is:

> Whether the entity takes any damage. This can return false if the entity is invulnerable or if the
> damage applied is less than or equal to 0.

**Half of that holds and half does not.** The amount clause is honoured exactly — `-1` and `0`
return `false`, and `0.5` returns `true` and deals fractional damage, so the boundary is at zero and
not at one. The invulnerability clause is contradicted: a second hit inside the invulnerability
window returns `true` while dealing nothing, and the priming hit's own `true` return is recorded on
the same line, so the window is known to have been open.

Taken together, the boolean tracks **admission, not outcome**: it reports that the entity is
damageable and the amount is positive — both knowable before the call does anything — and is
unaffected by the two things that can stop the damage afterwards, a cancelling before-event and the
invulnerability window. The earlier pack's set C result that `applyDamage` returns before any
after-event handler runs is consistent with a value settled early in the call.

A fake that returns "did damage land" will therefore disagree with the engine in two reachable
situations, and a consumer asserting on the boolean is asserting on admissibility whether or not
they intend to.

## The no-health question, isolated

The earlier pack shared one subject between the two argument forms, so the plain call consumed the
projectile and the options call met an already-removed entity, which was scored as a contradiction.
Here every call gets its own freshly spawned subject and `isValid` is re-checked immediately before
the call. Identical in 3/3 runs:

```
SUMMARY subject-calls=6
SUMMARY SILENT-FALSE count=6 cases=[minecraft:arrow/plain, minecraft:arrow/options,
  minecraft:snowball/plain, minecraft:snowball/options, minecraft:xp_orb/plain, minecraft:xp_orb/options]
SUMMARY contradicting-the-no-op-ruling=0
SUMMARY control minecraft:sheep/plain CONTROL-HAS-HEALTH-RETURNED-TRUE
SUMMARY control minecraft:sheep/options CONTROL-HAS-HEALTH-RETURNED-TRUE
```

**6/6 `SILENT-FALSE`, zero contradictions, and no `SUBJECT-INVALIDATED-DURING-CALL` or
`SUBJECT-ALREADY-INVALID` in any run.** Both argument forms now reach a live subject for all three
health-less types, including the two projectiles that could not survive the earlier design. The
ruling that `applyDamage` on a health-less entity returns `false` silently is unfalsified.

This retires the earlier run's two flagged contradictions as artifacts of subject sharing rather
than engine behaviour. Both controls read `CONTROL-HAS-HEALTH-RETURNED-TRUE` under a vocabulary of
their own, so a health-carrying control returning `true` is no longer scored as a contradiction.

## Run-validity notes

- **A bug in this pack's first draft was caught by a smoke run and fixed before the recorded runs.**
  The `cancelled` damage case was constructed without its `cancel: true` flag, so it ran as an
  uncancelled duplicate — visible as `cancelled-before-event=false` with damage landing. The three
  recorded runs are all post-fix, and each shows `cancelled-before-event=true` with
  `health-lost=0`.
- **Explosions are real.** `breaksBlocks:false` and `causesFire:false` keep the run from editing the
  world it measures, but the control blast kills its witness sheep — that death is the measurement,
  not an accident.
- **`n = 3`, reproducible rather than merely consistent**: both `SUMMARY` blocks are byte-identical
  across runs.
- **The `/mctest5:*` slash commands are unexercised.** All runs went through the `scriptevent`
  fallback, so the custom-command path is only known not to have thrown at registration — the same
  residual every earlier pack carries.
- **No player was connected.** Neither set reads a player.
- The invulnerability-window case depends on the priming hit and the measured hit falling in the
  same window; the priming hit's return value is emitted on the case line, and it read `true` with
  damage landing in all three runs, so the window was open each time.

## Raw logs — `mctest5:returns`

### returns run 1

```
[2026-07-27 20:44:04.391] [mctest] returns start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:44:04.391] [mctest] applydamage-return-semantics :: declared contract (index.d.ts) "Whether the entity takes any damage. This can return false if the entity is invulnerable or if the damage applied is less than or equal to 0." — each case reports the boolean beside the health actually lost
[2026-07-27 20:44:04.490] [mctest] applydamage-return-semantics :: [amount=-1] type=minecraft:sheep amount=-1 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-FALSE-AND-NOTHING-LANDED
[2026-07-27 20:44:04.591] [mctest] applydamage-return-semantics :: [amount=0] type=minecraft:sheep amount=0 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-FALSE-AND-NOTHING-LANDED
[2026-07-27 20:44:04.691] [mctest] applydamage-return-semantics :: [amount=0.5] type=minecraft:sheep amount=0.5 cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:7.5) health-lost=0.5 damage-landed=true cascade=[hurt(damage=0.5), health(8->7.5)] verdict=RETURNED-TRUE-AND-DAMAGE-LANDED
[2026-07-27 20:44:04.795] [mctest] applydamage-return-semantics :: [amount=2-control] type=minecraft:sheep amount=2 cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:6) health-lost=2 damage-landed=true cascade=[hurt(damage=2), health(8->6)] verdict=RETURNED-TRUE-AND-DAMAGE-LANDED
[2026-07-27 20:44:04.890] [mctest] applydamage-return-semantics :: [no-health] type=minecraft:xp_orb amount=2 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=undefined -> ok value=undefined) health-lost=undefined damage-landed=undefined cascade=[] verdict=NO-HEALTH-TO-MEASURE
[2026-07-27 20:44:04.990] [mctest] applydamage-return-semantics :: [cancelled] type=minecraft:sheep amount=4 cancelled-before-event=true applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-TRUE-BUT-NOTHING-LANDED
[2026-07-27 20:44:05.141] [mctest] applydamage-return-semantics :: [invulnerability-window] type=minecraft:sheep amount=2 priming-hit=2 primed-returned=ok value=boolean:true cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:6 -> ok value=number:6) health-lost=0 damage-landed=false cascade=[hurt(damage=2), health(8->6)] verdict=RETURNED-TRUE-BUT-NOTHING-LANDED
[2026-07-27 20:44:05.141] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-FALSE-AND-NOTHING-LANDED count=2
[2026-07-27 20:44:05.141] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-TRUE-AND-DAMAGE-LANDED count=2
[2026-07-27 20:44:05.141] [mctest] applydamage-return-semantics :: SUMMARY NO-HEALTH-TO-MEASURE count=1
[2026-07-27 20:44:05.141] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-TRUE-BUT-NOTHING-LANDED count=2
[2026-07-27 20:44:05.141] [mctest] applydamage-return-semantics :: SUMMARY non-positive-amounts=[amount=-1=>false, amount=0=>false] — all false means the boolean carries the amount term; all true means it reports only that the entity is damageable
[2026-07-27 20:44:05.141] [mctest] applydamage-return-semantics :: SUMMARY blocked-after-admission=[cancelled=>returned true landed false, invulnerability-window=>returned true landed false] — returned true with nothing landed contradicts the declared "whether the entity takes any damage"
[2026-07-27 20:44:05.546] [mctest] explosion-cancel-return :: [control-no-cancel] createExplosion(radius=3, breaksBlocks=false) ok value=boolean:true witness-health(ok value=number:8 -> ok value=number:0) health-lost=8 after-event-fired=1 explosion-landed=true cascade=[hurt(damage=43), health(8->-35), die] handler-notes=[handler-entered] verdict=control returned=true landed=true
[2026-07-27 20:44:06.046] [mctest] explosion-cancel-return :: [cancel] createExplosion(radius=3, breaksBlocks=false) ok value=boolean:false witness-health(ok value=number:8 -> ok value=number:8) health-lost=0 after-event-fired=0 explosion-landed=false cascade=[] handler-notes=[handler-entered | wrote cancel=true readback-in-handler=true] verdict=CANCELLED-RETURNED-FALSE
[2026-07-27 20:44:06.341] [mctest] returns complete — copy every [mctest] line into the design as the answer record
```

### returns run 2

```
[2026-07-27 20:46:05.041] [mctest] returns start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:46:05.041] [mctest] applydamage-return-semantics :: declared contract (index.d.ts) "Whether the entity takes any damage. This can return false if the entity is invulnerable or if the damage applied is less than or equal to 0." — each case reports the boolean beside the health actually lost
[2026-07-27 20:46:05.146] [mctest] applydamage-return-semantics :: [amount=-1] type=minecraft:sheep amount=-1 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-FALSE-AND-NOTHING-LANDED
[2026-07-27 20:46:05.246] [mctest] applydamage-return-semantics :: [amount=0] type=minecraft:sheep amount=0 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-FALSE-AND-NOTHING-LANDED
[2026-07-27 20:46:05.341] [mctest] applydamage-return-semantics :: [amount=0.5] type=minecraft:sheep amount=0.5 cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:7.5) health-lost=0.5 damage-landed=true cascade=[hurt(damage=0.5), health(8->7.5)] verdict=RETURNED-TRUE-AND-DAMAGE-LANDED
[2026-07-27 20:46:05.441] [mctest] applydamage-return-semantics :: [amount=2-control] type=minecraft:sheep amount=2 cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:6) health-lost=2 damage-landed=true cascade=[hurt(damage=2), health(8->6)] verdict=RETURNED-TRUE-AND-DAMAGE-LANDED
[2026-07-27 20:46:05.541] [mctest] applydamage-return-semantics :: [no-health] type=minecraft:xp_orb amount=2 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=undefined -> ok value=undefined) health-lost=undefined damage-landed=undefined cascade=[] verdict=NO-HEALTH-TO-MEASURE
[2026-07-27 20:46:05.646] [mctest] applydamage-return-semantics :: [cancelled] type=minecraft:sheep amount=4 cancelled-before-event=true applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-TRUE-BUT-NOTHING-LANDED
[2026-07-27 20:46:05.791] [mctest] applydamage-return-semantics :: [invulnerability-window] type=minecraft:sheep amount=2 priming-hit=2 primed-returned=ok value=boolean:true cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:6 -> ok value=number:6) health-lost=0 damage-landed=false cascade=[hurt(damage=2), health(8->6)] verdict=RETURNED-TRUE-BUT-NOTHING-LANDED
[2026-07-27 20:46:05.791] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-FALSE-AND-NOTHING-LANDED count=2
[2026-07-27 20:46:05.791] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-TRUE-AND-DAMAGE-LANDED count=2
[2026-07-27 20:46:05.791] [mctest] applydamage-return-semantics :: SUMMARY NO-HEALTH-TO-MEASURE count=1
[2026-07-27 20:46:05.791] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-TRUE-BUT-NOTHING-LANDED count=2
[2026-07-27 20:46:05.791] [mctest] applydamage-return-semantics :: SUMMARY non-positive-amounts=[amount=-1=>false, amount=0=>false] — all false means the boolean carries the amount term; all true means it reports only that the entity is damageable
[2026-07-27 20:46:05.791] [mctest] applydamage-return-semantics :: SUMMARY blocked-after-admission=[cancelled=>returned true landed false, invulnerability-window=>returned true landed false] — returned true with nothing landed contradicts the declared "whether the entity takes any damage"
[2026-07-27 20:46:06.191] [mctest] explosion-cancel-return :: [control-no-cancel] createExplosion(radius=3, breaksBlocks=false) ok value=boolean:true witness-health(ok value=number:8 -> ok value=number:0) health-lost=8 after-event-fired=1 explosion-landed=true cascade=[hurt(damage=43), health(8->-35), die] handler-notes=[handler-entered] verdict=control returned=true landed=true
[2026-07-27 20:46:06.691] [mctest] explosion-cancel-return :: [cancel] createExplosion(radius=3, breaksBlocks=false) ok value=boolean:false witness-health(ok value=number:8 -> ok value=number:8) health-lost=0 after-event-fired=0 explosion-landed=false cascade=[] handler-notes=[handler-entered | wrote cancel=true readback-in-handler=true] verdict=CANCELLED-RETURNED-FALSE
[2026-07-27 20:46:06.995] [mctest] returns complete — copy every [mctest] line into the design as the answer record
```

### returns run 3

```
[2026-07-27 20:48:05.841] [mctest] returns start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:48:05.841] [mctest] applydamage-return-semantics :: declared contract (index.d.ts) "Whether the entity takes any damage. This can return false if the entity is invulnerable or if the damage applied is less than or equal to 0." — each case reports the boolean beside the health actually lost
[2026-07-27 20:48:05.940] [mctest] applydamage-return-semantics :: [amount=-1] type=minecraft:sheep amount=-1 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-FALSE-AND-NOTHING-LANDED
[2026-07-27 20:48:06.041] [mctest] applydamage-return-semantics :: [amount=0] type=minecraft:sheep amount=0 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-FALSE-AND-NOTHING-LANDED
[2026-07-27 20:48:06.146] [mctest] applydamage-return-semantics :: [amount=0.5] type=minecraft:sheep amount=0.5 cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:7.5) health-lost=0.5 damage-landed=true cascade=[hurt(damage=0.5), health(8->7.5)] verdict=RETURNED-TRUE-AND-DAMAGE-LANDED
[2026-07-27 20:48:06.246] [mctest] applydamage-return-semantics :: [amount=2-control] type=minecraft:sheep amount=2 cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:6) health-lost=2 damage-landed=true cascade=[hurt(damage=2), health(8->6)] verdict=RETURNED-TRUE-AND-DAMAGE-LANDED
[2026-07-27 20:48:06.341] [mctest] applydamage-return-semantics :: [no-health] type=minecraft:xp_orb amount=2 cancelled-before-event=false applyDamage ok value=boolean:false health(ok value=undefined -> ok value=undefined) health-lost=undefined damage-landed=undefined cascade=[] verdict=NO-HEALTH-TO-MEASURE
[2026-07-27 20:48:06.441] [mctest] applydamage-return-semantics :: [cancelled] type=minecraft:sheep amount=4 cancelled-before-event=true applyDamage ok value=boolean:true health(ok value=number:8 -> ok value=number:8) health-lost=0 damage-landed=false cascade=[] verdict=RETURNED-TRUE-BUT-NOTHING-LANDED
[2026-07-27 20:48:06.591] [mctest] applydamage-return-semantics :: [invulnerability-window] type=minecraft:sheep amount=2 priming-hit=2 primed-returned=ok value=boolean:true cancelled-before-event=false applyDamage ok value=boolean:true health(ok value=number:6 -> ok value=number:6) health-lost=0 damage-landed=false cascade=[hurt(damage=2), health(8->6)] verdict=RETURNED-TRUE-BUT-NOTHING-LANDED
[2026-07-27 20:48:06.591] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-FALSE-AND-NOTHING-LANDED count=2
[2026-07-27 20:48:06.591] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-TRUE-AND-DAMAGE-LANDED count=2
[2026-07-27 20:48:06.591] [mctest] applydamage-return-semantics :: SUMMARY NO-HEALTH-TO-MEASURE count=1
[2026-07-27 20:48:06.591] [mctest] applydamage-return-semantics :: SUMMARY RETURNED-TRUE-BUT-NOTHING-LANDED count=2
[2026-07-27 20:48:06.591] [mctest] applydamage-return-semantics :: SUMMARY non-positive-amounts=[amount=-1=>false, amount=0=>false] — all false means the boolean carries the amount term; all true means it reports only that the entity is damageable
[2026-07-27 20:48:06.591] [mctest] applydamage-return-semantics :: SUMMARY blocked-after-admission=[cancelled=>returned true landed false, invulnerability-window=>returned true landed false] — returned true with nothing landed contradicts the declared "whether the entity takes any damage"
[2026-07-27 20:48:06.996] [mctest] explosion-cancel-return :: [control-no-cancel] createExplosion(radius=3, breaksBlocks=false) ok value=boolean:true witness-health(ok value=number:8 -> ok value=number:0) health-lost=8 after-event-fired=1 explosion-landed=true cascade=[hurt(damage=43), health(8->-35), die] handler-notes=[handler-entered] verdict=control returned=true landed=true
[2026-07-27 20:48:07.496] [mctest] explosion-cancel-return :: [cancel] createExplosion(radius=3, breaksBlocks=false) ok value=boolean:false witness-health(ok value=number:8 -> ok value=number:8) health-lost=0 after-event-fired=0 explosion-landed=false cascade=[] handler-notes=[handler-entered | wrote cancel=true readback-in-handler=true] verdict=CANCELLED-RETURNED-FALSE
[2026-07-27 20:48:07.790] [mctest] returns complete — copy every [mctest] line into the design as the answer record
```

## Raw logs — `mctest5:nohealth`

### nohealth run 1

```
[2026-07-27 20:45:09.746] [mctest] nohealth start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:45:09.841] [mctest] damage-without-health-isolated :: [minecraft:arrow/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:45:09.941] [mctest] damage-without-health-isolated :: [minecraft:arrow/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:45:10.041] [mctest] damage-without-health-isolated :: [minecraft:snowball/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=false health(ok value=undefined -> threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?).") cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:45:10.146] [mctest] damage-without-health-isolated :: [minecraft:snowball/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=false health(ok value=undefined -> threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?).") cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:45:10.246] [mctest] damage-without-health-isolated :: [minecraft:xp_orb/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:45:10.340] [mctest] damage-without-health-isolated :: [minecraft:xp_orb/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:45:10.441] [mctest] damage-without-health-isolated :: [minecraft:sheep/plain] role=control component-present=true hasComponent=ok value=boolean:true isValid-before=true applyDamage ok value=boolean:true isValid-after=true health(ok value=number:8 -> ok value=number:6) cascade=[hurt(damage=2), health(8->6)] verdict=CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:45:10.541] [mctest] damage-without-health-isolated :: [minecraft:sheep/options] role=control component-present=true hasComponent=ok value=boolean:true isValid-before=true applyDamage ok value=boolean:true isValid-after=true health(ok value=number:8 -> ok value=number:6) cascade=[hurt(damage=2), health(8->6)] verdict=CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:45:10.541] [mctest] damage-without-health-isolated :: SUMMARY subject-calls=6
[2026-07-27 20:45:10.541] [mctest] damage-without-health-isolated :: SUMMARY SILENT-FALSE count=6 cases=[minecraft:arrow/plain, minecraft:arrow/options, minecraft:snowball/plain, minecraft:snowball/options, minecraft:xp_orb/plain, minecraft:xp_orb/options]
[2026-07-27 20:45:10.541] [mctest] damage-without-health-isolated :: SUMMARY contradicting-the-no-op-ruling=0 — only RETURNED-TRUE counts; an invalidation throw is the validity guard, not a damage ruling
[2026-07-27 20:45:10.541] [mctest] damage-without-health-isolated :: SUMMARY control minecraft:sheep/plain CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:45:10.541] [mctest] damage-without-health-isolated :: SUMMARY control minecraft:sheep/options CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:45:10.646] [mctest] nohealth complete — copy every [mctest] line into the design as the answer record
```

### nohealth run 2

```
[2026-07-27 20:47:10.441] [mctest] nohealth start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:47:10.541] [mctest] damage-without-health-isolated :: [minecraft:arrow/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:47:10.646] [mctest] damage-without-health-isolated :: [minecraft:arrow/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:47:10.746] [mctest] damage-without-health-isolated :: [minecraft:snowball/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=false health(ok value=undefined -> threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?).") cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:47:10.841] [mctest] damage-without-health-isolated :: [minecraft:snowball/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=false health(ok value=undefined -> threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?).") cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:47:10.941] [mctest] damage-without-health-isolated :: [minecraft:xp_orb/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:47:11.041] [mctest] damage-without-health-isolated :: [minecraft:xp_orb/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:47:11.146] [mctest] damage-without-health-isolated :: [minecraft:sheep/plain] role=control component-present=true hasComponent=ok value=boolean:true isValid-before=true applyDamage ok value=boolean:true isValid-after=true health(ok value=number:8 -> ok value=number:6) cascade=[hurt(damage=2), health(8->6)] verdict=CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:47:11.246] [mctest] damage-without-health-isolated :: [minecraft:sheep/options] role=control component-present=true hasComponent=ok value=boolean:true isValid-before=true applyDamage ok value=boolean:true isValid-after=true health(ok value=number:8 -> ok value=number:6) cascade=[hurt(damage=2), health(8->6)] verdict=CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:47:11.246] [mctest] damage-without-health-isolated :: SUMMARY subject-calls=6
[2026-07-27 20:47:11.246] [mctest] damage-without-health-isolated :: SUMMARY SILENT-FALSE count=6 cases=[minecraft:arrow/plain, minecraft:arrow/options, minecraft:snowball/plain, minecraft:snowball/options, minecraft:xp_orb/plain, minecraft:xp_orb/options]
[2026-07-27 20:47:11.246] [mctest] damage-without-health-isolated :: SUMMARY contradicting-the-no-op-ruling=0 — only RETURNED-TRUE counts; an invalidation throw is the validity guard, not a damage ruling
[2026-07-27 20:47:11.246] [mctest] damage-without-health-isolated :: SUMMARY control minecraft:sheep/plain CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:47:11.246] [mctest] damage-without-health-isolated :: SUMMARY control minecraft:sheep/options CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:47:11.341] [mctest] nohealth complete — copy every [mctest] line into the design as the answer record
```

### nohealth run 3

```
[2026-07-27 20:49:11.191] [mctest] nohealth start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-27 20:49:11.296] [mctest] damage-without-health-isolated :: [minecraft:arrow/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:49:11.391] [mctest] damage-without-health-isolated :: [minecraft:arrow/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:49:11.496] [mctest] damage-without-health-isolated :: [minecraft:snowball/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=false health(ok value=undefined -> threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?).") cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:49:11.591] [mctest] damage-without-health-isolated :: [minecraft:snowball/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=false health(ok value=undefined -> threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?).") cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:49:11.690] [mctest] damage-without-health-isolated :: [minecraft:xp_orb/plain] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:49:11.795] [mctest] damage-without-health-isolated :: [minecraft:xp_orb/options] role=subject component-present=false hasComponent=ok value=boolean:false isValid-before=true applyDamage ok value=boolean:false isValid-after=true health(ok value=undefined -> ok value=undefined) cascade=[] verdict=SILENT-FALSE
[2026-07-27 20:49:11.891] [mctest] damage-without-health-isolated :: [minecraft:sheep/plain] role=control component-present=true hasComponent=ok value=boolean:true isValid-before=true applyDamage ok value=boolean:true isValid-after=true health(ok value=number:8 -> ok value=number:6) cascade=[hurt(damage=2), health(8->6)] verdict=CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:49:11.996] [mctest] damage-without-health-isolated :: [minecraft:sheep/options] role=control component-present=true hasComponent=ok value=boolean:true isValid-before=true applyDamage ok value=boolean:true isValid-after=true health(ok value=number:8 -> ok value=number:6) cascade=[hurt(damage=2), health(8->6)] verdict=CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:49:11.996] [mctest] damage-without-health-isolated :: SUMMARY subject-calls=6
[2026-07-27 20:49:11.996] [mctest] damage-without-health-isolated :: SUMMARY SILENT-FALSE count=6 cases=[minecraft:arrow/plain, minecraft:arrow/options, minecraft:snowball/plain, minecraft:snowball/options, minecraft:xp_orb/plain, minecraft:xp_orb/options]
[2026-07-27 20:49:11.996] [mctest] damage-without-health-isolated :: SUMMARY contradicting-the-no-op-ruling=0 — only RETURNED-TRUE counts; an invalidation throw is the validity guard, not a damage ruling
[2026-07-27 20:49:11.996] [mctest] damage-without-health-isolated :: SUMMARY control minecraft:sheep/plain CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:49:11.996] [mctest] damage-without-health-isolated :: SUMMARY control minecraft:sheep/options CONTROL-HAS-HEALTH-RETURNED-TRUE
[2026-07-27 20:49:12.091] [mctest] nohealth complete — copy every [mctest] line into the design as the answer record
```

