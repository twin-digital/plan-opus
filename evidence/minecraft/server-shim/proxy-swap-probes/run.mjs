// Runs one probe and writes its captured output, or both with no argument.
//   node run.mjs         # every probe
//   node run.mjs swap    # one of: swap shape
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const here = new URL('.', import.meta.url).pathname.replace(/\/$/, '')
const testLib = process.env.MC_TEST_LIB ?? ''

/** Each probe is one captured output, made of one or more vitest invocations. */
const PROBES = {
  swap: [
    ['A — the naive swap: one stable Proxy per binding', 'swap-shallow.config.ts'],
    ['B — recursive proxying, one stable Proxy per path', 'swap-deep.config.ts'],
    ['C — the shim owns the subscriber set, with trampolines and a scheduler journal', 'swap-signal.config.ts'],
    ['D — journal every call made before the first swap and replay it', 'swap-replay.config.ts'],
  ],
  capture: [
    ['C — a pack that keeps what the engine gave it', 'capture-signal.config.ts'],
    ['D — the same pack, journal and replay', 'capture-replay.config.ts'],
  ],
  beneath: [['the other layer: the bindings never move, the state under them is replaced', 'beneath.config.ts']],
  shape: [['what the fake’s own shape reveals about which members register', 'shape.config.ts']],
}

const scrub = (text) =>
  text.replaceAll(here, '<probe>').replaceAll(testLib ? testLib.replace(/\/index\.ts$/, '') : ' ', '<test-lib>')

const runProbe = (name) => {
  let report = ''
  for (const [label, config] of PROBES[name]) {
    const result = spawnSync('npx', ['vitest', 'run', '-c', config, '--reporter=verbose', '--no-color'], {
      cwd: here,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    })
    report += `=== ${name}: ${label} (${config}) ===\n`
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
