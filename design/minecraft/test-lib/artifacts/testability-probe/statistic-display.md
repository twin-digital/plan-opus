# Testability probe: `ForestOfLight/Statistic-Display`

Pack: `ForestOfLight/Statistic-Display` @ `cd4c89e86f5d79c224f3c28dafdde4d3c9576e3e`, `@minecraft/server ^2.8.0`.
~2,100 source lines under `packs/BP/scripts` (excluding the vendored `lib/canopy` and `lib/ipc`).
Question: with the v1 fake surface exactly as `design/minecraft/test-lib/spec.md` states it, can a developer
write unit tests for this pack's real logic?

## What the pack is

A Canopy extension that counts player statistics. One `EventManager` singleton owns a map of `Event`
objects; each `Event` persists a `{displayName, participants:[{name,score}]}` blob in a **world dynamic
property**, and each `src/events/*.js` file registers one statistic whose setup callback subscribes to an
engine signal (or starts a `system.runInterval`) and calls `eventManager.increment/addCount/setCount`.
`Display` mirrors the current statistic onto a scoreboard objective in the sidebar. `Carousel` rotates
through statistics on a `system.runInterval`. Five custom commands and three Canopy rules sit on top.

Measured API usage (grep over `src` + `main.js`):

| surface | count |
|---|---|
| `world.afterEvents.*.subscribe` | 24 |
| `world.beforeEvents.*.subscribe` | 4 |
| `system.run` / `runInterval` / `clearRun` | 20 |
| `world.setDynamicProperty` / `getDynamicProperty` / `getDynamicPropertyIds` | 8 / 6 / 4 |
| `world.scoreboard` | 7 |
| `world.getAllPlayers` | 7 |
| `world.getPlayers` | 2 |
| `world.getEntity` | 1 |

## How the ten units were chosen

Every `src/events/*.js` file has the same shape — a `subscribe` closure that reads two or three fields off
the payload, string-munges an id, and calls `eventManager.increment`. Testing all 23 of them would be
testing one behaviour 23 times. So the ten below are the places where a *decision* is actually made:
string transformation (`recolor`, `titleCase`), the statistic-id hierarchy parser, the persistence
chunking, the count arithmetic and its add/set branch, the lazy re-registration state machine, the two
message formatters, the scoreboard reconciliation with its offline-player and Total branches, the carousel
state machine, the one genuine predicate in the event files (`hasBroken`), and one representative event
handler chosen specifically because it lands on a signal the fake delivers. `titleCase` is folded into
row 1; the command classes are excluded because they are switch statements over an already-tested
`eventManager`.

## Verdicts

| # | unit | file | test I would write | verdict |
|---|---|---|---|---|
| 1 | `recolor` (+ `titleCase`) | `src/utils.js:7,17` | call with `('§7ab §fcd', 'cd', '§a')`; assert the returned string re-applies the preceding colour code after the highlight | **testable as specified** — pure string functions, no engine object at all. The fake is not needed and not in the way. |
| 2 | `StatList` hierarchy parser (`getBaseEventIDs`, `getSubEventIDs`, `getMatchingSubEventIDs`) | `src/classes/StatList.js` | `new StatList(['blocksMined','blocksMined:stone','deaths'])`; assert base = `['blocksMined','deaths']`, subs of `blocksMined` = `['stone']`, and that the memoisation guards fire once | **testable as specified** — constructor takes a plain array. No engine object. |
| 3 | `BulkDP.get` / `set` (32,767-byte chunking) | `src/classes/BulkDP.js` | set a value whose JSON exceeds 32,767 chars; assert `set` writes N+1 properties and `get` reconstructs the original; assert the missing-chunk path warns and returns `[]` | **blocked** — `world.getDynamicPropertyIds()` (`:15`), `world.getDynamicProperty(...)` (`:20`), `world.setDynamicProperty(...)` (`:40`). The built `World` surface is `getAllPlayers`, `scoreboard`, `gameRules`, `isHardcore`, `seed`, `afterEvents`, `beforeEvents`, `getDimension`; the dynamic-property surface is a not-implemented stub. Nothing in this unit can run. |
| 4 | `Event` count arithmetic (`updateCount` add-vs-set, first-time participant insert, `getCount`, `getTotal`, `removeParticipant`) | `src/classes/Event.js:44,68,76,85` | construct an `Event`, `updateCount(player, 3)` twice, assert score 6; `updateCount(player, 3, 'set')`, assert 3; assert `getCount` of an unknown player is 0 and `getTotal` sums | **blocked** — the constructor itself calls `world.getDynamicPropertyIds()` (`:16`) and every read is `JSON.parse(world.getDynamicProperty(this.#dpIdentifier))` (`:30`). Secondary: `updateCount` ends in `Display.update(this)` (`:65`), which reaches the scoreboard. |
| 5 | `EventManager.validateEventID` lazy re-registration | `src/classes/EventManager.js:79` | an id that `exists` but is not `isRegistered`; assert it self-registers from the persisted `displayName` and returns true; assert a blank `displayName` returns false | **blocked** — `JSON.parse(world.getDynamicProperty(EVENT_ID_PREFIX + eventID)).displayName` (`:83`), plus `exists()` → `BulkDP.get()` → the same stub. |
| 6 | `Display.getTopMessage` / `getPlayerMessage` | `src/classes/Display.js:76,91` | 20 participants; assert descending sort, exactly 15 lines, the numbered prefix format, and the `§7No statistics found…` empty branch | **blocked** — pure formatting over `event.getData().participants`, but `getData()` is the dynamic-property read at `Event.js:30`. Blocked one hop away from being a clean pure-function test; see the seam note below. |
| 7 | `Display.set` / `Display.update` (scoreboard reconciliation) | `src/classes/Display.js:30,48` | one online and one offline participant; with `showOfflinePlayers` true assert the offline score is written, with it false assert `removeParticipant`; assert the `Total:` row appears/disappears with `showTotal` | **blocked** — three distinct gaps in one unit: `world.scoreboard.getObjective/addObjective/removeObjective/setObjectiveAtDisplaySlot` (`:13,36,37,38,42`) — `Scoreboard` and `ScoreboardObjective` are built so the graph is callable but **all their own members are stubbed**; `world.getPlayers({name})` (`:57`) is not in the built `World` surface (only `getAllPlayers` is); and `DisplaySlotId.Sidebar` / `ObjectiveSortOrder.Descending` (`:1,6,42`) are enum values the engine package has no runtime for and the library ships none of. |
| 8 | `Carousel` state machine (`next` rotation, `add`/`remove`, `setInterval` restart-while-active) | `src/classes/Carousel.js` | `add` three entries, assert `next()` rotates and `peek()` follows; `setInterval(5)` while active, assert stop-then-start and `interval === 100` | **blocked** — `system.runInterval` / `system.clearRun` (`:52,55,65`) and `world.setDynamicProperty` (`:71`) / `getDynamicPropertyIds` (`:79`). `System` is absent from v1 ("there is no tick to schedule against"). `next`/`peek`/`getEntries` alone are pure, but `add`/`remove` call `saveData()` and `start`/`stop` are entirely scheduling. |
| 9 | `hasBroken` (tool durability predicate) | `src/events/toolsBroken.js:25` | a durability component at `maxDurability - damage === 0` with no after-stack → true; nonzero, or an after-stack present → false; no durability component → false | **blocked** — `toolBeforeBreak.getComponent(ItemComponentTypes.Durability)` (`:26`) then `.maxDurability` / `.damage` (`:29`). `ItemStack` and the item component classes are absent from v1 outright — there is no fake to import and no stub to hold. |
| 10 | `damageTaken` / `killed` / `killedBy` handlers | `src/events/damageTaken.js:8`, `killed.js:8`, `killedBy.js:8` | `spawnPlayerFake`, then `emit(world, 'entityHurt', {hurtEntity, damage, damageSource})` and assert the player's `damageTaken` and `damageTaken:<cause>` counts; `emit(world,'entityDie', …)` for the kill attribution | **blocked — but only downstream.** The delivery half works: `entityHurt` and `entityDie` are two of the four signals `emit` accepts and the fake delivers, the payload classes are built, and the handlers' only reads are `event.hurtEntity.typeId`, `event.damageSource.damagingEntity.typeId` and `event.damage` — all behaving members. The handler runs. The assertion target does not: `eventManager.addCount` → `Event.updateCount` → `world.getDynamicProperty`. |

## Tally

- **testable as specified: 2 / 10** (units 1 and 2 — and both are pure JavaScript that needs no fake).
- **blocked: 8 / 10**
- **testable with a seam change: 0 as written**, but see below — three of the eight are cheap to unblock and five are not.

### Blockers ranked by units blocked

| blocker | units | note |
|---|---|---|
| `world.getDynamicProperty` / `setDynamicProperty` / `getDynamicPropertyIds` — stubs on the built `World` | **6** (3, 4, 5, 6, 8, 10) | The pack's entire persistence layer. Every statistic value the pack computes lives here; nothing that reads or writes a count can run. |
| `system.run` / `runInterval` / `clearRun` — `System` absent from v1 | **2 directly** (8, and the `stat`/`statreset` command bodies), **9 more event files transitively** | 20 call sites. Five statistics (`playTime`, `timeSinceDeath`, `highestXpLevel`, `longestSession`, `other:longestInactivity`) are *nothing but* an interval body; there is no way to trigger them. |
| `Scoreboard` / `ScoreboardObjective` members stubbed | **1 directly** (7), reached transitively by 4 and 8 | `Display.update` is called at the end of `Event.updateCount`, `Event.reset`, and both `showTotal` callbacks, so it is on the path of most write tests even when it is not the unit. |
| `ItemStack` + item component classes absent | **1** (9), plus `itemsPickedUp`, `itemsDropped`, `blocksMinedWith` | |
| `Block` / `BlockPermutation` absent | **0 of the 10**, but blocks `blocksMined`, `blocksPlaced`, `interactedWith` | `event.block.typeId` is all three need — a one-field read, and the class it needs is out of scope entirely. |
| `world.getPlayers(options)` and `world.getEntity(id)` not in the built `World` surface | 1 (7), 1 (`showOfflinePlayers.onPlayerJoin`) | `getAllPlayers` is built; the filtered form is not. `Dimension.getEntities` supports `name` filtering, so the capability exists on the wrong object. |
| `Player.level` stubbed (only `name` behaves) | `highestXpLevel.js:13,15` | |
| before-event signals never deliver | 4 subscriptions | `blocksMined`, `itemsPickedUp`, `itemUsed`, `longestSession`'s leave handler. None is cancelling, so the *cancellation* gap costs this pack nothing — the delivery gap costs it four statistics. |

### The signal-delivery arithmetic for this pack

Of **28** `subscribe` sites, **24** are after-events and **4** are before-events. Exactly **6** land on a
signal the fake delivers — two on `entityHurt` (`damageDealt`, `damageTaken`) and four on `entityDie`
(`deaths`, `killedBy`, `killed`, `timeSinceDeath`). The other **22 (79%) register and stay silent**:
`playerBreakBlock` ×2, `playerPlaceBlock`, `playerDimensionChange`, `effectAdd`, `playerEmote`,
`playerJoin` ×3, `playerLeave`, `playerInteractWithBlock`, `playerInteractWithEntity`, `entityItemDrop`,
`entityHeal`, `explosion`, `worldLoad` ×3, and the four before-events.

`worldLoad` deserves its own line: it is the pack's bootstrap trigger (`main.js:54`,
`EventManager.js:121`). It sets `eventManager.worldLoaded = true` and drains `eventsToRegister`. Since it
never delivers, **no statistic is ever registered** in a test — `registerEvent` files them in
`eventsToRegister` and they stay there. `emit` cannot reach it: the signal-name union is the four built
payloads only. A test must call `eventManager.registerQueuedEvents()` by hand.

### Seam changes, and whether an author would take them

Three are cheap and one is not:

- **Units 6 and 4 (formatting and arithmetic): extract the data blob from the persistence.** If
  `getTopMessage(participants)` took the array instead of an `eventID`, and `Event`'s count arithmetic
  operated on an injected store object rather than calling `world.*DynamicProperty` inline, both become
  pure-function tests. This is a refactor a pack author would plausibly accept — it is the ordinary
  "separate the store from the logic" move, and it is confined to two files. **But note what it means for
  the library: the refactor removes the engine from the unit entirely. The fake is not what unblocks
  these — deleting the dependency is.**
- **Unit 3 (`BulkDP`): inject the property store.** Same move, one indirection, and the class exists
  precisely to wrap that store. Reasonable. Again the fake plays no part afterwards.
- **Unit 8 (`Carousel`): inject a scheduler.** Plausible in principle, but the author would be inventing
  a scheduler abstraction with no production alternative implementation, purely for tests. Marginal.
- **Units 7, 9, 10: no seam helps.** Unit 7's subject *is* the scoreboard interaction; unit 9's subject
  *is* the durability component; unit 10 is already correctly shaped — the handler takes its payload as an
  argument, which is exactly the seam the library wants, and it is blocked anyway.

### The module-singleton question

The pack never receives `world` — it does `import { world } from '@minecraft/server'` in 14 files. The
spec's substitution model is passing fakes in `[r:object-substitution-not-module-mocking]`. This is *not*
a blocker in practice: a consumer wires `vi.mock('@minecraft/server', () => ({ world: createWorld(), … }))`
and the library's product — an object holding real state — is exactly what that mock needs to return.
The library supplies the object; the runner supplies the injection. Worth recording only because the
consumer must also supply, from nothing, the enum objects the pack imports by value:
`DisplaySlotId`, `ObjectiveSortOrder`, `EntityComponentTypes`, `ItemComponentTypes`, `EntityHealCause`,
`CustomCommandParamType`, `CommandPermissionLevel`, `CustomCommandStatus`. The engine package has no
runtime for these and the library ships no registries; `@minecraft/vanilla-data` covers type ids, not
these enums. That is a small, real, recurring cost — eight hand-written literals before the first
assertion.

(Build detail, not a library concern: several files import `'src/classes/Display'` as a bare specifier,
so a test harness must reproduce the pack's bundler alias. `Event.js` ↔ `Display.js` ↔ `EventManager.js`
is also a three-way import cycle.)

## What the fake gets right that a hand-rolled double would not

Recorded even though these units end up blocked, because it is the part of the answer that is about the
library rather than about this pack:

1. **`entityDie` carries a populated `damageSource`.** `killed.js:9` branches on
   `event.damageSource.damagingEntity?.typeId` and `killedBy.js:11` reads the same field — the *entire*
   attribution logic of two statistics lives in that one field on the death payload. A hand-rolled double
   almost always gives `entityDie` a bare `{deadEntity}`; both handlers would then silently take the early
   return and the tests would pass while asserting nothing. The fake's cascade carries the hurt's cause
   forward into the die event, so the field is there.
2. **The corpse stays valid.** Four handlers read `event.deadEntity.typeId` *inside* the `entityDie`
   handler. A naive double that models "died" as "invalid" would throw `InvalidEntityError` in all four.
   The fake keeps the corpse valid (and `typeId` is one of the four members readable even after removal),
   which is what the engine was observed doing.
3. **Set-shaped registration and identity-based unsubscribe.** `showOfflinePlayers.js:14-15` binds its
   handlers once in the constructor precisely so `subscribe`/`unsubscribe` pair up by identity, and the
   rule can be toggled repeatedly. An array-push double would accumulate duplicate subscriptions and
   double-count every join; a `Set`-and-identity double matches the observed engine. Four separate files
   subscribe to `entityDie`, so subscription-order determinism is not academic here either.
4. **Delivery after the mutation lands.** `damageTaken.js:11` reads `event.damage`, and any test that
   drives it through `applyDamage` rather than `emit` depends on the handler seeing post-write state. The
   fake dispatches at the end of the mutating call for exactly that reason.
5. **`emit`'s typed signal union.** With 28 subscriptions across 23 files, a string-keyed emit would let a
   test typo `'entityDied'` and pass while asserting on a handler that never ran. The four-name union makes
   that a compile error.

None of this saves the pack's tests — but all of it is a real correctness property that a per-repo double
gets wrong, and this pack would have hit at least three of them.

## Latent pack bug found while probing

`EventManager.js` interpolates `${extension.name}` in six error messages (`:31,45,51,57,63,69`) but never
imports `extension`. Any of those error paths throws `ReferenceError: extension is not defined` instead of
the intended message. Not a library finding — but it is what a unit test of `getEvent`'s failure branch
would have caught on day one, which is a small argument for the library's existence independent of the
verdict above.

## Verdict

For this pack, as specified, **the v1 fake is not sufficient** — 2 of 10 units are testable and both of
those need no fake at all. The decisive gap is not an event-model gap. It is that **the pack's state does
not live in the object model the library fakes.** Every count this pack computes lives in a world dynamic
property, and every count it displays lives in a scoreboard objective. The library models entities,
components, effects, damage and death with care; this pack stores nothing there. The signals it does
deliver reach the pack's handlers correctly and then hand control to code that immediately leaves the
modelled surface.

## What this one pack cannot tell us

- It is a **statistics recorder**, so it is nearly pure persistence-and-presentation. A pack whose logic is
  about entity state — combat, mob behaviour, effects, health — would exercise precisely the surface v1
  built, and would score very differently. This probe says nothing about that shape.
- The dynamic-property and scoreboard gaps dominate everything here. Whether they are *generally* the
  binding constraint, or a quirk of a pack that persists counters, needs the other probes. The survey's
  reported figures (84% `system`, 76% `beforeEvents`) do not distinguish the two.
- `system.run` here is almost always the before-event trampoline (`system.run(() => …)` to defer a write
  out of a read-only phase), not real scheduling. That idiom might be cheap for a library to accommodate;
  a genuine `runInterval` statistic like `playTime` is not. One pack cannot tell us the ratio across the
  ecosystem.
- The 6-of-28 delivery figure is arithmetic over *this* pack's chosen signals. A pack that happens to use
  hurt/die/health would read 100%.
- Nothing here tests whether the fake's *behaviours* are right, only whether its *surface* is reachable.
  A pack that got past the surface would be the one to check fidelity against.
- The spec does not state whether `subscribe`'s options argument is honoured. Two subscriptions here pass
  `{ entityFilter: { type: 'minecraft:player' } }` (`itemsPickedUp.js:21`, `itemsDropped.js:23`). Both are
  on non-delivering signals so it does not bite, but the question is open and a pack using a filter on
  `entityHurt` or `entityDie` would hit it immediately.
