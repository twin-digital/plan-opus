// The setup file installs server A at module scope — before the test file, and so before the pack
// it imports, evaluates. The `beforeEach` then swaps to a fresh server. Hooks run after every
// module in the file has been evaluated, so the pack subscribed against A and never runs again.
import { beforeEach } from 'vitest'

import { installFirst, swapToFresh } from './swap-state.js'
import { report } from '@probe/shim-control'

installFirst()
console.log(`[setup] server A installed at module scope (shim=${process.env.PROBE_SHIM})`)

beforeEach(() => {
  swapToFresh()
  console.log(`[swap] ${report()}`)
})
