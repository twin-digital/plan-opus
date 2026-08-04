// Probe 3 — the same boilerplate-free test file as probe 2, run against a server that is reset in
// place between tests. Each test does the identical thing; if the reset works, each reports the
// same numbers, and if the pack's module-scope registrations survived it, the pack still reacts.
import { expect, it } from 'vitest'

import { system, world } from '@minecraft/server'
import { advanceTicks, createPlayer, emit } from '@twin-digital/minecraft-test-lib'
import type * as MC from '@minecraft/server'

import './marron-town-mod/src/main'

const server = { world, system } as unknown as { world: MC.World; system: MC.System }

const overworld = (): MC.Dimension => world.getDimension('overworld')

const counters = (): string =>
  `entities=${overworld().getEntities().length}` +
  ` currentTick=${system.currentTick}` +
  ` objectives=${world.scoreboard.getObjectives().length}`

/** The pack's `playerSpawn` subscriber is what turns a spawn into scoreboard objectives. */
const spawnAndTick = (name: string): void => {
  const player = createPlayer(server, { name, dimension: overworld() })
  emit(world.afterEvents.playerSpawn as never, { player, initialSpawn: true } as never)
  advanceTicks(server, 40)
}

const runOne = (label: string, name: string): void => {
  console.log(`[${label} start] ${counters()}`)
  spawnAndTick(name)
  console.log(`[${label} end] ${counters()}`)
}

it('test 1', () => {
  runOne('test 1', 'Alice')
  expect(world.scoreboard.getObjectives().length).toBeGreaterThan(0)
})

it('test 2', () => {
  runOne('test 2', 'Bob')
  expect(overworld().getEntities().length).toBe(1)
})

it('test 3', () => {
  runOne('test 3', 'Carol')
  expect(system.currentTick).toBe(40)
})
