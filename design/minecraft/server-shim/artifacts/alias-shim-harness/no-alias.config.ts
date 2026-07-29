// The control run: same suite, alias removed. Shows what a consumer hits without the shim.
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { include: ['combat-handler.test.ts'] },
  resolve: { alias: { '@twin-digital/minecraft-test-lib': process.env.MC_TEST_LIB } },
})
