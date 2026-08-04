// Step 5 of the pack API survey. Turns usage.json into the ranked tables.
// Run: node 5-report.mjs > 5-report.out.txt

import fs from 'node:fs'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const api = JSON.parse(fs.readFileSync(path.join(here, 'api-index.json'), 'utf8'))
const all = JSON.parse(fs.readFileSync(path.join(here, 'usage.json'), 'utf8'))

const ONLY = process.env.KIND // 'pack' | 'library' | unset for both
const usage = ONLY ? all.filter((u) => u.kind === ONLY) : all
const N = usage.length
const pct = (n) => `${((100 * n) / N).toFixed(0)}%`.padStart(4)

const heading = (s) => console.log(`\n## ${s}\n`)
const table = (rows, headers) => {
  const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)))
  const line = (r) => console.log(r.map((c, i) => (i === 0 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join('  '))
  line(headers)
  line(w.map((n) => '-'.repeat(n)))
  rows.forEach(line)
}

const groupOf = (area) => api.groups[area] ?? 'other-group'
const rank = (pick) => {
  const packs = {}
  const refs = {}
  for (const u of usage) {
    const seen = new Set()
    for (const [k, n] of Object.entries(pick(u) ?? {})) {
      refs[k] = (refs[k] ?? 0) + n
      seen.add(k)
    }
    for (const k of seen) packs[k] = (packs[k] ?? 0) + 1
  }
  return Object.entries(packs)
    .map(([k, p]) => [k, p, refs[k]])
    .sort((a, b) => b[1] - a[1] || b[2] - a[2])
}

console.log(`# @minecraft/server usage across ${N} public behavior-pack repositories`)
console.log(`kind filter: ${ONLY ?? 'none (packs + libraries)'}`)
console.log(`@minecraft/server declarations used for classification: ${api.version}`)
console.log(`total non-blank source lines analysed: ${usage.reduce((n, u) => n + u.source_lines, 0)}`)

heading('Sample composition')
const median = (xs) => (xs.length ? xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0)
table(
  [
    ['repositories', N],
    ['tagged pack', usage.filter((u) => u.kind === 'pack').length],
    ['tagged library/framework', usage.filter((u) => u.kind === 'library').length],
    ['TypeScript sources', usage.filter((u) => u.source_kind === 'typescript').length],
    ['JavaScript sources', usage.filter((u) => u.source_kind === 'javascript').length],
    ['0 stars', usage.filter((u) => u.stars === 0).length],
    ['1-9 stars', usage.filter((u) => u.stars >= 1 && u.stars < 10).length],
    ['10+ stars', usage.filter((u) => u.stars >= 10).length],
    ['median non-blank source lines', median(usage.map((u) => u.source_lines))],
    ['median distinct event subscriptions', median(usage.map((u) => Object.keys(u.events).length))],
  ].map(([l, n]) => [l, n]),
  ['measure', 'value'],
)

heading('API area, by number of repositories that reference it (imports, component ids, event subscriptions, and method calls)')
table(
  rank((u) => u.areas).map(([area, p, r]) => [area, groupOf(area), p, pct(p), r]),
  ['area', 'group', 'repos', 'share', 'refs'],
)

heading('Imported symbols from @minecraft/server')
table(
  rank((u) => u.imports)
    .filter(([, p]) => p >= 2)
    .map(([sym, p, r]) => [sym, api.classes[sym]?.area ?? 'value/enum/interface', p, pct(p), r]),
  ['symbol', 'area', 'repos', 'share', 'refs'],
)

heading('Component ids, normalised over the optional minecraft: prefix')
table(
  rank((u) => {
    const out = {}
    for (const [id, n] of Object.entries(u.componentIds)) out[id.replace(/^minecraft:/, '')] = (out[id.replace(/^minecraft:/, '')] ?? 0) + n
    return out
  }).map(([id, p2, r]) => {
    const kind = Object.entries(api.componentIds).find(([, m]) => m[id] || m['minecraft:' + id])?.[0] ?? 'custom/unknown'
    return [id, kind, p2, pct(p2), r]
  }),
  ['component id', 'on', 'repos', 'share', 'refs'],
)

heading('Component ids exactly as written (get/has/add/removeComponent)')
table(
  rank((u) => u.componentIds).map(([id, p, r]) => {
    const bare = id.replace(/^minecraft:/, '')
    const kind = Object.entries(api.componentIds).find(([, m]) => m[id] || m[bare])?.[0] ?? 'unknown'
    return [id, kind, p, pct(p), r]
  }),
  ['component id', 'on', 'repos', 'share', 'refs'],
)

heading('Event subscriptions')
table(
  rank((u) => u.events).map(([key, p, r]) => {
    const [holder, phase, name] = key.split('.')
    const e = (holder === 'system' ? api.events[`system.${phase}`] : api.events[phase])?.[name]
    const payload = e ? [...new Set(e.payload.map((c) => api.classes[c].area))].filter((a) => groupOf(a) !== 'other-group') : []
    return [key, e ? payload.join(',') || '-' : 'UNKNOWN', p, pct(p), r]
  }),
  ['event', 'payload areas', 'repos', 'share', 'refs'],
)

heading('Method calls attributed to exactly one API area (inferred, no receiver type)')
const memberRows = rank((u) => u.calls)
  .filter(([name]) => api.members[name].areas.length === 1)
  .map(([name, p, r]) => [name, api.members[name].areas[0], api.members[name].classes.slice(0, 3).join('/'), p, pct(p), r])
table(memberRows.filter((r) => r[3] >= 3), ['member', 'area', 'declared on', 'repos', 'share', 'refs'])

// --- headline metrics -------------------------------------------------------------------------
const touchesItemBlock = (u) => u.touch.itemBlockUnambiguous.length > 0
const touchesItemBlockLoose = (u) => touchesItemBlock(u) || u.touch.itemBlockMembers.length > 0
const touchesItemBlockStrict = (u) => touchesItemBlockLoose(u) || u.touch.itemBlockEvents.length > 0

heading('Headline: how many repositories the item/block/container gap reaches')
const rows = [
  ['unambiguous only (imports, static refs, item/block component ids)', usage.filter(touchesItemBlock).length],
  ['+ member accesses attributed to item/block/container', usage.filter(touchesItemBlockLoose).length],
  ['+ subscribes to an event whose payload exposes ItemStack/Block/Container', usage.filter(touchesItemBlockStrict).length],
]
table(
  rows.map(([label, n]) => [label, n, pct(n), N - n, pct(N - n)]),
  ['touch test', 'touch', 'share', 'untouched', 'share'],
)
console.log(`\nrepositories with no item/block/container reference under the strictest test (fully served by a fake without them):`)
for (const u of usage.filter((u) => !touchesItemBlockStrict(u))) console.log(`  ${u.repo} (${u.stars}*, ${u.source_lines} lines, ${u.kind})`)

console.log('')
table(
  [
    ['median source lines, repositories that touch item/block/container', median(usage.filter(touchesItemBlockStrict).map((u) => u.source_lines))],
    ['median source lines, repositories that do not', median(usage.filter((u) => !touchesItemBlockStrict(u)).map((u) => u.source_lines))],
    ['largest repository that does not, in source lines', Math.max(...usage.filter((u) => !touchesItemBlockStrict(u)).map((u) => u.source_lines))],
  ],
  ['measure', 'value'],
)

// Which of the two missing halves a repository actually needs: items (ItemStack, item components,
// containers) or blocks (Block, block permutations, block components).
const ITEM_AREAS = new Set(['item', 'item-component', 'container'])
const BLOCK_AREAS = new Set(['block', 'block-component'])
const needs = (u, set) => {
  if (Object.keys(u.areas).some((a) => set.has(a))) return true
  return u.touch.itemBlockEvents.some((key) => {
    const [holder, phase, name] = key.split('.')
    const e = (holder === 'system' ? api.events['system.' + phase] : api.events[phase])?.[name]
    return e?.payload.some((c) => set.has(api.classes[c].area))
  })
}
heading('Which half of the gap each repository needs')
const needItem = usage.filter((u) => needs(u, ITEM_AREAS))
const needBlock = usage.filter((u) => needs(u, BLOCK_AREAS))
table(
  [
    ['needs items (ItemStack, item components, containers)', needItem.length],
    ['needs blocks (Block, permutations, block components)', needBlock.length],
    ['needs both', usage.filter((u) => needs(u, ITEM_AREAS) && needs(u, BLOCK_AREAS)).length],
    ['needs items only', usage.filter((u) => needs(u, ITEM_AREAS) && !needs(u, BLOCK_AREAS)).length],
    ['needs blocks only', usage.filter((u) => !needs(u, ITEM_AREAS) && needs(u, BLOCK_AREAS)).length],
    ['needs neither (served by the v1 surface)', usage.filter((u) => !needs(u, ITEM_AREAS) && !needs(u, BLOCK_AREAS)).length],
  ].map(([l, n]) => [l, n, pct(n)]),
  ['requirement', 'repos', 'share'],
)
console.log('')
table(
  [
    ['v1 surface as scoped', usage.filter((u) => !needs(u, ITEM_AREAS) && !needs(u, BLOCK_AREAS)).length],
    ['v1 + items', usage.filter((u) => !needs(u, BLOCK_AREAS)).length],
    ['v1 + blocks', usage.filter((u) => !needs(u, ITEM_AREAS)).length],
    ['v1 + items + blocks', N],
  ].map(([l, n]) => [l, n, pct(n)]),
  ['fake surface', 'repos fully covered', 'share'],
)

heading('Entity/component/effect group vs item/block/container group')
const groupRepos = (g) => usage.filter((u) => Object.keys(u.areas).some((a) => groupOf(a) === g)).length
table(
  [
    ['entity-group (Entity, Player, entity components, effects)', groupRepos('entity-group')],
    ['item-block-group (ItemStack, Block, containers, their components)', groupRepos('item-block-group')],
  ].map(([l, n]) => [l, n, pct(n)]),
  ['group', 'repos', 'share'],
)

// The v1 surface, as ../../spec.md scopes it, leaves out more than items and blocks. This counts
// how many repositories reach for each of the other absent pieces.
const REGISTRIES = ['EntityTypes', 'ItemTypes', 'BlockTypes', 'EffectTypes', 'Potions', 'EnchantmentTypes', 'DimensionTypes', 'BiomeTypes', 'BlockStates', 'ItemComponentTypes', 'EntityComponentTypes', 'BlockComponentTypes']
const absentSignals = (u) => {
  const out = {}
  const area = (a) => Object.keys(u.areas).includes(a)
  const callsOn = (cls) => Object.keys(u.calls).some((c) => Object.hasOwn(api.members, c) && api.members[c].classes.length === 1 && api.members[c].classes[0] === cls)
  if (area('item') || area('item-component') || area('container')) out['items, item components, containers'] = 1
  if (area('block') || area('block-component')) out['blocks, permutations, block components'] = 1
  if (callsOn('System')) out['System scheduling (runInterval, runTimeout, ...)'] = 1
  if (area('player-ui')) out['player client surface (ScreenDisplay, Camera, ...)'] = 1
  if (area('structure')) out['structures'] = 1
  if (area('loot')) out['loot tables'] = 1
  if (REGISTRIES.some((r) => u.imports[r])) out['static type registries'] = 1
  if (Object.keys(u.events).some((k) => k.startsWith('system.beforeEvents.startup') || k.startsWith('system.beforeEvents.shutdown')) || u.imports.CustomCommandRegistry || Object.keys(u.calls).includes('registerCommand'))
    out['startup phase and custom command/component registries'] = 1
  if (Object.keys(u.events).some((k) => k.includes('.beforeEvents.'))) out['beforeEvents subscriptions'] = 1
  if (area('scoreboard')) out['scoreboard reads/writes (built in v1, members stubbed)'] = 1
  return out
}
heading('Surface absent from v1, by repositories that reach for it')
table(rank((u) => absentSignals(u)).map(([k, n]) => [k, n, pct(n)]), ['absent surface', 'repos', 'share'])
const clean = usage.filter((u) => Object.keys(absentSignals(u)).length === 0)
console.log(`\nrepositories touching none of the above: ${clean.length} (${pct(clean.length).trim()})`)
for (const u of clean) console.log(`  ${u.repo} (${u.stars}*, ${u.source_lines} lines)`)

heading('Per-repository summary')
table(
  usage
    .slice()
    .sort((a, b) => b.stars - a.stars)
    .map((u) => [
      u.repo,
      u.kind,
      u.stars,
      u.source_lines,
      Object.keys(u.events).length,
      Object.keys(u.componentIds).length,
      touchesItemBlock(u) ? 'yes' : touchesItemBlockLoose(u) ? 'member' : touchesItemBlockStrict(u) ? 'event' : 'no',
      u.commit.slice(0, 10),
    ]),
  ['repository', 'kind', 'stars', 'lines', 'events', 'components', 'item/block', 'commit'],
)

heading('Property reads matching a single API area (low confidence; excluded from the area table)')
table(
  rank((u) => u.evidence.props)
    .filter(([, p2]) => p2 >= 5)
    .map(([name, p2, r]) => [name, api.members[name].areas[0], p2, pct(p2), r]),
  ['property', 'area', 'repos', 'share', 'refs'],
)

heading('Subscriptions to event names that no longer exist in ' + api.version)
table(
  rank((u) => u.events)
    .filter(([key]) => {
      const [holder, phase, name] = key.split('.')
      return !(holder === 'system' ? api.events['system.' + phase] : api.events[phase])?.[name]
    })
    .map(([key, p2, r]) => [key, p2, pct(p2), r]),
  ['event', 'repos', 'share', 'refs'],
)

heading('Other @minecraft modules imported (context; out of scope for the fake)')
table(rank((u) => u.modules).map(([m, p, r]) => [m, p, pct(p), r]), ['module', 'repos', 'share', 'refs'])

heading('runCommand usage (packs that reach for commands rather than the API)')
table(rank((u) => u.commands).map(([m, p, r]) => [m, p, pct(p), r]), ['call', 'repos', 'share', 'refs'])

heading('Stoplisted member names seen (excluded from attribution as too common in plain JS)')
table(rank((u) => u.stoplisted).slice(0, 25).map(([m, p, r]) => [m, p, pct(p), r]), ['name', 'repos', 'share', 'refs'])
