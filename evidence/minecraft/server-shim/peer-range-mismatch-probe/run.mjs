// Installs a consumer pinning @minecraft/server ^1.17.0 alongside a package that peer-declares
// ^2.8.0, under each available manager, each peerDependenciesMeta variant, and each install shape,
// and writes the captured output to peer-range-mismatch.out.txt.
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const here = new URL('.', import.meta.url).pathname.replace(/\/$/, '')
const work = join(here, 'work')

const run = (cmd, args, cwd) =>
  spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
  })

const version = (cmd) => {
  const result = run(cmd, ['--version'], here)
  return result.status === 0 ? result.stdout.trim().split('\n').pop() : null
}

const managers = [
  { id: 'npm', install: ['npm', ['install']] },
  { id: 'pnpm', install: ['pnpm', ['install']] },
  { id: 'yarn', install: ['yarn', ['install']] },
]

const variants = [
  { id: 'plain peer', slug: 'plain', optional: false },
  { id: 'peerDependenciesMeta.optional', slug: 'optional', optional: true },
]

/** How the shim reaches node_modules: a source directory, or the tarball a publish would produce. */
const shapes = [
  { id: 'file: directory', slug: 'dir', spec: () => 'file:../shim' },
  {
    id: 'packed tarball',
    slug: 'tgz',
    spec: (caseDir) => {
      const packed = run('npm', ['pack', './shim', '--pack-destination', '.'], caseDir)
      return `file:../${packed.stdout.trim().split('\n').pop()}`
    },
  },
]

let report = `node ${process.version}\n`
for (const manager of managers) {
  manager.version = version(manager.id)
  report += `${manager.id} ${manager.version ?? '— NOT INSTALLED IN THIS ENVIRONMENT'}\n`
}
report += '\n'

const scrub = (text) => text.replaceAll(work, '<work>').replaceAll(here, '<probe>')

rmSync(work, { recursive: true, force: true })

for (const manager of managers) {
  for (const shape of shapes) {
    for (const variant of variants) {
      const label = `=== ${manager.id} ${manager.version ?? '(absent)'} | ${shape.id} | ${variant.id} ===\n`
      if (!manager.version) {
        report += `${label}skipped: ${manager.id} is not installed in this environment\n\n`
        continue
      }

      const caseDir = join(work, `${manager.id}-${shape.slug}-${variant.slug}`)
      mkdirSync(caseDir, { recursive: true })
      cpSync(join(here, 'shim'), join(caseDir, 'shim'), { recursive: true })
      cpSync(join(here, 'consumer'), join(caseDir, 'consumer'), { recursive: true })

      const shimManifest = join(caseDir, 'shim', 'package.json')
      const manifest = JSON.parse(readFileSync(shimManifest, 'utf8'))
      // Unique per case so no manager's content cache carries one case's manifest into another.
      manifest.version = `0.1.0-${manager.id}-${shape.slug}-${variant.slug}`
      if (variant.optional) {
        manifest.peerDependenciesMeta = { '@minecraft/server': { optional: true } }
      }
      writeFileSync(shimManifest, `${JSON.stringify(manifest, null, 2)}\n`)

      const consumer = join(caseDir, 'consumer')
      const consumerManifest = join(consumer, 'package.json')
      const consumerJson = JSON.parse(readFileSync(consumerManifest, 'utf8'))
      consumerJson.dependencies['@twin-digital/peer-probe-shim'] = shape.spec(caseDir)
      writeFileSync(consumerManifest, `${JSON.stringify(consumerJson, null, 2)}\n`)

      const install = run(manager.install[0], manager.install[1], consumer)
      const check = run('node', ['run-time-check.mjs'], consumer)

      report += label
      report += `shim spec: ${consumerJson.dependencies['@twin-digital/peer-probe-shim']}\n`
      report += `shim peerDependenciesMeta: ${JSON.stringify(manifest.peerDependenciesMeta ?? null)}\n`
      report += `install exit code: ${install.status}\n`
      report += `--- install output ---\n${scrub(`${install.stdout ?? ''}${install.stderr ?? ''}`)}\n`
      if (manager.id === 'pnpm') {
        const peers = run('pnpm', ['peers', 'check'], consumer)
        report += `--- pnpm peers check (exit ${peers.status}) ---\n`
        report += `${scrub(`${peers.stdout ?? ''}${peers.stderr ?? ''}`)}\n`
      }
      report += `--- after install ---\n${scrub(`${check.stdout ?? ''}${check.stderr ?? ''}`)}\n\n`
    }
  }
}

rmSync(work, { recursive: true, force: true })

writeFileSync(new URL('./peer-range-mismatch.out.txt', import.meta.url), report)
process.stdout.write(report)
