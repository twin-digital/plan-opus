// Step 2 of the pack API survey. Builds the classification ground truth from the
// @minecraft/server 2.8.0 declarations, so that a name seen in pack source can be attributed to an
// API area without a hand-written keyword list.
//
// Produces api-index.json:
//   classes      class name -> { extends, area, members: { name: 'method' | 'prop' } }
//   members      member name -> { areas: [...], kinds: [...], classes: [...] }
//   events       'afterEvents'/'beforeEvents'/'system' -> event name -> { signal, event, payload }
//                where payload lists the API classes reachable from the event object's fields
//   componentIds entity/item/block component id -> component class
//
// Run: node 2-api-index.mjs > 2-api-index.out.txt   (writes api-index.json)

import fs from 'node:fs'

const dts = fs.readFileSync(new URL('./node_modules/@minecraft/server/index.d.ts', import.meta.url), 'utf8')
const version = JSON.parse(
  fs.readFileSync(new URL('./node_modules/@minecraft/server/package.json', import.meta.url), 'utf8'),
).version

// --- area assignment ------------------------------------------------------------------------
// Ordered rules over the declared type name. First match wins.
const AREA_RULES = [
  [/^Item.*Component$/, 'item-component'],
  [/^Block.*Component$/, 'block-component'],
  [/^Entity.*Component$|^PlayerCursorInventoryComponent$/, 'entity-component'],
  [/^(Container|ContainerSlot|FluidContainer|ContainerRules)/, 'container'],
  [/AfterEvent$|BeforeEvent$|AfterEventSignal$|BeforeEventSignal$|^BlockEvent$|Event$/, 'event'],
  [/^(Effect|EffectType|EffectTypes|PotionEffectType|Potions|PotionDeliveryType)$/, 'effect'],
  [/^(Enchantment|EnchantInfo)/, 'item'],
  [/^Item/, 'item'],
  [/^Block/, 'block'],
  [/^Player/, 'player'],
  [/^Entity/, 'entity'],
  [/^Dimension/, 'dimension'],
  [/^(World|System|SystemInfo|ClientSystemInfo)$/, 'world-system'],
  [/^(WorldAfterEvents|WorldBeforeEvents|SystemAfterEvents|SystemBeforeEvents)$/, 'event'],
  [/^Scoreboard/, 'scoreboard'],
  [/^Loot|^Set.*Function$|^.*Condition$|^.*Function$/, 'loot'],
  [/^Structure/, 'structure'],
  [/^(Camera|ScreenDisplay|HudElement|InputInfo|LocatorBar|Waypoint|.*Waypoint)$/, 'player-ui'],
  [/^(Component)$/, 'component-base'],
  [/Error$/, 'error'],
]
const areaOf = (name) => AREA_RULES.find(([re]) => re.test(name))?.[1] ?? 'other'

// The three API groups this survey contrasts.
export const GROUPS = {
  'entity-component': 'entity-group',
  entity: 'entity-group',
  player: 'entity-group',
  effect: 'entity-group',
  item: 'item-block-group',
  'item-component': 'item-block-group',
  block: 'item-block-group',
  'block-component': 'item-block-group',
  container: 'item-block-group',
}

// --- declaration parsing --------------------------------------------------------------------
const stripDoc = (body) => body.replace(/\/\*\*[\s\S]*?\*\//g, '')

const blocks = (kind) => {
  const out = new Map()
  const re = new RegExp(`^export ${kind} (\\w+)(?: extends ([\\w<>, ]+?))?\\s*\\{$`, 'gm')
  for (const m of dts.matchAll(re)) {
    const start = m.index + m[0].length
    const end = dts.indexOf('\n}', start)
    out.set(m[1], { extends: m[2]?.trim().split(/[<,\s]/)[0] ?? null, body: stripDoc(dts.slice(start, end)) })
  }
  return out
}

const classBlocks = blocks('class')
const interfaceBlocks = blocks('interface')
const enumBlocks = blocks('enum')

const memberLines = (body) =>
  body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('*') && !l.startsWith('private constructor'))

const parseMembers = (body) => {
  const members = {}
  const fields = {}
  for (const line of memberLines(body)) {
    let m = /^(?:static\s+)?(\w+)\s*(?:<[^>]*>)?\(/.exec(line)
    if (m && !/^(if|for|while|return|constructor)$/.test(m[1])) {
      members[m[1]] = 'method'
      continue
    }
    m = /^(?:static\s+)?(?:readonly\s+)?(\w+)\??\s*:\s*([^;]+);/.exec(line)
    if (m) {
      members[m[1]] ??= 'prop'
      fields[m[1]] = m[2].trim()
    }
  }
  return { members, fields }
}

const classes = {}
for (const [name, blk] of classBlocks) {
  const { members, fields } = parseMembers(blk.body)
  classes[name] = { extends: blk.extends, area: areaOf(name), members, fields }
}
// inherited members count as members of the subclass (Player sees every Entity member)
for (const name of Object.keys(classes)) {
  let parent = classes[name].extends
  const seen = new Set()
  while (parent && classes[parent] && !seen.has(parent)) {
    seen.add(parent)
    for (const [m, kind] of Object.entries(classes[parent].members)) classes[name].members[m] ??= kind
    for (const [f, t] of Object.entries(classes[parent].fields)) classes[name].fields[f] ??= t
    parent = classes[parent].extends
  }
}

const interfaces = {}
for (const [name, blk] of interfaceBlocks) interfaces[name] = parseMembers(blk.body).fields

// member name -> where it is declared
const members = {}
for (const [cls, def] of Object.entries(classes)) {
  for (const [m, kind] of Object.entries(def.members)) {
    members[m] ??= { classes: [], areas: [], kinds: [] }
    members[m].classes.push(cls)
    if (!members[m].areas.includes(def.area)) members[m].areas.push(def.area)
    if (!members[m].kinds.includes(kind)) members[m].kinds.push(kind)
  }
}

// --- events ---------------------------------------------------------------------------------
// For each event name, the API classes a handler can reach directly off the event object (one hop
// through interface-valued fields). This is what a fake must be able to construct to fire it.
const typeNames = (t) => [...t.matchAll(/\b([A-Z]\w+)\b/g)].map((m) => m[1])

const payloadClasses = (eventClass) => {
  const def = classes[eventClass]
  if (!def) return []
  const out = new Set()
  for (const t of Object.values(def.fields)) {
    for (const n of typeNames(t)) {
      if (classes[n]) out.add(n)
      else if (interfaces[n]) for (const it of Object.values(interfaces[n])) for (const n2 of typeNames(it)) if (classes[n2]) out.add(n2)
    }
  }
  return [...out]
}

const eventGroups = {}
for (const [holder, key] of [
  ['WorldAfterEvents', 'afterEvents'],
  ['WorldBeforeEvents', 'beforeEvents'],
  ['SystemAfterEvents', 'system.afterEvents'],
  ['SystemBeforeEvents', 'system.beforeEvents'],
]) {
  const g = {}
  for (const [name, type] of Object.entries(classes[holder].fields)) {
    const eventClass = type.replace(/Signal$/, '')
    const payload = payloadClasses(eventClass)
    g[name] = {
      signal: type,
      event: eventClass,
      payload,
      payloadAreas: [...new Set(payload.map((c) => classes[c].area))].sort(),
    }
  }
  eventGroups[key] = g
}

// --- component ids --------------------------------------------------------------------------
const enumValues = (name) =>
  Object.fromEntries([...enumBlocks.get(name).body.matchAll(/^\s*(\w+) = '([^']+)',/gm)].map((m) => [m[2], m[1]]))

const typeMap = (name) => {
  const m = new RegExp(`^export type ${name} = \\{$`, 'm').exec(dts)
  const body = dts.slice(m.index, dts.indexOf('\n};', m.index))
  return Object.fromEntries(
    [...body.matchAll(/^\s{4}('[^']+'|[\w:.]+):\s*(\w+);/gm)].map((x) => [x[1].replace(/'/g, ''), x[2]]),
  )
}

const componentIds = {
  entity: typeMap('EntityComponentTypeMap'),
  item: typeMap('ItemComponentTypeMap'),
  block: typeMap('BlockComponentTypeMap'),
}
const componentEnums = {
  entity: enumValues('EntityComponentTypes'),
  item: enumValues('ItemComponentTypes'),
  block: enumValues('BlockComponentTypes'),
}

const index = { version, classes, interfaces, members, events: eventGroups, componentIds, componentEnums, groups: GROUPS }
fs.writeFileSync(new URL('./api-index.json', import.meta.url), `${JSON.stringify(index, null, 1)}\n`)

// --- report ---------------------------------------------------------------------------------
console.log(`@minecraft/server ${version}`)
console.log(`classes: ${Object.keys(classes).length}, interfaces: ${Object.keys(interfaces).length}`)
console.log(`distinct member names: ${Object.keys(members).length}`)
const areaCount = {}
for (const d of Object.values(classes)) areaCount[d.area] = (areaCount[d.area] ?? 0) + 1
console.log('\nclasses per area:')
for (const [a, n] of Object.entries(areaCount).sort((x, y) => y[1] - x[1])) console.log(`  ${a.padEnd(18)} ${n}`)
console.log('\ncomponent ids:')
for (const [k, v] of Object.entries(componentIds)) console.log(`  ${k}: ${Object.keys(v).length} map keys`)
console.log('\nevent names:')
for (const [k, v] of Object.entries(eventGroups)) console.log(`  ${k}: ${Object.keys(v).length}`)
console.log('\nevents whose payload exposes an item/block/container class:')
for (const [k, g] of Object.entries(eventGroups))
  for (const [name, e] of Object.entries(g)) {
    const hit = e.payload.filter((c) => GROUPS[classes[c].area] === 'item-block-group')
    if (hit.length) console.log(`  ${k}.${name}: ${hit.join(', ')}`)
  }
console.log('\nmember names declared in more than one area (attributed as ambiguous when seen in pack source):')
console.log(`  ${Object.values(members).filter((m) => m.areas.length > 1).length} of ${Object.keys(members).length}`)
