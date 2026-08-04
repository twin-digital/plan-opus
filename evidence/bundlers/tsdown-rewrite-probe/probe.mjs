// Whether tsdown rewrites an output file whose bytes a second build does not change. The fixture
// is synthesised into a temp directory and built twice into the same output directory, with
// nothing touched in between.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { build } = await import('tsdown')
const tsdownVersion = JSON.parse(
  fs.readFileSync(new URL(import.meta.resolve('tsdown/package.json')), 'utf8'),
).version

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdown-rewrite-'))
const write = (rel, body) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), body)
}
write('package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', type: 'module' }))
write('src/main.ts', "import { helper } from './helper.js'\nconsole.log(helper())\n")
write('src/helper.ts', "export const helper = () => 'HELPED'\n")

const outDir = path.join(dir, 'dist')
const chunk = path.join(outDir, 'main.js')

const once = async () => {
  await build({
    cwd: dir,
    config: false,
    entry: path.join(dir, 'src/main.ts'),
    outDir,
    format: ['esm'],
    dts: false,
    clean: false,
    silent: true,
    outputOptions: { entryFileNames: 'main.js' },
  })
  const stat = fs.statSync(chunk)
  return { mtimeMs: stat.mtimeMs, ino: stat.ino, body: fs.readFileSync(chunk, 'utf8') }
}

const first = await once()
await new Promise((resolve) => setTimeout(resolve, 50))
const second = await once()

fs.rmSync(dir, { recursive: true, force: true })

console.log('')
console.log('=== RESULTS ===')
console.log(`tsdown ${tsdownVersion} on node ${process.version}`)
console.log('fixture: src/main.ts imports src/helper.ts; two builds into one outDir, 50ms apart,')
console.log('with no source file touched between them')
console.log('')
console.log('--- second build, nothing changed in the source')
console.log(`    bytes identical: ${first.body === second.body}`)
console.log(`    mtime changed: ${first.mtimeMs !== second.mtimeMs}`)
console.log(`    inode changed: ${first.ino !== second.ino}`)
