#!/usr/bin/env node
// Probes whether entity components alone can make a custom Bedrock entity immune to piston
// displacement, separating two stimuli:
//
//   A  arm push       — a piston arm extends into the block the entity stands in
//   B  block carriage — a piston pushes the block the entity is standing ON, sideways
//
// One behavior pack declares many entity variants, each a different component hypothesis. Every
// variant, plus a set of vanilla entities measured as-is, gets an identical stimulus in its own
// lane; the pack's script records each subject's position before powering the piston and twice
// after, and reports through console.warn, which the server prints once
// content-log-console-output-enabled is set.
//
// Positions come from the script API's `entity.location` rather than from `querytarget`: a command
// a script runs prints nothing to the server console, and `location` carries the same value at
// better precision.
//
// Stimulus verification is in-band. A calibration phase first fires one piston per
// `facing_direction` value in an empty scratch arena and reports which neighbour the arm landed in,
// which is what fixes the value the measurement lanes use — on a piston the horizontal
// `facing_direction` values point away from where the arm goes. Every lane then reports the block
// sitting where the arm should be after the piston is powered, so a lane whose piston never
// extended is visible in the output and cannot be read as a null result. Lanes carrying entities
// expected to move are the positive controls.
//
// Headless: no Minecraft client is involved.
//
// Usage: node probe.mjs [--keep]

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const PROJECT = 'rpg-piston-probe'
const VOLUME = PROJECT + '_data'
const IMAGE = 'itzg/minecraft-bedrock-server:latest'
const VERSION = '1.26.43.1'
const SCRIPT_API = '2.0.0'
const MIN_ENGINE = [1, 21, 0]
const LEVEL = 'piston'
const KEEP = process.argv.includes('--keep')
// Authors the pack and stops, for checking the generated script without a server.
const STAGE_ONLY = process.argv.includes('--stage-only')

const PACK_UUID = '7b2c0000-0000-4000-8000-000000000001'
const DATA_UUID = '7b2c0000-0000-4000-8000-0000000000a1'
const SCRIPT_UUID = '7b2c0000-0000-4000-8000-0000000000b1'

const log = (...a) => console.log(...a)
const d = (args) => exec('docker', args, { maxBuffer: 64 * 1024 * 1024 })

// ---------------------------------------------------------------- the hypotheses

// Shared by every custom variant so that neither despawning nor piston crush damage can be
// mistaken for the thing being measured. Neither bears on being pushed.
const COMMON = {
  'minecraft:health': { value: 20, max: 20 },
  'minecraft:persistent': {},
  'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: 'no' }] },
}

const BOX = { 'minecraft:collision_box': { width: 0.6, height: 1.9 } }

// The component set mc-rpg-core's actors carry today.
const CURRENT = {
  'minecraft:physics': {},
  ...BOX,
  'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
  'minecraft:knockback_resistance': { value: 1 },
  'minecraft:movement': { value: 0 },
  'minecraft:movement.basic': {},
  'minecraft:navigation.walk': { can_path_over_water: false },
  'minecraft:water_movement': { drag_factor: 0 },
  'minecraft:behavior.look_at_player': { priority: 1, look_distance: 12, probability: 1 },
}

const VARIANTS = [
  // control: what mc-rpg-core ships today
  { slug: 'current', note: 'the mc-rpg-core actor set', components: { ...CURRENT } },

  // positive control: nothing suppressing displacement at all
  { slug: 'bare', note: 'physics + box only, no pushable component', components: { 'minecraft:physics': {}, ...BOX } },

  // pushable / knockback / push_through in isolation
  {
    slug: 'pushable_false',
    note: 'pushable{is_pushable:false,is_pushable_by_piston:false} alone',
    components: { 'minecraft:physics': {}, ...BOX, 'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false } },
  },
  {
    slug: 'pushable_piston_only',
    note: 'pushable{is_pushable:true,is_pushable_by_piston:false}',
    components: { 'minecraft:physics': {}, ...BOX, 'minecraft:pushable': { is_pushable: true, is_pushable_by_piston: false } },
  },
  {
    slug: 'kbr',
    note: 'knockback_resistance{value:1} alone',
    components: { 'minecraft:physics': {}, ...BOX, 'minecraft:knockback_resistance': { value: 1, max: 1 } },
  },
  {
    slug: 'push_through',
    note: 'push_through{value:0} alone',
    components: { 'minecraft:physics': {}, ...BOX, 'minecraft:push_through': { value: 0 } },
  },

  // minecraft:physics fields
  {
    slug: 'nograv',
    note: 'physics{has_gravity:false}',
    components: { 'minecraft:physics': { has_gravity: false }, ...BOX },
  },
  {
    slug: 'nocollide',
    note: 'physics{has_collision:false}',
    components: { 'minecraft:physics': { has_collision: false }, ...BOX },
  },
  {
    slug: 'nocollide_nograv',
    note: 'physics{has_collision:false,has_gravity:false}',
    components: { 'minecraft:physics': { has_collision: false, has_gravity: false }, ...BOX },
  },
  {
    slug: 'no_push_to_space',
    note: 'physics{push_towards_closest_space:false}',
    components: { 'minecraft:physics': { push_towards_closest_space: false }, ...BOX },
  },
  { slug: 'nophysics', note: 'no minecraft:physics component at all', components: { ...BOX } },
  {
    slug: 'nophysics_nopush',
    note: 'no physics component + pushable false',
    components: { ...BOX, 'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false } },
  },

  // collision box geometry
  {
    slug: 'tinybox',
    note: 'collision_box 0.01 x 0.01, physics on',
    components: { 'minecraft:physics': {}, 'minecraft:collision_box': { width: 0.01, height: 0.01 } },
  },
  {
    slug: 'tinybox_nophysics',
    note: 'collision_box 0.01 x 0.01, no physics component',
    components: { 'minecraft:collision_box': { width: 0.01, height: 0.01 } },
  },

  // combinations on top of the shipped set
  {
    slug: 'current_nocollide',
    note: 'the mc-rpg-core set + physics{has_collision:false}',
    components: { ...CURRENT, 'minecraft:physics': { has_collision: false } },
  },
  {
    slug: 'current_nograv_nocollide',
    note: 'the mc-rpg-core set + physics{has_collision:false,has_gravity:false}',
    components: { ...CURRENT, 'minecraft:physics': { has_collision: false, has_gravity: false } },
  },
  {
    slug: 'kitchen_sink',
    note: 'every suppressor at once: no physics, pushable false, kbr 1, push_through 0, tiny box, movement 0',
    components: {
      'minecraft:collision_box': { width: 0.01, height: 0.01 },
      'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
      'minecraft:knockback_resistance': { value: 1, max: 1 },
      'minecraft:push_through': { value: 0 },
      'minecraft:movement': { value: 0 },
      'minecraft:water_movement': { drag_factor: 0 },
    },
  },

  // AI / anchoring: does a behaviour that pins position resist, or at least restore?
  {
    slug: 'home_tether',
    note: 'home{restriction_radius:1} + behavior.go_home, movement 0.4, navigation.walk',
    components: {
      'minecraft:physics': {},
      ...BOX,
      'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
      'minecraft:home': { restriction_radius: 1 },
      'minecraft:movement': { value: 0.4 },
      'minecraft:movement.basic': {},
      'minecraft:navigation.walk': { can_path_over_water: false },
      'minecraft:behavior.go_home': { priority: 1, speed_multiplier: 1 },
    },
  },
  {
    slug: 'sittable',
    note: 'sittable + behavior.stay_while_sitting, the sit event triggered from script on spawn',
    components: {
      'minecraft:physics': {},
      ...BOX,
      'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
      'minecraft:sittable': { sit_event: { event: 'probe:sit' }, stand_event: { event: 'probe:stand' } },
      'minecraft:behavior.stay_while_sitting': { priority: 0 },
    },
    events: {
      'probe:sit': { add: { component_groups: ['probe:sitting'] } },
      'probe:stand': { remove: { component_groups: ['probe:sitting'] } },
    },
    componentGroups: { 'probe:sitting': { 'minecraft:behavior.stay_while_sitting': { priority: 0 } } },
  },
]

// Vanilla entities measured as-is. `pig` is the vanilla positive control: it is expected to move.
const VANILLA = [
  'minecraft:pig',
  'minecraft:zombie',
  'minecraft:armor_stand',
  'minecraft:npc',
  'minecraft:shulker',
  'minecraft:ender_crystal',
  'minecraft:iron_golem',
  'minecraft:boat',
]

const SUBJECTS = [
  ...VARIANTS.map((v) => ({ id: 'probe:' + v.slug, label: v.slug, note: v.note, sit: v.slug === 'sittable' })),
  ...VANILLA.map((t) => ({ id: t, label: t.replace('minecraft:', 'vanilla_'), note: 'vanilla, as-is', sit: false })),
]

// ---------------------------------------------------------------- pack authoring

const manifest = {
  format_version: 2,
  header: {
    name: 'piston displacement probe',
    description: 'piston displacement probe',
    uuid: PACK_UUID,
    version: [1, 0, 0],
    min_engine_version: MIN_ENGINE,
  },
  modules: [
    { description: 'data', type: 'data', uuid: DATA_UUID, version: [1, 0, 0] },
    {
      description: 'script',
      type: 'script',
      language: 'javascript',
      uuid: SCRIPT_UUID,
      entry: 'scripts/main.js',
      version: [1, 0, 0],
    },
  ],
  dependencies: [{ module_name: '@minecraft/server', version: SCRIPT_API }],
}

const entityFile = (v) => ({
  format_version: '1.21.0',
  'minecraft:entity': {
    description: {
      identifier: 'probe:' + v.slug,
      is_spawnable: false,
      is_summonable: true,
      is_experimental: false,
    },
    ...(v.componentGroups ? { component_groups: v.componentGroups } : {}),
    components: { ...COMMON, ...v.components },
    ...(v.events ? { events: v.events } : {}),
  },
})

// Arena geometry. Region A tests the arm push, region B the carried block; they share z lanes and
// sit 36 blocks apart in x so one stimulus cannot reach the other.
const LANE_DZ = 4
const A_X = 0 // piston
const B_X = 39 // piston
const Y = 1
// The value that makes the arm extend toward +x. Calibrated in-band before the measurement.
const FACING_PLUS_X = 4
const CAL_X = 200
const CAL_Z = 200

const MAIN_JS = (subjects) => String.raw`import { system, world } from '@minecraft/server'

const TAG = 'PISTON '
const SUBJECTS = ${JSON.stringify(subjects)}
const LANE_DZ = ${LANE_DZ}
const A_X = ${A_X}
const B_X = ${B_X}
const Y = ${Y}
const FACING_PLUS_X = ${FACING_PLUS_X}
const CAL_X = ${CAL_X}
const CAL_Z = ${CAL_Z}

const warn = (s) => console.warn(TAG + String(s).replaceAll('[', '(').replaceAll(']', ')'))
// Resolved lazily: World::getDimension throws "cannot be used in early execution" at module scope.
let _dim
const D = () => (_dim ??= world.getDimension('overworld'))
const n = (v) => (typeof v === 'number' ? v.toFixed(3) : '?')
const pos = (l) => (l ? n(l.x) + ',' + n(l.y) + ',' + n(l.z) : 'gone')
const cmd = (c) => {
  try {
    D().runCommand(c)
    return true
  } catch (e) {
    warn('command-failed ' + c + ' :: ' + ((e && e.message) || e))
    return false
  }
}
const where = (e) => {
  try {
    return e ? e.location : undefined
  } catch (err) {
    return undefined
  }
}
const blockAt = (x, y, z) => {
  try {
    const b = D().getBlock({ x, y, z })
    return b ? b.typeId : 'unloaded'
  } catch (e) {
    return 'error:' + ((e && e.message) || e)
  }
}

const laneZ = (i) => i * LANE_DZ
const ZMAX = laneZ(SUBJECTS.length) + 4

const state = { A: [], B: [] }

const step = (fn, ticks) => system.runTimeout(fn, ticks)

// -------------------------------------------------------------- setup

step(() => {
  cmd('tickingarea add -16 0 -16 ' + (B_X + 24) + ' 32 ' + ZMAX + ' probearea')
  cmd('gamerule dodaylightcycle false')
  cmd('gamerule domobspawning false')
  cmd('gamerule mobgriefing false')
  cmd('gamerule doweathercycle false')
  cmd('time set midnight')
  cmd('tickingarea add ' + (CAL_X - 16) + ' 0 ' + (CAL_Z - 16) + ' ' + (CAL_X + 16) + ' 32 ' + (CAL_Z + 16) + ' calarea')
  warn('setup :: subjects=' + SUBJECTS.length + ' zmax=' + ZMAX)
  step(calBuild, 100)
}, 60)

// -------------------------------------------------------------- calibration

// One piston per facing_direction value in empty air, each powered by a redstone block underneath,
// so the direction the arm actually travels is read off the world rather than assumed.
function calBuild() {
  cmd('fill ' + (CAL_X - 4) + ' 2 ' + (CAL_Z - 4) + ' ' + (CAL_X + 4) + ' 10 ' + (CAL_Z + 20) + ' air')
  for (let f = 0; f < 6; f++) {
    cmd('setblock ' + CAL_X + ' 5 ' + (CAL_Z + f * 3) + ' piston ["facing_direction"=' + f + ']')
  }
  step(calPower, 40)
}

function calPower() {
  for (let f = 0; f < 6; f++) cmd('setblock ' + CAL_X + ' 4 ' + (CAL_Z + f * 3) + ' redstone_block')
  step(calRead, 60)
}

function calRead() {
  warn('=== CALIBRATION :: where the arm lands for each piston facing_direction')
  for (let f = 0; f < 6; f++) {
    const z = CAL_Z + f * 3
    const arm = [
      ['+x', blockAt(CAL_X + 1, 5, z)],
      ['-x', blockAt(CAL_X - 1, 5, z)],
      ['+z', blockAt(CAL_X, 5, z + 1)],
      ['-z', blockAt(CAL_X, 5, z - 1)],
      ['+y', blockAt(CAL_X, 6, z)],
    ]
      .filter((e) => e[1].indexOf('piston_arm_collision') >= 0)
      .map((e) => e[0])
    warn('cal facing_direction=' + f + ' arm=' + (arm.length ? arm.join(',') : 'did-not-extend'))
  }
  warn('cal :: the measurement lanes use facing_direction=' + FACING_PLUS_X + ' to push toward +x')
  step(phaseABuild, 40)
}

// -------------------------------------------------------------- phase A: arm push

function phaseABuild() {
  // The world persists on the volume across runs, so the arena is cleared before it is rebuilt:
  // a redstone block left powered by an earlier run would fire its piston before any baseline.
  cmd('kill @e')
  cmd('fill ' + (A_X - 4) + ' ' + Y + ' -4 ' + (A_X + 8) + ' ' + (Y + 3) + ' ' + ZMAX + ' air')
  cmd('fill ' + (A_X - 4) + ' 0 -4 ' + (A_X + 8) + ' 0 ' + ZMAX + ' stone')
  for (let i = 0; i < SUBJECTS.length; i++) {
    const z = laneZ(i)
    // piston at A_X facing east; the block it will push into is A_X+1, where the subject stands
    cmd('setblock ' + A_X + ' ' + Y + ' ' + z + ' piston ["facing_direction"=' + FACING_PLUS_X + ']')
  }
  warn('A-built :: pistons placed at x=' + A_X + ' facing_direction=' + FACING_PLUS_X + ', arm travelling +x')
  step(phaseASpawn, 40)
}

function phaseASpawn() {
  for (let i = 0; i < SUBJECTS.length; i++) {
    const s = SUBJECTS[i]
    const z = laneZ(i)
    const loc = { x: A_X + 1.5, y: Y, z: z + 0.5 }
    let e
    try {
      e = D().spawnEntity(s.id, loc)
      if (s.sit) {
        try {
          e.triggerEvent('probe:sit')
        } catch (err) {
          warn('sit-event-failed ' + s.label + ' :: ' + ((err && err.message) || err))
        }
      }
    } catch (err) {
      warn('spawn-failed A ' + s.label + ' :: ' + ((err && err.message) || err))
    }
    state.A.push({ s, e, z })
  }
  warn('A-spawned :: ' + state.A.filter((r) => r.e).length + '/' + SUBJECTS.length)
  step(phaseAFire, 60)
}

function phaseAFire() {
  for (const r of state.A) r.before = where(r.e)
  for (let i = 0; i < SUBJECTS.length; i++) {
    cmd('setblock ' + (A_X - 1) + ' ' + Y + ' ' + laneZ(i) + ' redstone_block')
  }
  warn('A-powered :: redstone_block at x=' + (A_X - 1))
  step(() => phaseARead(1, 60), 60)
}

function phaseARead(which, more) {
  for (const r of state.A) r['after' + which] = where(r.e)
  if (more) {
    step(() => phaseARead(2, 0), more)
    return
  }
  warn('=== RESULTS A arm-push :: a piston arm extends into the block the subject stands in')
  for (const r of state.A) {
    const arm = 'at-subject-block=' + blockAt(A_X + 1, Y, r.z) + ' piston=' + blockAt(A_X, Y, r.z)
    report('A', r, arm)
  }
  warn('A-done')
  step(phaseBBuild, 40)
}

// -------------------------------------------------------------- phase B: carried block

function phaseBBuild() {
  cmd('fill ' + (B_X - 4) + ' 0 -4 ' + (B_X + 8) + ' 0 ' + ZMAX + ' stone')
  cmd('fill ' + (B_X - 4) + ' ' + Y + ' -4 ' + (B_X + 8) + ' ' + (Y + 3) + ' ' + ZMAX + ' air')
  for (let i = 0; i < SUBJECTS.length; i++) {
    const z = laneZ(i)
    cmd('setblock ' + (B_X + 1) + ' ' + Y + ' ' + z + ' stone') // the block that gets pushed
    cmd('setblock ' + B_X + ' ' + Y + ' ' + z + ' piston ["facing_direction"=' + FACING_PLUS_X + ']')
  }
  warn('B-built :: pushed block at x=' + (B_X + 1) + ', subject stands on top of it at y=' + (Y + 1))
  step(phaseBSpawn, 40)
}

function phaseBSpawn() {
  for (let i = 0; i < SUBJECTS.length; i++) {
    const s = SUBJECTS[i]
    const z = laneZ(i)
    const loc = { x: B_X + 1.5, y: Y + 1, z: z + 0.5 }
    let e
    try {
      e = D().spawnEntity(s.id, loc)
      if (s.sit) {
        try {
          e.triggerEvent('probe:sit')
        } catch (err) {
          /* reported in phase A */
        }
      }
    } catch (err) {
      warn('spawn-failed B ' + s.label + ' :: ' + ((err && err.message) || err))
    }
    state.B.push({ s, e, z })
  }
  warn('B-spawned :: ' + state.B.filter((r) => r.e).length + '/' + SUBJECTS.length)
  step(phaseBFire, 60)
}

function phaseBFire() {
  for (const r of state.B) r.before = where(r.e)
  for (let i = 0; i < SUBJECTS.length; i++) {
    cmd('setblock ' + (B_X - 1) + ' ' + Y + ' ' + laneZ(i) + ' redstone_block')
  }
  warn('B-powered :: redstone_block at x=' + (B_X - 1))
  step(() => phaseBRead(1, 60), 60)
}

function phaseBRead(which, more) {
  for (const r of state.B) r['after' + which] = where(r.e)
  if (more) {
    step(() => phaseBRead(2, 0), more)
    return
  }
  warn('=== RESULTS B block-carriage :: the piston pushes the block the subject stands on')
  for (const r of state.B) {
    const arm = 'destination=' + blockAt(B_X + 2, Y, r.z) + ' origin=' + blockAt(B_X + 1, Y, r.z)
    report('B', r, arm)
  }
  warn('B-done')
  warn('done')
}

// -------------------------------------------------------------- reporting

function report(phase, r, arm) {
  const b = r.before
  const a1 = r.after1
  const a2 = r.after2
  const dh = b && a2 ? Math.hypot(a2.x - b.x, a2.z - b.z) : NaN
  const dy = b && a2 ? a2.y - b.y : NaN
  warn(
    phase +
      ' ' +
      r.s.label +
      ' :: before=' +
      pos(b) +
      ' after3s=' +
      pos(a1) +
      ' after6s=' +
      pos(a2) +
      ' drift_h=' +
      n(dh) +
      ' drift_y=' +
      n(dy) +
      ' moved=' +
      (Number.isFinite(dh) ? (dh > 0.2 ? 'YES' : 'no') : '?') +
      ' stimulus=' +
      arm +
      ' :: ' +
      r.s.note,
  )
}
`

async function stagePack(dir) {
  const root = join(dir, PACK_UUID)
  await mkdir(join(root, 'scripts'), { recursive: true })
  await mkdir(join(root, 'entities'), { recursive: true })
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2))
  for (const v of VARIANTS) {
    await writeFile(join(root, 'entities', v.slug + '.json'), JSON.stringify(entityFile(v), null, 2))
  }
  await writeFile(join(root, 'scripts', 'main.js'), MAIN_JS(SUBJECTS))
  return root
}

// ---------------------------------------------------------------- container control

const removeContainer = () => d(['rm', '-f', PROJECT]).catch(() => {})

async function startFresh() {
  await removeContainer()
  await d([
    'run',
    '-d',
    '--name',
    PROJECT,
    '-e',
    'EULA=TRUE',
    '-e',
    'VERSION=' + VERSION,
    '-e',
    'LEVEL_NAME=' + LEVEL,
    '-e',
    'LEVEL_TYPE=FLAT',
    '-e',
    'GAMEMODE=creative',
    '-e',
    'ALLOW_CHEATS=true',
    '-e',
    'SERVER_NAME=' + PROJECT,
    '-e',
    'CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true',
    '-v',
    VOLUME + ':/data',
    IMAGE,
  ])
}

// Reading the log is retried rather than swallowed: over a remote docker-over-ssh daemon a poll
// can fail on the connection alone, and an empty read is indistinguishable from a quiet server.
async function logsSince(since) {
  let last
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await d(['logs', ...(since ? ['--since', since] : []), PROJECT])
      return (r.stdout || '') + (r.stderr || '')
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  log('  log read failed: ' + ((last && last.message) || last))
  return ''
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
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error('timed out waiting for ' + pattern + '\nlast log tail:\n' + text.split('\n').slice(-15).join('\n'))
}

async function deploy(root) {
  await d([
    'exec',
    PROJECT,
    'sh',
    '-c',
    'rm -rf /data/development_behavior_packs && mkdir -p /data/development_behavior_packs',
  ])
  await d(['cp', root, PROJECT + ':/data/development_behavior_packs/'])
  const json = JSON.stringify([{ pack_id: PACK_UUID, version: [1, 0, 0] }])
  await d([
    'exec',
    PROJECT,
    'sh',
    '-c',
    "mkdir -p '/data/worlds/" +
      LEVEL +
      "' && printf '%s' '" +
      json +
      "' > '/data/worlds/" +
      LEVEL +
      "/world_behavior_packs.json'",
  ])
  log('activation list: ' + json)
}

// ---------------------------------------------------------------- main

const stageDir = await mkdtemp(join(tmpdir(), 'rpg-piston-'))
const root = await stagePack(stageDir)
log('docker host: ' + (process.env.DOCKER_HOST || '(local)'))
log('image: ' + IMAGE + '   requested VERSION: ' + VERSION)
log('staged pack in ' + root)
log('subjects (' + SUBJECTS.length + '): ' + SUBJECTS.map((s) => s.label).join(' '))
log('')
log('hypotheses:')
for (const s of SUBJECTS) log('  ' + s.label.padEnd(26) + s.note)

if (STAGE_ONLY) {
  log('\n=== staged only, nothing started')
  process.exit(0)
}

try {
  log('\n=== boot')
  await startFresh()
  await waitFor(/Server started|IPv4 supported/, 1200000)
  const boot = await logsSince()
  const v = boot.match(/Version[:\s]+([\d.]+)/)
  log('server version: ' + (v ? v[1] : '(not reported)'))
  await deploy(root)
  const mark = new Date().toISOString()
  await d(['restart', PROJECT])
  await waitFor(/Server started|IPv4 supported/, 1200000, mark)
  log('\n=== running the stimulus')
  try {
    await waitFor(/PISTON done/, 600000, mark)
  } catch (e) {
    log('  ' + e.message)
  }
  const text = await logsSince(mark)
  const lines = text
    .split('\n')
    .filter((l) => /PISTON|rror|ailed|nsupported|Pack Stack/i.test(l))
    .map((l) => l.trim())
  log(lines.length ? lines.join('\n') : '  (nothing matched)')
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
