// Probe 1b: the same absent alias, with the `vi.mock` moved into a setup file.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['mock-in-setup.test.ts', 'mock-live-binding.test.ts'], setupFiles: ['./setup-mock.ts'] },
  resolve: {
    alias: { '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname },
  },
})
