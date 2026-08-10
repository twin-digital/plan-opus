# Brief — actors, and the wizard

The product is the shared base a family of small adventure packs is built on. Each adventure is its
own story with its own triggers; what they all need and none should own is the machinery for putting
a character in the world.

This increment defines that character — an **actor** — and nothing else. It does not define how an
actor talks, which is the next thing anyone will want and the thing most likely to be got wrong
early; `d-c0l4gwx2` hands it on deliberately.

## Why the actor is not the game's own NPC

The game ships a purpose-built character entity, and on its face it is exactly what this product
needs: 60 skins with no art to author, invulnerable, no AI, immobile, and it turns to watch a nearby
player. Three findings take it off the table.

The worlds this product is for are built in creative mode. In creative, a right-click on an NPC opens
the editor that sets its name, skin, dialog, and commands, and a left-click despawns it
(`an-npc-is-edited-and-despawned-by-ordinary-clicks`). So the two clicks a player would use to talk
to a character are instead the two that rewrite and delete it. A character a child can rename or
remove by accident is not a character.

The dialogue that would have justified the entity is unreachable from creative anyway: both official
tutorials send the creator into survival or adventure before the conversation can be had
(`npc-dialogue-needs-survival-or-adventure-mode`). Adventure mode would restore all of it, and costs
creative flight — a poor trade in a dimension you can fall out of.

And the scripting handle on an NPC's own name, skin, and scene is `EntityNpcComponent`, which is
documented for the experimental moniker alone and carries a pre-release caution
(`the-npc-scripting-component-is-pre-release`). A product that means to stay on stable script modules
reaches an NPC's properties through no scripting surface at all.

What the entity would have given is reproducible from ordinary components — `damage_sensor` with
`deals_damage: no` for invulnerability, `behavior.look_at_player` for the head turn — so the cost of
walking away is the appearance, not the behaviour. `d-w0smdozf` records only what those components
establish that a consumer can observe, and leaves the spellings to the implementer.

## Why two packages rather than one

The owner named the split, and the dev kit makes it necessary rather than merely tidy: the kit's pack
build takes the consuming package's output tree as its own and prunes what it did not write, and it
states the bundler's entry itself. So one package cannot emit both a pack and an importable library
entry. That is a property of the kit, asserted here from its published behaviour — another product's
decisions are not citable, and this did not warrant a fact of its own.

`d-7uvpewdk` keeps the assets pack out of each adventure's release archive. Bundling a copy per
adventure would put two packs carrying the same header uuid in one world, which is what a manifest
dependency identifies its target by. That this is an outright conflict rather than a tolerated
duplicate is untested, and the decision does not rest on it: one installation is also the only way an
asset refresh reaches every adventure at once.

## Why one identifier per preset

A client entity definition is addressed by identifier, and one identifier resolves to one appearance
definition (`a-client-entity-definition-is-keyed-by-the-entity-identifier`). Two actors that look
different therefore need two identifiers unless a render controller can choose between appearances
inside a single definition — and whether it can make that choice from an entity property a script
sets is not something the sources cover.

So `d-ipgh0g2d` takes the shape that needs no unknown: one shared component set, one identifier per
preset. Generating both the library's identifier constants and the pack's entity definitions from one
registry is what keeps them honest; two hand-maintained lists of the same strings drift.

If the property-driven render controller does turn out to work, this collapses to a single entity
type. That is a smaller change than it looks — the registry stays, the identifiers change — and it is
not worth blocking on.

## Why the assets are vendored rather than referenced

A custom client entity may name the game's own geometry, textures, and animations with nothing copied
(`a-custom-client-entity-may-reference-the-vanilla-packs-assets`), and for a one-off pack that is the
right answer. It is the wrong answer here for one reason: those identifiers are not a compatibility
surface. The evoker alone shows the hazard — it is registered as `minecraft:evocation_illager`, its
geometry is `geometry.evoker.v1.8`, and neither is spelled from the mob's common name
(`the-evoker-client-entity-names-its-geometry-texture-material-and-animations`). A rename in a game
update takes the wizard's face away with no build failure to announce it, and the server version is
pinned and bumped by automation.

Vendoring is available and legitimate: Mojang publishes the vanilla packs as files for exactly this
purpose, all rights reserved and governed by the EULA
(`mojang-publishes-the-vanilla-packs-with-all-rights-reserved-under-the-eula`). What that agreement
permits for a redistributed asset is not something the fact settles, and is not settled here — for a
family addon nobody publishes, it does not arise; before anything ships to strangers, it wants
reading properly.

Two mechanical points that came out of looking: vendored geometry must be re-identified rather than
shipped under the vanilla identifier it came with, and the evoker's *material* is not worth vendoring
— materials live in their own vanilla files and drag in more than they are worth, so `d-3ggbl0kl`
names a stock one.

## What the boundary probe settled

Two questions gated the shape of this increment, and the `cross-pack-probe` run answered both against
a real 1.26.43.1 server.

**An entity type crosses the boundary.** A consumer pack's script spawned the provider pack's entity,
read its `typeId` back, counted it in the dimension, and summoned another by command — and did so
whether or not a manifest dependency was declared. With the defining pack absent, the same call fails
at the identifier: `'probe:actor' is not a valid entity type`. So resolution turns on the defining
pack being *loaded* and on nothing else, which is what the split in `d-6jlj0rl2` needed.

**A script module does not.** Four static specifier shapes and a dynamic `import()` all fail with
`ReferenceError: Import [...] not found.`, and the importing pack's entry then does not run at all.
Every importer declared the manifest dependency, so a dependency opens no module path. Code is shared
at build time or not at all, which is `d-knzip5zc`'s npm route — now evidenced rather than assumed.

Two things the probe found that nobody asked it:

**A declared dependency activates the pack it names.** A world listing only the consumer loaded the
provider too, pulled in by the consumer's `dependencies` entry. So an adventure declaring the assets
pack does not also need the world's activation list to name it — which is most of why `d-7uvpewdk`
installs the assets pack once rather than bundling copies.

**An unsatisfiable dependency is not enforced.** With the depended-on pack absent, the dependent
loaded and ran normally; the only symptom was the entity type failing to resolve. The manifest is a
statement of intent, not a guarantee, and that is precisely what `d-xobjyw2e`'s per-call check exists
for.

## The invariant, and the half of it that cannot be checked

`r-9owgd93o` asks the library to refuse rather than half-work when its definitions are absent.
`EntityTypes.get(identifier)` is the right primitive: stable, and it returns `undefined` instead of
throwing, so the check needs no spawn attempt and no location made ticking first. `d-xobjyw2e` puts it
on every entry point rather than once at startup, because pack presence is a property of the world the
call runs against, not of the process.

The check reaches the behavior pack only. `@minecraft/server` exposes no way to observe whether a
*resource* pack is active — the script API is server-side and pack delivery to a client is not in it —
so a world holding the behavior pack alone spawns actors that behave correctly and render as whatever
the client does with an entity it has no definition for. `d-e4lx5lti` states that limit rather than
implying the check covers more than it does. If an API for it ever appears, the limit is worth
revisiting; nothing here depends on its absence being permanent.
