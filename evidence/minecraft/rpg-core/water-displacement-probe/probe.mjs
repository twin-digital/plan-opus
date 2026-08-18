#!/usr/bin/env node
// Can a custom Bedrock entity be made immune to displacement by a WATER CURRENT using entity
// components alone?
//
// One behavior pack declares many entity variants, each a different component hypothesis. The pack's
// script builds one stone channel per variant, puts a water source at the closed end so the current
// runs in +x, spawns that variant in the current, and samples every entity's location for 15 seconds.
// Horizontal drift (x/z) and vertical change (y) are reported separately, so flow-push and buoyancy
// are not confounded. Vanilla entities ride along as references, and a component-poor custom entity
// is the positive control: if it does not drift, the stimulus is broken.
//
// Headless: everything reports through console.warn, which the server prints once
// content-log-console-output-enabled is set. No Minecraft client is involved.
//
// Usage: node probe.mjs [--keep]

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const PROJECT = 'rpg-water-probe'
const VOLUME = PROJECT + '_data'
const IMAGE = 'itzg/minecraft-bedrock-server:latest'
const VERSION = '1.26.43.1'
const SCRIPT_API = '2.0.0'
const MIN_ENGINE = [1, 21, 0]
const LEVEL = 'waterprobe'
const KEEP = process.argv.includes('--keep')

const PACK = '7b2f0000-0000-4000-8000-000000000001'
const MODULE = '7b2f0000-0000-4000-8000-0000000000a1'
const SCRIPT = '7b2f0000-0000-4000-8000-0000000000b1'

const log = (...a) => console.log(...a)
const d = (args) => exec('docker', args, { maxBuffer: 64 * 1024 * 1024 })

// ---------------------------------------------------------------- component hypotheses

const BASE = {
  'minecraft:health': { value: 20 },
  'minecraft:collision_box': { width: 0.6, height: 1.9 },
  'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: 'no' }] },
  'minecraft:fire_immune': true,
}

// what mc-rpg-core ships today
const CONTROL = {
  ...BASE,
  'minecraft:physics': {},
  'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
  'minecraft:knockback_resistance': { value: 1 },
  'minecraft:movement': { value: 0 },
  'minecraft:movement.basic': {},
  'minecraft:navigation.walk': {},
  'minecraft:water_movement': { drag_factor: 0 },
}

const without = (o, ...keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)))

// Each variant occupies its own channel. `custom` variants are declared by this pack; `vanilla`
// variants are summoned by identifier as references.
const VARIANTS = [
  { slug: 'bare', kind: 'custom', note: 'positive control: physics + health only', components: { ...BASE, 'minecraft:physics': {} } },
  { slug: 'ctrl', kind: 'custom', note: 'the mc-rpg-core set as shipped', components: CONTROL },
  { slug: 'nodrag', kind: 'custom', note: 'mc-rpg-core set without water_movement', components: without(CONTROL, 'minecraft:water_movement') },
  { slug: 'drag1', kind: 'custom', note: 'water_movement drag_factor 1', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: 1 } } },
  { slug: 'drag1k', kind: 'custom', note: 'water_movement drag_factor 1000', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: 1000 } } },
  { slug: 'dragneg', kind: 'custom', note: 'water_movement drag_factor -1', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -1 } } },
  { slug: 'dragn2', kind: 'custom', note: 'water_movement drag_factor -2', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -2 } } },
  { slug: 'dragn3', kind: 'custom', note: 'water_movement drag_factor -3', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -3 } } },
  { slug: 'dragn5', kind: 'custom', note: 'water_movement drag_factor -5', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -5 } } },
  { slug: 'dragn10', kind: 'custom', note: 'water_movement drag_factor -10', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -10 } } },
  { slug: 'dragn100', kind: 'custom', note: 'water_movement drag_factor -100', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -100 } } },
  { slug: 'dragn125', kind: 'custom', note: 'water_movement drag_factor -1.25', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -1.25 } } },
  { slug: 'dragn15', kind: 'custom', note: 'water_movement drag_factor -1.5', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -1.5 } } },
  { slug: 'dragn175', kind: 'custom', note: 'water_movement drag_factor -1.75', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -1.75 } } },
  { slug: 'dragn105', kind: 'custom', note: 'water_movement drag_factor -1.05', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -1.05 } } },
  { slug: 'dragn11', kind: 'custom', note: 'water_movement drag_factor -1.1', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -1.1 } } },
  { slug: 'dragn12', kind: 'custom', note: 'water_movement drag_factor -1.2', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -1.2 } } },
  { slug: 'deepctrl', kind: 'custom', deep: true, note: 'the mc-rpg-core set, fully submerged (water at head height too)', components: CONTROL },
  { slug: 'deepbuoy', kind: 'custom', deep: true, note: 'fully submerged, plus minecraft:buoyant base_buoyancy 1', components: { ...CONTROL, 'minecraft:buoyant': { apply_gravity: true, simulate_waves: false, base_buoyancy: 1.0, big_wave_probability: 0, drag_down_on_buoyancy_removed: 0, liquid_blocks: ['minecraft:water'] } } },
  { slug: 'dragn15far', kind: 'custom', spawnX: 6.5, note: 'drag_factor -1.5, placed downstream at x 6.5 instead of 3.5', components: { ...CONTROL, 'minecraft:water_movement': { drag_factor: -1.5 } } },
  { slug: 'uwm0', kind: 'custom', note: 'plus underwater_movement 0', components: { ...CONTROL, 'minecraft:underwater_movement': { value: 0 } } },
  { slug: 'noai', kind: 'custom', note: 'no movement / navigation components at all', components: without(CONTROL, 'minecraft:movement', 'minecraft:movement.basic', 'minecraft:navigation.walk') },
  { slug: 'nophys', kind: 'custom', note: 'no minecraft:physics component', components: without(CONTROL, 'minecraft:physics') },
  { slug: 'nograv', kind: 'custom', note: 'physics has_gravity false', components: { ...CONTROL, 'minecraft:physics': { has_gravity: false } } },
  { slug: 'nocoll', kind: 'custom', note: 'physics has_collision false, gravity on', components: { ...CONTROL, 'minecraft:physics': { has_collision: false } } },
  { slug: 'nogc', kind: 'custom', note: 'physics has_gravity false + has_collision false', components: { ...CONTROL, 'minecraft:physics': { has_gravity: false, has_collision: false } } },
  { slug: 'buoyant', kind: 'custom', note: 'plus minecraft:buoyant, base_buoyancy 1', components: { ...CONTROL, 'minecraft:buoyant': { apply_gravity: true, simulate_waves: false, base_buoyancy: 1.0, big_wave_probability: 0, drag_down_on_buoyancy_removed: 0, liquid_blocks: ['minecraft:water'] } } },
  { slug: 'sink', kind: 'custom', note: 'buoyant base_buoyancy 0, gravity applied', components: { ...CONTROL, 'minecraft:buoyant': { apply_gravity: true, simulate_waves: false, base_buoyancy: 0, big_wave_probability: 0, drag_down_on_buoyancy_removed: 0, liquid_blocks: ['minecraft:water'] } } },
  { slug: 'kbmax', kind: 'custom', note: 'knockback_resistance value 1 max 1', components: { ...CONTROL, 'minecraft:knockback_resistance': { value: 1, max: 1 } } },
  { slug: 'kb100', kind: 'custom', note: 'knockback_resistance value 100', components: { ...CONTROL, 'minecraft:knockback_resistance': { value: 100 } } },
  { slug: 'tinybox', kind: 'custom', note: 'collision_box 0.01 x 0.01', components: { ...CONTROL, 'minecraft:collision_box': { width: 0.01, height: 0.01 } } },
  { slug: 'kitchen', kind: 'custom', note: 'every immobility component together, no AI, gravity and collision kept', components: { ...without(CONTROL, 'minecraft:movement', 'minecraft:movement.basic', 'minecraft:navigation.walk'), 'minecraft:physics': {}, 'minecraft:water_movement': { drag_factor: -100 }, 'minecraft:underwater_movement': { value: 0 }, 'minecraft:knockback_resistance': { value: 1, max: 1 }, 'minecraft:buoyant': { apply_gravity: false, simulate_waves: false, base_buoyancy: 0, big_wave_probability: 0, drag_down_on_buoyancy_removed: 0, liquid_blocks: ['minecraft:water'] } } },
  { slug: 'anchored', kind: 'custom', note: 'the mc-rpg-core set, made to ride an immobile anchor entity', components: { ...CONTROL, 'minecraft:type_family': { family: ['probe_actor'] } }, rides: true },
  { slug: 'v_armorstand', kind: 'vanilla', vanillaId: 'minecraft:armor_stand' },
  { slug: 'v_shulker', kind: 'vanilla', vanillaId: 'minecraft:shulker' },
  { slug: 'v_npc', kind: 'vanilla', vanillaId: 'minecraft:npc' },
  { slug: 'v_boat', kind: 'vanilla', vanillaId: 'minecraft:boat' },
  { slug: 'v_villager', kind: 'vanilla', vanillaId: 'minecraft:villager_v2' },
  { slug: 'v_item', kind: 'item', note: 'positive control: a dropped item, no AI of any kind' },
]

// the mount for the `anchored` variant: no gravity, no collision, rideable
const ANCHOR = {
  ...BASE,
  'minecraft:physics': {},
  'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
  'minecraft:knockback_resistance': { value: 1, max: 1 },
  'minecraft:water_movement': { drag_factor: -1.5 },
  'minecraft:rideable': { seat_count: 1, family_types: ['probe_actor'], seats: [{ position: [0, 0, 0] }] },
  'minecraft:type_family': { family: ['probe_anchor'] },
}

const entityFile = (identifier, components) => ({
  format_version: '1.21.0',
  'minecraft:entity': {
    description: { identifier, is_spawnable: false, is_summonable: true },
    components,
  },
})

// ---------------------------------------------------------------- pack authoring

const manifest = {
  format_version: 2,
  header: { name: 'water displacement probe', description: 'water displacement probe', uuid: PACK, version: [1, 0, 0], min_engine_version: MIN_ENGINE },
  modules: [
    { description: 'data', type: 'data', uuid: MODULE, version: [1, 0, 0] },
    { description: 'script', type: 'script', language: 'javascript', uuid: SCRIPT, entry: 'scripts/main.js', version: [1, 0, 0] },
  ],
  dependencies: [{ module_name: '@minecraft/server', version: SCRIPT_API }],
}

// Geometry, per variant lane n at z = n * 6:
//   stone slab  x -1..31, y 68..71, z (lane-1)..(lane+1)
//   carved      x  0..30, y 70..71, z lane            -> a 1-wide, 2-tall channel closed at x=-1
//   water src   x  0,     y 70,     z lane            -> flows in +x
//   subject     x  3.5,   y 70,     z lane+0.5        -> three blocks downstream of the source
const LANE_STRIDE = 6
const SPAWN_X = 3.5
const SPAWN_Y = 70

const script = String.raw`import { system, world, ItemStack } from '@minecraft/server'

const TAG = 'PROBE water '
const VARIANTS = ${JSON.stringify(VARIANTS.map((v) => ({ slug: v.slug, kind: v.kind, id: v.kind === 'vanilla' ? v.vanillaId : v.kind === 'item' ? 'minecraft:item' : 'wp:' + v.slug, rides: !!v.rides, deep: !!v.deep, x: v.spawnX || SPAWN_X, note: v.note || '' })))}
const STRIDE = ${LANE_STRIDE}
const SPAWN_X = ${SPAWN_X}
const SPAWN_Y = ${SPAWN_Y}

const say = (s) => console.warn(TAG + String(s).replaceAll('[', '(').replaceAll(']', ')'))
const f = (n) => (typeof n === 'number' ? n.toFixed(4) : String(n))
// resolved lazily: getDimension is refused during early execution
let dim = null
const cmd = (c) => {
  try {
    dim.runCommand(c)
    return 'ok'
  } catch (e) {
    return 'THREW ' + ((e && e.message) || e)
  }
}

const subjects = []

system.runTimeout(() => {
  dim = world.getDimension('overworld')
  say('phase=setup')
  say('tickingarea=' + cmd('tickingarea add -8 0 -8 24 200 ' + (VARIANTS.length * STRIDE + 8) + ' probearea'))
  say('gamerule-mobspawn=' + cmd('gamerule doMobSpawning false'))
  say('gamerule-daylight=' + cmd('gamerule doDayLightCycle false'))
  say('gamerule-mobgriefing=' + cmd('gamerule mobGriefing false'))

  // the ticking area's chunks are not loaded on the tick it is declared, and a fill into an
  // unloaded chunk is silently dropped, so build only once the far lane's cell reads back
  let waited = 0
  const loading = system.runInterval(() => {
    waited += 20
    let ready = false
    try {
      const near = dim.getBlock({ x: 0, y: 70, z: 0 })
      const far = dim.getBlock({ x: 30, y: 70, z: (VARIANTS.length - 1) * STRIDE })
      ready = !!near && !!far
    } catch (e) {
      ready = false
    }
    if (!ready && waited < 600) return
    system.clearRun(loading)
    say('chunks-ready=' + ready + ' after-ticks=' + waited)
    build()
  }, 20)
}, 120)

function build() {
  say('phase=build')
  // one channel per variant, plus a trailing empty one for the spread test
  for (let i = 0; i <= VARIANTS.length; i++) {
    const z = i * STRIDE
    const a = cmd('fill -1 68 ' + (z - 1) + ' 31 71 ' + (z + 1) + ' stone')
    const b = cmd('fill 0 70 ' + z + ' 30 71 ' + z + ' air')
    if (a !== 'ok' || b !== 'ok') say('fill lane=' + i + ' stone=' + a + ' carve=' + b)
  }
  let floor = 'unknown'
  try {
    const bl = dim.getBlock({ x: 3, y: 69, z: 0 })
    floor = bl ? bl.typeId : 'null'
  } catch (e) {
    floor = 'THREW'
  }
  say('floor-block-at-3/69/0=' + floor)

  system.runTimeout(() => {
    say('phase=spawn')
    for (let i = 0; i < VARIANTS.length; i++) {
      const v = VARIANTS[i]
      const z = i * STRIDE
      const loc = { x: v.x, y: SPAWN_Y, z: z + 0.5 }
      let e = null
      try {
        e = v.kind === 'item' ? dim.spawnItem(new ItemStack('minecraft:stone', 1), loc) : dim.spawnEntity(v.id, loc)
        e.addTag('t_' + v.slug)
      } catch (err) {
        say('spawn ' + v.slug + ' id=' + v.id + ' THREW ' + ((err && err.message) || err))
      }
      if (v.rides) {
        try {
          const m = dim.spawnEntity('wp:anchor', loc)
          m.addTag('anchor_' + v.slug)
          const rideCmd = 'ride @e[tag=t_' + v.slug + '] start_riding @e[tag=anchor_' + v.slug + ']'
          say('ride ' + v.slug + '=' + cmd(rideCmd))
        } catch (err) {
          say('anchor ' + v.slug + ' THREW ' + ((err && err.message) || err))
        }
      }
      subjects.push({ v, e, start: e ? { x: e.location.x, y: e.location.y, z: e.location.z } : null })
    }

    system.runTimeout(() => {
      say('phase=water')
      // A source block placed alone does not spread here — liquid flow does not tick with no player
      // in the world — so the current is written out block by block: a source at the closed end and
      // a descending flowing_water gradient downstream, which is the field a spreading source would
      // have produced.
      for (let i = 0; i < VARIANTS.length; i++) {
        const z = i * STRIDE
        const r0 = cmd('setblock 0 70 ' + z + ' water')
        let worst = 'ok'
        for (let x = 1; x <= 7; x++) {
          const r = cmd('setblock ' + x + ' 70 ' + z + ' flowing_water ["liquid_depth"=' + x + ']')
          if (r !== 'ok') worst = r
        }
        // a deep lane gets a second water layer at head height, so the subject is fully submerged
        // and any buoyant lift shows up in y
        if (VARIANTS[i].deep) {
          cmd('setblock 0 71 ' + z + ' water')
          for (let x = 1; x <= 7; x++) cmd('setblock ' + x + ' 71 ' + z + ' flowing_water ["liquid_depth"=' + x + ']')
        }
        if (i === 0 || r0 !== 'ok' || worst !== 'ok') say('setblock lane=' + i + ' source=' + r0 + ' gradient=' + worst)
      }

      // the spread lane gets a bare source and nothing else, to show what a source alone does here
      const spreadZ = VARIANTS.length * STRIDE
      say('spread-source=' + cmd('setblock 0 70 ' + spreadZ + ' water'))
      for (const at of [20, 140, 260]) {
        system.runTimeout(() => {
          const row = []
          for (let x = 0; x <= 5; x++) {
            let b = null
            try {
              b = dim.getBlock({ x, y: 70, z: spreadZ })
            } catch (e) {}
            row.push(x + ':' + (b ? b.typeId.replace('minecraft:', '') + '/' + safeState(b, 'liquid_depth') : 'null'))
          }
          say('spread-row t=' + at + ' ' + row.join(' '))
        }, at)
      }

      // confirm the current reached each subject's cell before believing any null result
      for (const at of [20, 60, 140, 260]) {
        system.runTimeout(() => {
          const row = []
          for (let x = 0; x <= 9; x++) {
            let b = null
            try {
              b = dim.getBlock({ x, y: 70, z: 0 })
            } catch (e) {}
            row.push(x + ':' + (b ? b.typeId.replace('minecraft:', '') + '/' + safeState(b, 'liquid_depth') : 'null'))
          }
          say('lane0-row t=' + at + ' ' + row.join(' '))
        }, at)
      }

      system.runTimeout(() => {
        say('phase=confirm')
        for (const s of subjects) {
          if (!s.e) continue
          let cell = 'unknown'
          try {
            const b = dim.getBlock({ x: Math.floor(s.v.x), y: 70, z: Math.floor(s.start.z) })
            cell = b ? b.typeId + '@depth=' + safeState(b, 'liquid_depth') : 'null'
          } catch (err) {
            cell = 'THREW ' + ((err && err.message) || err)
          }
          say('cell ' + s.v.slug + ' block=' + cell)
        }
      }, 200)

      let tick = 0
      const handle = system.runInterval(() => {
        tick += 20
        for (const s of subjects) {
          if (!s.e) continue
          let l
          try {
            l = s.e.location
          } catch (err) {
            say('sample ' + s.v.slug + ' t=' + tick + ' GONE ' + ((err && err.message) || err))
            continue
          }
          if (tick % 100 === 0) say('sample ' + s.v.slug + ' t=' + tick + ' x=' + f(l.x) + ' y=' + f(l.y) + ' z=' + f(l.z))
          s.last = { x: l.x, y: l.y, z: l.z }
        }
        if (tick >= 400) {
          system.clearRun(handle)
          say('phase=summary')
          for (const s of subjects) {
            if (!s.e || !s.last) {
              say('SUMMARY ' + s.v.slug + ' id=' + s.v.id + ' NO-SUBJECT')
              continue
            }
            const dx = s.last.x - s.start.x
            const dy = s.last.y - s.start.y
            const dz = s.last.z - s.start.z
            const dxz = Math.sqrt(dx * dx + dz * dz)
            say(
              'SUMMARY ' + s.v.slug +
                ' id=' + s.v.id +
                ' start=' + f(s.start.x) + '/' + f(s.start.y) + '/' + f(s.start.z) +
                ' end=' + f(s.last.x) + '/' + f(s.last.y) + '/' + f(s.last.z) +
                ' dx=' + f(dx) + ' dy=' + f(dy) + ' dz=' + f(dz) +
                ' dxz=' + f(dxz) +
                ' drifted=' + (dxz > 0.05 ? 'YES' : 'no') +
                ' rose=' + (dy > 0.05 ? 'YES' : dy < -0.05 ? 'FELL' : 'no') +
                ' note=' + s.v.note,
            )
          }
          say('phase=done')
        }
      }, 20)
    }, 40)
  }, 60)
}

function safeState(block, name) {
  try {
    const v = block.permutation.getState(name)
    return v === undefined ? 'unset' : String(v)
  } catch (e) {
    return 'err'
  }
}
`

// ---------------------------------------------------------------- container control

const removeContainer = () => d(['rm', '-f', PROJECT]).catch(() => {})

// the volume goes too: a reused world would carry the previous run's channels and subjects
async function startFresh() {
  await removeContainer()
  await d(['volume', 'rm', VOLUME]).catch(() => {})
  await d([
    'run', '-d', '--name', PROJECT,
    '-e', 'EULA=TRUE',
    '-e', 'VERSION=' + VERSION,
    '-e', 'LEVEL_NAME=' + LEVEL,
    '-e', 'GAMEMODE=creative',
    '-e', 'ALLOW_CHEATS=true',
    '-e', 'LEVEL_TYPE=FLAT',
    '-e', 'SERVER_NAME=' + PROJECT,
    '-e', 'CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true',
    '-v', VOLUME + ':/data',
    IMAGE,
  ])
}

async function logsSince(since) {
  const r = await d(['logs', ...(since ? ['--since', since] : []), PROJECT]).catch(() => ({ stdout: '', stderr: '' }))
  return (r.stdout || '') + (r.stderr || '')
}

const FATAL = /is not allowed\.|Failed to bulk-set properties|EULA/i

async function waitFor(pattern, timeoutMs, since) {
  const deadline = Date.now() + timeoutMs
  let text = ''
  while (Date.now() < deadline) {
    text = await logsSince(since)
    if (pattern.test(text)) return text
    const fatal = text.split('\n').find((l) => FATAL.test(l) && /ERROR|Failed/.test(l))
    if (fatal) throw new Error('server refused to boot: ' + fatal.trim())
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('timed out waiting for ' + pattern + '\nlast log tail:\n' + text.split('\n').slice(-15).join('\n'))
}

// ---------------------------------------------------------------- main

const stageDir = await mkdtemp(join(tmpdir(), 'rpg-water-'))
const root = join(stageDir, PACK)
await mkdir(join(root, 'scripts'), { recursive: true })
await mkdir(join(root, 'entities'), { recursive: true })
await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2))
await writeFile(join(root, 'scripts', 'main.js'), script)
for (const v of VARIANTS) {
  if (v.kind !== 'custom') continue
  await writeFile(join(root, 'entities', v.slug + '.json'), JSON.stringify(entityFile('wp:' + v.slug, v.components), null, 2))
}
await writeFile(join(root, 'entities', 'anchor.json'), JSON.stringify(entityFile('wp:anchor', ANCHOR), null, 2))

log('docker host: ' + (process.env.DOCKER_HOST || '(local)'))
log('image: ' + IMAGE + '   requested VERSION: ' + VERSION)
log('staged pack in ' + stageDir)
log('variants: ' + VARIANTS.map((v) => v.slug).join(' '))
log('')
for (const v of VARIANTS) {
  if (v.kind === 'custom') log('  ' + v.slug.padEnd(14) + JSON.stringify(v.components))
  else log('  ' + v.slug.padEnd(14) + 'vanilla ' + v.vanillaId)
}

try {
  await startFresh()
  await waitFor(/Server started|IPv4 supported/, 420000)
  const boot = await logsSince()
  const ver = boot.match(/Version[:\s]+([\d.]+)/)
  log('\nserver version: ' + (ver ? ver[1] : '(not reported)'))

  await d(['exec', PROJECT, 'sh', '-c', 'rm -rf /data/development_behavior_packs && mkdir -p /data/development_behavior_packs'])
  await d(['cp', root, PROJECT + ':/data/development_behavior_packs/'])
  const json = JSON.stringify([{ pack_id: PACK, version: [1, 0, 0] }])
  await d(['exec', PROJECT, 'sh', '-c',
    "mkdir -p '/data/worlds/" + LEVEL + "' && printf '%s' '" + json + "' > '/data/worlds/" + LEVEL + "/world_behavior_packs.json'"])
  log('activation list: ' + json)

  const mark = new Date().toISOString()
  await d(['restart', PROJECT])
  try {
    await waitFor(/PROBE water phase=done/, 420000, mark)
  } catch (e) {
    log('  ' + e.message)
  }
  const text = await logsSince(mark)
  const lines = text
    .split('\n')
    .filter((l) => /PROBE|Pack Stack|rror|ailed|nsupported/i.test(l))
    .map((l) => l.trim())
  log('\n' + (lines.length ? lines.join('\n') : '  (nothing matched)'))
} finally {
  if (KEEP) {
    log('\n=== kept: container ' + PROJECT + ', volume ' + VOLUME + ', stage ' + stageDir)
  } else {
    log('\n=== teardown')
    await removeContainer()
    await d(['volume', 'rm', VOLUME]).catch((e) => log('  volume rm: ' + e.message))
    await rm(stageDir, { recursive: true, force: true })
    log('  container and volume removed')
  }
}
