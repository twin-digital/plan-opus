// Second in-engine probe pack for minecraft/test-lib. Two sets:
//   rest — the resting state of freshly-created engine objects (what the engine always populates)
//   gaps — follow-ups on existing tested facts whose claim outruns the observation behind it
// Each probe emits lines tagged with its probe name:
//   [mctest] <probe-name> :: <observation>
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

/** Like show, but spells out plain-data values (vectors, ranges) instead of naming their class. */
const showData = (outcome) => (outcome.ok ? `ok value=${json(outcome.value)}` : show(outcome))

const json = (value) => {
  try {
    const text = JSON.stringify(value)
    return text === undefined ? describeValue(value) : text
  } catch {
    return describeValue(value)
  }
}

/** Component-wise b - a for two vectors, or undefined if either is unreadable. */
const delta = (a, b) => {
  if (!a || !b) return undefined
  return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }
}

const safeId = (entity) => {
  try {
    return entity.id
  } catch {
    return '<id-unreadable>'
  }
}

const typeIds = (components) => (components ?? []).map((component) => component?.typeId)

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

const health = (entity) => entity.getComponent('minecraft:health')

/** Own property names across an object's whole prototype chain, minus constructor. */
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

// ---------------------------------------------------------------------------------------------
// Group A — resting state. What does the engine always populate on a freshly-created object?
// Together these say whether an empty fake (`no-implicit-defaults`) is an impossible engine
// state across a family of fields, not only the dimension trio
// (`vanilla-dimension-set-on-a-world`).

const restingProbes = {
  'resting-entity-fields': async (ctx) => {
    const sheep = ctx.spawn()
    emit(`resting-entity-fields :: components=[${typeIds(attempt(() => sheep.getComponents()).value).join(', ')}]`)
    emit(`resting-entity-fields :: componentCount=${attempt(() => sheep.getComponents().length).value}`)
    emit(`resting-entity-fields :: nameTag ${show(attempt(() => sheep.nameTag))} (empty-string check: length=${attempt(() => sheep.nameTag?.length).value})`)
    emit(`resting-entity-fields :: localizationKey ${show(attempt(() => sheep.localizationKey))}`)
    emit(`resting-entity-fields :: location ${showData(attempt(() => sheep.location))}`)
    emit(`resting-entity-fields :: dimension.id ${show(attempt(() => sheep.dimension.id))}`)
    emit(`resting-entity-fields :: getRotation() ${showData(attempt(() => sheep.getRotation()))}`)
    emit(`resting-entity-fields :: getVelocity() ${showData(attempt(() => sheep.getVelocity()))}`)
    emit(`resting-entity-fields :: isValid ${show(attempt(() => sheep.isValid))}`)
    emit(`resting-entity-fields :: typeId ${show(attempt(() => sheep.typeId))}`)
    emit(`resting-entity-fields :: getTags() ${json(attempt(() => sheep.getTags()).value)}`)
    const component = attempt(() => health(sheep)).value
    for (const member of ['currentValue', 'defaultValue', 'effectiveMin', 'effectiveMax']) {
      emit(`resting-entity-fields :: health.${member} ${show(attempt(() => component?.[member]))}`)
    }
  },

  // Open point: are the resting kinematic/naming fields universal engine constants, or do they
  // vary by entity type? `resting-entity-fields` sampled a sheep only (n=1). Per-type raw values
  // are emitted alongside the uniformity verdict so the conclusion is checkable from the log.
  'resting-kinematics': async (ctx) => {
    const types = [
      'minecraft:sheep',
      'minecraft:cow',
      'minecraft:chicken',
      'minecraft:zombie',
      'minecraft:armor_stand',
      'minecraft:xp_orb',
      'minecraft:arrow',
      'minecraft:boat',
    ]
    const requested = ctx.location
    const samples = []
    const live = []
    for (const typeId of types) {
      const spawn = attempt(() => ctx.spawn(typeId))
      if (!spawn.ok) {
        emit(`resting-kinematics :: ${typeId} spawn ${show(spawn)}`)
        continue
      }
      const entity = spawn.value
      const rotation = attempt(() => entity.getRotation())
      const velocity = attempt(() => entity.getVelocity())
      const nameTag = attempt(() => entity.nameTag)
      const location = attempt(() => entity.location)
      emit(`resting-kinematics :: ${typeId} getRotation() ${showData(rotation)}`)
      emit(`resting-kinematics :: ${typeId} getVelocity() ${showData(velocity)}`)
      emit(`resting-kinematics :: ${typeId} nameTag ${show(nameTag)} length=${json(attempt(() => entity.nameTag?.length).value)}`)
      emit(`resting-kinematics :: ${typeId} requested-location=${json(requested)} location ${showData(location)} delta=${json(delta(requested, location.ok ? location.value : undefined))}`)
      samples.push({
        typeId,
        rotation: rotation.ok ? json(rotation.value) : `threw:${rotation.name}`,
        velocity: velocity.ok ? json(velocity.value) : `threw:${velocity.name}`,
        nameTag: nameTag.ok ? json(nameTag.value) : `threw:${nameTag.name}`,
      })
      live.push({ typeId, entity })
    }
    emit(`resting-kinematics :: sampled=${samples.length}/${types.length} types=[${samples.map((s) => s.typeId).join(', ')}]`)
    for (const field of ['rotation', 'velocity', 'nameTag']) {
      const values = [...new Set(samples.map((s) => s[field]))]
      emit(
        `resting-kinematics :: ${field} uniform=${values.length <= 1} distinctValues=${values.length} values=[${values.join(' | ')}]`,
      )
    }

    // Separate observation: a type whose velocity is zero only on the spawn frame (falling or
    // self-propelled) is distinguishable from one that truly rests at zero.
    await tick(2)
    for (const { typeId, entity } of live) {
      const rotation = attempt(() => entity.getRotation())
      const velocity = attempt(() => entity.getVelocity())
      const location = attempt(() => entity.location)
      emit(
        `resting-kinematics-after-2-ticks :: ${typeId} isValid=${json(attempt(() => entity.isValid).value)} getRotation() ${showData(rotation)} getVelocity() ${showData(velocity)} location ${showData(location)} delta=${json(delta(requested, location.ok ? location.value : undefined))}`,
      )
    }
  },

  // `resting-kinematics` holds all eight types live at one point, so its post-spawn samples read
  // the engine resolving overlap — with the source entity included in the pile. This spawns one
  // type at a time, clear of the source, and removes it before the next. The neighbour count at
  // each sample is emitted as the evidence that the reading was uncontended; a nonzero count
  // means the sample is contended and the value should not be read as a resting one.
  'resting-kinematics-isolated': async (ctx) => {
    const types = [
      'minecraft:sheep',
      'minecraft:cow',
      'minecraft:chicken',
      'minecraft:zombie',
      'minecraft:armor_stand',
      'minecraft:xp_orb',
      'minecraft:arrow',
      'minecraft:boat',
    ]
    // Cycled so a slow removal cannot leave the previous sample where the next one lands.
    const offsets = [
      { x: 4, z: 0 },
      { x: -4, z: 0 },
      { x: 0, z: 4 },
      { x: 0, z: -4 },
    ]
    const base = ctx.location

    const neighbours = (entity, at) => {
      const found = attempt(() =>
        ctx.dimension.getEntities({ location: at, maxDistance: 4 }).filter((other) => safeId(other) !== safeId(entity)),
      )
      return found.ok ? found.value.length : `threw:${found.name}`
    }

    const sample = (label, typeId, entity, requested) => {
      const rotation = attempt(() => entity.getRotation())
      const velocity = attempt(() => entity.getVelocity())
      const location = attempt(() => entity.location)
      emit(
        `resting-kinematics-isolated :: [${label}] ${typeId} isValid=${json(attempt(() => entity.isValid).value)} getRotation() ${showData(rotation)} getVelocity() ${showData(velocity)} location ${showData(location)} delta=${json(delta(requested, location.ok ? location.value : undefined))} neighboursWithin4=${location.ok ? neighbours(entity, location.value) : 'n/a'}`,
      )
    }

    for (const [index, typeId] of types.entries()) {
      const offset = offsets[index % offsets.length]
      const requested = { x: base.x + offset.x, y: base.y, z: base.z + offset.z }
      const spawn = attempt(() => ctx.dimension.spawnEntity(typeId, requested))
      if (!spawn.ok) {
        emit(`resting-kinematics-isolated :: ${typeId} spawn ${show(spawn)}`)
        continue
      }
      const entity = spawn.value
      emit(
        `resting-kinematics-isolated :: ${typeId} requested-location=${json(requested)} nameTag ${show(attempt(() => entity.nameTag))} length=${json(attempt(() => entity.nameTag?.length).value)}`,
      )
      sample('spawn-frame', typeId, entity, requested)
      await tick(2)
      sample('after-2-ticks', typeId, entity, requested)
      // Long enough for a falling or self-propelled type to separate from one that truly rests.
      await tick(20)
      sample('after-22-ticks', typeId, entity, requested)
      if (attempt(() => entity.isValid).value === true) {
        attempt(() => entity.remove())
      }
      await tick(2)
    }
  },

  // Open point: can a valid entity carry zero components at all?
  'component-poor-entities': async (ctx) => {
    for (const typeId of ['minecraft:arrow', 'minecraft:armor_stand', 'minecraft:xp_orb', 'minecraft:item']) {
      const spawn = attempt(() => ctx.spawn(typeId))
      if (!spawn.ok) {
        emit(`component-poor-entities :: ${typeId} spawn ${show(spawn)}`)
        continue
      }
      const entity = spawn.value
      const components = attempt(() => entity.getComponents())
      if (!components.ok) {
        emit(`component-poor-entities :: ${typeId} getComponents ${show(components)}`)
        continue
      }
      const ids = typeIds(components.value)
      emit(`component-poor-entities :: ${typeId} count=${ids.length} zeroComponents=${ids.length === 0} components=[${ids.join(', ')}]`)
    }
  },

  // Closes the open question `vanilla-dimension-set-on-a-world`: what does the engine hand back
  // for the three vanilla ids, in both prefixed and bare spelling?
  'vanilla-dimensions': async () => {
    for (const id of ['overworld', 'nether', 'the_end', 'minecraft:overworld', 'minecraft:nether', 'minecraft:the_end']) {
      const lookup = attempt(() => world.getDimension(id))
      if (!lookup.ok) {
        emit(`vanilla-dimensions :: requested="${id}" ${show(lookup)}`)
        continue
      }
      const dimension = lookup.value
      emit(
        `vanilla-dimensions :: requested="${id}" -> id=${json(attempt(() => dimension.id).value)} heightRange=${json(attempt(() => dimension.heightRange).value)} localizationKey=${json(attempt(() => dimension.localizationKey).value)}`,
      )
    }
    emit(`vanilla-dimensions :: unknown-id ${show(attempt(() => world.getDimension('mctest2:nope')))}`)
    emit(`vanilla-dimensions :: end-alias "the end" ${show(attempt(() => world.getDimension('the end')))}`)
  },

  'resting-world-fields': async () => {
    for (const member of ['beforeEvents', 'afterEvents', 'scoreboard', 'gameRules', 'isHardcore']) {
      emit(`resting-world-fields :: ${member} ${show(attempt(() => world[member]))}`)
    }
    emit(`resting-world-fields :: scoreboard.getObjectives().length ${show(attempt(() => world.scoreboard.getObjectives().length))}`)
    emit(`resting-world-fields :: getAllPlayers().length ${show(attempt(() => world.getAllPlayers().length))}`)
    emit(`resting-world-fields :: seed ${show(attempt(() => world.seed))}`)
    emit(`resting-world-fields :: gameRules keys=${json(attempt(() => chainMembers(world.gameRules)).value)}`)
    emit(`resting-world-fields :: afterEvents signal count=${attempt(() => chainMembers(world.afterEvents).length).value}`)
    emit(`resting-world-fields :: beforeEvents signal count=${attempt(() => chainMembers(world.beforeEvents).length).value}`)
  },

  'resting-effect-fields': async (ctx) => {
    const sheep = ctx.spawn()
    sheep.addEffect('speed', 400, { amplifier: 1 })
    const effect = attempt(() => sheep.getEffect('speed'))
    emit(`resting-effect-fields :: getEffect ${show(effect)}`)
    for (const member of ['typeId', 'duration', 'amplifier', 'displayName', 'isValid']) {
      emit(`resting-effect-fields :: ${member} ${show(attempt(() => effect.value?.[member]))}`)
    }
    emit(`resting-effect-fields :: getEffects()=[${(attempt(() => sheep.getEffects()).value ?? []).map((e) => attempt(() => e.typeId).value).join(', ')}]`)
  },

  'resting-player-fields': async (ctx) => {
    const player = ctx.source
    const isPlayer = attempt(() => typeof player?.name === 'string').value === true
    if (!isPlayer) {
      emit(`resting-player-fields :: no triggering player (source typeId=${attempt(() => player?.typeId).value}) — rerun as a player to sample this`)
      return
    }
    emit(`resting-player-fields :: name ${show(attempt(() => player.name))}`)
    const playerComponents = typeIds(attempt(() => player.getComponents()).value)
    emit(`resting-player-fields :: componentCount=${playerComponents.length} components=[${playerComponents.join(', ')}]`)
    const sheep = ctx.spawn()
    const sheepComponents = typeIds(attempt(() => sheep.getComponents()).value)
    const extra = playerComponents.filter((id) => !sheepComponents.includes(id))
    const missing = sheepComponents.filter((id) => !playerComponents.includes(id))
    emit(`resting-player-fields :: player-only=[${extra.join(', ')}]`)
    emit(`resting-player-fields :: sheep-only=[${missing.join(', ')}]`)
  },
}

// ---------------------------------------------------------------------------------------------
// Group B — each probe closes a gap between an existing fact's claim and the observation it
// rests on. The targeted fact is named above each probe.

const gapProbes = {
  // fact: attribute-guard-classes-observed — claims "the resets" but only resetToDefaultValue ran.
  'attribute-reset-guards': async (ctx) => {
    const sheep = ctx.spawn()
    const component = health(sheep)
    sheep.remove()
    await tick(2)
    for (const method of ['resetToDefaultValue', 'resetToMaxValue', 'resetToMinValue']) {
      emit(`attribute-reset-guards :: ${method}() ${show(attempt(() => component?.[method]()))}`)
    }
  },

  // fact: kill-no-health-behaviour — claims "immediately invalid" but sampled only after tick(4).
  'kill-no-health-invalidation-timing': async (ctx) => {
    const arrow = ctx.spawn('minecraft:arrow')
    emit(`kill-no-health-invalidation-timing :: before-kill isValid=${attempt(() => arrow.isValid).value} healthComponent=${describeValue(attempt(() => arrow.getComponent('minecraft:health')).value)}`)
    const killed = attempt(() => arrow.kill())
    emit(`kill-no-health-invalidation-timing :: kill ${show(killed)} synchronous-isValid ${show(attempt(() => arrow.isValid))}`)
    for (let elapsed = 1; elapsed <= 5; elapsed++) {
      await tick(1)
      emit(`kill-no-health-invalidation-timing :: tick+${elapsed} isValid ${show(attempt(() => arrow.isValid))}`)
    }
  },

  // fact: kill-and-remove-cascades — claims remove() "fires no event at all", but only
  // entityHurt/entityHealthChanged/entityDie were subscribed. Sweep every world after-event.
  'remove-event-sweep': async (ctx) => {
    const sheep = ctx.spawn()
    const sheepId = sheep.id
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
          fired.push(`${name}${mentionsEntity(event, sheepId) ? '(ours)' : '(other)'}`)
        }),
      )
      if (subscribed.ok) subscriptions.push([signal.value, subscribed.value])
      else skipped.push(`${name}!`)
    }
    emit(`remove-event-sweep :: subscribed=${subscriptions.length} skipped=${skipped.length} skipped-names=[${skipped.join(', ')}]`)
    fired.length = 0
    sheep.remove()
    await tick(4)
    emit(`remove-event-sweep :: after remove() fired=[${fired.join(', ')}] count=${fired.length}`)
    for (const [signal, handler] of subscriptions) attempt(() => signal.unsubscribe(handler))
  },

  // fact: invalidation-guard-list-complete — the member list was hand-written and miscounted.
  // Enumerate the Entity prototype chain instead and partition it at runtime.
  'invalidation-guard-reflected': async (ctx) => {
    const sheep = ctx.spawn()
    const members = chainMembers(sheep)
    const properties = []
    const zeroArgMethods = []
    const argMethods = []
    for (const name of members) {
      const probe = attempt(() => sheep[name])
      const value = probe.ok ? probe.value : undefined
      if (typeof value === 'function') (value.length === 0 ? zeroArgMethods : argMethods).push(name)
      else properties.push(name)
    }
    emit(
      `invalidation-guard-reflected :: enumerated=${members.length} properties=${properties.length} zeroArgMethods=${zeroArgMethods.length} argMethods=${argMethods.length}`,
    )
    emit(`invalidation-guard-reflected :: properties=[${properties.join(', ')}]`)
    emit(`invalidation-guard-reflected :: zeroArgMethods=[${zeroArgMethods.join(', ')}]`)
    emit(`invalidation-guard-reflected :: argMethods=[${argMethods.join(', ')}]`)
    sheep.remove()
    await tick(2)
    let readable = 0
    for (const name of properties) {
      const outcome = attempt(() => sheep[name])
      if (outcome.ok) readable++
      emit(`invalidation-guard-reflected :: prop ${name} ${show(outcome)}`)
    }
    for (const name of zeroArgMethods) {
      emit(`invalidation-guard-reflected :: method ${name}() ${show(attempt(() => sheep[name]()))}`)
    }
    // Called with no arguments: an argument error rather than InvalidEntityError means the
    // engine validates arguments before the validity guard.
    for (const name of argMethods) {
      emit(`invalidation-guard-reflected :: argMethod ${name}(<no args>) ${show(attempt(() => sheep[name]()))}`)
    }
    emit(`invalidation-guard-reflected :: readable-properties-after-remove=${readable}`)
  },

  // fact: effect-replacement-rule-observed — says "(or equal) duration" but no equal-duration
  // case ran, and the existing matrix's `readDur === dur` discriminator cannot see one. Let the
  // base decay first: an unreplaced base reads back < the re-added duration, a replacement reads
  // back exactly it.
  'effect-equal-duration-replacement': async (ctx) => {
    const DURATION = 300
    const DECAY_TICKS = 10
    for (const [label, amp] of [['higher-amp/equal-dur', 2], ['same-amp/equal-dur', 1], ['lower-amp/equal-dur', 0]]) {
      const sheep = ctx.spawn()
      sheep.addEffect('speed', DURATION, { amplifier: 1 })
      await tick(DECAY_TICKS)
      const decayed = sheep.getEffect('speed')
      const decayedAmp = attempt(() => decayed?.amplifier).value
      const decayedDur = attempt(() => decayed?.duration).value
      sheep.addEffect('speed', DURATION, { amplifier: amp })
      const effect = sheep.getEffect('speed')
      const readAmp = attempt(() => effect?.amplifier).value
      const readDur = attempt(() => effect?.duration).value
      const replaced = readDur === DURATION && decayedDur < DURATION
      emit(
        `effect-equal-duration-replacement :: [${label}] base(amp1,dur${DURATION}) decayed-to(amp${decayedAmp},dur${decayedDur}) readd(amp${amp},dur${DURATION}) -> readback(amp${readAmp},dur${readDur}) replaced=${replaced} discriminator="readDur===${DURATION} means fresh application; readDur===${decayedDur} means the decayed base survived"`,
      )
    }
  },

  // fact: namespace-prefix-is-optional — sourced on component ids only. Try the other surfaces.
  'namespace-prefix-other-surfaces': async (ctx) => {
    const sheep = ctx.spawn()
    for (const form of ['speed', 'minecraft:speed']) {
      const added = attempt(() => sheep.addEffect(form, 400, { amplifier: 1 }))
      emit(`namespace-prefix-other-surfaces :: addEffect("${form}") ${show(added)} reportedTypeId=${json(attempt(() => added.value?.typeId).value)}`)
    }
    for (const form of ['speed', 'minecraft:speed']) {
      const read = attempt(() => sheep.getEffect(form))
      emit(`namespace-prefix-other-surfaces :: getEffect("${form}") ${show(read)} reportedTypeId=${json(attempt(() => read.value?.typeId).value)}`)
    }
    for (const form of ['sheep', 'minecraft:sheep']) {
      const spawned = attempt(() => ctx.spawn(form))
      emit(`namespace-prefix-other-surfaces :: spawnEntity("${form}") ${show(spawned)} reportedTypeId=${json(attempt(() => spawned.value?.typeId).value)}`)
    }
    for (const form of ['entity_born', 'minecraft:entity_born', 'ageable_grow_up', 'minecraft:ageable_grow_up']) {
      const target = ctx.spawn()
      emit(`namespace-prefix-other-surfaces :: triggerEvent("${form}") ${show(attempt(() => target.triggerEvent(form)))}`)
    }
    for (const form of ['health', 'minecraft:health']) {
      emit(`namespace-prefix-other-surfaces :: getComponent("${form}") ${show(attempt(() => sheep.getComponent(form)))} reportedTypeId=${json(attempt(() => sheep.getComponent(form)?.typeId).value)}`)
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
      name: 'mctest2:rest',
      description: 'Run the resting-state probes and emit [mctest] result lines',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, restingProbes, 'rest')
      return { status: CustomCommandStatus.Success, message: 'mctest resting-state probes started' }
    },
  )
  registry.registerCommand(
    {
      name: 'mctest2:gaps',
      description: 'Run the follow-up probes that close gaps in existing tested facts',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, gapProbes, 'gaps')
      return { status: CustomCommandStatus.Success, message: 'mctest gap probes started' }
    },
  )
})

// Fallback triggers:
//   /scriptevent mctest2:rest [probe-id]
//   /scriptevent mctest2:gaps [probe-id]
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === 'mctest2:rest') {
    startFrom(event.sourceEntity, restingProbes, 'rest', event.message.trim() || undefined)
  } else if (event.id === 'mctest2:gaps') {
    startFrom(event.sourceEntity, gapProbes, 'gaps', event.message.trim() || undefined)
  }
})
