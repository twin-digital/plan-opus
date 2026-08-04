// The swap probe against the shallow shim.
import { defineConfig } from 'vitest/config'

import { aliasesFor } from './config.mjs'

export default defineConfig({
  test: {
    include: ['swap.test.ts'],
    setupFiles: ['./setup-swap.ts'],
    env: { PROBE_SHIM: 'shallow' },
  },
  resolve: { alias: aliasesFor('shallow') },
})
