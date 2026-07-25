# Minecraft dev server

## Summary

This design is the harness a Bedrock pack author runs to iterate against a real, disposable
server: it owns the Docker Compose project the server runs in, the transport that gets built packs
into it, the reconcile that makes the server's pack state match the selected packs, and the watch
loop that repeats that reconcile on every save. What it produces is a command-line tool over a
small library — start the loop, edit a pack, see the change in-game a second or two later, close
the loop and leave the server up.

The problem it answers is that Bedrock has no hot-reload path for a workspace of packs. Reaching a
running world means three separate mechanisms — a pack pool the server reads from, a per-world
activation list, and an in-game reload — whose refresh costs differ sharply, so the harness's whole
job is telling the cheap change from the expensive one and paying only for what actually changed.
The constraint that shapes everything below is that the Docker engine may be on another host:
nothing may pass through a shared filesystem, so every byte and every command travels over the
Docker API.

## Open questions

```yaml
questions:
  - id: pack-set-entry-built-output-location
    question: >-
      under what field and type does a kit pack-set entry name the built output directory the
      harness copies from — which side applies the `dist/` default when a package names no
      alternate location, and is the built output per pack or per package, the kit allowing one
      pack of each kind in a package but placing "a pack's built output" at a single `dist/`?
    closes: fact
    gates:
      - packages-rebuild-and-the-harness-watches-built-output
      - activation-version-read-from-the-built-manifest
  - id: kit-build-invocation-in-watch-mode
    question: >-
      does the kit offer a way to run a package's build in watch mode, or does the harness spawn
      the package's own watch script directly?
    closes: fact
    gates: [packages-rebuild-and-the-harness-watches-built-output]
  - id: console-command-for-a-newly-pooled-pack
    question: >-
      does any console command — `/reload all` among them — bring a pack newly copied into the pool
      into the running world, or is a restart the only path?
    closes: fact
    gates: [live-reload-limited-to-active-behavior-pack-content]
```

## The server the harness runs

One dedicated server instance serves exactly one world, so there is a single unambiguous world
directory to write activation lists into and no addressing problem to solve
[[f:bedrock-server-hosts-one-world]] [[r:single-world-scope]]. The harness generates the Compose
project rather than shipping a static file, because the project has to name the pinned image, the
world's level name, and the volume together, and all three are harness-owned settings. The generated
file carries no variable references at all: Compose resolves a default env file from the compose
file's own directory rather than the working directory, and the invocation flag that would redirect
it also rebases every relative path in the file [[f:compose-env-file-not-loaded-from-cwd]], so
substituting at generation time removes a class of surprise instead of managing it
[[d:generated-compose-file-is-fully-resolved]].

The world is the expensive artifact and the container is not, which is why the server's data
directory is a named volume rather than anything host-side: the harness may not require a bind mount
at all [[r:remote-docker-supported]], and a volume survives the container restarts the reconcile rule
below spends freely [[d:world-state-lives-in-a-named-volume]]. Before the first deploy the harness
has to know the world is open, and the world load is also the moment the activation list takes effect
[[f:bedrock-activation-list-read-only-at-world-load]] — one log line therefore serves as both the
readiness gate and the check that the deploy landed, which holds only while the image whose wording
the harness matches is the one it runs [[d:server-image-pinned-with-console-helper]]
[[d:readiness-is-the-world-load-pack-stack-line]].

## Getting bytes and commands to the server

Copies over the Docker API need no mount and so work against a daemon on another host
[[f:compose-cp-copies-without-bind-mounts]], and the same is true of the console helper the pinned
image ships [[d:server-image-pinned-with-console-helper]], which takes a command with no interactive
session attached [[f:bedrock-image-exposes-a-noninteractive-console-helper]]. Those two calls are the
entire transport [[d:deploy-transport-is-cp-and-console-exec]].

Compose's own file-sync feature is the road not taken, and for a structural reason rather than a
version one: a watch rule's path must be literal, with globs and symlinks accepted at parse time and
then silently never syncing [[f:compose-watch-path-constraints]], so the set of packs would have to
be baked into the project file and the project regenerated and re-upped whenever a selection
changed — losing the running world on every selection edit.

## What the server should be holding

The workspace side of the problem is already answered upstream: the kit is imported and hands back
the pack set as data, deploying nothing itself [[f:dev-kit-delivers-a-validated-pack-set-as-data]]
[[r:packs-discovered-from-workspace]], and every entry already carries the owning package, the kind,
the source location, and the manifest-declared identity
[[f:dev-kit-pack-set-entry-names-package-kind-source-and-identity]]. So the harness computes what
the server should hold directly from that set and a selection over it, with the selection an
argument to the run [[r:hosted-packs-are-a-selection]] [[d:selection-is-flags-with-workspace-profiles]].
Identity collisions are not a case the harness handles, because a pack set that fails to resolve one
never reaches it [[f:dev-kit-rejects-a-pack-set-with-an-unresolved-identity]] — which matters
because the activation list is keyed on exactly that identity.

Desired state is therefore two things per kind: the pool contents, and the world's activation list
for that kind. An activation entry is the manifest header's uuid and its three-number version, both
of which must match the pack sitting in the pool — a module uuid or a stale version loads nothing
[[f:bedrock-activation-entry-is-header-uuid-and-version]]. The pack set carries
the identity but not that version, the kit declining to claim a pool version before a build
[[f:dev-kit-pack-set-entry-names-package-kind-source-and-identity]], so the harness reads it from the
manifest in the pack's built output — the same bytes the copy puts in the pool, which is what the
match is against [[d:activation-version-read-from-the-built-manifest]]; that output is the package's
`dist/` unless the package says otherwise [[f:dev-kit-pack-built-output-defaults-to-dist]]. Kind is
what routes a pack to its pool and its list, and the server will not catch a misrouted one: the Pack
Stack line names the behavior packs that loaded, says nothing about a pack that did not, and reads no
directory name as a declaration of kind
[[f:server-load-output-reports-only-activated-behavior-packs]] — the
argument for routing on the kit-reported kind rather than on anything inferred at deploy time.
Behavior packs are the required half and resource packs the optional one
[[r:behavior-packs-required-other-content-optional]]; carrying both costs one more pool and one more
list once kind is already a routing key [[d:both-pack-kinds-are-routed-by-declared-kind]].

## Reconcile, and what a change costs

Each reconcile reads the server's actual pool contents and activation lists back over the same exec
path the transport already uses rather than trusting a local record of the last deploy, so a
hand-edited container, a crash mid-copy, or a server the author left running from a previous session
all converge on the next save instead of drifting [[d:reconcile-reads-live-server-state]]. What that
read returns is which packs each pool holds and what each list names, never file content: a pack
whose built output changed is re-copied whole and reloaded rather than compared byte for byte
[[d:content-changes-are-recopied-not-compared]].

The diff is then classified rather than merely applied. A behavior pack's function and script files
reload into the running world in about a second and without disconnecting anyone, while a pack newly
added to the pool does not come in that way and a manifest change needs the world exited
[[f:bedrock-reload-updates-scripts-not-pool-or-manifest]]; the activation list is read once, at world
load, so any edit to it costs a restart outright
[[f:bedrock-activation-list-read-only-at-world-load]]. The cheap class is drawn conservatively around
exactly the case the evidence covers, and everything else — an added pack, a removed one, a version
bump, any resource-pack content, any activation-list edit — restarts
[[d:live-reload-limited-to-active-behavior-pack-content]]. Drawing it that way is what makes the
common case, editing a script in a pack that is already live, hit the few-second budget
[[r:edit-to-live-without-disconnect]]. A deselection is a removal the server must actually be taken
through, not merely a list the harness stops writing [[r:deploy-reconciles-to-built-packs]], so it
rewrites a list and pays the restart.

## The loop the author sees

One command goes from a clean checkout to a watched running server [[r:one-command-dev-loop]], and
the pieces of that are already placed: the packages build [[r:built-output-assembly-is-the-package-s-concern]],
and the harness brings the project up, waits for the world, and reconciles. What remains is who
watches what. A pack package watches its own sources and carries no deploy step
[[r:deployment-is-not-a-pack-concern]], so the harness starts each selected package's watch build and
then watches only the built output, treating a debounced change there as the trigger to reconcile
[[d:packages-rebuild-and-the-harness-watches-built-output]]. That keeps the harness ignorant of how
any pack is assembled and gives it one uniform signal to react to. Several packages rebuild at once,
so a line carries its own source — the package that emitted it, the harness, or the server — rather
than the author having to watch a channel per source
[[d:activity-and-server-output-share-one-tagged-stream]].

Because the server outlives the foreground loop [[r:server-lifecycle-outlives-the-foreground]],
Ctrl+C stops the watchers and the log follow and nothing else, and the stop verb is the only caller
of `down` — carrying with it the single flag that removes the world volume
[[d:command-surface-is-start-and-stop]] [[d:world-state-lives-in-a-named-volume]].

## Components

```yaml
components:
  - id: compose-project
    responsibility: generate the compose project — pinned image, level name, named volume, project identity
    excludes: invoking docker or knowing anything about packs
  - id: docker-adapter
    responsibility: typed wrapper over the compose invocations the harness uses — up, down, restart, cp, exec, logs
    excludes: any notion of packs, pools, or activation lists
    after: [compose-project]
  - id: server-layout
    responsibility: the one source of the server's on-disk layout — each kind's pool path, the world directory under the level name, and each kind's activation-list filename
    excludes: reading or writing anything on the server
  - id: server-control
    responsibility: readiness wait on the world-load line, console commands, restart, and the log stream
    excludes: deciding when a restart is needed
    after: [docker-adapter]
  - id: pack-selection
    responsibility: import the kit, take the pack set it returns, and resolve the selection flags and named profiles against it
    excludes: discovering or validating packs, which the kit performs
  - id: desired-state
    responsibility: map the selected packs to pool contents and per-kind activation-list entries, reading each pack's built manifest header for the version its entry carries
    excludes: reading or writing anything on the server
    after: [pack-selection, server-layout]
  - id: server-state-reader
    responsibility: read which packs each pool holds and what each activation list names — presence and identity only
    excludes: reading file content back, and interpreting the difference from desired state
    after: [docker-adapter, server-layout]
  - id: reconciler
    responsibility: diff desired against actual and classify each difference as live-reloadable or restart-forcing
    excludes: performing any copy, write, reload, or restart
    after: [desired-state, server-state-reader]
  - id: deploy-executor
    responsibility: apply a plan — copy packs, remove packs no longer selected, write activation lists, then reload or restart once
    excludes: choosing what goes in the plan
    after: [reconciler, server-control, server-layout]
  - id: session
    responsibility: the start sequence — generate the project, bring it up, wait for readiness, run the first reconcile — and the stop verb's teardown, volume removal under the reset flag included
    excludes: reacting to file changes, and classifying a diff
    after: [compose-project, server-control, deploy-executor]
  - id: watch-orchestrator
    responsibility: start each selected package's watch build, debounce built-output changes, and re-run the reconcile
    excludes: building a pack itself, and the start and stop sequences
    after: [session]
  - id: cli
    responsibility: the two verbs, their flags, signal handling, and the tagged output stream
    excludes: any deploy logic of its own
    after: [watch-orchestrator, session]
```
