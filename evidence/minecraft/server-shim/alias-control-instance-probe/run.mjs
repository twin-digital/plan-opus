// Runs the same suite under both alias shapes, against both install shapes, and writes the
// combined output to probe.out.txt.
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const here = new URL('.', import.meta.url).pathname.replace(/\/$/, '')
const installed = join(here, 'node_modules', '@twin-digital', 'minecraft-server-shim')

const run = (cmd, args, cwd = here) =>
  spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, CI: '1' } })

/** `npm i file:./shim` shape: node_modules holds a symlink to the source directory. */
const installSymlink = () => {
  rmSync(installed, { recursive: true, force: true })
  symlinkSync('../../shim', installed)
}

/** Published shape: node_modules holds a real directory unpacked from the tarball. */
const installTarball = () => {
  mkdirSync(join(here, 'node_modules', '.probe-pack'), { recursive: true })
  const packed = run('npm', ['pack', './shim', '--pack-destination', 'node_modules/.probe-pack'])
  const tarball = packed.stdout.trim().split('\n').pop()
  rmSync(installed, { recursive: true, force: true })
  mkdirSync(installed, { recursive: true })
  run('tar', ['-xzf', join('node_modules/.probe-pack', tarball), '-C', installed, '--strip-components=1'])
}

const installs = [
  ['file: dependency (symlink)', installSymlink],
  ['unpacked tarball (real directory)', installTarball],
]

const shapes = [
  ['bare specifier', 'bare-specifier.config.ts'],
  ['resolved entry file', 'entry-file.config.ts'],
]

let report = ''
for (const [installLabel, install] of installs) {
  install()
  for (const [label, config] of shapes) {
    const result = run('npx', ['vitest', 'run', '-c', config, '--reporter=verbose', '--no-color'])
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replaceAll(here, '<probe>')
    report += `=== install: ${installLabel} | alias shape: ${label} (${config}) ===\n`
    report += `exit code: ${result.status}\n\n${output}\n`
  }
}

installSymlink()
rmSync(join(here, 'node_modules', '.probe-pack'), { recursive: true, force: true })

writeFileSync(new URL('./probe.out.txt', import.meta.url), report)
process.stdout.write(report)
