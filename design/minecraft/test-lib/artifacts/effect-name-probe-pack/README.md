# mc-test-lib effect display-name probes

A fifth Bedrock behavior pack for `minecraft/test-lib`. It captures two things the declarations do
not carry: the **`Effect.displayName` mapping** across every vanilla effect type and amplifier, and
the **ranges `addEffect` actually accepts** for amplifier and duration.

`Effect.displayName` is declared a bare `string` with the TSDoc "Gets the player-friendly name of
this effect", so a fake has to produce one. The engine's string encodes both the type and the
amplifier — `f:live-effect-fields-populated` records `minecraft:speed` at amplifier 1 reading
`"Speed II"` — and nothing in the API exposes the mapping: `EffectType.getName()` is declared
"Identifier name of this effect type", and `@minecraft/vanilla-data` ships identifiers with no
names. One data point cannot say whether the library can *compute* a name or must have names
registered. This pack captures the whole mapping so that choice rests on the mapping rather than on
one cell of it.

The second set exists because `addEffect`'s return TSDoc says it "can throw an error if the duration
or amplifier are outside of the valid ranges" without stating either range, `Effect.amplifier` says
only "Sample values range typically from 0 to 4", and the `duration` parameter's own TSDoc states
two different lower bounds in consecutive lines — "The value must be within the range
[0, 20000000]" then "Bounds: [1, 20000000]".

Each probe emits observation lines — it reports what the engine did rather than asserting what it
should do. **There are no results yet: this pack is the instrument, not the answer.**

This pack uses the `mctest5:` namespace with command names of its own, so it coexists with the five
earlier packs. The `[mctest]` line prefix is shared deliberately, so one log filter collects every
pack's output; probe names disambiguate.

## Install

1. Copy this folder into the server's `development_behavior_packs/` (or `behavior_packs/`). No
   experiments are required: the script module targets stable `@minecraft/server` 2.8.0.
2. Add it to the world's `world_behavior_packs.json` with this manifest's uuid
   (`24b22e44-126c-479d-94f9-32384266dcec`) and version `[0, 1, 0]`, then **restart the server** —
   `/reload` does not register a new custom command. Confirm
   `mc-test-lib effect display-name probes` in the boot `Pack Stack` lines before trusting a run.
3. Cheats must be enabled (the commands are registered at `GameDirectors` permission).

## Run

Use a **stationary source well inside a ticking area** — an armor stand on solid ground at a fixed
point. A wandering source crashed every probe in an earlier run once it left the area, and a run
driven from outside the ticking area fails with `LocationInUnloadedChunkError` when probes spawn.
Probes spawn their subjects at offsets from the source rather than on top of it.

From the server console:

```
execute as <entity> run scriptevent mctest5:effectnames
execute as <entity> run scriptevent mctest5:effectbounds
```

or as a player in the world: `/mctest5:effectnames`, `/mctest5:effectbounds`.

A single probe can be named as the message argument:

```
execute as <entity> run scriptevent mctest5:effectnames effect-type-registry-survey
execute as <entity> run scriptevent mctest5:effectnames effect-display-name-mapping
execute as <entity> run scriptevent mctest5:effectbounds amplifier-bound
execute as <entity> run scriptevent mctest5:effectbounds duration-bound
```

Neither set reads a player, so an armor-stand source covers both.

**Runtime.** `effectnames` is the long one: 37 types × 7 amplifiers with a tick between types, so
roughly **5 s**, emitting about **300 lines**. `effectbounds` walks the amplifier one value at a
time and can reach 300 iterations plus escalation and negative cases — allow **up to a minute**.
Nothing waits on effect decay, so a set that appears to hang has stopped.

Every line appears both in chat (`world.sendMessage`) and in the content log (`console.warn`), so a
dedicated server can collect them from the log file. `effectnames` will flood chat; read the log.

## Where the type list comes from

The pack **does not import `@minecraft/vanilla-data`**. No earlier pack imports it either, and it is
not a manifest dependency — the packs depend only on `@minecraft/server`, so a runtime import could
not be expected to resolve on the server. The 37 identifiers are instead **transcribed literally**
into `scripts/main.js` from the pinned copy at
`../type-probes/node_modules/@minecraft/vanilla-data/lib/mojang-effect.d.ts` (package version
1.26.33), whose `MinecraftEffectTypes` enum is the same 37-member constant that
`../type-probes/vanilla-data-probe.out.txt` records as "`MinecraftEffectTypes`: 37 members, 37
string-valued, 37 start with `minecraft:`".

A transcription can drift from the package, and the package can drift from the engine. Both are
checked at runtime rather than assumed: `effect-type-registry-survey` calls `EffectTypes.getAll()`
and prints the engine's own list, the count, and the two-way diff against the transcribed list.
**Read that diff before reading the mapping** — a non-empty `in-engine-not-in-transcribed` means the
mapping is incomplete by exactly those ids.

## Set A — `mctest5:effectnames`

### `effect-type-registry-survey`

Prints `EffectTypes.getAll()` (count, then the sorted ids eight per line), diffs it against the
transcribed list, and calls `EffectTypes.get(id).getName()` for each transcribed id, summarising
every id whose `getName()` is **not** the identifier itself. The expectation from the declaration is
that the count is zero; a non-zero count would mean `getName()` is a second name source the design
has not considered.

### `effect-display-name-mapping`

For each of the 37 types, at amplifiers 0 through 6, on a live sheep:

1. `removeEffect(type)` — so the call is an add rather than the "or updates" path,
2. `addEffect(type, 400, { amplifier, showParticles: false })`,
3. **in the same tick**, `displayName`, `typeId`, `amplifier`, `duration` and `isValid` read off
   `addEffect`'s own return value, each read independently so one throw does not hide the rest,
4. still in the same tick, `getEffect(type)` and the same five reads off that,
5. `removeEffect(type)`.

Nothing is awaited between the add and the reads. That is what makes the instant effects readable:
`minecraft:instant_health` and `minecraft:instant_damage` apply and expire immediately, so a
readback a tick later would find nothing, while `addEffect`'s return value is in hand before the
engine has ticked. Which of the two sources carried the name is on every line, and the verdict says
so.

**Subject deaths are handled, not avoided.** `instant_damage`, `wither` and `poison` at high
amplifier all kill an 8-health sheep; the subject holder re-spawns on the next add and the run
reports `subject-respawns=<n>` in the summary. A killed subject therefore costs no cells.

Per-(type, amplifier) verdicts:

| Verdict | Meaning |
|---|---|
| `READ-OK` | the effect was present on both the return value and the `getEffect` readback, and a name was read |
| `READ-OK-FROM-RETURN-ONLY` | `addEffect` returned an `Effect` and the name read, but `getEffect` found nothing — the expected shape for an instant effect |
| `READ-OK-FROM-GETEFFECT-ONLY` | `addEffect` returned `undefined` but the effect is on the entity |
| `ADDED-NO-EFFECT-PRESENT` | the call did not throw and neither source has an effect — added but nothing to read |
| `EFFECT-PRESENT-BUT-NAME-UNREADABLE` | an `Effect` exists and `displayName` threw or was not a string |
| `ADD-THREW` | the call itself threw; the error name and message are on the line. Expected for types the subject refuses — `bad_omen`, `raid_omen`, `trial_omen` and `village_hero` are plausible candidates, and whether they are is itself a reading |

Each type then gets a one-line summary carrying the whole row —
`names=[0=>"…", 1=>"…", …]` — plus `distinct-names` and
`numeral-varies-with-amplifier`. The set closes with a verdict tally, the list of types that read no
name at any amplifier, the list of types with **one name across all amplifiers**, and the full
amplifier-0 name list.

**A type with one name across all seven amplifiers is a finding, not an error.** `invisibility`,
`night_vision`, `water_breathing` and the four omen effects are the candidates for carrying no level
numeral. (Glowing is not among the 37 — the vanilla-data enum has no `minecraft:glowing`, which the
registry survey's diff will confirm or contradict against the engine's own list.) The point of the
sweep is to learn where the pattern breaks, and the summary names those types explicitly so the
break is countable rather than buried in 259 lines.

## Set B — `mctest5:effectbounds`

Both probes use `minecraft:speed` on a sheep, and report each attempt as `ACCEPTED` (with the
readback) or `REJECTED` (with the error). Where the engine raises `ArgumentOutOfBoundsError`, that
error's `index`, `minValue`, `maxValue` and `value` fields are read **duck-typed** off the caught
error and printed — they are the engine stating its own bound, which is stronger than the boundary
inferred from where the walk stopped. The pack does not import `@minecraft/common` for this, so it
takes no second module dependency.

### `amplifier-bound`

Walks the amplifier up from 0 one value at a time to 300, stopping at the first rejection. If
nothing is rejected by 300 it escalates through 400, 600, 1000, 5000, 32767, 65535, 1000000,
2147483647, 2147483648. Then downward through -1, -2, -3, -5, -10, -100, -127, -128, -129, -256,
-1000, -2147483648, and finally the non-integers 0.5, 1.5, `NaN` and `Infinity`, which the
declaration says nothing about in either direction.

Lines are emitted for amplifiers 0-8, the three below the boundary, the first rejected value, every
escalation, every negative and every non-integer. The middle of the walk is carried by the
`names[…]` summary lines rather than one line each.

Four summaries close it: the highest accepted and first rejected value with the error's `minValue` /
`maxValue` / message; how far the **readback echoes the request** and where it first diverges (an
accepted value that reads back as something else is a clamp, not a bound, and the two are different
answers); the name observed at every accepted amplifier; and the highest amplifier whose name
differs from the next lower one — above that the name has stopped tracking the amplifier even though
the call is still accepted.

### `duration-bound`

One attempt each at -1000, -1, 0, 1, 2, 20, 200, 19999999, 20000000, 20000001, 20000002, 100000000,
2147483647, 2147483648, 0.5, 1.5, `NaN`, `Infinity`. 0 and 1 are both probed because the parameter's
TSDoc gives both as the lower bound. Summaries list the accepted and rejected sets, the rejection at
or below 1 and the first rejection above it with the error fields, and the readback for every
accepted duration — a duration accepted but read back as a different number is a clamp.

**Report both bounds as observed values.** "The highest amplifier this run accepted was N" is what
the log supports; "the engine supports N levels" is a different claim the probe does not make.

## What a correct run looks like

- A `start` line naming the probe count and a `complete` line for each set. A run with no `complete`
  line stopped early — rerun it.
- **No `:: PROBE CRASHED` line.** Every probe is wrapped, so one failure cannot abort the set; a
  crash line names the probe and carries the stack.
- `mctest5:effectnames`: the registry survey's `count=` line, ~5 `engine-ids[…]` lines, two survey
  `SUMMARY` lines, then 259 mapping lines (37 types × 7 amplifiers), 37 per-type `SUMMARY` lines,
  and 5 or more closing `SUMMARY` lines. `minecraft:speed` must read `"Speed"` at amplifier 0 and
  `"Speed II"` at amplifier 1 — that is the one cell already on the record
  (`f:live-effect-fields-populated`), and a run that disagrees with it is measuring something else.
  A `SUMMARY no-name-read-at-any-amplifier` count near 37 means the subject, not the mapping, is the
  problem.
- `mctest5:effectbounds`: at least 9 `up/` lines, one `…-first-rejected` or a full escalation
  sequence, 12 `down/` lines, 4 `non-integer/` lines and 6 `SUMMARY` lines from `amplifier-bound`;
  18 case lines and 4 `SUMMARY` lines from `duration-bound`. `duration=200, amplifier=0` must read
  `ACCEPTED` in both probes — it is the baseline every other case is read against.
- Sample line shapes:

```
[mctest] effect-display-name-mapping :: [minecraft:speed/amp=1] subject=-123 addEffect ok value=object(Effect) from-return(displayName=ok value=string:"Speed II" typeId=ok value=string:"minecraft:speed" amplifier=ok value=number:1 duration=ok value=number:400 isValid=ok value=boolean:true) getEffect present=true from-getEffect(…) display-name="Speed II" names-agree=true verdict=READ-OK
[mctest] effect-display-name-mapping :: SUMMARY type=minecraft:speed names=[0=>"Speed", 1=>"Speed II", 2=>"Speed III", …] readable=7/7 distinct-names=7 numeral-varies-with-amplifier=true verdicts=[READ-OK, …]
[mctest] effect-type-registry-survey :: SUMMARY transcribed=37 engine=37 in-transcribed-not-in-engine=[] in-engine-not-in-transcribed=[]
[mctest] amplifier-bound :: [up/255-first-rejected] addEffect(duration=200, amplifier=255) threw name=ArgumentOutOfBoundsError ctor=ArgumentOutOfBoundsError index=0 minValue=0 maxValue=254 value=255 message="…" verdict=REJECTED
[mctest] duration-bound :: [duration=20000001] addEffect(duration=20000001, amplifier=0) threw name=ArgumentOutOfBoundsError … verdict=REJECTED
```

## What the mapping decides

The design is choosing between **registering** display names (a test populates them; the fake
returns what it was given, with some fallback) and **computing** them (the fake derives the string
from the type id and amplifier).

Computing is available if the mapping turns out to be a rule with a small, listable set of
exceptions. Concretely, that means:

- every readable name at amplifier 0 is a fixed transform of the type id — strip `minecraft:`,
  split on `_`, title-case — for all 37 types, and
- every readable name above amplifier 0 is that amplifier-0 name plus one separator plus the Roman
  numeral for `amplifier + 1`, for every type except a set the summary lines name outright, and
- the numeral-less types are a short, stable list rather than a scattering.

Any of these rules out computing:

- an amplifier-0 name that is not derivable from the id at all (a name with a word the id does not
  contain, or a different word order),
- numerals that stop at some amplifier while the call keeps being accepted — the mapping is then not
  a function of the amplifier over the accepted range, and `amplifier-bound`'s "highest amplifier
  whose name differs from the next lower" summary is where that shows,
- the numeral rendering changing form partway up (Roman to Arabic, say), or a separator that varies
  by type,
- more than a handful of types with no numeral, or with a numeral only above some amplifier.

A mixed result — a rule plus a handful of exceptions — argues for registration with the rule as the
fallback, and the exception list is then exactly the `one-name-across-all-amplifiers` and
`no-name-read-at-any-amplifier` summaries.

Note the bound probe feeds this too: if the accepted amplifier range runs far past where names stop
changing, a computed name has a range over which it can only guess, whereas a registry simply has no
entry.

## Record the results

Copy the complete set of `[mctest]` lines into a new file
`artifacts/mctest-effect-name-probe-results.md`, following
`../mctest-return-value-probe-results.md`: a **Run provenance** table (date, server build,
`@minecraft/server` version, pack name/version/uuid, trigger, source entity and its coordinates,
coverage as `n × effectnames, n × effectbounds, no PROBE CRASHED lines`), a section per question
answered, a **Reading the log** section for any line that misleads without the source in hand,
run-validity notes, then the raw log verbatim in delivery order with server timestamps, one fenced
block per set.

The mapping itself belongs in that file as a **table**, one row per type and one column per
amplifier, alongside the raw log rather than instead of it.

## Caveats

- **`n = 1` is not a fact.** The standing bar in this design is three runs per set, and
  `effectbounds` should have all three: a bound is a behavioural claim, and a single boundary
  reading can be an artifact of the subject's state.
- **Probe A is the exception worth stating.** Its output is a *mapping* — a table of strings the
  engine returned — not a verdict about behaviour under a condition. A string read back from
  `addEffect`'s own return value in the same tick has no timing, no cascade and no ordering that a
  repeat could vary. **Two runs of `effectnames` is the right count**: one to capture the mapping and
  a second to confirm it reproduces byte-for-byte, which also catches a transcription-order or
  subject-death artifact. A third adds nothing the second did not. Say in the provenance table how
  many runs the record covers, and diff the two `SUMMARY type=` blocks rather than eyeballing them.
- **The mapping is one locale.** `displayName` is "player-friendly", so it is plausibly localised.
  Every run is on whatever locale the dedicated server resolves; the record says nothing about any
  other, and the design should treat the strings as this-server strings until a second locale is
  observed.
- **`ADD-THREW` on the omen effects is not a probe failure.** Several effects are player-only in
  vanilla. A type that throws on a sheep would need a player subject to read, which this pack does
  not use; that is a gap in the mapping to record, not a defect to work around silently.
- **The subject holder hides deaths but not their cost.** A killed subject is replaced on the next
  add, so a cell after a death is read on a fresh sheep with no accumulated effects. The
  `subject-respawns` count is what says how often that happened.
- **The bound walk leaves effects behind only briefly.** Every case removes the effect immediately
  after reading; a probe that ends abnormally can leave one `minecraft:speed` on one sheep, which is
  removed with the subject at the end of the set.
- **The escalation path is sparse.** If nothing is rejected below 300 the walk jumps, so the
  "highest accepted" it reports is the highest *probed*, not the true boundary. The summary reports
  the values it tried; read them before treating the number as a bound.
- **The slash-command path stays unexercised** if the run goes through `scriptevent`, as every
  earlier run did. Say which trigger was used in the provenance table.
