// The alias table every config in this probe shares. `MC_TEST_LIB` points at the unpublished
// library's `src/index.ts` in an opus checkout; the two `internal-*` aliases reach the private
// modules `internals.ts` reads, the way `clean-test-file-probes` reaches them.
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const aliasesFor = (shim) => {
  const testLib = process.env.MC_TEST_LIB
  if (!testLib || !existsSync(testLib)) {
    throw new Error('set MC_TEST_LIB to nodejs/minecraft/test-lib/src/index.ts in an opus checkout')
  }
  const libSrc = dirname(testLib)
  return {
    '@minecraft/server': `@probe/shim-${shim}`,
    '@probe/shim-control': `@probe/shim-${shim}/control`,
    '@twin-digital/minecraft-test-lib/internal-state': join(libSrc, 'runtime/state.ts'),
    '@twin-digital/minecraft-test-lib/internal-member': join(libSrc, 'runtime/member.ts'),
    '@twin-digital/minecraft-test-lib': testLib,
    '@minecraft/server-ui': new URL('./stub-server-ui.js', import.meta.url).pathname,
  }
}
