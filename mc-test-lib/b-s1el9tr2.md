# Spawn fully-formed vanilla entities from the vanilla behavior pack

`d-dapvwjwi` leaves a fake entity carrying only what a test seeded, so a test wanting a zombie that
reads like a zombie writes `['zombie', 'undead', 'monster', 'mob']` by hand, and the same for every
other definition-derived component. The feature is control-plane functions that spawn a fully-formed
entity of a built-in type — families first, but the same data carries health, movement, and the rest
of what a vanilla definition declares.

## The data is available and mechanically derivable

Mojang publishes the vanilla behavior pack at `Mojang/bedrock-samples` — `behavior_pack/entities/`
holds one JSON file per type, and the repo is tagged per release (`v1.26.40.05`, `v1.26.30.5`, …)
alongside a `preview` branch. `behavior_pack/entities/zombie.json` at `format_version 1.26.20`
carries:

    "minecraft:type_family": { "family": ["zombie", "undead", "monster", "mob"] }

So this is a build-time derivation from a versioned upstream, the same shape as the existing
`index.d.ts` generation (`d-tzww1yuv`) and the vanilla-id snapshot (`d-pf9sjbgg`) — not a
transcription job. Note the repo tags are Bedrock release versions, not `@minecraft/server` package
versions, so the pin would need its own mapping to `r-6oj56on1`'s 2.8.0.

## Licensing — the blocker to settle first

Not legal advice; a first-glance read that a lawyer should confirm before any of this ships.

`LICENSE.md` in that repo is the whole of it: "(c) Mojang AB. All rights reserved." plus "By
downloading the files in this repository, you agree to the Minecraft End User License Agreement and
that these files are subject to its terms." GitHub classifies the repo as `NOASSERTION`. So this is
not `@minecraft/vanilla-data`, which Mojang publishes to npm for creators to consume in code — it
is game content under the EULA, and downloading it is assent to a contract.

What the Minecraft Usage Guidelines say, verbatim, that bears on shipping a derived table:

- assets are defined as "the code, software, graphics, textures, images, models, sounds and other
  audio from any of our games"
- "Do not redistribute our games or any alterations of our games or game files"
- "Do not make commercial use or commercially exploit anything that we have made unless these
  guidelines say it's okay"
- and the definition that decides it: "commercial use means any uses of our name, brand, or assets
  that you use and share with others (regardless of whether you receive payment or provide it for
  free)"

The EULA adds: "don't distribute anything we've made unless we specifically agree to it", which it
expands as "give copies of our game software or content to anyone else". Its mod permission does not
reach this — a mod is "something original ... that doesn't contain a substantial part of our
copyrightable code or content", and a vanilla family table is their content, not ours.

First-glance sorting:

- **Likely not allowed without permission** — publishing a generated `vanilla-entities.json` inside
  the npm package. It is a straight derivation of their game files, "alterations of ... our game
  files" reads directly onto it, and the free-distribution clause closes the obvious escape.
- **Likely allowed** — shipping the *mechanism* with no data: a parser plus a build step the
  consumer runs against a copy of `bedrock-samples` they downloaded themselves, generating the table
  into their own project. Nothing of Mojang's is redistributed by us.
- **Likely allowed** — a handful of family strings a developer typed into their own test.
- **Worth a lawyer's read either way** — whether a list of family tokens is copyrightable at all
  (facts and thin compilations often are not), since the guidelines are contract terms that can bind
  where copyright would not reach.

The mechanism-only shape is the one that looks shippable, and it costs the consumer a download and a
build step.

## The open question this item carries

Does this land as a design change to `minecraft-test-lib`, or as a new package built on it?

`r-b92y0kb7` answers it as things stand: "A preset supplies only values a source pins; one needing
per-type vanilla data belongs to a package built on this one." Fully-formed vanilla entities are
per-type vanilla data by that sentence's plain reading, so today the answer is a new package. Making
it a change to this one means changing that requirement first, which is the owner's call and not an
agent's. Either route wants the licensing settled before design starts, since the mechanism-only
shape has a different surface from a data-shipping one.
