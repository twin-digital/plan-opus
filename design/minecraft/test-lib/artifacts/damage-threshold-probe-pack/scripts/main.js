// Fourth in-engine probe pack for minecraft/test-lib. Three sets, one per spec ruling that no
// run has yet observed:
//   nohealth  — applyDamage on an entity that genuinely has no health component
//   threshold — the killing-hit boundary: a write landing exactly on effectiveMin
//   handlers  — what the engine does when an after-event handler throws mid-cascade
// Each probe emits lines tagged with its probe name:
//   [mctest] <probe-name> :: <observation>
// Copy every [mctest] line from chat (or the server content log — console.warn mirrors them)
// back into the design as evidence. Probes observe and report; they do not assert.
import {
  CommandPermissionLevel,
  CustomCommandStatus,
  EntityDamageCause,
  InvalidEntityError,
  system,
  world,
} from '@minecraft/server'

const PREFIX = '[mctest]'
const SHEEP = 'minecraft:sheep' // passive, 8 max health — cheap lethal-damage probes
const HEALTH = 'minecraft:health'

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

const safeId = (entity) => {
  try {
    return entity.id
  } catch {
    return '<id-unreadable>'
  }
}

const chainMembers = (object) => {
  const names = new Set()
  for (let proto = Object.getPrototypeOf(object); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name !== 'constructor') names.add(name)
    }
  }
  for (const name of Object.getOwnPropertyNames(object)) names.add(name)
  return [...names].sort()
}

/** Best-effort: does an event payload reference the entity with this id? */
const mentionsEntity = (event, entityId) => {
  try {
    for (const key of Object.keys(event ?? {})) {
      const value = event[key]
      if (value && typeof value === 'object' && safeId(value) === entityId) return true
    }
  } catch {
    // unreadable payload
  }
  return false
}

/** Records the three damage-path events for one entity id, in delivery order. */
const recordCascade = (entityId) => {
  const seen = []
  const subscriptions = []
  const on = (signal, pick) => {
    const handler = signal.subscribe((event) => {
      const picked = pick(event)
      if (picked !== undefined) seen.push(picked)
    })
    subscriptions.push([signal, handler])
  }
  on(world.afterEvents.entityHurt, (ev) =>
    safeId(ev.hurtEntity) === entityId ? `hurt(damage=${ev.damage},cause=${ev.damageSource?.cause})` : undefined,
  )
  on(world.afterEvents.entityHealthChanged, (ev) =>
    safeId(ev.entity) === entityId ? `health(${ev.oldValue}->${ev.newValue})` : undefined,
  )
  on(world.afterEvents.entityDie, (ev) =>
    safeId(ev.deadEntity) === entityId ? `die(cause=${ev.damageSource?.cause})` : undefined,
  )
  return {
    seen,
    reset: () => {
      seen.length = 0
    },
    dispose: () => {
      for (const [signal, handler] of subscriptions) attempt(() => signal.unsubscribe(handler))
    },
  }
}

/**
 * Subscribes every subscribable `world.afterEvents` signal and records each delivery, tagged
 * `(ours)` when the payload references the given id. The whole-surface form is what turns "no
 * entityHurt fired" into "no signal at all fired".
 */
const recordEverySignal = (entityId) => {
  const fired = []
  const subscriptions = []
  const skipped = []
  for (const name of chainMembers(world.afterEvents)) {
    const signal = attempt(() => world.afterEvents[name])
    if (!signal.ok || typeof signal.value?.subscribe !== 'function') {
      skipped.push(name)
      continue
    }
    const subscribed = attempt(() =>
      signal.value.subscribe((event) => {
        fired.push(`${name}${mentionsEntity(event, entityId) ? '(ours)' : '(other)'}`)
      }),
    )
    if (subscribed.ok) subscriptions.push([signal.value, subscribed.value])
    else skipped.push(`${name}!`)
  }
  return {
    fired,
    subscribed: subscriptions.length,
    skipped,
    reset: () => {
      fired.length = 0
    },
    dispose: () => {
      for (const [signal, handler] of subscriptions) attempt(() => signal.unsubscribe(handler))
    },
  }
}

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

const healthOf = (entity) => attempt(() => entity.getComponent(HEALTH)).value

/** currentValue / defaultValue / effectiveMin / effectiveMax, each read independently. */
const readAttributes = (component) => ({
  currentValue: attempt(() => component.currentValue),
  defaultValue: attempt(() => component.defaultValue),
  effectiveMin: attempt(() => component.effectiveMin),
  effectiveMax: attempt(() => component.effectiveMax),
})

const showAttributes = (values) =>
  `currentValue=${show(values.currentValue)} defaultValue=${show(values.defaultValue)} ` +
  `effectiveMin=${show(values.effectiveMin)} effectiveMax=${show(values.effectiveMax)}`

// ---------------------------------------------------------------------------------------------
// Set A — damage to an entity with no health component.
//
// decision: damage-without-health-is-a-no-op ("changes nothing, fires no event, returns false") is
// a guess. `kill-no-health-behaviour` observed kill() on an arrow; applyDamage on such an entity
// has never been called. This calls it, in both argument forms, with the whole afterEvents surface
// subscribed, and reports the return value, whether it threw, and every signal delivered.
//
// Contradicting outcomes: a `true` return, a throw, or any (ours) signal in the window.

// Projectiles and orbs: entity types with no combat presence, so a spawned subject cannot fight
// back or alter the world while the probe runs. `minecraft:arrow` is the one `kill-no-health-behaviour`
// already used.
const NO_HEALTH_CANDIDATES = ['minecraft:arrow', 'minecraft:snowball', 'minecraft:xp_orb']
const DAMAGE_AMOUNT = 2
const OPTIONS_FORM = { cause: EntityDamageCause.entityAttack }

/** One applyDamage call, its return, and everything delivered in the following window. */
const damageCall = async (probe, label, entity, entityId, sweep, cascade, args) => {
  sweep.reset()
  cascade.reset()
  const before = healthOf(entity)
  const beforeValue = before ? attempt(() => before.currentValue) : undefined
  const returned = attempt(() => entity.applyDamage(...args))
  await tick(4)
  const after = healthOf(entity)
  const afterValue = after ? attempt(() => after.currentValue) : undefined
  const ours = sweep.fired.filter((name) => name.endsWith('(ours)'))

  const verdict = !returned.ok
    ? 'CONTRADICTS-SPEC-THREW'
    : returned.value === true
      ? 'CONTRADICTS-SPEC-RETURNED-TRUE'
      : ours.length > 0
        ? 'CONTRADICTS-SPEC-SIGNAL-DELIVERED'
        : 'MATCHES-SPEC-SILENT-FALSE'

  emit(
    `${probe} :: [${label}] applyDamage(${args.map(json).join(', ')}) ${show(returned)} ` +
      `verdict=${verdict} ours=[${ours.join(', ')}] cascade=[${cascade.seen.join(', ')}] ` +
      `all-signals-in-window=[${sweep.fired.join(', ')}] count=${sweep.fired.length}`,
  )
  emit(
    `${probe} :: [${label}] health-before=${beforeValue ? show(beforeValue) : 'no-component'} ` +
      `health-after=${afterValue ? show(afterValue) : 'no-component'} ` +
      `isValid=${json(attempt(() => entity.isValid).value)} id-readable=${safeId(entity) !== '<id-unreadable>'}`,
  )
  return verdict
}

const noHealthProbes = {
  // Which candidate types actually lack a health component. A type that turns out to have one is
  // reported and skipped — the point of set A is an entity that genuinely has none.
  'no-health-type-survey': async (ctx) => {
    for (const typeId of [...NO_HEALTH_CANDIDATES, SHEEP]) {
      const spawn = attempt(() => ctx.spawn(typeId))
      if (!spawn.ok) {
        emit(`no-health-type-survey :: ${typeId} spawn ${show(spawn)}`)
        continue
      }
      const entity = spawn.value
      const component = attempt(() => entity.getComponent(HEALTH))
      const has = attempt(() => entity.hasComponent(HEALTH))
      const all = attempt(() => entity.getComponents().map((c) => c.typeId))
      emit(
        `no-health-type-survey :: ${typeId} getComponent("${HEALTH}") ${show(component)} ` +
          `hasComponent=${show(has)} components=[${(all.value ?? []).join(', ')}]`,
      )
      attempt(() => entity.remove())
      await tick(1)
    }
  },

  // The set itself. Each subject is confirmed component-free immediately before the call, so a
  // silent false is attributable to the missing component rather than to an unlucky spawn.
  'damage-without-health': async (ctx) => {
    const verdicts = new Map()
    for (const typeId of [...NO_HEALTH_CANDIDATES, SHEEP]) {
      const isControl = typeId === SHEEP
      const spawn = attempt(() => ctx.spawn(typeId))
      if (!spawn.ok) {
        emit(`damage-without-health :: ${typeId} spawn ${show(spawn)} — skipped`)
        continue
      }
      const entity = spawn.value
      const entityId = safeId(entity)
      const component = attempt(() => entity.getComponent(HEALTH))
      const has = attempt(() => entity.hasComponent(HEALTH))
      const componentPresent = component.ok && component.value !== undefined
      emit(
        `damage-without-health :: ${typeId} pre-check getComponent ${show(component)} hasComponent=${show(has)} ` +
          `component-present=${componentPresent} role=${isControl ? 'control(has-health)' : 'subject(expected-no-health)'}`,
      )
      if (componentPresent !== isControl) {
        emit(
          `damage-without-health :: ${typeId} pre-check disagrees with its role — the call still runs, but read the ` +
            'verdict against this line, not against the role name',
        )
      }

      const sweep = recordEverySignal(entityId)
      const cascade = recordCascade(entityId)
      emit(`damage-without-health :: ${typeId} subscribed=${sweep.subscribed} skipped=${sweep.skipped.length} skipped-names=[${sweep.skipped.join(', ')}]`)

      const plain = await damageCall('damage-without-health', `${typeId}/plain`, entity, entityId, sweep, cascade, [DAMAGE_AMOUNT])
      const withOptions = await damageCall('damage-without-health', `${typeId}/options`, entity, entityId, sweep, cascade, [
        DAMAGE_AMOUNT,
        OPTIONS_FORM,
      ])
      if (!isControl) {
        verdicts.set(`${typeId}/plain`, plain)
        verdicts.set(`${typeId}/options`, withOptions)
      }

      sweep.dispose()
      cascade.dispose()
      attempt(() => entity.remove())
      await tick(2)
    }

    const contradicting = [...verdicts].filter(([, verdict]) => verdict.startsWith('CONTRADICTS'))
    emit(`damage-without-health :: SUMMARY subject-calls=${verdicts.size} contradicting=${contradicting.length}`)
    for (const [label, verdict] of verdicts) emit(`damage-without-health :: SUMMARY ${label} ${verdict}`)
    emit(
      contradicting.length === 0
        ? 'damage-without-health :: SUMMARY every subject call returned false, threw nothing and delivered no signal'
        : `damage-without-health :: SUMMARY !!! ${contradicting.length} call(s) contradict the no-op ruling: [${contradicting
            .map(([label, verdict]) => `${label}=${verdict}`)
            .join(', ')}]`,
    )
  },
}

// ---------------------------------------------------------------------------------------------
// Set B — the killing-hit threshold.
//
// decision: killing-hit-lands-at-or-below-minimum ("entityDie fires when the write leaves
// currentValue at or below effectiveMin, the boundary included"). Every observation behind it
// reached the minimum through resetToMinValue; the boundary has never been hit through
// setCurrentValue or through applyDamage. This drives currentValue to exactly effectiveMin by
// each of those two paths and records whether entityDie fires.
//
// Each boundary case is paired with a one-above-the-minimum control by the same path. Without it,
// "died" cannot be told from "this entity type dies on any health write".
//
// Contradicting outcome: the entity reaches exactly effectiveMin and no entityDie is delivered,
// putting the boundary on the survivor side.

const SURVEY_TYPES = [
  'minecraft:sheep',
  'minecraft:cow',
  'minecraft:chicken',
  'minecraft:pig',
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:villager_v2',
  'minecraft:wolf',
  'minecraft:bat',
  'minecraft:armor_stand',
  'minecraft:iron_golem',
]

// Passive types only. A hostile subject takes environmental damage of its own mid-case — a burning
// zombie moves currentValue between the write and the readback, and the case stops discriminating.
const BOUNDARY_TYPES = ['minecraft:sheep', 'minecraft:cow', 'minecraft:armor_stand']

// Types whose surveyed effectiveMin is not 0, added to the boundary set by the survey. A nonzero
// minimum has never been seen in this design, and it is the case the ruling is least tested on.
const nonzeroMinimumTypes = []
let surveyRan = false

/**
 * Drives one entity to a target health by one path and reports what the engine did.
 * `path` is 'setCurrentValue' or 'applyDamage'; `offset` is how far above effectiveMin to land.
 */
const boundaryCase = async (typeId, entity, path, offset) => {
  const label = `${typeId}/${path}/${offset === 0 ? 'at-min' : `min+${offset}`}`
  const entityId = safeId(entity)
  const cascade = recordCascade(entityId)
  const component = healthOf(entity)
  if (!component) {
    emit(`killing-hit-boundary :: [${label}] no health component on a type the survey listed — skipped`)
    cascade.dispose()
    return 'NO-COMPONENT'
  }
  const before = readAttributes(component)
  if (!before.currentValue.ok || !before.effectiveMin.ok) {
    emit(`killing-hit-boundary :: [${label}] attributes unreadable ${showAttributes(before)} — skipped`)
    cascade.dispose()
    return 'ATTRIBUTES-UNREADABLE'
  }
  const target = before.effectiveMin.value + offset
  const write =
    path === 'setCurrentValue'
      ? attempt(() => component.setCurrentValue(target))
      : attempt(() => entity.applyDamage(before.currentValue.value - target))

  await tick(4)
  const after = healthOf(entity)
  const readback = after ? attempt(() => after.currentValue) : { ok: false, name: 'no-component', message: 'component gone' }
  const landedAtMin = readback.ok && readback.value === before.effectiveMin.value
  const died = cascade.seen.some((line) => line.startsWith('die('))
  const stillValid = attempt(() => entity.isValid).value

  const verdict = !write.ok
    ? 'WRITE-THREW'
    : !landedAtMin && offset === 0
      ? 'MINIMUM-NOT-REACHED'
      : offset === 0
        ? died
          ? 'REACHED-MINIMUM-AND-DIED'
          : 'REACHED-MINIMUM-AND-LIVED'
        : died
          ? 'CONTROL-ABOVE-MINIMUM-DIED'
          : 'CONTROL-ABOVE-MINIMUM-LIVED'

  emit(
    `killing-hit-boundary :: [${label}] before(${showAttributes(before)}) target=${target} ` +
      `write(${path}) ${show(write)} -> readback=${show(readback)} landed-exactly-on-effectiveMin=${landedAtMin} ` +
      `cascade=[${cascade.seen.join(', ')}] died=${died} isValid=${json(stillValid)} verdict=${verdict}`,
  )
  if (verdict === 'REACHED-MINIMUM-AND-LIVED') {
    emit(
      `killing-hit-boundary :: !!! BOUNDARY SURVIVED !!! [${label}] currentValue reached effectiveMin and no entityDie ` +
        'was delivered — this is the falsifier the set was built to catch',
    )
  }
  cascade.dispose()
  return verdict
}

const thresholdProbes = {
  // What effectiveMin actually reads across entity types. The design has only ever observed 0, on
  // a sheep; a nonzero minimum anywhere is a result in its own right.
  'effective-minimum-survey': async (ctx) => {
    nonzeroMinimumTypes.length = 0
    surveyRan = true
    for (const typeId of SURVEY_TYPES) {
      const spawn = attempt(() => ctx.spawn(typeId))
      if (!spawn.ok) {
        emit(`effective-minimum-survey :: ${typeId} spawn ${show(spawn)}`)
        continue
      }
      const component = healthOf(spawn.value)
      if (!component) {
        emit(`effective-minimum-survey :: ${typeId} health component absent — not usable for the boundary set`)
      } else {
        const values = readAttributes(component)
        emit(`effective-minimum-survey :: ${typeId} ${showAttributes(values)}`)
        if (values.effectiveMin.ok && values.effectiveMin.value !== 0) {
          nonzeroMinimumTypes.push(typeId)
          emit(
            `effective-minimum-survey :: !!! NONZERO MINIMUM !!! ${typeId} effectiveMin=${json(values.effectiveMin.value)} — ` +
              'added to the boundary set; the design has only ever observed 0',
          )
        }
      }
      attempt(() => spawn.value.remove())
      await tick(1)
    }
    emit(
      `effective-minimum-survey :: SUMMARY surveyed=${SURVEY_TYPES.length} nonzero-minimum=[${nonzeroMinimumTypes.join(', ')}]`,
    )
  },

  // The boundary itself: exactly effectiveMin by each path, each with a one-above control.
  'killing-hit-boundary': async (ctx) => {
    // Run standalone, this probe has no survey to pick up nonzero-minimum types from.
    if (!surveyRan) await thresholdProbes['effective-minimum-survey'](ctx)
    const types = [...new Set([...BOUNDARY_TYPES, ...nonzeroMinimumTypes])]
    emit(
      `killing-hit-boundary :: probing ${types.length} type(s) [${types.join(', ')}] × 2 paths × ` +
        '(boundary + one-above control), one fresh entity per case',
    )
    const verdicts = new Map()
    for (const typeId of types) {
      for (const path of ['setCurrentValue', 'applyDamage']) {
        for (const offset of [0, 1]) {
          const spawn = attempt(() => ctx.spawn(typeId))
          if (!spawn.ok) {
            emit(`killing-hit-boundary :: ${typeId} spawn ${show(spawn)} — case skipped`)
            continue
          }
          const verdict = await boundaryCase(typeId, spawn.value, path, offset)
          verdicts.set(`${typeId}/${path}/${offset === 0 ? 'at-min' : 'min+1'}`, verdict)
          attempt(() => spawn.value.remove())
          await tick(2)
        }
      }
    }

    const byVerdict = new Map()
    for (const [label, verdict] of verdicts) {
      if (!byVerdict.has(verdict)) byVerdict.set(verdict, [])
      byVerdict.get(verdict).push(label)
    }
    emit(`killing-hit-boundary :: SUMMARY cases=${verdicts.size}`)
    for (const [verdict, labels] of byVerdict) {
      emit(`killing-hit-boundary :: SUMMARY ${verdict} count=${labels.length} cases=[${labels.join(', ')}]`)
    }
    const survived = byVerdict.get('REACHED-MINIMUM-AND-LIVED') ?? []
    emit(
      survived.length === 0
        ? 'killing-hit-boundary :: SUMMARY no case reached the minimum and lived'
        : `killing-hit-boundary :: SUMMARY !!! ${survived.length} case(s) reached the minimum and lived: [${survived.join(', ')}]`,
    )
  },
}

// ---------------------------------------------------------------------------------------------
// Set C — a throwing after-event handler.
//
// decision: handler-errors-propagate ("a subscriber that throws propagates out of the call that
// dispatched it, and the remaining subscribers do not run"). Neither half is observed on the
// engine. This subscribes two handlers to an event the engine raises as part of the damage
// cascade, throws from one of them, and records three things:
//   1. does the throw reach the caller that triggered the action (the applyDamage call)?
//   2. does the other subscriber still run?
//   3. do the later events of the cascade — entityHealthChanged, entityDie — still fire?
//
// The handler throws by design. Its message carries THROW_MARK, and the probe emits a
// DELIBERATE THROW line immediately before: neither is a PROBE CRASHED line, and a script error
// in the content log carrying THROW_MARK is the probe working, not failing.
//
// Contradicting outcomes: for half one, the applyDamage call returning normally (the engine
// swallowed the throw); for half two, the other subscriber running anyway.

const THROW_MARK = 'mctest4-deliberate-handler-throw'
const LETHAL_DAMAGE = 100 // 8-health sheep; known lethal from earlier runs

/** Ordered log of handler entries, exits and event deliveries within one case. */
const makeJournal = (probe, label) => {
  let step = 0
  const entries = []
  return {
    entries,
    note: (text) => {
      step += 1
      entries.push(`${step}:${text}`)
      emit(`${probe} :: [${label}] step ${step} ${text}`)
    },
  }
}

const HANDLER_CASES = [
  {
    label: 'control-no-throw',
    signal: 'entityHurt',
    thrower: 'none',
    purpose: 'baseline delivery order with no handler throwing',
  },
  {
    label: 'first-of-two-throws',
    signal: 'entityHurt',
    thrower: 'first',
    purpose: 'does the second subscriber still run, and does the throw reach applyDamage',
  },
  {
    label: 'second-of-two-throws',
    signal: 'entityHurt',
    thrower: 'second',
    purpose: 'the same question with the throw at the end of the subscriber list',
  },
  {
    label: 'mid-cascade-throw',
    signal: 'entityHealthChanged',
    thrower: 'first',
    purpose: 'do the later events of the cascade still fire after a handler throws',
  },
]

const handlerProbes = {
  'throwing-handler-propagation': async (ctx) => {
    emit(
      `throwing-handler-propagation :: ${HANDLER_CASES.length} cases; a handler throwing by design is labelled ` +
        `DELIBERATE THROW and its error message carries "${THROW_MARK}" — it is not a PROBE CRASHED line`,
    )
    for (const testCase of HANDLER_CASES) {
      const spawn = attempt(() => ctx.spawn())
      if (!spawn.ok) {
        emit(`throwing-handler-propagation :: [${testCase.label}] spawn ${show(spawn)} — case skipped`)
        continue
      }
      const sheep = spawn.value
      const sheepId = safeId(sheep)
      const journal = makeJournal('throwing-handler-propagation', testCase.label)
      const ran = { first: false, second: false }
      const subscriptions = []

      const signal = world.afterEvents[testCase.signal]
      const targeted = (event) =>
        testCase.signal === 'entityHurt' ? safeId(event.hurtEntity) === sheepId : safeId(event.entity) === sheepId

      const makeHandler = (which) => (event) => {
        if (!targeted(event)) return
        ran[which] = true
        journal.note(`${which}-handler ENTER on ${testCase.signal}`)
        if (testCase.thrower === which) {
          journal.note(`${which}-handler DELIBERATE THROW (by design — not a probe crash)`)
          throw new Error(`${THROW_MARK} from the ${which} ${testCase.signal} handler`)
        }
        journal.note(`${which}-handler EXIT`)
      }

      for (const which of ['first', 'second']) {
        const subscribed = attempt(() => signal.subscribe(makeHandler(which)))
        if (subscribed.ok) subscriptions.push([signal, subscribed.value])
        else emit(`throwing-handler-propagation :: [${testCase.label}] subscribe(${which}) ${show(subscribed)}`)
      }

      // Separate recorders on the whole cascade, subscribed after the pair, so a throw in the pair
      // aborting the dispatch shows up as a missing line here.
      const cascade = recordCascade(sheepId)

      journal.note(`applyDamage(${LETHAL_DAMAGE}) called`)
      const damaged = attempt(() => sheep.applyDamage(LETHAL_DAMAGE))
      journal.note(`applyDamage returned ${show(damaged)}`)
      await tick(6)

      const propagated = !damaged.ok
      const bothRan = ran.first && ran.second
      const cascadeText = cascade.seen.join(', ')
      const laterEventsFired = cascade.seen.some((line) => line.startsWith('die('))

      const propagationVerdict =
        testCase.thrower === 'none'
          ? 'n/a (control)'
          : propagated
            ? 'THROW-REACHED-THE-CALLER (applyDamage threw)'
            : 'THROW-DID-NOT-REACH-THE-CALLER (applyDamage returned normally; the engine absorbed it)'
      const siblingVerdict =
        testCase.thrower === 'none'
          ? `n/a (control) bothRan=${bothRan}`
          : bothRan
            ? 'OTHER-SUBSCRIBER-STILL-RAN'
            : 'OTHER-SUBSCRIBER-DID-NOT-RUN'
      const cascadeVerdict = laterEventsFired ? 'LATER-CASCADE-EVENTS-STILL-FIRED' : 'LATER-CASCADE-EVENTS-MISSING'

      emit(
        `throwing-handler-propagation :: [${testCase.label}] signal=${testCase.signal} thrower=${testCase.thrower} ` +
          `purpose="${testCase.purpose}" applyDamage ${show(damaged)} ran.first=${ran.first} ran.second=${ran.second} ` +
          `cascade=[${cascadeText}] propagation=${propagationVerdict} siblings=${siblingVerdict} cascade-tail=${cascadeVerdict}`,
      )
      emit(`throwing-handler-propagation :: [${testCase.label}] order=[${journal.entries.join(' | ')}]`)
      emit(
        `throwing-handler-propagation :: [${testCase.label}] isValid-after=${json(attempt(() => sheep.isValid).value)} ` +
          `health-after=${show(attempt(() => sheep.getComponent(HEALTH)?.currentValue))}`,
      )

      for (const [sig, handler] of subscriptions) attempt(() => sig.unsubscribe(handler))
      cascade.dispose()
      attempt(() => sheep.remove())
      await tick(2)
    }
    emit(
      'throwing-handler-propagation :: complete — read the control case first; it is what the other three are ' +
        'compared against',
    )
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

const COMMANDS = [
  ['mctest4:nohealth', noHealthProbes, 'nohealth', 'applyDamage on an entity that has no health component'],
  ['mctest4:threshold', thresholdProbes, 'threshold', 'Drive health to exactly effectiveMin by two paths and watch for entityDie'],
  ['mctest4:handlers', handlerProbes, 'handlers', 'Throw from an after-event handler and record what the engine does with it'],
]

system.beforeEvents.startup.subscribe((event) => {
  const registry = event.customCommandRegistry
  for (const [name, set, setName, description] of COMMANDS) {
    registry.registerCommand({ name, description, permissionLevel: CommandPermissionLevel.GameDirectors }, (origin) => {
      startFrom(origin.sourceEntity, set, setName)
      return { status: CustomCommandStatus.Success, message: `mctest ${setName} probes started` }
    })
  }
})

// Fallback triggers:
//   /scriptevent mctest4:nohealth  [probe-id]
//   /scriptevent mctest4:threshold [probe-id]
//   /scriptevent mctest4:handlers  [probe-id]
system.afterEvents.scriptEventReceive.subscribe((event) => {
  for (const [name, set, setName] of COMMANDS) {
    if (event.id === name) startFrom(event.sourceEntity, set, setName, event.message.trim() || undefined)
  }
})
