// Enumerates what @minecraft/server exposes outside an instance: module-level exported constants,
// and static members on exported classes. Neither is reachable by passing a fake object in, so the
// counts here bound what object substitution can and cannot cover.
//
// Run: node module-surface-probe.mjs > module-surface-probe.out.txt
import fs from 'node:fs'

const DTS = 'node_modules/@minecraft/server/index.d.ts'
const src = fs.readFileSync(DTS, 'utf8')
// The declarations ship CRLF; `.` does not match \r, so anchored patterns need it gone.
const lines = src.split(/\r?\n/)

const out = (s = '') => process.stdout.write(s + '\n')

// ---- module-level exported constants -------------------------------------------------------
const consts = []
for (const line of lines) {
  const m = line.match(/^export const (\w+)\s*:\s*([^;=]+)[;=]/) ?? line.match(/^export const (\w+) = (.+);/)
  if (m) consts.push({ name: m[1], type: m[2].trim() })
}

out('## Module-level exported constants')
out()
for (const c of consts) out(`  ${c.name}: ${c.type}`)
out()
const singletons = consts.filter((c) => /^[A-Z]/.test(c.type) && !/^\d/.test(c.type))
out(`total=${consts.length} singleton-instances=${singletons.length} ` + `numeric-constants=${consts.length - singletons.length}`)
out(`singletons=[${singletons.map((c) => c.name).join(', ')}]`)

// ---- static members on exported classes ----------------------------------------------------
let cls = null
const statics = []
for (const line of lines) {
  const c = line.match(/^export class (\w+)/)
  if (c) cls = c[1]
  const s = line.match(/^ {4}static (.+)$/)
  if (s && cls) statics.push({ cls, decl: s[1].replace(/\(.*$/, '(…)').replace(/;$/, '') })
}

const componentIds = statics.filter((s) => /^readonly componentId/.test(s.decl))
const rest = statics.filter((s) => !/^readonly componentId/.test(s.decl))

out()
out('## Static members on exported classes')
out()
out(`total=${statics.length}`)
out(`  static readonly componentId  = ${componentIds.length} (one per component class)`)
out(`  everything else              = ${rest.length}`)
out()

const byClass = {}
for (const s of rest) (byClass[s.cls] ??= []).push(s.decl)
out('### The non-componentId statics, by class')
out()
for (const k of Object.keys(byClass).sort()) {
  out(`  ${k} (${byClass[k].length})`)
  for (const d of byClass[k].sort()) out(`      static ${d}`)
}

const lookups = Object.keys(byClass).filter((k) => byClass[k].some((d) => /^get\(|^getAll\(/.test(d)))
out()
out(`classes carrying componentId: ${componentIds.length}`)
out(`classes with get/getAll lookup pairs: ${lookups.length} [${lookups.join(', ')}]`)
out(`@minecraft/server version: ${JSON.parse(fs.readFileSync('node_modules/@minecraft/server/package.json', 'utf8')).version}`)
