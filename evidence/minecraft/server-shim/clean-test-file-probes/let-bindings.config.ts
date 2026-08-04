// Probe 1, contrast: the same suite against the `export let` shim the spec ships.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['stable-bindings.test.ts'], env: { PROBE_SHIM: 'let' } },
  resolve: {
    alias: {
      '@minecraft/server': '@probe/shim-let',
      '@probe/shim-control': '@probe/shim-let/control',
    },
  },
})
