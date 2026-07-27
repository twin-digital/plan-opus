#!/usr/bin/env node
// Asks what each manager's enumeration library returns when it is handed no patterns at all AND
// the workspace holds nested packages — the case workspace-root-candidate-probe's fixtures could
// not distinguish, because neither of its no-patterns fixtures held a nested package.
//
// Setup (outside this directory, so the fixtures stay uninstalled):
//   mkdir /tmp/defaults && cd /tmp/defaults && npm init -y
//   npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
//   cp <this file> /tmp/defaults/ && node probe.mjs <path-to-fixtures> > OUTPUT.txt

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const fixtures = path.resolve(process.argv[2] ?? './fixtures')

const { default: mapWorkspaces } = await import('@npmcli/map-workspaces')
const { findWorkspacePackages } = await import('@pnpm/workspace.find-packages')
const { readWorkspaceManifest } = await import('@pnpm/workspace.read-manifest')

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

console.log('=== fixture state (no install has run in either)')
for (const ws of ['pnpm-no-packages-field-with-members', 'npm-no-workspaces-with-members']) {
  console.log(`  ${ws} node_modules present: ${existsSync(path.join(fixtures, ws, 'node_modules'))}`)
  console.log(
    `  ${ws} lockfile present: ${
      existsSync(path.join(fixtures, ws, 'pnpm-lock.yaml')) ||
      existsSync(path.join(fixtures, ws, 'package-lock.json'))
    }`,
  )
}
console.log('')

{
  const root = path.join(fixtures, 'pnpm-no-packages-field-with-members')
  console.log('=== pnpm-no-packages-field-with-members via @pnpm/workspace.find-packages')
  console.log('  fixture holds: the root, packages/alpha, and tooling/nested/beta')
  const manifest = await readWorkspaceManifest(root)
  console.log(`  patterns read from pnpm-workspace.yaml: ${JSON.stringify(manifest?.packages)}`)
  const projects = await findWorkspacePackages(root, { patterns: manifest?.packages })
  console.log(`  RETURNED ${projects.length}`)
  for (const p of projects) {
    console.log(
      `    ${p.manifest?.name ?? '(unnamed)'}@${p.manifest?.version ?? '?'} -> ${path.relative(root, p.rootDir) || '.'}`,
    )
  }
}
console.log('')

{
  const root = path.join(fixtures, 'npm-no-workspaces-with-members')
  console.log('=== npm-no-workspaces-with-members via @npmcli/map-workspaces')
  console.log('  fixture holds: the root and packages/alpha')
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  console.log(`  root package.json workspaces: ${JSON.stringify(pkg.workspaces)}`)
  const map = await mapWorkspaces({ cwd: root, pkg })
  console.log(`  RETURNED ${map.size} entries${map.size ? '' : ' (empty Map, no throw)'}`)
  for (const [name, dir] of [...map].sort()) {
    console.log(`    ${name} -> ${path.relative(root, dir) || '.'}`)
  }
}
