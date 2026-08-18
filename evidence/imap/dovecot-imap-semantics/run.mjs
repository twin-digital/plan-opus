// Stands up a stock dovecot, runs probe.mjs against it from a container on the same network, and
// prints what the probe found. Everything is copied into the containers rather than mounted, so
// the docker daemon need not share a filesystem with this script.

import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const NETWORK = 'imap-lab-net'
const SERVER = 'imap-lab'
const CLIENT = 'imap-probe'
const DOVECOT = 'dovecot/dovecot:2.4.4'
const NODE = 'node:24-alpine'

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' })
const quietly = (...args) => {
  try {
    execFileSync('docker', args, { encoding: 'utf8', stdio: 'ignore' })
  } catch {
    // absent, which is the state we wanted
  }
}

quietly('rm', '-f', SERVER, CLIENT)
quietly('network', 'rm', NETWORK)
docker('network', 'create', NETWORK)

docker(
  'create', '--name', SERVER, '--network', NETWORK,
  '-e', 'USER_PASSWORD={PLAIN}labpass',
  DOVECOT,
)
docker('cp', join(here, 'lab.conf'), `${SERVER}:/etc/dovecot/conf.d/99-lab.conf`)
docker('start', SERVER)

docker(
  'create', '--name', CLIENT, '--network', NETWORK,
  '-e', `IMAP_HOST=${SERVER}`, '-e', 'IMAP_PORT=31143',
  NODE, 'node', '/probe.mjs',
)
docker('cp', join(here, 'probe.mjs'), `${CLIENT}:/probe.mjs`)

// The server accepts connections a moment after start; retry rather than guess a sleep.
let output
for (let attempt = 1; ; attempt++) {
  try {
    output = docker('start', '-a', CLIENT)
    break
  } catch (error) {
    if (attempt === 10) throw error
    execFileSync('sleep', ['1'])
  }
}

process.stdout.write(output)
quietly('rm', '-f', SERVER, CLIENT)
quietly('network', 'rm', NETWORK)
