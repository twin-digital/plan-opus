# Blind build plan — @twin-digital/minecraft-test-lib

Derived from brief + requirements (design & global) + decisions.yaml + cited facts ONLY.
`spec.md` not opened.

## 0. Package shape

- Name `@twin-digital/minecraft-test-lib`. ESM only (`"type": "module"`), TypeScript source,
  ships its own `.d.ts` (r:node-libraries-are-esm-typescript). Target active Node LTS.
- `"dependencies": {}`; `"peerDependencies": {"@minecraft/server": "2.8.0"}` — single peer, no
  runtime deps (d:test-lib-has-one-peer-dependency, r:target-server-version).
  [CHOSE] peer range spelled exactly `2.8.0` (decision says "pinned at 2.8.0 … declared as the
  peer range"), plus `peerDependenciesMeta` absent — the peer is required, because the fakes
  `implements MC.Entity` and need the types.
- `"exports": { ".": ... }` only — one entry point, no subpaths (d:one-public-entry-point).
- Dev-time only: `@minecraft/server` 2.8.0 as devDependency so the generator and typecheck can
  read `index.d.ts`.
- No test-framework dependency at runtime or in the published surface
  (r:no-test-framework-dependency). Own tests may use any runner; it is a devDependency.

## 1. Module layout

```
src/
  index.ts                 # the single barrel; re-exports everything public
  errors.ts                # InvalidEntityError, ArgumentOutOfBoundsError,
                           # InvalidArgumentError, NotImplementedError, UnsetValueError
  ids.ts                   # normalizeId(), ATTRIBUTE_COMPONENT_IDS literal array + check
  server.ts                # createServer(), the bundle type
  world/
    world.ts               # FakeWorld  (implements MC.World)
    dimension.ts           # FakeDimension
    scoreboard.ts          # FakeScoreboard, FakeScoreboardObjective, FakeScoreboardIdentity
    dynamic-properties.ts  # the shared dynamic-property store mixin
    output.ts              # the output log
  entity/
    entity.ts              # FakeEntity (implements MC.Entity), FakePlayer
    components.ts          # FakeEntityAttributeComponent + inert component
    effects.ts             # FakeEffect, FakeEffectType, the effect store, decay
    registry.ts            # per-bundle entity registry, id issuance, query matching
  events/
    signal.ts              # FakeEventSignal base (subscribe/unsubscribe, set-shaped)
    after-events.ts        # WorldAfterEvents — all 55 signals
    before-events.ts       # WorldBeforeEvents — all 13 signals
    dispatch.ts            # the cascade helpers + handler-error isolation
  system/
    system.ts              # FakeSystem, the schedule queue, currentTick
  registries.ts            # the 8 static registry classes, all throwing
  control/
    index.ts               # every exported free function (the "control plane")
  generated/               # NOT committed; emitted by the prebuild generator
    *.ts                   # class skeletons with guard prologues + NotImplementedError bodies
tools/
  generate.ts              # reads pinned index.d.ts + committed manifests, emits generated/
data/
  member-manifest.json     # committed: per-class member list, arity, guard verdict
  guard-table.json         # committed: transcribed invalidation guard observations
  effect-base-names.json   # committed: the 37 observed base names, verbatim
```

Rationale for the generated/hand-written split: d:fakes-are-generated-classes-with-guard-prologues
says exactly this — generator emits plain TS classes declaring `implements MC.Entity` and
siblings, each member carrying its own guard prologue then either a delegation to hand-written
behaviour or a `NotImplementedError` throw; manifests committed, generated output not.

[CHOSE] Generated classes delegate to hand-written behaviour objects rather than being
subclassed by hand: the generator emits `class FakeEntity implements MC.Entity` whose modelled
members call into `./behaviour/entity.js`. Alternative (generate an abstract base, hand-extend)
loses the `implements` check on the concrete type.

[CHOSE] prebuild wiring: `"prepare"`/`"prebuild"` runs `node tools/generate.js`; `generated/`
is gitignored. Falsifier 2 of that decision flags the contributor cost, but the decision is
accepted, so I build it.

## 2. Errors (`errors.ts`)

d:library-declares-its-error-classes — the library exports its own copies because
`@minecraft/server` ships no runtime JS (f:server-package-ships-types-only).

```ts
export class InvalidEntityError extends Error {
  readonly id: string;
  readonly type: string;
  constructor(id: string, type: string);
}
```
Shape from f:invalid-entity-error-shape (extends Error, `readonly id`, `readonly type`).
[CHOSE] `name = 'InvalidEntityError'`; message `Entity '${type}' with id '${id}' is invalid.`
[BLOCKED] the engine's *actual* message string for InvalidEntityError is not in any fact I have.
Decision says "matching the engine's declared shapes and messages" — I have messages for
`ArgumentOutOfBoundsError` and for the plain-`Error` cases, not for this one. Would have to ask
or probe.

```ts
export class ArgumentOutOfBoundsError extends Error {}
```
Message shapes are pinned by facts and differ per call site, so the class takes a prebuilt
message. Two shapes exist (f:addeffect-argument-bounds-observed):
- colon form: `Unsupported or out of bounds value passed to function argument [<i>]: <name>, Value: <v>, Argument bounds: [<min>, <max>]`
  — used by `setCurrentValue` (f:set-current-value-bounds-observed) and by `addEffect`'s
  amplifier.
- period form: `Unsupported or out of bounds value passed to function argument [<i>]. Value: <v>, Argument bounds: [<min>, <max>]`
  — used by `addEffect`'s duration.
[CHOSE] two factory helpers `outOfBoundsNamed(i, name, v, min, max)` and
`outOfBoundsUnnamed(i, v, min, max)` rather than one, because the two shapes are observed to
differ and r:modelled-behaviour-is-the-engines forbids smoothing them.

```ts
export class InvalidArgumentError extends Error {}   // engine-declared
export class NotImplementedError extends Error {}    // library's own
export class UnsetValueError extends Error {}        // library's own
```
- `NotImplementedError` — thrown by every unmodelled member (d:out-of-scope-members-throw-not-implemented,
  d:registries-are-declared-and-throw, d:entity-lookups-honour-a-filter-subset).
  [CHOSE] message `<Class>.<member> is not implemented by @twin-digital/minecraft-test-lib.`
  and carries `readonly member: string`.
- `UnsetValueError` — thrown by a read of a value the test never supplied and the engine could
  not lack (r:fakes-never-fabricate; d:custom-effect-display-name-is-supplied names it).
  [CHOSE] carries `readonly what: string`; message
  `Read of unset <what>. The engine always has a value here; supply one in the test.`
- The library also throws plain `Error` where the engine does — `Effect` members on a removed
  effect (f:effect-members-throw-plain-error, message `Failed to get property '<member>'.`),
  the attribute value getters and resets on an invalid owner (f:attribute-guard-classes-observed,
  `Failed to get property '<internal name>'.` / `Failed to call function '<name>'.`), and
  `world.getDimension` on an unknown id (f:get-dimension-unknown-id-error,
  `Dimension '<id>' is invalid.`).
- Arity failures throw the engine's `TypeError` with
  `Incorrect number of arguments to function. Expected <n>, received <m>`
  (f:arity-checked-before-validity-guard), before the guard prologue
  (d:generated-members-check-arity-before-the-guard).

Error taxonomy summary (what a test sees):
| condition | throw |
|---|---|
| member of an invalidated entity, guarded per table | `InvalidEntityError` |
| attribute getter/reset on invalid owner | plain `Error` |
| `Effect` member on removed effect / removed owner | plain `Error` |
| too few arguments | `TypeError` |
| out-of-range numeric argument | `ArgumentOutOfBoundsError` |
| bad id form (e.g. bare id to `triggerEvent`) | `InvalidArgumentError` |
| unmodelled member / unmodelled query field | `NotImplementedError` |
| read of a value the test never supplied | `UnsetValueError` |

## 3. Ids (`ids.ts`)

r:canonical-prefixed-storage + f:namespace-prefix-tolerance-is-per-surface.

```ts
export function normalizeId(id: string): string;   // 'sheep' -> 'minecraft:sheep'; passes through anything already namespaced
```
- Applied on entry to every id-taking input **where the engine accepts both**: `addEffect`,
  `getEffect`, `spawnEntity`, `getComponent`, `getDimension`, entity `typeId` at construction,
  query `type`/`excludeTypes`.
- NOT applied to `Entity.triggerEvent`, which rejects the bare form with `InvalidArgumentError`
  (d:trigger-event-requires-prefix-and-records, f:namespace-prefix-tolerance-is-per-surface).
- Stored and reported form is always prefixed.
- [CHOSE] "already namespaced" = contains a `:`. A `custom:thing` id passes through unchanged;
  only a bare id gains `minecraft:`.

```ts
export const ATTRIBUTE_COMPONENT_IDS = [
  'minecraft:health', 'minecraft:absorption', 'minecraft:lava_movement',
  'minecraft:movement', 'minecraft:underwater_movement', 'minecraft:follow_range',
  'minecraft:player.saturation', /* … */
] as const;
```
d:attribute-id-set-is-a-checked-literal-array: literal array maintained by hand, with the
type-derived union (conditional mapping over `EntityComponentTypeMap`,
f:component-ids-are-derivable-from-types) as a compile-time completeness check —
`const _check: Record<AttributeComponentId, true> = ...` both directions.
[BLOCKED] **I do not know the seven ids.** The facts tell me there *are* 7 attribute-shaped
components on 2.8.0 and that they are derivable from the type map; they do not name them. The
list above is a guess. I would derive it from `index.d.ts` — mechanical, but I cannot state the
literals here.

## 4. `createServer` and the bundle (`server.ts`)

d:server-bundle-mirrors-module-exports.

```ts
export interface FakeServer {
  world: MC.World;
  system: MC.System;
  BiomeTypes: typeof MC.BiomeTypes;
  BlockStates: typeof MC.BlockStates;
  BlockTypes: typeof MC.BlockTypes;
  DimensionTypes: typeof MC.DimensionTypes;
  EffectTypes: typeof MC.EffectTypes;
  EnchantmentTypes: typeof MC.EnchantmentTypes;
  EntityTypes: typeof MC.EntityTypes;
  ItemTypes: typeof MC.ItemTypes;
}

export function createServer(): FakeServer;
```
The eight registries are the ones f:engine-surface-outside-instances enumerates. Properties are
named as `@minecraft/server` exports them. This bundle is the only route to `system` and the
registries.
- All bundle state is instance-scoped; no module-level mutable state anywhere
  (r:instance-scoped-world). The generator must not emit module-level caches.
- [CHOSE] `createServer()` takes no options. Everything populated is a preset applied afterwards
  (r:no-implicit-defaults, r:presets-are-opt-in). A fresh server has: zero dimensions, zero
  entities, zero objectives, zero dynamic properties, empty output log, `currentTick` 0, no
  scheduled callbacks, no subscribers.
- [CHOSE] Presets are functions over the bundle, applied by the caller:
  `withVanillaDimensions(server)` returns the same server so they compose by nesting or chaining.

## 5. World (`world/world.ts`)

`FakeWorld implements MC.World`. Modelled members
(d:modelled-surface-is-world-entity-effect):

- `getDimension(id: string): MC.Dimension` — normalizes, looks up the registered dimensions,
  throws plain `Error` `Dimension '<id>' is invalid.` if unknown
  (f:get-dimension-unknown-id-error). Accepts the spaced alias `"the end"` once
  `withVanillaDimensions` is applied [CHOSE] (f:vanilla-dimensions-resolve-with-populated-fields
  records it; I model it as an alias on the overworld/end registration).
- `getAllPlayers(): MC.Player[]` — the registered players, creation order.
- `getEntity(id: string): MC.Entity | undefined` — by opaque id.
- `getPlayers(options?): MC.Player[]`, and the dimension's `getEntities(options?)` —
  registration (creation) order, honouring only `type`, `tags`, `name`, `excludeTypes`,
  `excludeTags`, `excludeNames`; each of the other eighteen `EntityQueryOptions` fields present
  in the argument throws `NotImplementedError` naming the field
  (d:entity-lookups-honour-a-filter-subset).
- `beforeEvents: MC.WorldBeforeEvents` (13 signals), `afterEvents: MC.WorldAfterEvents`
  (55 signals) — f:world-resting-state-observed pins those counts.
- `scoreboard: MC.Scoreboard` — real state (r:persisted-state-is-modeled).
- `sendMessage(message)` — recorded to the output log, not discarded (r:output-is-capturable).
- Dynamic properties: `getDynamicProperty`, `setDynamicProperty`, `getDynamicPropertyIds`,
  `getDynamicPropertyTotalByteCount`, `clearDynamicProperties` — real state.
  [CHOSE] `getDynamicPropertyTotalByteCount` computes a UTF-8 byte count over the stored values;
  it is a read the engine could not lack, and returning a value is better than throwing.
  Alternative would be `NotImplementedError`.
- `isHardcore` — [CHOSE] `false`, matching f:world-resting-state-observed's resting reading.
- `seed` — a **string** (f:world-resting-state-observed). [CHOSE] throws `UnsetValueError`
  until the test sets one, since the engine could not lack it and no source pins a value.
- `gameRules` — [BLOCKED] not named in any decision. I would [CHOSE] `NotImplementedError` on
  access, consistent with d:out-of-scope-members-throw-not-implemented, but the resting-state
  fact says it *is* an object, so a plain empty-ish object might be expected. Would ask.
- Every other `World` member: `NotImplementedError`.

### Dimension

`FakeDimension implements MC.Dimension`, modelled: `id`, `heightRange`, `getEntities`,
`getPlayers`, `spawnEntity`, `runCommand`? (no — unmodelled). `localizationKey` from the preset.
- `spawnEntity(typeId, location, options?)` — normalizes typeId, creates a `FakeEntity`,
  registers it, places it at **exactly** the requested location
  (d:placement-and-motion-are-literal; the boat's 0.2 offset,
  f:boat-spawn-offset-magnitude-constant, is a deliberate divergence), raises `entitySpawn`.

### Preset `withVanillaDimensions`

d:presets-are-vanilla-dimensions-and-spawn-frame. Registers the three vanilla dimensions with
the source-pinned values from f:vanilla-dimensions-resolve-with-populated-fields:

| id | heightRange | localizationKey |
|---|---|---|
| `minecraft:overworld` | −64 … 320 | `dimension.dimensionName0` |
| `minecraft:nether` | 0 … 128 | `dimension.dimensionName1` |
| `minecraft:the_end` | 0 … 256 | `dimension.dimensionName2` |

Resolvable from bare or prefixed spelling, plus `"the end"`.
[CHOSE] `heightRange` is a `MC.NumberRange` `{min, max}`.

### Scoreboard

`getObjectives()`, `getObjective(id)`, `addObjective(id, displayName?)`, `removeObjective`,
`getParticipants`, `setScore`, `getScore`, `addScore`, `removeParticipant`,
`getObjectiveAtDisplaySlot`/`setObjectiveAtDisplaySlot`/`clearObjectiveAtDisplaySlot`.
- Unknown objective or unknown participant reads `undefined`, does not throw
  (d:absence-reads-as-undefined).
- Empty at construction (r:no-implicit-defaults; f:world-resting-state-observed says empty is a
  real resting state, so this is not a fabrication).
- Entities carry `scoreboardIdentity`. [CHOSE] an identity is created lazily on first
  `setScore` against the entity, `undefined` before that — which also matches
  f:invalidation-guard-list-complete, where `scoreboardIdentity` reads `undefined` on a removed
  entity.

### Output log

d:output-log-record-shape.
```ts
type OutputRecord =
  | { kind: 'message';   value: MC.RawMessage | string }
  | { kind: 'title';     value: MC.RawMessage | string; options?: MC.TitleDisplayOptions }
  | { kind: 'subtitle';  value: MC.RawMessage | string }
  | { kind: 'actionBar'; value: MC.RawMessage | string };
```
Written by `World.sendMessage`, `Player.sendMessage`, `Player.onScreenDisplay.setTitle`,
`.updateSubtitle`, `.setActionBar`.
[CHOSE] the log is **per target** (one on the world, one per player), because the decision's
first falsifier says cross-target interleaving is what this shape cannot express — so the shape
as accepted is per-target.
Read via the control plane: `getOutput(target)`.

## 6. Entity (`entity/entity.ts`)

`FakeEntity implements MC.Entity`. Every member declared; every member either behaves or throws
(r:fakes-are-structurally-assignable). No fake-only members
(r:only-real-members-free-functions).

### Construction

Not a public constructor — a free function (r:only-real-members-free-functions: constructing
entities is a control-plane free function).
```ts
export interface CreateEntityOptions {
  id?: string;
  location?: MC.Vector3;
  dimension?: MC.Dimension;
  nameTag?: string;
  tags?: string[];
}
export function createEntity(server: FakeServer, typeId: string, options?: CreateEntityOptions): MC.Entity;
export function createPlayer(server: FakeServer, options?: CreatePlayerOptions & {name: string}): MC.Player;
```
- `typeId` required (r:ids-auto-assigned-typeid-required), normalized to prefixed.
- id auto-assigned: decimal string, sequential from `1`, per bundle, never reissued
  (d:entity-ids-are-sequential-opaque-strings). Caller may override at construction.
  Note this deliberately diverges from the engine's negative-integer spelling
  (f:entity-ids-not-reused), which is legal because `Entity.id` is documented opaque
  (f:entity-id-is-documented-opaque) — and the divergence still gets a coverage row.
- Nothing else populated (r:no-implicit-defaults): no components, no effects, no tags, no
  dynamic properties, `nameTag` unset, `location` unset, `dimension` unset.
  [CHOSE] "unset" for a scalar the engine could not lack ⇒ reading it throws `UnsetValueError`
  (`location`, `dimension`, `nameTag`, `localizationKey`). "Empty" for a collection ⇒ `getTags()`
  returns `[]`. This is exactly r:fakes-never-fabricate's split: absence the engine can exhibit
  reads back, absence it cannot fabricates and must throw.
- `isValid` is `true`.

### Preset `asSpawnedEntity`

d:presets-are-vanilla-dimensions-and-spawn-frame — only source-pinned spawn-frame values:
- `nameTag = ''` (f:fresh-entity-nametag-is-empty-string — universal across 8 types)
- `getRotation() = {x:0, y:0}`, `getVelocity() = {x:0,y:0,z:0}`
  (f:spawn-frame-kinematics-zero-except-xp-orb — 7 of 8 types; xp_orb excepted)
- `getTags() = []`, `isValid = true`
It does **not** supply components — a sheep's 14 components are per-type vanilla data and belong
to a package built on this one (r:presets-are-opt-in rationale, f:fresh-entity-is-never-component-empty).
It does not supply `localizationKey` [CHOSE] — that value is per-type (`entity.sheep.name`) and
therefore not source-pinned for an arbitrary type.
`asSpawnedEntity(entity)` returns the entity; composes with anything else.

### Identity & lifecycle

- `id`, `typeId` — always readable, even when invalid.
- `isValid` — readable when invalid, answers `false`.
- `scoreboardIdentity` — readable when invalid, reads `undefined`.
  (Those four are exactly the readable-when-invalid set, f:invalidation-guard-list-complete.)
- `remove()` — raises `entityRemove` and nothing else
  (d:remove-raises-only-entity-remove; deliberate divergence from
  f:kill-and-remove-cascades' observed five events). Marks the entity invalid.
  The `EntityRemoveAfterEvent` payload is `{removedEntityId: string, typeId: string}` and
  carries no entity reference (f:entity-remove-after-event-shape).
- `kill()` — [BLOCKED-ish, resolved by facts] fires the full cascade: `entityHurt` with damage
  equal to current health and cause `selfDestruct`, then `entityHealthChanged` to exactly the
  minimum, then `entityDie` with cause `selfDestruct`; returns `true`. A second `kill()` on the
  corpse returns `true` and fires nothing (f:kill-and-remove-cascades). On a health-less entity
  it returns `true`, fires only `entityDie` with cause `selfDestruct`, and the entity reads
  invalid immediately (f:kill-no-health-behaviour).
  [CHOSE] A killed *health-bearing* entity stays valid — the engine's 21-tick corpse window
  (f:corpse-invalidation-is-twenty-one-ticks) is real, but no decision models a timed
  invalidation, and r:scheduling-is-test-advanced says the library starts no timer. So I model
  the corpse as staying valid indefinitely and record a divergence coverage row. **This is a
  real judgement call I'd flag.**
- `triggerEvent(eventName)` — requires the prefixed id; bare form throws `InvalidArgumentError`;
  changes no state; records the call (d:trigger-event-requires-prefix-and-records).
  Read back through a free function `getTriggeredEvents(entity): string[]`.

### Invalidation

r:invalidation-is-modeled. Control plane free function:
```ts
export function invalidate(entity: MC.Entity): void;
```
Works on a reference the test already holds — invalidation flips a flag on the shared instance,
so any held reference sees it (mid-test transition).

Guard behaviour is a **per-member table transcribed from the observation**
(d:guard-list-comes-from-the-observation), committed as `data/guard-table.json`, not derived
from `@throws` annotations (which under-report, f:invalidation-guard-list-complete).
- All 16 properties and 46 methods of `Entity` accounted for: 4 properties readable
  (`id`, `isValid`, `typeId`, `scoreboardIdentity`), the other 12 throw `InvalidEntityError`,
  and **all 46 methods** throw `InvalidEntityError` when called with correct arity
  (f:invalidation-guard-covers-argument-taking-methods).
- The guard is on the **call, not the property read** for methods
  (f:invalidation-guard-fires-at-call-not-access): reading `entity.kill` off an invalidated
  entity returns a function; calling it throws. A reference captured while valid still throws
  when called later. So: methods are plain prototype methods that check validity in the
  prologue; guarded properties are getters that check in the getter.
- Arity is checked **before** the guard (d:generated-members-check-arity-before-the-guard,
  f:arity-checked-before-validity-guard): each generated member opens with
  `if (arguments.length < <declaredRequired>) throw new TypeError('Incorrect number of arguments to function. Expected <n>, received ' + arguments.length)`.
  No maximum is checked; extra arguments pass through.
- On attribute components the guard classes differ: the four value getters and the three resets
  throw a plain `Error`; `setCurrentValue` and `entity` throw `InvalidEntityError`; `isValid`
  and `typeId` stay readable (f:attribute-guard-classes-observed).
- [CHOSE] I do **not** model `f:unbound-native-method-raises-reference-error` (the
  `ReferenceError` for a receiver-less call) — a plain class method called unbound throws a
  different `TypeError`. Coverage row: divergence.
- [CHOSE] I do **not** model `f:entity-shape-is-identical-valid-or-invalid`'s exact own-property
  set (`Object.keys` → `["typeId","id"]`, `for-in` walking 62 keys). A generated class has
  different own-property/prototype shape. Coverage row: divergence.

### Components

- `getComponent(id)` / `getComponents()` / `hasComponent(id)` — normalize the id; absent
  component reads `undefined` (d:absence-reads-as-undefined). No component exists until added.
- Control-plane mutation (r:control-plane-component-mutation), free functions because the real
  API has no member for it (r:only-real-members-free-functions):
```ts
export function addComponent(entity: MC.Entity, componentId: string, state?: AttributeState): void;
export function removeComponent(entity: MC.Entity, componentId: string): void;
type AttributeState =
  | number                                       // shorthand: currentValue
  | [min: number, max: number]                   // shorthand: effectiveMin/effectiveMax
  | { currentValue?: number; defaultValue?: number; effectiveMin?: number; effectiveMax?: number };
```
d:component-state-is-the-attribute-four: the four attribute numbers or one of two shorthands;
any state argument against a non-attribute id is rejected with `InvalidArgumentError`; any
number omitted is left **unset**.
[CHOSE] the single-number shorthand means `currentValue`; the pair means `[effectiveMin, effectiveMax]`.
[CHOSE] reading an unset attribute number throws `UnsetValueError` — the engine's fresh entity
answers all four (f:fresh-health-component-values-populated), so `undefined` would fabricate.

- The **seven attribute-shaped components behave** (d:modelled-surface-is-world-entity-effect):
  `currentValue`, `defaultValue`, `effectiveMin`, `effectiveMax`, `setCurrentValue(v)`,
  `resetToDefaultValue()`, `resetToMaxValue()`, `resetToMinValue()`, plus `entity`, `typeId`,
  `isValid`, `static componentId`.
  - `setCurrentValue` accepts values exactly at `effectiveMin` and `effectiveMax`, throws
    `ArgumentOutOfBoundsError` outside them, message
    `Unsupported or out of bounds value passed to function argument [0]: value, Value: <v>, Argument bounds: [<min>, <max>]`
    (f:set-current-value-bounds-observed).
  - Every health write through the component fires `entityHealthChanged` and no `entityHurt`;
    a write reaching `effectiveMin` fires `entityDie` with cause `override`
    (f:component-health-writes-cascade, f:reaching-effective-minimum-is-fatal).
  - `resetToMinValue()` lands exactly at the minimum (f:health-not-clamped-at-minimum).
- **Every other entity component** carries only `typeId`, `isValid` and `entity`; every other
  member throws `NotImplementedError` (d:modelled-surface-is-world-entity-effect,
  d:out-of-scope-members-throw-not-implemented).

### Damage

`applyDamage(amount, options?): boolean`.
1. Arity check, then validity guard.
2. If no health component: change nothing, fire nothing, return `false`, entity stays valid
   (d:damage-without-health-is-a-no-op, f:damage-without-health-returns-false-silently).
3. Boolean is settled up front from admission: `amount <= 0` → `false`, take nothing
   (f:applydamage-boolean-reports-admission — `0` and `-1` false, `0.5` true and takes 0.5;
   damage is not integral).
4. Fire `entityHurt` **before**-event. Handler may write `.damage`; the write governs what the
   action does and what the after-event reports (d:before-event-field-writes-are-honoured,
   f:before-event-field-writes-take-effect). Handler may cancel; cancelled ⇒ no damage, but
   **returns `true`** (d:cancelled-actions-return-the-engines-value,
   f:cancelled-call-return-values-observed).
5. Write `currentValue -= damage`, **not clamped at the minimum** — it may go negative, and
   `entityHealthChanged` reports the negative value (f:health-not-clamped-at-minimum).
6. Cascade in order: `entityHurt` after → `entityHealthChanged` → `entityDie` if the write left
   `currentValue <= effectiveMin`, boundary included
   (d:killing-hit-lands-at-or-below-minimum, f:damage-cascade-order-and-payload).
   `entityHurt.damage` carries the requested (or handler-written) amount even when it exceeds
   remaining health.
7. Cause: no options ⇒ `none` (f:applydamage-cause-defaults). Projectile options form ⇒ cause
   `projectile` and the amount applied **verbatim**, not the engine's velocity-dependent
   adjustment (d:projectile-damage-is-verbatim — an explicit divergence).
8. [CHOSE] I do **not** model the invulnerability window
   (f:applydamage-boolean-reports-admission mentions it). No decision covers it; modelling a
   tick-based i-frame window under a test-advanced clock is scope I would not add. Coverage row:
   not modelled.

### Effects (`entity/effects.ts`)

- `addEffect(effectType, duration, options?): MC.Effect | undefined`
  - Returns the `Effect` on success, both for a new effect and an update
    (f:addeffect-returns-the-effect).
  - Bounds: amplifier `0…255`, duration `1…20000000`; outside ⇒ `ArgumentOutOfBoundsError`
    with the two distinct message shapes (f:addeffect-argument-bounds-observed):
    amplifier is argument `[2]` named form, duration argument `[1]` unnamed form.
    A duration beyond int32 reports against `[-2147483648, 2147483647]`.
  - Non-integer amplifier/duration truncate toward zero, then bounds-check the truncated value:
    `0.5` duration is *rejected* (truncates to 0); `1.5` accepted as `1`
    (f:addeffect-coerces-non-integer-arguments). `NaN`/`Infinity` ⇒ `TypeError`.
  - Amplifier defaults to `0` (f:effect-amplifier-defaults-to-zero).
  - Replacement rule: replaces iff higher amplifier, or equal amplifier and longer duration —
    compared against the duration **remaining**, not originally applied
    (f:effect-replacement-rule-observed, f:effect-replacement-compares-remaining-duration).
    Lower amplifier never replaces.
  - Before-event `effectAdd` is cancellable and its `duration` field is honoured
    (d:before-event-field-writes-are-honoured). Cancelled ⇒ returns `undefined`
    (d:cancelled-actions-return-the-engines-value).
  - Id normalized to prefixed (bare accepted, f:namespace-prefix-tolerance-is-per-surface).
- `getEffect(id)` → `Effect | undefined`; `getEffects()` → all live effects; `removeEffect(id)`.
- **Decay** (d:effect-durations-decay-on-the-advance-clock, accepted): duration decreases by 1
  per advanced tick (`decayPerTick=1`, f:effect-replacement-compares-remaining-duration) and
  never otherwise. Within each tick of an advance, **decay runs before that tick's scheduled
  callbacks**, so a callback reads the duration for the tick it is on, and an effect that runs
  out partway through a multi-tick advance is gone for the remaining ticks' callbacks.
- **Expiry** (d:effect-expiry-is-the-librarys-own, tolerated): removed on the tick its duration
  reaches 0 — never readable at 0, `getEffect` `undefined`, absent from `getEffects()`, the
  handle left as `removeEffect` leaves one — and **dispatches nothing** (2.8.0 declares no
  effect-remove or effect-expire signal). Stated as the library's own rule; no divergence
  claimed.
- `Effect` members on a removed effect (or one whose owner was removed): `amplifier`,
  `duration`, `typeId`, `displayName` throw a **plain `Error`** `Failed to get property '<member>'.`;
  `isValid` stays readable and answers `false` (f:effect-members-throw-plain-error).
- `displayName` (d:display-names-resolve-from-a-shipped-table, accepted): resolves with **no
  test setup**, from a shipped table of the **37 observed base names stored verbatim** — including
  `minecraft:breath_of_the_nautilus`'s leading space (f:effect-display-name-carries-raw-whitespace)
  — plus the observed numeral mapping computed over the amplifier:
  - amplifier 0 → bare base name
  - amplifiers 1–5 → base + ` ` + roman(amplifier + 1) → `II`…`VI`
  - amplifier ≥ 6 → bare base name again
  (f:effect-display-name-amplifier-mapping).
- `registerEffectBaseName(server, effectTypeId, baseName)` — control-plane free function
  supplying a base for a custom type or overriding a shipped one. A custom type with none
  registered throws `UnsetValueError` on `displayName` rather than deriving from the identifier
  (d:custom-effect-display-name-is-supplied).
- [CHOSE] the base-name table is data on the module (a frozen record), and the *override* lives
  per-server so tests do not leak into each other (r:instance-scoped-world).

### Persisted state on entities

Dynamic properties on the entity, same store as the world (r:persisted-state-is-modeled).
Unset property reads `undefined` (d:absence-reads-as-undefined).

## 7. Events (`events/`)

d:every-signal-exists-few-are-raised.

- **Every** declared signal exists on `world.afterEvents` (55) and `world.beforeEvents` (13),
  and accepts subscribers. `subscribe(cb)` returns the callback; `unsubscribe(cb)` removes it.
  Registration is **set-shaped** — subscribing the same closure twice delivers once — and
  distinct subscribers are called in subscription order
  (f:subscription-semantics-observed).
- The fakes' own behaviour raises only: `entitySpawn`, `entityRemove`, `entityHurt`,
  `entityHealthChanged`, `entityDie`. Everything else is driven by a control-plane free
  function.
```ts
export function emit<K extends keyof MC.WorldAfterEvents>(
  server: FakeServer, signal: K, payload: PayloadOf<K>): void;
```
[CHOSE] `emit` takes the signal by name (a string key) rather than by signal object, and takes
a fully hand-constructed payload — the decision's first falsifier ("tests routinely need a
payload built for them") says payload builders are what this shape *declines* to ship.
[CHOSE] a matching `emitBefore` for before-events, returning whether the payload came back
cancelled.
- **After-events are dispatched synchronously, inside the causing call**
  (r:synchronous-event-delivery), a deliberate divergence from the engine's same-tick-deferred
  delivery (f:after-events-deferred, f:after-event-deferral-subtick). Handlers observe
  post-write state.
- **Before-events are dispatched synchronously ahead of the action they gate**; a cancelled
  event does not take effect (r:before-events-can-cancel).
- **Mutable before-event fields**: `entityHurt.damage` and `effectAdd.duration` are read and
  honoured; the other four mutable fields are writable and unread, because the fake raises no
  action that would consume them (d:before-event-field-writes-are-honoured).
- **Handler errors** (d:handler-errors-are-isolated-and-recorded, accepted): a subscriber that
  throws does not reach the caller, does not stop the other subscribers on the signal, and does
  not stop the rest of the cascade (f:throwing-handler-is-isolated). The library **records** the
  error rather than discarding it as the engine does — a divergence in the library's favour.
```ts
export function getHandlerErrors(server: FakeServer): HandlerError[];
interface HandlerError { signal: string; error: unknown; }
```
[CHOSE] the record carries the signal name and the thrown value. [CHOSE] no clearing function.

## 8. System & scheduling (`system/system.ts`)

r:scheduling-is-test-advanced — records scheduling, runs nothing until the test advances; no
timers, no awaits.

- `system.currentTick` starts at `0`, advances only under the advance function
  (d:current-tick-starts-at-zero).
- `system.run(cb): number`, `system.runTimeout(cb, ticks): number`,
  `system.runInterval(cb, ticks): number`, `system.clearRun(handle: number): void`.
  [CHOSE] handles are numbers issued sequentially from 1 per bundle.
- Semantics (d:tick-advance-semantics):
  - `run` is due on the **next** tick.
  - `runTimeout(cb, n)` on the **nth tick after scheduling**.
  - `runInterval(cb, n)` **every nth tick**.
- Control plane:
```ts
export function advanceTicks(server: FakeServer, n = 1): void;
```
Steps **one tick at a time**: increments `currentTick`, then runs that tick's callbacks in
scheduling order, then steps again — so an advance of n runs every intervening tick's
callbacks. Within each tick, effect decay is applied **before** that tick's callbacks run
(d:effect-durations-decay-on-the-advance-clock).
- [CHOSE] a callback scheduled *during* a tick's callback run is due from the next tick, not
  the current one — otherwise `runInterval(cb,1)` re-entrantly rescheduled would loop forever.
- Everything else on `System` (`runJob`, `waitTicks`, `beforeEvents`, `afterEvents`,
  `scriptEvent`, `clearJob`, …): `NotImplementedError`.
  [CHOSE] `system.beforeEvents`/`afterEvents` — I would give them the same "signals exist,
  accept subscribers, never raised" treatment as the world's, since
  d:every-signal-exists-few-are-raised says "every declared event signal". Marked [CHOSE]
  because the decision's context is the world.

## 9. Registries (`registries.ts`)

d:registries-are-declared-and-throw: all eight (`BiomeTypes`, `BlockStates`, `BlockTypes`,
`DimensionTypes`, `EffectTypes`, `EnchantmentTypes`, `EntityTypes`, `ItemTypes`) are declared on
the bundle with **every member throwing `NotImplementedError`**, and none tracks world state.
So `DimensionTypes.getAll()` throws even after `withVanillaDimensions` — two independent stores
are explicitly not reconciled (that's the second falsifier).
[CHOSE] they are plain objects on the bundle typed as `typeof MC.XTypes`, not real classes, so
they can be per-bundle.

`Potions` and `BlockPermutation.resolve` (also static, f:engine-surface-outside-instances) are
outside the eight and outside the bundle: not shipped this cycle.

## 10. Control plane — the complete free-function surface

r:only-real-members-free-functions: everything the real API cannot express is a free function.

```ts
// construction
createServer(): FakeServer
createEntity(server, typeId, options?): MC.Entity
createPlayer(server, options): MC.Player

// presets
withVanillaDimensions(server): FakeServer
asSpawnedEntity(entity): MC.Entity

// lifecycle the real API cannot express
invalidate(entity): void

// component reshaping (r:control-plane-component-mutation)
addComponent(entity, componentId, state?): void
removeComponent(entity, componentId): void

// events
emit(server, signalName, payload): void
emitBefore(server, signalName, payload): boolean   // returns cancelled
getHandlerErrors(server): HandlerError[]

// scheduling
advanceTicks(server, n?): void

// reads the real surface has no member for
getOutput(target): OutputRecord[]
getTriggeredEvents(entity): string[]

// effect display names
registerEffectBaseName(server, effectTypeId, baseName): void

// errors
InvalidEntityError, ArgumentOutOfBoundsError, InvalidArgumentError,
NotImplementedError, UnsetValueError
```
Every one exported from the single `index.ts` barrel (d:one-public-entry-point).

[CHOSE] all control-plane functions take the subject as the first parameter (free functions over
the fakes) rather than living on a separate "control" object — the requirement says "exported
free function", so a namespace object would be the wrong shape.

## 11. Coverage table

r:coverage-is-enumerated + d:coverage-rows-carry-stable-ids.

- The library enumerates the engine behaviours within its scope, each row **modelled**, **not
  modelled**, or **modelled with a divergence**.
- Every row carries a **kebab-case id naming its subject, not its verdict**. That id — not the
  prose — is what a consumer pins. A row keeps its id when its coverage changes; a split or a
  removal **retires** the id rather than passing it to a successor. Nothing mechanical enforces
  this.
- Every divergence must be described **where a user of the library will find it, not only in
  the spec** (r:coverage-is-enumerated). [CHOSE] that means the coverage table ships in the
  package README, and each diverging member's TSDoc carries the divergence note, so it surfaces
  in the editor.

Divergence rows I would write from the foundations:
| id | verdict |
|---|---|
| `after-event-delivery-timing` | divergence — synchronous, engine defers within the tick |
| `entity-id-format` | divergence — sequential positive decimal strings, engine issues negative integers |
| `remove-event-cascade` | divergence — only `entityRemove`, engine was observed to fire five events |
| `projectile-damage-amount` | divergence — verbatim, engine adjusts by velocity |
| `spawn-placement` | divergence — literal, engine offsets `minecraft:boat` by 0.2 |
| `post-spawn-motion` | not modelled — entities never move |
| `corpse-invalidation-window` | divergence — corpse stays valid, engine invalidates at 21 ticks |
| `handler-error-visibility` | divergence — recorded, engine discards |
| `effect-expiry-boundary` | library's own rule, engine boundary unobserved — **no divergence claimed** |
| `damage-invulnerability-window` | not modelled |
| `unbound-method-invocation` | divergence — `TypeError`, engine raises a `ReferenceError` |
| `structural-shape-of-an-entity` | divergence — own/prototype property shape differs |
| `entity-query-fields` | partial — six honoured, eighteen throw |
| `non-attribute-components` | partial — identity only |
| `items-blocks-containers` | not modelled (out of scope this cycle) |
| `arity-maximum-check` | not modelled — extras pass through, engine's response unobserved |

## 12. The generator (`tools/generate.ts`)

d:fakes-are-generated-classes-with-guard-prologues.
Inputs, both committed:
- `data/member-manifest.json` — read off the pinned `index.d.ts`: for each class, each member,
  its kind (property/method/static), its **declared required parameter count**, and whether it
  is modelled.
- `data/guard-table.json` — the transcribed invalidation observations.

Output (gitignored): one TS file per class, each member shaped:
```ts
kill(...args: unknown[]): boolean {
  if (arguments.length < 0) throw arityError('kill', 0, arguments.length);  // arity first
  guardEntity(this);                                                        // then validity
  return behaviour.kill(this);                                             // or: throw new NotImplementedError('Entity.kill')
}
```
Class declares `implements MC.Entity` so the full public shape is compile-checked
(r:fakes-are-structurally-assignable; possible because
f:server-classes-are-structurally-assignable says no private instance members or brands).

The manifest covers ~1010 members (the arity-check decision's third falsifier names that count),
across the entity, world, dimension, component, effect, event-signal and registry classes.

## 13. Things I would have to ask

- [BLOCKED] The seven attribute-shaped component ids — mechanical to derive from `index.d.ts`,
  but not stated in the foundations.
- [BLOCKED] `InvalidEntityError`'s exact message string.
- [BLOCKED] `world.gameRules` — object or `NotImplementedError`?
- [BLOCKED] Whether a killed health-bearing entity should invalidate after 21 advanced ticks or
  stay valid forever. I chose "stays valid" but this is a real fork.
- [BLOCKED] Exact names of the control-plane free functions. I invented `createServer`,
  `createEntity`, `invalidate`, `emit`, `advanceTicks`, `getOutput`, `getTriggeredEvents`,
  `getHandlerErrors`, `addComponent`, `removeComponent`, `registerEffectBaseName`. Only
  `createServer`, `advanceTicks`, `getOutput`, `getTriggeredEvents`, `getHandlerErrors`,
  `withVanillaDimensions` and `asSpawnedEntity` are actually named in the foundations; the rest
  are mine.
- [BLOCKED] Whether `Player` gets a modelled surface beyond entity + `sendMessage` +
  `onScreenDisplay` (the output members). The modelled-surface decision names "the world,
  dimensions, entity identity and lifecycle, the seven attribute-shaped components, effects,
  events, scheduling, persisted state and output" — `Player` is implied only by "output".
- [BLOCKED] Whether the output log is per-target or one interleaved log. I chose per-target from
  the falsifier's wording.
- [BLOCKED] Where the coverage table lives for the user (README? TSDoc? both?).
