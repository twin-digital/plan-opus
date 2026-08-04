# mc-test-lib engine probes

A Bedrock behavior pack that establishes the engine-run facts in `../../facts.yaml` by
observing the real engine. Each probe emits observation lines — it reports what the engine did
rather than asserting what it should do — and its output is transcribed into the facts that
source the fake's engine behaviour where the declarations are silent (`engine-claims-are-sourced`).

## Install

1. Copy this folder into the world's or server's `behavior_packs/` directory (or import it via
   the usual pack tooling) and enable it on a world. No experiments are required: the script
   module targets stable `@minecraft/server` 2.8.0, so the world must be on a game version that
   ships it (any current stable release).
2. Cheats must be enabled (the command is registered at `GameDirectors` permission).

## Run

There are three commands. `mctest:run` answers the original question set; `mctest:deep` runs the
follow-up probes that resolve the residuals the first run left open (the full effect-replacement
matrix, the complete member-by-member invalidation guard list, the kill edges, and the exact
after-event tick delay); `mctest:unload` covers the chunk-unload path. As a player in the world:

```
/mctest:run
/mctest:deep
/mctest:unload
```

or, from the server console / as a fallback (optionally naming a single probe):

```
/scriptevent mctest:run
/scriptevent mctest:deep
/scriptevent mctest:deep effect-replacement-matrix
/scriptevent mctest:unload
```

### `mctest:unload`

Every invalidation fact so far rests on `remove()`. Unloading is the other way a reference goes
stale, and `invalidation-is-modeled` names it, so this probe asks whether the two produce the same
observable state. It reads the five `Effect` members and the entity's own guard list with the
owner unloaded, against the loaded baseline it prints first.

A pack cannot force a chunk to unload, so the probe holds a chunk 20,000 blocks away with a
ticking area, spawns there, drops the area, and polls for up to 200 ticks. Two things to watch:

- **Run it from spawn and stay there.** Distance from every player is what makes the unload
  happen; following the entity keeps its chunk loaded and the probe reports
  `BUDGET EXHAUSTED`, which means inconclusive rather than "stayed valid".
- It needs cheats, like the others, since it drives `tickingarea` through `runCommand`.

If the unloaded reads match the removal reads, `effect-members-throw-plain-error` and
`invalidation-guard-list-complete` can drop the removal-only caveats they currently carry. If they
differ, that is a new fact.

The first run's results are recorded in `../mctest-engine-probe-results.md`; record the
`mctest:deep` output the same way. A probe measures what the engine does; whether the fake
should *match* that (versus keep a deliberate simplification, e.g. synchronous dispatch) is a
design decision the probe cannot make — see `modelled-behaviour-is-the-engines` and
`engine-claims-are-sourced` in `../../requirements.yaml`.

The probes spawn a few sheep (and one arrow) near the triggering player, exercise them, and
remove them afterward. Output lines look like:

```
[mctest] kill-cascade :: first-kill return ok value=boolean:true sequence=[health(8->0), die(cause=none)]
```

Every line appears both in chat (`world.sendMessage`) and in the content log
(`console.warn`), so a dedicated server can collect them from the log file.

## Record the results

Copy the complete set of `[mctest]` lines into the design conversation (or a file under
`artifacts/`). Each probe's observation becomes a `facts.yaml` entry whose source cites this
pack, the game/module version the run used, and the observed lines — the evidence the fidelity
requirement rests on.

Caveats:

- The `/mctest:run` slash command and the scriptevent fallback are registered by the same
  script; if the custom-command registration fails on an older engine, the scriptevent path
  still works.
- Probes that wait on events sample after a few ticks; a lagging server can interleave
  unrelated damage (e.g. environmental) into a sequence — rerun in a flat, peaceful world if a
  sequence looks polluted.
- `death-invalidation-timing` intentionally leaves a corpse until despawn so the post-death
  validity window is observable.
