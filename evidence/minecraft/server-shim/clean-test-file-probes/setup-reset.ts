// Probe 3 — the same one-server setup file as probe 2, plus the in-place reset in a `beforeEach`.
// The test file is still boilerplate-free; what changes is whether the server it shares is cleared
// between tests, and whether the pack's module-scope registrations survive that clearing.
import { beforeEach } from 'vitest'

import { createServer, withVanillaDimensions } from '@twin-digital/minecraft-test-lib'
import { __useServer } from '@probe/shim-control'

import { resetInPlace } from './reset-in-place.js'

const server = createServer()
withVanillaDimensions(server)
__useServer(server)

const keepScheduled = process.env.PROBE_RESET === 'keep-scheduled'
const worldAtInstall = server.world

console.log(`[setup] one server installed; reset mode=${process.env.PROBE_RESET}`)

beforeEach(() => {
  const report = resetInPlace(server.world, { keepScheduled })
  console.log(
    `[reset] world-identity-preserved=${server.world === worldAtInstall}` +
      ` surviving-subscribers=${report.subscribers}` +
      ` surviving-scheduled-runs=${report.scheduled}`,
  )
})
