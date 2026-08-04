// Clones the public pack this probe uses as its realistic subject, at the commit it was run
// against. Run: node fetch-packs.mjs
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const packs = [{ dir: 'marron-town-mod', repo: 'https://github.com/bencrob/marron-town-mod.git', sha: '2c025b4' }]

for (const { dir, repo, sha } of packs) {
  const target = path.join(import.meta.dirname, dir)
  if (existsSync(target)) {
    console.log(`${dir}: already present`)
    continue
  }
  execFileSync('git', ['clone', repo, target], { stdio: 'inherit' })
  execFileSync('git', ['-C', target, 'checkout', sha], { stdio: 'inherit' })
}
