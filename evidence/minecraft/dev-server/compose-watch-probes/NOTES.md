# Compose watch path probes

What `develop.watch` accepts as a rule `path`. `node run.mjs` drives four compose projects
against a real daemon and writes `OUTPUT.txt` beside itself — that file is captured stdout,
not a transcription. The run behind the committed `OUTPUT.txt` was Compose v5.2.0 against
Docker Engine 29.5.3 on a remote daemon (`DOCKER_HOST=ssh://…`), no bind mount.

Each case brings its project up, attaches `docker compose watch --no-up`, waits, writes files
under the watched path, waits again, then inspects the container with `find`. The scratch tree
each case needs (`data/`, `late/`, `packs-real/*/dist`, the `links/*` symlinks, `gen.json`) is
built and torn down by `run.mjs` under `work/`, so the committed inputs are the four compose
files and the script.

| case | path form | result |
|---|---|---|
| 1 | `./data`, a directory present when the watcher attaches, `sync+exec` | syncs; both files arrive and the exec ran |
| 2 | `./late`, a directory created **after** the watcher attaches, `sync` | syncs; both files arrive |
| 3 | `./packs-real/*/dist` (glob) and `./links` (symlinked dirs), `sync` | neither target is ever created; no error |
| 4 | `./gen.json`, a single file, `sync+exec` | syncs; the file arrives and the exec ran |

## What this establishes

- **A literal path syncs whether or not it exists when the watcher attaches** (cases 1 and 2),
  and a single-file path syncs too (case 4).
- **The glob form and a symlinked directory are silently ignored** (case 3): accepted at parse
  time, never synced, and no error is emitted either way. Compose therefore cannot discover
  packs on its own — each pack needs a literal path rule enumerated ahead of time.

## Two earlier claims this run overturns

An earlier version of these artifacts held reconstructed rather than captured output, and two
of its claims do not survive a real run on v5.2.0: that a watch `path` must name a directory
that exists when the watcher starts (case 2 disproves it), and that a single-file path never
fires (case 4 disproves it).

The watcher's own stdout is captured in `OUTPUT.txt` and is empty: `docker compose watch`
prints its "Syncing service …" progress only to a TTY, and `run.mjs` pipes it. What arrived in
the container is the evidence, and the `find` lines carry it.
