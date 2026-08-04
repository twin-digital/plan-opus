// Step 1 of the pack API survey. Builds the candidate repository pool.
//
// GitHub's code-search API needs a token this environment does not have, so discovery uses the
// unauthenticated repository-search API instead: a fixed list of queries, each read twice (sorted
// by stars and by recent push) so the pool is not purely popularity-weighted. Candidacy is decided
// later, by 2-fetch.mjs, from the repository contents.
//
// Run: node 1-discover.mjs > 1-discover.out.txt   (writes candidates.json)

import fs from 'node:fs'

const QUERIES = [
  'topic:minecraft-bedrock-addon',
  'topic:bedrock-addon',
  'topic:minecraft-addon',
  'topic:minecraft-bedrock',
  'topic:behavior-pack',
  'topic:minecraft-behavior-pack',
  'topic:minecraft-scripting-api',
  'topic:scriptapi',
  'topic:mcbe',
  'topic:bedrock-edition',
  'minecraft bedrock behavior pack script',
  'minecraft bedrock addon script api',
  'minecraft bedrock scripting api addon',
  '"@minecraft/server" in:readme',
  '"@minecraft/server" in:description',
  'minecraft bedrock realm addon',
]
const SORTS = ['stars', 'updated']
const PER_PAGE = 100

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const search = async (q, sort) => {
  const url = new URL('https://api.github.com/search/repositories')
  url.searchParams.set('q', q)
  url.searchParams.set('sort', sort)
  url.searchParams.set('per_page', String(PER_PAGE))
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { accept: 'application/vnd.github+json' } })
    if (res.ok) return (await res.json()).items ?? []
    // unauthenticated search allows ~10 requests/minute; back off and retry
    await sleep(20_000)
  }
  throw new Error(`search failed: ${q} / ${sort}`)
}

const byName = new Map()
for (const q of QUERIES) {
  for (const sort of SORTS) {
    const items = await search(q, sort)
    let added = 0
    for (const r of items) {
      if (r.fork || r.archived) continue
      if (!byName.has(r.full_name)) {
        added++
        byName.set(r.full_name, {
          full_name: r.full_name,
          html_url: r.html_url,
          default_branch: r.default_branch,
          stars: r.stargazers_count,
          size_kb: r.size,
          language: r.language,
          pushed_at: r.pushed_at,
          license: r.license?.spdx_id ?? null,
          description: r.description ?? '',
          topics: r.topics ?? [],
          found_by: [],
        })
      }
      byName.get(r.full_name).found_by.push(`${q} [${sort}]`)
    }
    console.log(`${q} [${sort}]: ${items.length} results, ${added} new (pool ${byName.size})`)
    await sleep(7000)
  }
}

const candidates = [...byName.values()].sort((a, b) => b.stars - a.stars)
fs.writeFileSync(new URL('./candidates.json', import.meta.url), `${JSON.stringify(candidates, null, 2)}\n`)
console.log(`\ncandidate pool: ${candidates.length} repositories (forks and archived repos excluded)`)
