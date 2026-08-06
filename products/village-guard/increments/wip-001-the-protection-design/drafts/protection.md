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

## What the probe settled

Three of the four things this rested on were unobserved when the comparison was written, and an
engine probe closed them — `evidence/minecraft/script-api/protection-probe/`, three runs of each
set against Bedrock 1.26.40.8.

The engine does consult the event for damage a script did not ask for: five routes, every one
raised, every one honouring the write
(`f:entity-hurt-before-event-sees-engine-dealt-damage`). Preventing the death does prevent the
conversion, against a control that converted in every run
(`f:preventing-a-villagers-death-prevents-its-conversion`). And the clamped hit knocks back
exactly as a vanilla hit does while a cancelled one does not knock back at all
(`f:a-clamped-hit-knocks-back-and-a-cancelled-one-does-not`) — the measurement that separates the
mechanism this design took from the one it rejected.

It also found something the comparison had not: a clamp with no restore is a slower death, not a
protection. Under sustained attack the 0.5 losses accumulate, and one subject died after 78 hits
(`f:a-damage-clamp-without-a-restore-still-kills`). The same-tick restore holds the whole design up.

The rest was settled at a client: the clamped lane flashed, recoiled, grunted and panicked exactly
as the vanilla one did, the cancelled lane did none of it, and nothing appeared on the clamped
villager that the vanilla one lacked (`f:a-clamped-hit-is-indistinguishable-from-a-vanilla-one-at-a-client`).

## What the owner added afterwards

Seeing the cancelled lane sit inert, the owner asked for that behaviour to be the rule for a
player's own hits: an accidental swing should do nothing at all, while a monster's attack still
looks and feels right. `r-ef113dxi` states it, and `d-jp67dexu` splits the handler on
`damageSource.damagingEntity`, since no damage cause distinguishes a player's swing from a mob's
(`f:no-damage-cause-names-the-attacker-and-none-names-reputation`).

Whether cancelling also spares the player the villager's negative gossip could not be measured. An
attack did not move a cured villager's prices in any configuration tried, including one with
nothing of the pack on the damage path, so there was no effect for a cancellation to be seen
preventing (`f:attacking-a-cured-villager-does-not-cost-it-its-discount`). The design proceeds on
`f:cancelling-a-players-hit-prevents-the-reputation-change`, which is recorded as assumed and says
so.
