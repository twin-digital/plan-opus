# Minecraft Dev Workflow

## Summary

This design fixes the harness a pack author runs to iterate on Bedrock behavior packs against a
real, disposable server. Its product is a Node CLI and one Compose project: a single command
discovers every behavior pack in the workspace, builds them, brings the server up, deploys, and
then sits in the foreground streaming server output and deploy activity until the author walks
away — leaving the server up for the next session. The problem it answers is that Bedrock offers
no hot-reload path for a monorepo of packs: a deploy is three separate mechanisms — a pool of pack
directories, a per-world activation list, and an in-game reload — with sharply different refresh
semantics, so the harness's real work is telling the cheap change from the expensive one and
paying only for what changed. The constraint that shapes every transport choice below is that the
Docker engine may be on another host, so nothing may travel through a shared filesystem.

## The loop and its lifetime

The harness exposes two commands. The first is the whole loop — discover, build, start, deploy,
watch, stream [[r:one-command-dev-loop]] — and it is idempotent at every stage, so running it
against an already-running server reattaches rather than rebuilding the world. Everything it owns
in the foreground is disposable; the server and its world are not
[[r:server-lifecycle-outlives-the-foreground]] [[d:detach-on-interrupt-teardown-on-command]].
The stream the author reads is one interleaved channel: server console lines from the container's
logs, and build and deploy events from the harness, tagged by pack.

## Discovering and building packs

The pack set is whatever the workspace holds. Discovery enumerates the workspace's packages and
keeps those holding a committed pack manifest that names a header uuid and a script or data module
[[d:pack-identified-by-a-committed-behavior-manifest]], so adding or renaming a pack is a change to
that package alone [[r:packs-discovered-from-workspace]]. That rule is the one the monorepo
already runs on rather than a new marker to maintain — the tooling defines a pack by exactly this
file, and the other traits a pack carries are written *from* it
[[f:monorepo-defines-a-pack-by-a-committed-manifest]]. It is also the only candidate rule that is
both exact against the real workspace and independent of what the tooling generates: keying on a
Minecraft dependency or on where a package sits picks up the shared library and the harness itself
[[f:pack-detection-rules-scored-against-the-monorepo]]. The module-type test carries the scope
line: behavior packs are what the harness owes, other addon content is optional
[[r:behavior-packs-required-other-content-optional]], and a resource pack's manifest looks the same
until its modules are read — so reading them is what keeps one from being deployed into the
behavior pool rather than recognised and skipped. A manifest with no header uuid fails discovery
outright, since that uuid is what the activation list names
[[f:bedrock-activation-entry-is-header-uuid-and-version]]. The detection rules considered, their
measured scores, and why this one was chosen are kept beside the design in
`artifacts/pack-detection/ADDENDUM.md`. A pack's contract stops at producing that
built output and watching its own sources [[r:deployment-is-not-a-pack-concern]]: the harness runs
each pack's declared build and watch scripts and then observes the output directories itself
[[d:watch-built-output-not-sources]], which keeps the trigger for a deploy — a changed artifact —
the same thing the deploy actually ships, and keeps every pack ignorant of the server.

Compose's own file-watching cannot stand in for that. Its watch rules take a literal directory
path that exists when the watcher starts; a glob or a symlinked directory is accepted and then
silently never syncs [[f:compose-watch-path-constraints]], so a watch-based deploy would need one
rule per pack generated ahead of time — the hand-maintained list the discovery requirement exists
to abolish [[r:packs-discovered-from-workspace]].

## Getting a pack onto the server

Deploy is therefore the harness's own push: copy the built pack into the container's development
pack pool over the Docker API [[d:push-deploy-over-compose-watch]]. That API transfer is what
makes a remote engine work at all, since it needs no bind mount and no shared path between host
and daemon [[f:compose-cp-copies-without-bind-mounts]] [[r:remote-docker-supported]]. The same
reasoning covers the server's own state: its data directory lives in a named volume rather than a
host directory [[d:server-data-in-a-named-volume]], and the world inside it is the single world
the server instance hosts, named by its level property [[f:bedrock-server-hosts-one-world]]. One
world at a time is the harness's whole scope [[r:single-world-scope]], so the pair — one compose
project, one server — needs no arbitration between worlds, and the activation list has exactly one
unambiguous destination.

## Reconciling to the built packs

One operation runs at startup and after every observed build, and it is a reconcile, not an
incremental patch [[r:deploy-reconciles-to-built-packs]]. It reads the current state from the
server itself — what sits in the pool, what the world's activation list names
[[d:server-is-the-deploy-state-of-record]] — because that is the state the server will actually
load, and it survives a container the author restarted or a deploy that died halfway. Comparing
built content against deployed content needs a cheap equality test that a directory listing cannot
give, so each deployed pack carries a stamp of the build it came from and reconcile compares
stamps [[d:deployed-pack-carries-a-content-stamp]]. The stamp holds one hash per refresh class
rather than one for the pack, so a difference says which class changed and not merely that
something did — with one hash the classification below would need a host-side memory of the last
build, which reading state from the server forbids [[d:server-is-the-deploy-state-of-record]].
The difference drives three actions: replace the pool directory of every pack whose stamp differs
or is missing — removed first and then copied, because a copy into a surviving directory merges
and would leave behind files the build has since dropped, at the cost of one extra server
round-trip per changed pack — delete the pool directories no longer in the pack set, and write the
activation list so it names exactly the deployed packs, into the world directory specifically,
since a pack in the pool that the world does not list is not loaded at all
[[f:bedrock-activation-list-read-only-at-world-load]]. Each entry is read out of the built pack's
own manifest — the header uuid and the header version, the two fields an entry carries, both of
which must match the pack sitting in the pool [[f:bedrock-activation-entry-is-header-uuid-and-version]].
The built manifest, specifically: the committed one a pack is discovered by carries no version at
all, since the build injects it [[f:pack-version-comes-from-the-built-manifest]].
That the list is derived from the manifests every time, rather than amended in place, is what
keeps a mismatch from surviving a deploy: a wrong uuid or a stale version is not an error the
server reports, only a pack that silently fails to load.

On a fresh volume none of that can run yet: the world directory reconcile writes into, and the
console it later issues commands to, exist only after the server has booted and opened its world.
Startup therefore brings the server up, waits on the log stream for the world to open, and runs the
first reconcile only then — a run that finds an empty pool and no activation list at all, since
the server creates neither [[f:bedrock-activation-entry-is-header-uuid-and-version]], so it ends
in the restart that activating a pack costs anyway
[[f:bedrock-activation-list-read-only-at-world-load]].

## Reload, and when a restart is the price

What a deploy costs depends on what changed. Reconcile classifies its own diff on the line an
in-game reload draws [[f:bedrock-reload-updates-scripts-not-pool-or-manifest]] — with a newly
activated pack falling on the restart side of it [[f:bedrock-activation-list-read-only-at-world-load]],
and a bumped manifest version with it, since the activation list names the version a pack must
have [[f:bedrock-activation-entry-is-header-uuid-and-version]] — and restarts the container only for the restart class
[[d:restart-only-for-identity-and-activation-changes]], which is what keeps the ordinary
case — an author editing a script and saving — inside the requirement's few seconds with nobody
kicked [[r:edit-to-live-without-disconnect]]. The reload itself is issued into the running
container through the server image's console helper, which takes a command non-interactively over
the Docker API [[f:bedrock-image-exposes-a-noninteractive-console-helper]]
[[d:reload-issued-through-the-container-console]],
so the harness needs no in-game client and no network path to the server beyond the Docker API it
already uses. A restart is announced on the stream with the reason, because it is the expensive
outcome and the author should learn which edits cause it.

## Invoking compose

The harness always names its compose file explicitly, which moves default environment resolution
to that file's directory and leaves a repo-root env file unread; passing the project directory
would load it but also rebase relative paths, so the env file is named explicitly instead
[[f:compose-env-file-not-loaded-from-cwd]] [[d:compose-invoked-with-explicit-env-file]]. Every
compose invocation the harness makes — up, cp, exec, logs, restart, down — carries the same pair
of flags, built in one place.

## Components

```yaml
components:
  - id: pack-discovery
    responsibility: enumerate workspace packages and return the declared behavior packs with their build script, watch script, and output directory
    excludes: running any build or reading built output
  - id: pack-build-runner
    responsibility: run each pack's build and watch scripts, observe its output directory, and emit a debounced built-output-changed event per pack
    excludes: knowing that a server exists
    after: [pack-discovery]
  - id: server-session
    responsibility: wrap one compose project — up, down, restart, log stream, file copy, console command, and a world-opened readiness signal — behind flag handling the rest of the harness never repeats, and resolve from the project's env the level name and the in-container pool and world paths its callers address
    excludes: any notion of packs or activation-list content
  - id: deploy-reconciler
    responsibility: diff built packs against the server's pool and activation list, apply copies, deletions, and the activation list, and decide reload versus restart
    excludes: deciding when to run; it is called
    after: [pack-discovery, server-session]
  - id: dev-cli
    responsibility: the two commands, the startup sequence — up, wait for the world-opened signal, first reconcile, then watch — signal handling, and the single interleaved output stream
    excludes: any deploy or build logic of its own
    after: [pack-build-runner, deploy-reconciler]
```
