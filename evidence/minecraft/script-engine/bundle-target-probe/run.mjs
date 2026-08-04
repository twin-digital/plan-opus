// Probes what the Minecraft Bedrock dedicated server's script engine accepts, against a real server.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// Each variant under variants/<name>/ is a whole pack payload: everything except ENTRY is copied
// over the deployed pack, and ENTRY (when present) rewrites the manifest's script-module entry.
// Variants without an ENTRY are applied with `send-command reload`, which re-evaluates the
// scripts in place; variants with one restart the server, since the manifest is read at world load.
// Content logging to the console is on, so `console.warn` and script errors both land in
// `docker compose logs` tagged `[Scripting]`.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(DIR, 'OUTPUT.txt')
const POOL = '/data/development_behavior_packs/probe-pack'
const WORLD = '/data/worlds/dev'
const BASE_MANIFEST = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.base.json'), 'utf8'))

fs.writeFileSync(OUT, '')
const log = (s) => {
  process.stdout.write(s + '\n')
  fs.appendFileSync(OUT, s + '\n')
}
const compose = (...args) =>
  execFileSync('docker', ['compose', '-f', path.join(DIR, 'compose.yaml'), ...args], {
    encoding: 'utf8',
    maxBuffer: 64 << 20,
  })

const logs = () => compose('logs', '--no-log-prefix', 'bedrock').split('\n')
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

const STAGE = path.join(DIR, '.stage')

/** Lays out variants/<name> as a complete pack in .stage/, with the manifest its ENTRY asks for. */
const stageVariant = (name) => {
  const src = path.join(DIR, 'variants', name)
  const entryFile = path.join(src, 'ENTRY')
  const entry = fs.existsSync(entryFile) ? fs.readFileSync(entryFile, 'utf8').trim() : 'scripts/main.js'
  fs.rmSync(STAGE, { recursive: true, force: true })
  fs.mkdirSync(STAGE, { recursive: true })
  for (const child of fs.readdirSync(src)) {
    if (child === 'ENTRY') continue
    fs.cpSync(path.join(src, child), path.join(STAGE, child), { recursive: true })
  }
  const manifest = structuredClone(BASE_MANIFEST)
  manifest.modules[0].entry = entry
  fs.writeFileSync(path.join(STAGE, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  return entry
}

/** Wipes the deployed pack and pushes the staged one, so no earlier variant's files linger. */
const deploy = () => {
  compose('exec', '-T', 'bedrock', 'sh', '-c', `rm -rf ${POOL} && mkdir -p ${POOL}`)
  compose('cp', STAGE + '/.', `bedrock:${POOL}`)
}

const waitForNewLines = (before, isDone, timeoutMs) => {
  const deadline = Date.now() + timeoutMs
  let seen = []
  while (Date.now() < deadline) {
    seen = logs().slice(before)
    if (isDone(seen)) return seen
    sleep(1000)
  }
  return seen
}

/** Re-evaluates the scripts in place; returns the [Scripting] lines the reload emitted. */
const reload = (before) => {
  compose('exec', '-T', 'bedrock', 'send-command', 'reload')
  const lines = waitForNewLines(
    before,
    (l) => l.some((x) => x.includes('Function and script files have been reloaded')) && l.some((x) => x.includes('[Scripting]')),
    45000,
  )
  // the scripts evaluate a few seconds after the reload acknowledgement
  sleep(6000)
  return logs().slice(before)
}

/** Restarts the server; returns every line the fresh world load emitted. */
const restart = (before) => {
  compose('restart', 'bedrock')
  waitForNewLines(before, (l) => l.some((x) => x.includes('Server started.')), 120000)
  sleep(6000)
  return logs().slice(before)
}

const interesting = (lines) =>
  lines.filter(
    (l) =>
      l.includes('[Scripting]') ||
      l.includes('Pack Stack') ||
      /\berror\b/i.test(l) && !l.includes('ALLOW LIST') && !l.includes('errorMessage=(null)'),
  )

const runVariant = (name) => {
  const entry = stageVariant(name)
  const usesRestart = fs.existsSync(path.join(DIR, 'variants', name, 'ENTRY'))
  const before = logs().length
  deploy()
  const lines = usesRestart ? restart(before) : reload(before)
  log(`\n=== ${name}   (entry=${entry}, applied by ${usesRestart ? 'restart' : 'reload'})`)
  const files = compose('exec', '-T', 'bedrock', 'find', POOL, '-type', 'f').trim().split('\n').sort()
  log('  pack as deployed:')
  for (const f of files) log(`    ${f}`)
  log('  server said:')
  const said = interesting(lines)
  if (said.length === 0) log('    <no [Scripting] or Pack Stack line>')
  for (const l of said) log(`    ${l.trim()}`)
}

const VARIANTS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'globals',
      'es2020',
      'es2021',
      'es2022-syntax',
      'top-level-await',
      'es2023-2024',
      'regexp-v-flag',
      'async-generators',
      'import-meta',
      'import-sibling-js',
      'import-noext',
      'import-mjs',
      'import-subdir',
      'import-parent-dir',
      'dynamic-import',
      'node-builtin-import',
      'node-globals-bare',
      'cjs-module',
      'orphan-file',
      'entry-mjs',
      'entry-nested',
      'entry-pack-root',
    ]

log('=== environment')
log(execFileSync('docker', ['compose', 'version'], { encoding: 'utf8' }).trim())
log(`DOCKER_HOST=${process.env.DOCKER_HOST ?? '(local socket)'}`)
log(compose('exec', '-T', 'bedrock', 'sh', '-c', 'ls /data | grep bedrock_server-').trim())
log(`world activation list: ${compose('exec', '-T', 'bedrock', 'cat', `${WORLD}/world_behavior_packs.json`).trim()}`)
log(`base manifest: ${JSON.stringify(BASE_MANIFEST)}`)

for (const name of VARIANTS) {
  try {
    runVariant(name)
  } catch (error) {
    log(`\n=== ${name}\n  <harness error> ${error.message}`)
  }
}

log('\n=== done')
