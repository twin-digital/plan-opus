// What tsdown names the entry chunk it writes, whether `outputOptions.entryFileNames` changes that
// name, what a split chunk and a sourcemap add to the bundle object, and whether a file the
// bundler wrote survives a plugin deleting it from `writeBundle`. The fixture is synthesised into
// a temp directory.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { build } = await import('tsdown')
const tsdownVersion = JSON.parse(
  fs.readFileSync(new URL(import.meta.resolve('tsdown/package.json')), 'utf8'),
).version

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdown-entry-name-'))
const write = (rel, body) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), body)
}
write('package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', type: 'module' }))
write('src/main.ts', "import { helper } from './helper.js'\nconsole.log(helper())\n")
write('src/helper.ts', "export const helper = () => 'HELPED'\n")
write(
  'src/split.ts',
  "const later = await import('./lazy.js')\nconsole.log(later.lazy())\n",
)
write('src/lazy.ts', "export const lazy = () => 'LAZY'\n")

const listing = (root) => {
  const out = []
  const walk = (d, prefix) => {
    for (const e of fs
      .readdirSync(d, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
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
const run = async (label, { entry = 'src/main.ts', outputOptions, sourcemap = false, deleteWritten = false }) => {
  const events = []
  const outDir = path.join(dir, 'dist', label.replace(/[^a-z0-9]+/gi, '-'))
  fs.rmSync(outDir, { recursive: true, force: true })
  const observer = {
    name: 'observer',
    generateBundle(_options, bundle) {
      events.push(`generateBundle bundle keys: ${Object.keys(bundle).sort().join(' | ')}`)
    },
    writeBundle(_options, bundle) {
      events.push(`writeBundle bundle keys: ${Object.keys(bundle).sort().join(' | ')}`)
      events.push(`outDir at writeBundle: ${listing(outDir).join(' | ')}`)
      if (deleteWritten) {
        for (const name of Object.keys(bundle)) {
          fs.rmSync(path.join(outDir, name), { force: true })
        }
        events.push(`plugin deleted from writeBundle: ${Object.keys(bundle).sort().join(' | ')}`)
      }
    },
  }
  await build({
    cwd: dir,
    config: false,
    entry: path.join(dir, entry),
    outDir,
    format: ['esm'],
    dts: false,
    clean: false,
    silent: true,
    sourcemap,
    ...(outputOptions ? { outputOptions } : {}),
    plugins: [observer],
  })
  results.push(
    `--- ${label}`,
    ...events.map((e) => `    ${e}`),
    `    outDir after build: ${listing(outDir).join(' | ')}`,
  )
}

await run('default naming, no outputOptions', {})
await run('entryFileNames main.js', { outputOptions: { entryFileNames: 'main.js' } })
await run('entryFileNames main.js, entry with a dynamic import', {
  entry: 'src/split.ts',
  outputOptions: { entryFileNames: 'main.js' },
})
await run('entryFileNames main.js, sourcemap true', {
  outputOptions: { entryFileNames: 'main.js' },
  sourcemap: true,
})
await run('entryFileNames main.js, plugin deletes the written chunk in writeBundle', {
  outputOptions: { entryFileNames: 'main.js' },
  deleteWritten: true,
})

fs.rmSync(dir, { recursive: true, force: true })

console.log('')
console.log('=== RESULTS ===')
console.log(`tsdown ${tsdownVersion} on node ${process.version}`)
console.log(
  'fixture: src/main.ts imports src/helper.ts; src/split.ts dynamically imports src/lazy.ts;',
)
console.log("every build runs with format ['esm'], dts false, clean false")
console.log('')
for (const line of results) console.log(line)
