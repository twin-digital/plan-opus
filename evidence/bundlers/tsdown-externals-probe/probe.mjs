// Which imports tsdown leaves external, under each `noExternal` setting and with a plugin whose
// `resolveId` returns `{ external: true }`. The fixture is synthesised into a temp directory so the
// probe needs nothing but a resolvable tsdown.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { build } = await import('tsdown')
const tsdownVersion = JSON.parse(
  fs.readFileSync(new URL(import.meta.resolve('tsdown/package.json')), 'utf8'),
).version

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdown-externals-'))
const write = (rel, body) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), body)
}

// two fixture packages, both declared as runtime dependencies of the fixture package
for (const name of ['dep-a', 'dep-b']) {
  write(
    `node_modules/${name}/package.json`,
    JSON.stringify({ name, version: '1.0.0', type: 'module', main: 'index.js' }),
  )
  write(`node_modules/${name}/index.js`, `export const value = '${name.toUpperCase()}-BODY'\n`)
}
write(
  'package.json',
  JSON.stringify({
    name: 'fixture',
    version: '1.0.0',
    type: 'module',
    dependencies: { 'dep-a': '1.0.0', 'dep-b': '1.0.0' },
  }),
)
write(
  'src/main.ts',
  "import { value as a } from 'dep-a'\nimport { value as b } from 'dep-b'\nconsole.log(a, b)\n",
)

const markExternal = (specifier) => ({
  name: 'mark-external',
  resolveId: (source) => (source === specifier ? { id: source, external: true } : null),
})

const cases = [
  ['noExternal unset, no plugin', {}],
  ['noExternal () => true, no plugin', { noExternal: () => true }],
  ['noExternal () => false, no plugin', { noExternal: () => false }],
  ['noExternal () => true, plugin externalises dep-a', { noExternal: () => true, plugins: [markExternal('dep-a')] }],
  ['noExternal () => false, plugin externalises dep-a', { noExternal: () => false, plugins: [markExternal('dep-a')] }],
]

const results = []

for (const [label, extra] of cases) {
  const outDir = path.join(dir, 'dist', label.replace(/[^a-z0-9]+/gi, '-'))
  await build({
    cwd: dir,
    config: false,
    entry: path.join(dir, 'src/main.ts'),
    outDir,
    format: ['esm'],
    dts: false,
    clean: false,
    silent: true,
    ...extra,
  })
  const out = fs.readFileSync(path.join(outDir, 'main.mjs'), 'utf8')
  const state = (dep) =>
    new RegExp(`from ["']${dep}["']`).test(out)
      ? 'EXTERNAL'
      : out.includes(`${dep.toUpperCase()}-BODY`)
        ? 'BUNDLED'
        : 'UNSEEN'
  results.push(`${label}: dep-a=${state('dep-a')} dep-b=${state('dep-b')}`)
}

fs.rmSync(dir, { recursive: true, force: true })

console.log('')
console.log('=== RESULTS ===')
console.log(`tsdown ${tsdownVersion} on node ${process.version}`)
console.log("fixture: src/main.ts imports dep-a and dep-b, both in the fixture package's dependencies")
console.log('')
for (const line of results) console.log(line)
