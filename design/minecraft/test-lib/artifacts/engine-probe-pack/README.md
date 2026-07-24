# mc-test-lib engine probes

A Bedrock behavior pack that answers the open questions in `../../spec.md` by observing the
real engine. Each probe is named after the question id it answers and emits observation lines
— it reports what the engine did rather than asserting what it should do.

## Install

1. Copy this folder into the world's or server's `behavior_packs/` directory (or import it via
   the usual pack tooling) and enable it on a world. No experiments are required: the script
   module targets stable `@minecraft/server` 2.8.0, so the world must be on a game version that
   ships it (any current stable release).
2. Cheats must be enabled (the command is registered at `GameDirectors` permission).

## Run

As a player in the world:

```
/mctest:run
```

or, from the server console / as a fallback (optionally naming a single probe):

```
/scriptevent mctest:run
/scriptevent mctest:run kill-cascade
```

The probes spawn a few sheep (and one arrow) near the triggering player, exercise them, and
remove them afterward. Output lines look like:

```
[mctest] kill-cascade :: first-kill return ok value=boolean:true sequence=[health(8->0), die(cause=none)]
```

Every line appears both in chat (`world.sendMessage`) and in the content log
(`console.warn`), so a dedicated server can collect them from the log file.

## Record the results

Copy the complete set of `[mctest]` lines into the design conversation (or a file under
`artifacts/`). Each question id in `spec.md`'s `questions` block maps to the probe of the same
name; its answer becomes a `facts.yaml` entry whose source cites this pack, the game/module
version the run used, and the observed lines — closing the question and settling or falsifying
the decisions it gates.

Caveats:

- The `/mctest:run` slash command and the scriptevent fallback are registered by the same
  script; if the custom-command registration fails on an older engine, the scriptevent path
  still works.
- Probes that wait on events sample after a few ticks; a lagging server can interleave
  unrelated damage (e.g. environmental) into a sequence — rerun in a flat, peaceful world if a
  sequence looks polluted.
- `death-invalidation-timing` intentionally leaves a corpse until despawn so the post-death
  validity window is observable.
