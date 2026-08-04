#!/usr/bin/env node
// Emits stub/enums.generated.js from the installed @minecraft/server declarations. The package
// ships no runtime, so the shim's enum values have to be lifted out of index.d.ts.

import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const pkgPath = require.resolve('@minecraft/server/package.json')
const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version
const dtsPath = join(dirname(pkgPath), 'index.d.ts')
const dts = readFileSync(dtsPath, 'utf8').replace(/\r\n/g, '\n') // the shipped .d.ts is CRLF

const ENUM = /^export enum (\w+) \{\n([\s\S]*?)^\}/gm
// keys are bare identifiers, except reserved words, which the declarations quote (`'void'`)
const MEMBER = /^ {4}'?(\w+)'? = (.+?),?$/gm

const enums = []
for (const [, name, body] of dts.matchAll(ENUM)) {
  const members = [...body.matchAll(MEMBER)].map(([, key, value]) => [key, value.replace(/,$/, '')])
  if (members.length === 0) throw new Error(`no members parsed for enum ${name}`)
  enums.push([name, members])
}

const out = [`// GENERATED from the pinned @minecraft/server declarations for this validation harness.`]
for (const [name, members] of enums) {
  out.push(
    `export const ${name} = Object.freeze({\n` +
      members.map(([key, value]) => `  "${key}": ${value},\n`).join('') +
      `})\n`,
  )
}

const target = join(dirname(fileURLToPath(import.meta.url)), 'stub/enums.generated.js')
writeFileSync(target, out.join('\n'))

const memberCount = enums.reduce((n, [, members]) => n + members.length, 0)
const declared = dts.match(/^export enum /gm).length
console.log(`source: ${dtsPath.replace(/^.*\/alias-shim-harness\//, '<harness>/')}`)
console.log(`@minecraft/server version: ${version}`)
console.log(`export enum declarations in index.d.ts: ${declared}`)
console.log(`enums generated from the pinned declarations: ${enums.length}`)
console.log(`enum members generated: ${memberCount}`)
console.log(`wrote: stub/enums.generated.js`)
