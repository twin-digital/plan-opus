#!/usr/bin/env node
// Asks whether each manager's enumeration library excludes packages under a `node_modules` path —
// the case pnpm-default-patterns-probe's fixtures could not answer, because none of them held a
// node_modules directory. Each fixture holds a hand-authored node_modules with a plain and a
// scoped package inside it, plus packages/alpha outside it as a control: a sweep that returns
// nothing at all is then distinguishable from one that correctly skipped node_modules.
//
// Setup (outside this directory, so the fixtures stay uninstalled):
//   mkdir /tmp/nmprobe && cd /tmp/nmprobe && npm init -y
//   npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
//   cp <this file> /tmp/nmprobe/ && node probe.mjs <path-to-fixtures> > OUTPUT.txt

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const fixtures = path.resolve(process.argv[2] ?? './fixtures')

const { default: mapWorkspaces } = await import('@npmcli/map-workspaces')
const { findWorkspacePackages } = await import('@pnpm/workspace.find-packages')
const { readWorkspaceManifest } = await import('@pnpm/workspace.read-manifest')

const PNPM = ['pnpm-no-packages-field-with-node-modules', 'pnpm-explicit-double-star-with-node-modules']
const NPM = ['npm-explicit-double-star-with-node-modules']

console.log('=== versions')
for (const p of [
  '@npmcli/map-workspaces',
  '@pnpm/workspace.find-packages',
  '@pnpm/workspace.read-manifest',
]) {
  const meta = JSON.parse(readFileSync(path.join('node_modules', p, 'package.json'), 'utf8'))
  console.log(`  ${p}@${meta.version}`)
}
console.log(`  node ${process.version}`)
console.log('')

console.log('=== fixture state (no install has run in any; the node_modules trees are committed fixture content)')
for (const ws of [...PNPM, ...NPM]) {
  const at = (rel) => existsSync(path.join(fixtures, ws, rel))
  console.log(`  ${ws} lockfile present: ${at('pnpm-lock.yaml') || at('package-lock.json')}`)
  console.log(`  ${ws} node_modules/.package-lock.json present: ${at('node_modules/.package-lock.json')}`)
  console.log(`  ${ws} node_modules/.modules.yaml present: ${at('node_modules/.modules.yaml')}`)
  console.log(`  ${ws} fixture packages: packages/alpha, node_modules/plain-dep, node_modules/@scope/scoped-dep`)
}
console.log('')

for (const ws of PNPM) {
  const root = path.join(fixtures, ws)
  console.log(`=== ${ws} via @pnpm/workspace.find-packages`)
  const manifest = await readWorkspaceManifest(root)
  console.log(`  patterns read from pnpm-workspace.yaml: ${JSON.stringify(manifest?.packages)}`)
  const projects = await findWorkspacePackages(root, { patterns: manifest?.packages })
  console.log(`  RETURNED ${projects.length}`)
  for (const p of projects) {
    console.log(
      `    ${p.manifest?.name ?? '(unnamed)'}@${p.manifest?.version ?? '?'} -> ${path.relative(root, p.rootDir) || '.'}`,
    )
  }
  const under = projects.filter((p) => path.relative(root, p.rootDir).split(path.sep).includes('node_modules'))
  console.log(`  under a node_modules path: ${under.length}`)
  console.log('')
}

for (const ws of NPM) {
  const root = path.join(fixtures, ws)
  console.log(`=== ${ws} via @npmcli/map-workspaces`)
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  console.log(`  root package.json workspaces: ${JSON.stringify(pkg.workspaces)}`)
  const map = await mapWorkspaces({ cwd: root, pkg })
  console.log(`  RETURNED ${map.size} entries${map.size ? '' : ' (empty Map, no throw)'}`)
  const dirs = [...map].map(([name, dir]) => [name, path.relative(root, dir) || '.']).sort()
  for (const [name, rel] of dirs) console.log(`    ${name} -> ${rel}`)
  console.log(`  under a node_modules path: ${dirs.filter(([, rel]) => rel.split(path.sep).includes('node_modules')).length}`)
  console.log('')
}
