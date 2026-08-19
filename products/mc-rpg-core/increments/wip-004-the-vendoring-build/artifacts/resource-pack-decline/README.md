# Resource-pack decline — for q-zwn1at3x

Run this **in the same client session** as increment 003's name-display probe, which is queued
for the same reason: both need a person at a client, and neither can be read headless.

It ships no packs of its own. It reuses
`products/mc-rpg-core/increments/003/artifacts/name-display-probe/packs/` unchanged — that probe's
behavior pack already names its resource pack by uuid in `dependencies`
(`1343435e-adbc-4c5c-b03f-18711bd5f8d4`), which is exactly the shape `d-x60dka1o` has an
adventure ship. Build and install those packs as that probe's README says, then add the steps
below after its step 5.

## The steps

1. Quit to the main menu and rejoin. At the resource-pack download prompt, answer **no**.
2. Record whether the join is refused. If it proceeds, record whether the five entities are drawn
   at all, and what stands where each should be.
3. Set `texturepack-required=true` in the server's `server.properties`, restart the server, rejoin,
   and decline again. Record whether the refusal changes.

Both settings must be read: the outcomes below are told apart only by running it twice.

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
