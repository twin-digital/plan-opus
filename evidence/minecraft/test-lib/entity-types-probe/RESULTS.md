# mc-test-lib entity-type registry probe — results

What `EntityTypes.get` and `EntityTypes.getAll` report against a real Bedrock dedicated server: for
a vanilla type, for a type this probe's own pack defines, and for an id nothing registers. The
surface `mc-test-lib` declares and throws on today, and the one a pack asking "is this entity type
registered in this world" has to read.

## Provenance

| | |
|---|---|
| server | itzg/minecraft-bedrock-server, Bedrock dedicated **1.26.43.1** |
| module | `@minecraft/server` **2.8.0** as a pack manifest dependency, no experiments |
| pack | `mc-test-lib entity-type registry probes` 0.1.0, uuid `3f8a5c21-9d47-4e63-b0a2-6c1e8f4d7b39` |
| harness | `run.mjs` against this directory's compose stack, headless — no client attached |
| trigger | `scriptevent etreg:registry` from the server console |
| ran | 2026-08-10, three passes, no `PROBE CRASHED` line |

The pack carries a data module defining `mctest:probe_dummy`, so a pack-defined type is measured
beside the vanilla ones. Every reading below reproduced identically across all three passes; the
spawn set is from the third, the first two having run before the probe loaded its own ticking area.

## What the registry reports

### The registry does not answer during early execution

Every read taken at module evaluation, and every read taken inside
`system.beforeEvents.startup`, throws:

```
[etreg] at-module-eval :: case=vanilla threw ReferenceError: Native function [EntityTypes::get] cannot be used in early execution.
[etreg] at-module-eval :: case=all threw ReferenceError: Native function [EntityTypes::getAll] cannot be used in early execution.
[etreg] at-event :: case=startup threw ReferenceError: Native function [EntityTypes::get] cannot be used in early execution.
[etreg] at-event :: case=startupAll threw ReferenceError: Native function [EntityTypes::getAll] cannot be used in early execution.
```

By `world.afterEvents.worldLoad` it answers normally:

```
[etreg] at-event :: case=worldLoad returned object<EntityType>
[etreg] at-event :: case=worldLoadCustom returned object<EntityType>
[etreg] at-event :: case=worldLoadAll returned object<Array> length=129
```

So a pack cannot read the registry from its startup code at all — the engine refuses it there. The
only place a registry read can happen is after world load.

### A miss is `undefined`, not a throw

Every id nothing registers returns `undefined`, in every namespace and in every malformed shape:

```
[etreg] get :: case=absent-namespaced argument="mctest:nothing_registers_this" returned undefined .id n/a
[etreg] get :: case=absent-bare argument="nothing_registers_this" returned undefined .id n/a
[etreg] get :: case=absent-minecraft-namespace argument="minecraft:nothing_registers_this" returned undefined .id n/a
[etreg] get :: case=empty-string argument="" returned undefined .id n/a
[etreg] get :: case=prefix-only argument="minecraft:" returned undefined .id n/a
[etreg] get :: case=whitespace argument=" minecraft:sheep " returned undefined .id n/a
[etreg] get :: case=case-mismatch argument="minecraft:Sheep" returned undefined .id n/a
```

Matching is exact: neither surrounding whitespace nor a case difference resolves. `undefined` is
the only miss signal — nothing distinguishes "malformed id" from "well-formed id nobody defined".

### A bare id means the `minecraft:` namespace, and only that

```
[etreg] get :: case=registered-vanilla-prefixed argument="minecraft:sheep" returned object<EntityType> .id returned string:"minecraft:sheep"
[etreg] get :: case=registered-vanilla-bare argument="sheep" returned object<EntityType> .id returned string:"minecraft:sheep"
[etreg] get :: case=pack-defined-prefixed argument="mctest:probe_dummy" returned object<EntityType> .id returned string:"mctest:probe_dummy"
[etreg] get :: case=pack-defined-bare argument="probe_dummy" returned undefined .id n/a
[etreg] shape :: identity-bare-vs-prefixed same-object=true bare=object<EntityType>
```

`sheep` and `minecraft:sheep` land on the **same object**. `probe_dummy` does not resolve to
`mctest:probe_dummy` — the bare form assumes `minecraft:` rather than searching namespaces. The
spawn set confirms the assumption is literal: spawning bare `probe_dummy` reports the id it
actually looked for.

```
[etreg] spawn :: case=bare-pack-defined id=probe_dummy lookup returned undefined spawn threw InvalidArgumentError: Invalid value passed to argument [0]. 'minecraft:probe_dummy' is not a valid entity type. typeId=string:"n/a"
```

And `.id` always reads back the canonical prefixed form whichever form was asked for.

### An `EntityType` carries two fields and nothing else

```
[etreg] shape :: subject=minecraft:sheep ctor=EntityType members=[localizationKey(own,value)=string:"entity.sheep.name" id(own,value)=string:"minecraft:sheep" id(proto1,value)=undefined localizationKey(proto1,value)=undefined]
[etreg] shape :: subject=mctest:probe_dummy ctor=EntityType members=[localizationKey(own,value)=string:"entity.mctest:probe_dummy.name" id(own,value)=string:"mctest:probe_dummy" id(proto1,value)=undefined localizationKey(proto1,value)=undefined]
```

`id` and `localizationKey`, both own value properties on the instance, with the prototype carrying
the same two names as `undefined`. No methods. A vanilla type's `localizationKey` drops the
namespace (`entity.sheep.name`); a pack-defined type's keeps it (`entity.mctest:probe_dummy.name`).

### Entries are stable objects; the array is not

```
[etreg] shape :: identity-across-calls same-object=true
[etreg] getall :: entry-identity-matches-get=true
[etreg] getall :: same-array-across-calls=false same-entry-objects=true
```

Two `get` calls return the same object. A `getAll` entry is the same object `get` returns. Two
`getAll` calls return different arrays holding the same entry objects.

### `getAll` holds vanilla and pack-defined types together

```
[etreg] getall :: count=129 is-array=true
[etreg] getall :: contains-pack-defined=true
[etreg] getall :: contains-sheep=true
[etreg] getall :: unprefixed-ids=0
[etreg] getall :: duplicate-ids=0
[etreg] getall :: non-minecraft-namespaces=[mctest:probe_dummy]
```

129 entries with this one pack installed. Every id prefixed, none repeated, and the pack's own type
present with no distinction from a vanilla one.

### The argument guards

```
[etreg] guard :: case=no-argument threw TypeError: Incorrect number of arguments to function. Expected 1, received 0
[etreg] guard :: case=two-arguments threw TypeError: Incorrect number of arguments to function. Expected 1, received 2
[etreg] guard :: case=undefined threw InvalidArgumentError: Invalid type passed to argument [0]. Expected type: string
[etreg] guard :: case=null threw InvalidArgumentError: Invalid type passed to argument [0]. Expected type: string
[etreg] guard :: case=number threw TypeError: Native type conversion failed. Function argument [0] expected type: string
[etreg] guard :: case=object threw TypeError: Object did not have a native handle. Function argument [0] expected type: string
[etreg] guard :: case=getall-one-argument threw TypeError: Incorrect number of arguments to function. Expected 0, received 1
```

Arity is `TypeError`; `undefined` and `null` are `InvalidArgumentError`; a wrong-typed value is a
`TypeError` whose wording varies with the value's kind.

### The registry agrees with what will spawn

Six cases, `EntityTypes.get` beside `dimension.spawnEntity` on the same id:

```
[etreg] spawn :: case=pack-defined id=mctest:probe_dummy lookup returned object<EntityType> spawn returned object<Entity> typeId=string:"mctest:probe_dummy"
[etreg] spawn :: case=vanilla id=minecraft:sheep lookup returned object<EntityType> spawn returned object<Entity> typeId=string:"minecraft:sheep"
[etreg] spawn :: case=absent-namespaced id=mctest:nothing_registers_this lookup returned undefined spawn threw InvalidArgumentError: Invalid value passed to argument [0]. 'mctest:nothing_registers_this' is not a valid entity type. typeId=string:"n/a"
[etreg] spawn :: case=absent-minecraft-namespace id=minecraft:nothing_registers_this lookup returned undefined spawn threw InvalidArgumentError: Invalid value passed to argument [0]. 'minecraft:nothing_registers_this' is not a valid entity type. typeId=string:"n/a"
[etreg] spawn :: case=bare-vanilla id=sheep lookup returned object<EntityType> spawn returned object<Entity> typeId=string:"minecraft:sheep"
[etreg] spawn :: case=bare-pack-defined id=probe_dummy lookup returned undefined spawn threw InvalidArgumentError: Invalid value passed to argument [0]. 'minecraft:probe_dummy' is not a valid entity type. typeId=string:"n/a"
```

A lookup hit spawns and a lookup miss throws, in all six — including the two bare forms, where the
lookup and the spawn agree on the same wrong answer. `EntityTypes.get` is a sound pre-check for
spawnability across the cases measured.

## Caveats

- One installed content pack. The 129 count is this world's, not a vanilla constant; the shape of
  the answers is what generalises, not the number.
- The registry is read-only from script. Nothing in `@minecraft/server` registers a type, so
  "when does an entry appear" was measured only across the load points a pack has, not across a
  mid-session registration.
- The ticking area is created by the probe and persists in the world. On a re-run against a live
  container `tickingarea add` reports `successCount=0` because the area already exists — the
  `tickingarea list` line is what confirms it is present.
- Spawnability was checked on six ids, not on all 129.

## Raw log

The final pass, delivery order, is `RUN.txt` beside this file. `OUTPUT.txt` holds all three.
