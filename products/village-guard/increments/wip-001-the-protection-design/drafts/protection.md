# The three ways to keep a villager alive

Working material for this increment's review. The fold is the authority; this records the
comparison `d-jp67dexu` came out of.

`r-pe87rfqq` wants a mob that does not die. `r-eh0aac98` wants a mob that, when struck, visibly
takes the hit — flinch, knockback, sound, panic — and shows no tell the pack put there. Three
mechanisms reach the first; they differ on the second.

## An effect

The July prototype (`archive/minecraft-prototype`, `5ee7c40`) topped up Resistance on a five-second
interval. Resistance renders effect particles, which is a tell of the pack's own, and a hit fully
absorbed produces no reaction to see. It also protects only what a sweep has reached, so a mob is
unprotected for up to five seconds after it arrives.

## Cancelling the hit

`world.beforeEvents.entityHurt` is cancellable, and a cancelled hit lands nothing at all —
`f:cancelled-call-return-values-observed` reads `health-lost=0 damage-landed=false cascade=[]`.
Nothing is taken, so there is nothing for the engine to react to. That is the same tell problem
the effect has, arrived at from the other side.

## Clamping the hit

The before-event's `damage` field is writable, and the write is what the engine acts on:
`f:before-event-field-writes-take-effect` reads `FIELD-WRITE-TOOK (the health lost is the value
the handler wrote)` in both directions. A hit written down to something short of fatal is a hit
that really happens — the engine deals it, and whatever reaction it deals goes with it.

Short of fatal is a known boundary. `f:reaching-effective-minimum-is-fatal` puts death exactly at
`effectiveMin`, with every `min+1` control surviving and no case reaching the minimum and living,
and `f:health-not-clamped-at-minimum` shows the engine will drive health past that minimum rather
than stop at it, so the clamp has to be the pack's and cannot be the engine's.

The health then has to come back, or the mob ratchets down to a point and stays there.
`f:after-event-deferral-subtick` puts the `entityHurt` after-event in the same tick as the call
that caused it, at delay 0, which is early enough that no second hit is waiting on it.

What this leaves open is whether the reaction really does survive the write, which is
`q-fc5bw0k0`, and whether the engine consults the event for damage a script did not ask for,
which is `q-y65kdr8a`.
