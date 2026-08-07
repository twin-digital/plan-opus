# village structure probe results

Observed output from running `village-structures-probe` against a real Bedrock dedicated server,
headless. The probes report what the engine did; nothing here asserts what it should do.

The question behind them: `village-guard` protects mobs and touches no blocks. What does a village
lose when its beds, job site blocks and bell are destroyed?

## Run provenance

| | |
|---|---|
| Date | 2026-08-07 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.40.8** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `village-guard village structure probes` 0.1.0, uuid `682a9bae-4a8a-40f2-9d38-020ae1313337` |
| Difficulty | `normal` |
| Trigger | `send-command scriptevent vgvil:<step>` from the server console, no source entity |
| Village | a walled 41×41 grass platform the pack builds at `(163, 100, 170)`, inside its own ticking area: 30 beds, 15 job site blocks of 13 kinds, one bell, 8 command-spawned villagers each given 16 bread |
| Driver | `node run.mjs <scenario> [--ticks N]` — brings the stack up, installs the pack, steps the village and snapshots the world between steps |
| Ran by | an agent, in a research run for village-guard |

No client attaches at any point, so nothing here involves a real trade.

## The measurement is the world's own village records

`@minecraft/server` 2.8.0 exposes nothing about villages. `getComponents()` on a villager returns
`movement`, `movement.basic`, `inventory`, `navigation.walk`, `health`, `variant`,
`underwater_movement`, `lava_movement`, `mark_variant`, `is_hidden_when_invisible`, `skin_id`,
`breathable`, `can_climb`, `type_family` — and nothing else. There is no village, dweller, POI,
profession, trade or reputation surface, and `getPropertyIds()` is empty.

Bedrock keeps village state in the world's LevelDB under its own keys, so the probe reads those
directly and diffs them across each destruction. The behavioural readings the pack logs — births,
golem spawns, entity counts, the three villager integers — corroborate the records.

### Snapshot procedure

Bedrock's backup protocol over `send-command`, never a read of the live database:

1. `save hold`
2. `save query`, polled by reading the container log until it answers with the ready line and its
   `<path>:<bytes>` list — `send-command` returns nothing useful, but the reply does reach the log
3. each named file copied out with `docker cp` and **truncated to the byte length given**
4. `save resume`, on every path including errors

The truncation is not cosmetic: `000007.log` was 4,006,909 bytes on disk against a snapshot length
of 3,894,159. Every snapshot in this run used this protocol; no container was stopped to flush.

**Village records reach the database one save behind.** The save that first writes them puts the
bytes past the length `save query` names, so the snapshot that triggered the write cannot see them.
Every capture therefore saves twice and reads the second.

### Reading the database

Bedrock's LevelDB uses zlib raw compression, which no pure-JS reader handles, so `dump-village.mjs`
uses the native `leveldb-zlib` plus `prismarine-nbt`. It is not vendored here — install it and point
`LDB_MODULES` at the `node_modules` holding it. `leveldb-zlib` builds through `cmake-js` and needs a
cmake older than 4 (4.x refuses its `CMakeLists`); `pip install cmake==3.31.6` inside a venv supplies
one, and that was the only obstacle to the native build in this environment.

## What the keyspace really holds

A world with no village has seven ASCII-keyed records — `AutonomousEntities`, `BiomeData`,
`Overworld`, `WorldClocks`, `mobevents`, `schedulerWT`, `scoreboard` — and no village key of any
kind. Once a village forms, four keys appear, all NBT, all named for one village uuid:

| key | holds |
|---|---|
| `VILLAGE_Overworld_<uuid>_INFO` | `X0/X1/Y0/Y1/Z0/Z1` bounds, `Initialized`, `Version`, and the counters `Tick`, `MTick`, `BDTime`, `GDTime`, `PDTick`, plus `RX0/RX1/RY0/RY1/RZ0/RZ1` |
| `VILLAGE_Overworld_<uuid>_DWELLERS` | `Dwellers`, four lists of `actors`, each actor an `ID`, a `TS` and a `last_saved_pos` |
| `VILLAGE_Overworld_<uuid>_POI` | `POI`, a list of `{VillagerID, instances[3]}` — one entry per dweller |
| `VILLAGE_Overworld_<uuid>_PLAYERS` | `Players`, empty in every snapshot here (no client attached) |

The uuid is prefixed by the dimension: `Overworld_<uuid>`, not the bare uuid.

Two shapes are worth stating because they bound what the records can answer:

**`DWELLERS` is four lists and only the first was ever non-empty.** Every villager, adult and baby,
appears in list 0; lists 1–3 stayed at zero throughout. No iron golem ever spawned in this run, so
nothing here says which list a golem would occupy.

**`POI` is one entry per dweller, each with three instance slots, and only slot 0 was ever filled.**
Slot 0 carries `Name: "villager"`, `Type: 0`, `Capacity: 1`, `OwnerCount: 1`, `Radius: 0.75` and an
`X/Y/Z` that is exactly a bed foot the probe placed. Slots 1 and 2 read `Skip: 1` in every snapshot
of every scenario. **No job site block was ever recorded as a point of interest**, with fifteen of
thirteen kinds standing unclaimed for the whole run.

## What answered what

| question | scenario | answer |
|---|---|---|
| do villagers disappear? | all five | no — not one villager was lost in any phase of any scenario, with or without structures |
| do they survive a chunk unload and reload? | `wreck` | yes: dropping the ticking area took every villager out of view, and re-adding it brought all 30 back |
| does breeding stop with the beds gone? | `breed`, `wreck` | **no** — three villagers were born in the 2,400 ticks after every bed was destroyed, and eleven in the 7,200 ticks after beds, job sites and bell were all destroyed together |
| does breeding need job sites, or a bell? | `jobs`, `bell` | no to both: two born after every job site went, seven born after the bell went |
| what does bound breeding, then? | `baseline`, `beds` | the count of bed points of interest the *record* holds: breeding ran to villagers == recorded beds and stopped there, and the record kept its 30 bed POIs after the blocks were destroyed |
| does a destroyed job site cost a villager its profession? | `jobs`, `wreck` | no: every tracked villager's `variant`, `mark_variant` and `skin_id` was unchanged after every job site block was destroyed, unchanged again after they were rebuilt, and unchanged after everything was destroyed |
| does the village record survive its structures? | `beds`, `wreck` | yes: with every bed, job site and bell gone, and after a chunk unload and reload, the record still held 30 dwellers and 30 bed POIs pointing at air |
| do iron golems spawn at all? | every scenario | no golem spawned anywhere, including an intact 30-bed 30-villager village — the proxy did not work, see below |
| can a villager restock with no job site? | — | **unmeasured**: a trade needs a client, none attached, and the script API exposes no trade surface |
| does profession lock after a first trade? | — | **unmeasured**, for the same reason |

### Breeding is bounded by the recorded bed, not by the block

Three readings say the same thing. `baseline` started 12 villagers against 30 beds, bred to exactly
30 and stopped: `phase-end name=baseline ticks=6000 bornInPhase=18` then `phase-end
name=baseline-cycle ticks=12000 bornInPhase=0`. `beds` started 8 against 30, bred to exactly 30, and
then produced nothing in either the no-beds phase or the rebuilt phase — it was already at the
ceiling. `wreck` razed the village at 15 villagers and then bred to exactly 30 with no bed block
anywhere in the world.

The record explains all three: the `POI` list still named 30 claimed beds at coordinates that were
air. Destroying a bed does not release its point of interest, so the village goes on breeding
against beds that no longer exist, up to the count it had recorded.

That ceiling is per-village-record, not per-block, and nothing here establishes how long a released
POI takes to clear — the longest window on a razed village in this run is 7,200 ticks plus a chunk
unload and reload, and the POIs were still there at the end of it.

## The iron golem proxy did not work, and that matters

No iron golem spawned in any scenario: not in an intact village of 30 villagers and 30 claimed beds
over 18,000 ticks of the `baseline` scenario, across a locked day, a locked night and a running
day/night cycle, with `domobspawning true` and difficulty `normal`. `golemSpawns=0` on every
snapshot line in every log here.

That is a **rig result, not a finding about villages**. Golem spawning was the intended proxy for
"is this still a village", and it never fired on the working baseline, so it cannot be read either
way after a destruction — the brief's own instruction not to proceed on a village that never formed
applies to this one measurement. What replaced it is the record: `VILLAGE_*` keys existing, with
dwellers and POIs in them, is the direct statement that the engine considers this a village.

Untested candidates for why: no player is ever in the village (`PLAYERS` is empty in every snapshot),
no villager ever slept (`bedsOccupied=0` on every snapshot, including through a night), and no
villager ever claimed a job site.

## What this does not establish

- **Restocking and the trade lock.** Both need a player to trade, and no client attaches. The script
  API has no trade surface at all, so there is no substitute.
- **Professions taken from a job site.** Command-spawned Bedrock villagers arrive with a profession
  already — the eight spawned in each scenario carried `variant` values scattered across 1–14 before
  any job site existed. None ever claimed one: `POI` slots 1 and 2 read `Skip: 1` in every snapshot.
  So "the job site block was destroyed and the profession was unchanged" is measured on villagers
  whose profession never came from a job site in the first place. What a villager that *earned* its
  profession does when its job site is broken is untested. The 22 babies born in these runs would
  have been the natural source of unemployed adults, but a baby takes about 24,000 ticks to grow and
  none did within these windows.
- **Iron golems**, entirely — see above. Nothing here says whether golem spawning stops when a
  village's structures go, because it never started.
- **Villagers' behaviour** with no bed and no job site was read only as counts and positions. No
  pathing, schedule or panic state is reachable from the script API, and no client watched them.
- **Long-run POI release.** The records held destroyed beds for the longest window run here. A
  village left razed for an hour, or reloaded from disk into a fresh server process, may behave
  differently.
- **Natural villages.** Every village here was built by commands on a flat platform inside a ticking
  area, populated by `spawnEntity`, with no player in the world. A generated village with a player
  living in it is a different subject.

## The scenarios

| scenario | what it does | output |
|---|---|---|
| `api` | reports what the script API exposes for a villager | `API-OUTPUT.txt` |
| `baseline` | builds the village and watches it a locked day, then a running day/night cycle | `BASELINE-OUTPUT.txt` |
| `beds` | baseline, destroy all 30 beds, watch, rebuild, watch | `BEDS-OUTPUT.txt` |
| `breed` | four villagers against thirty beds — well under the breeding ceiling — then the same removal and rebuild | `BREED-OUTPUT.txt` |
| `jobs` | baseline, destroy all job site blocks, watch, rebuild, watch | `JOBS-OUTPUT.txt` |
| `bell` | baseline, destroy only the bell, watch | `BELL-OUTPUT.txt` |
| `wreck` | baseline, destroy beds, job sites and bell together, watch three times as long, then unload the chunks and reload them | `WRECK-OUTPUT.txt` |

Each ran on its own destroyed and rebuilt volume. `records/<scenario>/` holds the parsed village
records for every capture. The pack also carries composite `vgvil:<scenario>` sets that run the same
sequences without snapshots; the driver did not use them, it used the step commands.

`beds` and `jobs` ran with 6,000-tick phases, `wreck`, `breed` and `bell` with 2,400 (7,200 for the
razed phase). Two scenarios were run concurrently on two stacks (`STACK=b`), which roughly halved
each server's tick rate; nothing here is a timing measurement, so that costs only wall clock.

## A rig note

`jobsPlaced=16 jobsRead=15` in every build: one of the sixteen job site blocks never took. The
village had fifteen job sites of thirteen kinds throughout, and none was ever claimed, so which one
failed does not bear on anything above.
