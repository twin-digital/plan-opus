// The shape probe: no shim, just a server the library built.
import { defineConfig } from 'vitest/config'

import { aliasesFor } from './config.mjs'

export default defineConfig({
  test: { include: ['shape.test.ts'] },
  resolve: { alias: aliasesFor('shallow') },
})
