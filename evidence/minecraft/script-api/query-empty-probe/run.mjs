// Drives the empty-query-array probe against a real Bedrock dedicated server, headless.
//
//   node run.mjs [runs]     # default 1; writes OUTPUT.txt beside this file
//
// The server is this directory's compose stack, the pack is ./pack, and every observation reaches
// the container log through console.warn — no client attaches at any point. Each pass triggers the
// one set and waits for its own `complete` line, so a set that stops early is visible as a missing
// line rather than as a truncated pass.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(DIR, 'OUTPUT.txt')
const COMPOSE = path.join(DIR, 'compose.yaml')
const CONTAINER = 'query-empty-probe-bedrock-1'
const PACK_UUID = 'bfcb5c57-2edb-4356-a548-8f931e35c8b1'
const SETS = ['empty']
const RUNS = Number(process.argv[2] ?? 1)

const log = (s) => {
  process.stdout.write(s + '\n')
  fs.appendFileSync(OUT, s + '\n')
}
const compose = (...args) =>
  execFileSync('docker', ['compose', '-f', COMPOSE, ...args], { encoding: 'utf8', maxBuffer: 256 << 20 })
const send = (c) => {
  try {
    compose('exec', '-T', 'bedrock', 'send-command', c)
  } catch {
    /* replies do not reach the log */
  }
}
const logs = () => compose('logs', '--no-log-prefix', 'bedrock')
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

const waitFor = (needle, timeoutMs) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (logs().includes(needle)) return true
    sleep(5000)
  }
  return false
}
const countOf = (needle) => logs().split(needle).length - 1

fs.writeFileSync(OUT, '')
log(`# empty query array probe — ${RUNS} run(s)`)

compose('up', '-d')
if (!waitFor('Server started', 300_000)) {
  log('SERVER DID NOT START')
  process.exit(1)
}
// clear the destination first: `docker cp <dir> <container>:<existing-dir>` copies the source
// *into* it, so a second run against a live container nests the new pack under the old one
compose('exec', '-T', 'bedrock', 'rm', '-rf', '/data/development_behavior_packs/qprobe')
execFileSync('docker', ['cp', path.join(DIR, 'pack'), `${CONTAINER}:/data/development_behavior_packs/qprobe`])
const activation = path.join(DIR, 'world_behavior_packs.json')
fs.writeFileSync(activation, JSON.stringify([{ pack_id: PACK_UUID, version: [0, 1, 0] }]))
execFileSync('docker', ['cp', activation, `${CONTAINER}:/data/worlds/dev/world_behavior_packs.json`])
compose('restart', 'bedrock')
if (!waitFor('[qprobe] boot :: ready', 300_000)) {
  log('PACK DID NOT LOAD')
  process.exit(1)
}

const version = (logs().match(/Version: ([\d.]+)/) ?? [])[1] ?? 'unknown'
log(`server=${version} pack=${PACK_UUID}`)

for (let run = 1; run <= RUNS; run++) {
  for (const set of SETS) {
    const want = countOf(`${set} :: complete`) + 1
    log(`\n--- run ${run} / set ${set} ---`)
    send(`scriptevent qprobe:${set}`)
    const deadline = Date.now() + 900_000
    let done = false
    while (Date.now() < deadline) {
      if (countOf(`${set} :: complete`) >= want) {
        done = true
        break
      }
      sleep(5000)
    }
    if (!done) log(`SET ${set} DID NOT COMPLETE (run ${run})`)
  }
}

log('\n=== raw [qprobe] lines, delivery order ===')
for (const line of logs().split('\n')) if (line.includes('[qprobe]')) log(line.trimEnd())
log('\n=== end ===')
