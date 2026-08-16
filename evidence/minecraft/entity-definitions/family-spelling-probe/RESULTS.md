# family-token spelling probe results

Observed output from running the probe packs against a real Bedrock dedicated server. Each
`[probe] …` line is what the engine reported; `OUTPUT.txt` beside this file is the captured
transcript the sources cite, and this file is a reading of it.

## Run provenance

| | |
|---|---|
| Date | 2026-08-15 |
| Server | `itzg/minecraft-bedrock-server` (digest `sha256:0723ada81c10d3a9333d551b9ad8f22d666c3728071b6a15808bcef1fd394ab2`), Bedrock dedicated **1.26.44.3** |
| `@minecraft/server` | **2.8.0** (pack manifest dependency; no experiments enabled) |
| Script pack | `family spelling probe (script)` 0.1.0, uuid `93c91f34-a9f4-4ed5-a470-d9acea830bfc` |
| Data pack | `family spelling probe (data)` 0.1.0, uuid `3c384f42-b3b6-46d9-8341-93bd5322bf6b` — declares `probe:spelling` with all three tokens, and `probe:under` / `probe:hyphen` / `probe:dot` with one each |
| Tokens | underscore control `probe_underscore_token`; hyphenated `mcdk_pack_twin-digital-village-guard`; dotted `mcdk_pack_dotted.pkg.name`; negative control `probe_absent_token`, declared nowhere |
| Trigger | `scriptevent probe:run spelling` from the server console, then per-token console commands |
| Coverage | the phase produced a `complete` line, no `PROBE CRASHED` lines, and the content-log filter at the end of `OUTPUT.txt` matched nothing |

## Verdict per token per path

Every declared token behaved identically to the underscore control on every path, and the
negative control matched nothing anywhere.

| Path | underscore | hyphenated | dotted | absent |
|---|---|---|---|---|
| pack loads with the token declared | yes | yes | yes | — |
| `getTypeFamilies()` lists it | yes | yes | yes | — |
| `hasTypeFamily(token)` | true | true | true | false |
| `Entity.matches({ families })` | true | true | true | false |
| `Dimension.getEntities({ families }).length` | 2 | 2 | 2 | 0 |
| `runCommand("testfor @e[family=…]").successCount` | 2 | 2 | 2 | 0 |
| console `execute if entity @e[family=…]` | hit | hit | hit | no hit, checked |

The expected count on the two query paths is 2 — `probe:spelling` plus the token's solo entity —
so the counts also show the tokens matching across entity types, not just on the declaring one.

The console path sends `execute if entity @e[family=<t>] run scriptevent probe:hit <t>` followed
by an unconditional `scriptevent probe:checked <t>`; a `hit` line before its `checked` line means
the selector parsed and matched from the console. All three declared tokens produced a `hit`;
`probe_absent_token` produced only its `checked` line, so the mechanism discriminates.
