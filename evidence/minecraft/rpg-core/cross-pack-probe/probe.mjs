#!/usr/bin/env node
// Probes two questions about what crosses a behavior-pack boundary:
//
//   Q1 (q-cam2g9om) does an entity type defined in one behavior pack resolve for a script running
//                  in a different behavior pack? Run with the manifest dependency declared, without
//                  it, and with the defining pack absent altogether.
//   Q2 (q-abwhpdno) can a script module in one behavior pack import a module from another? One
//                  static-import specifier shape per pack, plus a dynamic import.
//
// Headless: each pack reports through console.warn, which the server prints to its console, so
// nothing here needs a Minecraft client.
//
// Usage: node probe.mjs [--keep]

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const PROJECT = 'rpg-crosspack-probe'
const VOLUME = PROJECT + '_data'
const IMAGE = 'itzg/minecraft-bedrock-server:latest'
const VERSION = '1.26.43.1'
const SCRIPT_API = '2.0.0'
const MIN_ENGINE = [1, 21, 0]
const KEEP = process.argv.includes('--keep')

const PROVIDER = '4a1f0000-0000-4000-8000-000000000001'
const CONSUMER_DEP = '4a1f0000-0000-4000-8000-000000000002'
const CONSUMER_NODEP = '4a1f0000-0000-4000-8000-000000000003'

const IMPORTERS = [
  { slug: 'rel-pool', uuid: '4a1f0000-0000-4000-8000-000000000011', spec: '../../' + PROVIDER + '/scripts/lib.js' },
  { slug: 'rel-up', uuid: '4a1f0000-0000-4000-8000-000000000012', spec: '../../../development_behavior_packs/' + PROVIDER + '/scripts/lib.js' },
  { slug: 'abs-pool', uuid: '4a1f0000-0000-4000-8000-000000000013', spec: '/development_behavior_packs/' + PROVIDER + '/scripts/lib.js' },
  { slug: 'bare', uuid: '4a1f0000-0000-4000-8000-000000000014', spec: 'probe-provider/lib.js' },
  { slug: 'dynamic', uuid: '4a1f0000-0000-4000-8000-000000000015', spec: null },
]

const log = (...a) => console.log(...a)
const d = (args) => exec('docker', args, { maxBuffer: 64 * 1024 * 1024 })

// ---------------------------------------------------------------- pack authoring

const manifest = ({ name, uuid, moduleUuid, scriptUuid, deps = [] }) => ({
  format_version: 2,
  header: { name, description: name, uuid, version: [1, 0, 0], min_engine_version: MIN_ENGINE },
  modules: [
    { description: 'data', type: 'data', uuid: moduleUuid, version: [1, 0, 0] },
    { description: 'script', type: 'script', language: 'javascript', uuid: scriptUuid, entry: 'scripts/main.js', version: [1, 0, 0] },
  ],
  dependencies: [
    { module_name: '@minecraft/server', version: SCRIPT_API },
    ...deps.map((u) => ({ uuid: u, version: [1, 0, 0] })),
  ],
})

// Reports through console.warn, which the server prints as a [Scripting] line once
// content-log-console-output-enabled is set. `say` is unusable for this: a '[' anywhere in the
// message is a command parse error ('Unexpected "["'), and the values here carry brackets.
//
// The body runs inside a delayed tick, not at module scope, because spawning and running commands
// are not permitted during early execution.
const reporter = (tag, head, body) =>
  String.raw`${head}import { system, world } from '@minecraft/server'

const TAG = 'PROBE ${tag} '
const out = []
const note = (k, v) => out.push(k + '=' + String(v).replaceAll('[', '(').replaceAll(']', ')').slice(0, 300))
const report = () => {
  for (const line of out) console.warn(TAG + line)
  console.warn(TAG + 'done')
}

system.runTimeout(() => {
  try {
${body}
  } catch (e) {
    note('threw', (e && e.message) || e)
    report()
  }
}, 60)
`

const providerEntity = {
  format_version: '1.21.0',
  'minecraft:entity': {
    description: { identifier: 'probe:actor', is_spawnable: false, is_summonable: true },
    components: {
      'minecraft:physics': {},
      'minecraft:health': { value: 1 },
      'minecraft:collision_box': { width: 0.6, height: 1.9 },
      'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: 'no' }] },
    },
  },
}

// Q1: spawn the provider pack's entity type from this pack's script, two ways.
// A ticking area is forced first: with no player connected, an arbitrary location is not in a
// loaded ticking chunk, and spawnEntity's chunk check fires before it ever looks at the identifier —
// which masks the question being asked.
const Q1_BODY = String.raw`    const dim = world.getDimension('overworld')
    try {
      dim.runCommand('tickingarea add 0 0 0 48 100 48 probearea')
      note('tickingarea', 'ok')
    } catch (e) {
      note('tickingarea', 'THREW ' + ((e && e.message) || e))
    }
    system.runTimeout(() => {
      try {
        const spawned = dim.spawnEntity('probe:actor', { x: 8, y: 70, z: 8 })
        note('spawnEntity', 'ok')
        note('spawned-typeId', spawned.typeId)
      } catch (e) {
        note('spawnEntity', 'THREW')
        note('spawnEntity-error', (e && e.message) || e)
      }
      try {
        note('count-after-spawn', dim.getEntities({ type: 'probe:actor' }).length)
      } catch (e) {
        note('count-error', (e && e.message) || e)
      }
      try {
        dim.runCommand('summon probe:actor 8 70 12')
        note('summon-command', 'ok')
      } catch (e) {
        note('summon-command', 'THREW ' + ((e && e.message) || e))
      }
      try {
        note('count-after-summon', dim.getEntities({ type: 'probe:actor' }).length)
      } catch (e) {
        note('count2-error', (e && e.message) || e)
      }
      report()
    }, 200)`

function buildPacks() {
  const provider = {
    dirName: PROVIDER,
    manifest: manifest({
      name: 'probe provider',
      uuid: PROVIDER,
      moduleUuid: '4a1f0000-0000-4000-8000-0000000000a1',
      scriptUuid: '4a1f0000-0000-4000-8000-0000000000b1',
    }),
    entity: providerEntity,
    scripts: {
      'lib.js': "export const PROVIDER_TOKEN = 'provider-lib-loaded'\n",
      'main.js': reporter('provider', '', "    note('provider-script-evaluated', true)\n    report()"),
    },
  }

  const consumerDep = {
    dirName: CONSUMER_DEP,
    manifest: manifest({
      name: 'probe consumer dep',
      uuid: CONSUMER_DEP,
      moduleUuid: '4a1f0000-0000-4000-8000-0000000000a2',
      scriptUuid: '4a1f0000-0000-4000-8000-0000000000b2',
      deps: [PROVIDER],
    }),
    scripts: { 'main.js': reporter('q1-dep', '', Q1_BODY) },
  }

  const consumerNoDep = {
    dirName: CONSUMER_NODEP,
    manifest: manifest({
      name: 'probe consumer nodep',
      uuid: CONSUMER_NODEP,
      moduleUuid: '4a1f0000-0000-4000-8000-0000000000a3',
      scriptUuid: '4a1f0000-0000-4000-8000-0000000000b3',
    }),
    scripts: { 'main.js': reporter('q1-nodep', '', Q1_BODY) },
  }

  const importers = IMPORTERS.map((i, n) => {
    const dynSpec = '../../' + PROVIDER + '/scripts/lib.js'
    const head = i.spec === null ? '' : 'import { PROVIDER_TOKEN } from ' + JSON.stringify(i.spec) + '\n'
    const body =
      i.spec === null
        ? String.raw`    note('specifier', 'dynamic ${dynSpec}')
    import('${dynSpec}').then(
      (r) => console.warn(TAG + 'dynamic-resolved=' + (r && r.PROVIDER_TOKEN)),
      (e) => console.warn(TAG + 'dynamic-rejected=' + String((e && e.message) || e).replaceAll('[', '(')),
    )
    report()`
        : String.raw`    note('specifier', ${JSON.stringify(i.spec)})
    note('imported-token', PROVIDER_TOKEN)
    report()`
    return {
      dirName: i.uuid,
      manifest: manifest({
        name: 'probe importer ' + i.slug,
        uuid: i.uuid,
        moduleUuid: '4a1f0000-0000-4000-8000-00000000c' + String(n).padStart(3, '0'),
        scriptUuid: '4a1f0000-0000-4000-8000-00000000d' + String(n).padStart(3, '0'),
        deps: [PROVIDER],
      }),
      scripts: { 'main.js': reporter('q2-' + i.slug, head, body) },
    }
  })

  return { provider, consumerDep, consumerNoDep, importers }
}

async function stagePacks(dir, packs) {
  for (const p of packs) {
    const root = join(dir, p.dirName)
    await mkdir(join(root, 'scripts'), { recursive: true })
    await writeFile(join(root, 'manifest.json'), JSON.stringify(p.manifest, null, 2))
    if (p.entity) {
      await mkdir(join(root, 'entities'), { recursive: true })
      await writeFile(join(root, 'entities', 'probe_actor.json'), JSON.stringify(p.entity, null, 2))
    }
    for (const [name, contents] of Object.entries(p.scripts)) {
      await writeFile(join(root, 'scripts', name), contents)
    }
  }
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
    // online-mode is left at its default: no client joins, and offline mode plus the image's
    // default allowlist is refused by the server ("Using an allowlist without online
    // authentication ... is not allowed"), which stalls world creation.
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

// fails fast on the boot errors that stall world creation instead of burning the whole timeout
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

// The pool is emptied first: it lives on the volume and would otherwise carry the previous
// scenario's packs, which makes "this pack is absent" untestable.
async function deploy(stageDir, staged, activated, level) {
  await d(['exec', PROJECT, 'sh', '-c', 'rm -rf /data/development_behavior_packs && mkdir -p /data/development_behavior_packs'])
  for (const p of staged) {
    await d(['cp', join(stageDir, p.dirName), PROJECT + ':/data/development_behavior_packs/'])
  }
  const json = JSON.stringify(activated.map((p) => ({ pack_id: p.manifest.header.uuid, version: [1, 0, 0] })))
  await d(['exec', PROJECT, 'sh', '-c',
    "mkdir -p '/data/worlds/" + level + "' && printf '%s' '" + json + "' > '/data/worlds/" + level + "/world_behavior_packs.json'"])
  const pool = await d(['exec', PROJECT, 'sh', '-c', 'ls /data/development_behavior_packs'])
  log('pool: ' + pool.stdout.trim().split('\n').join(' '))
  log('activation list: ' + json)
}

async function runScenario({ name, level, staged, activated, stageDir }) {
  log('\n=== ' + name)
  log('level: ' + level)
  log('staged in pool: ' + staged.map((p) => p.manifest.header.name).join(' | '))
  log('listed active: ' + activated.map((p) => p.manifest.header.name).join(' | '))
  await startFresh(level)
  await waitFor(/Server started|IPv4 supported/, 420000)
  const boot = await logsSince()
  const v = boot.match(/Version[:\s]+([\d.]+)/)
  log('server version: ' + (v ? v[1] : '(not reported)'))
  await deploy(stageDir, staged, activated, level)
  const mark = new Date().toISOString()
  await d(['restart', PROJECT])
  try {
    await waitFor(/Server started|IPv4 supported/, 420000, mark)
  } catch (e) {
    log('  ' + e.message)
  }
  await new Promise((r) => setTimeout(r, 30000)) // let the delayed reporters fire
  const text = await logsSince(mark)
  const lines = text
    .split('\n')
    .filter((l) => /PROBE|Pack Stack|script|Script|rror|ailed|nsupported|ependenc/i.test(l))
    .map((l) => l.trim())
  log(lines.length ? lines.join('\n') : '  (nothing matched)')
  return text
}

// ---------------------------------------------------------------- main

const stageDir = await mkdtemp(join(tmpdir(), 'rpg-crosspack-'))
const { provider, consumerDep, consumerNoDep, importers } = buildPacks()
await stagePacks(stageDir, [provider, consumerDep, consumerNoDep, ...importers])
log('docker host: ' + (process.env.DOCKER_HOST || '(local)'))
log('image: ' + IMAGE + '   requested VERSION: ' + VERSION)
log('staged packs in ' + stageDir)

try {
  await runScenario({
    name: 'Q1 — consumer spawns the provider pack entity, dependency declared, both listed active',
    level: 'q1dep', staged: [provider, consumerDep], activated: [provider, consumerDep], stageDir,
  })
  await runScenario({
    name: 'Q1 control — same, but the consumer declares no dependency',
    level: 'q1nodep', staged: [provider, consumerNoDep], activated: [provider, consumerNoDep], stageDir,
  })
  await runScenario({
    name: 'Q1 — provider in the pool but absent from the activation list; does the declared dependency pull it in?',
    level: 'q1pull', staged: [provider, consumerDep], activated: [consumerDep], stageDir,
  })
  await runScenario({
    name: 'Q1 control — provider not in the pool at all; is the declared dependency enforced?',
    level: 'q1missing', staged: [consumerDep], activated: [consumerDep], stageDir,
  })
  await runScenario({
    name: 'Q2 — one cross-pack import specifier per pack',
    level: 'q2', staged: [provider, ...importers], activated: [provider, ...importers], stageDir,
  })
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
