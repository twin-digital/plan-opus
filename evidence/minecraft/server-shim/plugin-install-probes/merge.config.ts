// Probe 4: a consumer who already has a `resolve.alias` table and a `setupFiles` entry of their
// own, and adds the plugin beside them.
import { defineConfig } from 'vitest/config'

import { minecraftShim } from '@probe/shim/vite'

export default defineConfig({
  plugins: [minecraftShim({ dimensions: ['overworld'], label: 'plugin default' })],
  test: {
    include: ['merge.test.ts'],
    setupFiles: ['./setup-consumer.ts'],
  },
  resolve: {
    alias: {
      '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname,
      '@consumer/marker': new URL('./consumer-marker.js', import.meta.url).pathname,
    },
  },
})
