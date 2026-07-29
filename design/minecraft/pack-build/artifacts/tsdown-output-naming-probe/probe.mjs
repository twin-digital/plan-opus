// Whether a plugin can choose where the bundler writes its chunks — the order `buildStart` and the
// `outputOptions` hook fire in, and whether a name or directory set from that hook is what tsdown
// writes to. The fixture is synthesised into a temp directory.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { build } = await import('tsdown')
const tsdownVersion = JSON.parse(
  fs.readFileSync(new URL(import.meta.resolve('tsdown/package.json')), 'utf8'),
).version

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdown-output-naming-'))
const write = (rel, body) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), body)
}
write('package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', type: 'module' }))
write('src/main.ts', "const later = await import('./lazy.js')\nconsole.log(later.lazy())\n")
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
const run = async (label, makePlugin) => {
  const events = []
  const outDir = path.join(dir, 'dist', label.replace(/[^a-z0-9]+/gi, '-'))
  fs.rmSync(outDir, { recursive: true, force: true })
  let failure = null
  try {
    await build({
      cwd: dir,
      config: false,
      entry: path.join(dir, 'src/main.ts'),
      outDir,
      format: ['esm'],
      dts: false,
      clean: false,
      silent: true,
      plugins: [makePlugin(events, outDir)],
    })
  } catch (error) {
    failure = error.message.split('\n')[0]
  }
  results.push(
    `--- ${label}`,
    ...events.map((e) => `    ${e}`),
    ...(failure ? [`    build threw: ${failure}`] : []),
    `    outDir after build: ${listing(outDir).join(' | ')}`,
  )
}

// the names the plugin only learns at buildStart, as a build reading a pack set would
const learned = {
  entry: 'behavior_pack/scripts/main.js',
  chunk: 'behavior_pack/scripts/[name]-[hash].js',
}

await run('plugin sets entryFileNames and chunkFileNames from the outputOptions hook', (events) => {
  let seen = null
  return {
    name: 'names-from-outputoptions',
    buildStart() {
      events.push('buildStart ran')
      seen = learned
    },
    outputOptions(options) {
      events.push(`outputOptions ran; buildStart had run: ${seen !== null}`)
      return { ...options, entryFileNames: seen.entry, chunkFileNames: seen.chunk }
    },
    writeBundle(_options, bundle) {
      events.push(`writeBundle bundle keys: ${Object.keys(bundle).sort().join(' | ')}`)
    },
  }
})

await run('plugin moves the output directory from the outputOptions hook', (events, outDir) => ({
  name: 'dir-from-outputoptions',
  buildStart() {
    events.push('buildStart ran')
  },
  outputOptions(options) {
    events.push(`outputOptions saw dir: ${options.dir === undefined ? '(undefined)' : path.relative(dir, options.dir)}`)
    return { ...options, dir: path.join(outDir, 'behavior_pack/scripts'), entryFileNames: 'main.js' }
  },
  writeBundle(_options, bundle) {
    events.push(`writeBundle bundle keys: ${Object.keys(bundle).sort().join(' | ')}`)
  },
}))

fs.rmSync(dir, { recursive: true, force: true })

console.log('')
console.log('=== RESULTS ===')
console.log(`tsdown ${tsdownVersion} on node ${process.version}`)
console.log('fixture: src/main.ts dynamically imports src/lazy.ts, so the build has a split chunk;')
console.log("every build runs with format ['esm'], dts false, clean false, and no outputOptions in the config")
console.log('')
for (const line of results) console.log(line)
