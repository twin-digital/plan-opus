# rp-detection-probe

Can a behavior-pack script observe, server-side, whether a particular RESOURCE pack is active?
Bedrock dedicated server 1.26.43.1, `@minecraft/server` 2.0.0.

## Method

One behavior pack, held constant across three scenarios, reports every candidate signal through
`console.warn`. Only the resource-pack side varies.

| scenario | resource packs in `/data/development_resource_packs` | listed in `world_resource_packs.json` |
| --- | --- | --- |
| `ctrl` | none | none |
| `withrp` | `rp-assets`, `rp-script` | both |
| `poolonly` | `rp-assets`, `rp-script` | none |

`rp-assets` carries a client entity definition for `probe:boxed` pointing at a 320-block-cube
geometry, an animation whose timeline holds `/scriptevent probe:from_rp_animation fired`, a render
controller, a particle (`probe:rp_particle`), a `sound_definitions.json` entry (`probe.rp_sound`), a
fog definition (`probe:rp_fog`), a `structures/probe/rp_struct.mcstructure`, and a manifest
`settings` block. `rp-script` is a resource pack that additionally declares a `script` module and a
`data` module defining `probe:rp_only_entity` — testing whether a pack in the resource activation
list gets any server-side load at all.

The behavior pack defines `probe:boxed` (`minecraft:collision_box` 0.6 x 1.9) and `probe:unboxed`
(no collision box), plus `structures/probe/bp_struct.mcstructure` as a positive control for
`getPackStructureIds()`. It reports `getPackSettings()`, `getPackStructureIds()`,
`getWorldStructureIds()`, `structureManager.get()` for both structures, `EntityTypes.get()`,
`getAABB()`, `getHeadLocation()`, `hasComponent('minecraft:collision_box')`, `getComponents()`,
`playAnimation()` of the RP-only animation and of a nonexistent one, `/playsound`, `/particle`,
`/fog` and `/playanimation` each with a vanilla and a nonexistent control, eight argument forms of
`/packstack`, any received script events, and a world dynamic property that `rp-script` tries to set.
After each scenario the probe also runs `/packstack` from the server console via `send-command`,
where the command's chat output reaches `docker logs`.

## Result

**One signal works: `/packstack client`.** Every other signal — all of the script API surface — is
blind to the resource-pack side. Excluding the `packstack` lines, the `ctrl` and `withrp` report
blocks are byte-for-byte identical.

### The one positive: `/packstack client`

`/packstack` is documented as *"Prints client or server pack stack to chat"*, usage
`/packstack <stackType: stackType> [verbose: verbose] [exclude-vanilla: exclude-vanilla]`, permission
level Any, cheats not required
(<https://learn.microsoft.com/en-us/minecraft/creator/commands/commands/packstack>). It enumerates
the world's resource-pack stack, and its `successCount` counts the entries it printed:

| scenario | `runCommand('packstack client').successCount` |
| --- | --- |
| `ctrl` | 1 |
| `withrp` | **2** |
| `poolonly` | 1 |

From the server console the same command prints the identities, and `verbose` adds UUIDs:

```
withrp:  rp-detect assets (1.0.0)                 ctrl:  Minecraft Texture Pack (0.0.1)
         Minecraft Texture Pack (0.0.1)

withrp + verbose:  Pack Name: rp-detect assets
                   UUID: 5b2f0000-0000-4000-8000-000000000002
                   Type: Resources
                   Version: 1.0.0
```

Limits established here:

- **Script gets the count, never the identities.** `CommandResult` exposes only `successCount`
  (`cmd-packstack-result-keys={} own=` — no other own properties), and command output goes to
  chat/console, which no script API reads.
- **`exclude-vanilla` does not yield a clean zero.** It only parses in positional order after
  `verbose`; bare `packstack client exclude-vanilla`, `... true`, and `... false true` are all
  syntax errors, and `packstack client verbose exclude-vanilla` returns `successCount=1` in *both*
  `ctrl` and `withrp` — so it cannot be used as a 0/1 discriminator.
- `packstack server` returns 4 in every scenario (the behavior pack, two TS libraries, and the
  vanilla server pack) and is unaffected by the resource side.
- The command reports the **world's** resource stack as the server knows it, not what any particular
  connected client actually applied. Whether it can target a player is **untested** — no client.

### Everything else

- `getAABB()` is behavior-pack derived. `probe:boxed` extent `(0.3, 0.95, 0.3)` = the declared
  0.6 x 1.9; `probe:unboxed` extent `(0.3, 0.9, 0.3)` = the engine default 0.6 x 1.8. Unchanged by
  a resource pack whose geometry is a 320-block cube. `getHeadLocation()` delta likewise
  (1.6150 / 1.5300 in every scenario).
- `hasComponent('minecraft:collision_box')` is `false` even for the entity that declares one —
  collision box is not a script-visible component.
- `getPackStructureIds()` returns `probe:bp_struct` only. The resource pack's structure file is
  never enumerated and `structureManager.get('probe:rp_struct')` is `undefined`. The typings say so:
  *"Returns a list of all structures contained in behavior packs."*
- `getPackSettings()` returns `{}` in all three scenarios — including for the behavior pack's own
  declared setting. The control failed because custom pack settings require manifest
  `format_version` 3 with SemVer version strings and a `metadata/author` value, and the behavior-pack
  half is still experimental as of 1.21.110. It is a documented dead end regardless: *"Resource pack
  settings can be individually configured on a per-player basis"* and are readable only from Molang
  (`query.get_pack_setting`), while *"Within behavior packs, custom pack settings can be accessed via
  new world.getPackSettings() APIs"*
  (<https://learn.microsoft.com/en-us/minecraft/creator/documents/addons/custompacksettings>).
- A pack in the resource activation list gets **no** server-side load: `rp-script`'s script module
  is never evaluated (no `PROBE rp-script` line anywhere in the log), its data module's entity type
  stays `undefined`, and the dynamic property it tries to set stays `undefined`.
- The RP animation's `/scriptevent` timeline entry never fires: `scriptEvents=(none)`. Documented:
  *"In resource packs, timelines can only be used to run Molang code. In behavior animations, you can
  use this to run Molang code, commands, or trigger entity events."*
  (<https://learn.microsoft.com/en-us/minecraft/creator/documents/introductiontoaddentity>)
- `playAnimation()` never throws — not for the RP animation, not for
  `animation.probe.definitely_nonexistent`. No server-side validation of animation names.
- `/particle` and `/playanimation` report `successCount=1` for RP-defined, vanilla, and
  deliberately nonexistent identifiers alike. No server-side validation.
- `/playsound` and `/fog` are **untestable headless**: both require a player-type selector and fail
  at `Error occurred with parsing command params: Selector must be player-type` before the
  sound/fog identifier is ever looked at. Settling them needs a real client.
- The server logs a `Pack Stack` line for behavior packs only. Nothing in the startup log mentions
  resource packs in any scenario; the resource stack is reachable only by asking for it with
  `/packstack client`.
- A resource pack that declares `script` and `data` modules alongside its `resources` module fails to
  load entirely — `rp-script` never appears in `packstack client` output, so `withrp` counts 2 rather
  than 3. Declaring server-side modules in a resource pack does not smuggle a canary in; it breaks
  the pack.
- BDS `server.properties` carries `texturepack-required=false`, commented
  *"# Force clients to use texture packs in the current world"*. The property reference documents it
  as *"If the world uses specific texture packs, setting this to `true` forces the clients to use
  them."*
  (<https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/server-properties>).
  That is server-side *enforcement*, not something a script can read.

## Re-running

```sh
node evidence/minecraft/rpg-core/rp-detection-probe/probe.mjs        # tears down after itself
node evidence/minecraft/rpg-core/rp-detection-probe/probe.mjs --keep # leaves the container up
```

Needs a Docker daemon (`DOCKER_HOST` or the active context) and publishes no ports. Container and
volume are named `rpg-rpdetect-probe`. Around three minutes.

## Worth knowing before writing another probe

- **Both pools outlive the world.** `/data/development_resource_packs` needs the same `rm -rf` per
  scenario that the behavior pool does, or the previous scenario's resource packs leak in.
- **`/playsound` and `/fog` cannot be probed from a headless server.** The selector check runs
  first, so the identifier is never validated and the failure looks identical in every arrangement.
- **A `.mcstructure` positive control has to be a real NBT file.** `getPackStructureIds()` skips
  anything it cannot parse, so "the resource pack's structure is not listed" only means something
  once the byte-identical file in the behavior pack *is* listed. This probe writes little-endian
  NBT directly (`mcstructure()`).
- **`send-command` reaches the server console.** The `itzg` image ships `/usr/local/bin/send-command`,
  so `docker exec <container> send-command 'packstack client'` runs a command as console and its
  output lands in `docker logs` — the only way to read command output that a script cannot see.
- **`packstack`'s optional arguments are literal keywords in positional order.** `verbose` and
  `exclude-vanilla` are the tokens; `true`/`false` are syntax errors, and `exclude-vanilla` only
  parses when `verbose` precedes it.
- The traps documented in `../cross-pack-probe/NOTES.md` all still apply: `console.warn` plus
  `CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true`, no `say`, leave `ONLINE_MODE` alone, create a ticking
  area and wait ~200 ticks before spawning.
