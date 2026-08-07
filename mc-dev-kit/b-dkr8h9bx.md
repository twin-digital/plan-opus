---
tags:
  - dev-loop
---

# a stub deploy is permanent: the reconcile compares file names, never content

When a pack's build fails, `minecraft-server` deploys a stub in its place and carries on, reporting
the pack in the world's pack stack:

    [deploy] @twin-digital/village-guard: nothing built at .../dist/behavior_pack; deployed as a stub

`stubPayload` puts that stub at the same paths the real bundle would occupy, deliberately — its own
comment says "the stub sits where the bundle will sit, so the first build that succeeds replaces it
without the pack's file set growing". But `planReconcile` compares presence, activation identity and
**file names only**; its doc comment states "no file's content is ever read back", and `changed` —
the set of packs a watcher saw rebuild — "at start nothing is named".

So a stub and a real bundle are indistinguishable to the planner, and a stub deployed once is never
replaced at any later start. Two further things close every escape:

- The pool lives on the Docker volume, which survives `stop`, `down` and container recreation, so
  the poisoned pack outlives the container that received it.
- A rebuild does not dislodge it either. `packBuild` rewrites only files that changed, so when the
  local output tree is already correct the build writes 0 files, the watcher observes no change, and
  no `changed` entry is produced. Deleting the pool directory by hand is the only escape.

Observed 2026-08-07: a build failure at 13:20 left a 78-byte stub in the pool; every run for the
next 90 minutes reported `Pack Stack - [00] village-guard` while the world ran a script that does
nothing. The owner connected, hit protected villagers, and killed one. The local build was correct
and 2192 bytes the whole time.

**The fix the owner proposes**: hash the deployed files in the container and compare against what
would be deployed, copying on any difference — content, not names. `sha256sum` is present in
`itzg/minecraft-bedrock-server` at `/usr/bin/sha256sum`, verified on the running image, so this is
one `compose exec` per reconcile. Weigh that against the round trip an exec costs over an `ssh://`
DOCKER_HOST, where the reconcile already makes several.

That also subsumes the narrower question of whether a failed build should deploy a stub at all: with
content compared, the next good build replaces it wherever it came from.
