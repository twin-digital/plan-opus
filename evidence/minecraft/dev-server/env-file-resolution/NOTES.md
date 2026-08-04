# Default `.env` resolution under `-f`, and what `--project-directory` rebases

`node run.mjs` writes `OUTPUT.txt` beside itself — captured stdout, not a transcription. The
run behind the committed output was Compose v5.2.0. No daemon is needed: every case is
`docker compose config`, which resolves without starting anything.

The script builds a tree under `work/` with two distinct places a `.env` could sit: a cwd
(`run-from/`) and the compose file's own directory (`project/`). `compose.yaml` substitutes
`MINECRAFT_SERVER_NAME` into `SERVER_NAME` (default `dev-behavior-packs`), so the resolved
value names which `.env` was loaded — or neither. It also declares a relative `env_file`, a
relative volume `source`, and a relative `develop.watch` `path`, all pointing at `./svc-env`,
which exists in both directories with different contents; where each resolves shows what a
changed project directory moves.

Part A has a `.env` in both places; part B has one only in the cwd.

| invocation | `.env` loaded | relative `env_file`, volume source, watch path resolve against |
|---|---|---|
| `-f <path>` alone | the one beside the compose file; none if there is none there | the compose file's directory |
| `--project-directory .` | the cwd's | **the cwd** |
| `--env-file .env` | the cwd's | the compose file's directory |

## What this establishes

- With `-f <path>`, compose's default `.env` comes from the compose file's directory. Part A
  resolves `SERVER_NAME: beside-compose` even though a cwd `.env` also exists; part B, with no
  `.env` beside the compose file, falls through to the default rather than reaching into the
  cwd. A repo-root `.env` is ignored unless passed explicitly.
- `--project-directory .` loads the cwd `.env` **and** rebases every relative path in the
  compose file — `env_file`, volume `source`, and `develop.watch` `path` alike — onto the cwd.
  That is broader than watch paths alone.
- `--env-file .env` loads the cwd `.env` and leaves all three resolving against the compose
  file's directory. It is the option with no path side effect.
