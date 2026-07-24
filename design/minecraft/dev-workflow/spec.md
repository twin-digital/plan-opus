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

## Open questions

```yaml
questions:
  - id: activation-list-entry-shape
    question: what fields does an entry in a world's behavior-pack activation list carry, and where in a built pack does each come from?
    closes: fact
  - id: resource-packs-in-scope
    question: must the harness deploy and activate resource packs too, or are behavior packs the whole surface?
    closes: requirement
  - id: concurrent-dev-worlds
    question: does an author ever need two dev servers, and so two worlds, running at once?
    closes: requirement
    gates: [one-compose-project-one-world]
```

## The loop and its lifetime

The harness exposes two commands. The first is the whole loop — discover, build, start, deploy,
watch, stream [[r:one-command-dev-loop]] — and it is idempotent at every stage, so running it
against an already-running server reattaches rather than rebuilding the world. Everything it owns
in the foreground is disposable; the server and its world are not, which is why interrupting it
stops the builds, watchers, and log stream and nothing else, and why a separate command is what
stops the server [[r:server-lifecycle-outlives-the-foreground]] [[d:detach-on-interrupt-teardown-on-command]].
The stream the author reads is one interleaved channel: server console lines from the container's
logs, and build and deploy events from the harness, tagged by pack.

## Discovering and building packs

The pack set is whatever the workspace holds. Discovery enumerates the workspace's packages and
keeps those whose own `package.json` declares a pack type and a built-output directory
[[d:pack-declared-by-a-package-manifest-field]], so adding or renaming a pack is a change to that
package alone [[r:packs-discovered-from-workspace]]. A pack's contract stops at producing that
built output and watching its own sources [[r:deployment-is-not-a-pack-concern]]: the harness runs
each pack's declared build and watch scripts and then observes the output directories itself
[[d:watch-built-output-not-sources]], which keeps the trigger for a deploy — a changed artifact —
the same thing the deploy actually ships, and keeps every pack ignorant of the server.

Compose's own file-watching cannot stand in for that. Its watch rules take a literal directory
path that exists when the watcher starts; a glob or a symlinked directory is accepted and then
silently never syncs [[f:compose-watch-path-constraints]], so a watch-based deploy would need one
rule per pack generated ahead of time — the hand-maintained list the discovery requirement exists
to abolish — and the actions that would carry a reload alongside the copy gate on recent Compose
releases besides [[f:compose-watch-actions-and-versions]].

## Getting a pack onto the server

Deploy is therefore the harness's own push: copy the built pack into the container's development
pack pool over the Docker API [[d:push-deploy-over-compose-watch]]. That API transfer is what
makes a remote engine work at all, since it needs no bind mount and no shared path between host
and daemon [[f:compose-cp-copies-without-bind-mounts]] [[r:remote-docker-supported]]. The same
reasoning covers the server's own state: its data directory lives in a named volume rather than a
host directory [[d:server-data-in-a-named-volume]], and the world inside it is the single world
the server instance hosts, named by its level property [[f:bedrock-server-hosts-one-world]]
[[d:one-compose-project-one-world]] — which is what makes the activation list have exactly one
unambiguous destination.

## Reconciling to the built packs

One operation runs at startup and after every observed build, and it is a reconcile, not an
incremental patch [[r:deploy-reconciles-to-built-packs]]. It reads the current state from the
server itself — what sits in the pool, what the world's activation list names
[[d:server-is-the-deploy-state-of-record]] — because that is the state the server will actually
load, and it survives a container the author restarted or a deploy that died halfway. Comparing
built content against deployed content needs a cheap equality test that a directory listing cannot
give, so each deployed pack carries a stamp of the build it came from and reconcile compares
stamps [[d:deployed-pack-carries-a-content-stamp]]. The difference drives three actions: copy the
packs whose stamp differs or is missing, delete the pool directories no longer in the pack set,
and write the activation list so it names exactly the deployed packs — the last of these into the
world directory specifically, since a pack in the pool that the world does not list is not loaded
at all [[f:bedrock-activation-list-read-only-at-world-load]].

## Reload, and when a restart is the price

What a deploy costs depends on what changed. Script, function, and loot content goes live through
an in-game reload without dropping a connected client, while a pack that is new, renamed,
newly activated, or changed in its manifest or its entity, item, and block definitions is only
picked up when the server loads again [[f:bedrock-reload-updates-scripts-not-pool-or-manifest]].
Reconcile classifies its own diff on that line and restarts the container only for the second
class [[d:restart-only-for-identity-and-activation-changes]], which is what keeps the ordinary
case — an author editing a script and saving — inside the requirement's few seconds with nobody
kicked [[r:edit-to-live-without-disconnect]]. The reload itself is issued into the running
container through the server image's console helper [[d:reload-issued-through-the-container-console]],
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
    responsibility: wrap one compose project — up, down, restart, log stream, file copy, and console command — behind flag handling the rest of the harness never repeats
    excludes: any notion of packs, pools, or activation
  - id: deploy-reconciler
    responsibility: diff built packs against the server's pool and activation list, apply copies, deletions, and the activation list, and decide reload versus restart
    excludes: deciding when to run; it is called
    after: [pack-discovery, server-session]
  - id: dev-cli
    responsibility: the two commands, the startup sequence, signal handling, and the single interleaved output stream
    excludes: any deploy or build logic of its own
    after: [pack-build-runner, deploy-reconciler]
```
