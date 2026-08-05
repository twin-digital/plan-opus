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

E1 and E2 reproduce increment 007's result and sharpen it. With a pack whose entry imports a helper:
editing **only the entry file** re-evaluates on reload (E1), and editing **the imported file**
re-evaluates on reload (E2). Both within about two seconds, no restart, no world reload.

**The gap this probe leaves open.** A pack whose script module is a *single file with no imports*
did not re-evaluate on reload — the command acknowledged and nothing ran, twice, once inside this
probe's earlier shape and once in a standalone check that polled a full 60 seconds. E1 and E2 differ
from that case only in having an import. Whether the import graph is what matters, or whether
something else about those runs explains it, is **not established here**, and no case in this
probe's output isolates it.

That gap is the one worth closing before the dev loop's cheap path is designed around a reload: the
kit bundles a pack's script module to a single entry file with its imports inlined, which is
exactly the shape that did not re-evaluate.

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
