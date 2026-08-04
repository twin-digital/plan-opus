// Probe 1b — the same `vi.mock`, moved into a setup file. Two questions in one: whether a mock can
// make an otherwise unresolvable specifier resolvable, and whether a setup-file mock applies to the
// test files that follow it.
import { vi } from 'vitest'

vi.mock('@minecraft/server', async () => {
  const { createServer } = await import('@probe/fake-server')
  const { __useServer } = await import('@probe/shim/control')
  const server = createServer({ dimensions: ['overworld'], label: 'setup vi.mock factory' })
  ;(globalThis as Record<string, unknown>).__probeServer = server
  __useServer(server)
  console.log('[setup vi.mock factory] built and installed a server')
  return await import('@probe/shim')
})

console.log('[setup-mock] setup module evaluated')
