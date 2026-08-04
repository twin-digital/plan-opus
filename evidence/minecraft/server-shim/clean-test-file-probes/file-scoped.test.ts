// Probe 2 — a test file with no boilerplate at all: static imports only, the pack imported for its
// module-scope subscriptions, `world` and `system` imported to arrange and assert. The server was
// installed by `setup-file-scoped.ts` before this module evaluated.
//
// The subject is bencrob/marron-town-mod (MIT) at 2c025b4, unmodified: its `src/main.ts` subscribes
// to five world events and registers two `system.runInterval` loops while it evaluates.
import { expect, it } from 'vitest'

import { system, world } from '@minecraft/server'
import { advanceTicks, createPlayer, emit, getHandlerErrors, getOutput } from '@twin-digital/minecraft-test-lib'
import type * as MC from '@minecraft/server'

import './marron-town-mod/src/main'

/** The free functions take the bundle; the shim's two bindings are all of it a test file has. */
const server = { world, system } as unknown as { world: MC.World; system: MC.System }

const overworld = (): MC.Dimension => world.getDimension('overworld')

const counters = (): string =>
  `entities=${overworld().getEntities().length}` +
  ` currentTick=${system.currentTick}` +
  ` objectives=${world.scoreboard.getObjectives().length}` +
  ` world-output=${getOutput(world).length}` +
  ` handler-errors=${getHandlerErrors(server).length}`

const spawn = (name: string): MC.Player => {
  const player = createPlayer(server, { name, dimension: overworld() })
  emit(world.afterEvents.playerSpawn as never, { player, initialSpawn: true } as never)
  return player
}

const scoreOf = (objectiveId: string, player: MC.Player): string => {
  const objective = world.scoreboard.getObjective(objectiveId)
  if (!objective) {
    return 'no objective'
  }
  try {
    return String(objective.getScore(player) ?? 'no score')
  } catch (error) {
    return `threw ${(error as Error).name}`
  }
}

it('test 1 — the pack is already subscribed, with nothing in the test file to do it', () => {
  console.log(`[carried into test 1] ${counters()}`)

  const alice = spawn('Alice')
  advanceTicks(server, 40)

  console.log(`[end of test 1] ${counters()} alice-total-points=${scoreOf('marrontown_pts_total', alice)}`)
  expect(world.scoreboard.getObjectives().length).toBeGreaterThan(0)
})

it('test 2 — a new test, on the previous test’s world', () => {
  console.log(`[carried into test 2] ${counters()}`)

  spawn('Bob')
  advanceTicks(server, 40)

  const aliceStillHere = overworld()
    .getEntities()
    .some((entity) => (entity as MC.Player).name === 'Alice')
  console.log(`[end of test 2] ${counters()} alice-still-present=${aliceStillHere}`)
  expect(aliceStillHere).toBe(true)
})

it('test 3 — the tick count keeps climbing', () => {
  console.log(`[carried into test 3] ${counters()}`)
  expect(system.currentTick).toBeGreaterThan(0)
})
