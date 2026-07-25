# Minecraft dev server: Design Brief

The dev server is the harness a pack author runs to iterate on Bedrock packs against a real, disposable server. The daily feel it should produce: one command brings up a server and starts watching; you edit a pack's source, save, and the change is live in-game within a second or two without kicking anyone; you close the loop and the server keeps running so you can reattach. It is a developer-experience tool — nothing it does is shipped, and its only job is to make the edit→see cycle short and the throwaway cost low.

It exists because Bedrock offers no native hot-reload path for a workspace of packs. A pack must be copied into the server's `development_behavior_packs` pool, *activated* by a separate per-world list the server reads only at world load, and then reloaded in-game — and those three mechanisms have sharply different refresh semantics. Script and function edits go live; a pack newly added to the pool, or a change to the activation list, costs a restart. The harness's real work is telling the cheap change from the expensive one and paying only for what changed. Every transport choice is further constrained by the Docker engine possibly running on another host, so nothing may travel through a shared filesystem.

`minecraft/dev-kit` owns discovery, identification, and build: it answers which packs the workspace holds and hands back a validated pack set carrying each pack's identity, version, kind, directory, and owning package. This design consumes that set and owns everything downstream — the Compose project and volumes, readiness, pool routing by kind, activation lists, reconcile and diff, reload-versus-restart, watch orchestration, interleaved output, and the selection UX.

Which of the discovered packs a run hosts is an argument rather than a list, so reconcile matches the *selected* packs. Deselecting one is therefore a removal, and a removal rewrites the world's activation list — which costs a restart.

## What is still open

1. **The dependency on `minecraft/dev-kit` is not yet citable.** A cross-design dependency is a fact sourced by verbatim quote to the upstream design's published interface, and the kit has no `spec.md` yet. The fact this design will need must quote the fields of a pack-set entry and the guarantee that every entry names a directory whose root holds a `manifest.json` with a header uuid unique within the set. Until then the dependency lives only in this prose.
2. **Whether the harness deploys resource packs.** The two kinds have separate pools and separate world activation lists, and a pack misfiled between them fails silently, so supporting both turns kind-handling from a filter into a router.
3. **Which changes force a restart.** Scripts and functions reload live, and a new pack or an activation-list edit does not; the boundary between those is not fully established by evidence. `/reload all` is an untested middle option between a live reload and a container restart.
4. **Selection ergonomics** — how a selection is named on the command line, and where a persisted profile lives.
