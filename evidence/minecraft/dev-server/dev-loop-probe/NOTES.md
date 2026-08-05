# dev-loop probe — what it covers, and what it does not

`run.mjs` stands up one `itzg/minecraft-bedrock-server` container against a remote daemon and works
five groups of cases. Every pack carries a script module that logs a distinctive line when it
evaluates, so "is this pack live" is read off the console rather than inferred from silence — which
is what the earlier activation-list probe could not do.

`CONTENT_LOG_CONSOLE_OUTPUT_ENABLED` is what puts `[Scripting]` lines on the container's stdout.
Without it the console carries no script output at all, and every observation below is invisible.

## A — the version form

| case | pool `header.version` | activation entry | loaded |
|---|---|---|---|
| A1 | `[1,0,0]` (fv2) | `[1,0,0]` | yes |
| A2 | `"1.0.0"` (fv2) | `[1,0,0]` | yes |
| A3 | `"1.0.0"` (fv2) | `"1.0.0"` | yes |
| A4 | `"1.2.0-beta.1"` (fv2) | `[1,2,0]` | yes |
| A5 | `"1.2.0-beta.1"` (fv2) | `"1.2.0-beta.1"` | yes |
| A6 | `"1.0.0"` (fv3) | `[1,0,0]` | **no** |
| A7 | `"1.0.0"` (fv3) | `"1.0.0"` | **no** |

A SemVer-string header version loads, a pre-release loads, and an entry's form does not have to
match the header's. The Pack Stack line reports the pre-release spelling back verbatim.

A6 and A7 are a separate finding and a narrow one: a manifest **otherwise byte-identical to A3's**
but declaring `format_version` 3 did not load. That is not evidence that no `format_version` 3
manifest loads — the format may want a different shape that this probe did not write.

## B and C — what a reload does not do

An activation-list edit does not take effect without a restart (B2/B3: emptied while running, and
the pack was still in the stack until the restart). A pack newly copied into the pool and added to
the list does not come live on a reload either — C1 issued a reload with pack2 pooled and listed and
pack2's first-ever evaluation never logged; C2 restarted and it did. The reload acknowledges with
`Function and script files have been reloaded.` in both cases, so the command ran.

## E — what a reload does

E1 and E2 edited the entry file and an imported file and both re-evaluated on reload. The companion
`reload-detection-probe` settles this properly with a detector that survives a reload: a console
reload re-evaluates a loaded pack's script module against the current contents of its files,
whichever file changed.

Do not read this probe's B and C steps as bearing on that. They scored a reload by whether a
`console.warn` line reappeared, and that signal does not survive a reload — B1's silence says
nothing. What B and C do establish stands on the Pack Stack line instead: B2 and B3 show an
activation-list edit taking effect only at the next world load, and C1 and C2 show a newly pooled
pack needing a restart, because pack2's first-ever evaluation would have thrown its own lines and
did not.

## D — the resource-pack side

The image creates `/data/development_behavior_packs`, `/data/development_resource_packs`, and
`/data/development_skin_packs` before any deploy, and a world directory holding only `db`,
`level.dat`, `level.dat_old`, and `levelname.txt` — no activation list of either kind.

A resource pack deployed to `/data/development_resource_packs/<uuid>` and listed in
`<world>/world_resource_packs.json` with the same `{pack_id, version}` entry shape leaves that file
byte-identical across a world load. **Whether the resource pack actually activated is not
observable here**: the Pack Stack line names behavior packs only, and a resource pack has no script
to log with. D establishes the paths, the filename, and that the server does not rewrite the file —
nothing more.

## D2 — reading state back off the container

`docker compose cp bedrock:<path> <host path>` copies out to the host against this remote daemon,
and `exec ls` and `exec cat` both return pool contents and activation-list contents. The transport
reads in both directions with no bind mount.
