// Arity, effect-expiry, handler-write and subscribe-filter probes for minecraft/test-lib. Four sets:
//   arity         — what a member does when called with MORE arguments than its declared maximum,
//                   on a valid entity, with a correct-arity control per member in the same run
//   expiry        — where an effect's duration lands on the tick it expires: read back every tick
//                   across the boundary, from getEffect and getEffects together
//   handlerwrite  — what an out-of-range `duration` written by a world.beforeEvents.effectAdd
//                   handler does: 0, negative, non-integer, above the declared maximum
//   filters       — whether subscribe options intersect or union across fields, and which payload
//                   member entityTypes/entities read
// Each probe emits lines tagged with its probe name:
//   [mctest] <probe-name> :: <observation>
// Probes observe and report; they do not assert.
import {
  CommandPermissionLevel,
  CustomCommandStatus,
  EntityDamageCause,
  InvalidEntityError,
  system,
  world,
} from '@minecraft/server'

const PREFIX = '[mctest]'
const SHEEP = 'minecraft:sheep'
const COW = 'minecraft:cow'
const PIG = 'minecraft:pig'
const SPEED = 'minecraft:speed'
const FILTER_TAG = 'mctest_filter_marker'

const emit = (line) => {
  world.sendMessage(`${PREFIX} ${line}`)
  console.warn(`${PREFIX} ${line}`)
}

const tick = (n = 1) => new Promise((resolve) => system.runTimeout(resolve, n))

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

const describeValue = (value) => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'function') return `function(name="${value.name}" length=${value.length})`
  if (typeof value === 'object') return `object(${value.constructor?.name})`
  if (typeof value === 'string') return `string:"${value}"`
  return `${typeof value}:${String(value)}`
}

const show = (outcome) =>
  outcome.ok
    ? `ok value=${describeValue(outcome.value)}`
    : `threw name=${outcome.name} ctor=${outcome.ctor} message="${outcome.message}"`

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

const safeTypeId = (entity) => {
  try {
    return entity.typeId
  } catch {
    return '<typeId-unreadable>'
  }
}

const makeContext = (dimension, location, source) => {
  const spawned = []
  return {
    dimension,
    location,
    source,
    /** Spawns clear of the source so nothing collides with it. */
    spawn: (typeId = SHEEP, offset = { x: 0, y: 0, z: 0 }) => {
      const at = {
        x: location.x + (offset.x ?? 0),
        y: location.y + (offset.y ?? 0),
        z: location.z + (offset.z ?? 0),
      }
      const entity = dimension.spawnEntity(typeId, at)
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

/** Offsets that keep successive subjects off the source and off each other. */
const offsetFor = (index) => ({ x: ((index % 5) - 2) * 3, z: ((Math.floor(index / 5) % 5) - 2) * 3 })

/** Every declared field of an Effect, each read independently so one throw does not hide the rest. */
const readEffectObject = (effect) => {
  if (effect === undefined || effect === null) return { present: false }
  return {
    present: true,
    typeId: attempt(() => effect.typeId),
    amplifier: attempt(() => effect.amplifier),
    duration: attempt(() => effect.duration),
    displayName: attempt(() => effect.displayName),
  }
}

const durationOf = (read) => (read.present && read.duration.ok ? read.duration.value : undefined)
const amplifierOf = (read) => (read.present && read.amplifier.ok ? read.amplifier.value : undefined)

/** getEffect(SPEED) on an entity, reduced to presence plus the two numbers. */
const readSpeed = (entity) => {
  const got = attempt(() => entity.getEffect(SPEED))
  const read = got.ok ? readEffectObject(got.value) : { present: false }
  return { outcome: got, present: read.present, duration: durationOf(read), amplifier: amplifierOf(read) }
}

// ---------------------------------------------------------------------------------------------
// Set: arity
//
// Every arity observation on the record is of too FEW arguments — a zero-argument reflective sweep
// and its follow-up. Nothing has called a member with too MANY. The engine's own message declares an
// upper bound ("Expected 1-2, received 0"), but native bindings commonly ignore surplus arguments
// rather than rejecting them, so the bound in the message may be advisory.

/** Filler values appended past the declared maximum. Distinct types, so neither can be coerced. */
const FILLER = ['mctest_surplus_arg', 42]

// `max` is the declared maximum argument count from @minecraft/server 2.8.0 index.d.ts; `declared`
// is the engine's own vocabulary as it appears in the too-few-arguments message. `full` returns
// exactly `max` legal arguments, so the control call sits at the maximum and the surplus cases are
// exactly max+1 and max+2.
const ARITY_MEMBERS = [
  { name: 'getTags', declared: '0', max: 0, full: () => [] },
  { name: 'getVelocity', declared: '0', max: 0, full: () => [] },
  { name: 'getEffects', declared: '0', max: 0, full: () => [] },
  { name: 'getDynamicPropertyIds', declared: '0', max: 0, full: () => [] },
  { name: 'clearVelocity', declared: '0', max: 0, full: () => [] },
  { name: 'extinguishFire', declared: '0-1', max: 1, full: () => [false] },
  {
    name: 'addTag',
    declared: '1',
    max: 1,
    full: (ctx, label) => [`mctest_arity_${label}`],
    witness: (entity, label) => `hasTag("mctest_arity_${label}")=${json(entity.hasTag(`mctest_arity_${label}`))}`,
  },
  { name: 'hasTag', declared: '1', max: 1, full: () => ['mctest_arity_probe'] },
  { name: 'getComponent', declared: '1', max: 1, full: () => ['minecraft:health'] },
  { name: 'getEffect', declared: '1', max: 1, full: () => [SPEED] },
  { name: 'removeEffect', declared: '1', max: 1, full: () => [SPEED] },
  { name: 'triggerEvent', declared: '1', max: 1, full: () => ['minecraft:entity_born'] },
  { name: 'getDynamicProperty', declared: '1', max: 1, full: () => ['mctest_arity_prop'] },
  {
    name: 'setDynamicProperty',
    declared: '1-2',
    max: 2,
    full: (ctx, label) => ['mctest_arity_prop', ARITY_PROP_VALUE[label]],
    witness: (entity) => `getDynamicProperty("mctest_arity_prop")=${json(entity.getDynamicProperty('mctest_arity_prop'))}`,
  },
  { name: 'applyDamage', declared: '1-2', max: 2, full: () => [1, { cause: EntityDamageCause.entityAttack }] },
  { name: 'setOnFire', declared: '1-2', max: 2, full: () => [1, false] },
  { name: 'teleport', declared: '1-2', max: 2, full: (ctx) => [ctx.location, {}] },
  {
    name: 'addEffect',
    declared: '2-3',
    max: 3,
    full: (ctx, label) => [SPEED, ARITY_EFFECT_DURATION[label], { amplifier: 0, showParticles: false }],
    witness: (entity) => {
      const read = readSpeed(entity)
      return `getEffect(speed) present=${read.present} duration=${json(read.duration)}`
    },
  },
]

// Per-case values, so a witness read after the surplus call says which call landed rather than
// which call was made.
const ARITY_PROP_VALUE = { control: 1, 'plus1': 2, 'plus2': 3 }
const ARITY_EFFECT_DURATION = { control: 100, 'plus1': 200, 'plus2': 300 }

const arityVerdict = (extras, outcome) => {
  if (extras === 0) return outcome.ok ? 'CONTROL-RETURNED' : `CONTROL-THREW-${outcome.name ?? 'UNKNOWN'}`
  if (outcome.ok) return 'SURPLUS-ACCEPTED'
  if (outcome.name === 'TypeError') return 'SURPLUS-THREW-TYPE-ERROR'
  return `SURPLUS-THREW-OTHER-${outcome.name ?? 'UNKNOWN'}`
}

const arityProbes = {
  // The whole question in one probe: each member called at its declared maximum (the control) and
  // then at maximum+1 and maximum+2 on the SAME valid entity, so a throw cannot be the validity
  // guard and cannot be a bad argument — the control proves the arguments are good.
  'surplus-arguments': async (ctx) => {
    emit(
      `surplus-arguments :: ${ARITY_MEMBERS.length} Entity members × 3 cases (declared-max, max+1, max+2) ` +
        'on a VALID entity. The engine message for too few arguments declares an upper bound ' +
        '("Incorrect number of arguments to function. Expected 1-2, received 0"); this reads whether ' +
        'that upper bound is enforced. SURPLUS-ACCEPTED means surplus arguments are ignored; ' +
        'SURPLUS-THREW means the engine rejects them',
    )
    const results = []
    let index = 0
    for (const member of ARITY_MEMBERS) {
      index += 1
      const spawn = attempt(() => ctx.spawn(SHEEP, offsetFor(index)))
      if (!spawn.ok) {
        emit(`surplus-arguments :: ${member.name} SPAWN FAILED ${show(spawn)} — member skipped`)
        continue
      }
      const subject = spawn.value
      const subjectId = safeId(subject)
      const row = { member: member.name, declared: member.declared }

      for (const [label, extras] of [
        ['control', 0],
        ['plus1', 1],
        ['plus2', 2],
      ]) {
        const args = attempt(() => member.full(ctx, label))
        if (!args.ok) {
          emit(`surplus-arguments :: [${label}] ${member.name} ARGUMENT CONSTRUCTION FAILED ${show(args)}`)
          row[label] = 'ARGUMENT-CONSTRUCTION-FAILED'
          continue
        }
        const argv = [...args.value]
        for (let i = 0; i < extras; i += 1) argv.push(FILLER[i])
        const stillValid = attempt(() => subject.isValid)
        const outcome = attempt(() => subject[member.name](...argv))
        const witness = member.witness ? attempt(() => member.witness(subject, label)) : undefined
        const verdict = arityVerdict(extras, outcome)
        row[label] = verdict
        emit(
          `surplus-arguments :: [${label}] ${member.name} declared-arity=${member.declared} ` +
            `passed=${argv.length} (declared-max=${member.max}, surplus=${extras}) subject=${subjectId} ` +
            `subject-isValid=${json(stillValid.value)} ` +
            `call(${argv.map(json).join(', ')}) ${show(outcome)} ` +
            `witness=${witness ? (witness.ok ? String(witness.value) : show(witness)) : 'none'} ` +
            `verdict=${verdict}`,
        )
      }

      results.push(row)
      attempt(() => subject.isValid && subject.remove())
      await tick(1)
    }

    const controlsOk = results.filter((r) => r.control === 'CONTROL-RETURNED')
    const controlsBad = results.filter((r) => r.control !== 'CONTROL-RETURNED')
    emit(
      `surplus-arguments :: SUMMARY members=${results.length} controls-returned=${controlsOk.length} ` +
        `controls-not-returned=${controlsBad.length} ` +
        `bad-controls=[${controlsBad.map((r) => `${r.member}:${r.control}`).join(', ')}] ` +
        '— a member whose control did not return says nothing about arity; read its surplus lines as void',
    )
    for (const label of ['plus1', 'plus2']) {
      const counts = new Map()
      for (const r of results) counts.set(r[label], (counts.get(r[label]) ?? 0) + 1)
      for (const [verdict, count] of counts) {
        emit(
          `surplus-arguments :: SUMMARY ${label} ${verdict} count=${count} members=[${results
            .filter((r) => r[label] === verdict)
            .map((r) => r.member)
            .join(', ')}]`,
        )
      }
    }
    const scored = results.filter((r) => r.control === 'CONTROL-RETURNED')
    const threw = scored.filter((r) => String(r.plus1).startsWith('SURPLUS-THREW'))
    const accepted = scored.filter((r) => r.plus1 === 'SURPLUS-ACCEPTED')
    emit(
      `surplus-arguments :: SUMMARY HEADLINE max+1 SURPLUS-THREW=${threw.length}/${scored.length} ` +
        `SURPLUS-ACCEPTED=${accepted.length}/${scored.length} ` +
        `threw=[${threw.map((r) => r.member).join(', ')}] accepted=[${accepted.map((r) => r.member).join(', ')}] ` +
        '— SURPLUS-THREW on any member CONTRADICTS the spec ruling that a generated member checks ' +
        'only the minimum and lets extra arguments through; SURPLUS-ACCEPTED on all members CONFIRMS it',
    )
    const zeroArity = scored.filter((r) => r.declared === '0')
    const zeroThrew = zeroArity.filter((r) => String(r.plus1).startsWith('SURPLUS-THREW'))
    emit(
      `surplus-arguments :: SUMMARY HEADLINE zero-arity-members threw=${zeroThrew.length}/${zeroArity.length} ` +
        `members=[${zeroArity.map((r) => `${r.member}:${r.plus1}`).join(', ')}] ` +
        '— a zero-arity member has no minimum to check, so its verdict is the upper bound alone',
    )
  },
}

// ---------------------------------------------------------------------------------------------
// Set: expiry
//
// The library removes an effect on the tick its duration reaches 0, so the last readable tick reads
// 1 and 0 is never readable. That is the library's own rule; the engine's boundary is unmeasured.

const EXPIRY_DURATIONS = [3, 5, 8]
const EXPIRY_REPEATS = 2
/** Ticks read past the requested duration, so the disappearance is inside the window. */
const EXPIRY_OVERRUN = 4

const expiryProbes = {
  // Apply a short effect and read it back EVERY tick across the boundary, from getEffect and
  // getEffects together, so "the two sources agree" is observed rather than assumed.
  'effect-expiry-boundary': async (ctx) => {
    emit(
      `effect-expiry-boundary :: durations ${json(EXPIRY_DURATIONS)} × ${EXPIRY_REPEATS} repeats, ` +
        `${SPEED} amplifier 1 on a sheep, read every tick for duration+${EXPIRY_OVERRUN} ticks. ` +
        'Tick 0 is the same tick as the add — nothing is awaited between them',
    )
    const runs = []
    let index = 0
    for (const requested of EXPIRY_DURATIONS) {
      for (let repeat = 0; repeat < EXPIRY_REPEATS; repeat += 1) {
        index += 1
        const label = `d${requested}/r${repeat}`
        const spawn = attempt(() => ctx.spawn(SHEEP, offsetFor(index)))
        if (!spawn.ok) {
          emit(`effect-expiry-boundary :: [${label}] SPAWN FAILED ${show(spawn)} — case skipped`)
          continue
        }
        const subject = spawn.value
        const subjectId = safeId(subject)
        attempt(() => subject.removeEffect(SPEED))
        const added = attempt(() =>
          subject.addEffect(SPEED, requested, { amplifier: 1, showParticles: false }),
        )
        if (!added.ok) {
          emit(`effect-expiry-boundary :: [${label}] addEffect ${show(added)} — case skipped`)
          attempt(() => subject.remove())
          continue
        }
        const returned = added.value

        const samples = []
        for (let t = 0; t <= requested + EXPIRY_OVERRUN; t += 1) {
          if (t > 0) await tick(1)
          const single = readSpeed(subject)
          const list = attempt(() => subject.getEffects())
          let listPresent = false
          let listDuration
          let listCount
          if (list.ok) {
            const all = list.value ?? []
            listCount = all.length
            for (const effect of all) {
              const read = readEffectObject(effect)
              if (read.present && read.typeId.ok && read.typeId.value === SPEED) {
                listPresent = true
                listDuration = durationOf(read)
              }
            }
          }
          // The Effect object addEffect handed back: does it track the entity, or is it a snapshot?
          const fromReturn = attempt(() => returned?.duration)
          const agree = single.present === listPresent && single.duration === listDuration
          samples.push({ t, present: single.present, duration: single.duration, listPresent, listDuration, agree })
          emit(
            `effect-expiry-boundary :: [${label}] tick=${t} subject=${subjectId} ` +
              `getEffect present=${single.present} duration=${json(single.duration)} ` +
              `amplifier=${json(single.amplifier)} ` +
              `getEffects speed-present=${listPresent} duration=${json(listDuration)} count=${json(listCount)} ` +
              `addEffect-return.duration=${fromReturn.ok ? json(fromReturn.value) : show(fromReturn)} ` +
              `sources-agree=${agree}`,
          )
        }

        const present = samples.filter((s) => s.present)
        const lastPresent = present.length > 0 ? present[present.length - 1] : undefined
        const firstAbsent = samples.find((s) => !s.present && s.t > (lastPresent?.t ?? -1))
        const zeroSeen = present.filter((s) => s.duration === 0).map((s) => s.t)
        const disagreements = samples.filter((s) => !s.agree).map((s) => s.t)
        const lastDuration = lastPresent?.duration
        const verdict =
          firstAbsent === undefined
            ? 'STILL-PRESENT-AT-END-OF-WINDOW (the window was too short to see the boundary)'
            : zeroSeen.length > 0
              ? 'CONTRADICTS-SPEC-DURATION-0-WAS-READABLE'
              : lastDuration === 1
                ? 'MATCHES-SPEC-LAST-READ-1'
                : `CONTRADICTS-SPEC-LAST-READ-${json(lastDuration)}`
        emit(
          `effect-expiry-boundary :: SUMMARY [${label}] requested=${requested} ` +
            `durations=[${samples.map((s) => (s.present ? String(s.duration) : 'absent')).join(', ')}] ` +
            `last-present-tick=${json(lastPresent?.t)} last-readable-duration=${json(lastDuration)} ` +
            `first-absent-tick=${json(firstAbsent?.t)} duration-0-read-at-ticks=${json(zeroSeen)} ` +
            `source-disagreements-at-ticks=${json(disagreements)} verdict=${verdict}`,
        )
        runs.push({ label, requested, lastDuration, firstAbsentTick: firstAbsent?.t, zeroSeen, disagreements, verdict })

        attempt(() => subject.isValid && subject.remove())
        await tick(2)
      }
    }

    const anyZero = runs.filter((r) => r.zeroSeen.length > 0)
    const lastDurations = runs.map((r) => `${r.label}=>${json(r.lastDuration)}`)
    emit(
      `effect-expiry-boundary :: SUMMARY cases=${runs.length} ` +
        `last-readable-duration=[${lastDurations.join(', ')}] ` +
        `cases-where-duration-0-was-readable=${anyZero.length} ` +
        `disagreeing-cases=${runs.filter((r) => r.disagreements.length > 0).length}`,
      )
    emit(
      `effect-expiry-boundary :: SUMMARY HEADLINE duration-0-ever-readable=${anyZero.length > 0} ` +
        `last-readable-duration-always-1=${runs.length > 0 && runs.every((r) => r.lastDuration === 1)} ` +
        '— the spec has the library remove an effect on the tick its duration reaches 0, so the last ' +
        'readable tick reads 1 and 0 is never readable. A readable 0, or a last readable duration ' +
        'other than 1, CONTRADICTS that ruling',
    )
    emit(
      `effect-expiry-boundary :: SUMMARY HEADLINE requested-vs-first-tick=[${runs
        .map((r) => `${r.label}: absent-at-tick=${json(r.firstAbsentTick)} requested=${r.requested}`)
        .join(', ')}] — where the disappearance falls relative to the requested duration`,
    )
  },
}

// ---------------------------------------------------------------------------------------------
// Set: handlerwrite
//
// In-range writes are already on the record. The spec normalises a handler's write — truncate
// toward zero, then bounds-check 1…20000000, and an out-of-range result produces no effect. What
// the engine does with an out-of-range write is unobserved.

const HANDLER_REQUESTED = 400
const HANDLER_AMPLIFIER = 2

/**
 * `predicted` is what the spec's normalisation says: a number means an effect with that duration,
 * 'NO-EFFECT' means addEffect returns undefined and nothing is on the entity.
 */
const HANDLER_WRITE_CASES = [
  { label: 'control-in-range', write: 300, predicted: 300 },
  { label: 'zero', write: 0, predicted: 'NO-EFFECT' },
  { label: 'negative-one', write: -1, predicted: 'NO-EFFECT' },
  { label: 'negative-large', write: -400, predicted: 'NO-EFFECT' },
  { label: 'non-integer-small', write: 2.5, predicted: 2 },
  { label: 'non-integer-large', write: 300.7, predicted: 300 },
  { label: 'above-max', write: 20000001, predicted: 'NO-EFFECT' },
  { label: 'far-above-max', write: 100000000, predicted: 'NO-EFFECT' },
  { label: 'at-max', write: 20000000, predicted: 20000000 },
  { label: 'not-a-number', write: NaN, predicted: 'NO-EFFECT' },
  { label: 'infinity', write: Infinity, predicted: 'NO-EFFECT' },
]

/** Subscribes, runs the body, and unsubscribes in a finally whatever the body does. */
const withBeforeHandler = async (signal, handler, body) => {
  const subscribed = attempt(() => signal.subscribe(handler))
  if (!subscribed.ok) return { subscribed: false, outcome: subscribed }
  try {
    return { subscribed: true, outcome: await body() }
  } finally {
    attempt(() => signal.unsubscribe(subscribed.value))
  }
}

const handlerWriteProbes = {
  // addEffect under a beforeEvents.effectAdd handler that writes an out-of-range duration. The
  // handler sets its own flag, so "the engine ignored the write" and "the before-event never fired"
  // stay separable — the trap the earlier before-event probe hit.
  'out-of-range-duration-write': async (ctx) => {
    emit(
      `out-of-range-duration-write :: ${HANDLER_WRITE_CASES.length} cases; requested duration=${HANDLER_REQUESTED}, ` +
        `amplifier=${HANDLER_AMPLIFIER}; EffectAddBeforeEvent.duration is declared mutable in 2.8.0 ` +
        '(index.d.ts:8215, no readonly). Every case reports handler-ran separately from the readback',
    )
    const results = []
    let index = 0
    for (const testCase of HANDLER_WRITE_CASES) {
      index += 1
      const spawn = attempt(() => ctx.spawn(SHEEP, offsetFor(index)))
      if (!spawn.ok) {
        emit(`out-of-range-duration-write :: [${testCase.label}] SPAWN FAILED ${show(spawn)} — case skipped`)
        continue
      }
      const subject = spawn.value
      const subjectId = safeId(subject)
      attempt(() => subject.removeEffect(SPEED))

      let handlerRan = false
      const notes = []
      const handler = (event) => {
        try {
          if (safeId(event.entity) !== subjectId) return
          handlerRan = true
          notes.push(`handler-entered duration-as-delivered=${json(attempt(() => event.duration).value)}`)
          const wrote = attempt(() => {
            event.duration = testCase.write
          })
          notes.push(
            wrote.ok
              ? `wrote duration=${String(testCase.write)} readback-in-handler=${json(attempt(() => event.duration).value)}`
              : `write threw ${show(wrote)} (DELIBERATE-THROW-CANDIDATE: the write itself was rejected, not the add)`,
          )
        } catch (error) {
          notes.push(`handler-threw ${String(error?.message ?? error)}`)
        }
      }

      const { subscribed, outcome } = await withBeforeHandler(
        world.beforeEvents.effectAdd,
        handler,
        async () => {
          const returned = attempt(() =>
            subject.addEffect(SPEED, HANDLER_REQUESTED, {
              amplifier: HANDLER_AMPLIFIER,
              showParticles: false,
            }),
          )
          // Same tick as the add: nothing is awaited before this read, so a duration truncated to a
          // very small number is still readable.
          const immediate = readSpeed(subject)
          await tick(2)
          const later = readSpeed(subject)
          return { returned, immediate, later }
        },
      )
      if (!subscribed) {
        emit(`out-of-range-duration-write :: [${testCase.label}] subscribe ${show(outcome)} — case skipped`)
        attempt(() => subject.remove())
        continue
      }

      const { returned, immediate, later } = outcome
      const truncated = Math.trunc(testCase.write)
      const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 2
      const verdict = !returned.ok
        ? `ADD-THREW-${returned.name ?? 'UNKNOWN'}`
        : !handlerRan
          ? 'BEFORE-EVENT-NOT-RAISED (the handler never ran for this entity, so nothing here bears on the write)'
          : !immediate.present && returned.value === undefined
            ? 'NO-EFFECT'
            : !immediate.present
              ? 'RETURNED-AN-EFFECT-BUT-NOTHING-ON-THE-ENTITY'
              : near(immediate.duration, truncated)
                ? `WRITE-TOOK-AS-WRITTEN-${json(truncated)}`
                : near(immediate.duration, HANDLER_REQUESTED)
                  ? 'WRITE-IGNORED (the effect carries the duration the probe requested)'
                  : `EFFECT-PRESENT-OTHER-DURATION-${json(immediate.duration)}`

      const matchesSpec =
        testCase.predicted === 'NO-EFFECT'
          ? verdict === 'NO-EFFECT'
          : verdict === `WRITE-TOOK-AS-WRITTEN-${json(testCase.predicted)}`

      emit(
        `out-of-range-duration-write :: [${testCase.label}] subject=${subjectId} ` +
          `requested=${HANDLER_REQUESTED} handler-writes-duration=${String(testCase.write)} ` +
          `truncated-toward-zero=${String(truncated)} handler-ran=${handlerRan} ` +
          `addEffect ${show(returned)} returned-effect=${returned.ok ? String(returned.value !== undefined) : 'n/a'} ` +
          `immediate(present=${immediate.present} duration=${json(immediate.duration)} amplifier=${json(immediate.amplifier)}) ` +
          `after-2-ticks(present=${later.present} duration=${json(later.duration)} amplifier=${json(later.amplifier)}) ` +
          `spec-predicts=${json(testCase.predicted)} matches-spec=${matchesSpec} verdict=${verdict}`,
      )
      emit(`out-of-range-duration-write :: [${testCase.label}] handler-notes=[${notes.join(' | ')}]`)

      results.push({ label: testCase.label, handlerRan, verdict, matchesSpec, predicted: testCase.predicted })
      attempt(() => subject.isValid && subject.remove())
      await tick(2)
    }

    const notRaised = results.filter((r) => !r.handlerRan)
    emit(
      `out-of-range-duration-write :: SUMMARY cases=${results.length} handler-ran=${results.length - notRaised.length} ` +
        `handler-never-ran=[${notRaised.map((r) => r.label).join(', ')}] ` +
        '— a case whose handler never ran scores nothing; rerun before reading it',
    )
    const control = results.find((r) => r.label === 'control-in-range')
    emit(
      `out-of-range-duration-write :: SUMMARY control-in-range verdict=${json(control?.verdict)} ` +
        'matches-the-existing-record=' +
        `${json(control?.verdict === 'WRITE-TOOK-AS-WRITTEN-300')} ` +
        '— the control must show an in-range write taking, or the run says nothing about out-of-range ones',
    )
    for (const row of results) {
      emit(
        `out-of-range-duration-write :: SUMMARY [${row.label}] spec-predicts=${json(row.predicted)} ` +
          `observed=${row.verdict} matches-spec=${row.matchesSpec}`,
      )
    }
    const scored = results.filter((r) => r.handlerRan)
    const contradicting = scored.filter((r) => !r.matchesSpec)
    emit(
      `out-of-range-duration-write :: SUMMARY HEADLINE matches-spec=${scored.length - contradicting.length}/${scored.length} ` +
        `contradicting=[${contradicting.map((r) => `${r.label}:${r.verdict}`).join(', ')}] ` +
        '— the spec truncates the write toward zero, bounds-checks 1…20000000, and produces no effect ' +
        'when the result is out of range. Any out-of-range case that leaves an effect on the entity, ' +
        'and any non-integer case whose duration is not the truncated value, CONTRADICTS that ruling',
    )
  },
}

// ---------------------------------------------------------------------------------------------
// Set: filters
//
// The fakes honour four filter fields and INTERSECT them. Two things are guesses: whether the
// engine intersects or unions across fields, and which payload member each field reads.

/** Subscribes every spec, runs the body, and unsubscribes all of them in a finally. */
const withFilteredHandlers = async (signal, specs, stage, body) => {
  const live = []
  try {
    for (const spec of specs) {
      spec.received = []
      spec.foreign = []
      const options = spec.options ? attempt(() => spec.options(stage)) : { ok: true, value: undefined }
      if (!options.ok) {
        spec.subscribe = options
        continue
      }
      const handler = (event) => {
        try {
          const row = spec.record(event, stage)
          if (row.label === undefined) spec.foreign.push(row)
          else spec.received.push(row)
        } catch (error) {
          spec.received.push({ label: 'HANDLER-THREW', detail: String(error?.message ?? error) })
        }
      }
      spec.handler = handler
      spec.subscribe = attempt(() =>
        options.value === undefined ? signal.subscribe(handler) : signal.subscribe(handler, options.value),
      )
      if (spec.subscribe.ok) live.push(spec)
    }
    await body()
  } finally {
    for (const spec of live) attempt(() => signal.unsubscribe(spec.subscribe.value))
  }
}

const receivedLabels = (spec) => spec.received.map((r) => r.label)
const gotEvent = (spec, label) => spec.received.some((r) => r.label === label)

const filterProbes = {
  // entityHurt with entityTypes, allowedDamageCauses and entities, alone and in combination. The
  // headline pair is a handler whose entityTypes matches while its allowedDamageCauses does not,
  // and the reverse: intersect predicts no delivery, union predicts delivery.
  'hurt-filter-semantics': async (ctx) => {
    emit(
      'hurt-filter-semantics :: world.afterEvents.entityHurt with EntityHurtAfterEventOptions ' +
        '(entityTypes, allowedDamageCauses, entities). Four real events are driven; every handler ' +
        'reports which of them it received',
    )
    const sheepA = attempt(() => ctx.spawn(SHEEP, { x: 3, z: 0 }))
    const sheepB = attempt(() => ctx.spawn(SHEEP, { x: -3, z: 0 }))
    const cow = attempt(() => ctx.spawn(COW, { x: 0, z: 3 }))
    const pig = attempt(() => ctx.spawn(PIG, { x: 0, z: -3 }))
    if (!sheepA.ok || !sheepB.ok || !cow.ok || !pig.ok) {
      emit(
        `hurt-filter-semantics :: SPAWN FAILED sheepA=${show(sheepA)} sheepB=${show(sheepB)} ` +
          `cow=${show(cow)} pig=${show(pig)} — probe cannot run`,
      )
      return
    }
    const stage = { sheepA: sheepA.value, sheepB: sheepB.value, cow: cow.value, pig: pig.value }
    const ids = {
      sheepA: safeId(stage.sheepA),
      sheepB: safeId(stage.sheepB),
      cow: safeId(stage.cow),
      pig: safeId(stage.pig),
    }
    // sheepA alone carries the tag, so an entityFilter of {tags:[FILTER_TAG]} names sheepA and
    // nothing else — the field the subscribe decision's union falsifier pairs with entityTypes.
    const tagged = attempt(() => stage.sheepA.addTag(FILTER_TAG))
    emit(
      `hurt-filter-semantics :: stage sheepA=${ids.sheepA} sheepB=${ids.sheepB} cow=${ids.cow} pig=${ids.pig} ` +
        `sheepA.addTag("${FILTER_TAG}") ${show(tagged)}`,
    )

    // An event is identified by (hurt entity, damage cause) — sheepA is hurt twice with different
    // causes, so the pair is unique across the four driven events.
    const EVENTS = [
      { label: 'sheepA-entityAttack-by-pig', victim: 'sheepA', cause: EntityDamageCause.entityAttack, damager: 'pig' },
      { label: 'sheepB-entityAttack-by-pig', victim: 'sheepB', cause: EntityDamageCause.entityAttack, damager: 'pig' },
      { label: 'cow-entityAttack-by-pig', victim: 'cow', cause: EntityDamageCause.entityAttack, damager: 'pig' },
      { label: 'sheepA-lava-no-damager', victim: 'sheepA', cause: EntityDamageCause.lava, damager: undefined },
    ]
    const labelFor = (hurtId, cause) =>
      EVENTS.find((e) => ids[e.victim] === hurtId && e.cause === cause)?.label

    const record = (event) => {
      const hurtId = safeId(event.hurtEntity)
      const hurtType = safeTypeId(event.hurtEntity)
      const cause = attempt(() => event.damageSource?.cause).value
      const damaging = attempt(() => event.damageSource?.damagingEntity).value
      return {
        label: labelFor(hurtId, cause),
        hurtId,
        hurtType,
        cause,
        damagingType: damaging === undefined ? undefined : safeTypeId(damaging),
        damage: attempt(() => event.damage).value,
      }
    }

    const specs = [
      { label: 'no-options', describe: 'no options — the control; must receive all four', options: undefined },
      { label: 'types-sheep', describe: "entityTypes=['minecraft:sheep']", options: () => ({ entityTypes: [SHEEP] }) },
      { label: 'types-sheep-unqualified', describe: "entityTypes=['sheep']", options: () => ({ entityTypes: ['sheep'] }) },
      { label: 'types-cow', describe: "entityTypes=['minecraft:cow']", options: () => ({ entityTypes: [COW] }) },
      {
        label: 'types-pig',
        describe: "entityTypes=['minecraft:pig'] — the pig is only ever the DAMAGING entity, never the hurt one",
        options: () => ({ entityTypes: [PIG] }),
      },
      {
        label: 'cause-entityAttack',
        describe: 'allowedDamageCauses=[entityAttack]',
        options: () => ({ allowedDamageCauses: [EntityDamageCause.entityAttack] }),
      },
      {
        label: 'cause-lava',
        describe: 'allowedDamageCauses=[lava]',
        options: () => ({ allowedDamageCauses: [EntityDamageCause.lava] }),
      },
      {
        label: 'types-sheep+cause-entityAttack',
        describe: 'entityTypes=[sheep] AND allowedDamageCauses=[entityAttack] — both match on two events; the run-validity case',
        options: () => ({ entityTypes: [SHEEP], allowedDamageCauses: [EntityDamageCause.entityAttack] }),
      },
      {
        label: 'types-sheep+cause-lava',
        describe: 'entityTypes=[sheep] AND allowedDamageCauses=[lava] — HEADLINE: type matches but cause does not on the entityAttack events',
        options: () => ({ entityTypes: [SHEEP], allowedDamageCauses: [EntityDamageCause.lava] }),
      },
      {
        label: 'types-cow+cause-lava',
        describe: 'entityTypes=[cow] AND allowedDamageCauses=[lava] — HEADLINE reverse: neither field matches any one event fully',
        options: () => ({ entityTypes: [COW], allowedDamageCauses: [EntityDamageCause.lava] }),
      },
      {
        label: 'entities-sheepA',
        describe: 'entities=[sheepA]',
        options: (s) => ({ entities: [s.sheepA] }),
      },
      {
        label: 'entities-sheepB',
        describe: 'entities=[sheepB] — a second entity of the same type',
        options: (s) => ({ entities: [s.sheepB] }),
      },
      {
        label: 'entities-sheepA+types-cow',
        describe: 'entities=[sheepA] AND entityTypes=[cow] — HEADLINE: instance and type name different entities',
        options: (s) => ({ entities: [s.sheepA], entityTypes: [COW] }),
      },
      {
        label: 'filter-tag-sheepA',
        describe: `entityFilter={tags:['${FILTER_TAG}']} — only sheepA carries the tag; the run-validity case for entityFilter`,
        options: () => ({ entityFilter: { tags: [FILTER_TAG] } }),
      },
      {
        label: 'types-cow+filter-tag-sheepA',
        describe: `entityTypes=[cow] AND entityFilter={tags:['${FILTER_TAG}']} — HEADLINE: the exact pair the decision's union falsifier names`,
        options: () => ({ entityTypes: [COW], entityFilter: { tags: [FILTER_TAG] } }),
      },
    ]
    for (const spec of specs) spec.record = record

    const driven = []
    await withFilteredHandlers(world.afterEvents.entityHurt, specs, stage, async () => {
      for (const event of EVENTS) {
        const victim = stage[event.victim]
        const options =
          event.damager === undefined
            ? { cause: event.cause }
            : { cause: event.cause, damagingEntity: stage[event.damager] }
        const applied = attempt(() => victim.applyDamage(2, options))
        driven.push({ label: event.label, applied })
        emit(
          `hurt-filter-semantics :: drove [${event.label}] applyDamage(2, ${json({ cause: event.cause, damagingEntity: event.damager })}) ` +
            `${show(applied)} — a false return means no hurt event was raised at all (damage immunity)`,
        )
        // Well past the damage-immunity window, so a second hurt on the same entity lands.
        await tick(20)
      }
      await tick(4)
    })

    for (const spec of specs) {
      if (!spec.subscribe?.ok) {
        emit(`hurt-filter-semantics :: [${spec.label}] SUBSCRIBE FAILED ${show(spec.subscribe)} — handler scores nothing`)
        continue
      }
      for (const row of spec.received) {
        emit(
          `hurt-filter-semantics :: [${spec.label}] delivery event=${row.label} hurt=${row.hurtId} ` +
            `hurtType=${row.hurtType} cause=${json(row.cause)} damagingType=${json(row.damagingType)} ` +
            `damage=${json(row.damage)}`,
        )
      }
      emit(
        `hurt-filter-semantics :: SUMMARY [${spec.label}] options=${json(spec.describe)} ` +
          `received=${json(receivedLabels(spec))} count=${spec.received.length} ` +
          `foreign-deliveries=${spec.foreign.length}`,
      )
    }

    const control = specs.find((s) => s.label === 'no-options')
    emit(
      `hurt-filter-semantics :: SUMMARY RUN-VALIDITY control-no-options-received=${json(receivedLabels(control))} ` +
        `expected=${json(EVENTS.map((e) => e.label))} ` +
        `applyDamage-returns=${json(driven.map((d) => `${d.label}=>${d.applied.ok ? String(d.applied.value) : 'threw'}`))} ` +
        '— a control missing an event means the event never happened; nothing downstream of it counts',
    )
    const bothMatch = specs.find((s) => s.label === 'types-sheep+cause-entityAttack')
    emit(
      `hurt-filter-semantics :: SUMMARY RUN-VALIDITY both-fields-match received=${json(receivedLabels(bothMatch))} ` +
        '— this handler must receive the two sheep entityAttack events. If it receives nothing, the ' +
        'entityTypes string format or the cause enum is wrong and the intersect/union reading is void ' +
        `(compare types-sheep=${json(receivedLabels(specs.find((s) => s.label === 'types-sheep')))} against ` +
        `types-sheep-unqualified=${json(receivedLabels(specs.find((s) => s.label === 'types-sheep-unqualified')))})`,
    )

    const typeMatchCauseNot = specs.find((s) => s.label === 'types-sheep+cause-lava')
    const unionSignal =
      gotEvent(typeMatchCauseNot, 'sheepA-entityAttack-by-pig') || gotEvent(typeMatchCauseNot, 'sheepB-entityAttack-by-pig')
    emit(
      `hurt-filter-semantics :: SUMMARY HEADLINE intersect-vs-union handler=types-sheep+cause-lava ` +
        `received=${json(receivedLabels(typeMatchCauseNot))} ` +
        `received-an-entityAttack-event=${unionSignal} ` +
        '— receiving ONLY sheepA-lava-no-damager is INTERSECT and CONFIRMS the spec; also receiving an ' +
        'entityAttack event is UNION and CONTRADICTS it; receiving nothing at all means the cause ' +
        'filter never matches and the case is void',
    )
    const instanceVsType = specs.find((s) => s.label === 'entities-sheepA+types-cow')
    emit(
      `hurt-filter-semantics :: SUMMARY HEADLINE intersect-vs-union handler=entities-sheepA+types-cow ` +
        `received=${json(receivedLabels(instanceVsType))} ` +
        '— nothing at all is INTERSECT and CONFIRMS the spec (no event is both sheepA and a cow); ' +
        'receiving sheepA events or the cow event is UNION and CONTRADICTS it',
    )
    const filterOnly = specs.find((s) => s.label === 'filter-tag-sheepA')
    const typesPlusFilter = specs.find((s) => s.label === 'types-cow+filter-tag-sheepA')
    emit(
      `hurt-filter-semantics :: SUMMARY HEADLINE intersect-vs-union handler=types-cow+filter-tag-sheepA ` +
        `received=${json(receivedLabels(typesPlusFilter))} count=${typesPlusFilter.received.length} ` +
        `entityFilter-alone-received=${json(receivedLabels(filterOnly))} ` +
        '— nothing at all is INTERSECT and CONFIRMS the spec (no event is both a cow and the tagged ' +
        'sheep); receiving the sheepA events or the cow event is UNION and CONTRADICTS it. If ' +
        'entityFilter alone received nothing, the tag filter never matched and this case is void',
    )
    const damagingType = specs.find((s) => s.label === 'types-pig')
    emit(
      `hurt-filter-semantics :: SUMMARY HEADLINE which-entity-does-entityTypes-read handler=types-pig ` +
        `received=${json(receivedLabels(damagingType))} count=${damagingType.received.length} ` +
        '— any delivery means entityTypes reads the DAMAGING entity (no pig is ever hurt); silence ' +
        'means it reads the hurt entity, which is what the spec assumes',
    )
    const entitiesA = specs.find((s) => s.label === 'entities-sheepA')
    const entitiesB = specs.find((s) => s.label === 'entities-sheepB')
    emit(
      `hurt-filter-semantics :: SUMMARY HEADLINE entities-instance-filter sheepA=${json(receivedLabels(entitiesA))} ` +
        `sheepB=${json(receivedLabels(entitiesB))} ` +
        '— each must receive only its own entity\'s events. A handler receiving the other sheep\'s ' +
        'events means entities is read as a type filter, not an instance filter',
    )
  },

  // entityDie with EntityEventOptions, whose two fields are entityTypes and entities. Setting them
  // to a type and to an instance of a DIFFERENT type is a second intersect-versus-union reading,
  // independent of the damage-cause one.
  'die-filter-semantics': async (ctx) => {
    emit(
      'die-filter-semantics :: world.afterEvents.entityDie with EntityEventOptions (entityTypes, ' +
        'entities). Three deaths are driven; every handler reports which of them it received',
    )
    const sheepVictim = attempt(() => ctx.spawn(SHEEP, { x: 4, z: 4 }))
    const sheepOther = attempt(() => ctx.spawn(SHEEP, { x: -4, z: 4 }))
    const cowVictim = attempt(() => ctx.spawn(COW, { x: 4, z: -4 }))
    const pig = attempt(() => ctx.spawn(PIG, { x: -4, z: -4 }))
    if (!sheepVictim.ok || !sheepOther.ok || !cowVictim.ok || !pig.ok) {
      emit(
        `die-filter-semantics :: SPAWN FAILED sheepVictim=${show(sheepVictim)} sheepOther=${show(sheepOther)} ` +
          `cowVictim=${show(cowVictim)} pig=${show(pig)} — probe cannot run`,
      )
      return
    }
    const stage = {
      sheepVictim: sheepVictim.value,
      sheepOther: sheepOther.value,
      cowVictim: cowVictim.value,
      pig: pig.value,
    }
    const ids = {
      sheepVictim: safeId(stage.sheepVictim),
      sheepOther: safeId(stage.sheepOther),
      cowVictim: safeId(stage.cowVictim),
    }
    emit(
      `die-filter-semantics :: stage sheepVictim=${ids.sheepVictim} sheepOther=${ids.sheepOther} ` +
        `cowVictim=${ids.cowVictim} pig=${safeId(stage.pig)}`,
    )

    const DEATHS = ['sheepVictim', 'sheepOther', 'cowVictim']
    const labelFor = (deadId) => DEATHS.find((name) => ids[name] === deadId)

    const record = (event) => {
      const deadId = safeId(event.deadEntity)
      return {
        label: labelFor(deadId),
        deadId,
        deadType: safeTypeId(event.deadEntity),
        cause: attempt(() => event.damageSource?.cause).value,
      }
    }

    const specs = [
      { label: 'no-options', describe: 'no options — the control; must receive all three', options: undefined },
      { label: 'types-sheep', describe: "entityTypes=['minecraft:sheep']", options: () => ({ entityTypes: [SHEEP] }) },
      { label: 'types-cow', describe: "entityTypes=['minecraft:cow']", options: () => ({ entityTypes: [COW] }) },
      {
        label: 'entities-sheepVictim',
        describe: 'entities=[sheepVictim]',
        options: (s) => ({ entities: [s.sheepVictim] }),
      },
      {
        label: 'entities-sheepOther',
        describe: 'entities=[sheepOther] — a second entity of the same type',
        options: (s) => ({ entities: [s.sheepOther] }),
      },
      {
        label: 'types-sheep+entities-cowVictim',
        describe: 'entityTypes=[sheep] AND entities=[cowVictim] — HEADLINE: no death is both',
        options: (s) => ({ entityTypes: [SHEEP], entities: [s.cowVictim] }),
      },
      {
        label: 'types-sheep+entities-sheepOther',
        describe: 'entityTypes=[sheep] AND entities=[sheepOther] — intersect delivers one death, union delivers two',
        options: (s) => ({ entityTypes: [SHEEP], entities: [s.sheepOther] }),
      },
    ]
    for (const spec of specs) spec.record = record

    const driven = []
    await withFilteredHandlers(world.afterEvents.entityDie, specs, stage, async () => {
      for (const name of DEATHS) {
        const applied = attempt(() =>
          stage[name].applyDamage(1000, {
            cause: EntityDamageCause.entityAttack,
            damagingEntity: stage.pig,
          }),
        )
        driven.push({ label: name, applied })
        emit(`die-filter-semantics :: drove [${name}] applyDamage(1000, entityAttack by pig) ${show(applied)}`)
        await tick(10)
      }
      await tick(10)
    })

    for (const spec of specs) {
      if (!spec.subscribe?.ok) {
        emit(`die-filter-semantics :: [${spec.label}] SUBSCRIBE FAILED ${show(spec.subscribe)} — handler scores nothing`)
        continue
      }
      for (const row of spec.received) {
        emit(
          `die-filter-semantics :: [${spec.label}] delivery event=${row.label} dead=${row.deadId} ` +
            `deadType=${row.deadType} cause=${json(row.cause)}`,
        )
      }
      emit(
        `die-filter-semantics :: SUMMARY [${spec.label}] options=${json(spec.describe)} ` +
          `received=${json(receivedLabels(spec))} count=${spec.received.length} ` +
          `foreign-deliveries=${spec.foreign.length}`,
      )
    }

    const control = specs.find((s) => s.label === 'no-options')
    emit(
      `die-filter-semantics :: SUMMARY RUN-VALIDITY control-no-options-received=${json(receivedLabels(control))} ` +
        `expected=${json(DEATHS)} ` +
        `applyDamage-returns=${json(driven.map((d) => `${d.label}=>${d.applied.ok ? String(d.applied.value) : 'threw'}`))} ` +
        '— a death missing from the control never happened; nothing downstream of it counts',
    )
    const crossed = specs.find((s) => s.label === 'types-sheep+entities-cowVictim')
    emit(
      `die-filter-semantics :: SUMMARY HEADLINE intersect-vs-union handler=types-sheep+entities-cowVictim ` +
        `received=${json(receivedLabels(crossed))} count=${crossed.received.length} ` +
        '— nothing at all is INTERSECT and CONFIRMS the spec; receiving the sheep deaths or the cow ' +
        'death is UNION and CONTRADICTS it',
    )
    const narrowed = specs.find((s) => s.label === 'types-sheep+entities-sheepOther')
    emit(
      `die-filter-semantics :: SUMMARY HEADLINE intersect-vs-union handler=types-sheep+entities-sheepOther ` +
        `received=${json(receivedLabels(narrowed))} count=${narrowed.received.length} ` +
        '— sheepOther alone is INTERSECT and CONFIRMS the spec; both sheep deaths is UNION and ' +
        'CONTRADICTS it',
    )
    const entitiesOne = specs.find((s) => s.label === 'entities-sheepVictim')
    const entitiesTwo = specs.find((s) => s.label === 'entities-sheepOther')
    emit(
      `die-filter-semantics :: SUMMARY HEADLINE entities-instance-filter sheepVictim=${json(receivedLabels(entitiesOne))} ` +
        `sheepOther=${json(receivedLabels(entitiesTwo))} ` +
        '— each must receive only its own death; receiving the other sheep\'s death means entities is ' +
        'read as a type filter',
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
  ['mctest8:arity', arityProbes, 'arity', 'Call Entity members with more arguments than their declared maximum'],
  ['mctest8:expiry', expiryProbes, 'expiry', 'Read an effect back every tick across its expiry boundary'],
  [
    'mctest8:handlerwrite',
    handlerWriteProbes,
    'handlerwrite',
    'Write an out-of-range duration from a beforeEvents.effectAdd handler',
  ],
  ['mctest8:filters', filterProbes, 'filters', 'Do subscribe options intersect or union, and which entity do they read?'],
]

system.beforeEvents.startup.subscribe((event) => {
  const registry = event.customCommandRegistry
  for (const [name, set, setName, description] of COMMANDS) {
    registry.registerCommand(
      { name, description, permissionLevel: CommandPermissionLevel.GameDirectors },
      (origin) => {
        startFrom(origin.sourceEntity, set, setName)
        return { status: CustomCommandStatus.Success, message: `mctest ${setName} probes started` }
      },
    )
  }
})

// Fallback triggers:
//   /scriptevent mctest8:arity [probe-id]
//   /scriptevent mctest8:expiry [probe-id]
//   /scriptevent mctest8:handlerwrite [probe-id]
//   /scriptevent mctest8:filters [probe-id]
system.afterEvents.scriptEventReceive.subscribe((event) => {
  for (const [name, set, setName] of COMMANDS) {
    if (event.id === name) {
      startFrom(event.sourceEntity, set, setName, event.message.trim() || undefined)
      return
    }
  }
})
