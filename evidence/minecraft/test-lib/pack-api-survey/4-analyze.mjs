// Step 4 of the pack API survey. Scans the accepted repositories' sources and attributes every
// @minecraft/server name it finds to an API area, using api-index.json as ground truth.
//
// The scanner is lexical, not a type checker: it strips comments, keeps string literals addressable
// so `getComponent('...')` ids can be read, and then matches four signal kinds.
//   imports    named imports from '@minecraft/server' (unambiguous)
//   components component ids passed to get/has/add/removeComponent (unambiguous)
//   events     world/system afterEvents.<name> / beforeEvents.<name> (unambiguous)
//   members    `.name` accesses whose name is declared by exactly one API area (inferred)
// Member matching has no receiver type, so it is reported apart from the unambiguous signals and
// common JavaScript identifiers are stoplisted out of it entirely.
//
// Run: node 4-analyze.mjs > 4-analyze.out.txt   (writes usage.json)

import fs from 'node:fs'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const api = JSON.parse(fs.readFileSync(path.join(here, 'api-index.json'), 'utf8'))
const packs = JSON.parse(fs.readFileSync(path.join(here, 'packs.json'), 'utf8')).filter((p) => p.status === 'accepted')

// Member names too common in ordinary JavaScript to attribute from a bare `.name` access.
const STOPLIST = new Set(
  `name id type value values keys entries size length source target start stop run clear reset add remove get set has
   update save load clone test min max color colors x y z index key data state level count amount time delay duration
   message text title body options option result results item items block blocks entity entities player players world
   dimension location position center left right top bottom width height depth mode kind label icon path url version
   enabled disabled visible hidden active current next previous first last total sum join split map filter find push
   pop slice splice concat sort reverse includes indexOf toString valueOf then catch finally close open send receive
   read write parse stringify format print log error warn info debug trace on off emit once subscribe unsubscribe
   delete button`
    .split(/\s+/)
    .filter(Boolean),
)

const MC_MODULES = /@minecraft\/(server-ui|server-net|server-admin|server-gametest|server-editor|debug-utilities|vanilla-data|math|server)/g

// --- lexical scan ---------------------------------------------------------------------------
// Returns { code, strings }: `code` has comments removed and every string literal replaced by the
// token §n§, whose value is strings[n]. Template-literal `${}` expressions stay in `code`.
const scan = (src) => {
  const strings = []
  let out = ''
  let i = 0
  const n = src.length
  const tmpl = [] // stack of template-literal depths
  let braceDepth = 0
  const prevSignificant = () => {
    for (let k = out.length - 1; k >= 0; k--) if (!/\s/.test(out[k])) return out[k]
    return ''
  }
  while (i < n) {
    const c = src[i]
    const c2 = src[i + 1]
    if (c === '/' && c2 === '/') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && c2 === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? n : end + 2
      out += ' '
      continue
    }
    if (c === '"' || c === "'") {
      let j = i + 1
      let val = ''
      while (j < n && src[j] !== c) {
        if (src[j] === '\\') {
          val += src[j + 1] ?? ''
          j += 2
          continue
        }
        if (src[j] === '\n') break
        val += src[j++]
      }
      strings.push(val)
      out += `§${strings.length - 1}§`
      i = j + 1
      continue
    }
    if (c === '`') {
      // template literal: emit its literal chunks as one string, keep ${} as code
      let j = i + 1
      let val = ''
      while (j < n) {
        if (src[j] === '\\') {
          val += src[j + 1] ?? ''
          j += 2
          continue
        }
        if (src[j] === '`') {
          j++
          break
        }
        if (src[j] === '$' && src[j + 1] === '{') {
          strings.push(val)
          out += `§${strings.length - 1}§ `
          val = ''
          // scan the expression as code by recursing on the balanced slice
          let depth = 1
          let k = j + 2
          while (k < n && depth > 0) {
            if (src[k] === '{') depth++
            else if (src[k] === '}') depth--
            else if (src[k] === '`') {
              // nested template: skip it wholesale
              let d = k + 1
              while (d < n && src[d] !== '`') d += src[d] === '\\' ? 2 : 1
              k = d
            }
            k++
          }
          const inner = scan(src.slice(j + 2, k - 1))
          out += inner.code.replace(/§(\d+)§/g, (_, m) => {
            strings.push(inner.strings[Number(m)])
            return `§${strings.length - 1}§`
          })
          j = k
          continue
        }
        val += src[j++]
      }
      strings.push(val)
      out += `§${strings.length - 1}§`
      i = j
      continue
    }
    if (c === '/' && /[=([,:;!&|?{}+\-*%~^<>]/.test(prevSignificant() || '=')) {
      // regular-expression literal
      let j = i + 1
      let inClass = false
      while (j < n) {
        if (src[j] === '\\') j += 2
        else if (src[j] === '[') (inClass = true), j++
        else if (src[j] === ']') (inClass = false), j++
        else if (src[j] === '/' && !inClass) break
        else if (src[j] === '\n') break
        else j++
      }
      i = j + 1
      out += ' '
      continue
    }
    out += c
    i++
  }
  return { code: out, strings }
}

// --- per-pack extraction ---------------------------------------------------------------------
const bump = (obj, key, by = 1) => (obj[key] = (obj[key] ?? 0) + by)

const analyseFile = (src, acc) => {
  const { code, strings } = scan(src)
  const str = (tok) => (tok ? strings[Number(tok)] : undefined)

  for (const m of strings.join('\n').matchAll(MC_MODULES)) bump(acc.modules, `@minecraft/${m[1]}`)

  // named imports from '@minecraft/server'
  const importRe = /import\s+(type\s+)?([^;]*?)\s+from\s+§(\d+)§/g
  for (const m of code.matchAll(importRe)) {
    if (str(m[3]) !== '@minecraft/server') continue
    const clause = m[2]
    if (/^\*\s+as\s+(\w+)/.test(clause)) {
      bump(acc.namespaceImports, /^\*\s+as\s+(\w+)/.exec(clause)[1])
      continue
    }
    const braces = /\{([^}]*)\}/.exec(clause)
    if (!braces) continue
    for (const part of braces[1].split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
      if (name) bump(acc.imports, name)
    }
  }
  // require('@minecraft/server')
  for (const m of code.matchAll(/(?:const|let|var)\s+\{([^}]*)\}\s*=\s*require\(\s*§(\d+)§/g)) {
    if (str(m[2]) !== '@minecraft/server') continue
    for (const part of m[1].split(',')) {
      const name = part.trim().split(':')[0].trim()
      if (name) bump(acc.imports, name)
    }
  }

  // component ids
  for (const m of code.matchAll(/\.(get|has|add|remove)Component\s*\(\s*§(\d+)§/g)) {
    const id = str(m[2])
    if (id) bump(acc.componentIds, id)
  }
  // ids passed as enum members, e.g. EntityComponentTypes.Inventory
  for (const m of code.matchAll(/\b(EntityComponentTypes|ItemComponentTypes|BlockComponentTypes)\.(\w+)/g)) {
    const map = api.componentEnums[m[1].replace('ComponentTypes', '').toLowerCase()]
    const id = Object.entries(map ?? {}).find(([, k]) => k === m[2])?.[0]
    if (id) bump(acc.componentIds, id)
  }

  // events
  for (const m of code.matchAll(/(\w+)\s*\.\s*(afterEvents|beforeEvents)\s*\.\s*(\w+)/g)) {
    const holder = m[1] === 'system' ? 'system' : 'world'
    bump(acc.events, `${holder}.${m[2]}.${m[3]}`)
  }

  // member accesses
  for (const m of code.matchAll(/\.\s*([A-Za-z_$][\w$]*)\s*(\()?/g)) {
    const name = m[1]
    if (!Object.hasOwn(api.members, name)) continue
    if (STOPLIST.has(name)) {
      bump(acc.stoplisted, name)
      continue
    }
    bump(m[2] ? acc.calls : acc.props, name)
  }

  // static access on API classes, e.g. ItemStack, BlockPermutation.resolve
  for (const m of code.matchAll(/\b([A-Z][A-Za-z0-9_]+)\s*\.\s*[A-Za-z_$]/g)) if (api.classes[m[1]]) bump(acc.staticRefs, m[1])
  for (const m of code.matchAll(/\bnew\s+([A-Z][A-Za-z0-9_]+)\s*\(/g)) if (api.classes[m[1]]) bump(acc.constructed, m[1])

  // commands used instead of the API
  for (const m of code.matchAll(/\.(runCommand|runCommandAsync)\s*\(/g)) bump(acc.commands, m[1])
}

// --- self check --------------------------------------------------------------------------------
// `node 4-analyze.mjs --selfcheck` scans a fixture exercising the cases the scanner has to get
// right: commented-out API calls, a regular-expression literal containing slashes, a template
// literal with API calls inside ${}, an enum-valued component id, and a nested member chain.
if (process.argv.includes('--selfcheck')) {
  const fixture = fs.readFileSync(path.join(here, 'selfcheck-fixture.txt'), 'utf8')
  const acc = { imports: {}, namespaceImports: {}, componentIds: {}, events: {}, calls: {}, props: {}, staticRefs: {}, constructed: {}, stoplisted: {}, commands: {}, modules: {} }
  analyseFile(fixture, acc)
  console.log(JSON.stringify(acc, null, 1))
  process.exit(0)
}

const usage = []
for (const p of packs) {
  const acc = {
    imports: {},
    namespaceImports: {},
    componentIds: {},
    events: {},
    calls: {},
    props: {},
    staticRefs: {},
    constructed: {},
    stoplisted: {},
    commands: {},
    modules: {},
  }
  for (const f of p.files) {
    try {
      analyseFile(fs.readFileSync(path.join(p.dir, f.file), 'utf8'), acc)
    } catch (err) {
      console.log(`  ! ${p.full_name}/${f.file}: ${err.message}`)
    }
  }
  usage.push({
    repo: p.full_name,
    commit: p.commit,
    stars: p.stars,
    kind: p.kind,
    source_kind: p.source_kind,
    files: p.files.length,
    source_lines: p.source_lines,
    ...acc,
  })
}

// --- attribution ------------------------------------------------------------------------------
const areaOfClass = (c) => api.classes[c]?.area ?? 'other'
const groupOf = (area) => api.groups[area] ?? 'other-group'

const memberAreas = (name) => {
  const m = Object.hasOwn(api.members, name) ? api.members[name] : null
  if (!m) return null
  return m.areas.length === 1 ? m.areas[0] : null // ambiguous names are not attributed
}

const componentArea = (id) => {
  const bare = id.replace(/^minecraft:/, '')
  for (const [kind, map] of Object.entries(api.componentIds))
    if (map[id] || map[bare]) return `${kind}-component`
  return null
}

const eventInfo = (key) => {
  const [holder, phase, name] = key.split('.')
  const table = holder === 'system' ? api.events[`system.${phase}`] : api.events[phase]
  return table?.[name] ? { ...table[name], holder, phase, name } : null
}

for (const u of usage) {
  // Areas come from the unambiguous signals plus method calls. A bare property read carries too
  // little information about its receiver to attribute, so it is tallied apart, in propAreas.
  const areas = {} // area -> reference count
  const propAreas = {}
  const evidence = { imports: {}, componentIds: {}, events: {}, members: {}, props: {} }
  const addArea = (area, n, bucket, label) => {
    if (!area) return
    bump(bucket === 'props' ? propAreas : areas, area, n)
    bump(evidence[bucket], label, n)
  }
  for (const [sym, n] of Object.entries(u.imports)) addArea(api.classes[sym] ? areaOfClass(sym) : null, n, 'imports', sym)
  for (const [id, n] of Object.entries(u.componentIds)) addArea(componentArea(id), n, 'componentIds', id)
  for (const [key, n] of Object.entries(u.events)) {
    const e = eventInfo(key)
    if (e) addArea('event', n, 'events', key)
  }
  for (const [name, n] of Object.entries({ ...u.calls })) addArea(memberAreas(name), n, 'members', name)
  for (const [name, n] of Object.entries(u.props)) addArea(memberAreas(name), n, 'props', name)

  // group-level touch tests
  const unambiguousItemBlock = new Set()
  for (const [sym] of Object.entries(u.imports)) if (api.classes[sym] && groupOf(areaOfClass(sym)) === 'item-block-group') unambiguousItemBlock.add(`import ${sym}`)
  for (const [sym] of Object.entries({ ...u.staticRefs, ...u.constructed }))
    if (groupOf(areaOfClass(sym)) === 'item-block-group') unambiguousItemBlock.add(`ref ${sym}`)
  for (const [id] of Object.entries(u.componentIds)) {
    const a = componentArea(id)
    if (a && groupOf(a) === 'item-block-group') unambiguousItemBlock.add(`component ${id}`)
  }
  const memberItemBlock = new Set()
  for (const name of Object.keys(u.calls)) {
    const a = memberAreas(name)
    if (a && groupOf(a) === 'item-block-group') memberItemBlock.add(name)
  }
  const eventItemBlock = new Set()
  for (const key of Object.keys(u.events)) {
    const e = eventInfo(key)
    if (e && e.payload.some((c) => groupOf(areaOfClass(c)) === 'item-block-group')) eventItemBlock.add(key)
  }
  const entityGroup = new Set()
  for (const [sym] of Object.entries({ ...u.imports, ...u.staticRefs, ...u.constructed }))
    if (api.classes[sym] && groupOf(areaOfClass(sym)) === 'entity-group') entityGroup.add(sym)
  for (const [id] of Object.entries(u.componentIds)) if (componentArea(id) === 'entity-component') entityGroup.add(id)
  for (const name of Object.keys(u.calls)) if (groupOf(memberAreas(name)) === 'entity-group') entityGroup.add(name)

  u.areas = areas
  u.propAreas = propAreas
  u.evidence = evidence
  u.touch = {
    itemBlockUnambiguous: [...unambiguousItemBlock].sort(),
    itemBlockMembers: [...memberItemBlock].sort(),
    itemBlockEvents: [...eventItemBlock].sort(),
    entityGroup: [...entityGroup].sort(),
  }
}

fs.writeFileSync(path.join(here, 'usage.json'), `${JSON.stringify(usage, null, 1)}\n`)
console.log(`analysed ${usage.length} repositories, ${usage.reduce((n, u) => n + u.files, 0)} files, ${usage.reduce((n, u) => n + u.source_lines, 0)} non-blank source lines`)
console.log('wrote usage.json')
