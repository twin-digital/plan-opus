# Brief — village-guard

## What this design is for

`village-guard` is a Minecraft Bedrock behavior pack that keeps a village's mobs alive. Install it
into a world and the villagers, wandering traders, and iron golems in it stop dying — a zombie
siege costs nothing, a stray arrow costs nothing, and a villager is never converted away. Nothing
else about them changes, and nothing about the pack is visible while it runs.

The design produces the pack's specification: who is protected, what "protected" is worth against
each way a mob can be lost, where the guarantee stops, and what the pack must declare to install
on a stranger's world. It is a real gameplay pack rather than a demonstration — it happens to be
the first non-trivial pack the workspace's minecraft tooling carries, but nothing here is shaped
by that.

## In scope

- **Who is protected, and when.** The roster — villagers, wandering traders, iron golems — and
  the coverage over time: mobs already in the world when the pack starts, ones born, cured, or
  traded into it afterwards, ones whose chunk loads in, and ones in any dimension.
- **What protection is worth.** Which ways a mob can be lost the pack stops, and where the
  guarantee ends. Operator action and the void are outside it; the boundary between "ordinary
  gameplay" and those is the design's to draw precisely.
- **Conversion.** A zombie taking a villager is a loss of the same kind as a death, so preventing
  it is part of the pack's job and needs a mechanism of its own if the one that stops death does
  not cover it.
- **Staying out of the way.** What the pack must not disturb — trading, restocking, breeding,
  gossip, panic, golem spawning — and the fact that protection has no visible tell.
- **The pack as an installable artifact.** What it declares so that a stranger's vanilla world
  loads it: its manifest identity, the engine version floor, and the `@minecraft/server` module
  version it depends on.

## Out of scope

- **The mechanism as a reusable library.** If the design factors invulnerability out into a
  shared package other packs can consume, that package's own surface — its API, its versioning,
  who else may depend on it — is a later design's, not this one's. This design specifies the
  pack.
- **Finding, building, and deploying packs.** `minecraft/dev-kit` answers which packs a workspace
  holds and what each one is; `minecraft/dev-server` runs them against a disposable server. This
  design produces a pack for that machinery to carry, and specifies none of it.
- **Testing machinery.** `minecraft/test-lib` owns the fakes a pack's tests run against.
- **Release and distribution mechanics.** How a built pack becomes a downloadable `.mcpack` is the
  workspace's release pipeline's, not the pack's — this design states only what the pack must be
  for that pipeline to hand someone something that works.
- **Defending protection against deliberate interference.** An operator or another pack that
  clears whatever marks a mob as protected gets what they asked for; the pack is not required to
  fight for it. Recovering on its own is the design's to choose, not an obligation.
- **Any other change to how a village plays.** Trading economy, raids, spawn rates, golem
  behaviour — the pack keeps the mobs alive and does nothing else.

## Done looks like

Someone downloads the pack, drops it into a vanilla world, and plays a night through a zombie
siege: at dawn the village holds exactly the villagers, traders, and golems it held at dusk, every
one of them trading, restocking, and breeding as before, with nothing on screen that says a pack
is running.

## What the design must still decide

Almost every mechanism question is open, and deliberately so — the evidence that settles them is
what the design phase goes and gathers against a real server.

- **How a mob is kept from dying, and what that mechanism actually guarantees.** The prototype
  reached for a Resistance effect plus a heal-on-hurt backstop; whether that survives every
  ordinary source (fire, drowning, suffocation, fall, explosion, a player's sword) is untested,
  and the pool already holds facts that point at a different shape — `damage-cascade-order-and-payload`
  and `before-event-field-writes-take-effect` together suggest cancelling or zeroing the damage
  before it lands rather than healing after it. What each option costs in side effects is the
  weighing.
- **How conversion is prevented.** Conversion is not obviously a damage event, so the mechanism
  that stops death may not touch it. Whether the Script API can observe or refuse a conversion at
  all is the first thing to establish.
- **How mobs are found and kept covered.** Events on arrival, a recurring sweep, or both. Whether
  `entitySpawn` and `entityLoad` fire for mobs already loaded when a pack starts — after a
  `/reload`, or when the pack is newly enabled on an existing world — is unestablished, and it
  decides whether a sweep is a backstop or the primary mechanism. The cost of the sweep is the
  other half: it scales with village size and with how many dimensions it walks.
- **Which type ids name the roster**, and how stable they are across engine versions. The
  prototype used `minecraft:villager_v2`, whose name says on its face that the id has moved once.
- **Whether the mechanism is factored into a shared library.** The prototype split it into
  `mc-scripting-core`; a fresh design should re-weigh that on whether a second consumer exists.
- **The engine version floor and the `@minecraft/server` version the pack declares.** These bound
  who can install it, and the pack is meant for strangers' worlds.
- **What the pack does about the gap before it can act** — a mob that dies in the ticks between
  world load and the pack's first sweep, and whether that gap is observable at all.

## Known tensions

- **Total protection pulls against staying vanilla.** The strongest mechanisms — removing
  damage outright, freezing the mob, replacing its AI — are exactly the ones that change how it
  plays. Invisible, behaviour-preserving protection and airtight protection are the two ends of
  the same rope.
- **Preventing conversion takes a vanilla loop away from the player.** Curing a zombie villager
  for discounted trades is a mechanic people build around, and a village whose villagers cannot be
  converted has no zombie villagers to cure. The owner has decreed it; the design's job is to
  implement it, not to reopen it, but the pack's description owes an installer the warning.
- **Coverage costs ticks, and nobody knows how many.** A recurring sweep is the simple way to stay
  covered and the obvious way to spend a server's budget. There is no evidence yet about what a
  busy world can afford, and the design will be picking an interval against a guess unless it
  gathers some.
- **No opt-out meets best-effort durability.** Protection is unconditional and has no in-game
  switch, yet the pack will not fight to keep it. So a player who wants one villager killable has
  no supported path, while a player who strips the marking by accident gets a silent hole — the
  two failures come from the same choice.
- **A stranger's world is a shared world.** Anything the pack marks on an entity — a tag, an
  effect, a dynamic property — sits in a namespace other packs write to as well, and the pack has
  no way to know what else is installed.
