#!/usr/bin/env node
// Asks what each manager's enumeration library returns for the root package itself, and what
// @npmcli/map-workspaces does for a root that declares no `workspaces` array (or an empty one).
//
// Setup (outside this directory, so the fixtures stay uninstalled):
//   mkdir /tmp/rootcand && cd /tmp/rootcand && npm init -y
//   npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
//   cp <this file> /tmp/rootcand/ && node probe.mjs <path-to-fixtures> > OUTPUT.txt

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const fixtures = path.resolve(process.argv[2] ?? './fixtures')

const { default: mapWorkspaces } = await import('@npmcli/map-workspaces')
const { findWorkspacePackages } = await import('@pnpm/workspace.find-packages')
const { readWorkspaceManifest } = await import('@pnpm/workspace.read-manifest')

console.log('=== versions')
for (const p of ['@npmcli/map-workspaces', '@pnpm/workspace.find-packages', '@pnpm/workspace.read-manifest']) {
  const meta = JSON.parse(readFileSync(path.join('node_modules', p, 'package.json'), 'utf8'))
  console.log(`  ${p}@${meta.version}`)
}
console.log(`  node ${process.version}`)
console.log('')

console.log('=== fixture state (no install has run in any)')
for (const ws of ['npm-no-workspaces', 'npm-empty-workspaces', 'npm-with-workspaces', 'pnpm-no-packages-field']) {
  console.log(`  ${ws} node_modules present: ${existsSync(path.join(fixtures, ws, 'node_modules'))}`)
}
console.log('')

for (const ws of ['npm-no-workspaces', 'npm-empty-workspaces', 'npm-with-workspaces']) {
  const root = path.join(fixtures, ws)
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  console.log(`=== ${ws} via @npmcli/map-workspaces`)
  console.log(`  root package.json workspaces: ${JSON.stringify(pkg.workspaces)}`)
  try {
    const map = await mapWorkspaces({ cwd: root, pkg })
    console.log(`  RETURNED ${map.size} entr${map.size === 1 ? 'y' : 'ies'}${map.size ? '' : ' (empty Map, no throw)'}`)
    for (const [name, dir] of [...map].sort()) {
      console.log(`    ${name} -> ${path.relative(root, dir) || '.'}`)
    }
  } catch (err) {
    console.log(`  THREW ${err.constructor.name} name=${err.name} code=${err.code}`)
    console.log(`    ${err.message}`)
  }
  console.log('')
}

{
  const root = path.join(fixtures, 'pnpm-no-packages-field')
  console.log('=== pnpm-no-packages-field via @pnpm/workspace.find-packages')
  try {
    const manifest = await readWorkspaceManifest(root)
    console.log(`  patterns read from pnpm-workspace.yaml: ${JSON.stringify(manifest?.packages)}`)
    const projects = await findWorkspacePackages(root, { patterns: manifest?.packages })
    console.log(`  RETURNED ${projects.length}`)
    for (const p of projects) {
      const name = p.manifest?.name ?? '(unnamed)'
      console.log(`    ${name}@${p.manifest?.version ?? '?'} -> ${path.relative(root, p.rootDir ?? p.dir) || '.'}`)
    }
  } catch (err) {
    console.log(`  THREW ${err.constructor.name} name=${err.name} code=${err.code}`)
    console.log(`    ${err.message}`)
  }
}
