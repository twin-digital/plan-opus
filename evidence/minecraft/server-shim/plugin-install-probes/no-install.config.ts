// The control: no alias, no plugin, no mock.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['no-install.test.ts'] },
  resolve: {
    alias: { '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname },
  },
})
