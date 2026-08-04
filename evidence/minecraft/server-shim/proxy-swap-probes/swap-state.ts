// The servers the probe swaps between. Server A is installed at module scope, before any test
// file evaluates, so the pack's module-scope registrations are made against A. Every test then
// gets a fresh server pointed at by the same stable bindings.
import { createServer, withVanillaDimensions, type FakeServer } from '@twin-digital/minecraft-test-lib'
import { __useServer } from '@probe/shim-control'

export const servers: FakeServer[] = []

const fresh = (): FakeServer => {
  const server = createServer()
  withVanillaDimensions(server)
  servers.push(server)
  return server
}

/** Server A: what the pack subscribes against while it evaluates. */
export const installFirst = (): FakeServer => {
  const server = fresh()
  __useServer(server)
  return server
}

/** Server B, then C: a new server behind the same bindings, with no module re-evaluation. */
export const swapToFresh = (): FakeServer => {
  const server = fresh()
  __useServer(server)
  return server
}
