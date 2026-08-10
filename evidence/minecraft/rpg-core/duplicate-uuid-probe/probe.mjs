#!/usr/bin/env node
// If every adventure bundles a copy of the shared assets pack, a server's pool ends up holding several
// directories that declare the same pack uuid. Is that tolerated, and which copy wins?
//
//   A samever    two pool dirs, same uuid, same version — the identical-duplicate case
//   B mixedver   two pool dirs, same uuid, versions 1.0.0 and 1.1.0 — adventures built at different times
//   C listedtwice  same as A, but the world's activation list names the uuid twice
//   D duprp      two resource-pack dirs sharing one uuid and version
//
// The two copies are distinguishable: copy A defines entity `dup:from_a`, copy B defines `dup:from_b`,
// under the same pack uuid. Whichever entity type resolves names the copy that won. A separate observer
// pack, with its own uuid, does the reporting.
//
// Usage: node probe.mjs [--keep]

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const PROJECT = 'rpg-dupuuid-probe'
const VOLUME = PROJECT + '_data'
const IMAGE = 'itzg/minecraft-bedrock-server:latest'
const VERSION = '1.26.43.1'
const KEEP = process.argv.includes('--keep')

const DUP_BP = '8e5c0000-0000-4000-8000-000000000001' // the uuid both behavior copies claim
const DUP_RP = '8e5c0000-0000-4000-8000-000000000002' // the uuid both resource copies claim
const OBSERVER = '8e5c0000-0000-4000-8000-000000000003'

const log = (...a) => console.log(...a)
const d = (args) => exec('docker', args, { maxBuffer: 32 * 1024 * 1024 })

// ---------------------------------------------------------------- packs

const dupBp = (copy, version) => ({
  manifest: {
    format_version: 2,
    header: { name: `dup copy ${copy} v${version.join('.')}`, description: `copy ${copy}`, uuid: DUP_BP, version, min_engine_version: [1, 21, 0] },
    modules: [{ description: 'data', type: 'data', uuid: '8e5c0000-0000-4000-8000-0000000000a' + (copy === 'a' ? '1' : '2'), version }],
  },
  entity: {
    format_version: '1.21.0',
    'minecraft:entity': {
      description: { identifier: `dup:from_${copy}`, is_spawnable: false, is_summonable: true },
      components: { 'minecraft:physics': {}, 'minecraft:health': { value: 1 } },
    },
  },
})

const dupRp = (copy) => ({
  format_version: 2,
  header: { name: `dup rp copy ${copy}`, description: `resource copy ${copy}`, uuid: DUP_RP, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
  modules: [{ description: 'resources', type: 'resources', uuid: '8e5c0000-0000-4000-8000-0000000000b' + (copy === 'a' ? '1' : '2'), version: [1, 0, 0] }],
})

const observerManifest = {
  format_version: 2,
  header: { name: 'observer', description: 'reports which duplicate won', uuid: OBSERVER, version: [1, 0, 0], min_engine_version: [1, 21, 0] },
  modules: [
    { description: 'data', type: 'data', uuid: '8e5c0000-0000-4000-8000-0000000000c1', version: [1, 0, 0] },
    { description: 'script', type: 'script', language: 'javascript', uuid: '8e5c0000-0000-4000-8000-0000000000c2', entry: 'scripts/main.js', version: [1, 0, 0] },
  ],
  dependencies: [{ module_name: '@minecraft/server', version: '2.0.0' }],
}

const observerMain = `import { system, world, EntityTypes } from '@minecraft/server'

const TAG = 'PROBE '
const out = []
const note = (k, v) => out.push(k + '=' + String(v).replaceAll('[', '(').replaceAll(']', ')').slice(0, 200))

system.runTimeout(() => {
  for (const id of ['dup:from_a', 'dup:from_b']) {
    try {
      note('entityType-' + id, EntityTypes.get(id) === undefined ? 'undefined' : 'defined')
    } catch (e) {
      note('entityType-' + id, 'THREW ' + ((e && e.message) || e))
    }
  }
  try {
    note('packstack-client-successCount', world.getDimension('overworld').runCommand('packstack client').successCount)
  } catch (e) {
    note('packstack-client', 'THREW ' + ((e && e.message) || e))
  }
  for (const line of out) console.warn(TAG + line)
  console.warn(TAG + 'done')
}, 60)
`

async function stage(dir) {
  // two behavior copies at v1.0.0, plus copy b again at v1.1.0
  for (const [name, copy, version] of [['bp_a_v1', 'a', [1, 0, 0]], ['bp_b_v1', 'b', [1, 0, 0]], ['bp_b_v11', 'b', [1, 1, 0]], ['zz_copy_a_v1', 'a', [1, 0, 0]], ['aa_copy_b_v1', 'b', [1, 0, 0]]]) {
    const { manifest, entity } = dupBp(copy, version)
    const root = join(dir, name)
    await mkdir(join(root, 'entities'), { recursive: true })
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2))
    await writeFile(join(root, 'entities', 'e.json'), JSON.stringify(entity, null, 2))
  }
  for (const [name, copy] of [['rp_a', 'a'], ['rp_b', 'b']]) {
    const root = join(dir, name)
    await mkdir(root, { recursive: true })
    await writeFile(join(root, 'manifest.json'), JSON.stringify(dupRp(copy), null, 2))
  }
  const o = join(dir, 'observer')
  await mkdir(join(o, 'scripts'), { recursive: true })
  await writeFile(join(o, 'manifest.json'), JSON.stringify(observerManifest, null, 2))
  await writeFile(join(o, 'scripts', 'main.js'), observerMain)
}

// ---------------------------------------------------------------- container

const removeContainer = () => d(['rm', '-f', PROJECT]).catch(() => {})

async function startFresh(level) {
  await removeContainer()
  await d([
    'run', '-d', '--name', PROJECT,
    '-e', 'EULA=TRUE', '-e', 'VERSION=' + VERSION, '-e', 'LEVEL_NAME=' + level,
    '-e', 'GAMEMODE=creative', '-e', 'ALLOW_CHEATS=true', '-e', 'ALLOW_LIST=false',
    '-e', 'SERVER_NAME=' + PROJECT, '-e', 'CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true',
    '-v', VOLUME + ':/data', IMAGE,
  ])
}

async function logsSince(since) {
  const r = await d(['logs', ...(since ? ['--since', since] : []), PROJECT]).catch(() => ({ stdout: '', stderr: '' }))
  return (r.stdout || '') + (r.stderr || '')
}

async function waitFor(pattern, timeoutMs, since) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const t = await logsSince(since)
    if (pattern.test(t)) return t
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('timed out waiting for ' + pattern)
}

async function runScenario({ name, level, stageDir, bpDirs, rpDirs, bpList, rpList }) {
  log('\n=== ' + name)
  await startFresh(level)
  await waitFor(/Server started|IPv4 supported/, 420000)
  await d(['exec', PROJECT, 'sh', '-c',
    'rm -rf /data/development_behavior_packs /data/development_resource_packs && mkdir -p /data/development_behavior_packs /data/development_resource_packs'])
  for (const b of [...bpDirs, 'observer']) await d(['cp', join(stageDir, b), PROJECT + ':/data/development_behavior_packs/'])
  for (const r of rpDirs) await d(['cp', join(stageDir, r), PROJECT + ':/data/development_resource_packs/'])

  const bp = JSON.stringify(bpList)
  const rp = JSON.stringify(rpList)
  await d(['exec', PROJECT, 'sh', '-c',
    "printf '%s' '" + bp + "' > '/data/worlds/" + level + "/world_behavior_packs.json'" +
    " && printf '%s' '" + rp + "' > '/data/worlds/" + level + "/world_resource_packs.json'"])
  log('bp pool dirs: ' + [...bpDirs, 'observer'].join(' ') + '   rp pool dirs: ' + (rpDirs.join(' ') || '(none)'))
  log('behavior activation list: ' + bp)
  log('resource activation list: ' + rp)

  const mark = new Date().toISOString()
  await d(['restart', PROJECT])
  try {
    await waitFor(/PROBE done/, 300000, mark)
  } catch (e) {
    log('WAIT: ' + e.message)
  }
  await new Promise((r) => setTimeout(r, 6000))
  const text = await logsSince(mark)
  log(text.split('\n').filter((l) => /PROBE|Pack Stack|uplicate|onflict|rror|ailed|gnored/i.test(l)).map((l) => l.trim()).join('\n') || '(nothing matched)')
}

// ---------------------------------------------------------------- main

const stageDir = await mkdtemp(join(tmpdir(), 'rpg-dup-'))
await stage(stageDir)
const V1 = { pack_id: DUP_BP, version: [1, 0, 0] }
const OBS = { pack_id: OBSERVER, version: [1, 0, 0] }
const RPV1 = { pack_id: DUP_RP, version: [1, 0, 0] }
log('behavior copies share uuid ' + DUP_BP + '; resource copies share ' + DUP_RP)

try {
  await runScenario({
    name: 'A samever — two behavior dirs, same uuid, same version 1.0.0',
    level: 'samever', stageDir, bpDirs: ['bp_a_v1', 'bp_b_v1'], rpDirs: [], bpList: [V1, OBS], rpList: [],
  })
  await runScenario({
    name: 'B mixedver — same uuid, copy a at 1.0.0 and copy b at 1.1.0, list pins 1.0.0',
    level: 'mixedver', stageDir, bpDirs: ['bp_a_v1', 'bp_b_v11'], rpDirs: [], bpList: [V1, OBS], rpList: [],
  })
  await runScenario({
    name: 'C listedtwice — identical duplicates, activation list names the uuid twice',
    level: 'listedtwice', stageDir, bpDirs: ['bp_a_v1', 'bp_b_v1'], rpDirs: [], bpList: [V1, V1, OBS], rpList: [],
  })
  await runScenario({
    name: 'D duprp — two resource dirs sharing one uuid and version',
    level: 'duprp', stageDir, bpDirs: ['bp_a_v1'], rpDirs: ['rp_a', 'rp_b'], bpList: [V1, OBS], rpList: [RPV1],
  })
  // B left two explanations for copy a winning: the activation list pinned 1.0.0, or directory order.
  // E pins the *higher* version instead — if the pin governs, copy b loads.
  await runScenario({
    name: 'E pinhigher — same pool as B, activation list pins 1.1.0 instead',
    level: 'pinhigher', stageDir, bpDirs: ['bp_a_v1', 'bp_b_v11'], rpDirs: [],
    bpList: [{ pack_id: DUP_BP, version: [1, 1, 0] }, OBS], rpList: [],
  })
  // F is the tie case with the directory names inverted — copy b now sorts first. If copy b wins here
  // and copy a won in A, directory order is what breaks a tie.
  await runScenario({
    name: 'F tieorder — identical versions, directory names inverted so copy b sorts first',
    level: 'tieorder', stageDir, bpDirs: ['zz_copy_a_v1', 'aa_copy_b_v1'], rpDirs: [], bpList: [V1, OBS], rpList: [],
  })
  // E showed the pin selects. G asks what a pin no copy in the pool satisfies does — the state a world
  // reaches when a bundled copy is replaced by a different version than its activation list names.
  await runScenario({
    name: 'G pinmissing — pool holds 1.0.0 and 1.1.0, activation list pins 1.2.0',
    level: 'pinmissing', stageDir, bpDirs: ['bp_a_v1', 'bp_b_v11'], rpDirs: [],
    bpList: [{ pack_id: DUP_BP, version: [1, 2, 0] }, OBS], rpList: [],
  })
} finally {
  if (KEEP) log('\n=== kept: ' + PROJECT + ' / ' + VOLUME + ' / ' + stageDir)
  else {
    log('\n=== teardown')
    await removeContainer()
    await d(['volume', 'rm', VOLUME]).catch((e) => log('volume rm: ' + e.message))
    await rm(stageDir, { recursive: true, force: true })
    log('container and volume removed')
  }
}
