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

## Why this was probed rather than read

Documentation research was tried first and failed. Searching for the file and its fields returns
game-hosting knowledge-base articles (BisectHosting, Sparked Host, XGamingServer and similar),
which agree with each other and with the result above but are third-party support pages, not a
specification — and Microsoft's creator documentation covers add-on authoring and the
`manifest.json`, not the dedicated server's per-world activation file. Rather than quote a
support page as if it were authoritative, or paraphrase one, the claim was settled against a
real server. Anyone who later finds first-party documentation for this file should add it as a
second source on the fact.
