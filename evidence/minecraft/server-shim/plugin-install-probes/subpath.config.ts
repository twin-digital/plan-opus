// The contrast to the plugin: no plugin at all, the consumer's own two entries, with the setup file
// named by the shim's published subpath instead of a file of their own.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['plugin.test.ts'], setupFiles: ['@probe/shim/setup'] },
  resolve: {
    alias: {
      '@minecraft/server': '@probe/shim',
      '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname,
    },
  },
})
