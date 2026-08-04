// Probe 4's test file: both alias tables and both setup files have to have survived.
import { expect, it } from 'vitest'

import './marron-town-mod/src/main'
import { world } from '@minecraft/server'
import { marker } from '@consumer/marker'

const server = (globalThis as Record<string, any>).__probeServer
const order = (globalThis as Record<string, any>).__setupOrder

it('both setup files ran, and in this order', () => {
  console.log(`[setup order] ${JSON.stringify(order)}`)
  expect(order).toContain('consumer')
  expect(order).toContain('plugin')
})

it('both alias tables survived', () => {
  console.log(`[consumer marker] ${marker} [census] ${JSON.stringify(server.census())}`)
  expect(marker).toBe('consumer alias resolved')
  expect((world as any).label).toBe('plugin default')
  expect(server.census().subscriptionCount).toBe(5)
})
