// The swap probe against the signal shim.
import { defineConfig } from 'vitest/config'

import { aliasesFor } from './config.mjs'

export default defineConfig({
  test: {
    include: ['swap.test.ts'],
    setupFiles: ['./setup-swap.ts'],
    env: { PROBE_SHIM: 'signal' },
  },
  resolve: { alias: aliasesFor('signal') },
})
