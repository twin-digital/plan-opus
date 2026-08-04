// Probe 4's second half: the same consumer, with their alias table written as vite's array form
// rather than an object. The plugin still contributes an object.
import { defineConfig } from 'vitest/config'

import { minecraftShim } from '@probe/shim/vite'

export default defineConfig({
  plugins: [minecraftShim({ dimensions: ['overworld'], label: 'plugin default' })],
  test: {
    include: ['merge.test.ts'],
    setupFiles: ['./setup-consumer.ts'],
  },
  resolve: {
    alias: [
      { find: '@minecraft/server-ui', replacement: new URL('./stub-server-ui.js', import.meta.url).pathname },
      { find: '@consumer/marker', replacement: new URL('./consumer-marker.js', import.meta.url).pathname },
    ],
  },
})
