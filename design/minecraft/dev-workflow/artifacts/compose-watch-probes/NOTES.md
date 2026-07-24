# Compose watch path probes

Environment: `docker compose version` v5.2.0, daemon 29.x. Outputs below were observed
during the prototype session and are faithful reconstructions for re-running.

## How to run each probe

```sh
docker compose -f <probe>.compose.yaml up -d
docker compose -f <probe>.compose.yaml watch --no-up &   # attach the watcher
# ...then create/modify the files under the watched path and inspect the container
docker compose -f <probe>.compose.yaml exec -T app sh -c '<inspect>'
docker compose -f <probe>.compose.yaml down
```

## dir-sync.compose.yaml — directory path, sync+exec → WORKS

Wrote/updated files under `./data`. Watcher logged:

```
Watch enabled
Syncing service "app" after 2 changes were detected
```

In-container inspection afterward: the files were present under `/synced` and the exec
command had run (`/tmp/exec-ran` existed). Directory `sync` and `sync+exec` both fire.

## glob-and-symlink.compose.yaml — glob path and symlinked dir → SILENTLY IGNORED

Modified files under `./packs-real/alpha/dist` and `./packs-real/beta/dist` (reached both
by the glob `./packs-real/*/dist` and by the symlinks `./links/{alpha,beta}`). The watcher
printed only `Watch enabled` and never a "Syncing" line. In-container:

```
find /globbed  -> No such file or directory
find /linked   -> No such file or directory
```

Neither target was ever created. No error was emitted for either rule.

## single-file.compose.yaml — single file path → NEVER FIRES

Created and then modified `./gen.json`. The watcher printed only `Watch enabled`; no
"Syncing" line appeared across multiple edits. In-container:

```
cat /tmp/gen.json  -> No such file or directory
ls  /tmp/exec2-ran -> No such file or directory
```

The file was never synced and the exec never ran. A watch `path` must be a directory that
exists when the watcher starts.
