// Probe 3: the `export let` shim (so `world` is the fake itself and identity is directly visible),
// one server, and an in-place reset between tests. PROBE_RESET picks whether the scheduled runs
// survive the reset.
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineConfig } from 'vitest/config'

const testLib = process.env.MC_TEST_LIB
if (!testLib || !existsSync(testLib)) {
  throw new Error('set MC_TEST_LIB to nodejs/minecraft/test-lib/src/index.ts in an opus checkout')
}
const libSrc = dirname(testLib)

export default defineConfig({
  test: {
    include: ['reset.test.ts'],
    setupFiles: ['./setup-reset.ts'],
    env: { PROBE_RESET: process.env.PROBE_RESET ?? 'keep-scheduled' },
  },
  resolve: {
    alias: {
      '@minecraft/server': '@probe/shim-let',
      '@probe/shim-control': '@probe/shim-let/control',
      '@twin-digital/minecraft-test-lib/internal-state': join(libSrc, 'runtime/state.ts'),
      '@twin-digital/minecraft-test-lib/internal-member': join(libSrc, 'runtime/member.ts'),
      '@twin-digital/minecraft-test-lib': testLib,
      '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname,
    },
  },
})
