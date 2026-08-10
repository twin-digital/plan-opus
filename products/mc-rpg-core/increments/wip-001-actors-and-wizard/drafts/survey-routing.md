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

Pending the owner's answers on 1–3, since 4 and 6 and the scope fix in 13 all move depending on them.
