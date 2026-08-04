// Probe 1a: no alias for `@minecraft/server`. The `@minecraft/server-ui` alias stays — that pack
// module is the consumer's own stub either way, and leaving it out would fail for a second reason.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['mock-in-test.test.ts'] },
  resolve: {
    alias: { '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname },
  },
})
