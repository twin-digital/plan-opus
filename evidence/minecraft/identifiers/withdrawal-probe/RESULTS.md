# Identifier-withdrawal probe: a saved entity whose type stops being declared

What becomes of an entity already saved in a world when the identifier it was spawned under stops
resolving — because the pack that declared it renamed the identifier, or dropped it.

## Provenance

| | |
| --- | --- |
| Server image | `itzg/minecraft-bedrock-server`, digest `sha256:0723ada81c10d3a9333d551b9ad8f22d666c3728071b6a15808bcef1fd394ab2` |
| Bedrock dedicated | 1.26.43.1 (`[2026-08-12 04:13:26:179 INFO] Version: 1.26.43.1`) |
| `@minecraft/server` | 2.8.0, as a manifest dependency; no experiments enabled |
| Script pack | `identifier rename probe (script)` 0.1.0, uuid `09ee7b49-12d6-4cb0-a3a0-283d3b33a3ae` |
| Data pack | `identifier rename probe data` uuid `02ea60ca-92a8-4e23-9244-be3a9066c911`, at 0.1.0 (declares `probe:subject`, `probe:plain`) and 0.2.0 (declares `probe:renamed`, `probe:plain_renamed`) |
| Command | `node run.mjs` in this directory |
| Raw log | `RAW-OUTPUT.txt` (the whole container log); `OUTPUT.txt` is the harness transcript |
| Ran at | 2026-08-12 |
| World | one persistent world `dev`, level seed 1, creative, difficulty hard, volume `rename-probe_data`, never destroyed between phases |

## Method

One world, three server lifetimes, each ended with a clean `stop` sent to the server console (never
a kill), and the container's own log scraped for the probe's `console.warn` lines.

1. **p1-declared** — data pack 0.1.0 declares `probe:subject` (carrying `minecraft:persistent`) and
   `probe:plain` (no `minecraft:persistent`). The probe builds a stone arena at the world spawn
   column, y=100, inside its own ticking area, and spawns five entities: two `probe:subject` (one
   given the name tag `NamedSubject`), two `probe:plain` (one named `NamedPlain`), and a
   `minecraft:cow` named `CowControl` as a vanilla control. Their entity ids are recorded in a world
   dynamic property so later phases can look each one up by id.
2. **p2-withdrawn** — the same pack uuid is redeployed at 0.2.0 with the same content declared under
   `probe:renamed` / `probe:plain_renamed`; nothing declares `probe:subject` or `probe:plain` any
   more. `world_behavior_packs.json` is rewritten to the bumped version. Same world, restarted.
3. **p3-restored** — the pack goes back to 0.1.0, declaring `probe:subject` / `probe:plain` again.
   Same world, restarted.

The ticking area keeps the arena chunk loaded in every phase, so the chunk is live and is re-saved
at each clean stop. The cow's drift between phases is the control that shows this: it stands at a
different position in each census, and each new position survives into the next phase, so the chunk
really was written to disk during the phase in which the two probe types were undeclared.

## Phase p1-declared — data pack v0.1.0 declares probe:subject and probe:plain

```text
[2026-08-12 04:13:53:279 WARN] [Scripting] [probe] p1-declared/spawn :: start probe:spawn
[2026-08-12 04:23:04:706 WARN] [Scripting] [probe] p1-declared/spawn :: spawned 5 recorded=[{"id":"-8589934591","typeId":"probe:subject","nameTag":null},{"id":"-8589934590","typeId":"probe:subject","nameTag":"NamedSubject"},{"id":"-8589934589","typeId":"probe:plain","nameTag":null},{"id":"-8589934588","typeId":"probe:plain","nameTag":"NamedPlain"},{"id":"-8589934587","typeId":"minecraft:cow","nameTag":"CowControl"}]
[2026-08-12 04:23:06:703 WARN] [Scripting] [probe] p1-declared/spawn :: arena centre=(163,100,170) floor=minecraft:stone
[2026-08-12 04:23:06:704 WARN] [Scripting] [probe] p1-declared/spawn :: dimension.getEntities().length=5
[2026-08-12 04:23:06:704 WARN] [Scripting] [probe] p1-declared/spawn :: entity[0] typeId=probe:subject id=-8589934591 nameTag="" loc=(160.50,100.00,170.50) isValid=true
[2026-08-12 04:23:06:704 WARN] [Scripting] [probe] p1-declared/spawn :: entity[1] typeId=probe:subject id=-8589934590 nameTag="NamedSubject" loc=(162.00,100.00,170.50) isValid=true
[2026-08-12 04:23:06:704 WARN] [Scripting] [probe] p1-declared/spawn :: entity[2] typeId=probe:plain id=-8589934589 nameTag="" loc=(165.00,100.00,170.50) isValid=true
[2026-08-12 04:23:06:704 WARN] [Scripting] [probe] p1-declared/spawn :: entity[3] typeId=probe:plain id=-8589934588 nameTag="NamedPlain" loc=(166.50,100.00,170.50) isValid=true
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: entity[4] typeId=minecraft:cow id=-8589934587 nameTag="CowControl" loc=(168.50,100.00,170.50) isValid=true
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: getEntities({location:centre,maxDistance:24}).length=5
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: getEntities({type:"probe:subject"}).length=2
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: getEntities({type:"probe:plain"}).length=2
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: getEntities({type:"probe:renamed"}).length=0
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: getEntities({type:"probe:plain_renamed"}).length=0
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: getEntities({families:["probe_family"]}).length=4
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: getEntities({type:"minecraft:cow"}).length=1
[2026-08-12 04:23:06:705 WARN] [Scripting] [probe] p1-declared/spawn :: cmd testfor @e[type=probe:subject] successCount=2
[2026-08-12 04:23:06:706 WARN] [Scripting] [probe] p1-declared/spawn :: cmd testfor @e[type=probe:plain] successCount=2
[2026-08-12 04:23:06:706 WARN] [Scripting] [probe] p1-declared/spawn :: cmd testfor @e[type=probe:renamed] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "probe:renamed": at "r @e[type=>>probe:renamed<<]"
[2026-08-12 04:23:06:706 WARN] [Scripting] [probe] p1-declared/spawn :: cmd testfor @e[type=probe:plain_renamed] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "probe:plain_renamed": at "r @e[type=>>probe:plain_renamed<<]"
[2026-08-12 04:23:06:706 WARN] [Scripting] [probe] p1-declared/spawn :: cmd testfor @e[family=probe_family] successCount=4
[2026-08-12 04:23:06:706 WARN] [Scripting] [probe] p1-declared/spawn :: cmd testfor @e[name=NamedSubject] successCount=1
[2026-08-12 04:23:06:706 WARN] [Scripting] [probe] p1-declared/spawn :: dynamicProperty probe:saved_ids=[{"id":"-8589934591","typeId":"probe:subject","nameTag":null},{"id":"-8589934590","typeId":"probe:subject","nameTag":"NamedSubject"},{"id":"-8589934589","typeId":"probe:plain","nameTag":null},{"id":"-8589934588","typeId":"probe:plain","nameTag":"NamedPlain"},{"id":"-8589934587","typeId":"minecraft:cow","nameTag":"CowControl"}]
[2026-08-12 04:23:06:707 WARN] [Scripting] [probe] p1-declared/spawn :: world.getEntity(-8589934591) [spawned as probe:subject name=null] => typeId=probe:subject nameTag="" loc=(160.50,100.00,170.50)
[2026-08-12 04:23:06:707 WARN] [Scripting] [probe] p1-declared/spawn :: world.getEntity(-8589934590) [spawned as probe:subject name="NamedSubject"] => typeId=probe:subject nameTag="NamedSubject" loc=(162.00,100.00,170.50)
[2026-08-12 04:23:06:707 WARN] [Scripting] [probe] p1-declared/spawn :: world.getEntity(-8589934589) [spawned as probe:plain name=null] => typeId=probe:plain nameTag="" loc=(165.00,100.00,170.50)
[2026-08-12 04:23:06:707 WARN] [Scripting] [probe] p1-declared/spawn :: world.getEntity(-8589934588) [spawned as probe:plain name="NamedPlain"] => typeId=probe:plain nameTag="NamedPlain" loc=(166.50,100.00,170.50)
[2026-08-12 04:23:06:707 WARN] [Scripting] [probe] p1-declared/spawn :: world.getEntity(-8589934587) [spawned as minecraft:cow name="CowControl"] => typeId=minecraft:cow nameTag="CowControl" loc=(168.50,100.00,170.50)
[2026-08-12 04:23:06:707 WARN] [Scripting] [probe] p1-declared/spawn :: complete
[2026-08-12 04:23:08:708 WARN] [Scripting] [probe] p1-declared/tryspawn :: start probe:tryspawn
[2026-08-12 04:23:08:711 WARN] [Scripting] [probe] p1-declared/tryspawn :: spawnEntity("probe:subject") => ok typeId=probe:subject
[2026-08-12 04:23:08:954 WARN] [Scripting] [probe] p1-declared/tryspawn :: spawnEntity("probe:plain") => ok typeId=probe:plain
[2026-08-12 04:23:09:204 WARN] [Scripting] [probe] p1-declared/tryspawn :: spawnEntity("probe:renamed") => threw InvalidArgumentError: Invalid value passed to argument [0]. 'probe:renamed' is not a valid entity type.
[2026-08-12 04:23:09:453 WARN] [Scripting] [probe] p1-declared/tryspawn :: spawnEntity("probe:plain_renamed") => threw InvalidArgumentError: Invalid value passed to argument [0]. 'probe:plain_renamed' is not a valid entity type.
[2026-08-12 04:23:09:704 WARN] [Scripting] [probe] p1-declared/tryspawn :: complete
[2026-08-12 04:23:15:454 WARN] [Scripting] [probe] p1-declared/census :: start probe:census
[2026-08-12 04:23:17:454 WARN] [Scripting] [probe] p1-declared/census :: arena centre=(163,100,170) floor=minecraft:stone
[2026-08-12 04:23:17:457 WARN] [Scripting] [probe] p1-declared/census :: dimension.getEntities().length=5
[2026-08-12 04:23:17:458 WARN] [Scripting] [probe] p1-declared/census :: entity[0] typeId=probe:subject id=-8589934591 nameTag="" loc=(160.50,100.00,170.50) isValid=true
[2026-08-12 04:23:17:458 WARN] [Scripting] [probe] p1-declared/census :: entity[1] typeId=probe:subject id=-8589934590 nameTag="NamedSubject" loc=(162.00,100.00,170.50) isValid=true
[2026-08-12 04:23:17:458 WARN] [Scripting] [probe] p1-declared/census :: entity[2] typeId=probe:plain id=-8589934589 nameTag="" loc=(165.00,100.00,170.50) isValid=true
[2026-08-12 04:23:17:458 WARN] [Scripting] [probe] p1-declared/census :: entity[3] typeId=probe:plain id=-8589934588 nameTag="NamedPlain" loc=(166.50,100.00,170.50) isValid=true
[2026-08-12 04:23:17:458 WARN] [Scripting] [probe] p1-declared/census :: entity[4] typeId=minecraft:cow id=-8589934587 nameTag="CowControl" loc=(164.78,100.00,176.22) isValid=true
[2026-08-12 04:23:17:460 WARN] [Scripting] [probe] p1-declared/census :: getEntities({location:centre,maxDistance:24}).length=5
[2026-08-12 04:23:17:460 WARN] [Scripting] [probe] p1-declared/census :: getEntities({type:"probe:subject"}).length=2
[2026-08-12 04:23:17:460 WARN] [Scripting] [probe] p1-declared/census :: getEntities({type:"probe:plain"}).length=2
[2026-08-12 04:23:17:460 WARN] [Scripting] [probe] p1-declared/census :: getEntities({type:"probe:renamed"}).length=0
[2026-08-12 04:23:17:461 WARN] [Scripting] [probe] p1-declared/census :: getEntities({type:"probe:plain_renamed"}).length=0
[2026-08-12 04:23:17:461 WARN] [Scripting] [probe] p1-declared/census :: getEntities({families:["probe_family"]}).length=4
[2026-08-12 04:23:17:461 WARN] [Scripting] [probe] p1-declared/census :: getEntities({type:"minecraft:cow"}).length=1
[2026-08-12 04:23:17:462 WARN] [Scripting] [probe] p1-declared/census :: cmd testfor @e[type=probe:subject] successCount=2
[2026-08-12 04:23:17:462 WARN] [Scripting] [probe] p1-declared/census :: cmd testfor @e[type=probe:plain] successCount=2
[2026-08-12 04:23:17:463 WARN] [Scripting] [probe] p1-declared/census :: cmd testfor @e[type=probe:renamed] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "probe:renamed": at "r @e[type=>>probe:renamed<<]"
[2026-08-12 04:23:17:463 WARN] [Scripting] [probe] p1-declared/census :: cmd testfor @e[type=probe:plain_renamed] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "probe:plain_renamed": at "r @e[type=>>probe:plain_renamed<<]"
[2026-08-12 04:23:17:463 WARN] [Scripting] [probe] p1-declared/census :: cmd testfor @e[family=probe_family] successCount=4
[2026-08-12 04:23:17:463 WARN] [Scripting] [probe] p1-declared/census :: cmd testfor @e[name=NamedSubject] successCount=1
[2026-08-12 04:23:17:463 WARN] [Scripting] [probe] p1-declared/census :: dynamicProperty probe:saved_ids=[{"id":"-8589934591","typeId":"probe:subject","nameTag":null},{"id":"-8589934590","typeId":"probe:subject","nameTag":"NamedSubject"},{"id":"-8589934589","typeId":"probe:plain","nameTag":null},{"id":"-8589934588","typeId":"probe:plain","nameTag":"NamedPlain"},{"id":"-8589934587","typeId":"minecraft:cow","nameTag":"CowControl"}]
[2026-08-12 04:23:17:464 WARN] [Scripting] [probe] p1-declared/census :: world.getEntity(-8589934591) [spawned as probe:subject name=null] => typeId=probe:subject nameTag="" loc=(160.50,100.00,170.50)
[2026-08-12 04:23:17:464 WARN] [Scripting] [probe] p1-declared/census :: world.getEntity(-8589934590) [spawned as probe:subject name="NamedSubject"] => typeId=probe:subject nameTag="NamedSubject" loc=(162.00,100.00,170.50)
[2026-08-12 04:23:17:464 WARN] [Scripting] [probe] p1-declared/census :: world.getEntity(-8589934589) [spawned as probe:plain name=null] => typeId=probe:plain nameTag="" loc=(165.00,100.00,170.50)
[2026-08-12 04:23:17:464 WARN] [Scripting] [probe] p1-declared/census :: world.getEntity(-8589934588) [spawned as probe:plain name="NamedPlain"] => typeId=probe:plain nameTag="NamedPlain" loc=(166.50,100.00,170.50)
[2026-08-12 04:23:17:464 WARN] [Scripting] [probe] p1-declared/census :: world.getEntity(-8589934587) [spawned as minecraft:cow name="CowControl"] => typeId=minecraft:cow nameTag="CowControl" loc=(164.78,100.00,176.22)
[2026-08-12 04:23:17:464 WARN] [Scripting] [probe] p1-declared/census :: complete
```

## Phase p2-withdrawn — same pack uuid at v0.2.0, declaring only probe:renamed and probe:plain_renamed

```text
[2026-08-12 04:23:37:511 WARN] [Scripting] [probe] p2-withdrawn/census :: start probe:census
[2026-08-12 04:23:39:474 WARN] [Scripting] [probe] p2-withdrawn/census :: arena centre=(163,100,170) floor=minecraft:stone
[2026-08-12 04:23:39:475 WARN] [Scripting] [probe] p2-withdrawn/census :: dimension.getEntities().length=1
[2026-08-12 04:23:39:475 WARN] [Scripting] [probe] p2-withdrawn/census :: entity[0] typeId=minecraft:cow id=-8589934587 nameTag="CowControl" loc=(169.12,100.00,170.01) isValid=true
[2026-08-12 04:23:39:475 WARN] [Scripting] [probe] p2-withdrawn/census :: getEntities({location:centre,maxDistance:24}).length=1
[2026-08-12 04:23:39:475 WARN] [Scripting] [probe] p2-withdrawn/census :: getEntities({type:"probe:subject"}).length=0
[2026-08-12 04:23:39:476 WARN] [Scripting] [probe] p2-withdrawn/census :: getEntities({type:"probe:plain"}).length=0
[2026-08-12 04:23:39:476 WARN] [Scripting] [probe] p2-withdrawn/census :: getEntities({type:"probe:renamed"}).length=0
[2026-08-12 04:23:39:476 WARN] [Scripting] [probe] p2-withdrawn/census :: getEntities({type:"probe:plain_renamed"}).length=0
[2026-08-12 04:23:39:476 WARN] [Scripting] [probe] p2-withdrawn/census :: getEntities({families:["probe_family"]}).length=0
[2026-08-12 04:23:39:476 WARN] [Scripting] [probe] p2-withdrawn/census :: getEntities({type:"minecraft:cow"}).length=1
[2026-08-12 04:23:39:476 WARN] [Scripting] [probe] p2-withdrawn/census :: cmd testfor @e[type=probe:subject] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "probe:subject": at "r @e[type=>>probe:subject<<]"
[2026-08-12 04:23:39:476 WARN] [Scripting] [probe] p2-withdrawn/census :: cmd testfor @e[type=probe:plain] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "probe:plain": at "r @e[type=>>probe:plain<<]"
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: cmd testfor @e[type=probe:renamed] successCount=0
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: cmd testfor @e[type=probe:plain_renamed] successCount=0
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: cmd testfor @e[family=probe_family] successCount=0
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: cmd testfor @e[name=NamedSubject] successCount=0
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: dynamicProperty probe:saved_ids=[{"id":"-8589934591","typeId":"probe:subject","nameTag":null},{"id":"-8589934590","typeId":"probe:subject","nameTag":"NamedSubject"},{"id":"-8589934589","typeId":"probe:plain","nameTag":null},{"id":"-8589934588","typeId":"probe:plain","nameTag":"NamedPlain"},{"id":"-8589934587","typeId":"minecraft:cow","nameTag":"CowControl"}]
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: world.getEntity(-8589934591) [spawned as probe:subject name=null] => undefined
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: world.getEntity(-8589934590) [spawned as probe:subject name="NamedSubject"] => undefined
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: world.getEntity(-8589934589) [spawned as probe:plain name=null] => undefined
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: world.getEntity(-8589934588) [spawned as probe:plain name="NamedPlain"] => undefined
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: world.getEntity(-8589934587) [spawned as minecraft:cow name="CowControl"] => typeId=minecraft:cow nameTag="CowControl" loc=(169.12,100.00,170.01)
[2026-08-12 04:23:39:477 WARN] [Scripting] [probe] p2-withdrawn/census :: complete
[2026-08-12 04:23:44:124 WARN] [Scripting] [probe] p2-withdrawn/tryspawn :: start probe:tryspawn
[2026-08-12 04:23:44:125 WARN] [Scripting] [probe] p2-withdrawn/tryspawn :: spawnEntity("probe:subject") => threw InvalidArgumentError: Invalid value passed to argument [0]. 'probe:subject' is not a valid entity type.
[2026-08-12 04:23:44:374 WARN] [Scripting] [probe] p2-withdrawn/tryspawn :: spawnEntity("probe:plain") => threw InvalidArgumentError: Invalid value passed to argument [0]. 'probe:plain' is not a valid entity type.
[2026-08-12 04:23:44:624 WARN] [Scripting] [probe] p2-withdrawn/tryspawn :: spawnEntity("probe:renamed") => ok typeId=probe:renamed
[2026-08-12 04:23:44:874 WARN] [Scripting] [probe] p2-withdrawn/tryspawn :: spawnEntity("probe:plain_renamed") => ok typeId=probe:plain_renamed
[2026-08-12 04:23:45:124 WARN] [Scripting] [probe] p2-withdrawn/tryspawn :: complete
```

## Phase p3-restored — data pack back at v0.1.0

```text
[2026-08-12 04:24:05:400 WARN] [Scripting] [probe] p3-restored/census :: start probe:census
[2026-08-12 04:24:07:354 WARN] [Scripting] [probe] p3-restored/census :: arena centre=(163,100,170) floor=minecraft:stone
[2026-08-12 04:24:07:355 WARN] [Scripting] [probe] p3-restored/census :: dimension.getEntities().length=5
[2026-08-12 04:24:07:356 WARN] [Scripting] [probe] p3-restored/census :: entity[0] typeId=minecraft:cow id=-8589934587 nameTag="CowControl" loc=(160.89,100.00,166.82) isValid=true
[2026-08-12 04:24:07:356 WARN] [Scripting] [probe] p3-restored/census :: entity[1] typeId=probe:subject id=-8589934591 nameTag="" loc=(160.50,100.00,170.50) isValid=true
[2026-08-12 04:24:07:356 WARN] [Scripting] [probe] p3-restored/census :: entity[2] typeId=probe:subject id=-8589934590 nameTag="NamedSubject" loc=(162.00,100.00,170.50) isValid=true
[2026-08-12 04:24:07:356 WARN] [Scripting] [probe] p3-restored/census :: entity[3] typeId=probe:plain id=-8589934589 nameTag="" loc=(165.00,100.00,170.50) isValid=true
[2026-08-12 04:24:07:356 WARN] [Scripting] [probe] p3-restored/census :: entity[4] typeId=probe:plain id=-8589934588 nameTag="NamedPlain" loc=(166.50,100.00,170.50) isValid=true
[2026-08-12 04:24:07:358 WARN] [Scripting] [probe] p3-restored/census :: getEntities({location:centre,maxDistance:24}).length=5
[2026-08-12 04:24:07:358 WARN] [Scripting] [probe] p3-restored/census :: getEntities({type:"probe:subject"}).length=2
[2026-08-12 04:24:07:359 WARN] [Scripting] [probe] p3-restored/census :: getEntities({type:"probe:plain"}).length=2
[2026-08-12 04:24:07:359 WARN] [Scripting] [probe] p3-restored/census :: getEntities({type:"probe:renamed"}).length=0
[2026-08-12 04:24:07:359 WARN] [Scripting] [probe] p3-restored/census :: getEntities({type:"probe:plain_renamed"}).length=0
[2026-08-12 04:24:07:359 WARN] [Scripting] [probe] p3-restored/census :: getEntities({families:["probe_family"]}).length=4
[2026-08-12 04:24:07:359 WARN] [Scripting] [probe] p3-restored/census :: getEntities({type:"minecraft:cow"}).length=1
[2026-08-12 04:24:07:359 WARN] [Scripting] [probe] p3-restored/census :: cmd testfor @e[type=probe:subject] successCount=2
[2026-08-12 04:24:07:359 WARN] [Scripting] [probe] p3-restored/census :: cmd testfor @e[type=probe:plain] successCount=2
[2026-08-12 04:24:07:360 WARN] [Scripting] [probe] p3-restored/census :: cmd testfor @e[type=probe:renamed] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "probe:renamed": at "r @e[type=>>probe:renamed<<]"
[2026-08-12 04:24:07:360 WARN] [Scripting] [probe] p3-restored/census :: cmd testfor @e[type=probe:plain_renamed] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "probe:plain_renamed": at "r @e[type=>>probe:plain_renamed<<]"
[2026-08-12 04:24:07:360 WARN] [Scripting] [probe] p3-restored/census :: cmd testfor @e[family=probe_family] successCount=4
[2026-08-12 04:24:07:360 WARN] [Scripting] [probe] p3-restored/census :: cmd testfor @e[name=NamedSubject] successCount=1
[2026-08-12 04:24:07:360 WARN] [Scripting] [probe] p3-restored/census :: dynamicProperty probe:saved_ids=[{"id":"-8589934591","typeId":"probe:subject","nameTag":null},{"id":"-8589934590","typeId":"probe:subject","nameTag":"NamedSubject"},{"id":"-8589934589","typeId":"probe:plain","nameTag":null},{"id":"-8589934588","typeId":"probe:plain","nameTag":"NamedPlain"},{"id":"-8589934587","typeId":"minecraft:cow","nameTag":"CowControl"}]
[2026-08-12 04:24:07:361 WARN] [Scripting] [probe] p3-restored/census :: world.getEntity(-8589934591) [spawned as probe:subject name=null] => typeId=probe:subject nameTag="" loc=(160.50,100.00,170.50)
[2026-08-12 04:24:07:361 WARN] [Scripting] [probe] p3-restored/census :: world.getEntity(-8589934590) [spawned as probe:subject name="NamedSubject"] => typeId=probe:subject nameTag="NamedSubject" loc=(162.00,100.00,170.50)
[2026-08-12 04:24:07:361 WARN] [Scripting] [probe] p3-restored/census :: world.getEntity(-8589934589) [spawned as probe:plain name=null] => typeId=probe:plain nameTag="" loc=(165.00,100.00,170.50)
[2026-08-12 04:24:07:361 WARN] [Scripting] [probe] p3-restored/census :: world.getEntity(-8589934588) [spawned as probe:plain name="NamedPlain"] => typeId=probe:plain nameTag="NamedPlain" loc=(166.50,100.00,170.50)
[2026-08-12 04:24:07:361 WARN] [Scripting] [probe] p3-restored/census :: world.getEntity(-8589934587) [spawned as minecraft:cow name="CowControl"] => typeId=minecraft:cow nameTag="CowControl" loc=(160.89,100.00,166.82)
[2026-08-12 04:24:07:361 WARN] [Scripting] [probe] p3-restored/census :: complete
[2026-08-12 04:24:11:853 WARN] [Scripting] [probe] p3-restored/tryspawn :: start probe:tryspawn
[2026-08-12 04:24:11:859 WARN] [Scripting] [probe] p3-restored/tryspawn :: spawnEntity("probe:subject") => ok typeId=probe:subject
[2026-08-12 04:24:12:104 WARN] [Scripting] [probe] p3-restored/tryspawn :: spawnEntity("probe:plain") => ok typeId=probe:plain
[2026-08-12 04:24:12:353 WARN] [Scripting] [probe] p3-restored/tryspawn :: spawnEntity("probe:renamed") => threw InvalidArgumentError: Invalid value passed to argument [0]. 'probe:renamed' is not a valid entity type.
[2026-08-12 04:24:12:603 WARN] [Scripting] [probe] p3-restored/tryspawn :: spawnEntity("probe:plain_renamed") => threw InvalidArgumentError: Invalid value passed to argument [0]. 'probe:plain_renamed' is not a valid entity type.
[2026-08-12 04:24:12:853 WARN] [Scripting] [probe] p3-restored/tryspawn :: complete
```

## Server load lines, all three lifetimes

Nothing is logged about the withdrawn identifiers at any load. The only pack lines are the stack
listing, and the only warnings in the whole run are the server's allow-list boilerplate.

```text
[2026-08-12 04:13:47:603 INFO] Pack Stack - [01] identifier rename probe data (v1: probe:subject) (id: 02ea60ca-92a8-4e23-9244-be3a9066c911, version: 0.1.0) @ development_behavior_packs/probedata
[2026-08-12 04:23:31:518 INFO] Pack Stack - [01] identifier rename probe data (v2: probe:renamed) (id: 02ea60ca-92a8-4e23-9244-be3a9066c911, version: 0.2.0) @ development_behavior_packs/probedata
[2026-08-12 04:23:59:377 INFO] Pack Stack - [01] identifier rename probe data (v1: probe:subject) (id: 02ea60ca-92a8-4e23-9244-be3a9066c911, version: 0.1.0) @ development_behavior_packs/probedata
```

The p2 world load, in full, from `Opening level` to `Server started`:

```text
[2026-08-12 04:23:31:382 INFO] Opening level 'worlds/dev/db'
[2026-08-12 04:23:31:518 INFO] Pack Stack - [00] identifier rename probe (script) (id: 09ee7b49-12d6-4cb0-a3a0-283d3b33a3ae, version: 0.1.0) @ development_behavior_packs/probescript
[2026-08-12 04:23:31:518 INFO] Pack Stack - [01] identifier rename probe data (v2: probe:renamed) (id: 02ea60ca-92a8-4e23-9244-be3a9066c911, version: 0.2.0) @ development_behavior_packs/probedata
[2026-08-12 04:23:32:438 INFO] IPv4 supported, port: 19132: Used for gameplay and LAN discovery
[2026-08-12 04:23:32:438 INFO] IPv6 supported, port: 19133: Used for gameplay
[2026-08-12 04:23:32:464 INFO] Signed in to signaling service successfully
[2026-08-12 04:23:32:465 INFO] Waiting for Minecraft services...
[2026-08-12 04:23:32:566 INFO] Server started.
```

## Findings

1. **The world loads.** No error, no refusal, no mention of the withdrawn identifiers.
2. **The entities are entirely absent from the running world while their type is undeclared.**
   `dimension.getEntities().length=1` in p2 against `=5` in p1 — only the vanilla cow. They are
   queryable by neither the old identifier nor the new one: `getEntities({type:"probe:subject"})`
   and `getEntities({type:"probe:renamed"})` both return 0, `getEntities({families:["probe_family"]})`
   returns 0, and `testfor @e[name=NamedSubject]` reports `successCount=0`. There is no broken
   entity to read a `typeId` off: `world.getEntity(<recorded id>)` returns `undefined` for all four,
   while the cow's id still resolves.
3. **The saved data survives.** Restoring the old identifier brings all four back in p3 with the
   same entity ids, the same name tags, and the same positions they were spawned at, down to the
   two decimal places the probe prints. This is not a reload of an untouched chunk: the chunk was
   loaded and re-saved during p2, as the cow's movement shows.
4. **A name tag makes no difference, and neither does `minecraft:persistent`.** `probe:subject`
   carries `minecraft:persistent` and `probe:plain` does not; one of each pair carried a name tag.
   All four behave identically in both directions.
5. **An undeclared identifier is not a valid entity type to the API or to commands.** In the phase
   where it is undeclared, `spawnEntity("probe:subject")` throws
   `InvalidArgumentError: Invalid value passed to argument [0]. 'probe:subject' is not a valid entity type.`
   and `testfor @e[type=probe:subject]` fails to parse. `getEntities({type:...})` does not throw for
   an unknown type — it just returns an empty list, which is indistinguishable from "declared, none
   present".

## Caveats

- One server build (1.26.43.1) and one `@minecraft/server` version (2.8.0).
- The withdrawal lasted a single server lifetime with the chunk loaded throughout. Nothing here says
  what happens after many sessions, or whether some later chunk-format rewrite would drop the
  orphaned records.
- The world was never loaded by a client, and no player was ever in it.
- The pack uuid stayed the same and only the version and the declared identifiers changed. Removing
  the pack from the world's activation list entirely was not tested.
- Only two custom entity types were involved; no vanilla identifier was withdrawn, and no attempt
  was made to re-point the old identifier at different content.
