// Empty query array probes.
//
//   qprobe:empty   what does an empty array ask of an EntityFilter field — families,
//                  excludeFamilies, tags and excludeTags — on entity.matches and on the
//                  dimension lookup, against the same fields carrying a token as controls
//
// Every line goes to console.warn, so a dedicated server collects them from the content log with no
// client attached. Probes report what the engine did; nothing here asserts what it should do.
import { world, system } from '@minecraft/server'

const TAG = '[qprobe] '
const OVERWORLD = 'minecraft:overworld'

const say = (probe, s) => console.warn(`${TAG}${probe} :: ${s}`)
const wait = (n) => system.waitTicks(n)

const read = (fn) => {
  try {
    return { ok: true, v: fn(), text: 'ok' }
  } catch (e) {
    return { ok: false, v: undefined, text: `threw ${e?.name ?? 'Error'}: ${e?.message ?? e}` }
  }
}

// ---------------------------------------------------------------- the arena

let A = null
const arena = () => {
  if (A) return A
  const d = world.getDimension(OVERWORLD)
  const sp = world.getDefaultSpawnLocation()
  const x = Math.floor(sp.x)
  const z = Math.floor(sp.z)
  const y = 100
  A = { d, x, y, z, at: (dx = 0, dy = 0, dz = 0) => ({ x: x + 0.5 + dx, y: y + dy, z: z + 0.5 + dz }) }
  return A
}

const cmd = (c) => read(() => arena().d.runCommand(c).successCount)

const prepareArena = () => {
  const { x, y, z } = arena()
  cmd(`tickingarea add circle ${x} ${y} ${z} 4 qprobe`)
  say('arena', `ticking area requested at (${x},${y},${z})`)
}

const buildArena = async () => {
  const { d, x, y, z } = arena()
  const lines = [
    `gamerule dodaylightcycle false`,
    `gamerule domobspawning false`,
    `gamerule mobgriefing false`,
    `gamerule sendcommandfeedback false`,
    `time set midnight`,
    `fill ${x - 10} ${y - 1} ${z - 10} ${x + 10} ${y - 1} ${z + 10} stone`,
    `fill ${x - 10} ${y} ${z - 10} ${x + 10} ${y + 30} ${z + 10} air`,
    `fill ${x - 10} ${y} ${z - 10} ${x + 10} ${y + 4} ${z - 10} stone`,
    `fill ${x - 10} ${y} ${z + 10} ${x + 10} ${y + 4} ${z + 10} stone`,
    `fill ${x - 10} ${y} ${z - 10} ${x - 10} ${y + 4} ${z + 10} stone`,
    `fill ${x + 10} ${y} ${z - 10} ${x + 10} ${y + 4} ${z + 10} stone`,
  ]
  for (let attempt = 1; attempt <= 10; attempt++) {
    for (const c of lines) cmd(c)
    await wait(20)
    const floor = read(() => d.getBlock({ x, y: y - 1, z })?.typeId).v
    if (floor === 'minecraft:stone') {
      say('arena', `built centre=(${x},${y},${z}) floor=${floor} attempts=${attempt}`)
      return true
    }
  }
  say('arena', `ARENA-NOT-BUILT centre=(${x},${y},${z}) - every case below measures a broken arena`)
  return false
}

const clear = () => {
  const { d } = arena()
  for (const e of read(() => [...d.getEntities({ excludeTypes: ['minecraft:player'] })]).v ?? []) {
    read(() => e.remove())
  }
}

const spawn = (type, dx = 0, dy = 0, dz = 0) => {
  const { d, at } = arena()
  return read(() => d.spawnEntity(type, at(dx, dy, dz))).v
}

// ------------------------------------------------------------------ the sets

/** The families the engine reports for an entity, as one line-safe token list. */
const familiesOf = (e) => {
  const r = read(() => e.getComponent('minecraft:type_family')?.getTypeFamilies())
  return r.ok ? (r.v ?? []).join('|') || 'none' : r.text
}

/** Every case is one options object, named, run against every subject and against the lookup. */
const CASES = [
  ['control-no-filter', {}],
  ['families-empty', { families: [] }],
  ['excludeFamilies-empty', { excludeFamilies: [] }],
  ['tags-empty', { tags: [] }],
  ['excludeTags-empty', { excludeTags: [] }],
  ['families-token', { families: ['mob'] }],
  ['families-token-discriminating', { families: ['sheep'] }],
  ['families-two-tokens', { families: ['mob', 'sheep'] }],
  ['excludeFamilies-token', { excludeFamilies: ['mob'] }],
  ['tags-token', { tags: ['alpha'] }],
  ['excludeTags-token', { excludeTags: ['alpha'] }],
  ['families-empty-and-tags-token', { families: [], tags: ['alpha'] }],
  ['families-and-excludeFamilies-empty', { families: [], excludeFamilies: [] }],
]

const empty = async () => {
  const probe = 'empty'
  prepareArena()
  if (!(await buildArena())) return
  clear()
  await wait(20)

  // three subjects: a mob carrying a tag, a mob carrying none, and an entity outside the mob family
  const sheep = spawn('minecraft:sheep', 2, 0, 0)
  const cow = spawn('minecraft:cow', -2, 0, 0)
  const stand = spawn('minecraft:armor_stand', 0, 0, 2)
  await wait(20)
  if (!sheep || !cow || !stand) {
    say(probe, `SUBJECTS-NOT-SPAWNED sheep=${!!sheep} cow=${!!cow} stand=${!!stand}`)
    return
  }
  read(() => sheep.addTag('alpha'))
  await wait(10)

  const subjects = [
    ['sheep', sheep],
    ['cow', cow],
    ['stand', stand],
  ]
  for (const [name, e] of subjects) {
    say(probe, `subject=${name} typeId=${read(() => e.typeId).v} tags=${(read(() => e.getTags()).v ?? []).join('|') || 'none'} families=${familiesOf(e)}`)
  }

  for (const [caseName, options] of CASES) {
    for (const [name, e] of subjects) {
      const r = read(() => e.matches(options))
      say(probe, `matches case=${caseName} subject=${name} result=${r.ok ? String(r.v) : r.text}`)
    }
    // the lookup path, bounded to the arena's own entities by excluding players
    const r = read(() => arena().d.getEntities({ ...options, excludeTypes: ['minecraft:player'] }))
    const found = r.ok ? (r.v ?? []).map((e) => read(() => e.typeId).v).sort().join('|') || 'none' : r.text
    say(probe, `lookup case=${caseName} count=${r.ok ? (r.v ?? []).length : -1} types=${found}`)
  }

  clear()
}

// ------------------------------------------------------------------- wiring

const SETS = { empty: { fn: empty, n: CASES.length } }

system.run(() => {
  prepareArena()
  say('boot', `ready sets=${Object.keys(SETS).join(',')}`)
})

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (!ev.id.startsWith('qprobe:')) return
  const name = ev.id.slice('qprobe:'.length)
  const set = SETS[name]
  if (!set) {
    say('dispatch', `unknown set ${name}`)
    return
  }
  system.run(async () => {
    say(name, `start cases=${set.n}`)
    try {
      await set.fn()
    } catch (e) {
      say(name, `PROBE CRASHED ${e?.name}: ${e?.message}\n${e?.stack}`)
    }
    say(name, 'complete')
  })
})
