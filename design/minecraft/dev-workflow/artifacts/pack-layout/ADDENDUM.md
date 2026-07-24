# How a pack project is laid out on disk

Research for the owner, who intends to pin the source file format and the manifest's name and
location as a **requirement**. Nothing here is settled in `spec.md` or `decisions.yaml`; the
recommendation is a proposal the owner is free to overrule.

The existing decision `pack-identified-by-a-committed-behavior-manifest` answers a different
question — how the harness *recognises* a pack — and would sit under whatever layout the
requirement fixes, not above it.

Companion files: `FORMAT-EVIDENCE.md` (first-party format and layout quotes),
`TOOLING-EVIDENCE.md` (ecosystem tools), `CANDIDATES.md` (the full field), `probe/` (what the
server does with the two pack kinds, with captured output).

## The fork the owner posed

1. **Build the full triplet now** — behavior packs, resource packs, and addons bundling either.
2. **Behavior packs only now, on a layout that extends to the triplet later** without a breaking
   reorganisation.

**Option 1 is permitted by the requirements.**
`behavior-packs-required-other-content-optional` reads: "the harness must build, deploy, and
activate behavior packs. Support for other kinds of addon content — resource packs among them —
is optional, at the builder's or designer's discretion." Optional means permitted, not
prohibited. The choice between 1 and 2 is a cost judgement, and nothing in the inputs has to
change for either.

## What the format fixes, and what it leaves open

Four things are not ours to choose. They narrow the field more than any preference does.

- **A pack is a folder whose only required file is `manifest.json`, at that folder's root.** The
  manifest carries identity and kind; everything else is optional content in format-named
  subfolders.
- **The deployed unit is one directory per pack, and the directory name is free.** The game reads
  each pack as its own folder in a pool, and the tutorials say outright the folder "can be named
  anything you want".
- **There is no addon-level identity.** No addon manifest, no addon uuid — four independent
  checks of the manifest reference found only `header.uuid` and per-module uuids. The nearest
  thing is a per-pack `metadata.product_type: "addon"` hint that explicitly "should not change how
  the pack functions in-game". An addon is a *distribution bundle* plus a dependency link.
- **A pack depends on another pack by exact uuid and exact version**, via the manifest's
  `dependencies` array — this is how a behavior pack pulls in its resource pack, and the docs are
  explicit that neither kind needs the other.

The server agrees, and adds one thing the docs never state: the two kinds have **separate pools
and separate world lists**, and a resource pack misfiled into the behavior pool and listed as a
behavior pack is ignored in silence — no error, no mention (`probe/OUTPUT.txt`). Kind is carried
by the manifest and never inferred from location, so the harness must know a pack's kind *before*
it copies.

What the format leaves entirely open is the **source** layout: where the pack root sits inside a
repository, and whether one repository unit holds one pack or several.

## Candidate layouts

Full field in `CANDIDATES.md`; four survive.

### A — one pack per package, manifest at the package root

```
packages/village-guard/
├── package.json
├── manifest.json        <- pack root == package root
├── scripts/ entities/   <- format-named content folders
└── dist/                <- built pack
```

### B — one pack per package, pack root in a named subdirectory

```
packages/village-guard/
├── package.json
├── behavior_pack/manifest.json   <- pack root, one level down, kind in the name
├── src/main.ts                   <- sources compiled into the pack
└── dist/                         <- assembled pack
```

### C — one package per addon, kind-named pack folders (Microsoft's shape)

```
packages/my-addon/
├── package.json
├── behavior_pack/manifest.json
├── resource_pack/manifest.json
└── dist/
```

Note that **B and C are the same layout at one pack**: B is C with only the behavior pack
present. That is the single most useful structural fact in this whole analysis.

### D — packs are packages, an addon is a composition of dependencies

```
packages/village-guard/     (behavior pack package)
packages/village-textures/  (resource pack package)
packages/village-addon/     (package.json only — depends on the two above)
```

Dropped, with reasons: a top-level `manifest.json` beside `packs/` — an addon-level manifest is
not a thing the format has, so it would be ours alone and mean nothing to any tool; `.mcaddon/` as
a source directory name — that extension names a zip, not a source tree; free source layout with
only built output pinned — discovery would need a build to have run; one package holding many
unrelated packs — defeats per-pack versioning and release artifacts.

## On their own merits

| | A | B | C | D |
|---|---|---|---|---|
| clarity | highest — package is the pack | one indirection, kind visible in the path | matches Microsoft's tutorials | packs clear; addon abstract |
| discovery | manifest at package root | `<pkg>/*/manifest.json`, depth 1 | same as B | packs as A/B; addons need dependency resolution |
| build | copy + compile | assemble into `dist/` | assemble per member pack | assemble per pack + bundle step |
| pack-root hygiene | **poor** — pack content sits beside `node_modules/`, `dist/`, tooling config | clean | clean | clean |
| growth | linear | linear | linear in addons | linear; only shape where one pack serves two addons without copying |
| failure when violated | a stray root manifest in a non-pack package is picked up | a missing pack dir is simply not a pack | a member folder without a manifest is silently not a pack | a dependency that is not a pack fails at assembly |

The hygiene row decides A. The format tells the game to read *named folders* from the pack root,
and a package root also holds `node_modules/`, `dist/` and tooling config. Deploying a package
root wholesale ships those; deploying it selectively means the build already knows which files are
pack content — at which point the pack root is a subfolder in all but name.

## Compatibility with ecosystem tooling

This is the axis the owner expected to be settled by evidence, and it is — though not in the
direction of any one layout.

**Every tool examined assumes one project = at most one behavior pack and one resource pack.**
The Bedrock-OSS Project Config Standard — shared by Regolith and bridge. — keys its `packs` map
by pack *type* (`behaviorPack`, `resourcePack`, `skinPack`, `worldTemplate`, `dataPack`), so a
second behavior pack has nowhere to go. Regolith's Go config struct is two singular string
fields. bridge. states "Each bridge. project can contain up to four different pack types".
Microsoft's `@minecraft/core-build-tasks` hard-codes the deploy destination as
`development_behavior_packs/<PROJECT_NAME>`, and listing several source folders *merges* them into
that one pack rather than producing several.

So **no mainstream tool models a workspace of many independent packs** — which is exactly the
shape this design needs, and which the harness must therefore provide itself under any layout.
That is a real finding, and it means ecosystem compatibility does *not* discriminate between A,
B, C and D at the workspace level. It discriminates only on whether a single pack directory can
be handed to an outside tool, and every candidate keeps a pack directory with `manifest.json` at
its root — the only thing those tools require.

Two secondary findings worth the owner's attention:

- **Microsoft's own guidance is internally inconsistent.** The Add-On Development Workflow doc
  shows `my_addon/behavior_pack/` (singular, `scripts/` inside the pack); the `ts-starter` sample
  ships `behavior_packs/<PROJECT_NAME>/` (plural, TypeScript `scripts/` a sibling of the pack,
  compiled into it at build). Both are Microsoft's. There is no single "official" source layout to
  conform to — only the pack-root rule, which both obey.
- **Naming is free but path length is not.** Pack folder names in *world templates* must be 10
  characters or shorter. Whether that binds a development pool folder is untested; the probe used
  longer names on a server without trouble.

## Composition by dependency (D), examined

**Identity.** An addon package cannot carry a pack uuid, because the format has no addon identity.
It carries the *composition*. The format's own composition mechanism is the manifest
`dependencies` array, keyed by the other pack's header uuid and an exact version. These are two
layers and both would exist: npm dependencies decide what gets built and assembled; manifest
`dependencies` decides what the game auto-activates alongside a pack. They are not
interchangeable — the game has never heard of npm, and npm has never heard of a uuid.

**Versioning is the sharp edge.** An npm dependency carries a range; a manifest dependency must
carry an exact `[major, minor, revision]` that matches the other pack's header version, and the
activation list names an exact version too. Assembly must resolve the range and then *write* the
resolved version into the behavior pack's manifest `dependencies` entry. That is a generation step
no container layout needs, and it means a committed manifest cannot state its resource-pack
dependency literally — it would be templated, which collides with a requirement that wants the
committed manifest to be the authored artifact.

**The dev loop.** If an addon takes its pack dependencies from the workspace (a workspace-protocol
dependency), the packs stay watched and rebuilt, and one edit to a shared pack reloads for every
addon using it — the loop this design exists to make fast keeps working. If dependencies resolve
to published versions, those packs are opaque: no watching, no rebuild, no fast loop. Both are
expressible, so a requirement has to say which. Note that the dev server activates every
discovered pack anyway, so the harness needs the addon grouping only for release, not for the
loop.

**Reuse** is D's genuine advantage: one pack in several addons is natural, and in every container
shape it is a copy or a symlink. Whether that need is real is an owner question — nothing in the
inputs establishes it.

**Ecosystem.** No tool consumes an addon defined by reference; all of them expect the packs
present as directories. The composition would be ours alone, and it is flattened away in the
artifact: an `.mcaddon` is a zip of packs (Microsoft's own build task emits `<name>_bp.mcpack` and
`<name>_rp.mcpack` side by side), and nothing in it records that they came from separate packages.

## Migration cost: behavior packs now, triplet later

| layout | what existing packs must do | what the harness must add |
|---|---|---|
| A | nothing; an RP is another package | second pool, second world list |
| B → C | **nothing** — a resource pack is a new sibling directory in the same package | second pool, second world list |
| B → D | nothing; RPs and addons are new packages | the above, plus assembly and version pinning |
| C adopted now (with one pack) | identical to B | same |
| A → C | every pack gains a directory level; every pack moves | same |

The point that decides it: under A, B and D the migration is **additive**, because a pack is a
self-describing unit and nothing about its location says "behavior" — the kind lives in the
manifest, which the harness already reads. Under A specifically, moving *to* an addon-container
shape later would move every pack; B does not have that problem, because B already is C with one
pack.

The reconciler's work roughly doubles for a second kind under every layout — the probe shows the
two kinds are parallel mechanisms with no sharing — so that cost is not a discriminator either.

## Recommendation

**Option 2 — behavior packs now — on layout B, which is layout C with one pack.**

Concretely, what a requirement could pin:

- A pack is a workspace package whose **pack root is a kind-named directory in the package**:
  `behavior_pack/`, holding `manifest.json` at its root.
- The **built** pack is assembled at `dist/` with `manifest.json` at *its* root, so the deployed
  directory and the release `.mcpack` have the shape the format and every tool expect.
- A resource pack, when it arrives, is `resource_pack/` in the same package — additive, no moves —
  and the package is then an addon in the sense the ecosystem means it.

Why this over the others: it costs one directory level against A and buys pack-root hygiene, the
kind visible in the path, and — the decisive part — a migration to the full triplet that adds a
sibling directory rather than moving anything. It matches Microsoft's documented addon tree, which
is the closest thing to a standard that exists. And it leaves D available: an addon package that
composes pack packages can be added later without disturbing packs laid out this way.

**The strongest argument against it.** B/C ties a pack's fate to a package that may later hold two
packs, and those two packs then share one version, one changeset, and one release artifact. If
per-pack versioning matters — and in a monorepo that publishes `.mcpack` files per pack, it
plausibly does — then the honest shape is D from the start: every pack its own package, addons as
compositions, versions independent. D's costs (templated `dependencies`, assembly logic, a shape
no tool understands) are real but they are *release-time* costs, while B/C's cost lands on
versioning, which is forever. An owner who expects packs to be shipped and versioned
independently should overrule this recommendation and take D.

A second, weaker objection: A is simpler by one directory, and the hygiene argument is a
build-discipline concern rather than a format one. An owner who intends `dist/` to be assembled
from an explicit allowlist can choose A and lose nothing the format cares about — at the cost of
the A → C migration above.

## What could not be verified, and what would settle it

- **`.mcpack` archive root.** No first-party statement that `manifest.json` sits at the zip root.
  Microsoft's own build task constructs it that way, and community documentation states it
  outright ("zipping the contents of a behavior pack … directory"), but the docs never say it.
  Settled by: building both shapes and importing them.
- **`.mcaddon` internal structure.** First-party says only "a zip file that contains .mcpack or
  .mcworld files". Community documentation adds that bare top-level pack directories also import,
  with no nesting. Exact folder names inside are unverified. Settled by: an import test.
- **Whether the probe's resource pack actually loaded.** The server logs a Pack Stack line for
  behavior packs and nothing for resource packs, and no client connected, so the probe shows the
  layout is accepted, not that it took effect. Settled by: a connected client, or a visible
  texture change.
- **Whether a pack is ever shared between addons**, and **whether an addon under development
  should link its packs from the workspace or consume published versions.** Both decide between
  B/C and D, and neither is answerable from the inputs. Settled by: the owner, as requirements.
- **The 10-character folder-name limit** outside world templates. Settled by: a client test with
  a long development pool folder name.
- **Blockbench**, and any tool that might consume a multi-pack workspace. No primary source
  reached for Blockbench; the "no tool models a multi-pack workspace" finding is a survey result,
  an absence of evidence rather than a proof of absence.
