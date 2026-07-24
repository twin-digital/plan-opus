// In-engine probes for the minecraft/test-lib open questions (spec.md `questions` block).
// Each probe emits one or more lines tagged with its question id:
//   [mctest] <question-id> :: <observation>
// Copy every [mctest] line from chat (or the server content log — console.warn mirrors them)
// back into the design as evidence. Probes observe and report; they do not assert.
import {
  CommandPermissionLevel,
  CustomCommandStatus,
  InvalidEntityError,
  system,
  world,
} from '@minecraft/server'

const PREFIX = '[mctest]'
const SHEEP = 'minecraft:sheep' // passive, 8 max health — cheap lethal-damage probes

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

const safeId = (entity) => {
  try {
    return entity.id
  } catch {
    return '<id-unreadable>'
  }
}

/** Records the three damage-path events for one entity id, in delivery order. */
const recordEvents = (entityId) => {
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
    safeId(ev.hurtEntity) === entityId ? `hurt(damage=${ev.damage},cause=${ev.damageSource.cause})` : undefined,
  )
  on(world.afterEvents.entityHealthChanged, (ev) =>
    safeId(ev.entity) === entityId ? `health(${ev.oldValue}->${ev.newValue})` : undefined,
  )
  on(world.afterEvents.entityDie, (ev) =>
    safeId(ev.deadEntity) === entityId ? `die(cause=${ev.damageSource?.cause})` : undefined,
  )
  return {
    seen,
    dispose: () => {
      for (const [signal, handler] of subscriptions) signal.unsubscribe(handler)
    },
  }
}

/** Test context: spawns tracked entities near the triggering player, cleans them up after. */
const makeContext = (dimension, location) => {
  const spawned = []
  return {
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

const health = (entity) => entity.getComponent('minecraft:health')

// ---------------------------------------------------------------------------------------------
// Probes, one per open question.

const probes = {
  'addeffect-success-return': async (ctx) => {
    const sheep = ctx.spawn()
    const returned = attempt(() => sheep.addEffect('speed', 200, { amplifier: 1 }))
    emit(`addeffect-success-return :: add ${show(returned)}`)
    if (returned.ok && returned.value) {
      const effect = returned.value
      emit(
        `addeffect-success-return :: returned-object typeId=${attempt(() => effect.typeId).value} duration=${attempt(() => effect.duration).value} amplifier=${attempt(() => effect.amplifier).value}`,
      )
    }
    const updated = attempt(() => sheep.addEffect('speed', 300, { amplifier: 2 }))
    emit(`addeffect-success-return :: update ${show(updated)}`)
  },

  'effect-member-guard-derivation': async (ctx) => {
    const sheep = ctx.spawn()
    const removedEffect = sheep.addEffect('speed', 200, { amplifier: 1 })
    sheep.removeEffect('speed')
    await tick(2)
    for (const member of ['amplifier', 'duration', 'typeId', 'displayName', 'isValid']) {
      emit(`effect-member-guard-derivation :: removed-effect ${member} ${show(attempt(() => removedEffect?.[member]))}`)
    }
    const orphan = ctx.spawn()
    const orphanEffect = orphan.addEffect('speed', 200)
    orphan.remove()
    await tick(2)
    for (const member of ['amplifier', 'duration', 'typeId', 'displayName', 'isValid']) {
      emit(`effect-member-guard-derivation :: invalid-owner ${member} ${show(attempt(() => orphanEffect?.[member]))}`)
    }
  },

  'damage-event-order-in-engine': async (ctx) => {
    const sheep = ctx.spawn()
    const recorder = recordEvents(sheep.id)
    sheep.applyDamage(2)
    await tick(4)
    emit(`damage-event-order-in-engine :: nonlethal sequence=[${recorder.seen.join(', ')}]`)
    recorder.seen.length = 0
    sheep.applyDamage(100)
    await tick(4)
    emit(`damage-event-order-in-engine :: lethal sequence=[${recorder.seen.join(', ')}]`)
    recorder.dispose()
  },

  'damage-default-cause': async (ctx) => {
    const sheep = ctx.spawn()
    const recorder = recordEvents(sheep.id)
    sheep.applyDamage(1)
    await tick(4)
    emit(`damage-default-cause :: no-options sequence=[${recorder.seen.join(', ')}]`)
    recorder.seen.length = 0
    const arrow = ctx.spawn('minecraft:arrow')
    sheep.applyDamage(1, { damagingProjectile: arrow })
    await tick(4)
    emit(`damage-default-cause :: projectile-options sequence=[${recorder.seen.join(', ')}]`)
    recorder.dispose()
  },

  'clamped-hit-damage-payload': async (ctx) => {
    const sheep = ctx.spawn()
    const before = health(sheep)?.currentValue
    const recorder = recordEvents(sheep.id)
    sheep.applyDamage(100)
    await tick(4)
    emit(`clamped-hit-damage-payload :: health-before=${before} requested=100 sequence=[${recorder.seen.join(', ')}]`)
    recorder.dispose()
  },

  'kill-cascade': async (ctx) => {
    const sheep = ctx.spawn()
    const recorder = recordEvents(sheep.id)
    const first = attempt(() => sheep.kill())
    await tick(4)
    emit(`kill-cascade :: first-kill return ${show(first)} sequence=[${recorder.seen.join(', ')}]`)
    recorder.seen.length = 0
    const second = attempt(() => sheep.kill())
    await tick(4)
    emit(`kill-cascade :: second-kill return ${show(second)} sequence=[${recorder.seen.join(', ')}]`)
    recorder.dispose()
  },

  'remove-fires-no-death-event': async (ctx) => {
    const sheep = ctx.spawn()
    const recorder = recordEvents(sheep.id)
    sheep.remove()
    await tick(4)
    emit(`remove-fires-no-death-event :: sequence=[${recorder.seen.join(', ')}]`)
    recorder.dispose()
  },

  'death-invalidation-timing': async (ctx) => {
    const sheep = ctx.spawn()
    const sheepId = sheep.id
    let insideHandler = 'die handler never ran'
    const handler = world.afterEvents.entityDie.subscribe((ev) => {
      if (safeId(ev.deadEntity) !== sheepId) return
      const validity = attempt(() => ev.deadEntity.isValid)
      const guarded = attempt(() => ev.deadEntity.hasTag('mctest'))
      insideHandler = `isValid ${show(validity)}; hasTag ${show(guarded)}`
    })
    sheep.kill()
    await tick(2)
    emit(`death-invalidation-timing :: inside-die-handler ${insideHandler}`)
    for (const delay of [0, 5, 20, 40]) {
      await tick(delay)
      emit(`death-invalidation-timing :: after-wait isValid=${attempt(() => sheep.isValid).value}`)
    }
    world.afterEvents.entityDie.unsubscribe(handler)
  },

  'component-health-writes-fire-events': async (ctx) => {
    const sheep = ctx.spawn()
    const recorder = recordEvents(sheep.id)
    const component = health(sheep)
    const set = attempt(() => component?.setCurrentValue(3))
    await tick(4)
    emit(`component-health-writes-fire-events :: setCurrentValue(3) return ${show(set)} sequence=[${recorder.seen.join(', ')}]`)
    recorder.seen.length = 0
    attempt(() => component?.resetToMaxValue())
    await tick(4)
    emit(`component-health-writes-fire-events :: resetToMaxValue sequence=[${recorder.seen.join(', ')}]`)
    recorder.seen.length = 0
    attempt(() => component?.resetToMinValue())
    await tick(4)
    emit(`component-health-writes-fire-events :: resetToMinValue sequence=[${recorder.seen.join(', ')}]`)
    recorder.dispose()
  },

  'effect-replace-unconditional': async (ctx) => {
    const sheep = ctx.spawn()
    sheep.addEffect('speed', 600, { amplifier: 2 })
    sheep.addEffect('speed', 100, { amplifier: 0 })
    await tick(1)
    const effect = sheep.getEffect('speed')
    emit(
      `effect-replace-unconditional :: after-lower-readd duration=${attempt(() => effect?.duration).value} amplifier=${attempt(() => effect?.amplifier).value}`,
    )
  },

  'effect-amplifier-default': async (ctx) => {
    const sheep = ctx.spawn()
    sheep.addEffect('speed', 100)
    emit(`effect-amplifier-default :: amplifier=${attempt(() => sheep.getEffect('speed')?.amplifier).value}`)
  },

  'attribute-generic-throws-on-invalid-owner': async (ctx) => {
    const sheep = ctx.spawn()
    const component = health(sheep)
    sheep.remove()
    await tick(2)
    for (const member of ['currentValue', 'defaultValue', 'effectiveMax', 'effectiveMin', 'isValid', 'typeId']) {
      emit(`attribute-generic-throws-on-invalid-owner :: ${member} ${show(attempt(() => component?.[member]))}`)
    }
    emit(`attribute-generic-throws-on-invalid-owner :: resetToDefaultValue ${show(attempt(() => component?.resetToDefaultValue()))}`)
    emit(`attribute-generic-throws-on-invalid-owner :: setCurrentValue(1) ${show(attempt(() => component?.setCurrentValue(1)))}`)
    emit(`attribute-generic-throws-on-invalid-owner :: entity ${show(attempt(() => component?.entity))}`)
  },

  'set-current-value-bounds': async (ctx) => {
    const sheep = ctx.spawn()
    const component = health(sheep)
    const max = attempt(() => component?.effectiveMax).value
    const min = attempt(() => component?.effectiveMin).value
    emit(`set-current-value-bounds :: staged min=${min} max=${max}`)
    emit(`set-current-value-bounds :: at-max ${show(attempt(() => component?.setCurrentValue(max)))}`)
    emit(`set-current-value-bounds :: above-max ${show(attempt(() => component?.setCurrentValue(max + 1000)))}`)
    emit(`set-current-value-bounds :: below-min ${show(attempt(() => component?.setCurrentValue(min - 1000)))}`)
    const fresh = ctx.spawn()
    emit(`set-current-value-bounds :: at-min ${show(attempt(() => health(fresh)?.setCurrentValue(min)))}`)
  },

  'get-dimension-invalid-id-error': async () => {
    emit(`get-dimension-invalid-id-error :: ${show(attempt(() => world.getDimension('mctest:nope')))}`)
  },

  'after-event-delivery-timing': async (ctx) => {
    const sheep = ctx.spawn()
    const sheepId = sheep.id
    let observedAtDelivery
    const handler = world.afterEvents.entityHealthChanged.subscribe((ev) => {
      if (safeId(ev.entity) !== sheepId) return
      observedAtDelivery = `event(${ev.oldValue}->${ev.newValue}) componentReadsNow=${attempt(() => health(ev.entity)?.currentValue).value}`
    })
    const recorder = recordEvents(sheepId)
    sheep.applyDamage(2)
    const deliveredSynchronously = recorder.seen.length
    await tick(4)
    emit(
      `after-event-delivery-timing :: events-delivered-before-applyDamage-returned=${deliveredSynchronously} total-after-4-ticks=${recorder.seen.length}`,
    )
    emit(`after-event-delivery-timing :: handler-observed ${observedAtDelivery ?? 'never delivered'}`)
    world.afterEvents.entityHealthChanged.unsubscribe(handler)
    recorder.dispose()
  },

  'duplicate-subscription-delivery': async (ctx) => {
    const sheep = ctx.spawn()
    const sheepId = sheep.id
    const calls = []
    const shared = (ev) => {
      if (safeId(ev.hurtEntity) === sheepId) calls.push('shared')
    }
    world.afterEvents.entityHurt.subscribe(shared)
    world.afterEvents.entityHurt.subscribe(shared)
    const order = []
    const a = world.afterEvents.entityHurt.subscribe((ev) => {
      if (safeId(ev.hurtEntity) === sheepId) order.push('first')
    })
    const b = world.afterEvents.entityHurt.subscribe((ev) => {
      if (safeId(ev.hurtEntity) === sheepId) order.push('second')
    })
    sheep.applyDamage(1)
    await tick(4)
    emit(`duplicate-subscription-delivery :: same-closure-subscribed-twice deliveries=${calls.length}`)
    emit(`duplicate-subscription-delivery :: subscription-order=[${order.join(', ')}]`)
    world.afterEvents.entityHurt.unsubscribe(shared)
    world.afterEvents.entityHurt.unsubscribe(a)
    world.afterEvents.entityHurt.unsubscribe(b)
  },

  'entity-id-reuse': async (ctx) => {
    const firstIds = []
    for (let i = 0; i < 3; i++) {
      const sheep = ctx.spawn()
      firstIds.push(sheep.id)
      sheep.remove()
    }
    await tick(2)
    const secondIds = []
    for (let i = 0; i < 3; i++) secondIds.push(ctx.spawn().id)
    const reused = secondIds.filter((id) => firstIds.includes(id))
    emit(`entity-id-reuse :: first=[${firstIds.join(', ')}] second=[${secondIds.join(', ')}] reused=[${reused.join(', ')}]`)
  },

  'invalidation-nonuniformity-in-engine': async (ctx) => {
    const sheep = ctx.spawn()
    sheep.nameTag = 'mctest-bob'
    sheep.remove()
    await tick(2)
    for (const member of ['id', 'typeId', 'isValid', 'nameTag', 'isSneaking', 'scoreboardIdentity']) {
      emit(`invalidation-nonuniformity-in-engine :: ${member} ${show(attempt(() => sheep[member]))}`)
    }
    emit(`invalidation-nonuniformity-in-engine :: hasTag ${show(attempt(() => sheep.hasTag('x')))}`)
    emit(`invalidation-nonuniformity-in-engine :: getComponent ${show(attempt(() => sheep.getComponent('minecraft:health')))}`)
    emit(`invalidation-nonuniformity-in-engine :: location ${show(attempt(() => sheep.location))}`)
  },
}

// ---------------------------------------------------------------------------------------------
// Runner and triggers.

let running = false

const runAll = async (dimension, location, only) => {
  if (running) {
    emit('a run is already in progress')
    return
  }
  running = true
  const names = only && probes[only] ? [only] : Object.keys(probes)
  emit(`run start — ${names.length} probe(s), @minecraft/server 2.8.0 expected`)
  for (const name of names) {
    const ctx = makeContext(dimension, location)
    try {
      await probes[name](ctx)
    } catch (error) {
      emit(`${name} :: PROBE CRASHED ${String(error)} ${String(error?.stack ?? '')}`)
    } finally {
      ctx.dispose()
    }
    await tick(2)
  }
  emit('run complete — copy every [mctest] line into the design as the answer record')
  running = false
}

const startFrom = (sourceEntity, only) => {
  if (!sourceEntity) {
    emit('no source entity — run the command as a player so probes have a place to spawn')
    return
  }
  const dimension = sourceEntity.dimension
  const location = sourceEntity.location
  system.run(() => {
    void runAll(dimension, location, only)
  })
}

system.beforeEvents.startup.subscribe((event) => {
  event.customCommandRegistry.registerCommand(
    {
      name: 'mctest:run',
      description: 'Run the minecraft/test-lib engine probes and emit [mctest] result lines',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity)
      return { status: CustomCommandStatus.Success, message: 'mctest probes started' }
    },
  )
})

// Fallback trigger: /scriptevent mctest:run  (optionally /scriptevent mctest:run <probe-id>)
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== 'mctest:run') return
  startFrom(event.sourceEntity, event.message.trim() || undefined)
})
