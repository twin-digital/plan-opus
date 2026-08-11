# Survey routing

Every entry of `survey-census.yaml`, classified as the process requires: **decided** where a foundation
determines it, **deferred** where a ruled decision names the choice and whom it is handed to, or an
**implementation detail** where no consumer could observe it and no reimplementation must preserve it.
Anything that is none of the three is a **gap**, and a gap routes back into Clarify.

Fifty-two entries returned. Six are decided as they stand, twelve are implementation details, and the rest
are gaps or deferrals — which is the honest reading of a first increment for two packages that do not exist.

## Decided as the fold stands

| entry | what settles it |
|---|---|
| the spawn call's parameter shape | `d-5lutr7ok` fixes the inputs and says the signature is not fixed here |
| ESM-only, `require()` fails | the `nodejs` preset, satisfied by the shared bundler base with nothing to choose |
| the vendored asset set is reachable | the survey resolved every asset the evoker names in `bedrock-samples`; `d-3ggbl0kl` and `d-lyvjq8l1` between them settle that it is vendored and re-identified |
| a duplicate or mistyped uuid fails loudly | the kit reports `duplicate-uuid` across the workspace |
| `min_engine_version` on a vendored definition is free | `d-i8pjw2on` guarantees no two definitions share an identifier, so the tiebreak never runs |
| the pack's dev loop exists | `r-992moral`, satisfied by the script the repo-kit feature writes |

## Implementation details — omitted deliberately

The library's npm name; whether the entity-type lookup is memoised within one call; which way an actor
faces before anyone approaches; the preset-name type (bare string versus literal union); the vendored files'
`format_version`s; the dev world's level, seed and spawn; the physical layout of the pack's directories; the
error's message wording; how the library's internals are factored; which of the evoker's unreachable
animations are trimmed; the shape of a committed identifier baseline; whether the pack carries a vestigial
`src/`.

Each is invisible to an adventure and free for a reimplementation to re-make.

## Gaps — routed back into Clarify

### Owner's, not mine

1. **`r-pngblab3` and `d-3ggbl0kl` contradict on materials.** The requirement forbids resolving to any
   material the game ships; the decision requires naming a stock one. And the third leg makes it a bind
   rather than a slip: materials live in `materials/*.material`, a whole-file kind `d-ny9lcyjg` bars the
   pack from declaring in, so a custom material cannot be namespaced — while every client entity must name
   some material. Naming a vanilla one is forced. Requirement against reality is the owner's call.

2. **Where the enforcement of `d-ro5pj8er` and `d-5f011w0o` lives.** Both surveys independently found no
   home inside this product. `mc-pack-archive` consults nothing and succeeds with one pack member — exactly
   the release `d-ro5pj8er` must refuse — and `packBuild` owns its whole `plugins` array with
   `tsdown.config.d` fragments shallow-merging, so no second fragment can add a check. Every route is a
   change to `mc-dev-kit` or `.repo-kit.yml`, another product. Whether this increment defers to that
   product or narrows its own claims is the owner's.

3. **Whether the product acquires a third package.** Neither package runs a script in a world, so no claim
   about run-time behaviour has any route to a manual check, and `r-e8p2oto6` — a claim about what an
   adventure carries — can be evidenced only by an example adventure. Adding one changes `product.yaml`.

### Mine to decide, pending the above

4. **`d-ro5pj8er` verifies the wrong thing.** "Both at agreeing versions" reads two ways and fails both:
   this package's halves are versioned from one `package.json` and equal by construction, and the product's
   two packages meet only in an adventure's archive. The coherent check is that the archive refuses to ship
   with either half absent — which is real, valuable, and still a kit change.

5. **The behavior half must declare a dependency on its own resource half.** Unsettled, load-bearing, cheap
   to get right and silent to get wrong: without it an adventure naming one uuid activates one pack and the
   actor is the invisible unpointable case. Needs a decision, and it also fixes which uuid an adventure
   names.

6. **The namespace has no form, and no floor.** Under semver a `0.x` package breaks on a minor, so at `0.x`
   one namespace spans every breaking change and `r-pop72yk6` does not hold. Needs a decision fixing the
   literal form, a `1.0.0` floor, per-major uuid rotation, and where the lint reads the major from.

7. **`d-w0smdozf` under-enumerates.** Its three properties do not establish what `r-wqwub3zz` and
   `r-8ih6ab2r` require: nothing stops a player, piston, water or minecart displacing an actor; nothing
   makes it survive a chunk unload; the bar on renaming is met by *omitting* `minecraft:nameable`, which is
   not recorded as deliberate; and "watches continuously" needs non-default values against a documented
   ~0.02 probability.

8. **Actor lifecycle.** Two holes that compose into a trap. A handle does not survive a world reload and
   the fold offers no lookup, so `r-8ih6ab2r`'s "until the adventure removes it" is unimplementable. And
   because an actor persists while the only verb is spawn, an adventure spawning on world load accumulates
   one actor per restart.

9. **Where the preset registry lives.** `d-ipgh0g2d` requires one registry feeding both packages while
   `d-6jlj0rl2` forbids either holding the other's content, and the fold names no third home. Also
   unsettled: whether the generated entity JSON is committed with a drift gate, or generation becomes a kit
   capability.

10. **The default name's home.** The natural place is `texts/*.lang`, which `d-ny9lcyjg` bars, so it must be
    a library string applied as a `nameTag` — unstated, not localizable, and it leaves this package
    answering for no part of `r-rpcudvbl`.

11. **The revision pin has no record.** `d-lyvjq8l1`'s title says "a pinned revision"; its statement names
    no source, no revision, and no provenance record. Re-vendoring is expected more than once, since
    `d-5f011w0o` frees appearance to change within a major.

12. **`d-ny9lcyjg` bounds one half.** Its lists are entirely resource-pack kinds while the decision reads as
    a general bound on the assets pack. Nothing is at stake this increment; the next preset wanting a loot
    table meets an unstated rule.

### Preset scope — a defect in this increment's own adoption

13. Both presets are adopted product-wide. Read literally, `r-cyd08e6q` obliges the *library* to merge the
    kit's fragment, which would delete its `dist/` and suppress its declarations, contradicting the
    `nodejs-library` packaging requirement outright; and four requirements about a packed `package.json`,
    an exports map, and unit tests standing up `@minecraft/server` bind a pack package that has none of
    those things. `scope:` on a preset adoption exists precisely for this. The earlier reasoning — that each
    requirement's subject would settle which package it reaches — did not survive a literal reading by two
    independent implementers.

### Outside this product, and reported rather than resolved

14. **`r-hear6pun` cannot be satisfied for the product's most load-bearing decision.** test-lib lists the
    registry classes as out-of-scope, `EntityTypes.get()` throws, and `createServer()` returns the same
    static fake for every bundle, so there is no per-bundle state to register a type into. Every route
    changes `mc-test-lib` or breaks `r-hear6pun`.
15. **`SpawnEntityOptions` is untestable.** test-lib's fake throws for any options argument, so if the
    library passes `initialPersistence` no test of the spawn path runs under the shared lib.
16. **The published-tarball path does not resolve.** The exports map emits `source: ./src/index.ts` while
    `files` ships only `dist`, and the kit resolves through the `source` condition.
17. **Monorepo configuration entries** — the `package-manifest` opt-out both packages need, and the
    `typescript` and `test` features writing scripts into a package with no `src/`.
18. **The EULA question arrives sooner than the brief assumed.** `publish.yaml` uploads whatever
    `release-assets` writes to a public GitHub release, so the first release distributes re-identified
    Mojang assets rather than keeping them private.

## What the draft did

The owner ruled 1–3, and the draft acted:

- **1, materials** → `q-ac8gcffb`. Carried to the owner as an open question rather than resolved, since
  amending `r-pngblab3` is owner fiat. The increment cannot publish while it stands.
- **2, enforcement** → `d-lgaqtx4c` defers both checks to `mc-dev-kit`, with `b-88k6uu2b` (an archive must
  refuse an incomplete addon) and `b-f9kytnzy` (a pack build needs an extension point) captured there.
- **3, evidence** → `d-2qxdv80k` adds `nodejs/minecraft/rpg-core-example` and the `example` component.
- **4** → `d-ro5pj8er` restated: no archive ships one half without the other, since version agreement was
  true by construction and verified nothing.
- **5** → `d-3or6phg1`: the behavior half declares its own resource half, and that is the uuid an adventure
  names.
- **7** → `d-w0smdozf` extended to six properties, three of which are met by what the definition omits.
- **13** → both preset adoptions scoped: `minecraft-addon` to `assets-pack` and `example`,
  `nodejs-library` to `library`.

All six of the remaining gaps are closed:

- **6, the namespace** → `d-2zclv5ol` fixes the form as `rpg<major>` and has the build read the major from
  the package's own version, so a name and the version it claims cannot disagree unnoticed. `d-orqkexpm`
  sets the `1.0.0` floor and per-major uuids: at `0.x` semver breaks on a minor, so one namespace would span
  every breaking change and `r-pop72yk6` would not hold.
- **8, actor lifecycle** → `d-9uu20w3r`. A durable name, idempotent placement under it, and resolution from
  it in a later session. Without it `r-8ih6ab2r`'s final clause was unimplementable and the obvious
  adventure accumulated one actor per restart.
- **9, the registry** → `d-icz8rnnw`. It lives in the library; the pack builds from it. A build-time
  dependency is neither package holding the other's content, so no third home is needed.
- **10, the default name** → `d-bfdql5tx`. A library string applied at creation, since `texts` is barred and
  the shared component set cannot carry a per-preset value.
- **11, the revision pin** → `d-cb9jl02i`. Repository, revision, and the path of every file taken, committed
  beside the assets.
- **12, the kinds bound** → `d-ny9lcyjg` restated over both halves, with the resource half's enumeration
  moved to commentary so the rule is the test and not the list.

And gap 1, the materials contradiction, is ruled: `r-qi348761` supersedes `r-pngblab3` with materials
excepted, `q-ac8gcffb` is removed, and `d-lyvjq8l1` and `d-3ggbl0kl` are restated against it. The exemption
turned out to rest on something stronger than the reason first given — the published vanilla pack carries no
material definitions at all, so naming one the game ships is forced by the format rather than chosen
(`f:the-vanilla-material-definitions-are-not-published`). It is written for materials alone rather than as a
general licence, so a second such case earns its own amendment.

Items 14–18 remain outside this product. The test-lib registry gap is now `q-sf1l1ypo`, with the capability
captured against `mc-test-lib`; the rest are reported and unresolved.

## Settled by mc-test-lib 007

`q-sf1l1ypo` is gone. mc-test-lib 007 makes entity-type registration a free function against a per-bundle
registry that starts empty, so both branches of `d-xobjyw2e`'s check are arrangeable, `r-hear6pun` is
satisfiable with no exception, and this product's public surface is untouched. The question closed as no
longer relevant rather than being answered by a foundation here.

Two of the facts that increment measured changed `d-xobjyw2e`:

- **`f:f-90p7coes`** — a lookup hit spawned and a lookup miss threw across six identifiers, bare forms
  included, so *"a `get` that returns a value is a sound pre-check for a spawn that will succeed."* That is the
  premise the decision rested on and previously asserted. Now cited.
- **`f:f-rtmfaoba`** — `EntityTypes` answers no read during early execution: both `get` and `getAll` throw at
  a module's evaluation and inside a `startup` handler, answering only by `worldLoad`. The decision put the
  check on *every* entry point without naming that boundary, so it now carries a first case for it. The
  library does not translate the engine's refusal into its own error, and the commentary says why: an
  adventure cannot usefully act on an actor before the world loads anyway, and a wrapper would only obscure
  which failure happened. What the case buys is that nobody later moves the check to startup, where it cannot
  run at all.

Their `entity-type-bare-id-means-the-minecraft-namespace` changes nothing here: `d-2zclv5ol` makes every actor
identifier namespaced, so the bare-id case never arises.
