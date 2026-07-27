# Testability probe: `BlaizerBrumo/SafeGuard`

Pack pinned at commit `9f78f03d43435670daef2ac76db8c587022f13d8`. ~3,178 lines of JavaScript under
`scripts/`; an anticheat + admin-tooling pack. The question is whether the v1 fake surface described
in `design/minecraft/test-lib/spec.md` is enough to unit-test the units of this pack that carry real
decisions.

## How the ten units were chosen

Every `scripts/**/*.js` file was read. A unit qualified if it makes a decision a regression could
silently break — parsing, validation, escalation thresholds, permission gates, state transitions,
detection arithmetic. Excluded: `config.js` (data), `assets/globalBanList.js` (data),
`command/importer.js` (imports), `assets/ui.js` (form construction), and the ~20 one-shot command
bodies in `command/src/` that only format a string and call a `Player.prototype` method the unit
under test already covers. Where several commands share a shape (the quoted-player-name parser
appears in `mute.js`, `report.js`, `warnings.js`), one representative was taken.

The set deliberately mixes pure helpers with engine-coupled logic. Stacking it with pure functions
would have made the fake look sufficient; stacking it with block/item handlers would have made it
look useless. Both halves of the pack are represented in proportion to where its logic actually
lives.

## Verdicts

| # | Unit | Site | Verdict | What decides it |
|---|---|---|---|---|
| 1 | `parsePunishmentTime` | `assets/util.js` | **testable as specified** | Pure. Array-shape check, `parseInt`, unit lookup in `millisecondTime`. Touches no engine object. |
| 2 | `Vector3utils.magnitude` / `normalize` / `distanceTo` / `substract` | `classes/vector3.js` | **testable as specified** | Pure. The file imports nothing; vectors are plain `{x,y,z}` literals both in the pack and in the engine API. |
| 3 | `SafeguardModule.getModuleID` / `getValidModules` | `classes/module.js` | **testable as specified** | Reads only `this.Modules`, including the nested `OreAlerts` branch and the `skipNestedJSON` flag. The file's module-level `import {world}` never runs in these paths. |
| 4 | `SafeguardModule.getModuleStatus` / `toggleModule` | `classes/module.js` | **blocked** | `return world.getDynamicProperty(\`safeguard:${this.getModuleID(module)}\`) ?? false;` — `getDynamicProperty` is not on the built `World` surface (`getAllPlayers`, `scoreboard`, `gameRules`, `isHardcore`, `seed`, `afterEvents`, `beforeEvents`, `getDimension`), so it throws not-implemented. Every module toggle in the pack routes through here. |
| 5 | `Player.prototype.getBan` | `classes/player.js` | **blocked** | `const banProperty = this.getDynamicProperty("safeguard:banInfo");` — the entity dynamic-property surface is a stub. The unit's whole content is the expiry transition (`Date.now() > playerBanInfo.unbanTime` → write back `isBanned:false`), and both the read and the write-back are stubs. |
| 6 | `Player.prototype.setWarning` | `classes/player.js` | **blocked** | Three stubs on the escalation path: `this.getWarnings()` → `getDynamicProperty`; the 3rd-manual-warning branch calls `this.runCommand(...)` (stubbed `Entity` method) and `this.sendMessage(...)` (stubbed — on `Player` only `name` behaves); and `sendMessageToAllAdmins` reaches `world.getPlayers` / `world.sendMessage`, neither built. |
| 7 | `commandHandler` | `command/handle.js` | **blocked** | `if(command.adminOnly && !player.hasAdmin()) return player.sendMessage('…You need admin tag to run this!');` — `sendMessage` is a stub, and it is the *only* observable this unit produces on its deny paths. `hasAdmin()` is half-blocked besides: `return this.hasTag("admin") \|\| this.isOwner()` short-circuits true for a tagged admin (`hasTag` behaves) but throws for everyone else, because `isOwner()` reads a dynamic property. The deny branch — the security-relevant one — is exactly the unreachable one. |
| 8 | `beforeEvents.chatSend` spam handler | `index.js:25-105` | **blocked** | The closure is retrievable: `getSubscribers(world.beforeEvents.chatSend)` works, all 13 before-event signals exist, and `ChatSendBeforeEvent` is a plain data bag a test can hand-roll (though the library ships no class for it and `emit` accepts only the four built after-signals, so the literal needs a cast — the thing `r:fakes-are-structurally-assignable` (named `structural-full-shape-fakes` when this probe ran) exists to avoid). What stops it is inside the closure: `player.hasAdmin()`, `SafeguardModule.getModuleStatus(...spammerProtection)`, `player.getMuteInfo()`, and every `player.sendMessage(...)` on the six cancel branches. The string logic itself (512-byte packet limit, repeat detection, rate limit, word count, non-ASCII) is pure and would be a model unit test if it could be reached. |
| 9 | `entityHurt` combat-log handler | `index.js:~430-500` | **blocked** | The fake's strongest showing and still blocked. `const hp = player.getComponent("health").currentValue;` works, `data.hurtEntity` and `data.damageSource.damagingEntity` are on a built payload, `emit(world, 'entityHurt', …)` delivers it, and `hasTag`/`addTag`/`removeTag` all behave. Then `const antiCombatLogEnabled = SafeguardModule.getModuleStatus(...antiCombatlog);` throws — the first decision after the health read. On the `hp <= 0` branch it is `getModuleStatus(deathEffect)`, `player.runCommand("function assets/death_effect")`, and `player.sendMessage` for the death coordinates. |
| 10 | `betaFeatures` fly / velocity detection | `index.js:~500-520` | **testable with a seam change** | `if (invalidVelocityCheckOn && (playerVelocity.y < -3.919921875 && (Date.now() - player.tridentLastUse) > 5000) && player.isFalling)` — `isFalling` is a named stub (all eight `is…` state flags are), `invalidVelocityCheckOn` is a dynamic-property read, and the true branch calls `sendAnticheatAlert` and `teleportToGround` (which needs `dimension.getBlockFromRay` and `system.run`). Refactoring it to `betaFeatures({yVelocity, isFalling, isAdmin, checkEnabled, tridentLastUse})` returning a verdict rather than acting on it makes the arithmetic testable with no fake at all. That is a refactor a pack author would plausibly accept — it is one function, the caller already assembles most of these values, and separating detection from punishment is a normal shape. It is listed as a seam change rather than a blocker for that reason. |

**Tally: 3 testable as specified / 6 blocked / 1 testable with a seam change.**

## Blockers, ranked by units blocked

| Blocker | Units blocked | Note |
|---|---|---|
| Dynamic properties (`getDynamicProperty`/`setDynamicProperty` on both `World` and `Entity`) | 4, 5, 6, 7, 8, 9, 10 — **7** | 55 call sites across the pack. |
| `Player.sendMessage` (stub) | 6, 7, 8, 9 — **4** | 145 call sites. Also the pack's only observable on most branches, so it blocks assertions as well as execution. |
| `world.getPlayers` (only `getAllPlayers` is built) | 6, 9, 10 — **3** | Reached via `getPlayerByName` and `sendMessageToAllAdmins`. `sendMessageToAllAdmins` additionally passes `scoreOptions`, which the built `getEntities` filter refuses by design. |
| `Entity.runCommand` (stub) | 6, 9, 10 — **3** | The pack kicks, sets gamemode, and runs functions through command strings rather than API calls. |
| `world.sendMessage` (not built) | 9, 10 — **2** | |
| `Entity` `is…` state flags (`isFalling`) | 10 — **1** | |
| `system` scheduling + `Block` | 10 — **1** | Only via `teleportToGround`'s raycast; not a top-10 blocker on its own. |
| `ItemStack` / `Container` | **0 of 10** | Blocks `durabilityCheckModule`, `invsee`, `copyInv` — real units, but none in the decision-carrying top ten. |

## Also examined

- `formatMilliseconds` (`assets/util.js`) — pure, **testable as specified**. Kept out of the ten only because unit 1 already covers the pure-parser shape.
- The `mute` command's quoted-name and `^(\d+)([SMHD])$` duration parser — pure arithmetic wrapped in `getPlayerByName` (`world.getPlayers`) and six `player.sendMessage` calls. Same blockers as unit 7.
- `durabilityCheckModule` (`index.js:~295-315`) — **blocked** on `ItemStack`/`Container`: `const inv = player.getComponent(Minecraft.EntityComponentTypes.Inventory).container;` and `item.getComponent(Minecraft.ItemComponentTypes.Durability)`. The v1 table names these as the expected next increment.
- `legacy_BanToV2`, `legacy_ScoreboardsToV2` — blocked on `Scoreboard` members (built as objects, own members stubbed) and dynamic properties.

## Two mechanical facts about wiring this pack to the fake

Neither is a blocker, but a test author hits both before the first assertion.

1. **The pack reaches for the module singleton.** Every file does `import * as Minecraft from "@minecraft/server"` and `const world = Minecraft.world`. The library's substitution model is passing fakes in
   (`r:object-substitution-not-module-mocking`), and the pack accepts nothing. Testing any of these
   units means the runner aliases `@minecraft/server` to a shim exporting `world = createWorld()`.
   The library does not prevent this and does not ship it; the author writes the shim.
2. **`instanceof` works if the shim re-exports the fake classes.** `classes/player.js` does
   `Player.prototype.getWarnings = function () {…}`, and `util.js` guards with
   `if (!(senderPlayer instanceof Minecraft.Player)) throw TypeError(…)`. Because the fakes are real
   classes this package constructs, a shim doing `export { PlayerFake as Player }` makes both the
   prototype patching and the `instanceof` guards work against `spawnPlayerFake` output. A
   hand-rolled object-literal double gets this wrong and the pack's own type guards reject it.

## What the fake does provide that this pack needs

Three things it would have been easy to get wrong by hand, and that the pack genuinely exercises:

- **The damage cascade with ordering.** Unit 9 subscribes to `entityHurt` and reads
  `getComponent("health").currentValue` inside the handler. The spec's dispatch-at-mutation-end rule
  means that read sees post-write health — which is the entire premise of the `hp <= 0` death branch.
  A hand-rolled double that fires the event before writing health inverts that branch silently. The
  no-clamping rule matters too: the pack tests `hp <= 0`, and a double that clamped at zero would
  still pass while a double that clamped at `effectiveMin` of, say, 1 would not.
- **`hasTag` / `addTag` / `removeTag` holding real state.** The combat-log state machine is entirely
  tag-based (`safeguard:isInCombat`, `admin`), read and written across four different handlers. A
  call-recording double cannot express "the tag is now set"; the fake's tag set can.
- **Effects with the observed replacement rule.** `player.addEffect("weakness", 40, {amplifier: 255})`
  is the pack's autoclicker and killaura punishment, and `player.getEffect("weakness")` is the guard
  that suppresses CPS counting in the `entityHitEntity` handler. The amplifier-and-duration
  replacement rule is exactly the kind of engine quirk a hand-rolled double would implement as
  unconditional overwrite.

## Incidental finding

`index.js:51` calls bare `system.run(…)` inside the >512-character packet branch, but `index.js`
imports only `* as Minecraft` — there is no `system` binding in scope. That branch throws
`ReferenceError` before the kick command runs. It is unreached in normal play (it needs a
512-character chat message) and it is precisely the kind of thing a unit test of unit 8 would catch
on the first run. Reported as an observation about the value of testing this pack, not as a fake
finding.

## The single most important observation

**The v1 surface's gaps and this pack's needs do not line up with what the API survey predicted.**
The survey flagged `system` scheduling, `beforeEvents`, items, and blocks. Against this pack those
account for 2 of the 10 units. What actually stops seven of them is the dynamic-property surface,
which the spec stubs with the mildest justification in the document — "no requirement names a
consumer needing it." SafeGuard puts *all* of its persisted state there: bans, mutes, warnings,
module on/off toggles, the runtime config override, the unban queue, the world border, the device
ban list, report counts. Every stateful decision the pack makes begins with a dynamic-property read.
The second blocker, `Player.sendMessage`, is stubbed as a "client surface", but for a chat-driven
admin pack it is the primary output channel and therefore the primary assertion target — 145 call
sites.

Both are cheap to build relative to what the spec already commits to. Dynamic properties are a
string-keyed map with a documented value union; `sendMessage` is an append to a per-player log that
`getDeliveries` already establishes the pattern for. Neither needs world geometry, per-type vanilla
data, or a class the package does not ship — the three bounds every other absence in the v1 table
rests on. That asymmetry is the finding: the expensive absences (items, blocks, a clock) block less
of this pack than the two cheap ones.

## What this pack cannot tell us

- **It is one pack, and an unusual one.** SafeGuard is an anticheat/admin tool: chat commands,
  persisted moderation state, and player-message output. A pack that builds machines, generates
  structures, or drives custom mobs would weight the blockers completely differently — `ItemStack`
  and `Block` would almost certainly lead, and dynamic properties might not appear at all.
- **The dynamic-property result may be a genre effect, not a general one.** Moderation state has to
  survive a world reload, so this pack has no alternative to dynamic properties. A gameplay pack
  holding state in module-level variables would not hit this blocker once.
- **"Blocked" here means blocked *for this pack's code as written*.** Most of the blocked units are
  a seam away from testable, and I judged only unit 10's seam as one an author would plausibly
  accept. That judgement is mine, made without talking to the author, and reasonable people would
  draw the line elsewhere — particularly on units 4-6, where injecting a property store is a
  well-known refactor that happens to touch 55 call sites.
- **Nothing was executed.** The library does not exist yet, so every verdict is read from the spec's
  member lists against the pack's source. A verdict of "testable" is a claim that the named members
  are on the built side of the throw, not a claim that a written test passed.
- **It says nothing about ergonomics.** Even where the surface covers a unit, the amount of
  `addComponent`/`spawnFake`/`emit` setup a test needs is unmeasured, and a fake that is sufficient
  but tedious loses to a hand-rolled double in practice.
