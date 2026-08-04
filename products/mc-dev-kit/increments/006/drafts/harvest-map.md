# Harvest map: the #123 branch's decisions → mc-dev-kit increment 006

PR #123 (branch `design/minecraft-pack-build`, tip `afd5881`) ran a Plan loop on the legacy
`design/minecraft/pack-build` design and closed unmerged. The conversion to this product carried
the loop's requirement amendments (increment 004) and its facts and probes (the pool), but not the
branch's `design/minecraft/pack-build/decisions.yaml`; increment 004's `drafts/carry-forward.md`
recovered the rulings as prose, "not in force". The owner ruled on 2026-08-04 that they enter as
in-force decision entries — this increment reverses that "not in force" disposition.

Statements carry over verbatim from the branch. One adaptation, where the standalone-design
regime's words no longer exist: `output-files-are-written-only-when-their-bytes-change` said
"every file this design writes"; the entry says "every file the build writes". Every entry
carries `facets: build`. Titles, `because:` citations against this product's requirements and the
pool's facts, and the pinning proposals are authored here — new content for the owner's review,
not the branch's.

The branch's `tolerated` ruling enters as `delegated`, the status increment 001 used for the same
ruling. The six entries still `proposed` at the branch tip were never ruled; they re-enter as
`proposed` for the owner to rule or reject, and the merge gate is red on exactly those six by
design. The five `rejected` entries are not re-entered — a rejected decision is history, and the
preserved branch holds it; `carry-forward.md` records the owner's reasons by thread.

## Carried (27)

| branch slug | new id | status |
|---|---|---|
| the-export-is-a-fragment-carrying-a-rolldown-plugin | d-5ej8yfki | accepted |
| the-consumer-hands-over-its-package-directory | d-qtq0ccy6 | accepted |
| the-build-reads-the-kit-pack-set | d-vpwz0dps | accepted |
| the-workspace-root-is-the-nearest-pnpm-workspace-file | d-ai68xorc | proposed |
| script-sources-live-in-the-packs-scripts-directory | d-d727qv5z | accepted |
| the-script-output-path-is-set-in-config-and-checked-against-the-kit | d-oln00v7s | proposed |
| externals-come-from-the-manifests-module-dependencies | d-3sb0vrc2 | accepted |
| the-bundler-writes-its-chunks-and-the-plugin-writes-the-rest | d-llnhw1k1 | proposed |
| a-chunk-no-pack-claims-is-pruned-like-any-other-stale-output | d-5meg5uy7 | proposed |
| a-script-less-package-builds-through-a-virtual-entry | d-64tw58t0 | accepted |
| a-rebuild-emits-no-report | d-3kcr1672 | accepted |
| the-archive-is-a-single-mcaddon-per-package | d-6ewrh1g3 | accepted |
| the-archive-ships-as-a-bin-command | d-j9qge6s1 | delegated (branch: tolerated) |
| assets-copy-verbatim-except-the-manifest-and-scripts | d-h91x9nxz | accepted |
| empty-source-directories-produce-no-output-directory | d-xnnslpns | accepted |
| the-completed-manifest-is-two-space-json | d-exzp1618 | accepted |
| output-files-are-written-only-when-their-bytes-change | d-nclb1c8l | accepted |
| stale-output-is-pruned-not-wiped | d-p06hnnc0 | accepted |
| the-bundle-is-one-unminified-esm-chunk | d-jxv1x5ht | accepted |
| an-invalid-pack-fails-the-build | d-no9a9s0x | accepted |
| a-package-with-no-pack-fails-the-build | d-4e0kt69q | accepted |
| the-archive-command-takes-no-arguments | d-s5ymp8ai | accepted |
| archive-names-come-from-the-package-name-and-version | d-9hbe6ixx | accepted |
| a-missing-output-tree-fails-the-archive | d-mle1zwtz | accepted |
| documentation-ships-as-tsdoc-and-a-readme-section | d-9s4tdc8z | accepted |
| a-stale-virtual-entry-fails-the-build | d-wzmofsc8 | proposed |
| the-export-takes-over-the-packages-build | d-s1haiu19 | proposed |

## Not carried: the rejected five

`the-consumer-hands-over-its-config-file-url`, `the-bundle-lands-at-the-manifest-declared-entry`,
`the-bundle-lands-at-a-path-this-design-fixes`, `the-bundle-lands-where-the-pack-entry-says`,
`the-plugin-places-every-output-file-itself`. The rulings and their reasons stay with the
preserved branch and 004's `carry-forward.md`.

## What the harvest does not carry

The branch's `falsifiers` lists were the legacy regime's construct and are not converted to
`revisit_when` — the fold's revisit conditions are the owner's to set deliberately, and the
branch history holds the lists. The dev-kit material the loop routed to a discovery-facet
increment (`scriptOutput` on the pack entry) stays where `carry-forward.md` parked it; nothing
here rules on it.
