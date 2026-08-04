// Probes 2 and 3: the consumer's whole install is one plugin. No `resolve.alias` for
// `@minecraft/server` and no `setupFiles` of the consumer's own — both come from the plugin's
// `config` hook. The `@minecraft/server-ui` alias is the pack's second engine module, which the
// shim does not cover. Everything the plugin is given comes from the environment so that one
// config serves every variant `run.mjs` invokes.
import { defineConfig } from 'vitest/config'

import { minecraftShim } from '@probe/shim/vite'

const options = JSON.parse(process.env.PROBE_SHIM_PLUGIN_OPTIONS ?? '{}')

export default defineConfig({
  plugins: [
    minecraftShim({
      dimensions: ['overworld'],
      label: 'plugin default',
      ...options,
    }),
  ],
  test: { include: ['plugin.test.ts'] },
  resolve: {
    alias: { '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname },
  },
})
