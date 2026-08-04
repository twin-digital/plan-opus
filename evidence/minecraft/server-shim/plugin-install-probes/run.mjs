// Runs one probe and writes its captured output, or all four with no argument.
//   node run.mjs             # every probe
//   node run.mjs vi-mock     # one of: vi-mock plugin options merge
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const here = new URL('.', import.meta.url).pathname.replace(/\/$/, '')

const pluginOptions = (options) => ({ PROBE_SHIM_PLUGIN_OPTIONS: JSON.stringify(options) })
const expect = (expected) => ({ PROBE_EXPECT: JSON.stringify(expected) })

/** Each probe is one captured output, made of one or more vitest invocations. */
const PROBES = {
  'vi-mock': [
    ['control: no alias, no mock', 'no-install.config.ts', {}],
    ['vi.mock in the test file, no alias', 'mock-in-test.config.ts', {}],
    ['vi.mock in a setup file, no alias, two test files', 'mock-in-setup.config.ts', {}],
  ],
  plugin: [['alias and setup file from the plugin only', 'plugin.config.ts', {}]],
  options: [
    [
      'setup file named by absolute path, options via test.env',
      'plugin.config.ts',
      { ...pluginOptions({ setupEntry: 'absolute', optionsVia: 'env' }), ...expect({ label: 'plugin default', dimensions: ['overworld'] }) },
    ],
    [
      'setup file named by a bare specifier the package exports',
      'plugin.config.ts',
      { ...pluginOptions({ setupEntry: 'bare' }), ...expect({ label: 'plugin default', dimensions: ['overworld'] }) },
    ],
    [
      'setup file named by a bare specifier the package does not export',
      'plugin.config.ts',
      { ...pluginOptions({ setupEntry: 'bare-unexported' }), ...expect({ label: 'plugin default', dimensions: ['overworld'] }) },
    ],
    [
      'setup file named by a virtual module id the plugin resolves',
      'plugin.config.ts',
      { ...pluginOptions({ setupEntry: 'virtual' }), ...expect({ label: 'plugin default', dimensions: ['overworld'] }) },
    ],
    [
      'options via define instead of test.env',
      'plugin.config.ts',
      { ...pluginOptions({ optionsVia: 'define' }), ...expect({ label: 'plugin default', dimensions: ['overworld'] }) },
    ],
    [
      'a second option set: an empty world',
      'plugin.config.ts',
      { ...pluginOptions({ dimensions: [], label: 'empty world' }), ...expect({ label: 'empty world', dimensions: [] }) },
    ],
    [
      'a consumer server factory chosen by option',
      'plugin.config.ts',
      {
        ...pluginOptions({ serverModule: `${here}/alt-server.js`, label: 'chosen factory' }),
        ...expect({ label: 'chosen factory (alt factory)', dimensions: ['overworld'] }),
      },
    ],
  ],
  merge: [
    ['a consumer with their own alias table and setup file', 'merge.config.ts', {}],
    ['the same consumer, alias table written in vite’s array form', 'merge-array.config.ts', {}],
  ],
  subpath: [
    [
      'no plugin: the consumer’s own alias, with setupFiles naming the shim’s published subpath',
      'subpath.config.ts',
      expect({ label: 'unlabelled', dimensions: [] }),
    ],
  ],
}

const scrub = (text) => text.replaceAll(here, '<probe>')

const runProbe = (name) => {
  let report = ''
  for (const [label, config, env] of PROBES[name]) {
    const result = spawnSync('npx', ['vitest', 'run', '-c', config, '--reporter=verbose', '--no-color'], {
      cwd: here,
      encoding: 'utf8',
      env: { ...process.env, CI: '1', ...env },
    })
    report += `=== ${name}: ${label} (${config}) ===\n`
    for (const [key, value] of Object.entries(env)) {
      report += `${key}=${value}\n`
    }
    report += `exit code: ${result.status}\n\n${scrub(`${result.stdout ?? ''}${result.stderr ?? ''}`)}\n`
  }
  writeFileSync(new URL(`./${name}.out.txt`, import.meta.url), report)
  process.stdout.write(report)
}

const requested = process.argv[2] ? [process.argv[2]] : Object.keys(PROBES)
for (const name of requested) {
  if (!PROBES[name]) {
    throw new Error(`unknown probe: ${name}`)
  }
  runProbe(name)
}
