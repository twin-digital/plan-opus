# mc-test-lib access-guard probes

A Bedrock behavior pack for `minecraft/test-lib`, settling the two runtime questions the
TypeScript fake-shape spike (`../fake-shape-spike/`) raised about a proxy-based invalidation
guard.

A JavaScript `get` trap fires when a property is **accessed**. The engine may instead guard when a
method is **called**. Every previous sweep read properties and *called* methods, so the
accessed-but-not-called case has never been observed on the engine. This pack observes it.

This pack uses the `mctest6:` namespace, so it coexists with the five earlier packs.

## Install

Copy this folder into the server's `development_behavior_packs/`, add it to
`world_behavior_packs.json` with uuid `5cd5653c-fea6-4b32-935b-7a4972a82bd4` version `[0,1,0]`,
then restart — `/reload` will not register new commands. Confirm
`mc-test-lib access-guard probes` in the boot `Pack Stack` lines before trusting a run.

## Run

Use a **stationary source well inside a ticking area** (an armor stand on solid ground). Probes
spawn subjects at offsets from the source rather than on top of it.

```
execute as <entity> run scriptevent mctest6:access
execute as <entity> run scriptevent mctest6:shape
```

Neither set reads a player. `mctest6:access` takes roughly 15 seconds (about 70 spawns and 60
removals, spread across ticks); `mctest6:shape` takes a couple of seconds. Run each set three
times (**n = 3**) and record all three.

Single probes can be run alone by passing the probe id, e.g.
`scriptevent mctest6:access invalid-property-reads`.

## What each probe answers

### `mctest6:access`

| Probe | Question |
|---|---|
| `access-versus-call` | on an entity invalidated by `remove()`, does the guard fire on **access** or on the **call**? Fourteen `Entity` members (`kill`, `teleport`, `hasTag`, `getComponent`, `applyDamage`, `triggerEvent`, and eight zero-arg getters the earlier reflective sweep reached) × four orderings, each ordering on its own freshly invalidated subject, plus a valid control per member |
| `invalid-property-reads` | the same access syntax on a **property** rather than a method (`id`, `typeId`, `isValid`, `nameTag`, `location`, `dimension`), so "the guard fires on reads" and "the guard fires on reads of methods" stay separable |

The four orderings, each reported as its own verdict on its own line:

| Case | What it does |
|---|---|
| `1-access-only` | `const fn = subject.kill` and **nothing else**. The headline |
| `2-access-then-call` | takes the reference, then calls it — both `fn.call(subject, …)` and unbound `fn(…)` |
| `3-call-direct` | `subject.kill()` in one expression, as every earlier sweep did. The control ordering |
| `4-capture-valid-call-invalid` | reference taken while the entity is **valid**, entity removed, then called. Whether the guard is bound at access time or read at call time — the case the spike's closure bug turned on |

### `mctest6:shape`

| Probe | Question |
|---|---|
| `member-visibility` | what a pack doing feature detection sees: `'teleport' in e`, `'nameTag' in e`, `'notAMember' in e`; `Object.keys` and `Object.getOwnPropertyNames` counts and first keys; `for…in`; `typeof e.teleport` and `typeof e.notAMember`; `instanceof Entity`/`Player`/`Object`, `Entity.prototype.isPrototypeOf`, `constructor?.name` and the prototype chain; `JSON.stringify`, `String()`, spread. Read on a **valid** entity and on an **invalidated** one, spawned together |

## Reading the verdicts

### The headline: what case 1 decides

The proxy design puts a `get` trap on the fake that returns a thunk: accessing a member yields a
function, and the guard fires when that function is called.

- **`ACCESS-CLEAN` on every member** — the engine lets the bare property read through and raises
  `InvalidEntityError` only at the call. A `get` trap that returns a thunk **matches the engine**,
  and the proxy design is vindicated on this point.
- **`ACCESS-THREW` on any member** — the engine raises on the property read itself. A `get` trap
  that returns a thunk is then **more permissive than the engine**: a test that accesses a member
  of an invalidated entity passes against the fake and fails against the engine, which is the
  failure this library exists to prevent. The guard must fire **on access** instead, and the design
  has to change accordingly.

`SUMMARY HEADLINE access-only` carries the counts and names both member lists, so the answer is one
line. A split result — some members throwing on access and some not — is the third possibility and
the member lists are what say which is which.

Case 4 is a separate question with its own summary line: a member that **returns** when its
reference was captured while valid has a guard bound at access time; one that **throws** reads
validity at call time. Cases 2 and 3 bracket the two: they must agree with each other, and with the
earlier sweeps, or the run is suspect.

### Verdict vocabulary

| Verdict | Meaning |
|---|---|
| `ACCESS-THREW-INVALID-ENTITY` | the bare property read raised `InvalidEntityError` |
| `ACCESS-THREW-OTHER` | the read threw something else — read the message before treating it as a guard |
| `ACCESS-CLEAN-FUNCTION` | the read returned a function and did not throw |
| `ACCESS-CLEAN-UNDEFINED` | the read returned `undefined` — the member is not reachable at all on an invalidated entity |
| `<CASE>-THREW-INVALID-ENTITY` | the call reached the validity guard |
| `<CASE>-THREW-TYPE-ERROR` | rejected before the guard (argument count, or an unbound `this`) |
| `<CASE>-RETURNED` | the call returned on an invalidated entity |
| `NO-CALL-<access verdict>` | there was no function to call, because the access threw or yielded a non-function |

## What a correct run looks like

- A `complete` line for the set, and no `:: PROBE CRASHED` line.
- `mctest6:access`: 14 × 5 = 70 `access-versus-call` case lines (one `control-valid` and four
  numbered cases per member), six `invalid-property-reads` lines, and a `SUMMARY` block ending in
  the two `HEADLINE` lines.
- Every `[control-valid]` line must read `ACCESS-CLEAN-FUNCTION` and a `CONTROL-CALL-RETURNED`. A
  control that throws means the arguments were rejected, and that member's four subject cases say
  nothing about the guard.
- Every `[3-call-direct]` line should read `CALL-DIRECT-THREW-INVALID-ENTITY`; this is the ordering
  the earlier sweeps already established, so a disagreement here means the run itself is wrong.
- `mctest6:shape`: five lines for `[valid-control]` and five for `[invalidated-subject]`, then the
  two per-state `SUMMARY` rows and the comparison line.

Sample line shapes:

```
[mctest] access-versus-call :: [1-access-only] kill subject=-123 const fn = subject.kill (NOT called) ok typeof=function value=function(name="kill" length=0) verdict=ACCESS-CLEAN-FUNCTION
[mctest] access-versus-call :: [3-call-direct] kill subject=-124 subject.kill() threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true message="…" verdict=CALL-DIRECT-THREW-INVALID-ENTITY
[mctest] access-versus-call :: SUMMARY HEADLINE access-only ACCESS-THREW=0/14 ACCESS-CLEAN=14/14 threw=[] clean=[kill, teleport, …] — …
[mctest] member-visibility :: [invalidated-subject] in-operator 'teleport'=ok typeof=boolean value=boolean:true 'nameTag'=… 'notAMember'=…
```

The values above are line **shapes**, not results: nothing here is a prediction of what the engine
does.

## Where results go

Save the observed output as `../mctest-access-guard-probe-results.md`, following the structure the
existing results files use: a run-provenance table (date, server build, `@minecraft/server`
version, pack uuid, trigger, source location, coverage), the findings, run-validity notes, and the
raw `[mctest]` logs for all three runs of each set verbatim.

## Caveats

- **The source must be stationary and well inside a ticking area.** Subjects are spawned at offsets
  up to 6 blocks out and immediately removed; outside a ticking area the removal may not settle in
  the two ticks the probe waits, and every case downstream would read a still-valid entity.
- **`n = 3`.** One run establishes nothing; record three and compare the `SUMMARY` blocks.
- Case 4 spawns a subject, captures a method reference, then removes the subject. If `remove()`
  fails the case reads `SUBJECT-REMOVE-FAILED` and scores nothing.
- The `kill` and `applyDamage` controls damage and kill their own control sheep. That is the
  control working, not an accident.
- The `/mctest6:*` slash commands are registered but the `scriptevent` fallback is the exercised
  path, as with every earlier pack.
