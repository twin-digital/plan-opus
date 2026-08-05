# Absorption map: mc-dev-server → mc-dev-kit

Working material for this increment's Plan loop. mc-dev-server and mc-dev-kit are one product:
the dev loop's entire input is the kit's pack set, and the boundary between them was carried by
eleven `f:dev-kit-*` facts that transcribe mc-dev-kit's own `requirements.yaml` into the facts
pool. This increment brings mc-dev-server's published requirements into the kit under a new
`dev-loop` facet, consolidated, and re-enters its decisions against them. The harness still ships as
its own package, beside the library rather than inside it.

## Requirements (9 declared, from 11 absorbed)

| mc-dev-server id | title | new id |
|---|---|---|
| r-hay27p5n | one-command dev loop | r-8et233c9 |
| r-tdif5vwf | server lifecycle outlives the foreground | r-kfu7pcms |
| r-739ulzr0 | hosted packs are a selection | r-u8cg9vi6 |
| r-mty3gfy6 | deploy reconciles to built packs | r-pcq10f2b |
| r-gdsm5ykt | edit to live without disconnect | r-cekp2mcb |
| r-o1lozc1k | behavior packs required, other content optional | r-hpu39brj |
| r-582htwvl + r-zbrdnvnu | the pack/harness boundary | r-97fvutt9 |
| r-kts1e4fb | single-world scope | r-7lroj1cg |
| r-7fnwuaqz | remote Docker supported | r-whacwz1b |

New ids throughout: these are fresh declarations in this product, not amendments of another's.

## Consolidated

- **r-582htwvl + r-zbrdnvnu → r-97fvutt9.** Both stated one boundary from opposite sides —
  "a pack carries no deploy or publish scripts" and "the harness deploys built output and makes no
  assumption about how it was assembled." One requirement carries both, with both verification
  procedures.

## Not carried

- **r-ca9w2614 — packs discovered from the workspace.** Redundant inside this product. The kit's
  `r-zcdmh9p6` already fixes membership as source-manifest presence with "no marker field,
  keyword, or central list is required, and adding, removing, or renaming a pack needs no edit
  anywhere but the package itself"; `r-co6glnme` fixes the flat list of entries and `r-0l79om74`
  fixes discovery from a clean checkout with no build. The harness discovering packs *is* the
  kit's discovery, so the requirement restated a sibling design's guarantee across a boundary that
  no longer exists.
- **`pack-source-layout-is-fixed`** was retired before mc-dev-server increment 001 and never
  converted; its subject is settled by the kit's `r-zcdmh9p6` and `r-un786n7v`.

## Wording

Statements carry over substantively verbatim. Two changes for the new home: r-8et233c9 names the
harness once, so the term the other eight use has a referent inside this product; and r-u8cg9vi6
says "the packs the kit discovers" where the original said "the discovered packs", now that
discovery is this product's own requirement rather than an upstream fact.

## Facets

A `dev-loop` facet joins `discovery` and `build` in `product.yaml`. All nine requirements carry
it.

## Decisions (33 proposed)

The stranded cycle on `design/minecraft-dev-server` (tip c43cefe) proposed sixteen, harvested into
mc-dev-server's increment 002 draft (PR #168) and never ruled. They are re-entered here against
this product's own requirements: five new, one reversed, one rewritten on new evidence, one
dropped, and the rest carrying with their citations repointed. Thirteen more close the survey's
gaps and are listed under *Survey* below.

### New in the harvest

- **d-zyo6kku9 — the harness is its own package beside the library.** Where the package lands;
  `product.yaml` is descriptive, so the implementer declares it when its files exist.
- **d-ifke5eeh — start is idempotent against a running server.** `r-kfu7pcms` verifies that Ctrl+C
  leaves the server up and that the loop command reattaches, and the harvested set supplied no
  mechanism for it. Worse, `d-w8cc8n18` regenerates the compose file every run, and `up` against a
  changed project recreates the container — losing the world and disconnecting the client the
  requirement exists to protect.
- **d-imdfu09l — the project identity is derived from the workspace root.** `r-7lroj1cg`
  (single-world scope) was cited by no harvested decision, and the level name every activation
  write depends on was fixed nowhere.
- **d-n0dz38ky — a pool directory is replaced, not merged into.** A copy over a directory already
  in place merges, so a file deleted from the output tree would sit on the server indefinitely and
  `r-pcq10f2b` would not hold. `r-8xmkne8a` makes the output tree authoritative; this makes the
  pool match it.
- **d-oo8256gl — a pack occupies a pool directory named for its uuid.** The draft spec asserted it
  and no decision carried it, though `d-a9jaqn8m`'s presence-and-identity read depends on the pool
  directory name carrying identity.

### Reversed

- **d-cw6pder5 — activation entries are written from the pack set.** The harvested
  `activation-version-read-from-the-built-manifest` read the version from the built
  `manifest.json`, citing a fact whose own claim says the harness can "write its activation entry
  from the pack set alone, without reading a manifest." Inside this product that fact is
  `r-rlh87pau` and `r-kbgjy2pt`, which settle it: the entry is known from a clean checkout, so the
  harness reads no manifest and one failure path disappears.

### Rewritten on new evidence

- **d-ftlfhac8 — a reload is used only when the pack's file set is unchanged.** The harvested
  `live-reload-limited-to-active-behavior-pack-content` drew the cheap class around "a content
  change inside a behavior pack", conservatively, because the evidence did not separate a reload
  from the restart beside it. Increment 007's reload probe
  (`f:a-bedrock-script-reload-resolves-only-the-files-loaded-at-world-load`) measures the boundary:
  an edit to an already-loaded file reloads live, and a file first deployed after world load fails
  to resolve with the same error an absent file gives. The class is now the file set rather than
  the pack, which is both wider where the evidence allows and tighter where it does not — and the
  harness can evaluate it locally.

### Dropped

- **`changed-pack-set-is-an-input-to-the-reconcile`.** Internal function shape rather than an
  outcome a consumer observes or a reimplementation must preserve. What it made observable —
  an unchanged reconcile is a no-op, and startup deploys everything — is `r-pcq10f2b` and
  `d-a9jaqn8m`.

### Pinning

The harvested set pinned two. Ten are proposed pinned here.

`public-api` — d-zyo6kku9 (the published package name), d-0yrfifhi (the verbs, the executable, the
reset flag), d-wtziwjh5 (the one server-side knob), d-e956frnx (the key the author accepts the EULA
with), d-joa4eefg (a new export on the published library), d-62bpn2h2 (exit codes and the flag set).

`data-format` — d-c1kvyord and d-wkcxcv2b (a checked-in file, its semantics and its shape),
d-5e00ndwi (the per-line output prefix), d-zo2yl18y (the volume the author's world lives in),
d-jv1zleaj (paths and file contents on the server).

## Open questions — none

All five the increment carried have closed, and `questions.yaml` is gone: the schema says the file
is never present on a published increment. Three asked what the kit's API does, which inside this
product is `r-8h864ke8`, `r-un786n7v`, and `r-hlnbi41r`. The rest closed against probes under
`evidence/minecraft/dev-server/`, all run 2026-08-05.

| question | closed by |
|---|---|
| q-gsr57mk0 — does a list edit land without a restart | no. A pack removed from the list kept running until the world reloaded |
| q-12jwzs0h — does a console command pool a pack live | no. A newly pooled and listed pack emitted nothing on reload and reported itself only after a restart |
| q-npz0np7l — the activation version form | no collision. A SemVer string loads, a pre-release loads, and the two sides need not agree on the spelling |
| q-qk2r4e5q — container-to-host reads | yes, both directions |
| q-h34y88go — does a resource pack activate | **yes**, and the client is prompted to download it. `resource-pack-activation-probe` — a person with a client attached is the instrument, because the server carries no signal for it |

## Facts

Proposed, all from the two runs above:

- **`bedrock-activation-entry-is-header-uuid-and-a-matching-version`** — replaces
  `bedrock-activation-entry-is-header-uuid-and-version`, which is **retired as disproven on one
  clause**: it called the entry's version "the header's three-number version array", and the probe
  loads a pack from a SemVer string, a pre-release, and either spelling on either side. Everything
  else it claimed carries over. Its three citations move to the replacement.
- **`bedrock-reload-re-evaluates-an-edited-script-module`** — a console reload re-evaluates a loaded
  module against the current contents of its files, entry file and imported file alike, so a
  single-file bundle reloads as a split module does. This is what `d-ftlfhac8`'s cheap path rests
  on.
- **`bedrock-script-console-output-is-not-a-deploy-signal`** — a script's `console.warn` reaches the
  console only with `CONTENT_LOG_CONSOLE_OUTPUT_ENABLED`, and even then appears at world load and
  not on a reload; an uncaught error appears on both. Nothing may read a pack's log output as an
  acknowledgement.
- **`bedrock-resource-packs-mirror-the-behavior-pack-layout`** — the resource pool path, activation
  list, and entry shape, and that naming a pack there **activates** it. The activation half was
  observed at an attached client rather than in the server's output, which carries no signal for
  it; the probe's control and its reversal are what make the observation mean the list.
- **`bedrock-rejects-a-format-version-3-manifest`** — scoped narrowly: one manifest, otherwise
  identical to a loading `format_version` 2 one, did not load. Evidence about that manifest, not
  about the format. It bears on the build half rather than the dev loop, since `r-dj86ixj8` passes
  format versions through unnormalised.

`compose-cp-copies-without-bind-mounts` moves from `assumed` to `tested`, and
`bedrock-activation-list-read-only-at-world-load` gains four sources that cover the half its own
first source admitted it had never captured.

## Survey

Dispatched read-only against this draft fold, one implementer per package the fold names:
`nodejs/minecraft/mc-dev-server` (68 entries) and `nodejs/minecraft/mc-dev-kit` (10). Both censuses
persist at `drafts/survey-census.yaml`. The draft acted on two entries already — q-npz0np7l records
the activation version form, and d-ftlfhac8 and d-a9jaqn8m were repaired where the reload rule and
the reattach path had been written against each other: the file-set comparison now reads the pool
the reconcile already reads, so it holds on the first change after a reattach.

**Deferred** — an open question already names the choice: the resource activation list's shape
(q-h34y88go), container-to-host reads against a remote daemon (q-qk2r4e5q), the activation version
form (q-npz0np7l), a list edit without a restart (q-gsr57mk0), a newly pooled pack (q-12jwzs0h).

**Omitted as implementation details** — no consumer observes them and no reimplementation must
preserve them: the bundler and whether the CLI ships built or as source, the `bin` target path, the
debounce interval's value, build parallelism, the pool-read command's spelling, the pool-removal
mechanism, joining a workspace-relative entry path back to an absolute one, grouping entries by
owning package before invoking a build, watcher mechanism and scale, and whether the container start
overlaps the first one-shot builds.

**Gaps** — every one worked back into the fold, as follows. Two took an existing decision wider
rather than a new one, and one closed into an open question.

| gap | closed by |
|---|---|
| the config file's schema | d-wkcxcv2b (new), and d-c1kvyord widened to settle `--pack` with `--profile`, an unmatched profile, and an empty one |
| the server's on-disk layout | d-jv1zleaj, with d-duvygv2f for the fresh world's first deploy; the resource half moves to q-h34y88go |
| the compose project's server environment | d-e956frnx (EULA, and the posture that is not configurable); the port becomes a config key in d-wkcxcv2b |
| workspace-root resolution | d-joa4eefg — a new library export, serving d-ai68xorc as well as the harness |
| discovery cadence | d-1u13wl57 |
| failure policy | d-n81zkitr, with d-plnvasfo for content the harness did not deploy |
| the loop's own concurrency | d-0qo3xvev, d-7ayy4btp, d-wgzr4lvx |
| the rest of the CLI surface | d-62bpn2h2 |
| platform, and the Docker connection | d-a3fyy34f |
| sequencing and versioning | not a decision of this increment — see *Left for the Plan loop* |

The gaps as the survey stated them:

1. **The config file's schema.** d-c1kvyord pins `mc-dev-server.yaml`'s location and what it holds
   and not its shape — key names, profile form, unknown-key handling, malformed-file behaviour,
   `--pack` with `--profile`, an unmatched profile name, and the level-name and image-tag defaults.
   A hand-authored checked-in file is data-format surface; this is the largest single gap.
2. **The server's on-disk layout.** Each kind's pool path, the world directory under the level name,
   creating a world directory and activation file the server never creates, and the order entries
   are written in — which is the pack stack order the server applies on a conflict.
3. **The compose project's server environment.** EULA acceptance, the published port and what
   happens when it is occupied, online-mode and allow-list, the stop grace period that decides
   whether a world save completes, and whether the three-key config admits any extension at all.
4. **Workspace-root resolution across the two packages.** d-imdfu09l needs the root and the kit's
   rule (d-xnv5kh7k) is unexported. Exporting a resolver is new pinned surface serving d-ai68xorc
   too; reimplementing it in the harness leaves two packages able to disagree about which workspace
   they are in.
5. **Discovery cadence.** A version comes from `package.json`, which the harness watches nothing of.
   Discover once at startup and a version bump silently strands the activation entry at the old
   version — the pack stops loading with no error. Re-running discovery each reconcile fixes it and
   keeps d-k7py0qqv intact, but the cadence is decided nowhere and cache-once is the natural pick.
6. **Failure policy.** A selected pack the kit reports invalid, a package declaring no `build` or no
   `watch` script, a one-shot build that fails at start, a build that fails mid-session, a watch
   process that dies, an absent output tree, and pool content the harness did not put there.
7. **The loop's own concurrency.** A change arriving mid-reconcile or mid-restart, how the restart
   is performed and whether the world is saved first, and whether a second attached run is
   prevented.
8. **The rest of the CLI surface.** Exit codes, the signal set beyond Ctrl+C, child-process
   teardown, `--help`/`--version`, verbosity, whether anything reaches stderr, and how far back the
   log is read on reattach.
9. **Sequencing and versioning.** The kit's increments 003-007 are designed and unbuilt, so
   d-j3ayhwv1's build invocation has nothing to call: either the kit ships them first or r-8et233c9
   is not demonstrable end to end. With a sibling package pinned to the kit's surface, staying on
   0.x means every surface addition is a minor that consumers' carets will not follow.
10. **Platform support**, and whether the Docker connection is the ambient context — the same
    workspace against two daemons produces one project name and two servers.

### Calls in the gap closures worth the owner's eye

- **d-e956frnx makes the author accept the EULA**, in the config file, and fails the start command
  without it. The harness could set the acceptance itself and never mention it; that would be
  making a legal acknowledgement on the author's behalf, so it does not.
- **d-joa4eefg adds a new export to the published library** — the first thing the dev loop asks of
  the kit's surface. The alternative was the harness reimplementing d-xnv5kh7k's marker precedence,
  which lets two packages disagree about which workspace they are in, silently. d-ai68xorc's build
  half needs the same answer, so it is one export with two consumers rather than a favour to the
  harness.
- **d-n81zkitr refuses to start a partial run.** An invalid selected pack, a package with no
  `build` script, or a failed one-shot build fails before anything comes up, on the reading that
  r-pcq10f2b's "the server's pack state equals the built output of the selected packs" is broken by
  a silently skipped pack. Once running, the loop never tears down.
- **d-a3fyy34f puts Windows out of scope.** Nothing in the requirements names a platform; this is
  the cheapest posture and the one to reverse first if it is wrong.
- **d-62bpn2h2 sends every line to stdout**, diagnostics included, because d-5e00ndwi says one
  stream and a stderr split would be two.

## Rulings, and the six revisions

The owner ruled the set: 10 accepted, 3 tolerated, 9 delegated, 7 rejected. Six rejections carried
rework instructions and are revised in place — the entry keeps its id, takes the revised statement,
returns to `proposed`, and drops its reason. Nothing supersedes anything: the rejection was feedback
inside an unpublished draft, not a published ruling to close.

| id | what the revision changed |
|---|---|
| d-0yrfifhi | the executable is `minecraft-server`, with `start` and `stop` named explicitly — no bare default invocation |
| d-wkcxcv2b | no conventional config-file name; one is read only where `--config <path>` names it. Every setting defaults, so a bare `start` is a complete run. The file gains `default_profile` |
| d-c1kvyord | selection follows the config's `default_profile` when the command line names neither `--pack` nor `--profile`; `--profile` without `--config` is an error |
| d-e956frnx | EULA acceptance comes from `--accept-eula` as well as the config key, so no config file is required to start |
| d-vrq7lc2o | a build failure no longer aborts the start: the pack deploys as a stub carrying its identity and no content, so the world loads and the loop carries the fix |
| d-n81zkitr | best-effort launch throughout — nothing about one pack stops a run, and a run fails only where it cannot be a run at all |

`d-62bpn2h2`'s flag set follows: `--config`, `--pack`, `--profile`, `--accept-eula` on `start`,
`--reset` on `stop`, `--help` and `--version` on both.

**d-zo2yl18y stays rejected.** Its reason asks whether the world volume should be removed on every
stop and says to bring it to a chat session; that is a conversation, not a rework instruction, and
the entry waits on it.

## Left for the Plan loop

- **The `f:dev-kit-*` facts.** Eleven facts in `facts/minecraft/bedrock-server.yml` source
  mc-dev-kit's own requirements. No decision here cites them any longer, so they are retired once
  mc-dev-server's own increments no longer do.
- **mc-dev-server itself.** Retiring the product is a separate change; this increment only adds.
- **Build-half sequencing.** The kit's increments 003-007 are designed and unbuilt — the
  implementation record covers 001-002 only — so d-j3ayhwv1's build invocation has nothing to call
  yet. Either the kit ships those increments before the harness, or r-8et233c9 is not demonstrable
  end to end. That is the implementation's ordering to settle, not a decision here.
- **The kit's version line.** With a sibling package pinned to the library's surface, staying on
  0.x means every surface addition is a minor that a consumer's caret will not follow. Release
  policy, and nothing this increment's requirements reach.
- **The `"./*"` wildcard export.** The library's package manifest maps a wildcard subpath, so
  `@twin-digital/mc-dev-kit/internal/...` resolves today — and the harness is now placed to reach
  through it. Narrowing the map to `.` and `./build` is the right answer; whether it is this
  package's change to make depends on whether the map is generated from a root file.
