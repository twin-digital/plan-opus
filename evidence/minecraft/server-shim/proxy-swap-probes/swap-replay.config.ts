// The swap probe against the replay shim.
import { defineConfig } from 'vitest/config'

import { aliasesFor } from './config.mjs'

export default defineConfig({
  test: {
    include: ['swap.test.ts'],
    setupFiles: ['./setup-swap.ts'],
    env: { PROBE_SHIM: 'replay' },
  },
  resolve: { alias: aliasesFor('replay') },
})
