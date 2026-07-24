# Default `.env` resolution under `-f`

Environment: `docker compose version` v5.2.0. The probe substitutes
`MINECRAFT_SERVER_NAME` into `SERVER_NAME`, defaulting to `dev-behavior-packs`. A repo-root
`.env` containing `MINECRAFT_SERVER_NAME=envtest-probe` was placed in the cwd. `compose
config` resolves and prints the effective value. Outputs observed during the prototype
session:

```sh
# cwd holds .env (MINECRAFT_SERVER_NAME=envtest-probe); compose.yaml is elsewhere.

docker compose -f path/to/compose.yaml config | grep SERVER_NAME
#   SERVER_NAME: dev-behavior-packs        <- default; the cwd .env was NOT loaded

docker compose --project-directory . -f path/to/compose.yaml config | grep SERVER_NAME
#   SERVER_NAME: envtest-probe             <- .env loaded, but relative watch paths
#                                             then rebase under the project directory

docker compose -f path/to/compose.yaml --env-file .env config | grep SERVER_NAME
#   SERVER_NAME: envtest-probe             <- .env loaded; watch paths unaffected
```

Conclusion: with `-f <path>`, compose's default `.env` comes from the compose file's
directory, never the cwd. `--project-directory .` loads a cwd `.env` but also rebases
relative `develop.watch` paths; `--env-file .env` loads it without that side effect.
