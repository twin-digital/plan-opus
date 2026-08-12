# What characters may a Bedrock namespace be spelled with, and is there a length limit?

Measured against a real dedicated server. Every line quoted here is in `RESULTS-CAPTURED.md`, which
is generated mechanically from the raw logs (`node gen-results.mjs`) and holds every line of every
phase; `OUTPUT.txt`, `OUTPUT2.txt`, `RAW-OUTPUT.txt` and `RAW-OUTPUT2.txt` are the captures it reads.

## Environment

- server: `itzg/minecraft-bedrock-server:latest`, image buildtime `2026-08-08T17:56:23.215Z`,
  revision `8b8d0883d9542fe982e61753a88e51affaff8cdf`, running Bedrock `1.26.43.1`
  (`[2026-08-12 04:11:35:615 INFO] Version: 1.26.43.1`)
- `@minecraft/server` `2.8.0`, declared in the behavior pack manifest's dependencies
- behavior pack `5f2c1c4e-1d7a-4f3b-9d21-6a7c0f1e2b30` v0.1.0 (data + script modules), deployed to
  `development_behavior_packs/nsprobebp`
- resource pack `3d8f9b02-6a41-4c55-9f7e-2b0c8d16a4f7` v0.1.0, and the broken-content control pack
  `b41d7e26-3a90-4f18-9c02-5e7d1a638b4c` v0.1.0
- world `dev`, `LEVEL_SEED=1`, cheats on; compose project `ns-probe`, volume `ns-probe_data`
- run on 2026-08-12
- commands: `node gen.mjs && node run.mjs`, then `node gen-rp2.mjs && node run2.mjs`, then
  `node gen-results.mjs`

## Phases

| phase | what it did |
| --- | --- |
| `bp-only` | all 13 identifiers, behavior pack alone |
| `bp-plus-rp` | the same 13, with the geometry resource pack active |
| `case-follow-up` | the registry vs. the query paths on uppercase, against one live entity |
| `rp-broken-control` | a resource pack carrying invalid JSON, to test whether the server reads resource pack content at all |

`bp-only` and `bp-plus-rp` produced byte-identical per-case output, so the resource pack changes
nothing on the behavior side.

## Entity identifiers: per-case answer

All 13 definitions registered. `EntityTypes.getAll()` returned 141 types, 13 of them non-vanilla —
every case, none dropped:

```
[nsprobe] bp-only/types :: total=141 non-vanilla=13
```

### 1. underscore — `probe_ns:subject` (control) — works

```
[nsprobe] bp-only/ctl_underscore :: EntityTypes.get -> type id=probe_ns:subject
[nsprobe] bp-only/ctl_underscore :: spawnEntity -> ok
[nsprobe] bp-only/ctl_underscore :: entity.typeId=probe_ns:subject valid=true
[nsprobe] bp-only/ctl_underscore :: getEntities({type}).length=1
[nsprobe] bp-only/ctl_underscore :: cmd testfor @e[type=probe_ns:subject] successCount=1
[nsprobe] bp-only/ctl_underscore :: cmd summon probe_ns:subject successCount=1
```

### 2. hyphen — `probe-ns:subject` — works, on every path

```
[nsprobe] bp-only/hyphen :: EntityTypes.get -> type id=probe-ns:subject
[nsprobe] bp-only/hyphen :: spawnEntity -> ok
[nsprobe] bp-only/hyphen :: entity.typeId=probe-ns:subject valid=true
[nsprobe] bp-only/hyphen :: matches(type)=true
[nsprobe] bp-only/hyphen :: getEntities({type}).length=1
[nsprobe] bp-only/hyphen :: cmd testfor @e[type=probe-ns:subject] successCount=1
[nsprobe] bp-only/hyphen :: cmd summon probe-ns:subject successCount=1
```

### 3. dot — `probe.ns:subject` — works, on every path

```
[nsprobe] bp-only/dot :: EntityTypes.get -> type id=probe.ns:subject
[nsprobe] bp-only/dot :: spawnEntity -> ok
[nsprobe] bp-only/dot :: entity.typeId=probe.ns:subject valid=true
[nsprobe] bp-only/dot :: matches(type)=true
[nsprobe] bp-only/dot :: getEntities({type}).length=1
[nsprobe] bp-only/dot :: cmd testfor @e[type=probe.ns:subject] successCount=1
[nsprobe] bp-only/dot :: cmd summon probe.ns:subject successCount=1
```

### 4. uppercase — `ProbeNS:subject` — registers and spawns, but is unaddressable

This is the one real failure, and it fails in two different ways at once.

The type registers and the API spawns it, keeping the case:

```
[nsprobe] bp-only/upper :: EntityTypes.get -> type id=ProbeNS:subject
[nsprobe] bp-only/upper :: spawnEntity -> ok
[nsprobe] bp-only/upper :: entity.typeId=ProbeNS:subject valid=true
```

But the query paths do not find it, and the command parser rejects the identifier outright:

```
[nsprobe] bp-only/upper :: matches(type)=false
[nsprobe] bp-only/upper :: getEntities({type}).length=0
[nsprobe] bp-only/upper :: cmd testfor @e[type=ProbeNS:subject] successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "ProbeNS:subject": at "r @e[type=>>ProbeNS:subject<<]"
[nsprobe] bp-only/upper :: cmd summon ProbeNS:subject successCount=threw CommandError: Error occurred with parsing command params: Syntax error: Unexpected "ProbeNS:subject": at "summon >>ProbeNS:subject<< 163 100 1"
```

The engine names the bad identifier in the content log at pack load, once per command enum:

```
[2026-08-12 04:11:47:479 ERROR] [Commands] enum name: <EntityType> | Keywords in commands need to be lower case. 'ProbeNS:subject' was not registered.
[2026-08-12 04:11:47:479 ERROR] [Commands] enum name: <EntityTypeSelector> | Keywords in commands need to be lower case. 'ProbeNS:subject' was not registered.
```

Family membership still works, so the entity is not inert — only unaddressable by type:

```
[nsprobe] bp-only/upper :: hasTypeFamily(fam_upper)=true
[nsprobe] bp-only/upper :: cmd testfor @e[family=fam_upper] successCount=1
```

`case-follow-up` separates the two sides. The registry is case-**sensitive** and stores what the
file said; the query paths lowercase their argument, so nothing can name the uppercase type:

```
[nsprobe] case-follow-up/case :: EntityTypes.get(probe_ns:SubJect) -> type id=probe_ns:SubJect
[nsprobe] case-follow-up/case :: EntityTypes.get(PROBE_NS:SUBJECT) -> undefined
[nsprobe] case-follow-up/case :: EntityTypes.get(probe_ns:subJect) -> undefined
[nsprobe] case-follow-up/case :: EntityTypes.get(ProbeNS:subject) -> type id=ProbeNS:subject
[nsprobe] case-follow-up/case :: api-spawned typeId=probe_ns:SubJect
[nsprobe] case-follow-up/case :: with-api-spawned getEntities({type:probe_ns:SubJect}).length=0
[nsprobe] case-follow-up/case :: with-api-spawned getEntities({type:probe_ns:subject}).length=0
[nsprobe] case-follow-up/case :: with-api-spawned cmd testfor @e[type=probe_ns:subject] successCount=0
```

And `summon` of an uppercase-in-the-name identifier silently produced the **lowercase** type
instead — a different entity than the one asked for:

```
[nsprobe] case-follow-up/case :: cmd summon probe_ns:SubJect successCount=1
[nsprobe] case-follow-up/case :: cmd-summoned typeId=probe_ns:subject
```

(In this pack a lowercase twin `probe_ns:subject` existed for `summon` to land on. Whether the
lowercasing summons nothing, or errors, when no lowercase twin is defined was not measured.)

### 5. digits — `probe2ns:subject` and `2probens:subject` — both work, leading digit included

```
[nsprobe] bp-only/digit_mid :: EntityTypes.get -> type id=probe2ns:subject
[nsprobe] bp-only/digit_mid :: cmd testfor @e[type=probe2ns:subject] successCount=1
[nsprobe] bp-only/digit_lead :: EntityTypes.get -> type id=2probens:subject
[nsprobe] bp-only/digit_lead :: spawnEntity -> ok
[nsprobe] bp-only/digit_lead :: entity.typeId=2probens:subject valid=true
[nsprobe] bp-only/digit_lead :: getEntities({type}).length=1
[nsprobe] bp-only/digit_lead :: cmd testfor @e[type=2probens:subject] successCount=1
[nsprobe] bp-only/digit_lead :: cmd summon 2probens:subject successCount=1
```

### 6. length — 64, 200 and 512-character namespaces all work; no limit found

Namespaces of 64, 200 and 512 characters (full identifiers of 72, 208 and 520) all registered,
spawned, round-tripped their `typeId`, and matched a selector. Abbreviating the runs of `n`:

```
[nsprobe] bp-only/len64 :: id=ns64_<59n>:subject ns.length=64 id.length=72
[nsprobe] bp-only/len64 :: EntityTypes.get -> type id=ns64_<59n>:subject
[nsprobe] bp-only/len64 :: cmd testfor @e[type=ns64_<59n>:subject] successCount=1
[nsprobe] bp-only/len200 :: id=ns200_<194n>:subject ns.length=200 id.length=208
[nsprobe] bp-only/len200 :: spawnEntity -> ok
[nsprobe] bp-only/len200 :: entity.typeId=ns200_<194n>:subject valid=true
[nsprobe] bp-only/len200 :: cmd summon ns200_<194n>:subject successCount=1
[nsprobe] bp-only/len512 :: id=ns512_<506n>:subject ns.length=512 id.length=520
[nsprobe] bp-only/len512 :: EntityTypes.get -> type id=ns512_<506n>:subject
[nsprobe] bp-only/len512 :: spawnEntity -> ok
[nsprobe] bp-only/len512 :: entity.typeId=ns512_<506n>:subject valid=true
[nsprobe] bp-only/len512 :: getEntities({type}).length=1
[nsprobe] bp-only/len512 :: cmd testfor @e[type=ns512_<506n>:subject] successCount=1
[nsprobe] bp-only/len512 :: cmd summon ns512_<506n>:subject successCount=1
```

The unabbreviated lines are in `RESULTS-CAPTURED.md`. No limit was reached; the probe stopped at
512 rather than finding a ceiling.

### 7. the name half — hyphen and dot work; uppercase fails the same way

```
[nsprobe] bp-only/name_hyphen :: EntityTypes.get -> type id=probe_ns:sub-ject
[nsprobe] bp-only/name_hyphen :: cmd testfor @e[type=probe_ns:sub-ject] successCount=1
[nsprobe] bp-only/name_hyphen :: cmd summon probe_ns:sub-ject successCount=1
[nsprobe] bp-only/name_dot :: EntityTypes.get -> type id=probe_ns:sub.ject
[nsprobe] bp-only/name_dot :: cmd testfor @e[type=probe_ns:sub.ject] successCount=1
[nsprobe] bp-only/name_dot :: cmd summon probe_ns:sub.ject successCount=1
[nsprobe] bp-only/name_len200 :: id=probe_ns:nsn200_<193n> ns.length=8 id.length=209
[nsprobe] bp-only/name_len200 :: cmd summon probe_ns:nsn200_<193n> successCount=1
```

Uppercase in the name half registers and is rejected by the same content-log error, but the command
parser tolerates the *string* (the namespace is lowercase, so the token parses) and matches nothing:

```
[nsprobe] bp-only/name_upper :: entity.typeId=probe_ns:SubJect valid=true
[nsprobe] bp-only/name_upper :: matches(type)=false
[nsprobe] bp-only/name_upper :: getEntities({type}).length=0
[nsprobe] bp-only/name_upper :: cmd testfor @e[type=probe_ns:SubJect] successCount=0
[2026-08-12 04:11:47:479 ERROR] [Commands] enum name: <EntityType> | Keywords in commands need to be lower case. 'probe_ns:SubJect' was not registered.
```

## Geometry identifiers: NOT VERIFIED

I could not measure this, and the negative control says why rather than leaving it to inference.

The resource pack carrying `geometry.probe-ns.subject`, `geometry.probe.ns.subject` and the rest was
activated in `world_resource_packs.json` and deployed into `development_resource_packs`. The server
logged nothing about it — no pack stack entry, no errors:

```
[2026-08-12 04:11:46:696 INFO] Pack Stack - [00] namespace character probe (behavior) (id: 5f2c1c4e-1d7a-4f3b-9d21-6a7c0f1e2b30, version: 0.1.0) @ development_behavior_packs/nsprobebp
```

Silence could mean "parsed fine" or "never read". The `rp-broken-control` phase settles it: the same
pack plus a geometry file containing `{ this is not json `, a client entity file containing
`{ also not json `, a geometry with an empty `description`, and a client entity naming
`geometry.no_such.geometry_at_all`, deployed into **both** `resource_packs` and
`development_resource_packs` and activated alone. The server reported nothing for any of it — the
pack stack still lists only the behavior pack, the content log for that boot is empty, and no
content-log line in the whole run mentions "geometry" or "resource":

```
[2026-08-12 04:23:24:542 INFO] Pack Stack - [00] namespace character probe (behavior) (id: 5f2c1c4e-1d7a-4f3b-9d21-6a7c0f1e2b30, version: 0.1.0) @ development_behavior_packs/nsprobebp
```

Files verified present in the container after the run:

```
/data/development_resource_packs/nsproberp2
/data/resource_packs/nsproberp2
{ this is not json
[{"pack_id":"b41d7e26-3a90-4f18-9c02-5e7d1a638b4c","version":[0,1,0]}]
```

So: **a dedicated server does not read resource pack content, and nothing about geometry identifier
spelling can be concluded from this run.** Whether `geometry.probe-ns.subject` resolves, and whether
a dotted namespace makes `geometry.probe.ns.subject` unparseable against the dot separator, needs a
client. Both remain open.

## Cleanup

Container `ns-probe-bedrock-1`, compose project `ns-probe`, volume `ns-probe_data`. No other
project's containers or volumes were touched.
