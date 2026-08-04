// Probe 4: the ALS-backed shim. No setup file — each test establishes its own context.
import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const testLib = process.env.MC_TEST_LIB
if (!testLib || !existsSync(testLib)) {
  throw new Error('set MC_TEST_LIB to nodejs/minecraft/test-lib/src/index.ts in an opus checkout')
}

export default defineConfig({
  test: { include: ['async-context.test.ts'] },
  resolve: {
    alias: {
      '@minecraft/server': '@probe/shim-als',
      '@probe/shim-control': '@probe/shim-als/control',
      '@twin-digital/minecraft-test-lib': testLib,
    },
  },
})
