// Probe 1b's test file — no install code of any kind: the setup file's `vi.mock` is all there is.
import { expect, it } from 'vitest'

import './marron-town-mod/src/main'
import { system, world } from '@minecraft/server'

it('the pack subscribed on the server the setup file’s mock factory installed', () => {
  const server = (globalThis as Record<string, any>).__probeServer
  console.log(`[census] ${JSON.stringify(server?.census?.())}`)
  expect((world as any).label).toBe('setup vi.mock factory')
  expect(server.census().subscriptionCount).toBe(5)
  expect(server.census().intervals).toBe(2)
  expect(system.currentTick).toBe(0)
})
