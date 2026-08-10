#!/usr/bin/env node
// Does the published vanilla resource pack carry its material definitions?
//
// An actor's client entity must name a material, and mc-rpg-core vendors its appearance out of
// Mojang/bedrock-samples. Whether a material can be vendored from there at all decides whether naming a
// material the game ships is a choice or is forced by the format.
//
// Pinned to a revision so the reading is reproducible: the repository moves.
//
// Usage: node probe.mjs [<ref>]

const REF = process.argv[2] ?? 'v1.21.130.3'
const REPO = 'Mojang/bedrock-samples'

const api = async (path) => {
  const res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    headers: { accept: 'application/vnd.github+json' },
  })
  return { status: res.status, body: res.status === 200 ? await res.json() : null }
}

console.log(`repository: ${REPO}`)
console.log(`ref:        ${REF}`)

const resolved = await api(`commits/${REF}`)
console.log(`commit:     ${resolved.body ? resolved.body.sha : '(unresolved, status ' + resolved.status + ')'}`)

console.log('\n=== resource_pack top level ===')
const top = await api(`contents/resource_pack?ref=${REF}`)
if (top.status !== 200) {
  console.log(`(listing failed, status ${top.status})`)
} else {
  for (const e of top.body) console.log(`${e.type === 'dir' ? '[dir] ' : '      '} ${e.name}`)
  console.log(`\nentry named "materials" present: ${top.body.some((e) => e.name === 'materials')}`)
}

console.log('\n=== resource_pack/materials ===')
const mats = await api(`contents/resource_pack/materials?ref=${REF}`)
console.log(`HTTP ${mats.status}${mats.status === 404 ? ' — no such directory' : ''}`)

console.log('\n=== every path in the repository ending .material ===')
const tree = await api(`git/trees/${REF}?recursive=1`)
if (tree.status !== 200) {
  console.log(`(tree read failed, status ${tree.status})`)
} else {
  const paths = tree.body.tree.map((n) => n.path)
  const materials = paths.filter((p) => p.endsWith('.material'))
  console.log(`paths in tree: ${paths.length}`)
  console.log(`paths ending .material: ${materials.length}`)
  for (const p of materials) console.log(`  ${p}`)
  console.log(`truncated: ${tree.body.truncated}`)
}

console.log('\n=== the material a vendored evoker would have to name ===')
const ent = await fetch(`https://raw.githubusercontent.com/${REPO}/${REF}/resource_pack/entity/evocation_illager.entity.json`)
const text = await ent.text()
const line = text.split('\n').find((l) => l.includes('"default"') && text.indexOf(l) > text.indexOf('"materials"'))
console.log(`materials block of evocation_illager.entity.json: ${line ? line.trim() : '(not found)'}`)
