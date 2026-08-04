// Probe 1a — can `vi.mock` stand in for the alias? No `resolve.alias` for `@minecraft/server` is
// configured; the mock factory is the only thing offering the specifier a module.
import { expect, it, vi } from 'vitest'

vi.mock('@minecraft/server', async () => {
  const { createServer } = await import('@probe/fake-server')
  const { __useServer } = await import('@probe/shim/control')
  const server = createServer({ dimensions: ['overworld'], label: 'vi.mock factory' })
  ;(globalThis as Record<string, unknown>).__probeServer = server
  __useServer(server)
  console.log('[vi.mock factory] built and installed a server')
  return await import('@probe/shim')
})

import './marron-town-mod/src/main'
import { system, world } from '@minecraft/server'

it('the pack subscribed on the server the mock factory installed', () => {
  const server = (globalThis as Record<string, any>).__probeServer
  console.log(`[census] ${JSON.stringify(server?.census?.())}`)
  expect((world as any).label).toBe('vi.mock factory')
  expect(server.census().subscriptionCount).toBe(5)
  expect(server.census().intervals).toBe(2)
  expect(system.currentTick).toBe(0)
})
