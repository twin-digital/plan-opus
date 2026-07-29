// A pack written the way a pack may be written: it keeps things the engine handed it, in module
// scope, and its handlers use them. Nothing here is unusual — `marron-town-mod` happens not to do
// it, so this stands in for the packs that do.
//
// Both surviving variants re-issue the registration calls; neither can re-issue the assignments
// around them, so `home` and `board` still belong to the server that was installed when this
// module evaluated, and `spawnsSeen` never returns to zero.
import { system, world } from '@minecraft/server'

/** Values taken from the engine once, at module scope. */
const home = world.getDimension('overworld')
const board = world.scoreboard

/** Module-scope mutable state, the way a pack keeps a counter or a cache. */
let spawnsSeen = 0
let ticksSeen = 0

export const readCounters = (): string => `spawns-seen=${spawnsSeen} ticks-seen=${ticksSeen}`

/** What the handler saw when it last ran, so the probe can tell which server it reached. */
export let lastHandlerReport = 'never ran'

world.afterEvents.playerSpawn.subscribe(() => {
  spawnsSeen += 1
  board.addObjective(`probe_spawn_${String(spawnsSeen)}`, 'probe')
  lastHandlerReport =
    `home-is-current-overworld=${String(home === world.getDimension('overworld'))}` +
    ` entities-home-can-see=${String(home.getEntities().length)}`
})

system.runInterval(() => {
  ticksSeen += 1
}, 1)
