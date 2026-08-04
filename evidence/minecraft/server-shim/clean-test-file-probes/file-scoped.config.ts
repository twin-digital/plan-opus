// Probe 2, against the stable-Proxy shim: one server installed by a setup file at module scope.
import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const testLib = process.env.MC_TEST_LIB
if (!testLib || !existsSync(testLib)) {
  throw new Error('set MC_TEST_LIB to nodejs/minecraft/test-lib/src/index.ts in an opus checkout')
}

export default defineConfig({
  test: {
    include: ['file-scoped.test.ts'],
    setupFiles: ['./setup-file-scoped.ts'],
    env: { PROBE_SHIM: 'proxy' },
  },
  resolve: {
    alias: {
      '@minecraft/server': '@probe/shim-proxy',
      '@probe/shim-control': '@probe/shim-proxy/control',
      '@twin-digital/minecraft-test-lib': testLib,
      '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname,
    },
  },
})
