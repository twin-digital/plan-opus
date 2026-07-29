// The shape under test: one plugin the consumer lists, contributing both install entries from its
// `config` hook — the alias, and a setup file. `setupFiles` takes no arguments, so the plugin's
// options have to reach the setup module some other way; `setupEntry` and `optionsVia` select the
// candidate forms this probe measures.
import { fileURLToPath } from 'node:url'

const VIRTUAL_SETUP = 'virtual:probe-shim-setup'
const RESOLVED_SETUP = `\0${VIRTUAL_SETUP}`
const ABSOLUTE_SETUP = fileURLToPath(new URL('./setup.js', import.meta.url))

export const OPTIONS_ENV_KEY = 'PROBE_SHIM_OPTIONS'

/**
 * @param {{
 *   dimensions?: string[],
 *   label?: string,
 *   serverModule?: string,
 *   setupEntry?: 'virtual' | 'bare' | 'absolute',
 *   optionsVia?: 'env' | 'define',
 * }} options
 */
export const minecraftShim = (options = {}) => {
  const {
    dimensions = [],
    label = 'plugin-installed',
    serverModule = '@probe/fake-server',
    setupEntry = 'absolute',
    optionsVia = 'env',
  } = options
  const serverOptions = { dimensions, label, serverModule }
  const setupFile = {
    virtual: VIRTUAL_SETUP,
    bare: '@probe/shim/setup',
    'bare-unexported': '@probe/shim/setup.js',
    absolute: ABSOLUTE_SETUP,
  }[setupEntry]

  return {
    name: 'probe:minecraft-shim',
    config() {
      return {
        resolve: { alias: { '@minecraft/server': '@probe/shim' } },
        ...(optionsVia === 'define' ? { define: { __PROBE_SHIM_OPTIONS__: JSON.stringify(serverOptions) } } : {}),
        test: {
          setupFiles: [setupFile],
          ...(optionsVia === 'env' ? { env: { [OPTIONS_ENV_KEY]: JSON.stringify(serverOptions) } } : {}),
        },
      }
    },
    resolveId(id) {
      return id === VIRTUAL_SETUP ? RESOLVED_SETUP : undefined
    },
    load(id) {
      if (id !== RESOLVED_SETUP) {
        return undefined
      }
      return [
        `import { __useServer } from '@probe/shim/control'`,
        `import { createServer } from ${JSON.stringify(serverModule)}`,
        `const server = createServer(${JSON.stringify({ dimensions, label })})`,
        `globalThis.__probeServer = server`,
        `__useServer(server)`,
        `console.log('[virtual setup] installed ' + server.world.label)`,
      ].join('\n')
    },
  }
}

export default minecraftShim
