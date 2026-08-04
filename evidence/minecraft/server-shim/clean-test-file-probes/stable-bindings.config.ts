// Probe 1, Proxy variant: @minecraft/server resolves to the stable-Proxy shim.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['stable-bindings.test.ts'], env: { PROBE_SHIM: 'proxy' } },
  resolve: {
    alias: {
      '@minecraft/server': '@probe/shim-proxy',
      '@probe/shim-control': '@probe/shim-proxy/control',
    },
  },
})
