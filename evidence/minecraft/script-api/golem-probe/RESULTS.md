# village-guard golem probe results

Observed output from running `golem-probe` against a real Bedrock dedicated server, headless. The
probes report what the engine did; nothing here asserts what it should do.

These probes were written to answer one defect: the owner hit a protected iron golem in a live
world, the hit was cancelled — no visible damage reaction — and the golem turned hostile and killed
them. `r-ef113dxi` says a player's hit "does nothing at all … the player's standing with it is
unchanged", so the retaliation is a defect against a requirement in force.

## Run provenance

| | |
|---|---|
| Date | 2026-08-07 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.40.8** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `village-guard golem probes` 0.1.0, uuid `19729136-3a4c-4243-8a5d-e1bbec325650` |
| Difficulty | `hard` |
| Trigger | `send-command scriptevent vggolem:<set>` from the server console, no source entity |
| Arena | a 9×9 walled stone pen the pack builds at `(163, 100, 170)`, inside its own ticking area |
| Driver | `node run.mjs [runs] [sets]` — brings the stack up, installs the pack, runs each named set |
| Ran by | an agent, in the session that implemented village-guard 005 |

Four raw logs sit beside this file, each in delivery order with server timestamps. Every set was
driven on its own destroyed and rebuilt volume (`docker compose -f compose.yaml down -v`), because
entity handles go stale after the first run in a session.

| log | set | driver invocation |
|---|---|---|
| `AGGRO-OUTPUT.txt` | `aggro` | `OUT_FILE=AGGRO-OUTPUT.txt node run.mjs 1 aggro` |
| `FROMPLAYER-OUTPUT.txt` | `fromplayer` | `OUT_FILE=FROMPLAYER-OUTPUT.txt node run.mjs 1 fromplayer` |
| `FIX-OUTPUT.txt` | `fix` | `OUT_FILE=FIX-OUTPUT.txt node run.mjs 1 fix` |
| `TIMING-OUTPUT.txt` | `timing` | `OUT_FILE=TIMING-OUTPUT.txt node run.mjs 1 timing` |
| `ENROL-OUTPUT.txt` | `enrol` | `OUT_FILE=ENROL-OUTPUT.txt node run.mjs 1 enrol` |
| `SIEGE-OUTPUT.txt` | `siege` | `OUT_FILE=SIEGE-OUTPUT.txt node run.mjs 1 siege` |

## The attacker is a stand-in, and that is the limit of these results

No client attaches at any point, so nothing here was driven by a real player. The attacker is
`vgprobe:swinger_*` — a probe entity defined in `pack/entities/`, which really swings a melee attack
at the golem. Three of them exist, identical apart from `minecraft:type_family`:

| swinger | family | why |
|---|---|---|
| `swinger_player` | `player` | the family the golem's own filters read when a player hits it |
| `swinger_plain` | `vgplain` | a family no golem filter mentions — the siege control |
| `swinger_creeper` | `creeper` | the one family vanilla's base filter already excludes |

**What this establishes:** what the engine does with a hit whose damage source carries each family.
**What it does not establish:** that a real player's swing takes the same code path. A player is not
only a `player`-family entity — a village-spawned golem also carries
`minecraft:behavior.defend_village_target`, which targets players on village reputation and has
nothing to do with who hit whom. **The `defend_village_target` route was not probed and needs a
human at a client.** Every golem below was `spawnEntity`'d, so it carried neither the
`minecraft:village_created` nor the `minecraft:player_created` component group.

The measurement of "the golem turned hostile" is `afterEvents.entityHurt` whose
`damageSource.damagingEntity` is the golem — the golem landing a blow — stamped with the tick. The
`cow/never-hit` case is the control: a cow that never swings is never struck.

## The mechanism

Vanilla's `iron_golem.json` (read off the server image at
`/data/behavior_packs/vanilla/entities/iron_golem.json`, format version 1.26.0) carries no
`minecraft:angry` component. Retaliation is entirely `minecraft:behavior.hurt_by_target`, whose
`entity_types` filter is `is_family != creeper`. The entity has exactly two events,
`minecraft:from_player` and `minecraft:from_village`; there is no calm event. `@minecraft/server`
2.8.0 exposes no target, anger, or aggro surface on `Entity` — `triggerEvent` is the only lever.

### Cancelling the hit stops the damage and not the targeting

`aggro`, ten cases. Under both treatments the golem ends at 100 health, and strikes back anyway.

| case | hits on golem | golem health | strikes by golem |
|---|---|---|---|
| `player/none` | 24 | 28 | 23 |
| `player/cancel` | 23 | **100** | **24** |
| `player/clamp0` | 24 | **100** | **23** |
| `plain/cancel` | 9 | 100 | 23 |
| `creeper/none` | 13 | 61 | **0** |
| `creeper/cancel` | 23 | 100 | **0** |
| `cow/never-hit` | 0 | 100 | 0 |

The creeper cases are what makes this a mechanism rather than an observation: retaliation is gated
by the `hurt_by_target` family filter, which the engine honours, and it is not gated by whether the
damage landed.

### `minecraft:from_player` stops it, and only if it arrives first

The event adds the `minecraft:player_created` component group, whose `hurt_by_target` filter
excludes the `player` family as well as `creeper`.

| case | when the event was sent | hits on golem | strikes by golem |
|---|---|---|---|
| `timing/spawn` | before any hit | 25 | **0** |
| `timing/apply@60` | tick 60 | 16 | 26, ticks `30 50 80 100 120 …` |
| `timing/apply@120` | tick 120 | 12 | 28, ticks `30 50 70 90 110 140 …` |
| `timing/apply@240` | tick 240 | 29 | 28, ticks `35 55 … 235 270 290 …` |
| `timing/never` | never | 28 | 28 |

The strike cadence is a flat 20 ticks and runs straight through the moment the event lands. **The
event does not clear a target already set.** It prevents one being set.

### A before-event handler cannot send it

```
from_player=string:first-hit:threw ReferenceError: Native function [Entity::triggerEvent] cannot be used in restricted execution.
```

### Deferring it one tick is a race, and loses about half the time

`timing/defer-first-hit/a` and `/b` are the same case run twice: cancel the hit in the before
handler, and `system.run` the trigger for the next tick. Both report `deferred:ok` and a
`minecraft:from_player` trigger on the golem.

| case | strikes by golem |
|---|---|
| `defer-first-hit/a` | 29, first at tick 25 |
| `defer-first-hit/b` | **0** |
| `fix/player/cancel+defer` | 23, first at tick 35 |

Three runs of one shape, two hostile. The golem acquires its target on the hit itself; the deferred
event arrives a tick later and sometimes beats the acquisition, sometimes does not.

### Enrolling the golem before it is hit works, and leaves the siege alone

`enrol` subscribes `afterEvents.entityLoad` and `afterEvents.entitySpawn` and sends
`minecraft:from_player` to every iron golem it sees.

| case | hits on golem | strikes by golem |
|---|---|---|
| `enrolled/player/cancel` | 12 | **0** |
| `enrolled/plain/clamp0` | 15 | 24 |
| `enrolled/zombie/clamp0` | 5 | 2, and the zombie was killed |

The exclusion is player-specific: a golem carrying the group still fights a zombie to death and
still retaliates against an unrelated family. A siege still looks like a siege. `siege` says the
same against a plain zombie — `zombie/plain-golem` and `zombie/from_player-golem` both strike twice
and kill it, whether or not the group is on.

One question the rig could not reach: `siege/zombie/from_player-mid-fight` meant to send the event
to a golem already fighting, to see whether the swap drops a *zombie* target the way a player's
stray swing would trigger it. A golem kills a zombie in two blows, well before the case's tick-120
apply, so the case never sent the event. **Whether the event disturbs a golem mid-siege is
unmeasured** — though `timing/apply@N` says it does not clear a target already set, which is the
same question from the other side.

## What this costs, and why the pack was not changed

The only shape that works enrols the golem before anything hits it, which means acting on the mob's
arrival. `d-8b5m52it` forbids exactly that — "the pack keeps no registry of protected mobs, scans no
dimension, tracks no mob's arrival or departure, and runs no periodic sweep." The fix is therefore
an owner's call, not an implementer's, and `src/protection.ts` was left carrying the defect.

Two consequences the owner would be ruling on alongside it:

- `minecraft:from_player` is written into the entity's saved component groups. It **persists after
  the pack is uninstalled**, and it is not reversible: the golem has no event that removes the
  group.
- A golem already in the world and already angry at a player when the pack starts stays angry. The
  event prevents targeting; it does not clear a target.

## Reproducibility

`aggro`, `timing` and `enrol` give the same verdict for every case except the deferred one, which is
the finding. Hit counts vary run to run with the swinger's pathing; the readings the results turn on
— whether the golem ever landed a blow, and the tick it landed on — do not.
