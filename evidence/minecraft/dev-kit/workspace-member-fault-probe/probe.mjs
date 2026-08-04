#!/usr/bin/env node
// Runs each manager's own enumeration library against fixture workspaces whose patterns match a
// faulty member directory — one holding an invalid-JSON package.json, one holding no package.json
// at all — to see whether the library skips that directory or throws.
//
// Setup (outside this directory, so the fixtures stay uninstalled):
//   mkdir /tmp/enum && cd /tmp/enum && npm init -y
//   npm i @npmcli/map-workspaces @pnpm/workspace.find-packages @pnpm/workspace.read-manifest
//   cp <this file> /tmp/enum/ && cd /tmp/enum && node probe.mjs <path-to-fixtures> > OUTPUT.txt

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const fixtures = path.resolve(process.argv[2] ?? './fixtures')

const { default: mapWorkspaces } = await import('@npmcli/map-workspaces')
const { findWorkspacePackages } = await import('@pnpm/workspace.find-packages')
const { readWorkspaceManifest } = await import('@pnpm/workspace.read-manifest')

const report = (err) => {
  console.log(`  THREW ${err.constructor.name} name=${err.name} code=${err.code ?? '(none)'}`)
  for (const line of String(err.message).split('\n')) console.log(`    ${line}`)
}

const enumerateNpm = async (root) => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  const map = await mapWorkspaces({ cwd: root, pkg })
  for (const [name, dir] of [...map].sort()) {
    console.log(`  RETURNED ${name} -> ${path.relative(root, dir) || '.'}`)
  }
}

const enumeratePnpm = async (root) => {
  const manifest = await readWorkspaceManifest(root)
  const projects = await findWorkspacePackages(root, { patterns: manifest?.packages })
  for (const p of projects) {
    const name = p.manifest?.name ?? '(unnamed)'
    console.log(`  RETURNED ${name}@${p.manifest?.version ?? '?'} -> ${path.relative(root, p.rootDir ?? p.dir) || '.'}`)
  }
}

const cases = [
  ['npm-malformed', '@npmcli/map-workspaces', 'packages/broken holds invalid JSON', enumerateNpm],
  ['npm-missing', '@npmcli/map-workspaces', 'packages/nomanifest holds no package.json', enumerateNpm],
  ['pnpm-malformed', '@pnpm/workspace.find-packages', 'packages/broken holds invalid JSON', enumeratePnpm],
  ['pnpm-missing', '@pnpm/workspace.find-packages', 'packages/nomanifest holds no package.json', enumeratePnpm],
]

console.log('=== fixture state (no install has run in any of them)')
for (const [ws] of cases) {
  const root = path.join(fixtures, ws)
  const marks = ['node_modules', 'package-lock.json', 'pnpm-lock.yaml']
    .map((f) => `${f}=${existsSync(path.join(root, f))}`)
    .join(' ')
  console.log(`${ws}: ${marks}`)
}
console.log('')

for (const [ws, lib, fault, enumerate] of cases) {
  console.log(`=== ${ws} via ${lib}`)
  console.log(`  fault: ${fault}`)
  try {
    await enumerate(path.join(fixtures, ws))
  } catch (err) {
    report(err)
  }
  console.log('')
}
