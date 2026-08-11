#!/usr/bin/env node
// Can a behavior-pack script observe, server-side, whether a particular RESOURCE pack is active?
//
// One behavior pack, held constant, reports every candidate signal. Three scenarios differ only in
// what the resource-pack side is doing:
//
//   ctrl      no resource pack in the pool at all
//   withrp    two resource packs staged and activated:
//               rp-assets  client entity + geometry + animation + particle + sound + fog + structure
//                          + a manifest `settings` block
//               rp-script  a resources module plus a script module and a data module
//   poolonly  the same two resource packs present in the pool but absent from the activation list
//
// Signals reported: world.getPackSettings(), structureManager.getPackStructureIds() /
// getWorldStructureIds(), Entity.getAABB() and getHeadLocation() for an entity that declares a
// collision box and one that does not, Entity.playAnimation of an RP-only animation, and the
// commands whose arguments name RP-side content (/playsound, /particle, /fog, /playanimation) each
// with a vanilla control. Plus whatever the RP's own script module manages to do.
//
// Usage: node probe.mjs [--keep]

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const PROJECT = 'rpg-rpdetect-probe'
const VOLUME = PROJECT + '_data'
const IMAGE = 'itzg/minecraft-bedrock-server:latest'
const VERSION = '1.26.43.1'
const SCRIPT_API = '2.0.0'
const MIN_ENGINE = [1, 21, 0]
const KEEP = process.argv.includes('--keep')

const BP = '5b2f0000-0000-4000-8000-000000000001'
const RP_ASSETS = '5b2f0000-0000-4000-8000-000000000002'
const RP_SCRIPT = '5b2f0000-0000-4000-8000-000000000003'

const log = (...a) => console.log(...a)
const d = (args) => exec('docker', args, { maxBuffer: 64 * 1024 * 1024 })

// ---------------------------------------------------------------- little-endian NBT / .mcstructure

class LE {
  constructor() {
    this.parts = []
  }
  raw(b) {
    this.parts.push(b)
    return this
  }
  u8(n) {
    return this.raw(Buffer.from([n & 0xff]))
  }
  i16(n) {
    const b = Buffer.alloc(2)
    b.writeInt16LE(n)
    return this.raw(b)
  }
  i32(n) {
    const b = Buffer.alloc(4)
    b.writeInt32LE(n)
    return this.raw(b)
  }
  str(s) {
    const p = Buffer.from(s, 'utf8')
    this.i16(p.length)
    return this.raw(p)
  }
  out() {
    return Buffer.concat(this.parts)
  }
}

// Minimal NBT writer covering the tags a one-block .mcstructure needs.
const TAG = { end: 0, byte: 1, int: 3, string: 8, list: 9, compound: 10 }

function tagId(v) {
  if (v && v.__nbt) return v.id
  if (typeof v === 'string') return TAG.string
  if (Array.isArray(v)) return TAG.list
  if (typeof v === 'object') return TAG.compound
  return TAG.int
}
const nbtInt = (n) => ({ __nbt: true, id: TAG.int, write: (w) => w.i32(n) })
const nbtList = (items) => ({
  __nbt: true,
  id: TAG.list,
  write: (w) => {
    w.u8(items.length ? tagId(items[0]) : TAG.end).i32(items.length)
    for (const it of items) writeValue(w, it)
  },
})

function writeValue(w, v) {
  if (v && v.__nbt) return v.write(w)
  if (typeof v === 'string') return w.str(v)
  if (Array.isArray(v)) return nbtList(v).write(w)
  if (typeof v === 'object') return writeCompoundBody(w, v)
  return w.i32(v)
}

function writeCompoundBody(w, obj) {
  for (const [k, v] of Object.entries(obj)) {
    w.u8(tagId(v)).str(k)
    writeValue(w, v)
  }
  w.u8(TAG.end)
}

function mcstructure() {
  const root = {
    format_version: nbtInt(1),
    size: nbtList([nbtInt(1), nbtInt(1), nbtInt(1)]),
    structure: {
      block_indices: nbtList([nbtList([nbtInt(0)]), nbtList([nbtInt(-1)])]),
      entities: nbtList([]),
      palette: {
        default: {
          block_palette: nbtList([{ name: 'minecraft:stone', states: {}, version: nbtInt(18168865) }]),
          block_position_data: {},
        },
      },
    },
    structure_world_origin: nbtList([nbtInt(0), nbtInt(0), nbtInt(0)]),
  }
  const w = new LE()
  w.u8(TAG.compound).str('')
  writeCompoundBody(w, root)
  return w.out()
}

// ---------------------------------------------------------------- pack authoring

const bpManifest = {
  format_version: 2,
  header: {
    name: 'rp-detect behavior',
    description: 'rp-detect behavior',
    uuid: BP,
    version: [1, 0, 0],
    min_engine_version: MIN_ENGINE,
  },
  modules: [
    { description: 'data', type: 'data', uuid: '5b2f0000-0000-4000-8000-0000000000a1', version: [1, 0, 0] },
    {
      description: 'script',
      type: 'script',
      language: 'javascript',
      uuid: '5b2f0000-0000-4000-8000-0000000000b1',
      entry: 'scripts/main.js',
      version: [1, 0, 0],
    },
  ],
  dependencies: [{ module_name: '@minecraft/server', version: SCRIPT_API }],
  settings: [{ type: 'toggle', name: 'bp_setting', text: 'bp setting', default: true }],
}

const rpAssetsManifest = {
  format_version: 2,
  header: {
    name: 'rp-detect assets',
    description: 'rp-detect assets',
    uuid: RP_ASSETS,
    version: [1, 0, 0],
    min_engine_version: MIN_ENGINE,
  },
  modules: [{ description: 'resources', type: 'resources', uuid: '5b2f0000-0000-4000-8000-0000000000a2', version: [1, 0, 0] }],
  settings: [{ type: 'toggle', name: 'rp_setting', text: 'rp setting', default: true }],
}

// A resource pack that also declares a script module and a data module carrying an entity type. If
// the server evaluated it, a canary script could live in the resource pack itself.
const rpScriptManifest = {
  format_version: 2,
  header: {
    name: 'rp-detect script',
    description: 'rp-detect script',
    uuid: RP_SCRIPT,
    version: [1, 0, 0],
    min_engine_version: MIN_ENGINE,
  },
  modules: [
    { description: 'resources', type: 'resources', uuid: '5b2f0000-0000-4000-8000-0000000000a3', version: [1, 0, 0] },
    { description: 'data', type: 'data', uuid: '5b2f0000-0000-4000-8000-0000000000a4', version: [1, 0, 0] },
    {
      description: 'script',
      type: 'script',
      language: 'javascript',
      uuid: '5b2f0000-0000-4000-8000-0000000000b3',
      entry: 'scripts/main.js',
      version: [1, 0, 0],
    },
  ],
  dependencies: [{ module_name: '@minecraft/server', version: SCRIPT_API }],
}

const entity = (identifier, withCollisionBox) => ({
  format_version: '1.21.0',
  'minecraft:entity': {
    description: { identifier, is_spawnable: false, is_summonable: true },
    components: {
      'minecraft:physics': {},
      'minecraft:health': { value: 1 },
      ...(withCollisionBox ? { 'minecraft:collision_box': { width: 0.6, height: 1.9 } } : {}),
      'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: 'no' }] },
    },
  },
})

const clientEntity = {
  format_version: '1.10.0',
  'minecraft:client_entity': {
    description: {
      identifier: 'probe:boxed',
      materials: { default: 'entity_alphatest' },
      textures: { default: 'textures/entity/probe' },
      geometry: { default: 'geometry.probe_giant' },
      animations: { rponly: 'animation.probe.rponly' },
      scripts: { animate: ['rponly'] },
      render_controllers: ['controller.render.probe'],
      spawn_egg: { texture: 'probe_egg' },
    },
  },
}

// Deliberately enormous, to give any RP-derived dimension the widest possible signal.
const geometry = {
  format_version: '1.12.0',
  'minecraft:geometry': [
    {
      description: { identifier: 'geometry.probe_giant', texture_width: 16, texture_height: 16, visible_bounds_width: 40, visible_bounds_height: 40, visible_bounds_offset: [0, 20, 0] },
      bones: [{ name: 'body', pivot: [0, 0, 0], cubes: [{ origin: [-160, 0, -160], size: [320, 320, 320], uv: [0, 0] }] }],
    },
  ],
}

const renderController = {
  format_version: '1.10.0',
  render_controllers: {
    'controller.render.probe': { geometry: 'Geometry.default', materials: [{ '*': 'Material.default' }], textures: ['Texture.default'] },
  },
}

// RP animations accept a timeline. Whether a command in one reaches the server is the question.
const rpAnimation = {
  format_version: '1.8.0',
  animations: {
    'animation.probe.rponly': {
      loop: false,
      animation_length: 1,
      timeline: { 0.0: ['/scriptevent probe:from_rp_animation fired'] },
      bones: { body: { rotation: [0, 0, 0] } },
    },
  },
}

const particles = {
  particle_effect: {
    format_version: '1.10.0',
    description: { identifier: 'probe:rp_particle', basic_render_parameters: { material: 'particles_alpha', texture: 'textures/particle/particles' } },
    components: { 'minecraft:emitter_rate_instant': { num_particles: 1 }, 'minecraft:emitter_lifetime_once': { active_time: 1 } },
  },
}

const soundDefinitions = {
  format_version: '1.14.0',
  sound_definitions: { 'probe.rp_sound': { category: 'neutral', sounds: ['sounds/probe_rp_sound'] } },
}

const fog = {
  format_version: '1.16.100',
  'minecraft:fog_settings': {
    description: { identifier: 'probe:rp_fog' },
    distance: { air: { fog_start: 1, fog_end: 8, fog_color: '#ff00ff', render_distance_type: 'fixed' } },
  },
}

// ---------------------------------------------------------------- behavior-pack reporter

const BP_MAIN = String.raw`import { EntityTypes, system, world } from '@minecraft/server'

const TAG = 'PROBE bp '
const out = []
const clean = (v) => String(v).replaceAll('[', '(').replaceAll(']', ')').slice(0, 400)
const note = (k, v) => out.push(k + '=' + clean(v))
const attempt = (k, fn) => {
  try {
    note(k, fn())
  } catch (e) {
    note(k, 'THREW ' + ((e && e.message) || e))
  }
}
const report = () => {
  for (const line of out) console.warn(TAG + line)
  console.warn(TAG + 'done')
}

const events = []
system.afterEvents.scriptEventReceive.subscribe((e) => events.push(e.id + '/' + e.sourceType))

const box = (label, ent) => {
  attempt(label + '-typeId', () => ent.typeId)
  attempt(label + '-aabb', () => {
    const a = ent.getAABB()
    return JSON.stringify(a)
  })
  attempt(label + '-headLocation-dy', () => (ent.getHeadLocation().y - ent.location.y).toFixed(4))
  attempt(label + '-hasCollisionBoxComponent', () => ent.hasComponent('minecraft:collision_box'))
  attempt(label + '-components', () => ent.getComponents().map((c) => c.typeId).sort().join(','))
  attempt(label + '-playAnimation-rponly', () => {
    ent.playAnimation('animation.probe.rponly')
    return 'no-throw'
  })
  attempt(label + '-playAnimation-bogus', () => {
    ent.playAnimation('animation.probe.definitely_nonexistent')
    return 'no-throw'
  })
}

const cmd = (label, dim, c) =>
  attempt(label, () => {
    const r = dim.runCommand(c)
    return 'ok successCount=' + r.successCount
  })

system.runTimeout(() => {
  const dim = world.getDimension('overworld')
  attempt('packSettings', () => JSON.stringify(world.getPackSettings()))
  attempt('packStructureIds', () => world.structureManager.getPackStructureIds().join(','))
  attempt('worldStructureIds', () => world.structureManager.getWorldStructureIds().join(','))
  attempt('structure-get-bp', () => String(world.structureManager.get('probe:bp_struct')))
  attempt('structure-get-rp', () => String(world.structureManager.get('probe:rp_struct')))
  attempt('dynprop-from-rp-script', () => String(world.getDynamicProperty('probe:rp_script_ran')))
  attempt('entityTypes-probe:boxed', () => String(EntityTypes.get('probe:boxed') && 'defined'))
  attempt('entityTypes-probe:rp_only_entity', () => String(EntityTypes.get('probe:rp_only_entity') && 'defined'))
  attempt('tickingarea', () => {
    dim.runCommand('tickingarea add 0 0 0 48 100 48 probearea')
    return 'ok'
  })

  system.runTimeout(() => {
    for (const [label, id, withBox] of [
      ['boxed', 'probe:boxed', true],
      ['unboxed', 'probe:unboxed', false],
    ]) {
      attempt(label + '-spawn', () => {
        const e = dim.spawnEntity(id, { x: 8, y: 70, z: withBox ? 8 : 12 })
        box(label, e)
        return 'ok'
      })
    }
    // Does the RP-only data module's entity type exist server-side?
    attempt('rp-data-entity-spawn', () => {
      dim.spawnEntity('probe:rp_only_entity', { x: 8, y: 70, z: 16 })
      return 'ok'
    })

    // Commands whose arguments name RP-side content, each with a vanilla control.
    cmd('cmd-playsound-rp', dim, 'playsound probe.rp_sound @e 8 70 8')
    cmd('cmd-playsound-vanilla', dim, 'playsound random.pop @e 8 70 8')
    cmd('cmd-playsound-bogus', dim, 'playsound probe.definitely_nonexistent @e 8 70 8')
    cmd('cmd-particle-rp', dim, 'particle probe:rp_particle 8 70 8')
    cmd('cmd-particle-vanilla', dim, 'particle minecraft:heart_particle 8 70 8')
    cmd('cmd-particle-bogus', dim, 'particle probe:definitely_nonexistent 8 70 8')
    cmd('cmd-fog-rp', dim, 'fog @e push probe:rp_fog probe_layer')
    cmd('cmd-fog-bogus', dim, 'fog @e push probe:definitely_nonexistent probe_layer')
    cmd('cmd-playanimation-rp', dim, 'playanimation @e animation.probe.rponly')
    cmd('cmd-playanimation-bogus', dim, 'playanimation @e animation.probe.definitely_nonexistent')

    // /packstack is documented as "Prints client or server pack stack to chat" — the only
    // first-party command that names a pack stack.
    for (const form of [
      'packstack server',
      'packstack client',
      'packstack client true',
      'packstack client verbose',
      'packstack client exclude-vanilla',
      'packstack client verbose exclude-vanilla',
      'packstack client false true',
      'packstack server exclude-vanilla',
    ]) {
      cmd('cmd-' + form.replaceAll(' ', '_'), dim, form)
    }
    // CommandResult carries successCount and nothing else, so pack identities cannot come back
    // through runCommand even though the command prints them.
    attempt('cmd-packstack-result-keys', () => {
      const r = dim.runCommand('packstack client')
      return JSON.stringify(r) + ' own=' + Object.getOwnPropertyNames(r).join(',')
    })

    system.runTimeout(() => {
      note('scriptEvents', events.length ? events.join(' ') : '(none)')
      report()
    }, 60)
  }, 200)
}, 60)
`

const RP_MAIN = String.raw`import { world } from '@minecraft/server'
console.warn('PROBE rp-script evaluated=true')
try {
  world.setDynamicProperty('probe:rp_script_ran', 'yes')
} catch (e) {
  console.warn('PROBE rp-script dynprop-threw=' + ((e && e.message) || e))
}
`

// ---------------------------------------------------------------- staging

async function writeJson(p, obj) {
  await mkdir(join(p, '..'), { recursive: true }).catch(() => {})
  await writeFile(p, JSON.stringify(obj, null, 2))
}

async function stage(dir) {
  const struct = mcstructure()

  // behavior pack
  const bp = join(dir, BP)
  await mkdir(join(bp, 'scripts'), { recursive: true })
  await mkdir(join(bp, 'entities'), { recursive: true })
  await mkdir(join(bp, 'structures', 'probe'), { recursive: true })
  await writeJson(join(bp, 'manifest.json'), bpManifest)
  await writeJson(join(bp, 'entities', 'boxed.json'), entity('probe:boxed', true))
  await writeJson(join(bp, 'entities', 'unboxed.json'), entity('probe:unboxed', false))
  await writeFile(join(bp, 'structures', 'probe', 'bp_struct.mcstructure'), struct)
  await writeFile(join(bp, 'scripts', 'main.js'), BP_MAIN)

  // resource pack: assets
  const ra = join(dir, RP_ASSETS)
  for (const sub of ['entity', 'models/entity', 'animations', 'render_controllers', 'particles', 'sounds', 'fogs', 'structures/probe', 'textures/entity']) {
    await mkdir(join(ra, sub), { recursive: true })
  }
  await writeJson(join(ra, 'manifest.json'), rpAssetsManifest)
  await writeJson(join(ra, 'entity', 'boxed.entity.json'), clientEntity)
  await writeJson(join(ra, 'models', 'entity', 'probe.geo.json'), geometry)
  await writeJson(join(ra, 'animations', 'probe.animation.json'), rpAnimation)
  await writeJson(join(ra, 'render_controllers', 'probe.render_controllers.json'), renderController)
  await writeJson(join(ra, 'particles', 'probe.particle.json'), particles)
  await writeJson(join(ra, 'sounds', 'sound_definitions.json'), soundDefinitions)
  await writeJson(join(ra, 'fogs', 'probe.fog.json'), fog)
  await writeFile(join(ra, 'structures', 'probe', 'rp_struct.mcstructure'), struct)

  // resource pack: script + data modules
  const rs = join(dir, RP_SCRIPT)
  await mkdir(join(rs, 'scripts'), { recursive: true })
  await mkdir(join(rs, 'entities'), { recursive: true })
  await writeJson(join(rs, 'manifest.json'), rpScriptManifest)
  await writeJson(join(rs, 'entities', 'rp_only.json'), entity('probe:rp_only_entity', true))
  await writeFile(join(rs, 'scripts', 'main.js'), RP_MAIN)
}

// ---------------------------------------------------------------- container control

const removeContainer = () => d(['rm', '-f', PROJECT]).catch(() => {})

async function startFresh(level) {
  await removeContainer()
  await d([
    'run', '-d', '--name', PROJECT,
    '-e', 'EULA=TRUE',
    '-e', 'VERSION=' + VERSION,
    '-e', 'LEVEL_NAME=' + level,
    '-e', 'GAMEMODE=creative',
    '-e', 'ALLOW_CHEATS=true',
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

// Both pools live on the volume and outlive the world; empty them or the previous scenario leaks in.
async function deploy(stageDir, { rpStaged, rpActive }, level) {
  await d(['exec', PROJECT, 'sh', '-c',
    'rm -rf /data/development_behavior_packs /data/development_resource_packs && mkdir -p /data/development_behavior_packs /data/development_resource_packs'])
  await d(['cp', join(stageDir, BP), PROJECT + ':/data/development_behavior_packs/'])
  for (const u of rpStaged) await d(['cp', join(stageDir, u), PROJECT + ':/data/development_resource_packs/'])

  const bpJson = JSON.stringify([{ pack_id: BP, version: [1, 0, 0] }])
  const rpJson = JSON.stringify(rpActive.map((u) => ({ pack_id: u, version: [1, 0, 0] })))
  await d(['exec', PROJECT, 'sh', '-c',
    "mkdir -p '/data/worlds/" + level + "' && printf '%s' '" + bpJson + "' > '/data/worlds/" + level + "/world_behavior_packs.json'" +
    " && printf '%s' '" + rpJson + "' > '/data/worlds/" + level + "/world_resource_packs.json'"])

  const pools = await d(['exec', PROJECT, 'sh', '-c', 'echo bp:$(ls /data/development_behavior_packs); echo rp:$(ls /data/development_resource_packs)'])
  log('pools: ' + pools.stdout.trim().split('\n').join('   '))
  log('world_resource_packs.json: ' + rpJson)
}

async function runScenario({ name, level, rpStaged, rpActive, stageDir }) {
  log('\n=== ' + name)
  log('level: ' + level)
  await startFresh(level)
  await waitFor(/Server started|IPv4 supported/, 420000)
  const boot = await logsSince()
  const v = boot.match(/Version[:\s]+([\d.]+)/)
  log('server version: ' + (v ? v[1] : '(not reported)'))
  await deploy(stageDir, { rpStaged, rpActive }, level)
  const mark = new Date().toISOString()
  await d(['restart', PROJECT])
  try {
    await waitFor(/Server started|IPv4 supported/, 420000, mark)
  } catch (e) {
    log('  ' + e.message)
  }
  await new Promise((r) => setTimeout(r, 40000))

  // Same two commands from the server console, where command output is not swallowed the way it is
  // for Dimension.runCommand.
  const consoleMark = new Date().toISOString()
  for (const c of ['packstack client', 'packstack client verbose', 'packstack client exclude-vanilla', 'help packstack']) {
    await d(['exec', PROJECT, 'send-command', c]).catch((e) => log('  send-command ' + c + ': ' + e.message))
    await new Promise((r) => setTimeout(r, 3000))
  }
  const consoleOut = await logsSince(consoleMark)
  log('--- server console after /packstack:')
  log(consoleOut.split('\n').map((l) => '  | ' + l.trim()).join('\n'))

  const text = await logsSince(mark)
  const lines = text
    .split('\n')
    .filter((l) => /PROBE|Pack Stack|resource|Resource|texture|script|Script|rror|ailed|nsupported|ependenc/i.test(l))
    .map((l) => l.trim())
  log(lines.length ? lines.join('\n') : '  (nothing matched)')
  return text
}

// ---------------------------------------------------------------- main

const stageDir = await mkdtemp(join(tmpdir(), 'rpg-rpdetect-'))
await stage(stageDir)
log('docker host: ' + (process.env.DOCKER_HOST || '(local)'))
log('image: ' + IMAGE + '   requested VERSION: ' + VERSION)
log('staged packs in ' + stageDir)

try {
  await runScenario({ name: 'ctrl — no resource pack in the pool', level: 'ctrl', rpStaged: [], rpActive: [], stageDir })
  await runScenario({
    name: 'withrp — rp-assets and rp-script staged and activated',
    level: 'withrp', rpStaged: [RP_ASSETS, RP_SCRIPT], rpActive: [RP_ASSETS, RP_SCRIPT], stageDir,
  })
  await runScenario({
    name: 'poolonly — both resource packs in the pool, neither activated',
    level: 'poolonly', rpStaged: [RP_ASSETS, RP_SCRIPT], rpActive: [], stageDir,
  })
  log('\n=== server.properties keys mentioning pack/texture')
  const props = await d(['exec', PROJECT, 'sh', '-c', "grep -i 'pack\\|texture' /data/server.properties || echo '(none)'"]).catch((e) => ({ stdout: e.message }))
  log(props.stdout.trim())
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
