# How the harness decides a package is a behavior pack

Living record for the pack-detection decision. Update it whenever the decision moves — the
alternatives below are the ones weighed, and the last section says which is chosen and why.

## What was measured

`detect-probe.mjs` scores each candidate rule against the real monorepo
(`twin-digital/opus`, ref `archive/minecraft-prototype`, `4e731f5b` — the branch holding the
behavior-pack prototype). It resolves workspace membership from `pnpm-workspace.yaml`,
reads each package from git without a checkout or a build, and reports what each rule selects
against the ground truth stated by the repo's own README: `hello-world` and `village-guard`
are the packs. `OUTPUT.txt` is the captured run.

41 workspace packages, 2 of them packs. The near misses matter more than the count: the
minecraft area also holds `mc-scripting-core` (a library that imports `@minecraft/server`),
`mc-pack-config` (the shared build config), and `dev-bedrock-server` (the harness itself) —
three packages a sloppy rule mistakes for packs.

## Alternatives

| # | rule | result | notes |
|---|---|---|---|
| 1 | committed `pack/manifest.json` exists | exact | the repo's existing convention; visible pre-build |
| 2 | as 1, plus `header.uuid` present | exact | 1 with the field the activation list needs, validated at discovery |
| 3 | as 1, plus a `script` or `data` module | exact | 2 plus the behavior-vs-resource classification |
| 4 | any `manifest.json` anywhere in the package | exact today | fragile: matches a fixture or a vendored sample the moment one exists |
| 5 | devDependency on `@twin-digital/mc-pack-config` | exact | derived state — repo-kit *writes* this dep from rule 1 |
| 6 | repo-kit-written `tsdown.config.d/bedrock-pack.ts` | exact | derived state, same objection; also a build-tool coupling |
| 7 | `release-assets: mcpack-assets` script | exact | derived state; ties dev detection to the release path |
| 8 | any dependency on `@minecraft/server` | 1 false positive | selects `mc-scripting-core`; a library that scripts against the server API is not a pack |
| 9 | has both `build` and `watch` scripts | 3 false positives | selects the bookify packages; says nothing about Minecraft |
| 10 | directory convention `nodejs/minecraft/*` | 3 false positives | selects the library, the build config, and the harness; also forbids a pack living elsewhere |
| 11 | package name matches `/pack/` | misses both, 1 false positive | selects `mc-pack-config` only |
| 12 | `keywords` containing a pack keyword | selects nothing | no package carries one today |
| 13 | explicit `package.json` marker field | selects nothing | no package carries one today; would have to be introduced and then maintained |
| 14 | built `dist/manifest.json` exists | works only after a build | 2 of 41 on disk, and `dist/` is gitignored — invisible on a clean checkout |

Rules 1–7 all score exactly on today's tree, so the choice between them is about what each
would survive, not about the score.

## Why the chosen rule is the chosen rule

**Chosen: rule 3 — a committed `pack/manifest.json` whose modules include a `script` or `data`
module.**

- It is not a new convention. The monorepo already defines a pack this way: repo-kit's
  `bedrock-pack` feature fires on `exists: pack/manifest.json`, and everything else a pack
  carries — the `mc-pack-config` devDependency, the shared tsdown fragment, the
  `release-assets` script — is *written by that feature* from this one condition. Rules 5, 6
  and 7 score the same only because they are downstream of rule 1; keying on them would make
  the harness depend on repo-kit having run.
- It needs nothing added to a package. Rule 13 — the marker field — scores zero today, so
  adopting it means editing every pack and remembering to edit the next one. The manifest is
  already there, is authored by hand, and is the file that makes the directory a pack at all.
- It is visible before any build, so discovery works on a clean checkout, which rule 14
  cannot do.
- The module-type test is what keeps the rule honest as scope grows: a resource pack also
  carries a `pack/manifest.json`, but belongs in a different server pool and a different world
  list. Requiring a `script` or `data` module means a resource pack is *recognised and not
  deployed as a behavior pack*, rather than silently pushed into the wrong pool.
- Requiring `header.uuid` (rule 2, folded in) turns a malformed manifest into an error at
  discovery instead of a pack that silently fails to load — the activation list keys on that
  uuid and the server reports nothing when it is wrong.

Cost of being wrong: a package that wants to be a pack without a hand-written manifest cannot
be one, and a fixture manifest committed at `pack/manifest.json` would be picked up. Both are
visible at discovery, which lists what it found.

## What would move the decision

- Packs stop carrying a committed source manifest (a generator assembles the whole manifest at
  build time) — then the built-output rule, 14, becomes the only pre-deploy evidence and
  discovery has to run after a build.
- A pack has to live outside the pnpm workspace — membership, not the manifest, becomes the
  binding constraint.
- Resource packs become required rather than optional, at which point the module-type test
  stops being a filter and becomes a router with two destinations.
