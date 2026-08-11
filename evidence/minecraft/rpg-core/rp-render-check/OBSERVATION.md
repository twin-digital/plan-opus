# rp-render-check — what a client rendered

The server-side half of this check is captured; the visual half is not machine-readable, so the owner's
report is the output. Recorded verbatim.

## Server side, captured

Four actors spawned, identical in behaviour, in a flat creative world at `z=4`, surface `y=-60`:

```
[2026-08-10 05:12:20:869 WARN] [Scripting] RENDERCHECK spawned rptest:full at -3,-60,4
[2026-08-10 05:12:20:870 WARN] [Scripting] RENDERCHECK spawned rptest:no_client at -1,-60,4
[2026-08-10 05:12:20:870 WARN] [Scripting] RENDERCHECK spawned rptest:bad_geometry at 1,-60,4
[2026-08-10 05:12:20:870 WARN] [Scripting] RENDERCHECK spawned rptest:bad_texture at 3,-60,4
[2026-08-10 05:12:20:870 WARN] [Scripting] RENDERCHECK ready
```

Resource pack confirmed active in the client stack:

```
Pack Name: rp render check assets
  UUID: 7d4b0000-0000-4000-8000-000000000002
  Type: Resources
  Version: 1.0.0
```

So every actor below existed on the server and its appearance definition, where it had one, was
delivered.

## Client side, as observed

Bedrock client, real account, joined the server above. The owner's report:

```
full should look right: normal evoker

'no client entity': nothing there at all, couldnt get the name tag to show up at all

'bad geometry': completely invisible, but if my mouse hovers in that area the nametag shows up

'bad texture': humanoid (evoker?) shape, colored in black and magenta (with z-fighting causing the colors to swap)

note for context, nametags are _never_ visible unless i hover over the entity. so for 'no client entity' its either not there, or the hover region is so small i couldnt find it
```

## What is settled and what is not

Settled:

- A resolvable definition renders correctly.
- A **missing texture** is the loud failure: the body is there, unmistakably wrong, black-and-magenta.
- **Unresolvable geometry** renders nothing, but the entity is still there to the client — hovering
  raises its name tag.
- A name tag is not a passive indicator on this client: it appears on hover and not otherwise, so it
  cannot be relied on to announce an actor a player is not already pointing at.

Not settled:

- Whether an actor with **no client entity at all** is un-hoverable or merely hard to hover. The owner
  could not raise its name tag; the server confirms the entity was there. Distinguishing "the client
  gives it no target volume" from "the target volume is small and was missed" needs a further pass —
  a deliberately huge collision box, or a scripted `getEntitiesFromViewDirection` from the player.

The distinction does not change the design conclusion: with no client entity, nothing renders and the
owner could not find it by looking or by pointing, which is the failure a missing resource pack
produces.
