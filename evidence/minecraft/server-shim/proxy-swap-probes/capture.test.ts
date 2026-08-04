// The same swap, with a pack that keeps what the engine gave it. Only the two variants that
// carried the registrations across are worth running here; the question is what they still miss.
import { expect, it } from 'vitest'

import { system, world } from '@minecraft/server'
import { advanceTicks, createPlayer, emit } from '@twin-digital/minecraft-test-lib'
import type * as MC from '@minecraft/server'

import { lastHandlerReport, readCounters } from './capture-pack.js'
import { census, render } from './internals.js'
import { servers } from './swap-state.js'

const bindings = { world, system } as unknown as { world: MC.World; system: MC.System }

const round = (label: string): void => {
  const player = createPlayer(bindings, { name: `${label}-player`, dimension: world.getDimension('overworld') })
  emit(world.afterEvents.playerSpawn as never, { player, initialSpawn: true } as never)
  advanceTicks(bindings, 5)

  console.log(render(`${label}: server A`, census(servers[0].world)))
  console.log(render(`${label}: current server`, census(world as MC.World)))
  console.log(`[${label}] pack counters: ${readCounters()}`)
  console.log(`[${label}] handler saw: ${lastHandlerReport}`)
}

it('test 1', () => {
  round('test 1')
  expect(census(world as MC.World).objectives).toBeGreaterThan(0)
})

it('test 2', () => {
  round('test 2')
  expect(census(world as MC.World).objectives).toBeGreaterThan(0)
})
