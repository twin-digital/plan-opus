// Backs fact: vanilla-data-provides-prefixed-id-constants.
// Probes the installed @minecraft/vanilla-data package: what it ships, whether it has runtime
// JavaScript, what it exports, and whether the id constant values carry the `minecraft:` prefix.
// Run: node vanilla-data-probe.mjs > vanilla-data-probe.out.txt

import fs from 'node:fs'
import path from 'node:path'

const root = path.join(import.meta.dirname, 'node_modules/@minecraft/vanilla-data')

const walk = (dir, prefix = '') =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(path.join(dir, e.name), `${prefix}${e.name}/`)
      : [{ name: prefix + e.name, bytes: fs.statSync(path.join(dir, e.name)).size }],
  )

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
console.log('## @minecraft/vanilla-data package')
console.log(`version: ${pkg.version}`)
for (const key of ['main', 'module', 'types', 'exports']) console.log(`${key}: ${JSON.stringify(pkg[key])}`)
console.log('files shipped:')
for (const f of walk(root)) console.log(`  ${f.name} (${f.bytes} bytes)`)
console.log('')

const mod = await import('@minecraft/vanilla-data')
const exports = Object.keys(mod).sort()
console.log(`## Runtime exports (${exports.length})`)
console.log(exports.join(', '))
console.log('')

console.log('## Constant value shapes')
for (const name of exports) {
  const value = mod[name]
  if (!value || typeof value !== 'object') {
    console.log(`${name}: typeof ${typeof value} (not an object of constants)`)
    continue
  }
  const entries = Object.entries(value)
  const strings = entries.filter(([, v]) => typeof v === 'string')
  const prefixed = strings.filter(([, v]) => v.startsWith('minecraft:'))
  const unprefixedSample = strings.filter(([, v]) => !v.startsWith('minecraft:')).slice(0, 5)
  console.log(
    `${name}: ${entries.length} members, ${strings.length} string-valued, ` +
      `${prefixed.length} start with "minecraft:"` +
      (unprefixedSample.length
        ? `; unprefixed samples: ${unprefixedSample.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')}`
        : ''),
  )
}
console.log('')

console.log('## Spot-checked members')
for (const [ns, member] of [
  ['MinecraftEffectTypes', 'Resistance'],
  ['MinecraftEntityTypes', 'Villager'],
  ['MinecraftEntityTypes', 'Sheep'],
  ['MinecraftBlockTypes', 'Stone'],
  ['MinecraftItemTypes', 'Apple'],
]) {
  const value = mod[ns]?.[member]
  console.log(`${ns}.${member} = ${JSON.stringify(value)}`)
}
