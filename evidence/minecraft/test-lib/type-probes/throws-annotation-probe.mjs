// Backs fact: invalidation-throws-are-mechanically-derivable.
// For each faked class, splits the declared members into those whose TSDoc names
// InvalidEntityError and those without, testing whether the invalidation guard list can be
// derived mechanically rather than hand-curated.
// Run: node throws-annotation-probe.mjs > throws-annotation-probe.out.txt

import fs from 'node:fs'

const dts = fs.readFileSync(
  new URL('./node_modules/@minecraft/server/index.d.ts', import.meta.url),
  'utf8',
)

const classBody = (name) => {
  const start = dts.match(new RegExp(`^export class ${name}[^\\n]*\\{`, 'm'))
  if (!start) throw new Error(`class ${name} not found`)
  const from = start.index + start[0].length
  const end = dts.indexOf('\n}', from)
  return dts.slice(from, end)
}

// Pair each doc comment with the member signature that follows it.
const members = (body) => {
  const out = []
  const re = /\/\*\*([\s\S]*?)\*\/\s*\n\s*(?:readonly\s+)?(\w+)/g
  for (let m; (m = re.exec(body)); ) out.push({ name: m[2], doc: m[1] })
  return out
}

for (const cls of ['Entity', 'EntityComponent', 'EntityHealthComponent', 'EntityAttributeComponent', 'Component']) {
  const ms = members(classBody(cls))
  const invalid = ms.filter((m) => m.doc.includes('InvalidEntityError')).map((m) => m.name)
  const other = ms.filter((m) => !m.doc.includes('InvalidEntityError'))
  const otherThrows = other.filter((m) => m.doc.includes('@throws')).map((m) => m.name)
  const noThrows = other.filter((m) => !m.doc.includes('@throws')).map((m) => m.name)
  console.log(`## ${cls}`)
  console.log(`InvalidEntityError in TSDoc (${invalid.length}): ${invalid.join(', ')}`)
  console.log(`@throws without InvalidEntityError (${otherThrows.length}): ${otherThrows.join(', ')}`)
  console.log(`no @throws (${noThrows.length}): ${noThrows.join(', ')}`)
  console.log('')
}
