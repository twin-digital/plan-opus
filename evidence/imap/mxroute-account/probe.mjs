// Probes a real IMAP account for what grinbox's design turns on: what the server can do, whether
// the arrival mailbox keeps a keyword, which mailbox roles the account advertises, and how the
// server treats several connections and rapid reconnects.
//
// Run it with credentials in the environment, which is the only place it reads them from:
//
//   IMAP_HOST=mail.example.com IMAP_USER=you@example.com IMAP_PASS='...' \
//     node evidence/imap/mxroute-account/probe.mjs
//
// IMAP_PORT defaults to 993 and the connection is TLS from the start; set IMAP_STARTTLS=1 for a
// server wanting 143 and an upgrade instead.
//
// What it touches: it creates two mailboxes of its own, GrinboxProbe and GrinboxProbeMoved,
// appends its own two messages, sets a keyword on one, moves it between them, and deletes both at
// the end. INBOX is opened to read its permanent flags and nothing else — no message of yours is
// read, marked, moved, or flagged, and the only thing opening it disturbs is \Recent, the one flag
// the protocol itself has deprecated.
//
// What it prints: findings and a protocol dialogue with the host, the account, the LOGIN line, and
// the names of the user's own folders redacted — a folder list names the people an account
// corresponds with, and the design turns on the roles and the shape of the list rather than on the
// names. The output can be committed as evidence as it stands.

import net from 'node:net'
import tls from 'node:tls'

const HOST = process.env.IMAP_HOST
const PORT = Number(process.env.IMAP_PORT ?? 993)
const USER = process.env.IMAP_USER
const PASS = process.env.IMAP_PASS
const STARTTLS = process.env.IMAP_STARTTLS === '1'

if (!HOST || !USER || !PASS) {
  console.error('set IMAP_HOST, IMAP_USER, and IMAP_PASS in the environment')
  process.exit(1)
}

// Two top-level folders rather than a parent and a child, since the server's hierarchy separator
// is its own business and this probe is not here to guess it.
const box = 'GrinboxProbe'
const destination = 'GrinboxProbeMoved'

// Nothing identifying the account reaches the output — not the host, not the login, and not the
// names of the user's own folders, which name the people they correspond with.
const ROLES = /\\(Archive|Trash|Junk|Sent|Drafts)\b/
const NAMED_BY_EVERY_ACCOUNT = new Set(['INBOX', box, destination])
const redact = (line) => {
  const scrubbed = line
    .replaceAll(HOST, '<host>')
    .replaceAll(USER, '<user>')
    .replaceAll(PASS, '<password>')
    .replace(/^(C: \w+ LOGIN) .*/, '$1 <user> <password>')
  const listed = scrubbed.match(/^(S: \* LIST \(([^)]*)\) "[^"]*" )(.+)$/)
  if (!listed) return scrubbed
  const name = listed[3].replace(/^"|"$/g, '')
  const keep = ROLES.test(listed[2]) || NAMED_BY_EVERY_ACCOUNT.has(name)
  return keep ? scrubbed : `${listed[1]}<folder>`
}

class Imap {
  #socket
  #buffer = ''
  #pending = null
  #failed = null
  #counter = 0
  dialogue = []

  async connect() {
    this.#socket = STARTTLS
      ? net.createConnection({ host: HOST, port: PORT })
      : tls.connect({ host: HOST, port: PORT, servername: HOST })
    this.#socket.setEncoding('utf8')
    this.#socket.on('data', (chunk) => this.#onData(chunk))
    this.#socket.on('error', (error) => this.#failed?.(error))
    await this.#await((line) => line.startsWith('* OK'))
    if (STARTTLS) {
      await this.send('STARTTLS')
      this.#socket = tls.connect({ socket: this.#socket, servername: HOST })
      this.#socket.setEncoding('utf8')
      this.#socket.on('data', (chunk) => this.#onData(chunk))
      this.#socket.on('error', (error) => this.#failed?.(error))
    }
  }

  #onData(chunk) {
    this.#buffer += chunk
    let index
    while ((index = this.#buffer.indexOf('\r\n')) >= 0) {
      const line = this.#buffer.slice(0, index)
      this.#buffer = this.#buffer.slice(index + 2)
      this.dialogue.push(`S: ${redact(line)}`)
      this.#pending?.(line)
    }
  }

  #await(isDone) {
    const lines = []
    return new Promise((resolve, reject) => {
      this.#pending = (line) => {
        lines.push(line)
        if (!isDone(line)) return
        this.#pending = null
        resolve(lines)
      }
      this.#failed = reject
    })
  }

  async send(command, literal) {
    const tag = `a${String(++this.#counter).padStart(3, '0')}`
    this.dialogue.push(redact(`C: ${tag} ${command}`))
    this.#socket.write(`${tag} ${command}\r\n`)
    if (literal !== undefined) {
      await this.#await((line) => line.startsWith('+'))
      this.dialogue.push(`C: <${literal.length} octets>`)
      this.#socket.write(`${literal}\r\n`)
    }
    const lines = await this.#await((line) => line.startsWith(`${tag} `))
    const completion = lines.at(-1)
    if (!completion.startsWith(`${tag} OK`)) throw new Error(`${command} -> ${redact(completion)}`)
    return lines
  }

  close() {
    this.#socket.destroy()
  }
}

const message = (subject) =>
  [
    'From: probe@example.com',
    'To: probe@example.com',
    `Subject: ${subject}`,
    'Date: Wed, 12 Aug 2026 04:00:00 +0000',
    `Message-ID: <grinbox-probe-${subject.toLowerCase()}@example.com>`,
    '',
    `body of ${subject}`,
  ].join('\r\n')

const find = (lines, pattern) => lines.map((l) => l.match(pattern)).find(Boolean)

const findings = []
const report = (label, value) => findings.push(`${label}: ${value}`)

const login = async () => {
  const imap = new Imap()
  await imap.connect()
  await imap.send(`LOGIN ${USER} ${PASS}`)
  return imap
}

const keyword = 'grinbox/finance'
const main = await login()

// 1. what the server can do
const capabilities = find(await main.send('CAPABILITY'), /^\* CAPABILITY (.+)$/)?.[1] ?? ''
report('server capabilities', capabilities)
const has = (extension) => capabilities.split(' ').includes(extension)

// 2. the account's folders, their roles, and the separator the server uses. The names themselves
// stay out of the output — what the design turns on is the roles, the shape, and the separator.
const listed = (await main.send('LIST "" "*" RETURN (SPECIAL-USE)'))
  .map((line) => line.match(/^\* LIST \(([^)]*)\) "([^"]*)" (.+)$/))
  .filter(Boolean)
  .map(([, attributes, separator, raw]) => ({
    attributes,
    separator,
    name: raw.replace(/^"|"$/g, ''),
    role: attributes.match(ROLES)?.[0],
  }))
const separator = listed[0]?.separator
report('the hierarchy separator the server uses', separator ? `"${separator}"` : '(none reported)')
report(
  'the folders a role is advertised for',
  listed.filter((entry) => entry.role).map((entry) => `(${entry.role}) ${entry.name}`).join(' | ') ||
    '(none)',
)
report('how many folders the account holds', String(listed.length))
report(
  'the deepest folder nesting',
  String(Math.max(...listed.map((entry) => entry.name.split(separator).length))),
)
const roleNames = listed.filter((entry) => entry.role).map((entry) => entry.name)
report(
  'how many of those sit beneath a folder carrying a role',
  String(
    listed.filter((entry) => roleNames.some((role) => entry.name.startsWith(`${role}${separator}`)))
      .length,
  ),
)
report(
  'the namespaces the server reports',
  find(await main.send('NAMESPACE'), /^\* NAMESPACE (.+)$/)?.[1] ?? '(NAMESPACE not supported)',
)

// 3. what the arrival mailbox admits. A read-only EXAMINE answers "no permanent flags permitted"
// whatever the mailbox allows, so this has to be a SELECT to mean anything. It reads and writes
// nothing: the only thing a SELECT disturbs is the deprecated \Recent flag.
const inbox = await main.send('SELECT INBOX')
const permanentflags = find(inbox, /\[PERMANENTFLAGS \(([^)]*)\)\]/)?.[1]
report('INBOX PERMANENTFLAGS', permanentflags ?? '(none reported)')
report(
  'INBOX admits client-defined keywords',
  permanentflags?.split(' ').includes('\\*') ? 'yes, \\* is listed' : 'no, \\* is absent',
)
report('INBOX UIDVALIDITY', find(inbox, /\[UIDVALIDITY (\d+)\]/)?.[1])
report('the flags INBOX reports in use', find(inbox, /^\* FLAGS \(([^)]*)\)/)?.[1])

// 4. a keyword's durability, in a mailbox of the probe's own
const discard = async (imap, mailbox) => {
  try {
    await imap.send(`DELETE ${mailbox}`)
  } catch {
    // absent, which is the state we wanted
  }
}
await discard(main, box)
await discard(main, destination)
await main.send(`CREATE ${box}`)
await main.send(`CREATE ${destination}`)
await main.send(`APPEND ${box} {${message('Alpha').length}}`, message('Alpha'))
await main.send(`APPEND ${box} {${message('Beta').length}}`, message('Beta'))
const selected = await main.send(`SELECT ${box}`)
report('the probe mailbox PERMANENTFLAGS', find(selected, /\[PERMANENTFLAGS \(([^)]*)\)\]/)?.[1])
const uid = (await main.send('UID SEARCH ALL'))
  .flatMap((line) => line.match(/^\* SEARCH (.+)$/)?.[1].split(' ') ?? [])
  .at(0)
report('the UID the server gave the first appended message', uid)
await main.send(`UID STORE ${uid} +FLAGS (${keyword})`)
main.close()

const second = await login()
await second.send(`SELECT ${box}`)
const afterReconnect = find(await second.send(`UID FETCH ${uid} (FLAGS)`), /FLAGS \(([^)]*)\)/)?.[1]
report('flags read back in a later session', afterReconnect)
report(
  'the keyword survives a reconnect',
  afterReconnect?.includes(keyword) ? `yes, ${keyword} is still set` : 'no',
)

// 5. what a move costs the message's identity, by whichever means the server offers
const moveKind = has('MOVE') ? 'UID MOVE' : 'UID COPY'
const moved = await second.send(`${moveKind} ${uid} ${destination}`)
const copyuid = find(moved, /\[COPYUID (\d+) (\S+) (\S+)\]/)
report(
  `what ${moveKind} reported`,
  copyuid?.[0].match(/\[COPYUID [^\]]+\]/)?.[0] ?? '(no COPYUID — the server has no UIDPLUS)',
)
await second.send(`SELECT ${destination}`)
const landed =
  copyuid?.[3] ??
  (await second.send('UID SEARCH HEADER Message-ID "grinbox-probe-alpha@example.com"'))
    .flatMap((line) => line.match(/^\* SEARCH (.+)$/)?.[1].split(' ') ?? [])
    .at(0)
report('the UID the message has in the mailbox it landed in', landed ?? '(not found)')
const movedFlags = find(await second.send(`UID FETCH ${landed} (FLAGS)`), /FLAGS \(([^)]*)\)/)?.[1]
report('flags on the message after the move', movedFlags)
report(
  'the keyword survives the move',
  movedFlags?.includes(keyword) ? `yes, ${keyword} is still set` : 'no',
)

// 6. what the host allows a poller: several connections at once, then rapid reconnects
const held = []
let accepted = 0
try {
  for (let i = 0; i < 8; i++) {
    held.push(await login())
    accepted = held.length
  }
  report('simultaneous connections accepted', `${accepted}, which is every one the probe tried`)
} catch (error) {
  report('simultaneous connections accepted', `${accepted}, and the next was refused: ${error.message}`)
}
for (const connection of held) connection.close()

let reconnects = 0
try {
  for (let i = 0; i < 10; i++) {
    const quick = await login()
    reconnects += 1
    quick.close()
  }
  report('rapid consecutive logins accepted', `${reconnects}, none refused or delayed into failure`)
} catch (error) {
  report('rapid consecutive logins accepted', `${reconnects}, then refused: ${error.message}`)
}

// leave the account as it was found
const cleanup = await login()
await discard(cleanup, destination)
await discard(cleanup, box)
report(
  'the account after the probe',
  (await cleanup.send(`LIST "" "GrinboxProbe*"`)).some((line) => line.startsWith('* LIST'))
    ? 'a probe mailbox is still there'
    : 'the probe mailboxes are gone, and nothing else was touched',
)
cleanup.close()
second.close()

console.log('=== findings ===')
for (const finding of findings) console.log(finding)
console.log('')
console.log('=== dialogue ===')
for (const line of [...main.dialogue, ...second.dialogue, ...cleanup.dialogue]) console.log(line)
