#!/usr/bin/env node
// Enumerates the two uninstalled fixture workspaces under ./fixtures using the package
// managers' own published enumeration libraries, to see whether either needs an install,
// a lockfile, or the manager binary. Also records whether either manager's CLI is on PATH.
//
// Setup (outside this directory, so the fixtures stay uninstalled):
//   mkdir /tmp/enum && cd /tmp/enum && npm init -y
//   npm i @npmcli/map-workspaces @pnpm/workspace.find-packages
//   cp <this file> /tmp/enum/ && cd /tmp/enum && node probe.mjs <path-to-fixtures> > OUTPUT.txt

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const fixtures = path.resolve(process.argv[2] ?? './fixtures')

const show = (label, value) => console.log(`${label}: ${value}`)

console.log('=== environment')
for (const bin of ['npm', 'pnpm']) {
  try {
    show(`${bin} on PATH`, execFileSync(bin, ['--version'], { encoding: 'utf8' }).trim())
  } catch (err) {
    show(`${bin} on PATH`, `NO (${err.code ?? err.message})`)
  }
}
console.log('')

console.log('=== fixture state (no install has run in either)')
for (const ws of ['npm-ws', 'pnpm-ws']) {
  const root = path.join(fixtures, ws)
  show(`${ws} node_modules present`, existsSync(path.join(root, 'node_modules')))
  show(`${ws} package-lock.json present`, existsSync(path.join(root, 'package-lock.json')))
  show(`${ws} pnpm-lock.yaml present`, existsSync(path.join(root, 'pnpm-lock.yaml')))
}
console.log('')

console.log('=== npm workspace via @npmcli/map-workspaces')
{
  const root = path.join(fixtures, 'npm-ws')
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  const { default: mapWorkspaces } = await import('@npmcli/map-workspaces')
  try {
    const map = await mapWorkspaces({ cwd: root, pkg })
    for (const [name, dir] of [...map].sort()) {
      console.log(`  ${name} -> ${path.relative(root, dir) || '.'}`)
    }
  } catch (err) {
    console.log(`  THREW ${err.name}: ${err.message}`)
  }
}
console.log('')

console.log('=== pnpm workspace via @pnpm/workspace.find-packages')
{
  const root = path.join(fixtures, 'pnpm-ws')
  const { findWorkspacePackages } = await import('@pnpm/workspace.find-packages')
  const { readWorkspaceManifest } = await import('@pnpm/workspace.read-manifest')
  try {
    const manifest = await readWorkspaceManifest(root)
    show('  patterns read from pnpm-workspace.yaml', JSON.stringify(manifest?.packages))
    const projects = await findWorkspacePackages(root, { patterns: manifest?.packages })
    for (const p of projects) {
      const name = p.manifest?.name ?? '(unnamed)'
      console.log(`  ${name}@${p.manifest?.version ?? '?'} -> ${path.relative(root, p.rootDir ?? p.dir) || '.'}`)
    }
  } catch (err) {
    console.log(`  THREW ${err.name}: ${err.message}`)
  }
}
