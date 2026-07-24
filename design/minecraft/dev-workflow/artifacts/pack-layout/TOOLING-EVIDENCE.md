# Ecosystem tooling evidence (working notes)

What real tools expect on disk. Every entry is url + where + verbatim quote. Unverified items are
marked; nothing here is inferred and presented as sourced.

## Microsoft's own guidance contradicts itself on pack folder naming

**The hand-authored / Creator Tools shape — singular, scripts inside the pack:**

- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/addondevelopmentworkflow
  where: "Step 1: Plan your project"
  quote (shape of the tree): `my_addon/` ├── `behavior_pack/` (│ ├── `manifest.json`, │ ├──
  `scripts/` │ │ └── `main.js`) ├── `resource_pack/` (│ ├── `manifest.json`)

**The just-scripts starter shape — plural, named by project, scripts outside the pack:**

- url: https://github.com/microsoft/minecraft-scripting-samples/tree/main/ts-starter
  where: repository tree
  paths, verbatim: `ts-starter/scripts/main.ts`,
  `ts-starter/behavior_packs/starter/manifest.json`,
  `ts-starter/resource_packs/starter/manifest.json`, `ts-starter/just.config.ts`,
  `ts-starter/package.json`, `ts-starter/.env`
- url: https://github.com/microsoft/minecraft-scripting-samples/blob/main/ts-starter/just.config.ts
  where: `copyTaskOptions`
  quote:
  ```
  const copyTaskOptions: CopyTaskParameters = {
    copyToBehaviorPacks: [`./behavior_packs/${projectName}`],
    copyToScripts: ["./dist/scripts"],
    copyToResourcePacks: [`./resource_packs/${projectName}`],
  };
  ```
- url: https://github.com/microsoft/minecraft-scripting-samples/blob/main/ts-starter/README.md
  where: "Chapter 1. Customize the behavior pack"
  quote: "**PROJECT_NAME** is used as the folder name under all the assets are going to be
  deployed inside the game directories (e.g., development_behavior_packs\\**PROJECT_NAME**,
  development_resource_packs\\**PROJECT_NAME**)."

Both are Microsoft's. The only thing they agree on is that **a pack is a directory with
`manifest.json` at its root**, and that compiled scripts land inside the pack at `scripts/`.

## `@minecraft/core-build-tasks` hard-codes one deployed pack per project

- url: https://github.com/Mojang/minecraft-scripting-libraries/blob/main/tools/core-build-tasks/src/tasks/copy.ts
  where: constants and `copyTask`
  quote:
  ```
  const BehaviorPacksPath = 'development_behavior_packs';
  const ResourcePacksPath = 'development_resource_packs';
  ```
  and
  ```
  copyFiles(params.copyToBehaviorPacks, path.join(deploymentPath, BehaviorPacksPath, projectName));
  copyFiles(params.copyToScripts, path.join(deploymentPath, BehaviorPacksPath, projectName, 'scripts'));
  ```

Several source folders may be listed, but they are all copied into the *same*
`development_behavior_packs/<PROJECT_NAME>` directory — they merge into one pack. Producing two
packs needs two `PROJECT_NAME` values and two task chains.

- url: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/libraries
  where: "Core build tasks" → "Available tasks"
  quote: "**copyArtifacts**: copies resource and behavior packs to the local game development
  folder." … "**packBP**: creates an **.mcpack** file with your behavior packs." … "**packMcaddon**:
  creates an **.mcaddon** file with the packs previously created in packBP and packRP."

## Archive shapes, from the tool that builds them

- url: https://github.com/Mojang/minecraft-scripting-libraries/blob/main/tools/core-build-tasks/src/tasks/zip.ts
  where: `mcaddonTask`
  quote:
  ```
  const behaviorPackFile = path.join(targetFolder, `${outputFileName}_bp.mcpack`);
  const resourcePackFile = path.join(targetFolder, `${outputFileName}_rp.mcpack`);
  task('packBP', zipTask(behaviorPackFile, [
      { contents: params.copyToBehaviorPacks },
      { contents: params.copyToScripts, targetPath: 'scripts' },
  ]));
  task('packMcaddon', zipTask(params.outputFile, [mcaddonContents]));
  ```

Read: an `.mcpack` is a zip of one pack's contents with `manifest.json` at the archive root, and
the `.mcaddon` this tool produces holds the two `.mcpack` files as flat entries. First-party docs
agree at a coarser grain: ".mcaddon — A zip file that contains .mcpack or .mcworld files"
(https://learn.microsoft.com/en-us/minecraft/creator/documents/minecraftfileextensions, where
".mcaddon").

## The community standard makes multi-pack projects structurally impossible

- url: https://github.com/Bedrock-OSS/project-config-standard
  where: README — the `packs` field
  quote:
  ```
  packs: {
  	[
  		packId:
  			| 'behaviorPack'
  			| 'resourcePack'
  			| 'skinPack'
  			| 'worldTemplate'
  			| 'dataPack'
  	]: string
  }
  ```
  and: "The specification only handles the config.json file at the root of the project. The exact
  folder names of individual packs can change based on its content."

`packs` is keyed by pack *type*, one path per type: a second behavior pack has nowhere to go.

- url: https://regolith-docs.readthedocs.io/en/1.5.1/introduction/getting-started/
  where: "Creating a New Project"
  quote: "`packs/BP`: The folder for your behavior pack." / "`packs/RP`: The folder for your
  resource pack."
- url: https://github.com/Bedrock-OSS/regolith/blob/main/regolith/config.go
  where: the `Packs` struct
  quote:
  ```
  type Packs struct {
  	BehaviorFolder string `json:"behaviorPack,omitempty"`
  	ResourceFolder string `json:"resourcePack,omitempty"`
  }
  ```
- url: https://bridge-core.app/extensions/misc/pack-types.html
  where: "🔧 Pack Types" → Basics
  quote: "Each bridge. project can contain up to four different pack types."
- url: https://bridge-core.app/guide/index.html
  where: "Creating a project"
  quote: "In the project config you can modify the paths of the behavior pack, resource pack, skin
  pack and world template, with the packs property."

Regolith and bridge. both default to `BP/` and `RP/` (Regolith under `packs/`), and both let the
*paths* move while the pack-type keys stay fixed.

## Where the tools deploy to

- url: https://regolith-docs.readthedocs.io/en/1.5.0/project-configuration/export-targets/
  where: "Export Target Types"
  quote: "The `development` export target places compiled packs into the com.mojang
  `development_*_packs` folders for the specified Minecraft build" / "The `local` export target
  places compiled packs into a `build` folder within your Regolith project directory."
- url: https://bridge-core.app/guide/advanced/dash/index.html
  where: "Build Command"
  quote: "Build your project. Outputs to "builds/dist" folder within your project's root
  directory."

## Unverified

- **Blockbench**: no primary page reached with a quotable statement about imposed layout. It is an
  asset editor that exports into an existing pack folder, so it is unlikely to constrain a repo
  layout, but this is untested.
- **Whether any tool consumes a multi-pack workspace**: none found. Stated as a negative from a
  survey of Regolith, bridge., Dash, the Bedrock-OSS standard, core-build-tasks and Microsoft's
  samples — an absence of evidence, not a proof of absence.
