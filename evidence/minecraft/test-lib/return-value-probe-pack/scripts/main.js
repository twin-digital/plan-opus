// Return-value probes for minecraft/test-lib. Two sets:
//   returns  — what applyDamage's boolean and createExplosion's boolean report when the action
//              does not land (cancelled before-event, invulnerability window, non-positive amount)
//   nohealth — the isolated re-run of the no-health damage question, one fresh subject per call
// Each probe emits lines tagged with its probe name:
//   [mctest] <probe-name> :: <observation>
// Probes observe and report; they do not assert.
import {
  CommandPermissionLevel,
  CustomCommandStatus,
  InvalidEntityError,
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

const healthOf = (entity) => attempt(() => entity.getComponent('minecraft:health')?.currentValue)

/** Records the damage cascade for one entity id across the three signals it can touch. */
const recordCascade = (entityId) => {
  const seen = []
  const subs = [
    [world.afterEvents.entityHurt, (event) => {
      if (safeId(event.hurtEntity) === entityId) seen.push(`hurt(damage=${event.damage})`)
    }],
    [world.afterEvents.entityHealthChanged, (event) => {
      if (safeId(event.entity) === entityId) seen.push(`health(${event.oldValue}->${event.newValue})`)
    }],
    [world.afterEvents.entityDie, (event) => {
      if (safeId(event.deadEntity) === entityId) seen.push('die')
    }],
  ]
  for (const [signal, handler] of subs) signal.subscribe(handler)
  return {
    seen,
    release: () => {
      for (const [signal, handler] of subs) attempt(() => signal.unsubscribe(handler))
    },
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

// ---------------------------------------------------------------------------------------------
// Set: returns

/**
 * One applyDamage case on a freshly spawned subject. Reports the boolean beside what actually
 * happened to health, so "the call returned true" and "the entity took damage" stay separable.
 */
const damageCase = async (ctx, { label, typeId = SHEEP, amount, offset, cancel = false, preHit }) => {
  const subject = ctx.spawn(typeId, offset)
  const id = safeId(subject)
  const recorder = recordCascade(id)
  let beforeHandler
  if (cancel) {
    beforeHandler = (event) => {
      if (safeId(event.hurtEntity) === id) event.cancel = true
    }
    world.beforeEvents.entityHurt.subscribe(beforeHandler)
  }
  try {
    // An optional priming hit opens the invulnerability window before the measured call.
    let primed
    if (preHit !== undefined) {
      primed = attempt(() => subject.applyDamage(preHit))
      await tick(1)
    }
    const healthBefore = healthOf(subject)
    const returned = attempt(() => subject.applyDamage(amount))
    await tick(2)
    const healthAfter = healthOf(subject)
    const lost =
      healthBefore.ok && healthAfter.ok && typeof healthBefore.value === 'number' && typeof healthAfter.value === 'number'
        ? healthBefore.value - healthAfter.value
        : undefined
    const landed = typeof lost === 'number' ? lost > 0 : undefined
    const verdict =
      returned.ok === false
        ? 'CALL-THREW'
        : landed === undefined
          ? 'NO-HEALTH-TO-MEASURE'
          : returned.value === true && landed === false
            ? 'RETURNED-TRUE-BUT-NOTHING-LANDED'
            : returned.value === true && landed === true
              ? 'RETURNED-TRUE-AND-DAMAGE-LANDED'
              : returned.value === false && landed === false
                ? 'RETURNED-FALSE-AND-NOTHING-LANDED'
                : 'RETURNED-FALSE-BUT-DAMAGE-LANDED'
    emit(
      `applydamage-return-semantics :: [${label}] type=${typeId} amount=${json(amount)} ` +
        `${preHit === undefined ? '' : `priming-hit=${json(preHit)} primed-returned=${primed ? show(primed) : 'n/a'} `}` +
        `cancelled-before-event=${cancel} applyDamage ${show(returned)} ` +
        `health(${show(healthBefore)} -> ${show(healthAfter)}) health-lost=${json(lost)} damage-landed=${json(landed)} ` +
        `cascade=[${recorder.seen.join(', ')}] verdict=${verdict}`,
    )
    return { label, amount, returned: returned.ok ? returned.value : `threw:${returned.name}`, landed, verdict }
  } finally {
    recorder.release()
    if (beforeHandler) attempt(() => world.beforeEvents.entityHurt.unsubscribe(beforeHandler))
  }
}

const returnProbes = {
  // The declared contract is "whether the entity takes any damage", false when the entity is
  // invulnerable or the amount is <= 0. Each case is a fresh subject, so no case can be
  // contaminated by the invulnerability window left open by the previous one.
  'applydamage-return-semantics': async (ctx) => {
    emit(
      'applydamage-return-semantics :: declared contract (index.d.ts) "Whether the entity takes any ' +
        'damage. This can return false if the entity is invulnerable or if the damage applied is less ' +
        'than or equal to 0." — each case reports the boolean beside the health actually lost',
    )
    const results = []
    // Amount range on a healthy subject: does the boolean track the amount term at all?
    results.push(await damageCase(ctx, { label: 'amount=-1', amount: -1, offset: { x: 3 } }))
    results.push(await damageCase(ctx, { label: 'amount=0', amount: 0, offset: { x: -3 } }))
    results.push(await damageCase(ctx, { label: 'amount=0.5', amount: 0.5, offset: { z: 3 } }))
    results.push(await damageCase(ctx, { label: 'amount=2-control', amount: 2, offset: { z: -3 } }))
    // Health-less subject: the one case the ruling already covers.
    results.push(await damageCase(ctx, { label: 'no-health', typeId: 'minecraft:xp_orb', amount: 2, offset: { x: 5 } }))
    // Action blocked after the call is admitted: cancellation and the invulnerability window.
    results.push(await damageCase(ctx, { label: 'cancelled', amount: 4, cancel: true, offset: { x: -5 } }))
    results.push(await damageCase(ctx, { label: 'invulnerability-window', amount: 2, preHit: 2, offset: { z: 5 } }))

    const tally = new Map()
    for (const r of results) tally.set(r.verdict, (tally.get(r.verdict) ?? 0) + 1)
    for (const [verdict, count] of tally) {
      emit(`applydamage-return-semantics :: SUMMARY ${verdict} count=${count}`)
    }
    const nonPositive = results.filter((r) => typeof r.amount === 'number' && r.amount <= 0)
    emit(
      `applydamage-return-semantics :: SUMMARY non-positive-amounts=[${nonPositive
        .map((r) => `${r.label}=>${json(r.returned)}`)
        .join(', ')}] ` +
        `— all false means the boolean carries the amount term; all true means it reports only that the entity is damageable`,
    )
    const blocked = results.filter((r) => r.label === 'cancelled' || r.label === 'invulnerability-window')
    emit(
      `applydamage-return-semantics :: SUMMARY blocked-after-admission=[${blocked
        .map((r) => `${r.label}=>returned ${json(r.returned)} landed ${json(r.landed)}`)
        .join(', ')}] ` +
        `— returned true with nothing landed contradicts the declared "whether the entity takes any damage"`,
    )
  },

  // createExplosion is the third and last script-initiable cancellable call with a non-void
  // return, so this completes the set the no-op ruling can be tested against.
  'explosion-cancel-return': async (ctx) => {
    for (const cancel of [false, true]) {
      const label = cancel ? 'cancel' : 'control-no-cancel'
      // A witness sits at the blast centre: its health says whether the explosion happened.
      const witness = ctx.spawn(SHEEP, { x: 8, z: 8 })
      const witnessId = safeId(witness)
      const recorder = recordCascade(witnessId)
      const at = { x: ctx.location.x + 8, y: ctx.location.y, z: ctx.location.z + 8 }
      const afterFired = []
      const afterHandler = () => afterFired.push('explosion')
      world.afterEvents.explosion.subscribe(afterHandler)
      let beforeHandler
      const beforeNotes = []
      beforeHandler = (event) => {
        beforeNotes.push('handler-entered')
        if (cancel) {
          event.cancel = true
          beforeNotes.push(`wrote cancel=true readback-in-handler=${event.cancel}`)
        }
      }
      world.beforeEvents.explosion.subscribe(beforeHandler)
      try {
        await tick(2)
        const healthBefore = healthOf(witness)
        // breaksBlocks:false keeps the run from editing the world it is measured in.
        const returned = attempt(() =>
          ctx.dimension.createExplosion(at, 3, { breaksBlocks: false, causesFire: false }),
        )
        await tick(4)
        const healthAfter = healthOf(witness)
        const lost =
          healthBefore.ok && healthAfter.ok && typeof healthBefore.value === 'number' && typeof healthAfter.value === 'number'
            ? healthBefore.value - healthAfter.value
            : undefined
        const landed = (typeof lost === 'number' && lost > 0) || afterFired.length > 0
        const verdict =
          beforeNotes.length === 0
            ? 'BEFORE-EVENT-NOT-RAISED'
            : returned.ok === false
              ? 'CALL-THREW'
              : cancel === false
                ? `control returned=${json(returned.value)} landed=${json(landed)}`
                : returned.value === true && landed === false
                  ? 'CANCELLED-RETURNED-TRUE'
                  : returned.value === false && landed === false
                    ? 'CANCELLED-RETURNED-FALSE'
                    : 'CANCELLED-BUT-EXPLOSION-LANDED'
        emit(
          `explosion-cancel-return :: [${label}] createExplosion(radius=3, breaksBlocks=false) ${show(returned)} ` +
            `witness-health(${show(healthBefore)} -> ${show(healthAfter)}) health-lost=${json(lost)} ` +
            `after-event-fired=${afterFired.length} explosion-landed=${json(landed)} ` +
            `cascade=[${recorder.seen.join(', ')}] handler-notes=[${beforeNotes.join(' | ')}] verdict=${verdict}`,
        )
      } finally {
        recorder.release()
        attempt(() => world.afterEvents.explosion.unsubscribe(afterHandler))
        attempt(() => world.beforeEvents.explosion.unsubscribe(beforeHandler))
      }
      await tick(4)
    }
  },
}

// ---------------------------------------------------------------------------------------------
// Set: nohealth — the isolated rewrite.

const nohealthProbes = {
  // The original set shared one subject between the two argument forms, so the plain call
  // consumed the projectile and the options call met an already-removed entity. Here every call
  // gets its own freshly-spawned subject, validity is re-checked immediately before the call, and
  // the health-carrying control has its own vocabulary rather than the subject's.
  'damage-without-health-isolated': async (ctx) => {
    const subjects = [
      { typeId: 'minecraft:arrow', role: 'subject' },
      { typeId: 'minecraft:snowball', role: 'subject' },
      { typeId: 'minecraft:xp_orb', role: 'subject' },
      { typeId: SHEEP, role: 'control' },
    ]
    const forms = [
      { name: 'plain', call: (entity) => entity.applyDamage(2) },
      { name: 'options', call: (entity) => entity.applyDamage(2, { cause: 'entityAttack' }) },
    ]
    const results = []
    let index = 0
    for (const { typeId, role } of subjects) {
      for (const form of forms) {
        index += 1
        // Spread the subjects so neither the source nor a sibling is in the blast of a spawn.
        const offset = { x: ((index % 4) - 2) * 4, z: (Math.floor(index / 4) - 1) * 4 }
        const entity = ctx.spawn(typeId, offset)
        const id = safeId(entity)
        const recorder = recordCascade(id)
        try {
          const component = attempt(() => entity.getComponent('minecraft:health'))
          const hasHealth = attempt(() => entity.hasComponent('minecraft:health'))
          // Re-checked immediately before the call: an already-invalid subject is reported as
          // such rather than being scored against the damage ruling.
          const validBefore = attempt(() => entity.isValid)
          if (validBefore.value !== true) {
            emit(
              `damage-without-health-isolated :: [${typeId}/${form.name}] role=${role} ` +
                `SUBJECT-ALREADY-INVALID isValid=${json(validBefore.value)} — spawned and removed before the call; ` +
                `this case scores nothing against the damage ruling`,
            )
            results.push({ typeId, form: form.name, role, verdict: 'SUBJECT-ALREADY-INVALID' })
            continue
          }
          const healthBefore = healthOf(entity)
          const returned = attempt(() => form.call(entity))
          await tick(2)
          const healthAfter = healthOf(entity)
          const validAfter = attempt(() => entity.isValid)
          const verdict =
            role === 'control'
              ? returned.ok && returned.value === true
                ? 'CONTROL-HAS-HEALTH-RETURNED-TRUE'
                : 'CONTROL-DID-NOT-RETURN-TRUE'
              : returned.ok === false
                ? returned.invalidEntity
                  ? 'SUBJECT-INVALIDATED-DURING-CALL'
                  : 'THREW-NOT-AN-INVALIDATION'
                : returned.value === false
                  ? 'SILENT-FALSE'
                  : 'RETURNED-TRUE'
          emit(
            `damage-without-health-isolated :: [${typeId}/${form.name}] role=${role} ` +
              `component-present=${json(component.value !== undefined)} hasComponent=${show(hasHealth)} ` +
              `isValid-before=${json(validBefore.value)} applyDamage ${show(returned)} isValid-after=${json(validAfter.value)} ` +
              `health(${show(healthBefore)} -> ${show(healthAfter)}) cascade=[${recorder.seen.join(', ')}] verdict=${verdict}`,
          )
          results.push({ typeId, form: form.name, role, verdict })
        } finally {
          recorder.release()
        }
      }
    }
    const subjectResults = results.filter((r) => r.role === 'subject')
    const tally = new Map()
    for (const r of subjectResults) tally.set(r.verdict, (tally.get(r.verdict) ?? 0) + 1)
    emit(`damage-without-health-isolated :: SUMMARY subject-calls=${subjectResults.length}`)
    for (const [verdict, count] of tally) {
      emit(
        `damage-without-health-isolated :: SUMMARY ${verdict} count=${count} cases=[${subjectResults
          .filter((r) => r.verdict === verdict)
          .map((r) => `${r.typeId}/${r.form}`)
          .join(', ')}]`,
      )
    }
    const contradicting = subjectResults.filter((r) => r.verdict === 'RETURNED-TRUE')
    emit(
      `damage-without-health-isolated :: SUMMARY contradicting-the-no-op-ruling=${contradicting.length} ` +
        `— only RETURNED-TRUE counts; an invalidation throw is the validity guard, not a damage ruling`,
    )
    for (const r of results.filter((r) => r.role === 'control')) {
      emit(`damage-without-health-isolated :: SUMMARY control ${r.typeId}/${r.form} ${r.verdict}`)
    }
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
      name: 'mctest5:returns',
      description: 'Probe what applyDamage and createExplosion return when the action does not land',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, returnProbes, 'returns')
      return { status: CustomCommandStatus.Success, message: 'mctest return-value probes started' }
    },
  )
  registry.registerCommand(
    {
      name: 'mctest5:nohealth',
      description: 'Re-run the no-health damage question with one fresh subject per call',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, nohealthProbes, 'nohealth')
      return { status: CustomCommandStatus.Success, message: 'mctest isolated no-health probes started' }
    },
  )
})

// Fallback triggers:
//   /scriptevent mctest5:returns [probe-id]
//   /scriptevent mctest5:nohealth [probe-id]
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === 'mctest5:returns') {
    startFrom(event.sourceEntity, returnProbes, 'returns', event.message.trim() || undefined)
  } else if (event.id === 'mctest5:nohealth') {
    startFrom(event.sourceEntity, nohealthProbes, 'nohealth', event.message.trim() || undefined)
  }
})
