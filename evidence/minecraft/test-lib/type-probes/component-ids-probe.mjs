// Backs fact: component-ids-are-derivable-from-types.
// Reads the @minecraft/server 2.8.0 declarations and prints the id sets a type-level derivation
// yields: the EntityComponentTypeMap keys, the EntityComponentTypes enum values, and the
// attribute-shaped subset (map entries whose component class extends EntityAttributeComponent).
// The type-level derivation itself is component-ids-probe.ts, checked by `npm run check`.
// Run: node component-ids-probe.mjs > component-ids-probe.out.txt

import fs from 'node:fs'

const dts = fs.readFileSync(
  new URL('./node_modules/@minecraft/server/index.d.ts', import.meta.url),
  'utf8',
)

const block = (header) => {
  const start = dts.match(new RegExp(`^${header}[^\\n]*\\{`, 'm'))
  if (!start) throw new Error(`${header} not found`)
  const from = start.index + start[0].length
  return dts.slice(from, dts.indexOf('\n}', from))
}

// keyof EntityComponentTypeMap
const map = new Map()
for (const m of block('export type EntityComponentTypeMap =').matchAll(/^\s{4}('[^']+'|[\w:.]+):\s*(\w+);/gm))
  map.set(m[1].replace(/'/g, ''), m[2])
const keys = [...map.keys()]
console.log(`## keyof EntityComponentTypeMap (${keys.length})`)
console.log(keys.join(', '))
console.log('')

const prefixed = keys.filter((k) => k.startsWith('minecraft:'))
const bare = keys.filter((k) => !k.startsWith('minecraft:'))
console.log(`bare keys: ${bare.length}; "minecraft:"-prefixed keys: ${prefixed.length}`)
const unpaired = bare.filter((k) => !map.has(`minecraft:${k}`))
console.log(`bare keys with no prefixed twin: ${unpaired.length ? unpaired.join(', ') : 'none'}`)
console.log('')

// `${EntityComponentTypes}` — the canonical prefixed ids
const enumValues = [...block('export enum EntityComponentTypes =?').matchAll(/^\s{4}(\w+) = '([^']+)',/gm)].map(
  (m) => m[2],
)
console.log(`## EntityComponentTypes enum values (${enumValues.length})`)
console.log(enumValues.join(', '))
console.log(
  `all prefixed: ${enumValues.every((v) => v.startsWith('minecraft:'))}; ` +
    `every value is a type-map key: ${enumValues.every((v) => map.has(v))}`,
)
console.log('')

// Attribute-shaped subset: map values whose class extends EntityAttributeComponent.
const attributeClasses = new Set(
  [...dts.matchAll(/^export class (\w+) extends EntityAttributeComponent\b/gm)].map((m) => m[1]),
)
const attributeIds = keys.filter((k) => attributeClasses.has(map.get(k)))
console.log(`## Attribute-shaped ids (${attributeIds.length}) from ${attributeClasses.size} classes`)
console.log(attributeIds.join(', '))
