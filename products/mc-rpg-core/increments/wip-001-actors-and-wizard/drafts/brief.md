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
(`f-chuoflt8`). So the two clicks a player would use to talk
to a character are instead the two that rewrite and delete it. A character a child can rename or
remove by accident is not a character.

The dialogue that would have justified the entity is unreachable from creative anyway: both official
tutorials send the creator into survival or adventure before the conversation can be had
(`f-6k5bjmre`). Adventure mode would restore all of it, and costs
creative flight — a poor trade in a dimension you can fall out of.

And the scripting handle on an NPC's own name, skin, and scene is `EntityNpcComponent`, which is
documented for the experimental moniker alone and carries a pre-release caution
(`f-oiu8hp0g`). A product that means to stay on stable script modules
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

How the two reach a server is a separate question from how they are built, and it is settled further
down: an adventure's archive carries this product's packs with it (`d-hybkhum6`), which makes an install
one file rather than two things to keep in step.

## Why one identifier per preset

A client entity definition is addressed by identifier, and one identifier resolves to one appearance
definition (`f-09o4knzt`). Two actors that look
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
(`f-a7v7ex4x`), and for a one-off pack that is the
right answer. It is the wrong answer here for one reason: those identifiers are not a compatibility
surface. The evoker alone shows the hazard — it is registered as `minecraft:evocation_illager`, its
geometry is `geometry.evoker.v1.8`, and neither is spelled from the mob's common name
(`f-z999a7yv`). A rename in a game
update takes the wizard's face away with no build failure to announce it, and the server version is
pinned and bumped by automation.

Vendoring is available and legitimate: Mojang publishes the vanilla packs as files for exactly this
purpose, all rights reserved and governed by the EULA
(`f-ev10b68v`). What that agreement
permits for a redistributed asset is not something the fact settles, and is not settled here — for a
family addon nobody publishes, it does not arise; before anything ships to strangers, it wants
reading properly.

Two mechanical points that came out of looking: vendored geometry must be re-identified rather than
shipped under the vanilla identifier it came with, and the evoker's *material* is not worth vendoring
— materials live in their own vanilla files and drag in more than they are worth, so `d-3ggbl0kl`
names a stock one.

## What the boundary probe settled

Two questions gated the shape of this increment, and the `run-roqepx2c` run answered both against
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
provider too, pulled in by the consumer's `dependencies` entry. So an adventure declaring the assets pack
does not also need the world's activation list to name it — the pack has only to be in the pool, which is
what makes a bundled install work without an operator editing activation lists.

**An unsatisfiable dependency is not enforced.** With the depended-on pack absent, the dependent
loaded and ran normally; the only symptom was the entity type failing to resolve. The manifest is a
statement of intent, not a guarantee, and that is precisely what `d-xobjyw2e`'s per-call check exists
for.

## The invariant

`r-9owgd93o` asks the library to refuse rather than half-work when its definitions are absent.
`EntityTypes.get(identifier)` is the right primitive: stable, and it returns `undefined` instead of
throwing, so the check needs no spawn attempt and no location made ticking first. `d-xobjyw2e` puts it
on every entry point rather than once at startup, because pack presence is a property of the world the
call runs against, not of the process.

The check reaches the definitions and stops there. `@minecraft/server` carries no pack-presence member
at all — the only two "pack"-named things in its whole surface are `getPackStructureIds` and
`getPackSettings`, and neither reports what is active.

## The resource pack is not checked at run time

A count *is* available — `packstack client` run through `runCommand` returns a `successCount` that tracked
the client stack exactly across worlds differing only in their resource packs, 1 with none and 2 with one
active. It is a count and not a name: identities are printed to chat, which no script reads. A check built
on it would report a healthy world for any unrelated resource pack, so the owner ruled it not worth having,
and `d-bcybwddk` leaves the resource pack unchecked at run time rather than checked misleadingly. The fact
stays recorded because the *absence* of a name is the reason for the ruling.

Identity is therefore established where identity is checkable at all — the build (`d-ro5pj8er`). That is
the whole appearance guarantee, and `r-9owgd93o` now says in as many words that the library claims nothing
about whether an actor renders.

Three avenues that looked plausible and are closed, so nobody re-opens them:

- **The bounding box does not know.** An entity's server-side extent and head location come from its
  behavior definition; with a resource pack active whose geometry for it was a 320-block cube, every
  measurement was unchanged. `minecraft:collision_box` is a behavior-pack component and the client entity
  definition has no size field at all. (`hasComponent('minecraft:collision_box')` also reads false on an
  entity that declares one, so that is not a route either.)
- **A resource pack cannot carry a canary.** A pack declaring `resources` beside `script` and `data` and
  listed as a resource pack does not load at all — no stack entry, no script evaluation, and its entity
  type does not resolve. `getPackStructureIds` sees behavior-pack structures only, and an identical
  `.mcstructure` in a resource pack is never enumerated.
- **A resource-pack animation cannot fire a command.** In resource packs timelines run Molang only; a
  behavior animation's timeline is the one that may run commands or entity events.

## What a missing appearance actually looks like

The `run-1ga99sms` run put four actors side by side in front of a real client, identical in behaviour
and differing only in what the resource pack said about their appearance. The results are not symmetric,
and the asymmetry is the point:

- **No client entity at all** — the case a wholly absent resource pack produces — renders nothing, and
  the observer could not find it by looking *or* by pointing at where it stood. Silent and undetectable.
- **Unresolvable geometry** renders nothing either, but the entity is still there to the client: hovering
  over its position raises its name tag.
- **Unresolvable texture** is loud — the body renders in full, in the black-and-magenta missing-texture
  pattern.
- A complete definition renders correctly.

Name tags are not the safety net one might assume: on that client they appear only while the player is
hovering over an entity, never passively. So they cannot announce an actor a player is not already
pointing at.

This is why `d-ro5pj8er` is pinned. The failure the product must not ship is an adventure whose wizard
exists, behaves, and holds a conversation while being invisible and unfindable — and nothing at run time
can see it coming. A build-time pairing check is the only place that failure is preventable.

One thing left open: whether the no-client-entity actor was un-hoverable or merely hard to hover. It does
not change the conclusion, and closing it needs another pass with a deliberately oversized collision box.

Also still untested, and now much less interesting: whether `/playsound` or `/fog` fail differently for a
resource-pack-supplied identifier than for a bogus one. Both refuse at the selector before reaching the
identifier when no player is connected, and both need cheats, so neither is a foundation the library
could rest on.

## Why an adventure bundles the assets pack

Installing two things and keeping them in step is a worse burden than it looks for the audience here, so
an adventure's archive carries this product's packs with it (`d-hybkhum6`). Several adventures installed
together then each hold a copy, and that is safe: a pool holding several directories that declare one pack
uuid loads one of them silently — no error, one stack entry, and naming the uuid twice in a world's
activation list is absorbed too.

Which copy loads is chosen by the version the activation list names, not by which version is highest.
That much is deterministic. What is not is a pin the pool cannot satisfy: asked for a version no copy is,
the server loads a different one and says nothing — a silent substitution, and a substituted assets pack
presents as the invisible unfindable actor above.

So the question is not how to detect a substitution but how to stop two adventures ever contending for one
pack. `d-i8pjw2on` does that by putting the pack's **major version** into its uuid and into every name it
declares. Two adventures on one major then carry an identical pack, which the server deduplicates with no
effect on either, and two adventures on different majors carry packs sharing no uuid and no name at all.
Contention cannot arise, so `r-pop72yk6` — adventures built at different times coexisting, with nobody
choosing between them — holds by construction rather than by anyone's care.

The namespace has to cover every name kind, not just the entity identifier, because a resource pack's
internal names resolve across the whole pack stack rather than within their own pack. Namespace half of
them and two adventures' packs collide on the rest, which renders one adventure's actor with another's
geometry — a subtler fault than a missing pack, and a harder one to see.

The namespace does not have to be applied by a transform. Majors are rare, so the names can simply be
*authored* with the current major in them, and the build's job reduces to a lint that every declared name
carries it. That is a great deal less to get wrong than a rewrite: exhaustiveness stops being a property one
hopes a transform achieved and becomes a check that fails loudly when a new asset is added without its
namespace. `d-i8pjw2on` fixes that names carry the major, not how they come to.

`d-ny9lcyjg` bounds what the pack may hold, because not every resource-pack kind has a name to qualify.
Entity definitions, geometry, textures, materials, render controllers, animations, animation controllers,
particles, fogs and attachables all name what they declare, so the namespace reaches them — around eight
names for an actor with a model, a texture and animations, and file names are not among them since only the
identifier inside a file is referenced. Textures are the exception, addressed by path, so their location is
their name.

What the pack must stay out of is the kinds a resource pack supplies as a whole file — `blocks.json`,
`sounds.json`, `biomes_client.json`, the `texts` translation files, the `ui` tree. Those hold no name to
qualify, so two majors supplying one of them contend over the file and no namespace separates them. An actor
needs none, so the exclusion is free; it is recorded because a preset that later wants a custom sound event
would otherwise reintroduce the contention quietly.

Sharing within a major is only safe if a later release never withdraws what an earlier adventure names, so
`d-5f011w0o` holds the assets pack to adding within a major and has the build refuse a release that
removes. The compatibility surface this constrains is small: the set of actor identifiers, and nothing
else. Textures, models and animations are internal, so appearance may be fixed and improved freely — what
may not change is which characters exist and what they are.

That also settles what the runtime check needs to be. `d-xobjyw2e` already asks whether the specific entity
type a preset names resolves, which is the capability an adventure actually depends on; under an
additive-only major that question is both necessary and sufficient, and it beats asking after a version.

What none of it reaches is the resource pack, which no script can see. The two packs ship in one archive
and the build enforces the pairing (`d-ro5pj8er`), so correct definitions are strong evidence about
appearance without being proof of it.

## What a resource-pack dependency does and does not do

A behavior pack declaring a resource pack by uuid loads and runs perfectly well with that resource pack
absent from the pool: script evaluated, own entity type resolved, no dependency error logged. So the
manifest buys no enforcement, exactly as for a behavior-pack dependency.

What it does buy is activation. With the resource activation list *empty* and the pack merely present in
the pool, the client stack count matched the fully-listed control. So `world_resource_packs.json` need not
name a resource pack that an active behavior pack depends on — presence in the pool is the requirement.
That is what makes `d-hybkhum6` workable: an adventure's archive puts the assets pack in the pool, and
the adventure's own manifest dependency is enough to activate it — nobody has to edit a resource list.

