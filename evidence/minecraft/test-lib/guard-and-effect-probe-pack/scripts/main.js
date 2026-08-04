// Third in-engine probe pack for minecraft/test-lib. Two sets:
//   guards  — the 27 Entity methods whose validity guard the earlier sweep never reached,
//             called on an invalidated entity with correctly-typed arguments
//   effects — whether addEffect compares the incoming duration against the duration originally
//             applied or the duration remaining
// Each probe emits lines tagged with its probe name:
//   [mctest] <probe-name> :: <observation>
// Copy every [mctest] line from chat (or the server content log — console.warn mirrors them)
// back into the design as evidence. Probes observe and report; they do not assert.
import {
  CommandPermissionLevel,
  CustomCommandStatus,
  InvalidEntityError,
  ItemStack,
  system,
  world,
} from '@minecraft/server'

const PREFIX = '[mctest]'
const SHEEP = 'minecraft:sheep'

const emit = (line) => {
  world.sendMessage(`${PREFIX} ${line}`)
  console.warn(`${PREFIX} ${line}`)
}

const tick = (n = 1) => new Promise((resolve) => system.runTimeout(resolve, n))

/** Runs fn, describing either its return value or the error it threw. */
const attempt = (fn) => {
  try {
    return { ok: true, value: fn() }
  } catch (error) {
    return {
      ok: false,
      name: error?.name,
      ctor: error?.constructor?.name,
      invalidEntity: error instanceof InvalidEntityError,
      message: String(error?.message ?? error),
    }
  }
}

const show = (outcome) =>
  outcome.ok
    ? `ok value=${describeValue(outcome.value)}`
    : `threw name=${outcome.name} ctor=${outcome.ctor} instanceofInvalidEntityError=${outcome.invalidEntity} message="${outcome.message}"`

const describeValue = (value) => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'object') return `object(${value.constructor?.name})`
  return `${typeof value}:${String(value)}`
}

const json = (value) => {
  try {
    const text = JSON.stringify(value)
    return text === undefined ? describeValue(value) : text
  } catch {
    return describeValue(value)
  }
}

/** Arguments as they appear in the log: enough to re-run the call by hand. */
const showArgs = (args) => args.map((arg) => (arg instanceof ItemStack ? `ItemStack(${arg.typeId})` : json(arg))).join(', ')

/** Test context: spawns tracked entities near the triggering source, cleans them up after. */
const makeContext = (dimension, location, source) => {
  const spawned = []
  return {
    dimension,
    location,
    source,
    spawn: (typeId = SHEEP) => {
      const entity = dimension.spawnEntity(typeId, location)
      spawned.push(entity)
      return entity
    },
    dispose: () => {
      for (const entity of spawned) {
        try {
          if (entity.isValid) entity.remove()
        } catch {
          // already gone
        }
      }
    },
  }
}

// ---------------------------------------------------------------------------------------------
// Set A — the arity-blocked invalidation guards.
//
// fact: invalidation-guard-list-complete / arity-checked-before-validity-guard. The reflective
// sweep in resting-state-probe-pack called all 46 Entity methods with no arguments: 19 reached
// the validity guard and threw InvalidEntityError, and 27 threw
// `TypeError: Incorrect number of arguments to function.` before the guard ran. For those 27 the
// guard is unobserved, not shown absent. This calls each of the 27 with arguments of the declared
// types so the arity check passes and the call reaches whatever comes next.
//
// Each method is probed twice: once on a valid control entity and once on an entity removed
// beforehand, with the same arguments. The control is what separates "this method has no guard"
// from "these arguments were rejected" — a method that returns on the invalidated entity is only
// evidence of an absent guard if the same call also succeeded on a valid one.

// Signatures are from the pinned @minecraft/server 2.8.0 index.d.ts, `export class Entity`.
// `args` is a thunk because some values depend on the run's location, on ItemStack construction,
// or on the entity property discovered by `entity-property-discovery`.
const GUARD_METHODS = [
  // addEffect(effectType: EffectType | string, duration: number, options?: EntityEffectOptions)
  { name: 'addEffect', args: () => ['minecraft:speed', 20, { amplifier: 0, showParticles: false }] },
  // addItem(itemStack: ItemStack): ItemStack | undefined
  { name: 'addItem', args: () => [new ItemStack('minecraft:stone', 1)] },
  // addTag(tag: string): boolean
  { name: 'addTag', args: () => ['mctest_tag'] },
  // applyDamage(amount: number, options?: EntityApplyDamage…Options): boolean
  { name: 'applyDamage', args: () => [1] },
  // applyImpulse(vector: Vector3): void
  { name: 'applyImpulse', args: () => [{ x: 0, y: 0.1, z: 0 }] },
  // applyKnockback(horizontalForce: VectorXZ, verticalStrength: number): void
  { name: 'applyKnockback', args: () => [{ x: 0, z: 0.1 }, 0.1] },
  // getComponent<T extends string>(componentId: T)
  { name: 'getComponent', args: () => ['minecraft:health'] },
  // getDynamicProperty(identifier: string)
  { name: 'getDynamicProperty', args: () => ['mctest_prop'] },
  // getEffect(effectType: EffectType | string): Effect | undefined
  { name: 'getEffect', args: () => ['minecraft:speed'] },
  // getProperty(identifier: string) — needs an entity property the type actually declares
  { name: 'getProperty', args: () => [entityProperty.id], typeId: () => entityProperty.typeId },
  // hasComponent(componentId: string): boolean
  { name: 'hasComponent', args: () => ['minecraft:health'] },
  // hasTag(tag: string): boolean
  { name: 'hasTag', args: () => ['mctest_tag'] },
  // lookAt(targetLocation: Vector3): void — the probe's own location, so the target is loaded
  { name: 'lookAt', args: (ctx) => [ctx.location] },
  // matches(options: EntityQueryOptions): boolean
  { name: 'matches', args: () => [{ type: SHEEP }] },
  // playAnimation(animationName: string, options?: PlayAnimationOptions): void
  { name: 'playAnimation', args: () => ['animation.quadruped.walk'] },
  // removeEffect(effectType: EffectType | string): boolean
  { name: 'removeEffect', args: () => ['minecraft:speed'] },
  // removeTag(tag: string): boolean
  { name: 'removeTag', args: () => ['mctest_tag'] },
  // resetProperty(identifier: string)
  { name: 'resetProperty', args: () => [entityProperty.id], typeId: () => entityProperty.typeId },
  // runCommand(commandString: string): CommandResult — self-scoped, so it cannot touch the world
  { name: 'runCommand', args: () => ['tag @s add mctest_cmd'] },
  // setDynamicProperties(values: Record<string, …>): void
  { name: 'setDynamicProperties', args: () => [{ mctest_prop: 1 }] },
  // setDynamicProperty(identifier: string, value?: …): void
  { name: 'setDynamicProperty', args: () => ['mctest_prop', 1] },
  // setOnFire(seconds: number, useEffects?: boolean): boolean — useEffects false, no visible fire
  { name: 'setOnFire', args: () => [1, false] },
  // setProperty(identifier: string, value: boolean | number | string): void — writes the value
  // the control just read back, so the value is of the property's own type by construction
  {
    name: 'setProperty',
    args: () => [entityProperty.id, entityProperty.value],
    typeId: () => entityProperty.typeId,
    usable: () => entityProperty.value !== undefined,
  },
  // setRotation(rotation: Vector2): void
  { name: 'setRotation', args: () => [{ x: 0, y: 0 }] },
  // teleport(location: Vector3, teleportOptions?: TeleportOptions): void
  { name: 'teleport', args: (ctx) => [ctx.location] },
  // triggerEvent(eventName: string): void — prefixed form; the bare form is rejected on this
  // surface (fact: namespace-prefix-is-optional)
  { name: 'triggerEvent', args: () => ['minecraft:entity_born'] },
  // tryTeleport(location: Vector3, teleportOptions?: TeleportOptions): boolean
  { name: 'tryTeleport', args: (ctx) => [ctx.location] },
]

// Filled in by `entity-property-discovery`. Until it finds one, the three entity-property
// methods have no argument the engine will accept and their results are reported as unusable.
let entityProperty = { typeId: SHEEP, id: 'mctest_prop', value: undefined, found: false }

// Candidate (type, property) pairs to search for a real entity property. Entity properties are
// declared per entity type in its behaviour definition and there is no runtime listing API, so
// the set is a search rather than a lookup; the log records which pairs the engine accepted.
const PROPERTY_CANDIDATES = [
  ['minecraft:cow', 'minecraft:climate_variant'],
  ['minecraft:pig', 'minecraft:climate_variant'],
  ['minecraft:chicken', 'minecraft:climate_variant'],
  ['minecraft:armadillo', 'minecraft:armadillo_state'],
  ['minecraft:creaking', 'minecraft:creaking_state'],
  ['minecraft:wolf', 'minecraft:sound_variant'],
  ['minecraft:frog', 'minecraft:climate_variant'],
  ['minecraft:bee', 'minecraft:has_nectar'],
]

/**
 * Classifies one method from its control (valid entity) and subject (removed entity) outcomes.
 * The interesting verdict is GUARD-ABSENT: the call returned on a removed entity and the same
 * call returned on a valid one, so the arguments are not the explanation.
 */
const verdictFor = (control, subject) => {
  if (!subject.ok && subject.invalidEntity) return 'GUARD-OBSERVED'
  if (!subject.ok && subject.name === 'TypeError') return 'ARITY-STILL-WRONG'
  if (subject.ok && control.ok) return 'GUARD-ABSENT'
  if (subject.ok && !control.ok) return 'RETURNED-BUT-CONTROL-THREW'
  if (control.ok) return 'GUARD-UNOBSERVED-OTHER-ERROR'
  return 'GUARD-UNOBSERVED-ARGS-REJECTED'
}

const VERDICT_NOTES = {
  'GUARD-OBSERVED': 'the call reached the validity guard and it fired',
  'ARITY-STILL-WRONG': 'the argument count is still wrong; the guard is still unobserved',
  'GUARD-ABSENT': 'returned on a removed entity, and the same arguments returned on a valid one',
  'RETURNED-BUT-CONTROL-THREW':
    'returned on a removed entity while the control threw — read the control error before calling this an absent guard',
  'GUARD-UNOBSERVED-OTHER-ERROR':
    'threw something other than InvalidEntityError although the control accepted the arguments — a pre-guard rejection, so the guard is still unobserved',
  'GUARD-UNOBSERVED-ARGS-REJECTED':
    'the control threw too, so the arguments are wrong and nothing is learned about the guard',
}

const guardProbes = {
  // Finds an entity type/property pair the engine accepts, so getProperty, setProperty and
  // resetProperty can be called with an identifier that exists rather than an invented one.
  'entity-property-discovery': async (ctx) => {
    for (const [typeId, id] of PROPERTY_CANDIDATES) {
      const spawn = attempt(() => ctx.spawn(typeId))
      if (!spawn.ok) {
        emit(`entity-property-discovery :: ${typeId} spawn ${show(spawn)}`)
        continue
      }
      const read = attempt(() => spawn.value.getProperty(id))
      emit(`entity-property-discovery :: ${typeId} getProperty("${id}") ${show(read)}`)
      if (read.ok && !entityProperty.found) {
        entityProperty = { typeId, id, value: read.value, found: true }
      }
    }
    emit(
      `entity-property-discovery :: selected found=${entityProperty.found} typeId=${entityProperty.typeId} id="${entityProperty.id}" value=${describeValue(entityProperty.value)}`,
    )
    if (!entityProperty.found) {
      emit(
        'entity-property-discovery :: no entity property accepted — getProperty/setProperty/resetProperty will report GUARD-UNOBSERVED-ARGS-REJECTED and stay open',
      )
    }
  },

  // The set itself. One fresh control and one fresh subject per method, so a side effect of one
  // call cannot carry into the next.
  'guard-with-correct-arity': async (ctx) => {
    // Run standalone, this probe has no discovered entity property to work from.
    if (!entityProperty.found) await guardProbes['entity-property-discovery'](ctx)
    emit(`guard-with-correct-arity :: probing ${GUARD_METHODS.length} methods, one control + one removed subject each`)
    const verdicts = new Map()
    for (const method of GUARD_METHODS) {
      const typeId = method.typeId ? method.typeId() : SHEEP
      const args = attempt(() => method.args(ctx))
      if (!args.ok) {
        emit(`guard-with-correct-arity :: ${method.name} ARGUMENT CONSTRUCTION FAILED ${show(args)}`)
        continue
      }
      const usable = method.usable ? method.usable() : true

      const control = attempt(() => ctx.spawn(typeId))
      const subject = attempt(() => ctx.spawn(typeId))
      if (!control.ok || !subject.ok) {
        emit(`guard-with-correct-arity :: ${method.name} spawn(${typeId}) failed control=${show(control)} subject=${show(subject)}`)
        continue
      }
      const controlCall = attempt(() => control.value[method.name](...args.value))
      const removed = attempt(() => subject.value.remove())
      if (!removed.ok) {
        emit(`guard-with-correct-arity :: ${method.name} remove() of the subject failed ${show(removed)} — skipped`)
        continue
      }
      await tick(2)
      const stillValid = attempt(() => subject.value.isValid)
      const subjectCall = attempt(() => subject.value[method.name](...args.value))

      const verdict = verdictFor(controlCall, subjectCall)
      verdicts.set(method.name, verdict)
      emit(
        `guard-with-correct-arity :: ${method.name}(${showArgs(args.value)}) on ${typeId} ` +
          `subject-isValid=${json(stillValid.value)} argsUsable=${usable} ` +
          `verdict=${verdict} (${VERDICT_NOTES[verdict]})`,
      )
      emit(`guard-with-correct-arity :: ${method.name} control(valid-entity) ${show(controlCall)}`)
      emit(`guard-with-correct-arity :: ${method.name} subject(removed-entity) ${show(subjectCall)}`)
      if (verdict === 'GUARD-ABSENT') {
        emit(`guard-with-correct-arity :: !!! GUARD ABSENT !!! ${method.name} returned on a removed entity — this is the finding the set was built to catch`)
      }
      attempt(() => control.value.remove())
      await tick(1)
    }

    const byVerdict = new Map()
    for (const [name, verdict] of verdicts) {
      if (!byVerdict.has(verdict)) byVerdict.set(verdict, [])
      byVerdict.get(verdict).push(name)
    }
    emit(`guard-with-correct-arity :: SUMMARY probed=${verdicts.size}/${GUARD_METHODS.length}`)
    for (const [verdict, names] of byVerdict) {
      emit(`guard-with-correct-arity :: SUMMARY ${verdict} count=${names.length} methods=[${names.join(', ')}]`)
    }
    const absent = byVerdict.get('GUARD-ABSENT') ?? []
    emit(
      absent.length === 0
        ? 'guard-with-correct-arity :: SUMMARY no method returned on a removed entity'
        : `guard-with-correct-arity :: SUMMARY !!! ${absent.length} method(s) returned on a removed entity: [${absent.join(', ')}]`,
    )
  },
}

// ---------------------------------------------------------------------------------------------
// Set B — the duration basis of effect replacement.
//
// open question: effect-duration-comparison-basis. `effect-replacement-rule-observed` records
// that a re-add at the same amplifier replaces on a longer duration, but every sample so far
// re-applied a value at or above the duration originally applied, which both readings satisfy.
//
// The discriminating case re-applies a duration strictly between the decayed remaining duration
// and the duration originally applied:
//   BASE_DURATION applied, DECAY_TICKS pass, remaining ≈ BASE_DURATION - DECAY_TICKS
//   re-apply BETWEEN, where remaining < BETWEEN < BASE_DURATION
// If the comparison is against the duration originally applied, BETWEEN is shorter, no
// replacement takes, and the read-back duration is the decaying base (≈ remaining).
// If it is against the duration remaining, BETWEEN is longer, replacement takes, and the
// read-back duration is exactly BETWEEN.
// The two predictions are (BASE_DURATION - DECAY_TICKS) and BETWEEN, far enough apart that one
// line of log picks the rule.

const BASE_AMPLIFIER = 1
const BASE_DURATION = 400
const DECAY_TICKS = 150
const BETWEEN = 320 // between the ≈250 remaining and the 400 applied
const BELOW_BOTH = 200 // shorter than both — neither rule replaces
const ABOVE_BOTH = 500 // longer than both — both rules replace
const REPEATS = 3
const TOLERANCE = 3 // ticks; the readback is taken in the same tick as the re-add

const effectCases = []
for (const [label, amplifier] of [
  ['equal-amp', BASE_AMPLIFIER],
  ['higher-amp', BASE_AMPLIFIER + 1],
  ['lower-amp', BASE_AMPLIFIER - 1],
]) {
  for (let repeat = 1; repeat <= REPEATS; repeat++) {
    effectCases.push({ label: `${label}/between #${repeat}`, amplifier, reapply: BETWEEN, discriminating: true })
  }
}
// Anchors: the two ends where both readings agree, so a harness that reads the wrong thing shows
// up as an anchor that misses rather than as a silent mis-verdict on the discriminating case.
effectCases.push({ label: 'equal-amp/below-both #1', amplifier: BASE_AMPLIFIER, reapply: BELOW_BOTH, discriminating: false })
effectCases.push({ label: 'equal-amp/above-both #1', amplifier: BASE_AMPLIFIER, reapply: ABOVE_BOTH, discriminating: false })

const effectProbes = {
  'effect-duration-basis': async (ctx) => {
    emit(
      `effect-duration-basis :: design base(amp${BASE_AMPLIFIER},dur${BASE_DURATION}) decay=${DECAY_TICKS}ticks ` +
        `between=${BETWEEN} anchors=[${BELOW_BOTH}, ${ABOVE_BOTH}] cases=${effectCases.length} ` +
        `predictions: original-applied-basis => readback≈remaining (no replacement); remaining-basis => readback=${BETWEEN}`,
    )
    for (const testCase of effectCases) {
      const sheep = ctx.spawn()
      const applied = attempt(() =>
        sheep.addEffect('minecraft:speed', BASE_DURATION, { amplifier: BASE_AMPLIFIER, showParticles: false }),
      )
      if (!applied.ok) {
        emit(`effect-duration-basis :: [${testCase.label}] base addEffect ${show(applied)} — case skipped`)
        attempt(() => sheep.remove())
        continue
      }
      await tick(DECAY_TICKS)

      const before = attempt(() => sheep.getEffect('minecraft:speed'))
      const remaining = attempt(() => before.value?.duration).value
      const remainingAmp = attempt(() => before.value?.amplifier).value
      if (typeof remaining !== 'number') {
        emit(
          `effect-duration-basis :: [${testCase.label}] the base effect was unreadable after ${DECAY_TICKS} ticks ` +
            `${show(before)} entity-isValid=${json(attempt(() => sheep.isValid).value)} — case skipped`,
        )
        attempt(() => sheep.remove())
        continue
      }

      const reapplied = attempt(() =>
        sheep.addEffect('minecraft:speed', testCase.reapply, { amplifier: testCase.amplifier, showParticles: false }),
      )
      const after = attempt(() => sheep.getEffect('minecraft:speed'))
      const readDuration = attempt(() => after.value?.duration).value
      const readAmplifier = attempt(() => after.value?.amplifier).value

      const isBetween = remaining < testCase.reapply && testCase.reapply < BASE_DURATION
      const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= TOLERANCE
      const readback = near(readDuration, testCase.reapply)
        ? 'the-reapplied-value'
        : near(readDuration, remaining)
          ? 'the-decayed-base'
          : 'neither'
      const verdict = !testCase.discriminating
        ? `anchor readback=${readback}`
        : readback === 'the-reapplied-value'
          ? 'REMAINING-BASIS (the re-add was treated as longer, so the comparison is against the duration remaining)'
          : readback === 'the-decayed-base'
            ? 'ORIGINAL-APPLIED-BASIS (the re-add was treated as shorter, so the comparison is against the duration originally applied)'
            : 'UNRESOLVED (the readback matches neither prediction)'

      emit(
        `effect-duration-basis :: [${testCase.label}] applied(amp${BASE_AMPLIFIER},dur${BASE_DURATION}) ` +
          `waited=${DECAY_TICKS}ticks remaining=${json(remaining)} remainingAmp=${json(remainingAmp)} ` +
          `decayPerTick=${json((BASE_DURATION - remaining) / DECAY_TICKS)} ` +
          `reapply(amp${testCase.amplifier},dur${testCase.reapply}) strictly-between-remaining-and-applied=${isBetween} ` +
          `-> readback(amp${json(readAmplifier)},dur${json(readDuration)}) matches=${readback} verdict=${verdict}`,
      )
      emit(
        `effect-duration-basis :: [${testCase.label}] addEffect(re-add) ${show(reapplied)} getEffect(after) ${show(after)} ` +
          `entity-isValid=${json(attempt(() => sheep.isValid).value)} location=${json(attempt(() => sheep.location).value)}`,
      )

      // A second reading a couple of ticks later: a duration that is not ticking down would mean
      // the readback above is not what it appears to be.
      await tick(2)
      const later = attempt(() => sheep.getEffect('minecraft:speed'))
      emit(
        `effect-duration-basis :: [${testCase.label}] after-2-ticks duration=${json(attempt(() => later.value?.duration).value)} ` +
          `amplifier=${json(attempt(() => later.value?.amplifier).value)}`,
      )
      attempt(() => sheep.remove())
      await tick(2)
    }
    emit('effect-duration-basis :: complete — the equal-amp/between lines carry the verdict; the anchors are the sanity check')
  },
}

// ---------------------------------------------------------------------------------------------
// Runner and triggers.

let running = false

const runSet = async (set, setName, dimension, location, source, only) => {
  if (running) {
    emit('a run is already in progress')
    return
  }
  running = true
  const names = only && set[only] ? [only] : Object.keys(set)
  emit(`${setName} start — ${names.length} probe(s), @minecraft/server 2.8.0 expected`)
  for (const name of names) {
    const ctx = makeContext(dimension, location, source)
    try {
      await set[name](ctx)
    } catch (error) {
      emit(`${name} :: PROBE CRASHED ${String(error)} ${String(error?.stack ?? '')}`)
    } finally {
      ctx.dispose()
    }
    await tick(2)
  }
  emit(`${setName} complete — copy every [mctest] line into the design as the answer record`)
  running = false
}

const startFrom = (sourceEntity, set, setName, only) => {
  if (!sourceEntity) {
    emit('no source entity — run the command as a player (or `execute as`) so probes have a place to spawn')
    return
  }
  const dimension = sourceEntity.dimension
  const location = sourceEntity.location
  system.run(() => {
    void runSet(set, setName, dimension, location, sourceEntity, only)
  })
}

system.beforeEvents.startup.subscribe((event) => {
  const registry = event.customCommandRegistry
  registry.registerCommand(
    {
      name: 'mctest3:guards',
      description: 'Call the 27 arity-blocked Entity methods on a removed entity with correct arguments',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, guardProbes, 'guards')
      return { status: CustomCommandStatus.Success, message: 'mctest guard probes started' }
    },
  )
  registry.registerCommand(
    {
      name: 'mctest3:effects',
      description: 'Discriminate whether effect replacement compares the applied or the remaining duration',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, effectProbes, 'effects')
      return { status: CustomCommandStatus.Success, message: 'mctest effect-duration probes started' }
    },
  )
})

// Fallback triggers:
//   /scriptevent mctest3:guards [probe-id]
//   /scriptevent mctest3:effects [probe-id]
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === 'mctest3:guards') {
    startFrom(event.sourceEntity, guardProbes, 'guards', event.message.trim() || undefined)
  } else if (event.id === 'mctest3:effects') {
    startFrom(event.sourceEntity, effectProbes, 'effects', event.message.trim() || undefined)
  }
})
