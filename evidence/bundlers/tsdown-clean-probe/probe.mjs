// When tsdown's `clean` empties the output directory, and what a plugin's first hook sees of a
// previous build's tree. The fixture is synthesised into a temp directory.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { build } = await import('tsdown')
const tsdownVersion = JSON.parse(
  fs.readFileSync(new URL(import.meta.resolve('tsdown/package.json')), 'utf8'),
).version

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdown-clean-'))
const write = (rel, body) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), body)
}
write('package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', type: 'module' }))
write('src/main.ts', "console.log('hi')\n")

const listing = (root) => {
  const out = []
  const walk = (d, prefix) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) walk(full, `${prefix}${e.name}/`)
      else out.push(`${prefix}${e.name}`)
    }
  }
  if (!fs.existsSync(root)) return ['(absent)']
  walk(root, '')
  return out.length ? out : ['(empty)']
}

const results = []
for (const clean of [false, true]) {
  const outDir = path.join(dir, `out-clean-${clean}`)
  fs.rmSync(outDir, { recursive: true, force: true })
  // seed the output directory the way a previous build of a pack would have left it
  write(path.relative(dir, path.join(outDir, 'behavior_pack/manifest.json')), '{"prev":true}\n')
  write(path.relative(dir, path.join(outDir, 'behavior_pack/textures/a.png')), 'PREV-ASSET\n')

  const probe = {
    name: 'probe',
    buildStart() {
      results.push(`clean=${clean} buildStart sees: ${listing(outDir).join(' | ')}`)
    },
    generateBundle() {
      results.push(`clean=${clean} generateBundle sees: ${listing(outDir).join(' | ')}`)
    },
  }
  await build({
    cwd: dir,
    config: false,
    entry: path.join(dir, 'src/main.ts'),
    outDir,
    format: ['esm'],
    dts: false,
    clean,
    silent: true,
    plugins: [probe],
  })
  results.push(`clean=${clean} after build: ${listing(outDir).join(' | ')}`)
}

fs.rmSync(dir, { recursive: true, force: true })

console.log('')
console.log('=== RESULTS ===')
console.log(`tsdown ${tsdownVersion} on node ${process.version}`)
console.log('fixture: outDir seeded with behavior_pack/manifest.json and behavior_pack/textures/a.png before each build')
console.log('')
for (const line of results) console.log(line)
