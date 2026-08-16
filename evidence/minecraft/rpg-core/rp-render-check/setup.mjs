#!/usr/bin/env node
// Stands up a joinable Bedrock server for the one question no server-side probe can answer: what a
// CLIENT renders for an entity whose resource-pack definition is missing or broken.
//
// Four actors stand in a row at spawn, identical in behaviour, differing only in what the resource
// pack says about their appearance:
//
//   rptest:full          complete client entity — geometry and texture both resolve   (control)
//   rptest:no_client     no client entity at all — what a wholly missing RP looks like
//   rptest:bad_geometry  client entity present, geometry identifier does not exist
//   rptest:bad_texture   client entity present, geometry resolves, texture path does not exist
//
// One world, one join, all four side by side. `--no-rp` brings the same world up with the resource
// pack deactivated, if you want to see the whole-RP-absent case directly.
//
// Usage:
//   node setup.mjs up [--no-rp] [--port 19132]
//   node setup.mjs down

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const PROJECT = 'rpg-render-check'
const VOLUME = PROJECT + '_data'
const IMAGE = 'itzg/minecraft-bedrock-server:latest'
const VERSION = '1.26.43.1'
const LEVEL = 'render'

const argv = process.argv.slice(2)
const CMD = argv[0] ?? 'up'
const NO_RP = argv.includes('--no-rp')
const PORT = (() => {
  const i = argv.indexOf('--port')
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : 19132
})()

const BP = '7d4b0000-0000-4000-8000-000000000001'
const RP = '7d4b0000-0000-4000-8000-000000000002'

const ACTORS = [
  { id: 'full', name: 'FULL — should look right', x: -3, client: 'good' },
  { id: 'no_client', name: 'NO CLIENT ENTITY', x: -1, client: null },
  { id: 'bad_geometry', name: 'BAD GEOMETRY', x: 1, client: 'badGeo' },
  { id: 'bad_texture', name: 'BAD TEXTURE', x: 3, client: 'badTex' },
]

const log = (...a) => console.log(...a)
const d = (args) => exec('docker', args, { maxBuffer: 32 * 1024 * 1024 })

// ---------------------------------------------------------------- packs

const bpManifest = {
  format_version: 2,
  header: { name: 'rp render check', description: 'four actors differing only in appearance definition', uuid: BP, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
  modules: [
    { description: 'data', type: 'data', uuid: '7d4b0000-0000-4000-8000-0000000000a1', version: [1, 0, 0] },
    { description: 'script', type: 'script', language: 'javascript', uuid: '7d4b0000-0000-4000-8000-0000000000b1', entry: 'scripts/main.js', version: [1, 0, 0] },
  ],
  dependencies: [
    { module_name: '@minecraft/server', version: '2.0.0' },
    { uuid: RP, version: [1, 0, 0] },
  ],
}

const rpManifest = {
  format_version: 2,
  header: { name: 'rp render check assets', description: 'appearance definitions, deliberately broken in two of four', uuid: RP, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
  modules: [{ description: 'resources', type: 'resources', uuid: '7d4b0000-0000-4000-8000-0000000000a2', version: [1, 0, 0] }],
}

// identical behaviour for all four: invulnerable, immobile, watches the player
const bpEntity = (id) => ({
  format_version: '1.21.0',
  'minecraft:entity': {
    description: { identifier: `rptest:${id}`, is_spawnable: false, is_summonable: true },
    components: {
      'minecraft:physics': {},
      'minecraft:health': { value: 1 },
      'minecraft:collision_box': { width: 0.6, height: 1.9 },
      'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: 'no' }] },
      'minecraft:movement': { value: 0 },
      'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
      'minecraft:persistent': {},
      'minecraft:behavior.look_at_player': { priority: 1, look_distance: 12, probability: 1 },
    },
  },
})

const GOOD_GEOMETRY = 'geometry.evoker.v1.8'
const GOOD_TEXTURE = 'textures/entity/illager/evoker'

const clientEntity = (id, kind) => ({
  format_version: '1.10.0',
  'minecraft:client_entity': {
    description: {
      identifier: `rptest:${id}`,
      materials: { default: 'entity_alphatest' },
      textures: { default: kind === 'badTex' ? 'textures/entity/rptest/this_texture_does_not_exist' : GOOD_TEXTURE },
      geometry: { default: kind === 'badGeo' ? 'geometry.rptest.this_geometry_does_not_exist' : GOOD_GEOMETRY },
      render_controllers: ['controller.render.rptest'],
    },
  },
})

const renderController = {
  format_version: '1.10.0',
  render_controllers: {
    'controller.render.rptest': { geometry: 'Geometry.default', materials: [{ '*': 'Material.default' }], textures: ['Texture.default'] },
  },
}

// Spawns one of each in a row, on the surface, named. Idempotent: clears its own actors first, so a
// restart does not accumulate duplicates.
const bpMain = `import { system, world } from '@minecraft/server'

const ACTORS = ${JSON.stringify(ACTORS.map(({ id, name, x }) => ({ id, name, x })))}
const TAG = 'RENDERCHECK '

system.runTimeout(() => {
  const dim = world.getDimension('overworld')
  try {
    dim.runCommand('tickingarea add -16 -64 -16 16 120 16 renderarea')
  } catch (e) {
    console.warn(TAG + 'tickingarea: ' + ((e && e.message) || e))
  }

  system.runTimeout(() => {
    for (const a of ACTORS) {
      try {
        dim.runCommand('kill @e[type=rptest:' + a.id + ']')
      } catch (e) {}
    }
    for (const a of ACTORS) {
      try {
        const top = dim.getTopmostBlock({ x: a.x, z: 4 })
        const y = top ? top.y + 1 : 0
        const e = dim.spawnEntity('rptest:' + a.id, { x: a.x + 0.5, y, z: 4.5 })
        e.nameTag = a.name
        console.warn(TAG + 'spawned rptest:' + a.id + ' at ' + a.x + ',' + y + ',4')
      } catch (err) {
        console.warn(TAG + 'FAILED rptest:' + a.id + ': ' + ((err && err.message) || err))
      }
    }
    console.warn(TAG + 'ready')
  }, 100)
}, 60)
`

async function stage(dir) {
  const b = join(dir, BP)
  await mkdir(join(b, 'scripts'), { recursive: true })
  await mkdir(join(b, 'entities'), { recursive: true })
  await writeFile(join(b, 'manifest.json'), JSON.stringify(bpManifest, null, 2))
  await writeFile(join(b, 'scripts', 'main.js'), bpMain)
  for (const a of ACTORS) {
    await writeFile(join(b, 'entities', `${a.id}.json`), JSON.stringify(bpEntity(a.id), null, 2))
  }

  const r = join(dir, RP)
  await mkdir(join(r, 'entity'), { recursive: true })
  await mkdir(join(r, 'render_controllers'), { recursive: true })
  await writeFile(join(r, 'manifest.json'), JSON.stringify(rpManifest, null, 2))
  await writeFile(join(r, 'render_controllers', 'rptest.json'), JSON.stringify(renderController, null, 2))
  for (const a of ACTORS) {
    if (!a.client) continue // no_client deliberately gets none
    await writeFile(join(r, 'entity', `${a.id}.entity.json`), JSON.stringify(clientEntity(a.id, a.client), null, 2))
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
  await d(['rm', '-f', PROJECT]).catch(() => {})
  await d(['volume', 'rm', VOLUME]).catch(() => {})

  const stageDir = await mkdtemp(join(tmpdir(), 'rpg-render-'))
  await stage(stageDir)

  await d([
    'run', '-d', '--name', PROJECT,
    '-p', `${PORT}:19132/udp`,
    '-e', 'EULA=TRUE',
    '-e', 'VERSION=' + VERSION,
    '-e', 'LEVEL_NAME=' + LEVEL,
    '-e', 'LEVEL_TYPE=flat',
    '-e', 'GAMEMODE=creative',
    '-e', 'ALLOW_CHEATS=true',
    // The image defaults allow-list to true with an empty allowlist.json, which admits nobody and
    // shows the client a bare connection error. Online-mode stays on, so joining still needs a real
    // Microsoft account.
    '-e', 'ALLOW_LIST=false',
    '-e', 'DEFAULT_PLAYER_PERMISSION_LEVEL=operator',
    '-e', 'SERVER_NAME=rp render check',
    '-e', 'TEXTUREPACK_REQUIRED=true',
    '-e', 'CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true',
    '-v', VOLUME + ':/data',
    IMAGE,
  ])
  log('server starting…')
  await waitFor(/Server started|IPv4 supported/, 420000)

  await d(['exec', PROJECT, 'sh', '-c', 'mkdir -p /data/development_behavior_packs /data/development_resource_packs'])
  await d(['cp', join(stageDir, BP), PROJECT + ':/data/development_behavior_packs/'])
  await d(['cp', join(stageDir, RP), PROJECT + ':/data/development_resource_packs/'])

  const bpList = JSON.stringify([{ pack_id: BP, version: [1, 0, 0] }])
  const rpList = JSON.stringify(NO_RP ? [] : [{ pack_id: RP, version: [1, 0, 0] }])
  await d(['exec', PROJECT, 'sh', '-c',
    "printf '%s' '" + bpList + "' > '/data/worlds/" + LEVEL + "/world_behavior_packs.json'" +
    " && printf '%s' '" + rpList + "' > '/data/worlds/" + LEVEL + "/world_resource_packs.json'"])

  await d(['restart', PROJECT])
  log('deployed; waiting for the actors to spawn…')
  try {
    await waitFor(/RENDERCHECK ready/, 300000)
  } catch (e) {
    log('WARNING: ' + e.message)
  }
  const spawned = (await logsAll()).split('\n').filter((l) => /RENDERCHECK/.test(l)).map((l) => l.trim())
  log('\n' + spawned.join('\n'))

  await rm(stageDir, { recursive: true, force: true })

  log(`
────────────────────────────────────────────────────────────
  server is up${NO_RP ? '   (resource pack DEACTIVATED)' : '   (resource pack active)'}
  address 10.111.1.192    port ${PORT}
  world   flat, creative, you join as operator
────────────────────────────────────────────────────────────`)
}

if (CMD === 'down') await down()
else if (CMD === 'up') await up()
else {
  log('usage: node setup.mjs up [--no-rp] [--port 19132]\n       node setup.mjs down')
  process.exitCode = 2
}
