# Resource-pack decline — for q-zwn1at3x

Run this **in the same client session** as increment 003's name-display probe, which is queued
for the same reason: both need a person at a client, and neither can be read headless.

It ships no packs of its own. It reuses
`products/mc-rpg-core/increments/003/artifacts/name-display-probe/packs/` unchanged — that probe's
behavior pack already names its resource pack by uuid in `dependencies`
(`1343435e-adbc-4c5c-b03f-18711bd5f8d4`), which is exactly the shape `d-x60dka1o` has an
adventure ship. Build and install those packs as that probe's README says, then add the steps
below after its step 5.

## The server

A server is up with the probe packs deployed in an adventure's own shape — the behavior pack
activated, the resource pack in the pool only and reached through the behavior manifest's
`dependencies`, with `world_resource_packs.json` left empty. That is the arrangement
`d-x60dka1o` describes, so the prompt a client sees is the dependency-pulled one.

| | |
|---|---|
| address | `10.111.1.192:19140` |
| world | `rp-decline-probe`, creative, seed 424242 |
| container | `rp-decline-probe-bedrock-1` on `prod-development-docker` |
| pack stack | `[00] Name Display Probe BP` |

## Run the decline readings *first*

**Order matters.** A Bedrock client caches a server's resource pack once accepted, so a client
that has already taken the pack may not prompt again. Read both decline cases before accepting
anything, while the client has never held it.

### A — decline with `texturepack-required=false` (as the server stands)

1. Join `10.111.1.192:19140` and answer **no** at the resource-pack prompt.
2. Record whether the join is refused at all.
3. If it proceeds, run `/scriptevent probe:run` and look where the five entities should be. Chat
   confirms the server spawned them; the question is whether the client draws anything. Record
   what stands there — nothing, an untextured shape, or something else.

### B — decline with `texturepack-required=true`

Flip the property and restart:

```sh
docker exec rp-decline-probe-bedrock-1 \
  sed -i 's/^texturepack-required=false/texturepack-required=true/' /data/server.properties
docker restart rp-decline-probe-bedrock-1
```

Rejoin, decline again, and record whether the refusal changes.

### C — then accept, and read the plates

Accept the pack on the next join and run the name-display probe's own steps 1-5 (its README, in
increment 003's artifacts): `/scriptevent probe:run`, read the five plates, then switch the client
to Deutsch and read them again. That is `q-r7db9r31`, and it is why one session answers both.

## When you are done

```sh
docker rm -f rp-decline-probe-bedrock-1
docker volume rm rp-decline-probe_data
```

## What the question is

`d-x60dka1o` has an adventure's behavior manifest name its own resource half in `dependencies`,
"so activating the one activates both and **the appearance cannot be left behind**". Its `pinned`
note puts the stake as "whether a half-activated world shows actors".

The world half of that is already settled, and is not what these steps ask:

- a behavior pack declaring a resource pack by uuid pulls it into the client pack stack against an
  *empty* resource activation list, with the same stack count as listing it explicitly;
- the server offers the pack to the client, which prompts to download it before joining;
- with the depended-on resource pack absent from the pool entirely, nothing refuses the load or
  logs a dependency error, and nothing a script can reach detects the absence
  (`f:a-resource-pack-cannot-carry-anything-a-script-can-reach`).

So the dependency reliably gets the pack *offered*. What nobody has recorded is what a **decline**
leaves — the gap between "cannot be left behind" as a property of the world's pack stack and as a
property of what a player sees.

## What each outcome changes

**A — the client refuses the join outright.** `d-x60dka1o` holds as written at the client too, and
nothing changes. The strongest form of its `pinned` note is established.

**B — the join proceeds and the entities are undrawn.** Then "the appearance cannot be left behind"
is true of the world and false of the player, and a client alone produces exactly the failure
`d-x60dka1o` exists to prevent: invisible actors the library reports as present, which
`d-xiswv8vb` says it cannot detect. Whether that is acceptable or wants a requirement is the
owner's call.

**C — the refusal depends on `texturepack-required`.** Then that property is the lever, and where
it is set becomes a decision for this product's documentation and for `mc-dev-server`'s defaults —
which hardcode `TEXTUREPACK_REQUIRED: 'false'` today
(`nodejs/minecraft/mc-dev-server/src/docker/compose-file.ts`).

## Recording the result

The reading is a fact about the engine, so it lands in `facts/minecraft/packs.yml` with a run under
`evidence/` naming what was run and what was seen — the tested-fact bar, not an artifact
conclusion. `q-zwn1at3x` closes against that fact.
