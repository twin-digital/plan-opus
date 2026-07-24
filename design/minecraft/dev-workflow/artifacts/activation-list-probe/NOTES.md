# Activation-list probe

Answers: what does an entry in a world's `world_behavior_packs.json` contain, and where in a
built pack does each field come from?

`node run.mjs` (with `docker compose up -d` already run) drives a real
`itzg/minecraft-bedrock-server` container and restarts it once per case, reporting the
`Pack Stack` line each world load emits. `OUTPUT.txt` is that run's captured stdout — not a
transcription — from Compose v5.2.0 against a remote daemon (`DOCKER_HOST=ssh://…`), so no
bind mount was involved.

Cases and results, all in `OUTPUT.txt`:

| activation list | Pack Stack |
|---|---|
| absent (pack in the pool only) | `None` |
| `pack_id` = manifest header uuid, `version` = header version | `[00] activation probe pack (id: b1a7d0c2-…, version: 1.0.0) @ development_behavior_packs/probe-pack` |
| `pack_id` = the data module's uuid | `None` |
| header uuid, `version` `[9,9,9]` | `None` |

A fresh world directory holds only `db`, `level.dat`, `level.dat_old`, `levelname.txt` — the
server neither creates the activation list nor rewrote the one the probe installed.
