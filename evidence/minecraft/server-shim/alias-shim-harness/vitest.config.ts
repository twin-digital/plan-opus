import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// The test library is not published; MC_TEST_LIB points at its src/index.ts in an opus checkout.
const testLib = process.env.MC_TEST_LIB
if (!testLib || !existsSync(testLib)) {
  throw new Error('set MC_TEST_LIB to nodejs/minecraft/test-lib/src/index.ts in an opus checkout')
}

export default defineConfig({
  // Only the harness's own suites; the cloned packs carry tests of their own.
  test: { include: ['*.test.ts'] },
  resolve: {
    // The whole point of the harness: @minecraft/server resolves to the shim, nothing else changes.
    alias: {
      '@minecraft/server': new URL('./stub/minecraft-server.js', import.meta.url).pathname,
      '@twin-digital/minecraft-test-lib': testLib,
    },
  },
})
