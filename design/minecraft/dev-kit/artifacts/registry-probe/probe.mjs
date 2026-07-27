#!/usr/bin/env node
// Asks the public npm registry whether npm's and pnpm's own workspace-enumeration
// implementations are published packages, and prints the identifying metadata of each.
// Usage: node probe.mjs > OUTPUT.txt

const PACKAGES = ['@npmcli/map-workspaces', '@pnpm/workspace.find-packages']

for (const name of PACKAGES) {
  const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}`
  const res = await fetch(url)
  console.log(`=== ${name}`)
  console.log(`GET ${url} -> ${res.status}`)
  if (!res.ok) {
    console.log('')
    continue
  }
  const doc = await res.json()
  const latest = doc['dist-tags']?.latest
  const manifest = doc.versions?.[latest] ?? {}
  const repo = manifest.repository
  console.log(`name: ${doc.name}`)
  console.log(`latest: ${latest}`)
  console.log(`description: ${manifest.description ?? '(none)'}`)
  console.log(`repository: ${typeof repo === 'string' ? repo : JSON.stringify(repo)}`)
  console.log(`homepage: ${manifest.homepage ?? '(none)'}`)
  console.log(`dist.tarball: ${manifest.dist?.tarball ?? '(none)'}`)
  console.log('')
}
