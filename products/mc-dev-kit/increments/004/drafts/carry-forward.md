# Carry-forward: the pack-build Plan loop of PR #123

Working material for the build facet's next Plan loop. PR #123 (branch
`design/minecraft-pack-build`, tip `afd5881`) ran a Plan loop on the legacy
`design/minecraft/pack-build` design; the branch itself was not merged. This increment carries the
owner's ratified rulings — the requirement amendments in this increment's `requirements.yaml` —
and this file carries the rest of the loop's history so the next loop starts from it rather than
rediscovering it. The loop's tested facts and probes are in the pool (`facts/bundlers.yml`,
`facts/nodejs-runtime.yml`, `evidence/bundlers.yml`, `evidence/bundlers/`).

## Provenance of this increment's requirement entries

| entry | amends | source of the wording |
|---|---|---|
| r-hlnbi41r | r-if6t18ve | the interview (branch commit `5fb3c56`): the archive-half carve-out — the build half ships no command line, the archive half may |
| r-phxrb6qn | r-e5bfrqzx | review thread 3671245126 ("the wording of this is somewhat nonsensical now… reword accordingly"); the reword landed at `e00d0b7` and states provenance and granularity — one archive, cut from the built output tree and nothing else |
| r-v8jjhds5 | r-wsv90bxm | review thread 3671224557: "skipping the bundler would be, at most, an optimization we don't need now." The prior wording demanded a manifest-only path that skips the bundler, and its verification demanded "no rebundle runs"; the ruling reverses both. The reword (`e00d0b7`) is the orchestrator's derivation from the ruling, flagged as such to the owner and not corrected |
| r-imfmv0qc | — (new) | the interview (branch commit `5fb3c56`), owner-approved: a build never copies a source `manifest.json` through unchanged |

## The owner's decision rulings, by thread

Rulings on the branch's proposed decisions. The decisions themselves are the legacy design's and
are not in force here — the next Plan loop re-proposes what it needs — but the rulings are the
owner's and stand.

Accepted:

- 3671267863 — `the-export-is-a-fragment-carrying-a-rolldown-plugin`: one exported function
  returning a tsdown config fragment whose `plugins` array holds a single Rolldown plugin.
- 3671297894 — `the-build-reads-the-kit-pack-set`: the build calls the dev kit at build time
  rather than reading source manifests itself.
- 3671303185 — `script-sources-live-in-the-packs-scripts-directory`: sources under
  `behavior_pack/scripts/`, `main.ts` the entry, nothing under it copied to output.
- 3673903476 — `a-script-less-package-builds-through-a-virtual-entry`.
- 3673910961 — `the-archive-is-a-single-mcaddon-per-package`: one `.mcaddon` holding one
  `.mcpack` per pack.
- 3674371255 — `the-consumer-hands-over-its-package-directory` (see the rejected interface below).
- 3674383748 — `externals-come-from-the-manifests-module-dependencies`.
- 3674425792 — `a-rebuild-emits-no-report`.

Tolerated:

- 3673915455 — `the-archive-ships-as-a-bin-command` (`mc-pack-archive` in the kit package's
  `bin`).

Rejected:

- 3673841414 — `the-consumer-hands-over-its-config-file-url` (see below).
- 3673869483 — `the-bundle-lands-at-the-manifest-declared-entry`: the owner wants no manifest-field
  handling in the build; the script path belongs in the dev kit's pack entry (see the dev-kit
  material below).
- 3674378304 — the owner said "tolerated" of `the-bundle-lands-at-a-path-this-design-fixes`, but
  the dev-kit amendment route replaced it outright before that status could stand; the branch
  records it rejected.

The defaults gate — assets copy verbatim except the manifest and scripts, empty source directories
produce no output directory, two-space manifest JSON, compared writes, prune not wipe, one
unminified ESM chunk, invalid pack fails the build, no-pack package fails the build, no-argument
archive command, archive names from package name and version, missing output tree fails the
archive, TSDoc plus a README section — was ruled accepted in bulk before the review rounds; the
branch's `decisions.yaml` holds the statements and falsifiers.

Still proposed at the branch tip, never ruled, and lapsing with the branch:
`the-workspace-root-is-the-nearest-pnpm-workspace-file` (replaced a package.json `workspaces`
walk after thread 3671301305), `the-script-output-path-is-set-in-config-and-checked-against-the-kit`,
`the-bundler-writes-its-chunks-and-the-plugin-writes-the-rest`,
`a-chunk-no-pack-claims-is-pruned-like-any-other-stale-output`,
`a-stale-virtual-entry-fails-the-build`, `the-export-takes-over-the-packages-build`.

## Defended and survived

Two decisions the owner challenged, the loop defended on the merits, and the owner then accepted:

- `externals-come-from-the-manifests-module-dependencies` — thread 3673893134 asked for real code
  showing how the implementation gets the dependency list; the answer is that
  `entry.manifest.dependencies` is typed and form-checked by the kit already, so the external set
  is a three-line flatMap over `module_name` entries, and no new kit field is needed. Accepted at
  3674383748.
- `a-rebuild-emits-no-report` — thread 3673907454 asked how emitting nothing is beneficial; the
  defense is that the compared write makes the output tree itself report which packs changed, at a
  finer grain than a report file, and a report would either sit inside `dist/` where the
  authoritative-tree requirement rules it out or become a second artifact in a second place.
  Accepted at 3674425792.

By contrast, `the-plugin-places-every-output-file-itself` was defended twice under thread
3673899344 — the one-writer argument, then the `tsdown-emit-probe` measurement answering the
owner's two concerns (no complicated bundling steps taken over; no write fight, since the hooks
are ordered and `clean: false` leaves existing files alone) — and the design still moved off it:
the branch's final shape has the bundler writing the entry chunk and any split chunk, the plugin
writing only the completed manifests and the copied assets. The probe evidence is in the pool
either way.

## The rejected interface

Thread 3673841414 rejected `packageUrl` — the fragment passing its own `import.meta.url` for the
export to derive the package directory from — with "use filesystem paths instead of the url
machinery." The accepted interface (thread 3674371255) is one required option `packageDir`, a
filesystem path; a fragment passes `path.join(import.meta.dirname, '..')`. The option is the
package directory rather than a config-file location, so the `tsdown.config.d/` convention leaves
the interface entirely.

## Open questions the loop left

1. **How far the declared watch set reaches** (`how-far-the-declared-watch-set-reaches` in the
   branch spec; closes a requirement — now r-v8jjhds5's subject). The declared watch inputs cover
   the package's own build, but through the kit the build also reads `pnpm-workspace.yaml`, every
   other pack's source `manifest.json`, and every workspace member's `package.json` — a sibling
   pack's uuid corrected to satisfy this pack's dependency flips it from invalid to valid, and
   nothing rebuilds. Does "any input a build reads" reach those files, making the declared set
   workspace-wide, or does it mean the package's own inputs, which is what a fragment can declare?
2. **A source manifest that names its own script entry**
   (`a-source-manifest-that-names-its-own-script-entry` in the branch's dev-kit spec; closes a
   requirement — an addition to r-11l92k9x, the completion requirement). If the kit computes the
   script output location and reads the manifest's script `entry` for nothing, a manifest naming a
   different path ships a pack whose manifest names a file that is not there. The proposed rule: a
   script module's `entry` joins `header.name`, `header.version` and a workspace dependency's
   `version` as fields a partial source manifest must leave out and completion writes. The owner's
   to make.

## Dev-kit material routed to a future discovery-facet loop

Thread 3674443094 directed a dev-kit amendment: the pack entry reports a built script location.
The branch carried it as edits to the legacy `design/minecraft/dev-kit` spec, which is retired;
mc-dev-kit increment 003 is published and immutable, so the material waits for a discovery-facet
increment of its own. What the branch holds, for that loop to draw on:

- A `pack-record-details` addition (r-x40c0qx5 here): the entry reports its built script location,
  present even when unbuilt, absent for a resource pack.
- A new requirement, `built-script-defaults-to-scripts-main-js`: `scripts/main.js` within the
  pack's build output location, computed from the kind rather than read from the manifest, no
  probing for script sources — the location is where a built script belongs, not a claim that one
  is there.
- A proposed decision, `an-absent-script-location-is-null-not-a-missing-field`: `scriptOutput` is
  `string | null` on every entry, never an omitted field. Never ruled.
- Spec mechanics: `PackEntryBase.scriptOutput`; `ManifestModule.entry?: string` with its
  form-check row (a string) and suppression row (nothing downstream — no check or completion reads
  it); `scriptOutput` survives every manifest fault because nothing about it is manifest-derived.
- The facts the branch filed in `facts/minecraft/dev-kit.yml` were held out of the harvest: they
  source to the retired legacy dev-kit spec, and one
  (`dev-kit-reports-a-packs-script-output-location`) states the amendment as if ruled. The
  discovery-facet loop re-establishes what it needs against the published increments.

The scriptOutput question is entangled with open question 2 above: the amendment gives the build a
destination to read off the entry, and the completion rule decides what a source manifest may say
about it.
