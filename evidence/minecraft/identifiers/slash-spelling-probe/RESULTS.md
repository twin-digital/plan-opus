# slash-in-identifier probe results

Observed output from running the probe pack against a real Bedrock dedicated server. Each
`[slprobe] …` line is what the engine reported; `OUTPUT.txt` beside this file is the captured
transcript the sources cite, and this file is a reading of it.

## Run provenance

| | |
|---|---|
| Date | 2026-08-15 |
| Server | `itzg/minecraft-bedrock-server` (digest `sha256:0723ada81c10d3a9333d551b9ad8f22d666c3728071b6a15808bcef1fd394ab2`), Bedrock dedicated **1.26.44.3** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Behavior pack | `slash spelling probe (behavior)` 0.1.0, uuid `206d4ca1-7780-484b-86cb-e3eef0f98766` |
| Identifiers | namespace-half slash `my-rpg/spellfx:probe`; name-half slash `my-rpg:spellfx/probe`; underscore control `my_rpg_spellfx:probe`; each with its own family token so the entity stays reachable where type addressing fails |
| Trigger | `scriptevent slprobe:run slash` from the server console |
| Coverage | the phase produced its `complete` line, no `PROBE CRASHED` lines, and the content-log filter at the end of `OUTPUT.txt` matched nothing |

## Verdict per position per path

The two slash positions behaved identically: first-class through every script-API path, a loud
parse error through every command path.

| Path | control | namespace-half slash | name-half slash |
|---|---|---|---|
| pack loads, type registers (`EntityTypes.getAll`/`get`) | yes | yes | yes |
| `spawnEntity` + `typeId` reads back verbatim | yes | yes | yes |
| `Entity.matches({ type })` | true | true | true |
| `Dimension.getEntities({ type })` | 1 | 1 | 1 |
| `testfor @e[type=…]` via `runCommand` | 1 | CommandError: syntax error | CommandError: syntax error |
| `summon …` via `runCommand` | 1 | CommandError: syntax error | CommandError: syntax error |
| `@e[family=…]` on the same entity | 1 | 1 | 1 |

The command failures are errors, not silence: the parser stops at the slash —
`Syntax error: Unexpected "my-rpg": at "r @e[type=>>my-rpg<</spellfx:p"` — and `summon` fails the
same way, so nothing was summoned (`after-summon getEntities({type}).length=0`). Unlike the
uppercase case (f-te6cfwkw), where `summon` silently resolved to a lowercased identifier, a
slashed identifier cannot be written in a command at all; the entity remains reachable by command
only through its family tokens.
