// Backs fact: server-classes-are-structurally-assignable.
// Counts the private declarations in the @minecraft/server declarations, then runs the
// type-level half (assignability-probe.ts) through tsc and reports whether it compiles.
// Run: node assignability-probe.mjs > assignability-probe.out.txt

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const dir = import.meta.dirname
const dts = fs.readFileSync(`${dir}/node_modules/@minecraft/server/index.d.ts`, 'utf8')

const count = (re) => (dts.match(re) ?? []).length
console.log('## Private declarations in @minecraft/server 2.8.0 index.d.ts')
console.log(`exported classes: ${count(/^export class /gm)}`)
console.log(`private constructor(): ${count(/^\s*private constructor\(\);$/gm)}`)
console.log(`private declarations of any kind: ${count(/^\s*private /gm)}`)
console.log(
  `private instance members (private declarations that are not constructors): ` +
    `${count(/^\s*private /gm) - count(/^\s*private constructor\(\);$/gm)}`,
)
console.log('')

console.log('## tsc --noEmit on assignability-probe.ts (strict)')
try {
  const args = ['tsc', '--noEmit', '--strict', '--target', 'es2022', '--module', 'node16',
    '--moduleResolution', 'node16', 'assignability-probe.ts']
  const out = execFileSync('npx', args, {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  console.log(`exit 0, no diagnostics${out.trim() ? `\n${out.trim()}` : ''}`)
  console.log('(the file contains two @ts-expect-error directives; an unused one is itself an error)')
} catch (err) {
  console.log(`exit ${err.status}`)
  console.log(err.stdout?.trim())
  console.log(err.stderr?.trim())
}
