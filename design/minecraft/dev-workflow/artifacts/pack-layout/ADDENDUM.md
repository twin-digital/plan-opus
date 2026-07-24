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

## Pack, module, addon — three different things

Worth stating plainly, because the words invite confusion and the rest of this document depends
on the distinction.

- A **pack** is the unit the game loads: a directory with `manifest.json` at its root. The
  manifest describes exactly one pack, and `header.uuid` is that pack's identity.
- A **module** is a division *inside* one pack, listed in that same manifest's `modules` array.
  Modules are not packs and have no manifests of their own; they have their own uuids, which are
  not the pack's. A module's `type` is what declares *what the pack contains* — "'data' for
  behavior packs, 'resources' for resource packs, or 'script' for packs with JavaScript/TypeScript
  code". So "behavior pack" is not a separate file format: it is a pack whose modules are of those
  kinds.
- An **addon** is a *bundle* of packs — conventionally a behavior pack and its resource pack —
  with **no manifest and no identity of its own**. There is no addon uuid. What holds an addon
  together is (a) a distribution archive that carries the packs, and (b) a `dependencies` entry in
  one pack's manifest naming another pack's uuid and version.

The practical consequence for a layout: `<dir>/manifest.json` marks a **pack**, never an addon.
A layout cannot key on "is this an addon" from a file, because the format provides no such file.

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

The server agrees, and adds two things the docs never state. The two kinds have **separate pools
and separate world lists**: a pack in the wrong pool does not load, in either direction, and fails
in silence (`probe/OUTPUT.txt`, cases 2 and 4). And **a pack's own directory name carries no
meaning** — a behavior pack in a directory called `resource_pack_totally` loads normally and the
server prints the name back untroubled (case 5). Kind is carried by the manifest and never
inferred from a name, so the harness must know a pack's kind *before* it copies — by reading the
manifest.

What the format leaves entirely open is the **source** layout: where the pack root sits inside a
repository, and whether one repository unit holds one pack or several.

## Candidate layouts

Full field in `CANDIDATES.md`; five survive.

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

### E — kind-agnostic `packs/*`

```
packages/village-guard/
├── package.json
├── packs/village-guard/manifest.json      <- a pack; kind read from its modules
├── packs/village-textures/manifest.json   <- another pack, whenever one is wanted
├── src/main.ts
└── dist/
```

One `packs/` root, one directory per pack, the pack's kind read from the manifest's module `type`
rather than encoded in a directory name. Discovery looks at `<package>/packs/*/manifest.json`.
The same shape works at the repository root (`packs/<name>/` where each is a workspace package) if
the owner prefers one pack per package; the analysis below holds for either binding.

One correction to the framing: `packs/*/manifest.json` is the key that something is a **pack**,
not an addon — per the section above, the format has no addon file to key on.

Dropped, with reasons: a top-level `manifest.json` beside `packs/` — an addon-level manifest is
not a thing the format has, so it would be ours alone and mean nothing to any tool; `.mcaddon/` as
a source directory name — that extension names a zip, not a source tree; free source layout with
only built output pinned — discovery would need a build to have run; one package holding many
unrelated packs — defeats per-pack versioning and release artifacts.

## On their own merits

| | A | B | C | E |
|---|---|---|---|---|
| clarity | highest — package is the pack | kind visible in the path | matches Microsoft's tutorials | pack visible in the path; kind is not |
| discovery | manifest at package root | `<pkg>/*/manifest.json` | same as B | `<pkg>/packs/*/manifest.json` — one bounded place to look |
| build | copy + compile | assemble into `dist/` | assemble per member pack | assemble per pack |
| pack-root hygiene | **poor** — pack content sits beside `node_modules/`, `dist/`, tooling config | clean | clean | clean |
| growth | linear | linear | linear in addons | linear; two packs in one package need no new convention |
| kind declared | once (manifest) | **twice** — manifest and directory name | **twice** | once (manifest) |
| failure when violated | a stray root manifest in a non-pack package is picked up | a `behavior_pack/` whose manifest says `resources` — a contradiction nothing detects | same | none of that kind exists |

(D is compared separately below; it is a different axis — what a *package* is — rather than where
a manifest sits.)

The hygiene row decides against A. The format tells the game to read *named folders* from the pack
root, and a package root also holds `node_modules/`, `dist/` and tooling config. Deploying a
package root wholesale ships those; deploying it selectively means the build already knows which
files are pack content — at which point the pack root is a subfolder in all but name.

The "kind declared" row is what the owner's question is really about, and it is treated next.

## Does a kind-named folder buy anything? (E versus B and C)

**Nothing reads a source directory name — and nothing reads a pack's own directory name at all.**
The probe settles this. A behavior pack deployed into a directory named `resource_pack_totally`
loads normally, and the server prints that name back untroubled (`probe/OUTPUT.txt`, case 5). The
directory name is a label for humans; the manifest is the only declaration of what a pack is.

**What *is* kind-partitioned is the pool, and the pool is a deploy target, not a source layout.**
The probe tested both directions: a resource pack in the behavior pool listed as a behavior pack
does not load (case 2), and a behavior pack in the resource pool listed as a resource pack does
not load (case 4). Both fail in silence. So the harness must route each pack to the pool matching
its kind — but that is work on the far side of the build, and it is identical under every
candidate layout. Nothing about the *source* directory name feeds it.

**The tools do not read directory names either — they read configuration.** Regolith and bridge.
take a config that maps a pack *type* to a path (`behaviorPack: <path>`), so the folder may be
called anything; the key is the declaration, not the name. Microsoft's `core-build-tasks` takes
`copyToBehaviorPacks: [...]` — again the parameter declares the kind, and the folder happens to be
called `behavior_packs/<PROJECT_NAME>` only by convention of the sample. In every case the kind
comes from a config key or from the manifest, never from a directory name on disk.

**Marginal cost to the harness: zero.** Discovery must open and parse each manifest regardless —
it needs `header.uuid`, which is what the activation list is keyed by, and it must reject a
manifest without one. The module `type` is in the same object already in memory. Encoding kind in
the path would save no read, no parse, and no traversal; it would only let discovery *skip* packs
of unwanted kinds before parsing, which at monorepo scale is not a cost anyone can measure.

**Cost to a human: real, and the only genuine one.** Under E, `ls packs/` shows names, not kinds;
telling a behavior pack from a resource pack means opening a manifest. Under B/C the tree answers
at a glance, and a glob can select all behavior packs across the repo without parsing anything.
That is worth something to a reader and to ad-hoc scripting. It is worth noting that the same
legibility is recoverable under E by convention — `packs/village-guard-bp/` — without making the
name authoritative, though a convention that is not enforced is one more thing to drift.

**Failure modes argue for E.** B and C declare kind twice: once in the manifest, once in the
directory name. Two declarations can disagree — a `behavior_pack/` directory whose manifest lists
a `resources` module — and nothing in the format, the tools, or this design would detect it,
because nothing reads the name. The build would deploy that pack according to whichever
declaration the harness chose to trust, and the probe shows the wrong choice fails silently at the
server. E has one declaration and it is the authoritative one, so the contradiction cannot be
written down. Given that this design's worst failure mode is precisely "silently not loaded",
removing a way to create it is a concrete safety gain, not a stylistic preference.

**Migration to the triplet: E needs none at all.** Under B the migration is additive (a new
sibling directory); under E it is *nothing* — a resource pack is another entry under `packs/`,
discovered by the same glob, distinguished by the same field the harness already reads, routed to
the pool its module type names. Tested against the claim rather than granted: the things that
change when resource packs arrive are the second pool, the second world list, and the routing —
all inside the harness, none in the layout. E is the only candidate where the layout requirement
written today needs no amendment tomorrow.

**Ecosystem: E loses nothing this project could have used.** Conformity to `behavior_pack/` +
`resource_pack/` buys compatibility with tools that model one project as at most one pack per
kind — a shape this workspace does not have and cannot adopt. Meanwhile the thing those tools
genuinely require is unaffected: a pack directory with `manifest.json` at its root, which E
provides exactly as B and C do. A contributor's familiarity is the one real loss, and it is a
familiarity with a project shape that does not apply here.

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
| E | **nothing at all** — a resource pack is another entry under `packs/` | second pool, second world list, routing by module type |
| A | nothing; an RP is another package | same |
| B → C | nothing — a resource pack is a new sibling directory in the same package | same |
| B → D | nothing; RPs and addons are new packages | the above, plus assembly and version pinning |
| A → C | every pack gains a directory level; every pack moves | same |

The point that decides it: under E, A, B and D the migration is **additive or nil**, because a
pack is a self-describing unit and nothing about its location says "behavior" — the kind lives in
the manifest, which the harness already reads. E is the strongest of these: it needs no new
convention at all, because it never spent one on the distinction.

The reconciler's work roughly doubles for a second kind under every layout — the probe shows the
two kinds are parallel mechanisms with no sharing — so that cost is not a discriminator either.

## Recommendation

**Changed. E displaces B.** The earlier draft of this addendum recommended B; the owner's
question about kind-named folders is right, and the probe evidence gathered to answer it settles
against B.

**Option 2 — behavior packs now — on layout E, kind-agnostic `packs/*`.**

What a requirement could pin:

- A pack is a directory under a package's `packs/` holding `manifest.json` at its root:
  `<package>/packs/<name>/manifest.json`. The pack's **kind is read from the manifest's module
  types**, never from a directory name.
- The **built** pack is assembled at `dist/<name>/` with `manifest.json` at *its* root, so the
  deployed directory and a release `.mcpack` have the shape the format and every tool expect.
- The harness routes each pack at deploy time to the pool its module type names, and to that
  pool's world list.

Why E over B and C: the kind-named directory is a second declaration of something the manifest
already states authoritatively, and nothing — not the game, not the server, not one tool examined
— ever reads it. It costs a discovery step nothing to read the manifest instead, because
discovery already parses that manifest for the header uuid. It removes a contradiction that B and
C make expressible and nothing detects. And it is the only candidate whose layout requirement
needs no amendment when resource packs and addons arrive.

Why E over A: pack-root hygiene, and a bounded place to look. Under A a pack's content shares a
root with `node_modules/`, `dist/` and tooling config; under E the pack root holds only pack
content, and `packs/*` is an unambiguous glob rather than a scan of a package's subdirectories.

**The strongest argument against E — and it is the same one that stands against B.** E ties a
pack to a package that may hold several packs, and packs sharing a package share a version, a
changeset, and a release artifact. If packs are to be versioned and published independently, the
honest shape is **D**: every pack its own package, addons as compositions of dependencies,
versions independent. D and E are compatible in style — D with each pack package laid out
kind-agnostically is a coherent end state — so the owner's real fork is *what a package is*, and
that is a versioning question the inputs do not answer.

**The second argument against E, on its own terms:** legibility. `ls packs/` no longer tells a
reader which packs are behavior packs, and no glob selects all behavior packs without parsing.
For a repository with two or three packs this is trivial; for one with thirty it is a daily papercut.
An owner who weighs at-a-glance legibility above the duplicate-declaration risk should take B, and
should know they are buying a label, not a mechanism.

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

## Outcome

The owner settled this by fiat, in `requirements.yaml`: `pack-source-layout-is-fixed` pins the
source layout to `pack/manifest.json` for a package holding one pack and
`packs/<name>/manifest.json` for a package holding several, and
`built-output-assembly-is-the-package-s-concern` leaves how a package assembles its built output
to the package. Kind still comes from the manifest's module types, never from a directory name.

That is candidate E — kind-agnostic `packs/*` — with a singular `pack/` form added for the
one-pack case. The versioning fork this analysis surfaced (what a *package* is; E and its
neighbours versus D, composition by dependency) was not part of the question and remains open.

The analysis above is left as it was written, argument-against included, so a later reader can see
what was weighed rather than only what was chosen.
