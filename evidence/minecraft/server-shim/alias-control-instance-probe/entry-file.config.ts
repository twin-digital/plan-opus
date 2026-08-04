import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Shape B: alias the bare specifier at the shim's resolved entry *file* — the spec's fallback.
const entryFile = fileURLToPath(import.meta.resolve('@twin-digital/minecraft-server-shim'))

export default defineConfig({
  test: { include: ['*.test.ts'] },
  resolve: {
    alias: { '@minecraft/server': entryFile },
  },
})
