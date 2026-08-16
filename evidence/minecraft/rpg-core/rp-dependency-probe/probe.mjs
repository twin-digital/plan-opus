#!/usr/bin/env node
// Closes the one gap left by cross-pack-probe and rp-detection-probe: what happens to a BEHAVIOR pack
// that declares a manifest `dependencies` uuid entry for a RESOURCE pack.
//
//   A rpdep-absent  the resource pack is not in the pool at all — does the behavior pack still load
//                   and run, as it does when the missing dependency is another behavior pack?
//   B rpdep-active  the resource pack staged and listed active — the control.
//   C rpdep-pull    the resource pack in the pool but absent from the resource activation list — does
//                   the declared dependency activate it, as a behavior-pack dependency is activated?
//
// The behavior pack is byte-identical across all three; only the resource side varies.
//
// Checks are read through `EntityTypes.get` rather than by spawning, so no ticking area is needed.
//
// Usage: node probe.mjs [--keep]

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const PROJECT = 'rpg-rpdep-probe'
const VOLUME = PROJECT + '_data'
const IMAGE = 'itzg/minecraft-bedrock-server:latest'
const VERSION = '1.26.43.1'
const KEEP = process.argv.includes('--keep')

const BP = '6c3a0000-0000-4000-8000-000000000001'
const RP = '6c3a0000-0000-4000-8000-000000000002'

const log = (...a) => console.log(...a)
const d = (args) => exec('docker', args, { maxBuffer: 64 * 1024 * 1024 })

// ---------------------------------------------------------------- packs

// The behavior pack declares a uuid dependency on the resource pack. This is the whole point of the
// probe: nothing else here varies.
const bpManifest = {
  format_version: 2,
  header: { name: 'rpdep behavior', description: 'declares a uuid dependency on a resource pack', uuid: BP, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
  modules: [
    { description: 'data', type: 'data', uuid: '6c3a0000-0000-4000-8000-0000000000a1', version: [1, 0, 0] },
    { description: 'script', type: 'script', language: 'javascript', uuid: '6c3a0000-0000-4000-8000-0000000000b1', entry: 'scripts/main.js', version: [1, 0, 0] },
  ],
  dependencies: [
    { module_name: '@minecraft/server', version: '2.0.0' },
    { uuid: RP, version: [1, 0, 0] },
  ],
}

const rpManifest = {
  format_version: 2,
  header: { name: 'rpdep assets', description: 'the depended-on resource pack', uuid: RP, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
  modules: [{ description: 'resources', type: 'resources', uuid: '6c3a0000-0000-4000-8000-0000000000a2', version: [1, 0, 0] }],
}

const bpEntity = {
  format_version: '1.21.0',
  'minecraft:entity': {
    description: { identifier: 'rpdep:actor', is_spawnable: false, is_summonable: true },
    components: { 'minecraft:physics': {}, 'minecraft:health': { value: 1 }, 'minecraft:collision_box': { width: 0.6, height: 1.9 } },
  },
}

// the resource pack's half of the same entity — present only so the pack is a realistic assets pack
const rpClientEntity = {
  format_version: '1.10.0',
  'minecraft:client_entity': {
    description: {
      identifier: 'rpdep:actor',
      materials: { default: 'entity_alphatest' },
      textures: { default: 'textures/entity/illager/evoker' },
      geometry: { default: 'geometry.evoker.v1.8' },
      render_controllers: ['controller.render.rpdep'],
    },
  },
}

const rpRenderController = {
  format_version: '1.10.0',
  render_controllers: {
    'controller.render.rpdep': { geometry: 'Geometry.default', materials: [{ '*': 'Material.default' }], textures: ['Texture.default'] },
  },
}

const bpMain = `import { system, world, EntityTypes } from '@minecraft/server'

const TAG = 'PROBE bp '
const out = []
const note = (k, v) => out.push(k + '=' + String(v).replaceAll('[', '(').replaceAll(']', ')').slice(0, 300))

note('bp-script-evaluated', true)

system.runTimeout(() => {
  try {
    note('entityType-rpdep:actor', EntityTypes.get('rpdep:actor') === undefined ? 'undefined' : 'defined')
  } catch (e) {
    note('entityType-error', (e && e.message) || e)
  }
  try {
    note('entityTypes-total', EntityTypes.getAll().length)
  } catch (e) {
    note('entityTypes-total-error', (e && e.message) || e)
  }
  try {
    const r = world.getDimension('overworld').runCommand('packstack client')
    note('packstack-client-successCount', r.successCount)
  } catch (e) {
    note('packstack-client', 'THREW ' + ((e && e.message) || e))
  }
  for (const line of out) console.warn(TAG + line)
  console.warn(TAG + 'done')
}, 60)
`

async function stage(dir) {
  const b = join(dir, BP)
  await mkdir(join(b, 'scripts'), { recursive: true })
  await mkdir(join(b, 'entities'), { recursive: true })
  await writeFile(join(b, 'manifest.json'), JSON.stringify(bpManifest, null, 2))
  await writeFile(join(b, 'entities', 'actor.json'), JSON.stringify(bpEntity, null, 2))
  await writeFile(join(b, 'scripts', 'main.js'), bpMain)

  const r = join(dir, RP)
  await mkdir(join(r, 'entity'), { recursive: true })
  await mkdir(join(r, 'render_controllers'), { recursive: true })
  await writeFile(join(r, 'manifest.json'), JSON.stringify(rpManifest, null, 2))
  await writeFile(join(r, 'entity', 'actor.entity.json'), JSON.stringify(rpClientEntity, null, 2))
  await writeFile(join(r, 'render_controllers', 'rpdep.json'), JSON.stringify(rpRenderController, null, 2))
}

// ---------------------------------------------------------------- container

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

const FATAL = /is not allowed\.|Failed to bulk-set properties/i

async function waitFor(pattern, timeoutMs, since) {
  const deadline = Date.now() + timeoutMs
  let text = ''
  while (Date.now() < deadline) {
    text = await logsSince(since)
    if (pattern.test(text)) return text
    const bad = text.split('\n').find((l) => FATAL.test(l) && /ERROR|Failed/.test(l))
    if (bad) throw new Error('server refused to boot: ' + bad.trim())
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('timed out waiting for ' + pattern)
}

// Both pools are emptied: they live on the volume and outlive the world, so a pack left from the
// previous scenario makes "this pack is absent" untestable.
async function deploy({ level, stageDir, rpStaged, rpActive }) {
  await d(['exec', PROJECT, 'sh', '-c',
    'rm -rf /data/development_behavior_packs /data/development_resource_packs && mkdir -p /data/development_behavior_packs /data/development_resource_packs'])
  await d(['cp', join(stageDir, BP), PROJECT + ':/data/development_behavior_packs/'])
  if (rpStaged) await d(['cp', join(stageDir, RP), PROJECT + ':/data/development_resource_packs/'])

  const bpList = JSON.stringify([{ pack_id: BP, version: [1, 0, 0] }])
  const rpList = JSON.stringify(rpActive ? [{ pack_id: RP, version: [1, 0, 0] }] : [])
  await d(['exec', PROJECT, 'sh', '-c',
    "mkdir -p '/data/worlds/" + level + "' && printf '%s' '" + bpList + "' > '/data/worlds/" + level + "/world_behavior_packs.json'" +
    " && printf '%s' '" + rpList + "' > '/data/worlds/" + level + "/world_resource_packs.json'"])

  const pools = await d(['exec', PROJECT, 'sh', '-c',
    'echo bp-pool: $(ls /data/development_behavior_packs); echo rp-pool: $(ls /data/development_resource_packs)'])
  log(pools.stdout.trim())
  log('behavior activation list: ' + bpList)
  log('resource activation list: ' + rpList)
}

async function runScenario({ name, level, stageDir, rpStaged, rpActive }) {
  log('\n=== ' + name)
  log('level: ' + level + '   rp staged: ' + rpStaged + '   rp listed active: ' + rpActive)
  await startFresh(level)
  await waitFor(/Server started|IPv4 supported/, 420000)
  await deploy({ level, stageDir, rpStaged, rpActive })
  const mark = new Date().toISOString()
  await d(['restart', PROJECT])
  try {
    await waitFor(/PROBE bp done/, 300000, mark)
  } catch (e) {
    log('WAIT: ' + e.message)
  }
  await new Promise((r) => setTimeout(r, 8000))
  const text = await logsSince(mark)
  const lines = text
    .split('\n')
    .filter((l) => /PROBE|Pack Stack|dependenc|Dependenc|missing|Missing|rror|ailed|nsupported/i.test(l))
    .map((l) => l.trim())
  log(lines.length ? lines.join('\n') : '(nothing matched)')
  return text
}

// ---------------------------------------------------------------- main

const stageDir = await mkdtemp(join(tmpdir(), 'rpg-rpdep-'))
await stage(stageDir)
log('docker host: ' + (process.env.DOCKER_HOST || '(local)'))
log('image: ' + IMAGE + '   requested VERSION: ' + VERSION)
log('behavior pack ' + BP + ' declares dependencies: [@minecraft/server, uuid ' + RP + ']')
log('resource pack ' + RP)

try {
  await runScenario({ name: 'A rpdep-absent — the declared resource pack is not in the pool at all', level: 'rpdepabsent', stageDir, rpStaged: false, rpActive: false })
  await runScenario({ name: 'B rpdep-active — the declared resource pack staged and listed active', level: 'rpdepactive', stageDir, rpStaged: true, rpActive: true })
  await runScenario({ name: 'C rpdep-pull — staged but absent from the resource activation list', level: 'rpdeppull', stageDir, rpStaged: true, rpActive: false })
} finally {
  if (KEEP) {
    log('\n=== kept: container ' + PROJECT + ', volume ' + VOLUME + ', stage ' + stageDir)
  } else {
    log('\n=== teardown')
    await removeContainer()
    await d(['volume', 'rm', VOLUME]).catch((e) => log('volume rm: ' + e.message))
    await rm(stageDir, { recursive: true, force: true })
    log('container and volume removed')
  }
}
