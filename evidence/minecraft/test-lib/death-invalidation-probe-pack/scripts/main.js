// Death-invalidation probes for minecraft/test-lib. Two sets:
//   corpse     — when a killed mob's reference turns invalid, sampled once per tick from the kill
//                onward, across several types and repeated runs: is the boundary a fixed tick, is
//                it the same tick for every type, and is it the same across runs
//   healthless — whether the arrow's synchronous invalidation is what every health-less type does,
//                or whether the one observed type was special
// Each probe emits lines tagged with its probe name:
//   [mctest] <probe-name> :: <observation>
// Probes observe and report; they do not assert.
//
// Why this pack exists: f:death-invalidation-window sampled with wall-clock waits, so its "valid at
// ~7 ticks, invalid by ~27" describes the sampling, not the engine. And
// f:kill-no-health-behaviour observed one health-less type — an arrow — while the design now rules
// on every health-less type.
import { CommandPermissionLevel, CustomCommandStatus, InvalidEntityError, system, world } from '@minecraft/server'

const PREFIX = '[mctest]'

/** Mobs: each carries a health component, so kill() runs the full cascade and leaves a corpse. */
const MOBS = [
  'minecraft:sheep',
  'minecraft:cow',
  'minecraft:pig',
  'minecraft:chicken',
  'minecraft:zombie',
  'minecraft:skeleton',
  'minecraft:creeper',
  'minecraft:villager_v2',
]

/** Types expected to carry no health component — the set the arrow observation is generalized to. */
// Candidates, not a settled set: a type that will not summon is reported and excluded rather than
// counted. `minecraft:ender_pearl` was in this list and never spawned — its entity definition sets
// is_summonable false — so it is replaced by types that do summon.
const HEALTHLESS = [
  'minecraft:arrow',
  'minecraft:snowball',
  'minecraft:egg',
  'minecraft:xp_orb',
  'minecraft:xp_bottle',
  'minecraft:small_fireball',
  'minecraft:llama_spit',
  'minecraft:shulker_bullet',
]

/**
 * Height above the source to spawn a health-less subject.
 *
 * These are projectiles. Spawned at the source they strike the source entity or the ground within a
 * tick, so the pre-check finds them already invalid and the kill measures nothing — three of the six
 * types read that way on the first run. Well clear of any surface they stay alive long enough to be
 * killed deliberately.
 */
const HEALTHLESS_SPAWN_HEIGHT = 25

/** How many ticks past the kill to sample, and how many times to repeat the whole sweep. */
const SAMPLE_TICKS = 60
const REPEATS = 3

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

const show = (outcome) =>
  outcome.ok ?
    `ok value=${describeValue(outcome.value)}`
  : `threw name=${outcome.name} ctor=${outcome.ctor} instanceofInvalidEntityError=${outcome.invalidEntity} message="${outcome.message}"`

const describeValue = (value) => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'object') return `object(${value.constructor?.name})`
  if (typeof value === 'string') return `string:"${value}"`
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

/** Reads isValid without letting a throw end the sweep — the read itself is unguarded in the engine. */
const readsValid = (entity) => {
  const outcome = attempt(() => entity.isValid)
  return outcome.ok ? outcome.value : `THREW(${outcome.name})`
}

const makeContext = (dimension, location, source) => {
  const spawned = []
  return {
    dimension,
    location,
    source,
    spawn: (typeId, offset = { x: 0, y: 0, z: 0 }) => {
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

const corpseProbes = {
  // The headline. Every subject in a repeat is killed in the same tick and then sampled together,
  // so a difference between types cannot be a difference in tick alignment. The whole sweep runs
  // REPEATS times: a boundary that moves between repeats is the engine drawing it, not a constant.
  'corpse-invalidation-boundary': async (ctx) => {
    emit(
      `corpse-invalidation-boundary :: ${MOBS.length} mob types × ${REPEATS} repeats, isValid sampled ` +
        `every tick for ${SAMPLE_TICKS} ticks after kill(). first-invalid-tick is the answer; ` +
        'f:death-invalidation-window bounded it only as "valid at ~7, invalid by ~27" from wall-clock waits',
    )

    /** Per type, the first invalid tick seen in each repeat. */
    const byType = new Map(MOBS.map((typeId) => [typeId, []]))

    for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
      const subjects = []
      MOBS.forEach((typeId, index) => {
        const entity = ctx.spawn(typeId, offsetFor(index))
        subjects.push({ typeId, entity, id: entity.id })
      })
      // Let every subject settle before any of them dies.
      await tick(4)

      // What the entityDie handler sees, which is the half f:death-invalidation-window pins.
      const inHandler = new Map()
      const onDie = (event) => {
        const subject = subjects.find((candidate) => candidate.id === event.deadEntity?.id)
        if (subject) inHandler.set(subject.typeId, readsValid(event.deadEntity))
      }
      world.afterEvents.entityDie.subscribe(onDie)

      const killTick = system.currentTick
      for (const subject of subjects) {
        subject.killReturn = attempt(() => subject.entity.kill())
      }
      // The same statement sequence as the call: what a health-less type answers false to here.
      for (const subject of subjects) {
        subject.synchronous = readsValid(subject.entity)
      }

      for (let offset = 1; offset <= SAMPLE_TICKS; offset += 1) {
        await tick(1)
        for (const subject of subjects) {
          if (subject.firstInvalidTick !== undefined) continue
          if (readsValid(subject.entity) === false) subject.firstInvalidTick = offset
        }
      }

      world.afterEvents.entityDie.unsubscribe(onDie)

      for (const subject of subjects) {
        byType.get(subject.typeId).push(subject.firstInvalidTick)
        emit(
          `corpse-invalidation-boundary :: [repeat=${repeat}] type=${subject.typeId} id=${subject.id} ` +
            `kill ${show(subject.killReturn)} kill-tick=${killTick} synchronous-isValid=${String(subject.synchronous)} ` +
            `inside-die-handler-isValid=${String(inHandler.get(subject.typeId))} ` +
            `first-invalid-tick=${subject.firstInvalidTick ?? `none-within-${SAMPLE_TICKS}`}`,
        )
      }
      ctx.dispose()
      await tick(4)
    }

    for (const [typeId, ticks] of byType) {
      const distinct = [...new Set(ticks.map((value) => String(value)))]
      emit(
        `corpse-invalidation-boundary :: SUMMARY type=${typeId} first-invalid-ticks=${json(ticks)} ` +
          `deterministic-across-repeats=${distinct.length === 1}`,
      )
    }

    const everyTick = [...byType.values()].flat()
    const distinctAll = [...new Set(everyTick.map((value) => String(value)))]
    emit(
      `corpse-invalidation-boundary :: SUMMARY HEADLINE observations=${everyTick.length} ` +
        `distinct-first-invalid-ticks=${json(distinctAll)} ` +
        `uniform-across-types-and-repeats=${distinctAll.length === 1} — one value here means the boundary is a ` +
        'constant the fake could model; several mean it is per-type or drawn per death',
    )
  },
}

const healthlessProbes = {
  // f:kill-no-health-behaviour observed one type. The design rules on all of them, so this asks the
  // rest the same question: is isValid false in the same statement sequence as the kill?
  'healthless-kill-invalidation': async (ctx) => {
    emit(
      `healthless-kill-invalidation :: ${HEALTHLESS.length} expected-health-less types × ${REPEATS} repeats. ` +
        'health-component=undefined confirms the type belongs to the set; synchronous-isValid=false is the ' +
        'arrow behaviour the design generalized from',
    )

    const byType = new Map(HEALTHLESS.map((typeId) => [typeId, []]))
    // Why a type produced no observation, so the headline can tell "unobservable" from "disagrees".
    const unusable = new Map()
    const noteUnusable = (typeId, reason) => {
      if (!unusable.has(typeId)) unusable.set(typeId, reason)
    }

    for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
      for (const [index, typeId] of HEALTHLESS.entries()) {
        const offset = { ...offsetFor(index), y: HEALTHLESS_SPAWN_HEIGHT }
        const spawn = attempt(() => ctx.spawn(typeId, offset))
        if (!spawn.ok) {
          noteUnusable(typeId, 'NOT-SUMMONABLE')
          emit(
            `healthless-kill-invalidation :: [repeat=${repeat}] type=${typeId} SPAWN FAILED ${show(spawn)} ` +
              'verdict=NOT-SUMMONABLE — contributes no observation and is not a disagreement',
          )
          continue
        }
        const entity = spawn.value
        const id = entity.id
        await tick(1)

        // Re-checked before the kill: a subject already gone cannot say whether kill() invalidates
        // synchronously, and its isValid=false would otherwise read as agreement with the arrow.
        if (readsValid(entity) !== true) {
          noteUnusable(typeId, 'SUBJECT-ALREADY-INVALID')
          emit(
            `healthless-kill-invalidation :: [repeat=${repeat}] type=${typeId} id=${id} ` +
              'verdict=SUBJECT-ALREADY-INVALID — removed before the kill, so this case measures nothing',
          )
          ctx.dispose()
          await tick(2)
          continue
        }

        const health = attempt(() => entity.getComponent('minecraft:health'))
        // The set is "types with no health component"; one that has it does not belong here.
        if (health.ok && health.value !== undefined) {
          noteUnusable(typeId, 'HAS-HEALTH-COMPONENT')
          emit(
            `healthless-kill-invalidation :: [repeat=${repeat}] type=${typeId} id=${id} ` +
              `health-component=${show(health)} verdict=HAS-HEALTH-COMPONENT — not a member of the set`,
          )
          ctx.dispose()
          await tick(2)
          continue
        }
        const killReturn = attempt(() => entity.kill())
        const synchronous = readsValid(entity)

        // A few ticks either confirm it stayed invalid or catch a late flip.
        const trail = []
        for (let offset = 1; offset <= 5; offset += 1) {
          await tick(1)
          trail.push(readsValid(entity))
        }

        byType.get(typeId).push(synchronous)
        emit(
          `healthless-kill-invalidation :: [repeat=${repeat}] type=${typeId} id=${id} ` +
            `health-component=${show(health)} kill ${show(killReturn)} ` +
            `synchronous-isValid=${String(synchronous)} tick+1..5=${json(trail)}`,
        )
        ctx.dispose()
        await tick(2)
      }
    }

    const disagreeing = []
    const observed = []
    for (const [typeId, results] of byType) {
      if (results.length === 0) {
        emit(
          `healthless-kill-invalidation :: SUMMARY type=${typeId} synchronous-isValid=[] observations=0 ` +
            `verdict=${unusable.get(typeId) ?? 'NO-OBSERVATION'} — excluded from the headline, neither ` +
            'agreeing nor disagreeing',
        )
        continue
      }
      const allFalse = results.every((value) => value === false)
      observed.push(typeId)
      if (!allFalse) disagreeing.push(`${typeId}=${json(results)}`)
      emit(
        `healthless-kill-invalidation :: SUMMARY type=${typeId} synchronous-isValid=${json(results)} ` +
          `observations=${results.length} matches-arrow=${allFalse}`,
      )
    }
    emit(
      `healthless-kill-invalidation :: SUMMARY HEADLINE candidates=${byType.size} ` +
        `observed=${observed.length} types=[${observed.join(', ')}] ` +
        `disagreeing-with-arrow=${disagreeing.length} cases=${json(disagreeing)} — the fact widens to the ` +
        'observed types only; an unobserved type is not evidence either way',
    )
    if (unusable.size > 0) {
      emit(
        `healthless-kill-invalidation :: SUMMARY excluded=${unusable.size} reasons=${json(
          Object.fromEntries(unusable),
        )} — these produced no usable case and are not counted as disagreements`,
      )
    }
  },
}

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
      name: 'mctest7:corpse',
      description: 'On which tick after kill() does a mob corpse turn invalid, and is it the same tick every time?',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, corpseProbes, 'corpse')
      return { status: CustomCommandStatus.Success, message: 'mctest corpse-invalidation probes started' }
    },
  )
  registry.registerCommand(
    {
      name: 'mctest7:healthless',
      description: 'Does every health-less type invalidate synchronously on kill(), as the arrow does?',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, healthlessProbes, 'healthless')
      return { status: CustomCommandStatus.Success, message: 'mctest health-less kill probes started' }
    },
  )
})

// Fallback triggers:
//   /scriptevent mctest7:corpse [probe-id]
//   /scriptevent mctest7:healthless [probe-id]
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === 'mctest7:corpse') {
    startFrom(event.sourceEntity, corpseProbes, 'corpse', event.message.trim() || undefined)
  } else if (event.id === 'mctest7:healthless') {
    startFrom(event.sourceEntity, healthlessProbes, 'healthless', event.message.trim() || undefined)
  }
})
