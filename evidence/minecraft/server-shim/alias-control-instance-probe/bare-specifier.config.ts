import { defineConfig } from 'vitest/config'

// Shape A: alias the bare specifier at the shim's bare package name — the spec's proposed recipe.
export default defineConfig({
  test: { include: ['*.test.ts'] },
  resolve: {
    alias: { '@minecraft/server': '@twin-digital/minecraft-server-shim' },
  },
})
