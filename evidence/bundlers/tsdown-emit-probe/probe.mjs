// What tsdown writes into outDir when a plugin empties the bundle object in `generateBundle`, and
// whether anything already there is touched. The fixture is synthesised into a temp directory.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { build } = await import('tsdown')
const tsdownVersion = JSON.parse(
  fs.readFileSync(new URL(import.meta.resolve('tsdown/package.json')), 'utf8'),
).version

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdown-emit-'))
const write = (rel, body) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), body)
}
write('package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', type: 'module' }))
write('src/main.ts', "import { helper } from './helper.js'\nconsole.log(helper())\n")
write('src/helper.ts', "export const helper = () => 'HELPED'\n")

// records the order hooks fire in and what the plugin saw
const events = []

const emptyingPlugin = (outPath) => ({
  name: 'empties-the-bundle',
  generateBundle(_options, bundle) {
    const names = Object.keys(bundle)
    events.push(`generateBundle saw: ${names.join(', ')}`)
    for (const name of names) delete bundle[name]
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, '// written by the plugin in generateBundle\n')
    events.push(`plugin wrote: ${path.relative(dir, outPath)}`)
  },
  writeBundle(_options, bundle) {
    events.push(`writeBundle saw: ${Object.keys(bundle).join(', ') || '(nothing)'}`)
  },
})

const passivePlugin = {
  name: 'leaves-the-bundle-alone',
  generateBundle(_options, bundle) {
    events.push(`generateBundle saw: ${Object.keys(bundle).join(', ')}`)
  },
}

const listing = (root) => {
  const out = []
  const walk = (d, prefix) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) walk(full, `${prefix}${e.name}/`)
      else out.push(`${prefix}${e.name}`)
    }
  }
  if (!fs.existsSync(root)) return ['(outDir does not exist)']
  walk(root, '')
  return out.length ? out : ['(outDir exists, empty)']
}

const results = []
const run = async (label, { plugins, seed }) => {
  events.length = 0
  const outDir = path.join(dir, 'dist', label.replace(/[^a-z0-9]+/gi, '-'))
  fs.rmSync(outDir, { recursive: true, force: true })
  if (seed) {
    fs.mkdirSync(path.dirname(path.join(outDir, seed)), { recursive: true })
    fs.writeFileSync(path.join(outDir, seed), 'STALE-SEED\n')
  }
  await build({
    cwd: dir,
    config: false,
    entry: path.join(dir, 'src/main.ts'),
    outDir,
    format: ['esm'],
    dts: false,
    clean: false,
    silent: true,
    plugins: plugins(outDir),
  })
  const seedBody = seed && fs.existsSync(path.join(outDir, seed))
    ? fs.readFileSync(path.join(outDir, seed), 'utf8').trim()
    : '(gone)'
  results.push(
    `--- ${label}`,
    ...events.map((e) => `    ${e}`),
    `    outDir after: ${listing(outDir).join(' | ')}`,
    ...(seed ? [`    seeded ${seed}: ${seedBody}`] : []),
  )
}

await run('plugin empties the bundle and writes its own file', {
  plugins: (outDir) => [emptyingPlugin(path.join(outDir, 'scripts/main.js'))],
})
await run('plugin leaves the bundle alone', { plugins: () => [passivePlugin] })
await run('plugin empties the bundle, stale file already in outDir, clean false', {
  plugins: (outDir) => [emptyingPlugin(path.join(outDir, 'scripts/main.js'))],
  seed: 'left-over.txt',
})

fs.rmSync(dir, { recursive: true, force: true })

console.log('')
console.log('=== RESULTS ===')
console.log(`tsdown ${tsdownVersion} on node ${process.version}`)
console.log('fixture: src/main.ts imports src/helper.ts; every build runs with clean: false')
console.log('')
for (const line of results) console.log(line)
