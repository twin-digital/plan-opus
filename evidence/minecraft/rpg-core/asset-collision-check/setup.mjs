#!/usr/bin/env node
// Are a resource pack's internal asset names scoped to their pack, or shared across the whole pack stack?
// The version-derived identifier namespace rests on the answer: if they are global, every asset name a
// pack defines has to carry the namespace, and if they are pack-scoped only the pack uuid and the entity
// identifiers do.
//
// Two resource packs each define the SAME names with DIFFERENT content, and one entity apiece uses them:
//
//   geometry, same identifier `geometry.collide.shared` in both packs
//     collide:geo_a   pack one's version — a tall thin pillar
//     collide:geo_b   pack two's version — a wide flat slab
//
//   texture, same path `textures/collide/shared` in both packs
//     collide:tex_a   pack one's version — solid magenta, on a cube named uniquely per pack
//     collide:tex_b   pack two's version — solid green
//
// Distinct shapes / distinct colours => names are pack-scoped.
// Both the same                      => names are global, higher pack in the stack wins.
//
// Usage: node setup.mjs up [--port 19132]
//        node setup.mjs down

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { deflateSync, crc32 } from 'node:zlib'

const exec = promisify(execFile)
const PROJECT = 'rpg-collide-check'
const VOLUME = PROJECT + '_data'
const IMAGE = 'itzg/minecraft-bedrock-server:latest'
const VERSION = '1.26.43.1'
const LEVEL = 'collide'

const argv = process.argv.slice(2)
const CMD = argv[0] ?? 'up'
const PORT = (() => {
  const i = argv.indexOf('--port')
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : 19132
})()

const BP = '9f6d0000-0000-4000-8000-000000000001'
const RP1 = '9f6d0000-0000-4000-8000-000000000002'
const RP2 = '9f6d0000-0000-4000-8000-000000000003'

const ACTORS = [
  { id: 'geo_a', name: 'GEO — pack ONE (pillar if scoped)', x: -4 },
  { id: 'geo_b', name: 'GEO — pack TWO (slab if scoped)', x: -1 },
  { id: 'tex_a', name: 'TEX — pack ONE (magenta if scoped)', x: 2 },
  { id: 'tex_b', name: 'TEX — pack TWO (green if scoped)', x: 5 },
]

const log = (...a) => console.log(...a)
const d = (args) => exec('docker', args, { maxBuffer: 32 * 1024 * 1024 })

// ---------------------------------------------------------------- a minimal solid-colour PNG

function solidPng(r, g, b, size = 16) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: size }, () => Buffer.from([r, g, b])))])
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------- packs

const geometry = (identifier, size) => ({
  format_version: '1.12.0',
  'minecraft:geometry': [
    {
      description: { identifier, texture_width: 16, texture_height: 16, visible_bounds_width: 4, visible_bounds_height: 4, visible_bounds_offset: [0, 2, 0] },
      bones: [{ name: 'body', pivot: [0, 0, 0], cubes: [{ origin: [-size[0] / 2, 0, -size[2] / 2], size, uv: [0, 0] }] }],
    },
  ],
})

const clientEntity = (id, geo, tex) => ({
  format_version: '1.10.0',
  'minecraft:client_entity': {
    description: {
      identifier: `collide:${id}`,
      materials: { default: 'entity_alphatest' },
      textures: { default: tex },
      geometry: { default: geo },
      render_controllers: ['controller.render.collide'],
    },
  },
})

const renderController = {
  format_version: '1.10.0',
  render_controllers: {
    'controller.render.collide': { geometry: 'Geometry.default', materials: [{ '*': 'Material.default' }], textures: ['Texture.default'] },
  },
}

const manifest = (name, uuid, modUuid, type) => ({
  format_version: 2,
  header: { name, description: name, uuid, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
  modules: [{ description: type, type, uuid: modUuid, version: [1, 0, 0] }],
})

const bpManifest = {
  format_version: 2,
  header: { name: 'collide behavior', description: 'four actors for the asset-name collision check', uuid: BP, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
  modules: [
    { description: 'data', type: 'data', uuid: '9f6d0000-0000-4000-8000-0000000000a1', version: [1, 0, 0] },
    { description: 'script', type: 'script', language: 'javascript', uuid: '9f6d0000-0000-4000-8000-0000000000b1', entry: 'scripts/main.js', version: [1, 0, 0] },
  ],
  dependencies: [
    { module_name: '@minecraft/server', version: '2.0.0' },
    { uuid: RP1, version: [1, 0, 0] },
    { uuid: RP2, version: [1, 0, 0] },
  ],
}

const bpEntity = (id) => ({
  format_version: '1.21.0',
  'minecraft:entity': {
    description: { identifier: `collide:${id}`, is_spawnable: false, is_summonable: true },
    components: {
      'minecraft:physics': {},
      'minecraft:health': { value: 1 },
      'minecraft:collision_box': { width: 0.9, height: 1.9 },
      'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: 'no' }] },
      'minecraft:movement': { value: 0 },
      'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
      'minecraft:persistent': {},
    },
  },
})

const bpMain = `import { system, world } from '@minecraft/server'

const ACTORS = ${JSON.stringify(ACTORS)}
const TAG = 'COLLIDE '

system.runTimeout(() => {
  const dim = world.getDimension('overworld')
  try { dim.runCommand('tickingarea add -16 -64 -16 16 120 16 collidearea') } catch (e) {}
  system.runTimeout(() => {
    for (const a of ACTORS) {
      try { dim.runCommand('kill @e[type=collide:' + a.id + ']') } catch (e) {}
    }
    for (const a of ACTORS) {
      try {
        const top = dim.getTopmostBlock({ x: a.x, z: 4 })
        const e = dim.spawnEntity('collide:' + a.id, { x: a.x + 0.5, y: top ? top.y + 1 : 0, z: 4.5 })
        e.nameTag = a.name
        console.warn(TAG + 'spawned collide:' + a.id)
      } catch (err) {
        console.warn(TAG + 'FAILED collide:' + a.id + ': ' + ((err && err.message) || err))
      }
    }
    console.warn(TAG + 'ready')
  }, 120)
}, 60)
`

async function stage(dir) {
  // behavior pack
  const b = join(dir, 'bp')
  await mkdir(join(b, 'scripts'), { recursive: true })
  await mkdir(join(b, 'entities'), { recursive: true })
  await writeFile(join(b, 'manifest.json'), JSON.stringify(bpManifest, null, 2))
  await writeFile(join(b, 'scripts', 'main.js'), bpMain)
  for (const a of ACTORS) await writeFile(join(b, 'entities', `${a.id}.json`), JSON.stringify(bpEntity(a.id), null, 2))

  // two resource packs, colliding on `geometry.collide.shared` and on `textures/collide/shared`
  const specs = [
    { dir: 'rp1', uuid: RP1, mod: '9f6d0000-0000-4000-8000-0000000000a2', name: 'collide assets one', cube: [4, 32, 4], colour: [255, 0, 255], geoActor: 'geo_a', texActor: 'tex_a', tag: 'one' },
    { dir: 'rp2', uuid: RP2, mod: '9f6d0000-0000-4000-8000-0000000000a3', name: 'collide assets two', cube: [24, 5, 24], colour: [0, 200, 0], geoActor: 'geo_b', texActor: 'tex_b', tag: 'two' },
  ]
  for (const s of specs) {
    const r = join(dir, s.dir)
    await mkdir(join(r, 'entity'), { recursive: true })
    await mkdir(join(r, 'models', 'entity'), { recursive: true })
    await mkdir(join(r, 'render_controllers'), { recursive: true })
    await mkdir(join(r, 'textures', 'collide'), { recursive: true })
    await writeFile(join(r, 'manifest.json'), JSON.stringify(manifest(s.name, s.uuid, s.mod, 'resources'), null, 2))
    await writeFile(join(r, 'render_controllers', 'collide.json'), JSON.stringify(renderController, null, 2))

    // the colliding geometry name, with this pack's own shape
    await writeFile(join(r, 'models', 'entity', 'shared.geo.json'), JSON.stringify(geometry('geometry.collide.shared', s.cube), null, 2))
    // a uniquely named cube, so the texture test is not confounded by the geometry collision
    await writeFile(join(r, 'models', 'entity', `cube_${s.tag}.geo.json`), JSON.stringify(geometry(`geometry.collide.cube_${s.tag}`, [12, 12, 12]), null, 2))
    // the colliding texture path, with this pack's own colour
    await writeFile(join(r, 'textures', 'collide', 'shared.png'), solidPng(...s.colour))

    await writeFile(join(r, 'entity', `${s.geoActor}.entity.json`), JSON.stringify(clientEntity(s.geoActor, 'geometry.collide.shared', 'textures/collide/shared'), null, 2))
    await writeFile(join(r, 'entity', `${s.texActor}.entity.json`), JSON.stringify(clientEntity(s.texActor, `geometry.collide.cube_${s.tag}`, 'textures/collide/shared'), null, 2))
  }
}

// ---------------------------------------------------------------- run

async function down() {
  await d(['rm', '-f', PROJECT]).catch(() => {})
  await d(['volume', 'rm', VOLUME]).catch(() => {})
  log('removed container and volume ' + PROJECT)
}

async function logsAll() {
  const r = await d(['logs', PROJECT]).catch(() => ({ stdout: '', stderr: '' }))
  return (r.stdout || '') + (r.stderr || '')
}

async function waitFor(pattern, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const t = await logsAll()
    if (pattern.test(t)) return t
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('timed out waiting for ' + pattern)
}

async function up() {
  await down()
  const stageDir = await mkdtemp(join(tmpdir(), 'rpg-collide-'))
  await stage(stageDir)

  await d([
    'run', '-d', '--name', PROJECT, '-p', `${PORT}:19132/udp`,
    '-e', 'EULA=TRUE', '-e', 'VERSION=' + VERSION, '-e', 'LEVEL_NAME=' + LEVEL, '-e', 'LEVEL_TYPE=flat',
    '-e', 'GAMEMODE=creative', '-e', 'ALLOW_CHEATS=true', '-e', 'ALLOW_LIST=false',
    '-e', 'DEFAULT_PLAYER_PERMISSION_LEVEL=operator', '-e', 'SERVER_NAME=asset collision check',
    '-e', 'TEXTUREPACK_REQUIRED=true', '-e', 'CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true',
    '-v', VOLUME + ':/data', IMAGE,
  ])
  log('server starting…')
  await waitFor(/Server started|IPv4 supported/, 420000)

  await d(['exec', PROJECT, 'sh', '-c', 'mkdir -p /data/development_behavior_packs /data/development_resource_packs'])
  await d(['cp', join(stageDir, 'bp'), PROJECT + ':/data/development_behavior_packs/collide_bp'])
  await d(['cp', join(stageDir, 'rp1'), PROJECT + ':/data/development_resource_packs/collide_rp1'])
  await d(['cp', join(stageDir, 'rp2'), PROJECT + ':/data/development_resource_packs/collide_rp2'])

  const bpList = JSON.stringify([{ pack_id: BP, version: [1, 0, 0] }])
  // rp1 listed first, rp2 second — the stack order is what a global-name winner would follow
  const rpList = JSON.stringify([{ pack_id: RP1, version: [1, 0, 0] }, { pack_id: RP2, version: [1, 0, 0] }])
  await d(['exec', PROJECT, 'sh', '-c',
    "printf '%s' '" + bpList + "' > '/data/worlds/" + LEVEL + "/world_behavior_packs.json'" +
    " && printf '%s' '" + rpList + "' > '/data/worlds/" + LEVEL + "/world_resource_packs.json'"])

  await d(['restart', PROJECT])
  log('deployed; waiting for the actors…')
  try {
    await waitFor(/COLLIDE ready/, 300000)
  } catch (e) {
    log('WARNING: ' + e.message)
  }
  log('\n' + (await logsAll()).split('\n').filter((l) => /COLLIDE|Pack Name/.test(l)).map((l) => l.trim()).join('\n'))
  await rm(stageDir, { recursive: true, force: true })

  log(`
────────────────────────────────────────────────────────────
  address 10.111.1.192    port ${PORT}
  flat creative world, you join as operator
  resource activation order: collide assets one, then two
────────────────────────────────────────────────────────────`)
}

if (CMD === 'down') await down()
else if (CMD === 'up') await up()
else {
  log('usage: node setup.mjs up [--port 19132] | node setup.mjs down')
  process.exitCode = 2
}
