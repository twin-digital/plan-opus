// Backs fact: server-package-ships-types-only.
// Lists every file the installed @minecraft/server package ships, its package.json entry
// points, and whether any file is runtime JavaScript. Also attempts a runtime import.
// Run: node package-contents-probe.mjs > package-contents-probe.out.txt

import fs from 'node:fs'
import path from 'node:path'

const root = path.join(import.meta.dirname, 'node_modules/@minecraft/server')

const walk = (dir, prefix = '') =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(path.join(dir, e.name), `${prefix}${e.name}/`)
      : [{ name: prefix + e.name, bytes: fs.statSync(path.join(dir, e.name)).size }],
  )

const files = walk(root)
console.log('## Files shipped by @minecraft/server')
for (const f of files) console.log(`${f.name} (${f.bytes} bytes)`)
console.log('')

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
console.log('## package.json entry points')
console.log(`version: ${pkg.version}`)
for (const key of ['main', 'module', 'types', 'typings', 'exports', 'files', 'peerDependencies'])
  console.log(`${key}: ${JSON.stringify(pkg[key])}`)
console.log('')

console.log('## Runtime JavaScript present?')
const js = files.filter((f) => /\.(js|cjs|mjs)$/.test(f.name))
console.log(`.js/.cjs/.mjs files: ${js.length ? js.map((f) => f.name).join(', ') : 'none'}`)
console.log('')

console.log('## import("@minecraft/server") from a plain node process')
try {
  const mod = await import('@minecraft/server')
  console.log(`resolved; exported keys: ${Object.keys(mod).length}`)
} catch (err) {
  console.log(`threw ${err.constructor.name} code=${err.code}`)
  // Absolute paths elided so the captured output is machine-independent.
  console.log(`message: ${err.message.split('\n')[0].replaceAll(import.meta.dirname, '<probe-dir>')}`)
}
