// Probes 2 and 3's test file: static imports only, no install code. The pack is imported for its
// module-scope subscriptions; `world` and `system` come through the plugin-contributed alias. What
// the plugin was asked for is in `PROBE_EXPECT`, so the same file measures every option variant.
import { expect, it } from 'vitest'

import './marron-town-mod/src/main'
import { system, world } from '@minecraft/server'

const server = (globalThis as Record<string, any>).__probeServer
const expected = JSON.parse(process.env.PROBE_EXPECT ?? '{"label":"plugin default","dimensions":["overworld"]}')

it('the alias came from the plugin — the pack’s import resolved to the shim', () => {
  console.log(`[census] ${JSON.stringify(server?.census?.())}`)
  expect(world).toBe(server.world)
  expect(system).toBe(server.system)
})

it('the setup file came from the plugin — the pack subscribed before this file evaluated', () => {
  expect(server.census().subscriptionCount).toBe(5)
  expect(server.census().intervals).toBe(2)
  expect(server.census().subscriptions).toEqual([
    'after.entityHurtx1',
    'after.itemCompleteUsex1',
    'after.itemUsex1',
    'after.playerBreakBlockx1',
    'after.playerSpawnx1',
  ])
})

it('the plugin’s options reached the server the setup file installed', () => {
  console.log(`[expected] ${JSON.stringify(expected)} [installed] label=${(world as any).label}`)
  expect((world as any).label).toBe(expected.label)
  expect(server.census().dimensions).toEqual(expected.dimensions)
  if (expected.dimensions.includes('overworld')) {
    expect(world.getDimension('overworld').id).toBe('overworld')
  } else {
    expect(() => world.getDimension('overworld')).toThrow(/not present/)
  }
})

it('the pack’s module-scope loops run against the installed server', () => {
  server.advanceTicks(40)
  console.log(`[after 40 ticks] ${JSON.stringify(server.census())}`)
  expect(system.currentTick).toBe(40)
  expect(server.census().messages).toBe(1)
})
