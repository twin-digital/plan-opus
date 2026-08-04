// The same test file as `swap.test.ts` drives, against the same unmodified pack — but the
// isolation comes from beneath the fakes instead of from a swap of the shim's target.
import { expect, it } from 'vitest'

import { system, world } from '@minecraft/server'
import { advanceTicks, createPlayer, emit } from '@twin-digital/minecraft-test-lib'
import type * as MC from '@minecraft/server'

import './marron-town-mod/src/main'

import { census, render } from './internals.js'

const bindings = { world, system } as unknown as { world: MC.World; system: MC.System }

const round = (label: string): void => {
  console.log(render(`${label}: before`, census(world as MC.World)))
  const player = createPlayer(bindings, { name: `${label}-player`, dimension: world.getDimension('overworld') })
  emit(world.afterEvents.playerSpawn as never, { player, initialSpawn: true } as never)
  advanceTicks(bindings, 40)
  console.log(render(`${label}: after`, census(world as MC.World)))
}

it('test 1', () => {
  round('test 1')
  expect(census(world as MC.World).objectives).toBeGreaterThan(0)
})

it('test 2', () => {
  round('test 2')
  expect(census(world as MC.World).entities).toBe(1)
})
