# village-guard protection probe results

Observed output from running `protection-probe` against a real Bedrock dedicated server, headless.
The probes report what the engine did; nothing here asserts what it should do.

## Run provenance

| | |
|---|---|
| Date | 2026-08-06 |
| Server | `itzg/minecraft-bedrock-server`, Bedrock dedicated **1.26.40.8** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Pack | `village-guard protection probes` 0.1.0, uuid `7a3d1c40-5e21-4b88-9f0e-2c6a4d81b503` |
| Difficulty | `hard` (zombie→villager conversion is certain there) |
| Trigger | `send-command scriptevent vgprobe:<set>` from the server console, no source entity |
| Arena | a 21×21 walled stone platform the pack builds at `(163, 100, 170)`, inside its own ticking area |
| Driver | `node run.mjs 3` — brings the stack up on a fresh volume, installs the pack, runs each set three times |
| Coverage | 3 × `sources`, 3 × `conversion`, 3 × `reaction`; no `PROBE CRASHED` lines, every `complete` line present |
| Ran by | an agent, in the session that authored `wip-001-the-protection-design` |

The raw log is `OUTPUT.txt` beside this file, in delivery order with server timestamps. The pack
source is `pack/`.

**Reproducibility.** Every case of `sources` outside `zombie-attack` produced a byte-identical line
in all three runs, as did every case of `conversion`. `zombie-attack` and `reaction` depend on when
a zombie's pathing brings it into reach, so their hit counts differ per run; the readings they turn
on do not.

**Two rig faults were found and fixed before these runs, and both mattered.** The arena's `fill`
commands were issued at world load, before the chunk was loaded, so subjects spawned into the air
and every case measured a fall rather than its own source — `buildArena` now retries until it can
read stone back off the floor. And the platform was open, so a panicking villager ran off the edge
and died of the drop at 170 ticks; the walls are what let the conversion control converge on a
zombie kill. An earlier unwalled run read `CONTROL-DIED-WITHOUT-CONVERTING`, which would have been
recorded as "conversion does not happen here" had the death cause not been logged.

## What answered what

| open question | set | answer |
|---|---|---|
| `q-y65kdr8a` — does the before-event see engine-dealt damage | `sources` | yes, on every route the probe could deal, and the handler's `damage` write takes on all of them |
| `q-a9knxqiu` — does a villager that cannot die still convert | `conversion` | no — with a control that converts every run |
| `q-fc5bw0k0` — does a clamped hit still react | `reaction` | knockback: yes, indistinguishable from vanilla. panic: not discriminated. flinch and sound: unreachable here |

## Set A — `vgprobe:sources`

Each route runs twice on a fresh villager: `observe` records the delivered payload and writes
nothing, `clamp` writes `damage` down to 0.5. There is no health restore in this set, which is what
makes the `zombie-attack/clamp` result below worth reading.

| route | how the damage was dealt | before-event | cause delivered |
|---|---|---|---|
| `script-applyDamage` (control) | `applyDamage(4, {cause: entityAttack})` | raised 3/3 | `entityAttack@4` |
| `command-damage` | `/damage @e[tag=vgsub] 4 entity_attack` | raised 3/3 | `entityAttack@4` |
| `fire` | `setOnFire(6, true)` | raised 3/3, three times per case | `fireTick@1` |
| `explosion` | `createExplosion(loc, 3, {breaksBlocks:false})` | raised 3/3 | `blockExplosion@43` |
| `fall` | teleport 25 blocks up, let it land | raised 3/3 | `fall@21` |
| `suffocation` | bury the subject in a stone column | **no damage dealt** 3/3 | — |
| `zombie-attack` | three zombies spawned adjacent, hard difficulty | raised 3/3 | `entityAttack/minecraft:zombie@3` and `@2.5` |

`suffocation` is the one route the probe could not deal at all: burying the villager took no health
in any run, so the case discriminates nothing either way. `r-pe87rfqq` names suffocation, so it
stays unmeasured rather than answered.

### The `fall` pair is the cleanest reading in the set

Identical in 3/3 runs. Same fall, same 21 damage delivered to the handler:

- `observe` — `health(number:20 -> undefined) subject-alive=false`. The villager died.
- `clamp` — `health(number:20 -> number:19.5) health-lost=number:0.5 subject-alive=true`.

The engine dealt the damage, the handler saw it, the handler's write took, and the write is the
difference between a dead villager and a live one.

### The clamp alone ratchets down, and one villager died of it

`zombie-attack/clamp` is the only case in the set that does not agree across runs, and the
disagreement is the finding. Under sustained attack with no health restore:

| run | hits seen | health lost | outcome |
|---|---|---|---|
| 1 | 23 | 6.5 | survived |
| 2 | 72 | 18 | survived, at 2 health |
| 3 | 78 | — | **died** — `CLAMP-INCONCLUSIVE (subject gone, read the death flag)` |

0.5 per hit is small, and it still adds up: a villager taking 78 hits with nothing putting health
back loses all 20. The clamp is not by itself a protection mechanism, and the restore in
`d-jp67dexu` is not an ergonomic detail — it is the half that makes the other half hold. Set B, with
both, survived 1200 ticks at full health in every run.

## Set B — `vgprobe:conversion`

Identical in 3/3 runs, and the control converts every time:

| case | ticks | outcome | zombie villagers |
|---|---|---|---|
| `control-unguarded` | 420 / 100 / 210 | died, `death-cause=[entityAttack]` | **1** |
| `guarded` | 1200 (the full window) | alive, `health(number:20 -> number:20)` | 0 |

The guard is the clamp and the same-tick restore together, on the three protected types. A villager
it protects survived a hard-difficulty siege by three zombies for the whole window at full health,
and no zombie villager appeared. A villager it did not protect was killed and converted in every
run.

Conversion therefore hangs off the killing blow: preventing the death prevents the conversion, and
`r-9gw909jf` needs no mechanism of its own.

## Set C — `vgprobe:reaction`

A zombie does the hitting, so the knockback is the engine's own. Peak speed in the six ticks after
a hit, against the resting speed in the four before it:

| treatment | per-hit peak speed, all runs | overall peak |
|---|---|---|
| `control-no-handler` (vanilla) | 0.417 – 0.646 | 0.555 / 0.58 / 0.646 |
| `clamped` | 0.308 – 0.624 | 0.647 / 0.698 / 0.671 |
| `cancelled` | 0.002 – 0.278 | 0.261 / 0.294 / 0.334 |

**The clamped hit knocks back exactly as the vanilla hit does, and the cancelled hit does not knock
back at all.** The cancelled treatment's per-hit peaks frequently sit *below* the resting speed
before the hit — the villager was moving, and the hit added nothing. That is the measurement behind
choosing a clamp over a cancellation, and it separates the two mechanisms by a factor of roughly
three.

### Panic is not discriminated by this rig

`moved-horizontally` reads 6.5 – 9.1 for the control, 8.9 – 12.7 clamped, and 9.0 – 10.6 cancelled.
All three move, including the one taking no damage at all — a villager flees a zombie on sight
whether or not the hit lands, so total displacement cannot separate panic-from-being-hit from
ordinary flight. Panic stays open.

### Flinch and the hurt sound are unreachable from here

Both are rendered on the client and reach no log. `CLIENT.md` stages the comparison a person can
make: three penned villagers, one vanilla, one clamped, one cancelled, hit with the same weapon.
The cancelled lane is the calibration — if all three look alike, the observation is not sensitive
enough to mean anything.
