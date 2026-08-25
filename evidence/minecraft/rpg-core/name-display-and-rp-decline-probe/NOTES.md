# Name display and resource-pack decline — what was run

One client session on 2026-08-21 against a containerised Bedrock dedicated server 1.26.44.3,
answering two questions at once: `q-r7db9r31` (where a preset's default name can live) and
`q-zwn1at3x` (what a client that declines the resource-pack download sees).

The packs are increment 003's `name-display-probe` artifact, unmodified except for the header
version, which was bumped to bust the client's pack cache when a reading needed a fresh download
prompt. They were deployed in an adventure's own shape: the behavior pack activated in
`world_behavior_packs.json`, the resource pack in the server pool only with
`world_resource_packs.json` left empty, so the resource half is reached through the behavior
manifest's `dependencies` — the arrangement `d-x60dka1o` describes.

`compose.yaml` is the server. `TEXTUREPACK_REQUIRED` is the variable under test and must be set
there, not by editing `/data/server.properties`: the image rewrites that file from the environment
on every boot, so an in-container edit silently reverts before the server starts.

`OUTPUT.txt` is the server console for both readings, the `texturepack-required=false` run first.

## What the server console carries, and what it does not

The console carries the configuration each reading ran under, the pack stack, whether a connecting
player reached `Player Spawned`, and `testfor`/`querytarget` proof that all five probe entities
existed and stood within a few blocks of the player.

It does not carry what a plate reads or whether an entity is drawn. Both are client-rendered, and
`f:a-resource-pack-cannot-carry-anything-a-script-can-reach` settles that nothing server-side can
reach them. Those halves are the owner's, read at a Bedrock client and reported in the session that
recorded these facts.

## Readings

- **`texturepack-required=false`** — the client offers "Download everything and join" or "Join".
  Taking "Join" declines the pack; the join completes (`Player connected` then `Player Spawned`)
  and no probe entity is drawn.
- **`texturepack-required=true`** — the client offers "Download everything and join" or "Leave".
  There is no join-without-the-pack option; taking "Leave" returns to the server browser, and the
  console shows `Player connected` with no `Player Spawned`.
- **Name plates**, read with the pack accepted: `lang_only` and the `no_lang` control both show no
  plate; `lang_and_tag` shows `Literal Tag`; `tag_is_key` shows the literal key
  `entity.probe:tag_is_key.name`; `tag_is_rawtext` shows its literal rawtext JSON. The `.lang`
  files carry `Lang Only EN` and the like, so a resolved key would have read `Tag Is Key EN`.

The `texturepack-required=false` reading was run twice. Its console here is the second run; the
first was lost when the container was recreated to correct the environment variable.
