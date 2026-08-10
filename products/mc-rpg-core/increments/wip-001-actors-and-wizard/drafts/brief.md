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

## What the two open questions gate

`q-cam2g9om` asks whether a script in one pack can spawn an entity another pack defines. Everything
here rests on yes. It is the kind of thing that is obviously true right up until it is not, and no
fact in the pool carries it.

`q-abwhpdno` asks whether a script module in one pack can import from another. The answer being *no*
is why `d-knzip5zc` sends the library through npm; if it is yes, run-time sharing is a real
alternative and the route deserves re-ruling.

One spike on the dev server answers both, and both should be answered before this lands.
