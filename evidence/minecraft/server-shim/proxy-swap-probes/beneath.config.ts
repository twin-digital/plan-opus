// The contrast probe: the shallow shim, installed once, with the state beneath it replaced.
import { defineConfig } from 'vitest/config'

import { aliasesFor } from './config.mjs'

export default defineConfig({
  test: {
    include: ['beneath.test.ts'],
    setupFiles: ['./setup-beneath.ts'],
    env: { PROBE_SHIM: 'shallow' },
  },
  resolve: { alias: aliasesFor('shallow') },
})
