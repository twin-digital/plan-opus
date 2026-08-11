# A published tarball does not resolve through the `source` export condition

`.repo-kit.yml`'s `package-manifest` feature emits `source: ./src/index.ts` in a library's exports map while
`files` ships only `dist`. Consumers inside the workspace resolve through the `source` condition — both
`devtools/tsdown-config`'s base and `mc-dev-kit`'s pack-build fragment set
`inputOptions.resolve.conditionNames: ['source']` — so an in-workspace consumer compiles the library from
source and works.

A consumer of a *published* tarball resolving the same condition matches an entry whose file was never
packed.

Surfaced by `mc-rpg-core`'s survey, where an adventure takes the library as an ordinary dependency and the
fold does not say whether adventures live in this workspace. No package in the workspace appears to exercise
the published path today, so this is untested rather than known-broken — but the three fixes differ in what
they commit to: pack `src/`, drop `source` from the published exports map, or state that consumers are
workspace-only.
