// Probe 2 — the whole of the consumer's setup. One server, installed at module scope: no
// `beforeEach`, and no enumeration of the pack's own modules.
import { createServer, withVanillaDimensions } from '@twin-digital/minecraft-test-lib'
import { __useServer } from '@probe/shim-control'

const server = createServer()
withVanillaDimensions(server)
__useServer(server)

console.log(`[setup] installed one server at module scope (shim=${process.env.PROBE_SHIM})`)
