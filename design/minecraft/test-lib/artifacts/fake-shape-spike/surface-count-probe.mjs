// Counts the declared member surface a fake would have to hand-write, per faked class and in
// total, using the TypeScript checker over @minecraft/server 2.8.0 rather than a text scan.
// Backs the breadth numbers in the fake-shape spike.
// Run: node surface-count-probe.mjs > surface-count-probe.out.txt

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const dtsPath = path.resolve('node_modules/@minecraft/server/index.d.ts')
const program = ts.createProgram([dtsPath], {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.Node16,
  moduleResolution: ts.ModuleResolutionKind.Node16,
  noEmit: true,
  types: [],
})
const checker = program.getTypeChecker()
const source = program.getSourceFile(dtsPath)
const moduleSymbol = checker.getSymbolAtLocation(source)
const exports_ = checker.getExportsOfModule(moduleSymbol)

const classes = new Map()
for (const sym of exports_) {
  const decl = sym.declarations?.find(ts.isClassDeclaration)
  if (decl) classes.set(sym.name, { sym, decl })
}

// Instance-side member split, inherited members included: what `keyof T` demands of a fake.
const surfaceOf = (name) => {
  const entry = classes.get(name)
  if (!entry) return null
  const type = checker.getDeclaredTypeOfSymbol(entry.sym)
  const props = checker.getPropertiesOfType(type)
  const methods = []
  const accessors = []
  for (const p of props) {
    const t = checker.getTypeOfSymbolAtLocation(p, entry.decl)
    if (t.getCallSignatures().length > 0) methods.push(p.name)
    else accessors.push(p.name)
  }
  return { name, methods: methods.sort(), properties: accessors.sort() }
}

const hasPrivateCtor = (name) =>
  classes
    .get(name)
    ?.decl.members.some(
      (m) =>
        ts.isConstructorDeclaration(m) &&
        m.modifiers?.some((x) => x.kind === ts.SyntaxKind.PrivateKeyword),
    ) ?? false

const isAbstract = (name) =>
  classes.get(name)?.decl.modifiers?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword) ?? false

const heritage = (name) => {
  const d = classes.get(name)?.decl
  const ext = d?.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword)
  return ext ? ext.types[0].getText() : null
}

// Signal classes: the property types of the three event-signal container classes.
const signalClassesOf = (containerName) => {
  const entry = classes.get(containerName)
  if (!entry) return []
  const type = checker.getDeclaredTypeOfSymbol(entry.sym)
  return checker
    .getPropertiesOfType(type)
    .map((p) => checker.typeToString(checker.getTypeOfSymbolAtLocation(p, entry.decl)))
    .filter((n) => classes.has(n))
}

const componentClasses = [...classes.keys()].filter(
  (n) => /^Entity.*Component$/.test(n) && n !== 'EntityComponent' && n !== 'EntityAttributeComponent',
)
const afterSignals = [...new Set(signalClassesOf('WorldAfterEvents'))]
const beforeSignals = [...new Set(signalClassesOf('WorldBeforeEvents'))]
const systemSignals = [...new Set(signalClassesOf('SystemAfterEvents'))]

const registries = [
  'BiomeTypes',
  'BlockStates',
  'BlockTypes',
  'DimensionTypes',
  'EffectTypes',
  'EnchantmentTypes',
  'EntityTypes',
  'ItemTypes',
]

const core = [
  'Entity',
  'Player',
  'World',
  'Dimension',
  'Effect',
  'EffectType',
  'System',
  'Scoreboard',
  'ScoreboardObjective',
  'ScoreboardIdentity',
  'ScreenDisplay',
  'WorldAfterEvents',
  'WorldBeforeEvents',
  'SystemAfterEvents',
]

const line = (s) => console.log(s)

line('# Declared member surface, @minecraft/server 2.8.0 (TypeScript checker, inherited members included)')
line('')
line(`typescript ${ts.version}`)
line(`exported classes in index.d.ts: ${classes.size}`)
line('')

line('## Core classes the library fakes')
line('')
line('| class | properties | methods | total | private ctor | abstract | extends |')
line('|---|---|---|---|---|---|---|')
let coreTotal = 0
for (const n of core) {
  const s = surfaceOf(n)
  if (!s) {
    line(`| ${n} | (not found) | | | | | |`)
    continue
  }
  coreTotal += s.properties.length + s.methods.length
  line(
    `| ${n} | ${s.properties.length} | ${s.methods.length} | ${s.properties.length + s.methods.length} | ${hasPrivateCtor(n)} | ${isAbstract(n)} | ${heritage(n) ?? ''} |`,
  )
}
line('')
line(`core subtotal: ${coreTotal}`)
line('')

line('## Entity, member by member')
line('')
{
  const s = surfaceOf('Entity')
  line(`properties (${s.properties.length}): ${s.properties.join(', ')}`)
  line('')
  line(`methods (${s.methods.length}): ${s.methods.join(', ')}`)
  line('')
  line(`Player adds over Entity: ${surfaceOf('Player').properties.length + surfaceOf('Player').methods.length - (s.properties.length + s.methods.length)}`)
}
line('')

line('## Entity component classes')
line('')
{
  const base = surfaceOf('EntityComponent')
  const attr = surfaceOf('EntityAttributeComponent')
  line(
    `EntityComponent: ${base.properties.length + base.methods.length} members (${[...base.properties, ...base.methods].join(', ')})`,
  )
  line(
    `EntityAttributeComponent: ${attr.properties.length + attr.methods.length} members (${[...attr.properties, ...attr.methods].join(', ')})`,
  )
  line(`concrete Entity*Component classes: ${componentClasses.length}`)
  let total = 0
  let own = 0
  const rows = []
  for (const n of componentClasses) {
    const s = surfaceOf(n)
    const t = s.properties.length + s.methods.length
    total += t
    own += t - (base.properties.length + base.methods.length)
    rows.push(`${n}=${t}`)
  }
  line(`their declared members, inherited included: ${total}`)
  line(`their members beyond EntityComponent's ${base.properties.length + base.methods.length}: ${own}`)
  line('')
  line(rows.join(' '))
}
line('')

line('## Event signal classes')
line('')
for (const [label, list] of [
  ['world.afterEvents', afterSignals],
  ['world.beforeEvents', beforeSignals],
  ['system.afterEvents', systemSignals],
]) {
  let total = 0
  for (const n of list) {
    const s = surfaceOf(n)
    if (s) total += s.properties.length + s.methods.length
  }
  line(`${label}: ${list.length} signal classes, ${total} declared members in total`)
}
line('')

line('## Registry classes (static side)')
line('')
{
  let total = 0
  for (const n of registries) {
    const entry = classes.get(n)
    if (!entry) {
      line(`${n}: not found`)
      continue
    }
    const statics = checker
      .getPropertiesOfType(checker.getTypeOfSymbolAtLocation(entry.sym, entry.decl))
      .map((p) => p.name)
      .filter((p) => p !== 'prototype')
    total += statics.length
    line(`${n}: ${statics.length} static members (${statics.join(', ')})`)
  }
  line(`registry subtotal: ${total}`)
}
line('')

line('## Grand total')
line('')
{
  const names = new Set([
    ...core,
    'EntityComponent',
    'EntityAttributeComponent',
    ...componentClasses,
    ...afterSignals,
    ...beforeSignals,
    ...systemSignals,
  ])
  let total = 0
  for (const n of names) {
    const s = surfaceOf(n)
    if (s) total += s.properties.length + s.methods.length
  }
  line(`${names.size} classes, ${total} declared instance members`)
}
line('')
line('## Payload interfaces (event payloads are interfaces/classes a fake constructs, not declares)')
line('')
{
  const payloads = [...classes.keys()].filter((n) => /AfterEvent$|BeforeEvent$/.test(n))
  line(`classes named *AfterEvent / *BeforeEvent: ${payloads.length}`)
}
