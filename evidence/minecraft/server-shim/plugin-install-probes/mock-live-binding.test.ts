// Probe 1c — a second test file under the same setup-file `vi.mock`: does each file get its own
// mocked module (its own server), and does the shim's live `world` binding still move when a test
// reinstalls through `./control`, now that the module the pack imported is a mock namespace?
import { expect, it } from 'vitest'

import './marron-town-mod/src/main'
import { system, world } from '@minecraft/server'
import { createServer } from '@probe/fake-server'
import { __useServer } from '@probe/shim/control'

it('this file’s pack subscriptions are its own', () => {
  const server = (globalThis as Record<string, any>).__probeServer
  console.log(`[second file census] ${JSON.stringify(server.census())}`)
  expect(server.census().subscriptionCount).toBe(5)
  expect((world as any).label).toBe('setup vi.mock factory')
})

it('reinstalling through ./control — where the mocked binding points afterwards', () => {
  const second = createServer({ dimensions: ['nether'], label: 'reinstalled server' })
  __useServer(second)
  console.log(`[after reinstall] world.label=${(world as any).label} system.currentTick=${system.currentTick}`)
  expect(typeof (world as any).label).toBe('string')
})
