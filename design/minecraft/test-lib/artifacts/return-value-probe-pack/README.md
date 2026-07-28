# mc-test-lib return-value probes

A fourth Bedrock behavior pack for `minecraft/test-lib`. It answers what a call's **return value**
reports when the action does not land, and re-runs the no-health damage question in a form whose
subjects cannot consume each other.

It exists because `damage-threshold-probe-pack` produced two results that its own verdict strings
could not carry: `applyDamage` returned `true` after a cancelled before-event and again inside the
invulnerability window — in both cases with no damage dealt — and its no-health set scored two
invalidation-guard throws as contradictions of the damage ruling.

This pack uses the `mctest5:` namespace, so it coexists with the four earlier packs.

## Install

Copy this folder into the server's `development_behavior_packs/`, add it to
`world_behavior_packs.json` with uuid `9c4e1f7a-3b62-4d18-a5e0-7f2c8d4b6019` version `[0,1,0]`,
then restart — `/reload` will not register new commands. Confirm
`mc-test-lib return-value probes` in the boot `Pack Stack` lines before trusting a run.

## Run

Use a **stationary source well inside a ticking area** (an armor stand on solid ground). Probes
spawn subjects at offsets from the source rather than on top of it.

```
execute as <entity> run scriptevent mctest5:returns
execute as <entity> run scriptevent mctest5:nohealth
```

Neither set reads a player, so an armor-stand source covers both. Each takes well under a minute.

## What each probe answers

### `mctest5:returns`

| Probe | Question |
|---|---|
| `applydamage-return-semantics` | what the `applyDamage` boolean actually reports. The declared contract (`index.d.ts`) is "whether the entity takes any damage … can return false if the entity is invulnerable or if the damage applied is less than or equal to 0". Seven cases: amounts `-1`, `0`, `0.5`, `2`; a health-less subject; a cancelled before-event; and a second hit inside the invulnerability window. Every case reports the boolean **beside the health actually lost**, so "returned true" and "damage landed" stay separable |
| `explosion-cancel-return` | `dimension.createExplosion` is the third and last script-initiable cancellable call with a non-void return, so this completes the set the no-op ruling can be tested against. A witness sheep at the blast centre and the `explosion` after-event together say whether the explosion happened; `breaksBlocks:false` keeps the run from editing the world it is measured in |

### `mctest5:nohealth`

| Probe | Question |
|---|---|
| `damage-without-health-isolated` | the no-health damage question, isolated. **One freshly-spawned subject per call** rather than one shared between both argument forms, `isValid` re-checked immediately before each call, and subjects spread at offsets so neither the source nor a sibling is in the way |

## Reading the verdicts

`applydamage-return-semantics` — the two summary lines are the discriminators:

- `non-positive-amounts=[…]` — all `false` means the boolean carries the amount term as documented;
  all `true` means it reports only that the entity is damageable.
- `blocked-after-admission=[…]` — `returned true` with `landed false` contradicts the declared
  "whether the entity takes any damage", and locates the return value **before** cancellation and
  the invulnerability window are resolved.

`damage-without-health-isolated` — only `RETURNED-TRUE` counts against the no-op ruling:

| Verdict | Meaning |
|---|---|
| `SILENT-FALSE` | returned `false`, nothing happened — what the ruling predicts |
| `RETURNED-TRUE` | the ruling's falsifier |
| `SUBJECT-INVALIDATED-DURING-CALL` | the call threw `InvalidEntityError` — the validity guard, **not** a damage ruling |
| `SUBJECT-ALREADY-INVALID` | the subject was gone before the call; the case scores nothing |
| `CONTROL-HAS-HEALTH-RETURNED-TRUE` | the health-carrying control behaving correctly |

The control has its own vocabulary deliberately: in the earlier pack the sheep control was scored
`CONTRADICTS-SPEC-RETURNED-TRUE` for returning `true`, which is the correct behaviour for an entity
that has health.

## What a correct run looks like

- A `complete` line for the set, and no `:: PROBE CRASHED` line.
- `mctest5:returns`: the contract line, seven `applydamage-return-semantics` case lines, three or
  more `SUMMARY` lines, then two `explosion-cancel-return` case lines. The
  `control-no-cancel` explosion case must show `handler-notes=[handler-entered]` and
  `explosion-landed=true`; a control reading `BEFORE-EVENT-NOT-RAISED` means the engine does not
  raise `beforeEvents.explosion` for a script-driven call and the cancel case says nothing.
  The `amount=2-control` damage case must read `RETURNED-TRUE-AND-DAMAGE-LANDED`; without it the
  other six cases have no baseline.
- `mctest5:nohealth`: eight case lines (four types × two argument forms) and a `SUMMARY` block.
  Both control lines should read `CONTROL-HAS-HEALTH-RETURNED-TRUE`.

## Caveats

- **Explosions are real.** `breaksBlocks:false` and `causesFire:false` are set, but the blast still
  damages entities within radius 3 of the point 8 blocks from the source. Run it somewhere
  disposable.
- The invulnerability-window case depends on the priming hit and the measured hit falling inside
  the same window. The priming hit's own return value is emitted so a case where the window had
  already closed is visible rather than silent.
- Subjects are spread at fixed offsets from the source, so the source needs a few blocks of clear
  ground around it. On a small platform a subject can fall off; its `cascade` and health readings
  are still valid, but a falling subject may take unrelated damage.
