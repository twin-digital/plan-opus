# First-party evidence on pack layout (working notes)

Quotes gathered for ADDENDUM.md. Every entry is url + where + verbatim quote. Anything not found
is marked NOT FOUND rather than inferred.

## The pack is a folder whose only required file is its manifest

- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/comprehensivepackcontents
  where: intro, before "Comprehensive Behavior Pack"
  quote: "The only required file in either type of pack is **manifest.json**."
- same page, same section
  quote: "Minecraft Bedrock Edition can only use Add-On pack file contents if the file is the
  correct type (like .json, .png, .fsb), and if it is stored in a folder with a particular name,
  and if that folder is in the correct location."
- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/behaviorpack
  where: opening paragraph
  quote: "A **behavior pack** is a folder structure that contains files that drive entity
  behaviors, loot drops, spawn rules, items, recipes, and trade tables."

## Microsoft's own canonical project layout for an addon

- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/addondevelopmentworkflow
  where: "Step 1: Plan your project"
  quote (lead-in): "If you're doing it manually, here's a refresher on the organization you need:"
  quote (tree, abbreviated to its shape):
    my_addon/ ├── behavior_pack/ │ ├── manifest.json │ ├── pack_icon.png │ ├── blocks/ │ ├──
    entities/ │ ├── scripts/ │ │ └── main.js … ├── resource_pack/ │ ├── manifest.json │ ├──
    pack_icon.png │ ├── entity/ │ ├── models/ │ ├── textures/ … ├── README.md └── CHANGELOG.md

  Read: an addon project is one directory holding **`behavior_pack/` and `resource_pack/`
  siblings, each with its own `manifest.json` at its root**. Singular folder names, one of each.

## One folder per pack in the development pools; the folder name is free

- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/behaviorpackfromscratch
  where: "Create a folder"
  quote: "In this section, you will create a folder called **My_BEHAVIOR_Pack**. Well, actually
  you don't have to call it that. In fact, you can name this folder anything you want, but the
  other folders have to be named exactly like this tutorial says so that Minecraft knows where to
  look."
- same page, where: "Create the manifest file"
  quote: "Create a new document in your My_BEHAVIOR_Pack folder and name it **manifest.json**."
- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/gettingstarted
  where: "Development Packs"
  quote: "Use the **development_resource_packs** and **development_behavior_packs** folders for
  the Resource Pack and Behavior Pack tutorials. Development pack folders are updated each time
  Minecraft is launched, so you can quickly load and test the changes you made to their contents."

## Distribution formats

- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/minecraftfileextensions
  where: ".mcpack"
  quote: "A zipped resource or behavior pack that modifies Minecraft: Bedrock Edition, typically
  used to transfer resources between users."
- same page, where: ".mcaddon"
  quote: "A zip file that contains .mcpack or .mcworld files to modify Minecraft (Bedrock
  Edition); generally used to distribute Add-Ons to other users."

NOT FOUND: any first-party statement that an `.mcaddon` contains pack *subfolders* rather than
nested `.mcpack` files; any statement about what sits at the root of an `.mcpack`; any statement
that an `.mcaddon` carries a manifest of its own.

## Identity is per pack; there is no addon-level identity

- url: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest
  where: header table, uuid row
  quote: "This is a special type of identifier that uniquely identifies this pack from any other
  pack."
- same page, where: metadata table, product_type row
  quote: "This optional string is used to identify a targeted context for this pack. The only
  supported value is "addon", indicating this pack is intended to be added to players' worlds.
  Setting product_type to "addon" should not change how the pack functions in-game."

NOT FOUND: any addon-level manifest or addon-level uuid. The manifest reference documents only
format_version, header, modules, dependencies, capabilities, metadata (and preview settings).

## Pack-to-pack dependency is by exact uuid and exact version

- url: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest
  where: Properties table, dependencies row
  quote: "Section containing definitions for any other packs that are required in order for this
  manifest.json file to work."
- same page, where: dependencies table, uuid row
  quote: "This is the unique identifier of the pack that this pack depends on. It needs to be the
  exact same UUID that the pack has defined in the header section of its manifest file."
- same page, where: dependencies table, version row
  quote: "This is the specific version of the pack that your pack depends on. Should match the
  version the other pack has in its manifest file."
- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/behaviorpackfromscratch
  where: "Create the dependency"
  quote: "There is a third section in the behavior pack's manifest.json file called 'dependencies'
  that is used to create a link between a resource pack and a behavior pack. This link is created
  when the UUID located in the header section of the resource pack's manifest.json file is the
  same as the UUID in the dependencies section of the behavior pack's manifest.json file. You do
  not need to have a resource pack to use a behavior pack, and you do not need to have a behavior
  pack to use a resource pack. If you do have both, you can use this solution to link them
  together so that when you load a behavior pack into a world, it automatically loads and
  activates the linked resource pack."

## The dedicated server's pack folders

- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/getting-started
  where: "Running the server"
  quote: "**behavior_packs:** Behavior packs shared across all worlds on the server should be
  placed here." / "**resource_packs:** Resource packs shared across all worlds on the server
  should be placed here." / "While multiple worlds can be installed on the server, only one world
  is active at a time, set by the `level-name` property."
- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/createaworldtemplate
  where: "Variation: Add-On Packs"
  quote: "**world_behavior_packs.json** - Contains behavior pack ID and version" /
  "**world_resource_packs.json** - Contains resource pack ID and version"
- same page, same section (Important callout)
  quote: "Resource pack and behavior pack folder names in world templates must be **10 characters
  or shorter**. This is due to an issue on Xbox where long paths may cause resource or behavior
  packs to not load properly."

NOT FOUND: any first-party mention of `development_behavior_packs` on the *dedicated server*, and
no schema for `world_behavior_packs.json`. Both are covered by this design's own probes
(`artifacts/activation-list-probe/`, `artifacts/pack-layout/probe/`) instead.
