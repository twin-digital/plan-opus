# Minecraft dev server

> Harvested working draft from the unmerged branch `design/minecraft-dev-server` (tip c43cefe),
> copied as-is: its `[[r:...]]` and `[[f:...]]` tokens still name legacy slugs, its inline
> question and component blocks are the stranded cycle's, and nothing here is normative. This
> increment's `decisions.yaml` and `questions.yaml` re-enter its decisions and open questions
> under product ids (`drafts/harvest-map.md` holds the mapping); the product's fold outranks
> every claim in this draft.

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
      harness copies from, and does the kit resolve that location for a package that names an
      alternate one, or is applying the `dist/` default the consumer's job?
    closes: fact
    gates:
      - packages-rebuild-and-the-harness-watches-built-output
      - activation-version-read-from-the-built-manifest
  - id: built-output-is-per-pack-or-per-package
    question: >-
      is a built output directory per pack or per package? The kit allows one pack of each kind
      in a package while placing "a pack's built output" at a single `dist/`, so a package holding
      both kinds may leave the harness one directory where it expects two.
    closes: fact
    gates:
      - packages-rebuild-and-the-harness-watches-built-output
      - activation-version-read-from-the-built-manifest
  - id: kit-build-invocation
    question: >-
      how does the harness run a selected package's build — does the kit offer an invocation for
      the one-shot build and for the watch build, or does the harness spawn the package's own
      scripts directly?
    closes: fact
    gates:
      - packages-rebuild-and-the-harness-watches-built-output
      - start-builds-once-before-the-first-reconcile
  - id: activation-list-edit-without-a-restart
    question: >-
      does an edit to a world's activation list take effect without a server restart, and is the
      world directory the only place the list is read from? The probe behind
      f:bedrock-activation-list-read-only-at-world-load restarts between every list change and
      the prototype it also rests on wrote the list and restarted together, so no observation in
      hand separates a list edit from the restart beside it; the world directory is likewise only
      where the list was observed to work, not a place shown to be the only one. Closed by a probe
      that edits a list without restarting, or by a documented source.
    closes: fact
    gates: [live-reload-limited-to-active-behavior-pack-content]
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
has to know the world is open, and a fresh world load is also where a pooled pack's activation
becomes observable [[f:bedrock-activation-list-read-only-at-world-load]] — one log line therefore
serves as both the readiness gate and the check that the deploy landed, which holds only while the
image whose wording
the harness matches is the one it runs [[d:server-image-pinned-with-console-helper]]
[[d:readiness-is-the-world-load-pack-stack-line]].

## Getting bytes and commands to the server

The remote daemon [[r:remote-docker-supported]] leaves only calls that travel the Docker API, and
two of them cover everything the harness has to do to a running server: put bytes in
[[f:compose-cp-copies-without-bind-mounts]] and say something on its console
[[f:bedrock-image-exposes-a-noninteractive-console-helper]] [[d:server-image-pinned-with-console-helper]].
Nothing else is in the transport, so no third mechanism has to keep working against a remote host
[[d:deploy-transport-is-cp-and-console-exec]].

Compose's own file-sync feature is the road not taken: a watch rule's path must be literal, with
globs and symlinks accepted at parse time and then silently never syncing
[[f:compose-watch-path-constraints]], so the set of packs would have to
be baked into the project file and the project regenerated and re-upped whenever a selection
changed — losing the running world on every selection edit.

## What the server should be holding

The workspace side of the problem is already answered upstream, which is why nothing below discovers
a pack, validates one, or reads a manifest to route it: the harness computes what the server should
hold from the set the kit hands it and a selection over that set
[[f:dev-kit-delivers-a-validated-pack-set-as-data]]
[[f:dev-kit-pack-set-entry-names-package-kind-source-and-identity]]
[[r:packs-discovered-from-workspace]] — a repeatable `--pack` flag defaulting to every discovered
pack, and `--profile <name>` resolving to a list held in a checked-in workspace config file
[[r:hosted-packs-are-a-selection]] [[d:selection-is-flags-with-workspace-profiles]].

Desired state is therefore two things per kind: the pool contents, and the world's activation list
for that kind, whose entries must carry the manifest header's uuid and the header version of the
pack actually sitting in the pool [[f:bedrock-activation-entry-is-header-uuid-and-version]]. The
pack set carries the identity but not that version, the kit declining to claim a pool version before
a build [[f:dev-kit-pack-set-entry-names-package-kind-source-and-identity]], so the harness reads it
from the manifest in the pack's built output — the same bytes the copy puts in the pool, which is
what the match is against [[d:activation-version-read-from-the-built-manifest]] — a directory the
kit's default already names for a package that has not moved its output
[[f:dev-kit-pack-built-output-defaults-to-dist]], and an open question above for one that has.
Inside its kind's pool a pack occupies a directory named for its header uuid, safe as a name because
a set holding a missing or duplicated identity never reaches the harness
[[f:dev-kit-rejects-a-pack-set-with-an-unresolved-identity]] — and that name is the whole of what a
later read of the pool has to go on.

Kind is what routes a pack to its pool and its list, and it is the kind the kit reports that routes
it: the server reads no pool directory name as a declaration of kind, and it offers no diagnostic on
a misrouted pack either — the load output says nothing at all about a pack not on the Pack Stack
line, so a routing mistake has to be prevented rather than caught
[[f:server-load-output-reports-only-activated-behavior-packs]]
[[d:both-pack-kinds-are-routed-by-declared-kind]]. Carrying resource packs alongside behavior packs
then costs one more pool and one more list. A run that selects no resource pack at all is still a
complete run, so an empty resource pool and an empty resource list are a valid desired state rather
than a deploy the harness reports as incomplete
[[r:behavior-packs-required-other-content-optional]].

## Reconcile, and what a change costs

Each reconcile reads the server's actual pool contents and activation lists back over the same exec
path the transport already uses rather than trusting a local record of the last deploy, so a
hand-edited container, a crash mid-copy, or a server the author left running from a previous session
all converge on the next save instead of drifting [[d:reconcile-reads-live-server-state]]. That read
sees presence and identity only [[d:content-changes-are-recopied-not-compared]], so an edit inside a
pack already pooled and already listed leaves desired and actual state identical — the design's
common case is invisible to a diff of the two. The reconcile therefore takes a third input, the set
of packs whose built output changed: the watcher supplies it on every save and the start sequence
seeds it with every selected pack, so the first reconcile copies the whole selection and a later one
re-copies only what moved [[d:changed-pack-set-is-an-input-to-the-reconcile]]. That seam is what
keeps a reconcile with nothing changed a no-op [[r:deploy-reconciles-to-built-packs]].

The diff is then classified rather than merely applied. A behavior pack's function and script files
reload into the running world in about a second and without disconnecting anyone, while a pack newly
added to the pool does not come in that way and a manifest change needs the world exited
[[f:bedrock-reload-updates-scripts-not-pool-or-manifest]]; and a pooled pack does nothing until the
world's activation list names it [[f:bedrock-activation-list-read-only-at-world-load]], with no
observation in hand of a list edit landing without a restart beside it, so the harness prices every
list edit at a restart until the open question above settles otherwise. The cheap class is drawn
conservatively around exactly the case the evidence covers, and everything else — an added pack, a
removed one, a version bump, any resource-pack content, any activation-list edit — restarts
[[d:live-reload-limited-to-active-behavior-pack-content]]. Drawing it that way is what makes the
common case, editing a script in a pack that is already live, hit the few-second budget
[[r:edit-to-live-without-disconnect]]. A deselection is a removal the server must actually be taken
through, not merely a list the harness stops writing [[r:deploy-reconciles-to-built-packs]], so it
rewrites a list and pays the restart. Every restart the harness pays for is followed by the same
readiness wait the start sequence uses, and the pack stack that fresh load prints is read back as the
confirmation of what actually activated — it is the one line about activation the load output was
ever observed to carry [[f:server-load-output-reports-only-activated-behavior-packs]]
[[d:readiness-is-the-world-load-pack-stack-line]].

## The loop the author sees

One command goes from a clean checkout to a watched running server [[r:one-command-dev-loop]], where
nothing is built yet: until some build has run the first reconcile has nothing to copy and no built
manifest to read a version out of, which is what puts a build ahead of it in the start sequence
[[d:start-builds-once-before-the-first-reconcile]]. Which build that is stays the package's own
affair [[r:built-output-assembly-is-the-package-s-concern]]. After that the packages keep themselves
current: a pack package watches its own sources and carries no deploy step
[[r:deployment-is-not-a-pack-concern]], which leaves the harness watching built output rather than
sources — the one place a rebuild is visible without knowing how any package builds
[[d:packages-rebuild-and-the-harness-watches-built-output]]. That watch debounces globally rather
than per pack, so a save that rebuilds five packages costs one reconcile and one restart, not five;
a change arriving while a reconcile is in flight opens the next window instead of interrupting it,
and is reconciled once that one returns. Several packages emitting at once would otherwise leave the
author a channel per source to follow; one stream carrying a per-line source tag, owned by the
command line alone and written to by nothing else directly, is what collapses them
[[d:activity-and-server-output-share-one-tagged-stream]].

Because the server outlives the foreground loop [[r:server-lifecycle-outlives-the-foreground]],
Ctrl+C stops the watchers and the log follow and nothing else, and the stop verb is the only caller
of `down` — carrying with it the single flag that removes the world volume
[[d:command-surface-is-start-and-stop]] [[d:world-state-lives-in-a-named-volume]].

## Components

```yaml
components:
  - id: output-stream
    responsibility: the single tagged output stream — its sink, the source tag every line carries, and the writer handle each other component emits through
    excludes: deciding what any component prints, and the verbs, flags and signals the command line owns
  - id: workspace-config
    responsibility: the checked-in workspace config file — its path, its schema, and the defaults behind every value in it — read once and handed on as typed settings, the level name and the named profiles among them
    excludes: resolving a selection against the profiles it holds, and any knowledge of docker or packs
  - id: compose-project
    responsibility: generate the compose project — pinned image, level name, named volume, project identity
    excludes: invoking docker or knowing anything about packs
    after: [workspace-config]
  - id: docker-adapter
    responsibility: typed wrapper over the compose invocations the harness uses — up, down, restart, cp, exec, logs
    excludes: any notion of packs, pools, or activation lists
    after: [compose-project]
  - id: server-layout
    responsibility: the one source of the server's on-disk layout — each kind's pool path, the directory a pack occupies inside that pool (its header uuid), the world directory under the level name, and each kind's activation-list filename
    excludes: reading or writing anything on the server
    after: [workspace-config]
  - id: server-control
    responsibility: readiness wait on the world-load line, console commands, restart, and the container log stream emitted as `server`-tagged lines
    excludes: deciding when a restart is needed, and owning the output stream it emits into
    after: [docker-adapter, output-stream]
  - id: pack-selection
    responsibility: import the kit, take the pack set it returns, and resolve the selection flags and the profiles the workspace config names against it
    excludes: discovering or validating packs, which the kit performs
    after: [workspace-config]
  - id: pack-build
    responsibility: the one place a package's build is invoked — the one-shot run a caller waits on and the watch build a caller leaves running — with each build's output emitted as package-tagged lines
    excludes: deciding when a build runs, and any knowledge of pools, the server, or the reconcile
    after: [pack-selection, output-stream]
  - id: desired-state
    responsibility: map the selected packs to pool contents and per-kind activation-list entries, reading each pack's built manifest header for the version its entry carries
    excludes: reading or writing anything on the server
    after: [pack-selection, server-layout]
  - id: server-state-reader
    responsibility: read which packs each pool holds, keyed on the pool directory name the layout fixes, and what each activation list names — presence and identity only
    excludes: reading file content back, and interpreting the difference from desired state
    after: [docker-adapter, server-layout]
  - id: reconciler
    responsibility: diff desired against actual, take the changed-pack set as a third input, and classify each difference as live-reloadable or restart-forcing
    excludes: performing any copy, write, reload, or restart, and deciding which packs changed
    after: [desired-state, server-state-reader]
  - id: deploy-executor
    responsibility: apply a plan — copy packs, remove their pool directories when no longer selected, write activation lists, then reload or restart once, waiting for readiness after a restart and reporting the pack stack that load names
    excludes: choosing what goes in the plan
    after: [reconciler, server-control, server-layout, docker-adapter]
  - id: session
    responsibility: the start sequence — generate the project, bring it up, take every selected package through a one-shot build, wait for readiness, and run the first reconcile with every selected pack seeded as changed — and the stop verb's teardown, volume removal under the reset flag included
    excludes: invoking a build itself, reacting to file changes, and classifying a diff
    after: [compose-project, server-control, deploy-executor, pack-selection, pack-build]
  - id: watch-orchestrator
    responsibility: leave every selected package's watch build running, debounce built-output changes globally into one reconcile at a time, and re-run that reconcile with the packs that changed
    excludes: invoking or defining a build, the start and stop sequences, and owning the output stream its builds emit into
    after: [pack-build, reconciler, deploy-executor]
  - id: cli
    responsibility: the two verbs, their flags, and signal handling, holding the output stream open for the run's duration
    excludes: any deploy logic of its own
    after: [watch-orchestrator, session, output-stream]
```
