// Effect display-name probes for minecraft/test-lib. Two sets:
//   effectnames  — the Effect.displayName mapping: every vanilla effect type added to a live
//                  subject at amplifiers 0..6, with displayName, typeId, amplifier and duration
//                  read back in the same tick as the add
//   effectbounds — the amplifier and duration ranges addEffect actually accepts, and the error
//                  raised at each boundary
// Each probe emits lines tagged with its probe name:
//   [mctest] <probe-name> :: <observation>
// Probes observe and report; they do not assert.
import {
  CommandPermissionLevel,
  CustomCommandStatus,
  EffectTypes,
  InvalidEntityError,
  system,
  world,
} from '@minecraft/server'

const PREFIX = '[mctest]'
const SHEEP = 'minecraft:sheep'

// Transcribed from the pinned @minecraft/vanilla-data 1.26.33 enum MinecraftEffectTypes
// (../type-probes/node_modules/@minecraft/vanilla-data/lib/mojang-effect.d.ts). The pack does not
// import vanilla-data: no earlier pack resolves it on the server and it is not a manifest
// dependency. effect-type-registry-survey diffs this list against EffectTypes.getAll().
const VANILLA_EFFECT_IDS = [
  'minecraft:absorption',
  'minecraft:bad_omen',
  'minecraft:blindness',
  'minecraft:breath_of_the_nautilus',
  'minecraft:conduit_power',
  'minecraft:darkness',
  'minecraft:fatal_poison',
  'minecraft:fire_resistance',
  'minecraft:haste',
  'minecraft:health_boost',
  'minecraft:hunger',
  'minecraft:infested',
  'minecraft:instant_damage',
  'minecraft:instant_health',
  'minecraft:invisibility',
  'minecraft:jump_boost',
  'minecraft:levitation',
  'minecraft:mining_fatigue',
  'minecraft:nausea',
  'minecraft:night_vision',
  'minecraft:oozing',
  'minecraft:poison',
  'minecraft:raid_omen',
  'minecraft:regeneration',
  'minecraft:resistance',
  'minecraft:saturation',
  'minecraft:slow_falling',
  'minecraft:slowness',
  'minecraft:speed',
  'minecraft:strength',
  'minecraft:trial_omen',
  'minecraft:village_hero',
  'minecraft:water_breathing',
  'minecraft:weakness',
  'minecraft:weaving',
  'minecraft:wind_charged',
  'minecraft:wither',
]

const AMPLIFIERS = [0, 1, 2, 3, 4, 5, 6]
const MAPPING_DURATION = 400

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
      // ArgumentOutOfBoundsError carries the bound it enforced; read duck-typed so the pack does
      // not take a @minecraft/common dependency.
      bounds: {
        index: error?.index,
        minValue: error?.minValue,
        maxValue: error?.maxValue,
        value: error?.value,
      },
    }
  }
}

const describeValue = (value) => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'object') return `object(${value.constructor?.name})`
  if (typeof value === 'string') return `string:"${value}"`
  return `${typeof value}:${String(value)}`
}

const show = (outcome) =>
  outcome.ok
    ? `ok value=${describeValue(outcome.value)}`
    : `threw name=${outcome.name} ctor=${outcome.ctor} message="${outcome.message}"`

/** A throw report with the ArgumentOutOfBoundsError fields spelled out, for the bound probes. */
const showBoundError = (outcome) =>
  `threw name=${outcome.name} ctor=${outcome.ctor} ` +
  `index=${json(outcome.bounds.index)} minValue=${json(outcome.bounds.minValue)} ` +
  `maxValue=${json(outcome.bounds.maxValue)} value=${json(outcome.bounds.value)} ` +
  `message="${outcome.message}"`

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

/** Every declared field of an Effect, each read independently so one throw does not hide the rest. */
const readEffect = (effect) => {
  if (effect === undefined || effect === null) return { present: false }
  const displayName = attempt(() => effect.displayName)
  const typeId = attempt(() => effect.typeId)
  const amplifier = attempt(() => effect.amplifier)
  const duration = attempt(() => effect.duration)
  const isValid = attempt(() => effect.isValid)
  return { present: true, displayName, typeId, amplifier, duration, isValid }
}

const showEffect = (read) =>
  read.present
    ? `displayName=${show(read.displayName)} typeId=${show(read.typeId)} ` +
      `amplifier=${show(read.amplifier)} duration=${show(read.duration)} isValid=${show(read.isValid)}`
    : 'absent'

const nameOf = (read) =>
  read.present && read.displayName.ok && typeof read.displayName.value === 'string'
    ? read.displayName.value
    : undefined

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

/**
 * A sheep that can be replaced when a probe kills it. instant_damage, wither and poison at high
 * amplifiers all kill an 8-health subject, and a dead subject would turn every later add into an
 * InvalidEntityError rather than a reading.
 */
const makeSubjectHolder = (ctx, offset) => {
  let entity
  let respawns = -1
  return {
    get: () => {
      const alive = entity !== undefined && attempt(() => entity.isValid).value === true
      if (!alive) {
        entity = ctx.spawn(SHEEP, offset)
        respawns += 1
      }
      return entity
    },
    respawns: () => respawns,
    retire: () => {
      if (entity !== undefined) attempt(() => entity.isValid && entity.remove())
      entity = undefined
    },
  }
}

// ---------------------------------------------------------------------------------------------
// Set: effectnames

const nameProbes = {
  // What the engine's own registry holds, next to the transcribed vanilla-data list the mapping
  // probe walks. EffectType.getName() is declared "Identifier name of this effect type", so this
  // also records what getName actually returns for each id.
  'effect-type-registry-survey': async () => {
    emit(
      'effect-type-registry-survey :: transcribed list = @minecraft/vanilla-data 1.26.33 ' +
        `MinecraftEffectTypes, ${VANILLA_EFFECT_IDS.length} ids; comparing against EffectTypes.getAll()`,
    )
    const all = attempt(() => EffectTypes.getAll())
    if (!all.ok) {
      emit(`effect-type-registry-survey :: EffectTypes.getAll() ${show(all)} — engine list unavailable`)
      return
    }
    const engineIds = []
    for (const type of all.value ?? []) {
      const name = attempt(() => type.getName())
      engineIds.push(name.ok ? String(name.value) : `<getName-threw:${name.name}>`)
    }
    engineIds.sort()
    emit(`effect-type-registry-survey :: EffectTypes.getAll() count=${engineIds.length}`)
    for (let i = 0; i < engineIds.length; i += 8) {
      emit(`effect-type-registry-survey :: engine-ids[${i}..${i + 7}] = ${json(engineIds.slice(i, i + 8))}`)
    }
    const engineSet = new Set(engineIds)
    const missing = VANILLA_EFFECT_IDS.filter((id) => !engineSet.has(id))
    const extra = engineIds.filter((id) => !VANILLA_EFFECT_IDS.includes(id))
    emit(
      `effect-type-registry-survey :: SUMMARY transcribed=${VANILLA_EFFECT_IDS.length} ` +
        `engine=${engineIds.length} in-transcribed-not-in-engine=${json(missing)} ` +
        `in-engine-not-in-transcribed=${json(extra)}`,
    )
    // getName() per transcribed id: does it ever return anything but the identifier?
    const notIdentity = []
    for (const id of VANILLA_EFFECT_IDS) {
      const type = attempt(() => EffectTypes.get(id))
      const name = type.ok && type.value !== undefined ? attempt(() => type.value.getName()) : undefined
      if (!name || !name.ok || name.value !== id) {
        notIdentity.push(`${id}=>${name ? show(name) : `get ${show(type)}`}`)
      }
    }
    emit(
      `effect-type-registry-survey :: SUMMARY getName-differs-from-identifier=${notIdentity.length} ` +
        `cases=${json(notIdentity)} — every id whose getName() is not the id itself`,
    )
  },

  // The mapping itself. One line per (type, amplifier) carrying displayName, typeId, amplifier and
  // duration, so the raw log is the mapping rather than a summary of it. The add and every read
  // happen in the same tick, so an instant effect that expires immediately is still readable off
  // addEffect's own return value.
  'effect-display-name-mapping': async (ctx) => {
    emit(
      `effect-display-name-mapping :: ${VANILLA_EFFECT_IDS.length} types × amplifiers ` +
        `${json(AMPLIFIERS)}, duration=${MAPPING_DURATION} ticks, subject=${SHEEP}; ` +
        'addEffect return value and getEffect readback both reported',
    )
    const holder = makeSubjectHolder(ctx, { x: 3, z: 3 })
    const perType = []
    const verdictTally = new Map()
    try {
      for (const typeId of VANILLA_EFFECT_IDS) {
        const names = []
        const verdicts = []
        for (const amplifier of AMPLIFIERS) {
          const subject = holder.get()
          const subjectId = safeId(subject)
          // Clear any prior instance so this is an add rather than the "or updates" path.
          attempt(() => subject.removeEffect(typeId))
          const added = attempt(() =>
            subject.addEffect(typeId, MAPPING_DURATION, { amplifier, showParticles: false }),
          )
          // Same-tick reads: nothing is awaited between the add and these.
          const fromReturn = added.ok ? readEffect(added.value) : { present: false }
          const got = added.ok ? attempt(() => subject.getEffect(typeId)) : { ok: true, value: undefined }
          const fromGet = got.ok ? readEffect(got.value) : { present: false }
          const returnName = nameOf(fromReturn)
          const getName = nameOf(fromGet)
          const displayName = returnName ?? getName
          const verdict = !added.ok
            ? 'ADD-THREW'
            : fromReturn.present && displayName !== undefined
              ? fromGet.present
                ? 'READ-OK'
                : 'READ-OK-FROM-RETURN-ONLY'
              : fromGet.present && displayName !== undefined
                ? 'READ-OK-FROM-GETEFFECT-ONLY'
                : fromReturn.present || fromGet.present
                  ? 'EFFECT-PRESENT-BUT-NAME-UNREADABLE'
                  : 'ADDED-NO-EFFECT-PRESENT'
          emit(
            `effect-display-name-mapping :: [${typeId}/amp=${amplifier}] subject=${subjectId} ` +
              `addEffect ${show(added)} from-return(${showEffect(fromReturn)}) ` +
              `getEffect ${got.ok ? `present=${fromGet.present}` : show(got)} from-getEffect(${showEffect(fromGet)}) ` +
              `display-name=${json(displayName)} names-agree=${json(
                returnName === undefined || getName === undefined ? undefined : returnName === getName,
              )} verdict=${verdict}`,
          )
          names.push({ amplifier, displayName, verdict })
          verdicts.push(verdict)
          verdictTally.set(verdict, (verdictTally.get(verdict) ?? 0) + 1)
          attempt(() => subject.removeEffect(typeId))
        }
        const readable = names.filter((n) => n.displayName !== undefined)
        const distinct = new Set(readable.map((n) => n.displayName))
        emit(
          `effect-display-name-mapping :: SUMMARY type=${typeId} ` +
            `names=[${names.map((n) => `${n.amplifier}=>${json(n.displayName)}`).join(', ')}] ` +
            `readable=${readable.length}/${names.length} distinct-names=${distinct.size} ` +
            `numeral-varies-with-amplifier=${json(readable.length > 1 ? distinct.size > 1 : undefined)} ` +
            `verdicts=[${verdicts.join(', ')}]`,
        )
        perType.push({ typeId, names, readable: readable.length, distinct: distinct.size })
        // One tick per type keeps the set off a single long-running tick.
        await tick(1)
      }
    } finally {
      holder.retire()
    }

    emit(
      `effect-display-name-mapping :: SUMMARY types=${perType.length} ` +
        `cells=${perType.length * AMPLIFIERS.length} subject-respawns=${holder.respawns()}`,
    )
    for (const [verdict, count] of verdictTally) {
      emit(`effect-display-name-mapping :: SUMMARY ${verdict} count=${count}`)
    }
    const noneReadable = perType.filter((t) => t.readable === 0).map((t) => t.typeId)
    emit(
      `effect-display-name-mapping :: SUMMARY no-name-read-at-any-amplifier=${noneReadable.length} ` +
        `types=${json(noneReadable)} — a type here has no observed name to register or compute`,
    )
    const flat = perType.filter((t) => t.readable > 1 && t.distinct === 1).map((t) => t.typeId)
    emit(
      `effect-display-name-mapping :: SUMMARY one-name-across-all-amplifiers=${flat.length} ` +
        `types=${json(flat)} — these carry no level numeral, which a computed name would have to special-case`,
    )
    const base = perType
      .filter((t) => t.names[0]?.displayName !== undefined)
      .map((t) => `${t.typeId}=>${json(t.names[0].displayName)}`)
    emit(`effect-display-name-mapping :: SUMMARY amplifier-0-names=[${base.join(', ')}]`)
  },
}

// ---------------------------------------------------------------------------------------------
// Set: effectbounds

/** One addEffect attempt with the readback, reported as a record rather than emitted. */
const boundCase = (subject, typeId, duration, amplifier) => {
  attempt(() => subject.removeEffect(typeId))
  const options = amplifier === undefined ? undefined : { amplifier, showParticles: false }
  const added = attempt(() => subject.addEffect(typeId, duration, options))
  const fromReturn = added.ok ? readEffect(added.value) : { present: false }
  const readAmplifier = fromReturn.present && fromReturn.amplifier.ok ? fromReturn.amplifier.value : undefined
  const readDuration = fromReturn.present && fromReturn.duration.ok ? fromReturn.duration.value : undefined
  attempt(() => subject.removeEffect(typeId))
  return {
    duration,
    amplifier,
    added,
    fromReturn,
    name: nameOf(fromReturn),
    readAmplifier,
    readDuration,
    accepted: added.ok,
  }
}

const boundLine = (probe, label, result) =>
  `${probe} :: [${label}] addEffect(duration=${json(result.duration)}, amplifier=${json(result.amplifier)}) ` +
  (result.accepted
    ? `ok effect-present=${result.fromReturn.present} ${showEffect(result.fromReturn)} ` +
      `read-amplifier=${json(result.readAmplifier)} read-duration=${json(result.readDuration)} ` +
      `display-name=${json(result.name)} verdict=ACCEPTED`
    : `${showBoundError(result.added)} verdict=REJECTED`)

const boundProbes = {
  // "This can throw an error if the duration or amplifier are outside of the valid ranges" names no
  // range for amplifier, and Effect.amplifier only says "Sample values range typically from 0 to
  // 4". This walks the value until the call is rejected, in both directions.
  'amplifier-bound': async (ctx) => {
    const typeId = 'minecraft:speed'
    emit(
      `amplifier-bound :: declared (index.d.ts, Entity.addEffect) "This can throw an error if the ` +
        `duration or amplifier are outside of the valid ranges, or if the effect does not exist." — ` +
        `no amplifier range is stated; Effect.amplifier says "Sample values range typically from 0 to 4". ` +
        `Walking ${typeId} amplifier up from 0 and down from -1`,
    )
    const holder = makeSubjectHolder(ctx, { x: -3, z: 3 })
    const LINEAR_CAP = 300
    const ESCALATION = [400, 600, 1000, 5000, 32767, 65535, 1000000, 2147483647, 2147483648]
    const NEGATIVES = [-1, -2, -3, -5, -10, -100, -127, -128, -129, -256, -1000, -2147483648]
    const accepted = []
    let firstRejected
    try {
      for (let amplifier = 0; amplifier <= LINEAR_CAP; amplifier += 1) {
        const subject = holder.get()
        const result = boundCase(subject, typeId, 200, amplifier)
        if (!result.accepted) {
          firstRejected = result
          break
        }
        accepted.push(result)
        // The first few and the last few before the boundary get their own line; the middle is
        // carried by the names=[…] summary.
        if (amplifier <= 8) emit(boundLine('amplifier-bound', `up/${amplifier}`, result))
        if (amplifier % 32 === 31) await tick(1)
      }
      if (firstRejected === undefined) {
        emit(
          `amplifier-bound :: no rejection at or below ${LINEAR_CAP}; escalating through ` +
            `${json(ESCALATION)}`,
        )
        for (const amplifier of ESCALATION) {
          const subject = holder.get()
          const result = boundCase(subject, typeId, 200, amplifier)
          emit(boundLine('amplifier-bound', `escalate/${amplifier}`, result))
          if (!result.accepted) {
            firstRejected = result
            break
          }
          accepted.push(result)
          await tick(1)
        }
      } else {
        for (const result of accepted.slice(-3)) {
          emit(boundLine('amplifier-bound', `up/${result.amplifier}`, result))
        }
        emit(boundLine('amplifier-bound', `up/${firstRejected.amplifier}-first-rejected`, firstRejected))
      }

      const highest = accepted.length > 0 ? accepted[accepted.length - 1] : undefined
      emit(
        `amplifier-bound :: SUMMARY highest-accepted=${json(highest?.amplifier)} ` +
          `first-rejected=${json(firstRejected?.amplifier)} ` +
          `rejection=${firstRejected ? `name=${firstRejected.added.name} minValue=${json(firstRejected.added.bounds.minValue)} maxValue=${json(firstRejected.added.bounds.maxValue)} message="${firstRejected.added.message}"` : 'none observed'}`,
      )
      const echoed = accepted.filter((r) => r.readAmplifier === r.amplifier)
      const lastEchoed = echoed.length > 0 ? echoed[echoed.length - 1].amplifier : undefined
      const firstNotEchoed = accepted.find((r) => r.readAmplifier !== r.amplifier)
      emit(
        `amplifier-bound :: SUMMARY read-back-echoes-request up-to=${json(lastEchoed)} ` +
          `first-divergence=${firstNotEchoed ? `amplifier=${firstNotEchoed.amplifier} read=${json(firstNotEchoed.readAmplifier)}` : 'none'} ` +
          `— an accepted value whose readback differs is a clamp, not a bound`,
      )
      const namesSeen = accepted.map((r) => `${r.amplifier}=>${json(r.name)}`)
      for (let i = 0; i < namesSeen.length; i += 12) {
        emit(`amplifier-bound :: SUMMARY names[${i}..${i + 11}] = [${namesSeen.slice(i, i + 12).join(', ')}]`)
      }
      const distinct = new Set(accepted.map((r) => r.name).filter((n) => n !== undefined))
      const lastNewName = [...accepted]
        .reverse()
        .find((r, index, list) => index + 1 < list.length && r.name !== list[index + 1].name)
      emit(
        `amplifier-bound :: SUMMARY accepted=${accepted.length} distinct-names=${distinct.size} ` +
          `highest-amplifier-whose-name-differs-from-the-next-lower=${json(lastNewName?.amplifier)} ` +
          `— above this the name stops tracking the amplifier`,
      )

      // Downward. -1 is the first candidate; the list continues past it so a bound at some other
      // negative value is visible rather than assumed.
      const negatives = []
      for (const amplifier of NEGATIVES) {
        const subject = holder.get()
        const result = boundCase(subject, typeId, 200, amplifier)
        emit(boundLine('amplifier-bound', `down/${amplifier}`, result))
        negatives.push(result)
        await tick(1)
      }
      const acceptedNegatives = negatives.filter((r) => r.accepted)
      const firstRejectedNegative = negatives.find((r) => !r.accepted)
      emit(
        `amplifier-bound :: SUMMARY negatives-accepted=${json(acceptedNegatives.map((r) => r.amplifier))} ` +
          `first-rejected-negative=${json(firstRejectedNegative?.amplifier)} ` +
          `rejection=${firstRejectedNegative ? `name=${firstRejectedNegative.added.name} minValue=${json(firstRejectedNegative.added.bounds.minValue)} message="${firstRejectedNegative.added.message}"` : 'none observed'}`,
      )

      // A non-integer amplifier is neither in nor out of the stated range; the declaration is silent.
      for (const amplifier of [0.5, 1.5, NaN, Infinity]) {
        const subject = holder.get()
        emit(boundLine('amplifier-bound', `non-integer/${String(amplifier)}`, boundCase(subject, typeId, 200, amplifier)))
      }
    } finally {
      holder.retire()
    }
  },

  // The same sentence names a duration range, and the duration parameter's own TSDoc states two
  // different lower bounds — "The value must be within the range [0, 20000000]" and
  // "Bounds: [1, 20000000]". Which one the engine enforces is what this reads.
  'duration-bound': async (ctx) => {
    const typeId = 'minecraft:speed'
    emit(
      'duration-bound :: declared (index.d.ts, Entity.addEffect duration param) "The value must be ' +
        'within the range [0, 20000000]." followed by "Bounds: [1, 20000000]" — the two lower bounds ' +
        'disagree, so 0 and 1 are both probed',
    )
    const holder = makeSubjectHolder(ctx, { x: 3, z: -3 })
    const DURATIONS = [
      -1000, -1, 0, 1, 2, 20, 200, 19999999, 20000000, 20000001, 20000002, 100000000, 2147483647,
      2147483648, 0.5, 1.5, NaN, Infinity,
    ]
    const results = []
    try {
      for (const duration of DURATIONS) {
        const subject = holder.get()
        const result = boundCase(subject, typeId, duration, 0)
        emit(boundLine('duration-bound', `duration=${String(duration)}`, result))
        results.push(result)
        await tick(1)
      }
    } finally {
      holder.retire()
    }
    const integral = results.filter((r) => Number.isInteger(r.duration))
    const acceptedIntegral = integral.filter((r) => r.accepted).map((r) => r.duration)
    const rejectedIntegral = integral.filter((r) => !r.accepted).map((r) => r.duration)
    emit(
      `duration-bound :: SUMMARY accepted=${json(acceptedIntegral)} rejected=${json(rejectedIntegral)}`,
    )
    const lowReject = integral.find((r) => !r.accepted && r.duration <= 1)
    const highReject = integral.find((r) => !r.accepted && r.duration > 1)
    emit(
      `duration-bound :: SUMMARY lowest-rejected-at-or-below-1=${json(lowReject?.duration)} ` +
        `rejection=${lowReject ? `name=${lowReject.added.name} minValue=${json(lowReject.added.bounds.minValue)} maxValue=${json(lowReject.added.bounds.maxValue)} message="${lowReject.added.message}"` : 'none observed'}`,
    )
    emit(
      `duration-bound :: SUMMARY first-rejected-above-1=${json(highReject?.duration)} ` +
        `rejection=${highReject ? `name=${highReject.added.name} minValue=${json(highReject.added.bounds.minValue)} maxValue=${json(highReject.added.bounds.maxValue)} message="${highReject.added.message}"` : 'none observed'}`,
    )
    const echoes = integral
      .filter((r) => r.accepted)
      .map((r) => `${r.duration}=>read ${json(r.readDuration)}`)
    emit(
      `duration-bound :: SUMMARY read-back=[${echoes.join(', ')}] ` +
        `— an accepted duration that reads back as a different number is a clamp`,
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

system.beforeEvents.startup.subscribe((event) => {
  const registry = event.customCommandRegistry
  registry.registerCommand(
    {
      name: 'mctest5:effectnames',
      description: 'Read Effect.displayName for every vanilla effect type across amplifiers 0-6',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, nameProbes, 'effectnames')
      return { status: CustomCommandStatus.Success, message: 'mctest effect display-name probes started' }
    },
  )
  registry.registerCommand(
    {
      name: 'mctest5:effectbounds',
      description: 'Find the amplifier and duration ranges addEffect accepts',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, boundProbes, 'effectbounds')
      return { status: CustomCommandStatus.Success, message: 'mctest effect bound probes started' }
    },
  )
})

// Fallback triggers:
//   /scriptevent mctest5:effectnames [probe-id]
//   /scriptevent mctest5:effectbounds [probe-id]
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === 'mctest5:effectnames') {
    startFrom(event.sourceEntity, nameProbes, 'effectnames', event.message.trim() || undefined)
  } else if (event.id === 'mctest5:effectbounds') {
    startFrom(event.sourceEntity, boundProbes, 'effectbounds', event.message.trim() || undefined)
  }
})
