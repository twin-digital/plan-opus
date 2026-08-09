# village-guard gap probe results

Observed output from running `gap-probe` against a real Bedrock dedicated server, headless. The
probes report what the engine did; nothing here asserts what it should do.

These probes were written while implementing village-guard 004, to answer what the implementation
raised and what the design's own protection probe left unmeasured.

## Run provenance

| | |
|---|---|
| Date | 2026-08-07 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.40.8** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `village-guard gap probes` 0.1.0, uuid `b1f8d240-3c77-4e6a-9a15-8d40e2c7f931` |
| Difficulty | `hard` (zombie→villager conversion is certain there) |
| Trigger | `send-command scriptevent vggap:<set>` from the server console, no source entity |
| Arena | a 21×21 walled stone platform the pack builds at `(163, 100, 170)`, inside its own ticking area |
| Driver | `node run.mjs [runs] [sets]` — brings the stack up, installs the pack, runs each named set |
| Ran by | an agent, in the session that implemented village-guard 004 |

Three raw logs sit beside this file, each in delivery order with server timestamps:

| log | sets | driver invocation |
|---|---|---|
| `OUTPUT.txt` | `zeroclamp`, `subclamp`, `water`, `restore`, `operator` | `node run.mjs 3` |
| `HAZARD-OUTPUT.txt` | `hazard` | `node run.mjs 1 hazard`, three times, each on a destroyed and rebuilt volume |
| `CONVERT-OUTPUT.txt` | `convert` | `node run.mjs 1 convert`, three times, each on a destroyed and rebuilt volume |

The pack source is `pack/`.

## The shipped pack is the subject

`installProtection`'s logic is transcribed into the probe pack as `treat` plus `installPack`, so the
`restore`, `hazard`, `operator` and `convert` sets exercise what `@twin-digital/village-guard` 0.1.0
actually does, not an approximation of it. The `clamp` constant is the one thing varied.

## What answered what

| question | set | answer |
|---|---|---|
| does a hit written down to zero still land? | `zeroclamp` | it takes no health and knocks back exactly as a vanilla hit does |
| does a mob at or below the clamp die of a clamped hit? | `subclamp` | under a 0.5 clamp it dies; under a zero clamp it does not |
| is that death vanilla's, or only an event? | `convert` | vanilla's — a zombie converts the villager |
| does `beforeEvents.entityHurt` fire for drowning and suffocation? | `water` | both, cause `drowning` and `suffocation` |
| does the shipped pack survive a siege? | `restore` | villager and iron golem alike, at full health |
| does it survive a hazard, where damage arrives every tick? | `hazard` | yes, under both clamp constants |
| can an operator still remove a protected mob? | `operator` | every route tried removed it |

## Four rig faults were found and fixed, and three of them had already corrupted results

**A 20-tick liveness read sits inside the corpse window.** A dead entity stays valid for 21 ticks
(`f:corpse-invalidation-is-twenty-one-ticks`), so the first `subclamp` pass reported every case
`SURVIVED` — including the no-handler control, which had plainly died. The set now subscribes
`entityDie` and waits 60 ticks, and the death it had been hiding is the finding.

**`docker cp <dir> <container>:<existing-dir>` copies the source *into* the destination.** The
second and third driver invocations against a live container left the new pack at
`vggap/pack/scripts/main.js` while the server went on executing `vggap/scripts/main.js` from the
first — so three runs re-ran the first run's script and the fixes appeared to change nothing. The
driver now removes the destination first. The same fault is latent in the protection probe's driver,
which only ever ran once per container.

**A subject left in the open arena walks away from its own case.** Both `water` routes read
`ROUTE-DEALT-NOTHING` until each ran inside a sealed one-block stone shaft with the subject
re-centred on a timer; the protection probe's suffocation case failed the same way and its caveat on
`f:entity-hurt-before-event-sees-engine-dealt-damage` records that as the route being unmeasurable.
It was the rig. `convert` needed the same treatment — a walled 3×3 pen holding villager and zombies
together — because its decisive case drew zero hits on an open platform.

**Entity handles go stale after the first run in a session.** Later runs report subjects
`GONE-WITHOUT-A-DEATH` with no damage seen, and the effect compounds across a session. `hazard` and
`convert` are therefore driven one run per destroyed-and-rebuilt volume rather than three runs
against one. Every reading in `OUTPUT.txt` from a case whose subject vanished without being struck
is that fault, not a finding.

## Reproducibility

`subclamp`, `operator` and `convert` produce the same verdict in every run. `zeroclamp`, `restore`
and `hazard` depend on when a zombie's pathing brings it into reach or how long a hazard runs, so
their hit counts differ per run; the readings they turn on — health lost, peak speed, whether a
death fired — do not.

The one exception worth stating: `zeroclamp` hit counts ranged from 0 to 69 across nine blocks with
no pattern, so nothing here says anything about invulnerability windows. An early reading that
appeared to show a zero clamp removing them was run variance.
