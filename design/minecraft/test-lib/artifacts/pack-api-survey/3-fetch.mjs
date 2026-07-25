// Step 3 of the pack API survey. Clones candidates and decides which ones are in the sample.
//
// Two-stage clone: a blobless shallow clone gives the file list cheaply; only repositories whose
// file list looks like a scripted behavior pack get their blobs fetched. Inclusion then depends on
// repository contents, not on the search text that surfaced it.
//
// Inclusion rules (each rejection is recorded in packs.json so the funnel is auditable):
//   - behavior-pack shape: a manifest.json declaring a module of "type": "script", or a
//     behavior-pack data layout (entities/, items/, loot_tables/, ... json) for the repositories
//     that generate their manifest at build time
//   - at least one analysable source file importing or requiring '@minecraft/server'
//   - at least 150 non-blank lines across those files (drops single-file samples)
//   - name/description/topics free of tutorial/sample/template wording
// Repositories are also tagged pack | library so the two can be reported apart.
//
// Run: node 3-fetch.mjs > 3-fetch.out.txt   (writes packs.json; clones under ./.work)

import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const here = path.dirname(new URL(import.meta.url).pathname)
const work = path.join(here, '.work')
const MAX_CANDIDATES = Number(process.env.MAX_CANDIDATES ?? 200)
const MAX_SIZE_KB = 80_000
const CONCURRENCY = 6
const MIN_LINES = 150

const EXCLUDE_TEXT = /tutorial|sample|example|boilerplate|starter[- ]kit|scaffold|template|cheat ?sheet|\bdocs\b|documentation|type definitions|typings|\bcourse\b|learning|workshop/i
const LIBRARY_TEXT = /\b(library|framework|toolkit|api wrapper|wrapper|utilit|helper|sdk|bundler|compiler|toolchain|plugin for|dev tool|devtool|linter|generator|editor|type[- ]?script types)\b/i

const sh = async (args, cwd, timeout = 300_000) => run('git', args, { cwd, timeout, maxBuffer: 1 << 28 })

const candidates = JSON.parse(fs.readFileSync(path.join(here, 'candidates.json'), 'utf8'))
fs.mkdirSync(work, { recursive: true })

const SOURCE_RE = /\.(ts|js|mjs|cjs|mts)$/i
const SKIP_PATH_RE = /(^|\/)(node_modules|\.git|vendor|third_party)\//i
const BP_LAYOUT_RE = /(^|\/)(entities|items|blocks|loot_tables|recipes|functions|animation_controllers|animations|spawn_rules|trading|feature_rules)\/[^/]*\.(json|mcfunction)$/i

const inspect = async (repo) => {
  const dir = path.join(work, repo.full_name.replace('/', '__'))
  const rec = { ...repo, dir, status: 'pending' }
  try {
    if (repo.size_kb > MAX_SIZE_KB) return { ...rec, status: 'rejected', reason: `repo larger than ${MAX_SIZE_KB} KB` }
    if (!fs.existsSync(path.join(dir, '.git'))) {
      fs.rmSync(dir, { recursive: true, force: true })
      await sh(['clone', '--filter=blob:none', '--no-checkout', '--depth', '1', `https://github.com/${repo.full_name}.git`, dir], work)
    }
    rec.commit = (await sh(['rev-parse', 'HEAD'], dir)).stdout.trim()
    const files = (await sh(['ls-tree', '-r', '--name-only', 'HEAD'], dir)).stdout.split('\n').filter(Boolean)
    rec.file_count = files.length

    const manifests = files.filter((f) => /(^|\/)manifest\.json$/i.test(f) && !SKIP_PATH_RE.test(f))
    const sources = files.filter((f) => SOURCE_RE.test(f) && !/\.d\.ts$/i.test(f) && !SKIP_PATH_RE.test(f))
    const bpFiles = files.filter((f) => BP_LAYOUT_RE.test(f))
    rec.bp_layout = bpFiles.length >= 3
    if (!manifests.length && !rec.bp_layout) return { ...rec, status: 'rejected', reason: 'no manifest.json and no behavior-pack layout' }
    if (!sources.length) return { ...rec, status: 'rejected', reason: 'no script sources' }

    // fetch blobs and check out
    await sh(['checkout', '--force'], dir, 600_000)

    rec.script_manifests = manifests.filter((m) => {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(dir, m), 'utf8').replace(/^﻿/, ''))
        return (j.modules ?? []).some((mod) => String(mod?.type).toLowerCase() === 'script')
      } catch {
        return false
      }
    })
    rec.pack_evidence = rec.script_manifests.length ? 'script manifest' : rec.bp_layout ? 'behavior-pack layout' : null
    if (!rec.pack_evidence) return { ...rec, status: 'rejected', reason: 'no script module and no behavior-pack layout' }

    // analysable files: those that name @minecraft/server. Prefer TypeScript sources when the repo
    // has them, so a checked-in build of the same code is not counted twice.
    const usable = []
    for (const f of sources) {
      const full = path.join(dir, f)
      let text
      try {
        const st = fs.statSync(full)
        if (st.size > 400_000) continue
        text = fs.readFileSync(full, 'utf8')
      } catch {
        continue
      }
      if (!text.includes('@minecraft/server')) continue
      const lines = text.split('\n')
      const avgLen = text.length / Math.max(lines.length, 1)
      if (avgLen > 300) continue // minified/bundled output
      usable.push({ file: f, lines: lines.filter((l) => l.trim()).length, ts: /\.(ts|mts)$/i.test(f) })
    }
    const ts = usable.filter((u) => u.ts)
    rec.files = ts.length ? ts : usable
    rec.source_kind = ts.length ? 'typescript' : 'javascript'
    rec.source_lines = rec.files.reduce((n, f) => n + f.lines, 0)
    if (!rec.files.length) return { ...rec, status: 'rejected', reason: 'no source file references @minecraft/server' }
    if (rec.source_lines < MIN_LINES) return { ...rec, status: 'rejected', reason: `under ${MIN_LINES} source lines` }

    const text = `${repo.full_name} ${repo.description} ${repo.topics.join(' ')}`
    if (EXCLUDE_TEXT.test(text)) return { ...rec, status: 'rejected', reason: 'tutorial/sample/template wording' }
    rec.kind = LIBRARY_TEXT.test(text) ? 'library' : 'pack'
    return { ...rec, status: 'accepted' }
  } catch (err) {
    return { ...rec, status: 'error', reason: String(err.message).slice(0, 200) }
  }
}

const pool = candidates.filter((c) => c.size_kb <= MAX_SIZE_KB).slice(0, MAX_CANDIDATES)
console.log(`candidates: ${candidates.length}; attempting ${pool.length} (size <= ${MAX_SIZE_KB} KB)\n`)

const results = []
let next = 0
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < pool.length) {
      const repo = pool[next++]
      const r = await inspect(repo)
      if (r.status !== 'accepted') fs.rmSync(r.dir, { recursive: true, force: true }) // keep the working copy small
      results.push(r)
      console.log(`${r.status.padEnd(8)} ${repo.full_name} (${repo.stars}*) ${r.reason ?? `${r.kind} / ${r.source_lines} lines / ${r.files.length} files`}`)
    }
  }),
)

results.sort((a, b) => b.stars - a.stars)
fs.writeFileSync(path.join(here, 'packs.json'), `${JSON.stringify(results, null, 1)}\n`)

const by = (s) => results.filter((r) => r.status === s).length
console.log(`\naccepted ${by('accepted')} / attempted ${results.length} (rejected ${by('rejected')}, errors ${by('error')})`)
const reasons = {}
for (const r of results) if (r.status !== 'accepted') reasons[r.reason] = (reasons[r.reason] ?? 0) + 1
console.log('rejection reasons:')
for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`)
const acc = results.filter((r) => r.status === 'accepted')
console.log(`\naccepted by kind: pack ${acc.filter((r) => r.kind === 'pack').length}, library ${acc.filter((r) => r.kind === 'library').length}`)
console.log(`accepted by source kind: typescript ${acc.filter((r) => r.source_kind === 'typescript').length}, javascript ${acc.filter((r) => r.source_kind === 'javascript').length}`)
