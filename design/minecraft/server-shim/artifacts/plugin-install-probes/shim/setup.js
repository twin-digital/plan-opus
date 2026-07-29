// The real setup module the plugin points `setupFiles` at. It takes no arguments, so it reads the
// plugin's options out of the channel the plugin chose: `test.env`, or a `define` replacement.
import { __useServer } from './control.js'

const defined = typeof __PROBE_SHIM_OPTIONS__ === 'undefined' ? undefined : __PROBE_SHIM_OPTIONS__
const options = defined ?? JSON.parse(process.env.PROBE_SHIM_OPTIONS ?? '{}')
const { serverModule = '@probe/fake-server', ...serverOptions } = options

const { createServer } = await import(serverModule)
const server = createServer(serverOptions)
globalThis.__probeServer = server
;(globalThis.__setupOrder ??= []).push('plugin')
__useServer(server)

console.log(
  `[shim setup] via=${defined ? 'define' : 'env'} label=${server.world.label} dimensions=${JSON.stringify(serverOptions.dimensions ?? [])} factory=${serverModule}`,
)
