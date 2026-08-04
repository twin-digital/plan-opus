// One server, installed once and never swapped. The `beforeEach` replaces the state beneath it.
import { beforeEach } from 'vitest'

import { installFirst } from './swap-state.js'
import { swapBeneath } from './beneath.js'

const server = installFirst()
console.log('[setup] server A installed at module scope; the bindings never move')

beforeEach(() => {
  swapBeneath(server.world)
})
