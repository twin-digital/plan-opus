// Probes an IMAP server for the semantics grinbox's poll seam rests on: what identifies a
// message, whether a client-defined keyword survives a reconnect and a move, and which mailbox
// roles the server advertises.
//
// Expects an IMAP server on 127.0.0.1:$IMAP_PORT accepting cleartext LOGIN. start-server.sh
// stands one up.

import net from 'node:net'

const HOST = process.env.IMAP_HOST ?? '127.0.0.1'
const PORT = Number(process.env.IMAP_PORT ?? 14300)
const USER = process.env.IMAP_USER ?? 'lab@example.com'
const PASS = process.env.IMAP_PASS ?? 'labpass'

class Imap {
  #socket
  #buffer = ''
  #pending = null
  #failed = null
  #counter = 0
  dialogue = []

  async connect() {
    this.#socket = net.createConnection({ host: HOST, port: PORT })
    this.#socket.setEncoding('utf8')
    this.#socket.on('data', (chunk) => this.#onData(chunk))
    this.#socket.on('error', (error) => this.#failed?.(error))
    await this.#await((line) => line.startsWith('* OK'))
  }

  #onData(chunk) {
    this.#buffer += chunk
    let index
    while ((index = this.#buffer.indexOf('\r\n')) >= 0) {
      const line = this.#buffer.slice(0, index)
      this.#buffer = this.#buffer.slice(index + 2)
      this.dialogue.push(`S: ${line}`)
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

  // Runs one command and returns every untagged line plus the tagged completion.
  async send(command, literal) {
    const tag = `a${String(++this.#counter).padStart(3, '0')}`
    this.dialogue.push(`C: ${tag} ${command}`)
    this.#socket.write(`${tag} ${command}\r\n`)
    if (literal !== undefined) {
      await this.#await((line) => line.startsWith('+'))
      this.dialogue.push(`C: <${literal.length} octets>`)
      this.#socket.write(`${literal}\r\n`)
    }
    const lines = await this.#await((line) => line.startsWith(`${tag} `))
    const completion = lines.at(-1)
    if (!completion.startsWith(`${tag} OK`)) throw new Error(`${command} -> ${completion}`)
    return lines
  }

  close() {
    this.#socket.destroy()
  }
}

const message = (subject) =>
  [
    'From: sender@example.com',
    'To: lab@example.com',
    `Subject: ${subject}`,
    'Date: Wed, 12 Aug 2026 04:00:00 +0000',
    `Message-ID: <${subject.toLowerCase()}@example.com>`,
    '',
    `body of ${subject}`,
  ].join('\r\n')

const find = (lines, pattern) => lines.map((l) => l.match(pattern)).find(Boolean)

const findings = []
const report = (label, value) => findings.push(`${label}: ${value}`)

const first = new Imap()
await first.connect()
await first.send(`LOGIN ${USER} ${PASS}`)

// A fresh mailbox per run, so nothing carries over between runs.
const box = 'GrinboxProbe'
try {
  await first.send(`DELETE ${box}`)
} catch {
  // absent on the first run
}
await first.send(`CREATE ${box}`)
await first.send(`APPEND ${box} {${message('Alpha').length}}`, message('Alpha'))
await first.send(`APPEND ${box} {${message('Beta').length}}`, message('Beta'))

const selected = await first.send(`SELECT ${box}`)
const uidvalidity = find(selected, /\[UIDVALIDITY (\d+)\]/)?.[1]
const uidnextBefore = find(selected, /\[UIDNEXT (\d+)\]/)?.[1]
const permanentflags = find(selected, /\[PERMANENTFLAGS \(([^)]*)\)\]/)?.[1]

report('server capabilities', find(await first.send('CAPABILITY'), /^\* CAPABILITY (.+)$/)?.[1])
report('selected mailbox UIDVALIDITY', uidvalidity)
report('selected mailbox UIDNEXT before any further append', uidnextBefore)
report('selected mailbox PERMANENTFLAGS', permanentflags)
report(
  'PERMANENTFLAGS admits client-defined keywords',
  permanentflags?.split(' ').includes('\\*') ? 'yes, \\* is listed' : 'no, \\* is absent',
)

const uids = (await first.send('UID SEARCH ALL'))
  .flatMap((line) => line.match(/^\* SEARCH (.+)$/)?.[1].split(' ') ?? [])
report('UIDs assigned to the two appended messages', uids.join(', '))

// A keyword of grinbox's own, set on the first message.
const keyword = 'grinbox/finance'
await first.send(`UID STORE ${uids[0]} +FLAGS (${keyword})`)
const storedFlags = find(await first.send(`UID FETCH ${uids[0]} (FLAGS)`), /FLAGS \(([^)]*)\)/)?.[1]
report('flags on the message in the session that set the keyword', storedFlags)

// Appending after the fetch, to see UIDNEXT move.
await first.send(`APPEND ${box} {${message('Gamma').length}}`, message('Gamma'))
const status = await first.send(`STATUS ${box} (UIDNEXT UIDVALIDITY MESSAGES)`)
report('STATUS after a third message was appended', find(status, /^\* STATUS .*$/)?.[0])

const listing = async (imap) =>
  (await imap.send('LIST "" "*" RETURN (SPECIAL-USE)'))
    .filter((line) => /^\* LIST /.test(line))
    .map((line) => line.replace(/^\* LIST /, ''))
    .join(' | ')

report('every mailbox the account holds, with the roles advertised for them', await listing(first))
// The mailbox archiving needs, where the account has none.
await first.send('CREATE Archive (USE (\\Archive))')
report('creating a mailbox in the archive role', 'accepted: CREATE Archive (USE (\\Archive))')
report('every mailbox and role after that create', await listing(first))
// A message already in the destination, so the move below cannot land on a coincidental UID.
await first.send(`APPEND Archive {${message('Delta').length}}`, message('Delta'))
first.close()

// A second connection: everything below is a session that did not set the keyword.
const second = new Imap()
await second.connect()
await second.send(`LOGIN ${USER} ${PASS}`)
const reselected = await second.send(`SELECT ${box}`)
report(
  'UIDVALIDITY in a later session is unchanged',
  find(reselected, /\[UIDVALIDITY (\d+)\]/)?.[1] === uidvalidity ? `yes, still ${uidvalidity}` : 'no',
)
const afterReconnect = find(
  await second.send(`UID FETCH ${uids[0]} (FLAGS)`),
  /FLAGS \(([^)]*)\)/,
)?.[1]
report('flags read back in a later session', afterReconnect)
report(
  'the keyword survives a reconnect',
  afterReconnect?.includes(keyword) ? `yes, ${keyword} is still set` : 'no',
)

// Moving the message out of the mailbox, as archiving does.
const moved = await second.send(`UID MOVE ${uids[0]} Archive`)
const copyuid = find(moved, /\[COPYUID (\d+) (\S+) (\S+)\]/)
report('COPYUID reported by the move', copyuid?.[0].match(/\[COPYUID [^\]]+\]/)?.[0])
report(
  'the moved message is identified afresh by the destination',
  `UID ${copyuid[2]} under UIDVALIDITY ${uidvalidity} in the source became UID ${copyuid[3]} under UIDVALIDITY ${copyuid[1]} in Archive`,
)

const searchAfterMove = await second.send(`UID SEARCH ALL`)
report(
  'UIDs remaining in the source mailbox after the move',
  searchAfterMove.flatMap((line) => line.match(/^\* SEARCH (.*)$/)?.[1].split(' ') ?? []).join(', ')
    || '(none reported)',
)

await second.send('SELECT Archive')
const movedFlags = find(
  await second.send(`UID FETCH ${copyuid[3]} (FLAGS)`),
  /FLAGS \(([^)]*)\)/,
)?.[1]
report('flags on the message after the move', movedFlags)
report(
  'the keyword survives the move',
  movedFlags?.includes(keyword) ? `yes, ${keyword} is still set` : 'no',
)

// The whole-mailbox snapshot the reconcile takes.
const snapshot = await second.send('UID FETCH 1:* (UID FLAGS)')
report(
  'one fetch enumerates every message in a mailbox with its flags',
  snapshot.filter((line) => /^\* \d+ FETCH/.test(line)).join(' | '),
)
second.close()

console.log('=== findings ===')
for (const finding of findings) console.log(finding)
console.log('')
console.log('=== dialogue ===')
for (const line of [...first.dialogue, ...second.dialogue]) console.log(line)
