# mctest access-guard probe results

Observed output from running `access-guard-probe-pack` against a real Bedrock dedicated server:
`mctest6:access` (does the invalidation guard fire when a member is *read*, or when it is *called*?)
and `mctest6:shape` (can a pack doing feature detection tell a valid entity from an invalidated
one?). Each set was run three times. The probes report what the engine did; nothing here is an
assertion about what the fake should do.

## Run provenance

| | |
|---|---|
| Date | 2026-07-28 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.31.1** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `access-guard-probe-pack` 0.1.0, uuid `5cd5653c-fea6-4b32-935b-7a4972a82bd4` |
| Trigger | `execute as <armor stand> run scriptevent mctest6:<set>` from the server console |
| Source | stationary armor stand at `(38.5, 81, 22.5)`, on a placed stone platform inside the `mctest` ticking area |
| Coverage | 3 × each set, no `PROBE CRASHED` lines, every `complete` line present |

Installed alongside the seven earlier packs and loaded as `[07] mc-test-lib access-guard probes`.

**Every structural criterion in the pack README is met**: 70 `access-versus-call` case lines
(14 members × 5), 6 `invalid-property-reads` lines, `[control-valid]` reads
`ACCESS-CLEAN-FUNCTION` for all 14 members, and `[3-call-direct]` reads
`CALL-DIRECT-THREW-INVALID-ENTITY` for all 14 — the ordering the earlier sweeps already
established, so the run agrees with the record it has to agree with.

**Reproducibility.** Normalising the log timestamp and entity ids, each set's entire body is
byte-identical across its three runs (md5 match).

## The headline: validity is read at call time, not bound at access time

Both headline lines are unambiguous and identical in 3/3 runs:

```
HEADLINE access-only              ACCESS-THREW=0/14  ACCESS-CLEAN=14/14  threw=[]
HEADLINE capture-before-invalidation  returned-anyway=0/14  members=[]
```

- **Reading a method off an invalidated entity never throws.** All 14 members return a
  `function` when accessed on an entity already removed. The guard is not on the property read.
- **Capturing the function reference while the entity is still valid does not escape the guard.**
  All 14 captured-then-called cases threw `InvalidEntityError`. Nothing returned.

Per the pack's own reading rule — *returned means the guard is bound at access time, threw means
validity is read at call time* — the answer is **validity is read at call time**, unanimously
across 14 members. A fake can therefore hand out method references freely; what it cannot do is
decide validity when the reference is taken.

## Reads of properties are guarded selectively; reads of methods are not

The separate `invalid-property-reads` probe uses the same access syntax on six data properties, so
"the engine guards reads" and "the engine guards reads of methods" stay separable claims. They come
apart:

| property | on an invalidated entity |
|---|---|
| `id` | **readable** — `"-120259084213"` |
| `typeId` | **readable** — `"minecraft:sheep"` |
| `isValid` | **readable** — `false` |
| `nameTag` | throws `InvalidEntityError` |
| `location` | throws `InvalidEntityError` |
| `dimension` | throws `InvalidEntityError` |

So the engine guards *some* property reads and *no* method reads. The three that survive are the
same ones the resting-state pack found readable after removal (`id`, `isValid`, `typeId`, plus
`scoreboardIdentity`, which this probe does not cover), so two independently built packs agree on
the readable set.

For a proxy design this is the load-bearing distinction: intercepting property access must
discriminate by property name, while intercepting method access can be uniform — the throw belongs
on the call.

## The bound/unbound trap fired, and the error class is not the predicted one

Case 2 records both `fn.call(subject, …)` and the unbound `fn(…)`. The split earns its place:

- bound `fn.call(subject, …)` → `InvalidEntityError`, **14/14**
- unbound `fn(…)` → `ReferenceError`, **14/14**, message
  `"Native function [Entity::kill] object bound to prototype does not exist."`

Without the split, that second error would sit in the log looking like a guard firing. It is not —
it is the engine's native functions refusing to run without their receiver.

Worth noting for the design brief that anticipated this: the failure mode is a **`ReferenceError`,
not the illegal-invocation `TypeError`** the trap was set for. The trap caught the right thing; the
class differs from the prediction, and a fake reproducing this behaviour would need `ReferenceError`
to match. `instanceofInvalidEntityError=false` on every one of those lines, so the two are cleanly
distinguishable in the log.

## Shape: feature detection cannot tell the two apart

`SUMMARY valid-and-invalid-read-identically=true`. Every shape operation returns the same answer on
a valid entity and on one invalidated by `remove()`:

| operation | both states |
|---|---|
| `'teleport' in entity` / `'nameTag' in entity` | `true` |
| `'notAMember' in entity` | `false` |
| `Object.keys` / `getOwnPropertyNames` | 2 — `["typeId","id"]` |
| `for-in` | 62 keys (own + prototype chain) |
| `typeof entity.teleport` | `"function"` |
| `typeof entity.notAMember` | `"undefined"` |
| `instanceof Entity` / `Object` | `true`; `instanceof Player` `false` |
| `constructor.name` | `"Entity"` |
| `JSON.stringify` | `{"typeId":"minecraft:sheep","id":"…"}` |
| `String()` | `"[object Object]"` |

Two consequences. A pack doing feature detection on an invalidated entity sees a fully-formed
`Entity` and will proceed into a call that throws — the invalidity is undetectable except by reading
`isValid` or by calling something and catching. And `JSON.stringify` succeeds on an invalidated
entity precisely because the two properties it serialises, `typeId` and `id`, are among the three
that survive invalidation.

## Run-validity notes

- **Each case gets a freshly invalidated subject**, one per ordering, so no case inherits another's
  side effect. That design is what the earlier damage pack lacked, where a shared subject produced
  two false contradictions.
- **`n = 3`, reproducible at the whole-log level** rather than at the summary level.
- **The `/mctest6:access` and `/mctest6:shape` slash commands are unexercised.** Both sets ran
  through the `scriptevent` fallback, so the custom-command path is only known not to have thrown
  at registration — the residual every pack in this series carries.
- **No player was connected.** Neither set reads a player.
- `for-in` reporting 62 keys against `Object.keys`'s 2 is the prototype chain being walked; the
  earlier reflective sweep enumerated 62 members on the `Entity` chain, so the two agree.

## Raw log — `mctest6:access` run 1 (full)

```
[2026-07-28 04:31:43.086] [mctest] access start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-28 04:31:43.086] [mctest] access-versus-call :: 14 Entity members × 4 orderings on a subject invalidated by remove(), plus a valid control per member. Case 1 (access only) is the headline: ACCESS-THREW means the engine guards the property read; ACCESS-CLEAN means it guards the call
[2026-07-28 04:31:43.086] [mctest] access-versus-call :: [control-valid] kill access ok typeof=function value=function(name="" length=0) call() ok typeof=boolean value=boolean:true verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:43.180] [mctest] access-versus-call :: [1-access-only] kill subject=-120259084285 const fn = subject.kill (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:43.285] [mctest] access-versus-call :: [2-access-then-call] kill subject=-120259084282 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::kill] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:43.380] [mctest] access-versus-call :: [3-call-direct] kill subject=-120259084281 subject.kill() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:43.480] [mctest] access-versus-call :: [4-capture-valid-call-invalid] kill subject=-120259084280 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'kill' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:43.535] [mctest] access-versus-call :: [control-valid] teleport access ok typeof=function value=function(name="" length=0) call({"z":22.5,"y":81,"x":38.5}) ok typeof=undefined value=undefined verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:43.630] [mctest] access-versus-call :: [1-access-only] teleport subject=-120259084278 const fn = subject.teleport (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:43.730] [mctest] access-versus-call :: [2-access-then-call] teleport subject=-120259084277 access ok typeof=function value=function(name="" length=0) then fn.call(subject, {"z":22.5,"y":81,"x":38.5}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'teleport' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::teleport] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:43.835] [mctest] access-versus-call :: [3-call-direct] teleport subject=-120259084276 subject.teleport({"z":22.5,"y":81,"x":38.5}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'teleport' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:43.930] [mctest] access-versus-call :: [4-capture-valid-call-invalid] teleport subject=-120259084275 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, {"z":22.5,"y":81,"x":38.5}) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'teleport' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:43.980] [mctest] access-versus-call :: [control-valid] hasTag access ok typeof=function value=function(name="" length=0) call("mctest_tag") ok typeof=boolean value=boolean:false verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:44.085] [mctest] access-versus-call :: [1-access-only] hasTag subject=-120259084273 const fn = subject.hasTag (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:44.180] [mctest] access-versus-call :: [2-access-then-call] hasTag subject=-120259084272 access ok typeof=function value=function(name="" length=0) then fn.call(subject, "mctest_tag") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasTag' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::hasTag] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:44.285] [mctest] access-versus-call :: [3-call-direct] hasTag subject=-120259084271 subject.hasTag("mctest_tag") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasTag' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:44.380] [mctest] access-versus-call :: [4-capture-valid-call-invalid] hasTag subject=-120259084270 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, "mctest_tag") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'hasTag' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:44.430] [mctest] access-versus-call :: [control-valid] getComponent access ok typeof=function value=function(name="" length=0) call("minecraft:health") ok typeof=object value=object(EntityHealthComponent) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:44.535] [mctest] access-versus-call :: [1-access-only] getComponent subject=-120259084268 const fn = subject.getComponent (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:44.630] [mctest] access-versus-call :: [2-access-then-call] getComponent subject=-120259084267 access ok typeof=function value=function(name="" length=0) then fn.call(subject, "minecraft:health") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getComponent] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:44.730] [mctest] access-versus-call :: [3-call-direct] getComponent subject=-120259084266 subject.getComponent("minecraft:health") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:44.835] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getComponent subject=-120259084265 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, "minecraft:health") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponent' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:44.880] [mctest] access-versus-call :: [control-valid] applyDamage access ok typeof=function value=function(name="" length=0) call(1) ok typeof=boolean value=boolean:true verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:44.980] [mctest] access-versus-call :: [1-access-only] applyDamage subject=-120259084263 const fn = subject.applyDamage (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:45.085] [mctest] access-versus-call :: [2-access-then-call] applyDamage subject=-120259084262 access ok typeof=function value=function(name="" length=0) then fn.call(subject, 1) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::applyDamage] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:45.180] [mctest] access-versus-call :: [3-call-direct] applyDamage subject=-120259084261 subject.applyDamage(1) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:45.285] [mctest] access-versus-call :: [4-capture-valid-call-invalid] applyDamage subject=-120259084260 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, 1) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'applyDamage' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:45.335] [mctest] access-versus-call :: [control-valid] triggerEvent access ok typeof=function value=function(name="" length=0) call("minecraft:entity_born") ok typeof=undefined value=undefined verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:45.430] [mctest] access-versus-call :: [1-access-only] triggerEvent subject=-120259084258 const fn = subject.triggerEvent (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:45.535] [mctest] access-versus-call :: [2-access-then-call] triggerEvent subject=-120259084257 access ok typeof=function value=function(name="" length=0) then fn.call(subject, "minecraft:entity_born") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'triggerEvent' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::triggerEvent] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:45.630] [mctest] access-versus-call :: [3-call-direct] triggerEvent subject=-120259084256 subject.triggerEvent("minecraft:entity_born") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'triggerEvent' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:45.730] [mctest] access-versus-call :: [4-capture-valid-call-invalid] triggerEvent subject=-120259084255 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, "minecraft:entity_born") threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'triggerEvent' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:45.785] [mctest] access-versus-call :: [control-valid] getTags access ok typeof=function value=function(name="" length=0) call() ok typeof=object value=object(Array) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:45.880] [mctest] access-versus-call :: [1-access-only] getTags subject=-120259084253 const fn = subject.getTags (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:45.980] [mctest] access-versus-call :: [2-access-then-call] getTags subject=-120259084252 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getTags' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getTags] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:46.085] [mctest] access-versus-call :: [3-call-direct] getTags subject=-120259084251 subject.getTags() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getTags' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:46.180] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getTags subject=-120259084250 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getTags' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:46.230] [mctest] access-versus-call :: [control-valid] getVelocity access ok typeof=function value=function(name="" length=0) call() ok typeof=object value=object(Object) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:46.335] [mctest] access-versus-call :: [1-access-only] getVelocity subject=-120259084248 const fn = subject.getVelocity (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:46.430] [mctest] access-versus-call :: [2-access-then-call] getVelocity subject=-120259084247 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getVelocity' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getVelocity] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:46.535] [mctest] access-versus-call :: [3-call-direct] getVelocity subject=-120259084246 subject.getVelocity() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getVelocity' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:46.630] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getVelocity subject=-120259084245 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getVelocity' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:46.680] [mctest] access-versus-call :: [control-valid] getRotation access ok typeof=function value=function(name="" length=0) call() ok typeof=object value=object(Object) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:46.785] [mctest] access-versus-call :: [1-access-only] getRotation subject=-120259084243 const fn = subject.getRotation (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:46.880] [mctest] access-versus-call :: [2-access-then-call] getRotation subject=-120259084242 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getRotation' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getRotation] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:46.980] [mctest] access-versus-call :: [3-call-direct] getRotation subject=-120259084241 subject.getRotation() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getRotation' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:47.085] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getRotation subject=-120259084240 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getRotation' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:47.130] [mctest] access-versus-call :: [control-valid] getHeadLocation access ok typeof=function value=function(name="" length=0) call() ok typeof=object value=object(Object) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:47.230] [mctest] access-versus-call :: [1-access-only] getHeadLocation subject=-120259084238 const fn = subject.getHeadLocation (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:47.335] [mctest] access-versus-call :: [2-access-then-call] getHeadLocation subject=-120259084237 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getHeadLocation' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getHeadLocation] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:47.430] [mctest] access-versus-call :: [3-call-direct] getHeadLocation subject=-120259084236 subject.getHeadLocation() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getHeadLocation' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:47.535] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getHeadLocation subject=-120259084235 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getHeadLocation' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:47.586] [mctest] access-versus-call :: [control-valid] getViewDirection access ok typeof=function value=function(name="" length=0) call() ok typeof=object value=object(Object) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:47.680] [mctest] access-versus-call :: [1-access-only] getViewDirection subject=-120259084233 const fn = subject.getViewDirection (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:47.785] [mctest] access-versus-call :: [2-access-then-call] getViewDirection subject=-120259084232 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getViewDirection' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getViewDirection] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:47.880] [mctest] access-versus-call :: [3-call-direct] getViewDirection subject=-120259084231 subject.getViewDirection() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getViewDirection' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:47.980] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getViewDirection subject=-120259084230 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getViewDirection' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:48.036] [mctest] access-versus-call :: [control-valid] getEffects access ok typeof=function value=function(name="" length=0) call() ok typeof=object value=object(Array) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:48.130] [mctest] access-versus-call :: [1-access-only] getEffects subject=-120259084228 const fn = subject.getEffects (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:48.230] [mctest] access-versus-call :: [2-access-then-call] getEffects subject=-120259084227 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEffects' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getEffects] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:48.335] [mctest] access-versus-call :: [3-call-direct] getEffects subject=-120259084226 subject.getEffects() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEffects' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:48.430] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getEffects subject=-120259084225 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getEffects' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:48.481] [mctest] access-versus-call :: [control-valid] getComponents access ok typeof=function value=function(name="" length=0) call() ok typeof=object value=object(Array) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:48.585] [mctest] access-versus-call :: [1-access-only] getComponents subject=-120259084223 const fn = subject.getComponents (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:48.680] [mctest] access-versus-call :: [2-access-then-call] getComponents subject=-120259084222 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponents' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getComponents] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:48.785] [mctest] access-versus-call :: [3-call-direct] getComponents subject=-120259084221 subject.getComponents() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponents' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:48.880] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getComponents subject=-120259084220 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getComponents' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:48.930] [mctest] access-versus-call :: [control-valid] getDynamicPropertyIds access ok typeof=function value=function(name="" length=0) call() ok typeof=object value=object(Array) verdict=ACCESS-CLEAN-FUNCTION/CONTROL-CALL-RETURNED
[2026-07-28 04:31:49.035] [mctest] access-versus-call :: [1-access-only] getDynamicPropertyIds subject=-120259084218 const fn = subject.getDynamicPropertyIds (NOT called) ok typeof=function value=function(name="" length=0) verdict=ACCESS-CLEAN-FUNCTION
[2026-07-28 04:31:49.130] [mctest] access-versus-call :: [2-access-then-call] getDynamicPropertyIds subject=-120259084217 access ok typeof=function value=function(name="" length=0) then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicPropertyIds' due to Entity being invalid (has the Entity been removed?)." unbound fn(...) threw name=ReferenceError ctor=ReferenceError instanceofInvalidEntityError=false message="Native function [Entity::getDynamicPropertyIds] object bound to prototype does not exist." verdict=ACCESS-THEN-CALL-THREW-INVALID-ENTITY
[2026-07-28 04:31:49.230] [mctest] access-versus-call :: [3-call-direct] getDynamicPropertyIds subject=-120259084216 subject.getDynamicPropertyIds() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicPropertyIds' due to Entity being invalid (has the Entity been removed?)." verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[2026-07-28 04:31:49.335] [mctest] access-versus-call :: [4-capture-valid-call-invalid] getDynamicPropertyIds subject=-120259084215 access-while-valid ok typeof=function value=function(name="" length=0) remove ok typeof=undefined value=undefined isValid-after=false then fn.call(subject, ) threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to call function 'getDynamicPropertyIds' due to Entity being invalid (has the Entity been removed?)." verdict=CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY
[2026-07-28 04:31:49.380] [mctest] access-versus-call :: SUMMARY members=14
[2026-07-28 04:31:49.380] [mctest] access-versus-call :: SUMMARY case-1-access-only ACCESS-CLEAN-FUNCTION count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:31:49.380] [mctest] access-versus-call :: SUMMARY case-2-access-then-call ACCESS-THEN-CALL-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:31:49.380] [mctest] access-versus-call :: SUMMARY case-3-call-direct CALL-DIRECT-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:31:49.380] [mctest] access-versus-call :: SUMMARY case-4-capture-valid-call-invalid CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:31:49.380] [mctest] access-versus-call :: SUMMARY HEADLINE access-only ACCESS-THREW=0/14 ACCESS-CLEAN=14/14 threw=[] clean=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds] — ACCESS-THREW means the engine fires the invalidation guard on the property read; ACCESS-CLEAN means the read is unguarded and the guard is on the call
[2026-07-28 04:31:49.380] [mctest] access-versus-call :: SUMMARY HEADLINE capture-before-invalidation returned-anyway=0/14 members=[] — a member that returns here has a guard bound at access time; one that throws reads validity at call time
[2026-07-28 04:31:49.585] [mctest] invalid-property-reads :: id control-valid ok typeof=string value=string:"-120259084214" subject-invalid ok typeof=string value=string:"-120259084213" verdict=ACCESS-CLEAN-OTHER-string
[2026-07-28 04:31:49.585] [mctest] invalid-property-reads :: typeId control-valid ok typeof=string value=string:"minecraft:sheep" subject-invalid ok typeof=string value=string:"minecraft:sheep" verdict=ACCESS-CLEAN-OTHER-string
[2026-07-28 04:31:49.585] [mctest] invalid-property-reads :: isValid control-valid ok typeof=boolean value=boolean:true subject-invalid ok typeof=boolean value=boolean:false verdict=ACCESS-CLEAN-OTHER-boolean
[2026-07-28 04:31:49.585] [mctest] invalid-property-reads :: nameTag control-valid ok typeof=string value=string:"" subject-invalid threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to set property 'nameTag' due to Entity being invalid (has the Entity been removed?)." verdict=ACCESS-THREW-INVALID-ENTITY
[2026-07-28 04:31:49.585] [mctest] invalid-property-reads :: location control-valid ok typeof=object value=object(Object) subject-invalid threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'location' due to Entity being invalid (has the Entity been removed?)." verdict=ACCESS-THREW-INVALID-ENTITY
[2026-07-28 04:31:49.585] [mctest] invalid-property-reads :: dimension control-valid ok typeof=object value=object(Dimension) subject-invalid threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="Failed to get property 'dimension' due to Entity being invalid (has the Entity been removed?)." verdict=ACCESS-THREW-INVALID-ENTITY
[2026-07-28 04:31:49.585] [mctest] invalid-property-reads :: SUMMARY subject=-120259084213 properties=["id","typeId","isValid","nameTag","location","dimension"] — read beside case 1 of access-versus-call: the same access syntax, on a property rather than a method
[2026-07-28 04:31:49.680] [mctest] access complete — copy every [mctest] line into the design as the answer record
```

### access run 2 — SUMMARY block

```
[2026-07-28 04:33:13.080] [mctest] access start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-28 04:33:19.385] [mctest] access-versus-call :: SUMMARY members=14
[2026-07-28 04:33:19.385] [mctest] access-versus-call :: SUMMARY case-1-access-only ACCESS-CLEAN-FUNCTION count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:33:19.385] [mctest] access-versus-call :: SUMMARY case-2-access-then-call ACCESS-THEN-CALL-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:33:19.385] [mctest] access-versus-call :: SUMMARY case-3-call-direct CALL-DIRECT-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:33:19.385] [mctest] access-versus-call :: SUMMARY case-4-capture-valid-call-invalid CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:33:19.385] [mctest] access-versus-call :: SUMMARY HEADLINE access-only ACCESS-THREW=0/14 ACCESS-CLEAN=14/14 threw=[] clean=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds] — ACCESS-THREW means the engine fires the invalidation guard on the property read; ACCESS-CLEAN means the read is unguarded and the guard is on the call
[2026-07-28 04:33:19.385] [mctest] access-versus-call :: SUMMARY HEADLINE capture-before-invalidation returned-anyway=0/14 members=[] — a member that returns here has a guard bound at access time; one that throws reads validity at call time
[2026-07-28 04:33:19.585] [mctest] invalid-property-reads :: SUMMARY subject=-120259084135 properties=["id","typeId","isValid","nameTag","location","dimension"] — read beside case 1 of access-versus-call: the same access syntax, on a property rather than a method
[2026-07-28 04:33:19.680] [mctest] access complete — copy every [mctest] line into the design as the answer record
```

### access run 3 — SUMMARY block

```
[2026-07-28 04:34:42.431] [mctest] access start — 2 probe(s), @minecraft/server 2.8.0 expected
[2026-07-28 04:34:48.730] [mctest] access-versus-call :: SUMMARY members=14
[2026-07-28 04:34:48.730] [mctest] access-versus-call :: SUMMARY case-1-access-only ACCESS-CLEAN-FUNCTION count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:34:48.730] [mctest] access-versus-call :: SUMMARY case-2-access-then-call ACCESS-THEN-CALL-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:34:48.731] [mctest] access-versus-call :: SUMMARY case-3-call-direct CALL-DIRECT-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:34:48.731] [mctest] access-versus-call :: SUMMARY case-4-capture-valid-call-invalid CAPTURED-VALID-CALLED-INVALID-THREW-INVALID-ENTITY count=14 members=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds]
[2026-07-28 04:34:48.731] [mctest] access-versus-call :: SUMMARY HEADLINE access-only ACCESS-THREW=0/14 ACCESS-CLEAN=14/14 threw=[] clean=[kill, teleport, hasTag, getComponent, applyDamage, triggerEvent, getTags, getVelocity, getRotation, getHeadLocation, getViewDirection, getEffects, getComponents, getDynamicPropertyIds] — ACCESS-THREW means the engine fires the invalidation guard on the property read; ACCESS-CLEAN means the read is unguarded and the guard is on the call
[2026-07-28 04:34:48.731] [mctest] access-versus-call :: SUMMARY HEADLINE capture-before-invalidation returned-anyway=0/14 members=[] — a member that returns here has a guard bound at access time; one that throws reads validity at call time
[2026-07-28 04:34:48.930] [mctest] invalid-property-reads :: SUMMARY subject=-120259084057 properties=["id","typeId","isValid","nameTag","location","dimension"] — read beside case 1 of access-versus-call: the same access syntax, on a property rather than a method
[2026-07-28 04:34:49.030] [mctest] access complete — copy every [mctest] line into the design as the answer record
```

## Raw log — `mctest6:shape` (all three runs)

### shape run 1

```
[2026-07-28 04:32:38.136] [mctest] shape start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-28 04:32:38.136] [mctest] member-visibility :: the `in` operator, key enumeration, typeof, instanceof and constructor, read on a valid entity and on one invalidated by remove(). Plain answers only
[2026-07-28 04:32:38.235] [mctest] member-visibility :: [valid-control] in-operator 'teleport'=ok typeof=boolean value=boolean:true 'nameTag'=ok typeof=boolean value=boolean:true 'notAMember'=ok typeof=boolean value=boolean:false
[2026-07-28 04:32:38.235] [mctest] member-visibility :: [valid-control] Object.keys count=2 first=["typeId","id"] Object.getOwnPropertyNames count=2 first=["typeId","id"] for-in count=62 first=["typeId","id","getVelocity","getViewDirection","getHeadLocation","addTag"]
[2026-07-28 04:32:38.235] [mctest] member-visibility :: [valid-control] typeof entity.teleport=ok typeof=string value=string:"function" typeof entity.notAMember=ok typeof=string value=string:"undefined" typeof entity=ok typeof=string value=string:"object"
[2026-07-28 04:32:38.236] [mctest] member-visibility :: [valid-control] instanceof Entity=ok typeof=boolean value=boolean:true Player=ok typeof=boolean value=boolean:false Object=ok typeof=boolean value=boolean:true Entity.prototype.isPrototypeOf=ok typeof=boolean value=boolean:true constructor?.name=ok typeof=string value=string:"Entity" prototype-chain=["Entity","Object"]
[2026-07-28 04:32:38.236] [mctest] member-visibility :: [valid-control] JSON.stringify=ok typeof=string value=string:"{"typeId":"minecraft:sheep","id":"-120259084211"}" String()=ok typeof=string value=string:"[object Object]" spread-own-keys=["typeId","id"] Entity.prototype descriptor for 'nameTag'={"enumerable":true,"configurable":true}
[2026-07-28 04:32:38.236] [mctest] member-visibility :: [invalidated-subject] in-operator 'teleport'=ok typeof=boolean value=boolean:true 'nameTag'=ok typeof=boolean value=boolean:true 'notAMember'=ok typeof=boolean value=boolean:false
[2026-07-28 04:32:38.236] [mctest] member-visibility :: [invalidated-subject] Object.keys count=2 first=["typeId","id"] Object.getOwnPropertyNames count=2 first=["typeId","id"] for-in count=62 first=["typeId","id","getVelocity","getViewDirection","getHeadLocation","addTag"]
[2026-07-28 04:32:38.236] [mctest] member-visibility :: [invalidated-subject] typeof entity.teleport=ok typeof=string value=string:"function" typeof entity.notAMember=ok typeof=string value=string:"undefined" typeof entity=ok typeof=string value=string:"object"
[2026-07-28 04:32:38.236] [mctest] member-visibility :: [invalidated-subject] instanceof Entity=ok typeof=boolean value=boolean:true Player=ok typeof=boolean value=boolean:false Object=ok typeof=boolean value=boolean:true Entity.prototype.isPrototypeOf=ok typeof=boolean value=boolean:true constructor?.name=ok typeof=string value=string:"Entity" prototype-chain=["Entity","Object"]
[2026-07-28 04:32:38.236] [mctest] member-visibility :: [invalidated-subject] JSON.stringify=ok typeof=string value=string:"{"typeId":"minecraft:sheep","id":"-120259084210"}" String()=ok typeof=string value=string:"[object Object]" spread-own-keys=["typeId","id"] Entity.prototype descriptor for 'nameTag'={"enumerable":true,"configurable":true}
[2026-07-28 04:32:38.236] [mctest] member-visibility :: SUMMARY invalidated-subject=-120259084210
[2026-07-28 04:32:38.236] [mctest] member-visibility :: SUMMARY [valid-control] {"inTeleport":true,"inNameTag":true,"inInvented":false,"keys":2,"ownNames":2,"typeofTeleport":"function","typeofInvented":"undefined","instanceofEntity":true,"constructorName":"Entity"}
[2026-07-28 04:32:38.236] [mctest] member-visibility :: SUMMARY [invalidated-subject] {"inTeleport":true,"inNameTag":true,"inInvented":false,"keys":2,"ownNames":2,"typeofTeleport":"function","typeofInvented":"undefined","instanceofEntity":true,"constructorName":"Entity"}
[2026-07-28 04:32:38.236] [mctest] member-visibility :: SUMMARY valid-and-invalid-read-identically=true — every field above is what a pack doing feature detection would see
[2026-07-28 04:32:38.330] [mctest] shape complete — copy every [mctest] line into the design as the answer record
```

### shape run 2

```
[2026-07-28 04:34:07.835] [mctest] shape start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-28 04:34:07.836] [mctest] member-visibility :: the `in` operator, key enumeration, typeof, instanceof and constructor, read on a valid entity and on one invalidated by remove(). Plain answers only
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [valid-control] in-operator 'teleport'=ok typeof=boolean value=boolean:true 'nameTag'=ok typeof=boolean value=boolean:true 'notAMember'=ok typeof=boolean value=boolean:false
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [valid-control] Object.keys count=2 first=["typeId","id"] Object.getOwnPropertyNames count=2 first=["typeId","id"] for-in count=62 first=["typeId","id","getVelocity","getViewDirection","getHeadLocation","addTag"]
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [valid-control] typeof entity.teleport=ok typeof=string value=string:"function" typeof entity.notAMember=ok typeof=string value=string:"undefined" typeof entity=ok typeof=string value=string:"object"
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [valid-control] instanceof Entity=ok typeof=boolean value=boolean:true Player=ok typeof=boolean value=boolean:false Object=ok typeof=boolean value=boolean:true Entity.prototype.isPrototypeOf=ok typeof=boolean value=boolean:true constructor?.name=ok typeof=string value=string:"Entity" prototype-chain=["Entity","Object"]
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [valid-control] JSON.stringify=ok typeof=string value=string:"{"typeId":"minecraft:sheep","id":"-120259084133"}" String()=ok typeof=string value=string:"[object Object]" spread-own-keys=["typeId","id"] Entity.prototype descriptor for 'nameTag'={"enumerable":true,"configurable":true}
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [invalidated-subject] in-operator 'teleport'=ok typeof=boolean value=boolean:true 'nameTag'=ok typeof=boolean value=boolean:true 'notAMember'=ok typeof=boolean value=boolean:false
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [invalidated-subject] Object.keys count=2 first=["typeId","id"] Object.getOwnPropertyNames count=2 first=["typeId","id"] for-in count=62 first=["typeId","id","getVelocity","getViewDirection","getHeadLocation","addTag"]
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [invalidated-subject] typeof entity.teleport=ok typeof=string value=string:"function" typeof entity.notAMember=ok typeof=string value=string:"undefined" typeof entity=ok typeof=string value=string:"object"
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [invalidated-subject] instanceof Entity=ok typeof=boolean value=boolean:true Player=ok typeof=boolean value=boolean:false Object=ok typeof=boolean value=boolean:true Entity.prototype.isPrototypeOf=ok typeof=boolean value=boolean:true constructor?.name=ok typeof=string value=string:"Entity" prototype-chain=["Entity","Object"]
[2026-07-28 04:34:07.930] [mctest] member-visibility :: [invalidated-subject] JSON.stringify=ok typeof=string value=string:"{"typeId":"minecraft:sheep","id":"-120259084132"}" String()=ok typeof=string value=string:"[object Object]" spread-own-keys=["typeId","id"] Entity.prototype descriptor for 'nameTag'={"enumerable":true,"configurable":true}
[2026-07-28 04:34:07.930] [mctest] member-visibility :: SUMMARY invalidated-subject=-120259084132
[2026-07-28 04:34:07.930] [mctest] member-visibility :: SUMMARY [valid-control] {"inTeleport":true,"inNameTag":true,"inInvented":false,"keys":2,"ownNames":2,"typeofTeleport":"function","typeofInvented":"undefined","instanceofEntity":true,"constructorName":"Entity"}
[2026-07-28 04:34:07.930] [mctest] member-visibility :: SUMMARY [invalidated-subject] {"inTeleport":true,"inNameTag":true,"inInvented":false,"keys":2,"ownNames":2,"typeofTeleport":"function","typeofInvented":"undefined","instanceofEntity":true,"constructorName":"Entity"}
[2026-07-28 04:34:07.930] [mctest] member-visibility :: SUMMARY valid-and-invalid-read-identically=true — every field above is what a pack doing feature detection would see
[2026-07-28 04:34:08.030] [mctest] shape complete — copy every [mctest] line into the design as the answer record
```

### shape run 3

```
[2026-07-28 04:35:37.435] [mctest] shape start — 1 probe(s), @minecraft/server 2.8.0 expected
[2026-07-28 04:35:37.435] [mctest] member-visibility :: the `in` operator, key enumeration, typeof, instanceof and constructor, read on a valid entity and on one invalidated by remove(). Plain answers only
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [valid-control] in-operator 'teleport'=ok typeof=boolean value=boolean:true 'nameTag'=ok typeof=boolean value=boolean:true 'notAMember'=ok typeof=boolean value=boolean:false
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [valid-control] Object.keys count=2 first=["typeId","id"] Object.getOwnPropertyNames count=2 first=["typeId","id"] for-in count=62 first=["typeId","id","getVelocity","getViewDirection","getHeadLocation","addTag"]
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [valid-control] typeof entity.teleport=ok typeof=string value=string:"function" typeof entity.notAMember=ok typeof=string value=string:"undefined" typeof entity=ok typeof=string value=string:"object"
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [valid-control] instanceof Entity=ok typeof=boolean value=boolean:true Player=ok typeof=boolean value=boolean:false Object=ok typeof=boolean value=boolean:true Entity.prototype.isPrototypeOf=ok typeof=boolean value=boolean:true constructor?.name=ok typeof=string value=string:"Entity" prototype-chain=["Entity","Object"]
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [valid-control] JSON.stringify=ok typeof=string value=string:"{"typeId":"minecraft:sheep","id":"-120259084055"}" String()=ok typeof=string value=string:"[object Object]" spread-own-keys=["typeId","id"] Entity.prototype descriptor for 'nameTag'={"enumerable":true,"configurable":true}
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [invalidated-subject] in-operator 'teleport'=ok typeof=boolean value=boolean:true 'nameTag'=ok typeof=boolean value=boolean:true 'notAMember'=ok typeof=boolean value=boolean:false
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [invalidated-subject] Object.keys count=2 first=["typeId","id"] Object.getOwnPropertyNames count=2 first=["typeId","id"] for-in count=62 first=["typeId","id","getVelocity","getViewDirection","getHeadLocation","addTag"]
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [invalidated-subject] typeof entity.teleport=ok typeof=string value=string:"function" typeof entity.notAMember=ok typeof=string value=string:"undefined" typeof entity=ok typeof=string value=string:"object"
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [invalidated-subject] instanceof Entity=ok typeof=boolean value=boolean:true Player=ok typeof=boolean value=boolean:false Object=ok typeof=boolean value=boolean:true Entity.prototype.isPrototypeOf=ok typeof=boolean value=boolean:true constructor?.name=ok typeof=string value=string:"Entity" prototype-chain=["Entity","Object"]
[2026-07-28 04:35:37.535] [mctest] member-visibility :: [invalidated-subject] JSON.stringify=ok typeof=string value=string:"{"typeId":"minecraft:sheep","id":"-120259084054"}" String()=ok typeof=string value=string:"[object Object]" spread-own-keys=["typeId","id"] Entity.prototype descriptor for 'nameTag'={"enumerable":true,"configurable":true}
[2026-07-28 04:35:37.535] [mctest] member-visibility :: SUMMARY invalidated-subject=-120259084054
[2026-07-28 04:35:37.535] [mctest] member-visibility :: SUMMARY [valid-control] {"inTeleport":true,"inNameTag":true,"inInvented":false,"keys":2,"ownNames":2,"typeofTeleport":"function","typeofInvented":"undefined","instanceofEntity":true,"constructorName":"Entity"}
[2026-07-28 04:35:37.535] [mctest] member-visibility :: SUMMARY [invalidated-subject] {"inTeleport":true,"inNameTag":true,"inInvented":false,"keys":2,"ownNames":2,"typeofTeleport":"function","typeofInvented":"undefined","instanceofEntity":true,"constructorName":"Entity"}
[2026-07-28 04:35:37.535] [mctest] member-visibility :: SUMMARY valid-and-invalid-read-identically=true — every field above is what a pack doing feature detection would see
[2026-07-28 04:35:37.635] [mctest] shape complete — copy every [mctest] line into the design as the answer record
```

