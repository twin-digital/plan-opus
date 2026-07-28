// Access-guard probes for minecraft/test-lib. Two sets:
//   access — whether the invalidation guard fires when an Entity member is *accessed* or only when
//            it is *called*, across four orderings of access and call on an entity invalidated by
//            remove(), each ordering reported as its own verdict
//   shape  — what the `in` operator, key enumeration, typeof, instanceof and constructor read on a
//            valid entity and on an invalidated one: what a pack doing feature detection sees
// Each probe emits lines tagged with its probe name:
//   [mctest] <probe-name> :: <observation>
// Probes observe and report; they do not assert.
import {
  CommandPermissionLevel,
  CustomCommandStatus,
  Entity,
  InvalidEntityError,
  Player,
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
    ? `ok typeof=${typeof outcome.value} value=${describeValue(outcome.value)}`
    : `threw name=${outcome.name} ctor=${outcome.ctor} instanceofInvalidEntityError=${outcome.invalidEntity} message="${outcome.message}"`

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

// ---------------------------------------------------------------------------------------------
// Set: access

// Signatures from the pinned @minecraft/server 2.8.0 index.d.ts, `export class Entity`. The six
// named members plus zero-arg getters the earlier reflective sweep reached with the guard firing.
const MEMBERS = [
  { name: 'kill', args: () => [], destructive: true },
  { name: 'teleport', args: (ctx) => [ctx.location] },
  { name: 'hasTag', args: () => ['mctest_tag'] },
  { name: 'getComponent', args: () => ['minecraft:health'] },
  { name: 'applyDamage', args: () => [1] },
  { name: 'triggerEvent', args: () => ['minecraft:entity_born'] },
  { name: 'getTags', args: () => [] },
  { name: 'getVelocity', args: () => [] },
  { name: 'getRotation', args: () => [] },
  { name: 'getHeadLocation', args: () => [] },
  { name: 'getViewDirection', args: () => [] },
  { name: 'getEffects', args: () => [] },
  { name: 'getComponents', args: () => [] },
  { name: 'getDynamicPropertyIds', args: () => [] },
]

/** Properties read for contrast: the guard's behaviour on a plain property read is already known. */
const PROPERTIES = ['id', 'typeId', 'isValid', 'nameTag', 'location', 'dimension']

const accessVerdict = (outcome) => {
  if (!outcome.ok) return outcome.invalidEntity ? 'ACCESS-THREW-INVALID-ENTITY' : 'ACCESS-THREW-OTHER'
  if (typeof outcome.value === 'function') return 'ACCESS-CLEAN-FUNCTION'
  if (outcome.value === undefined) return 'ACCESS-CLEAN-UNDEFINED'
  return `ACCESS-CLEAN-OTHER-${typeof outcome.value}`
}

const callVerdict = (prefix, outcome) => {
  if (outcome.ok) return `${prefix}-RETURNED`
  if (outcome.invalidEntity) return `${prefix}-THREW-INVALID-ENTITY`
  if (outcome.name === 'TypeError') return `${prefix}-THREW-TYPE-ERROR`
  return `${prefix}-THREW-OTHER`
}

/** Spawns a subject, removes it, and lets the removal settle before it is probed. */
const invalidatedSubject = async (ctx, index) => {
  const entity = ctx.spawn(SHEEP, offsetFor(index))
  const id = safeId(entity)
  entity.remove()
  await tick(2)
  return { entity, id }
}

const accessProbes = {
  // The whole question in one probe: four orderings of access and call on the same invalidated
  // state, each on its own freshly invalidated subject so no case inherits another's side effect,
  // and a valid control per member so an argument problem cannot be mistaken for a guard.
  'access-versus-call': async (ctx) => {
    emit(
      `access-versus-call :: ${MEMBERS.length} Entity members × 4 orderings on a subject invalidated by ` +
        'remove(), plus a valid control per member. Case 1 (access only) is the headline: ' +
        'ACCESS-THREW means the engine guards the property read; ACCESS-CLEAN means it guards the call',
    )
    let index = 0
    const results = []
    for (const member of MEMBERS) {
      const args = attempt(() => member.args(ctx))
      if (!args.ok) {
        emit(`access-versus-call :: ${member.name} ARGUMENT CONSTRUCTION FAILED ${show(args)}`)
        continue
      }
      const argv = args.value

      // Control: a valid entity, accessed and then called with the same arguments. Without it a
      // throw on the subject could be the arguments rather than the guard.
      index += 1
      const control = ctx.spawn(SHEEP, offsetFor(index))
      const controlAccess = attempt(() => control[member.name])
      const controlCall = attempt(() => control[member.name](...argv))
      emit(
        `access-versus-call :: [control-valid] ${member.name} access ${show(controlAccess)} ` +
          `call(${argv.map(json).join(', ')}) ${show(controlCall)} ` +
          `verdict=${accessVerdict(controlAccess)}/${callVerdict('CONTROL-CALL', controlCall)}`,
      )

      // Case 1 — access only. Nothing is called; the reference is not used.
      index += 1
      const one = await invalidatedSubject(ctx, index)
      const access = attempt(() => one.entity[member.name])
      const caseOne = accessVerdict(access)
      emit(
        `access-versus-call :: [1-access-only] ${member.name} subject=${one.id} ` +
          `const fn = subject.${member.name} (NOT called) ${show(access)} verdict=${caseOne}`,
      )

      // Case 2 — access, then call the reference.
      index += 1
      const two = await invalidatedSubject(ctx, index)
      const twoAccess = attempt(() => two.entity[member.name])
      const twoCall = twoAccess.ok && typeof twoAccess.value === 'function'
        ? attempt(() => twoAccess.value.call(two.entity, ...argv))
        : undefined
      const twoUnbound = twoAccess.ok && typeof twoAccess.value === 'function'
        ? attempt(() => twoAccess.value(...argv))
        : undefined
      const caseTwo = twoCall === undefined ? `NO-CALL-${accessVerdict(twoAccess)}` : callVerdict('ACCESS-THEN-CALL', twoCall)
      emit(
        `access-versus-call :: [2-access-then-call] ${member.name} subject=${two.id} ` +
          `access ${show(twoAccess)} then fn.call(subject, ${argv.map(json).join(', ')}) ` +
          `${twoCall ? show(twoCall) : 'not attempted — access did not yield a function'} ` +
          `unbound fn(...) ${twoUnbound ? show(twoUnbound) : 'not attempted'} verdict=${caseTwo}`,
      )

      // Case 3 — the direct call every earlier sweep made, as the control ordering.
      index += 1
      const three = await invalidatedSubject(ctx, index)
      const threeCall = attempt(() => three.entity[member.name](...argv))
      const caseThree = callVerdict('CALL-DIRECT', threeCall)
      emit(
        `access-versus-call :: [3-call-direct] ${member.name} subject=${three.id} ` +
          `subject.${member.name}(${argv.map(json).join(', ')}) ${show(threeCall)} verdict=${caseThree}`,
      )

      // Case 4 — reference taken while valid, called after invalidation. Says whether the guard is
      // bound at access time or read at call time.
      index += 1
      const four = ctx.spawn(SHEEP, offsetFor(index))
      const fourId = safeId(four)
      const fourAccess = attempt(() => four[member.name])
      const removed = attempt(() => four.remove())
      await tick(2)
      const stillValid = attempt(() => four.isValid)
      const fourCall = fourAccess.ok && typeof fourAccess.value === 'function'
        ? attempt(() => fourAccess.value.call(four, ...argv))
        : undefined
      const caseFour =
        !removed.ok
          ? 'SUBJECT-REMOVE-FAILED'
          : fourCall === undefined
            ? `NO-CALL-${accessVerdict(fourAccess)}`
            : callVerdict('CAPTURED-VALID-CALLED-INVALID', fourCall)
      emit(
        `access-versus-call :: [4-capture-valid-call-invalid] ${member.name} subject=${fourId} ` +
          `access-while-valid ${show(fourAccess)} remove ${show(removed)} isValid-after=${json(stillValid.value)} ` +
          `then fn.call(subject, ${argv.map(json).join(', ')}) ` +
          `${fourCall ? show(fourCall) : 'not attempted — access did not yield a function'} verdict=${caseFour}`,
      )

      results.push({ member: member.name, caseOne, caseTwo, caseThree, caseFour })
      await tick(1)
    }

    const tally = (key) => {
      const counts = new Map()
      for (const r of results) counts.set(r[key], (counts.get(r[key]) ?? 0) + 1)
      return counts
    }
    const report = (key, label) => {
      for (const [verdict, count] of tally(key)) {
        emit(
          `access-versus-call :: SUMMARY ${label} ${verdict} count=${count} members=[${results
            .filter((r) => r[key] === verdict)
            .map((r) => r.member)
            .join(', ')}]`,
        )
      }
    }
    emit(`access-versus-call :: SUMMARY members=${results.length}`)
    report('caseOne', 'case-1-access-only')
    report('caseTwo', 'case-2-access-then-call')
    report('caseThree', 'case-3-call-direct')
    report('caseFour', 'case-4-capture-valid-call-invalid')

    const threw = results.filter((r) => r.caseOne.startsWith('ACCESS-THREW'))
    const clean = results.filter((r) => r.caseOne.startsWith('ACCESS-CLEAN'))
    emit(
      `access-versus-call :: SUMMARY HEADLINE access-only ACCESS-THREW=${threw.length}/${results.length} ` +
        `ACCESS-CLEAN=${clean.length}/${results.length} ` +
        `threw=[${threw.map((r) => r.member).join(', ')}] clean=[${clean.map((r) => r.member).join(', ')}] ` +
        '— ACCESS-THREW means the engine fires the invalidation guard on the property read; ' +
        'ACCESS-CLEAN means the read is unguarded and the guard is on the call',
    )
    const boundAtAccess = results.filter((r) => r.caseFour === 'CAPTURED-VALID-CALLED-INVALID-RETURNED')
    emit(
      `access-versus-call :: SUMMARY HEADLINE capture-before-invalidation ` +
        `returned-anyway=${boundAtAccess.length}/${results.length} ` +
        `members=[${boundAtAccess.map((r) => r.member).join(', ')}] ` +
        '— a member that returns here has a guard bound at access time; one that throws reads validity at call time',
    )
  },

  // Contrast for the headline: what a plain property read does on the same invalidated state. A
  // property has no call form, so this separates "the guard fires on reads" from "the guard fires
  // on reads of methods".
  'invalid-property-reads': async (ctx) => {
    const control = ctx.spawn(SHEEP, { x: 6 })
    const subject = ctx.spawn(SHEEP, { x: -6 })
    const subjectId = safeId(subject)
    subject.remove()
    await tick(2)
    for (const property of PROPERTIES) {
      const onControl = attempt(() => control[property])
      const onSubject = attempt(() => subject[property])
      emit(
        `invalid-property-reads :: ${property} control-valid ${show(onControl)} ` +
          `subject-invalid ${show(onSubject)} verdict=${accessVerdict(onSubject)}`,
      )
    }
    emit(
      `invalid-property-reads :: SUMMARY subject=${subjectId} properties=${json(PROPERTIES)} ` +
        '— read beside case 1 of access-versus-call: the same access syntax, on a property rather than a method',
    )
  },
}

// ---------------------------------------------------------------------------------------------
// Set: shape

/** The prototype chain by constructor name, as deep as it goes. */
const protoChain = (value) => {
  const names = []
  let current = value
  for (let depth = 0; depth < 8; depth += 1) {
    const next = attempt(() => Object.getPrototypeOf(current))
    if (!next.ok) {
      names.push(`<getPrototypeOf threw ${next.name}>`)
      break
    }
    if (next.value === null || next.value === undefined) break
    const name = attempt(() => next.value.constructor?.name)
    names.push(name.ok ? String(name.value) : `<threw ${name.name}>`)
    current = next.value
  }
  return names
}

const shapeProbes = {
  // What ordinary JavaScript reads off an entity: the `in` operator, own-key enumeration, typeof,
  // instanceof and constructor. The valid entity is the control for the invalidated one; the two
  // are the same species of entity, spawned together.
  'member-visibility': async (ctx) => {
    emit(
      'member-visibility :: the `in` operator, key enumeration, typeof, instanceof and constructor, ' +
        'read on a valid entity and on one invalidated by remove(). Plain answers only',
    )
    const valid = ctx.spawn(SHEEP, { x: 4, z: 4 })
    const invalid = ctx.spawn(SHEEP, { x: -4, z: 4 })
    const invalidId = safeId(invalid)
    invalid.remove()
    await tick(2)

    const states = [
      ['valid-control', valid],
      ['invalidated-subject', invalid],
    ]
    const collected = {}
    for (const [state, entity] of states) {
      const inTeleport = attempt(() => 'teleport' in entity)
      const inNameTag = attempt(() => 'nameTag' in entity)
      const inInvented = attempt(() => 'notAMember' in entity)
      emit(
        `member-visibility :: [${state}] in-operator 'teleport'=${show(inTeleport)} ` +
          `'nameTag'=${show(inNameTag)} 'notAMember'=${show(inInvented)}`,
      )

      const keys = attempt(() => Object.keys(entity))
      const ownNames = attempt(() => Object.getOwnPropertyNames(entity))
      const forIn = attempt(() => {
        const seen = []
        for (const key in entity) seen.push(key)
        return seen
      })
      emit(
        `member-visibility :: [${state}] Object.keys ${keys.ok ? `count=${keys.value.length} first=${json(keys.value.slice(0, 6))}` : show(keys)} ` +
          `Object.getOwnPropertyNames ${ownNames.ok ? `count=${ownNames.value.length} first=${json(ownNames.value.slice(0, 6))}` : show(ownNames)} ` +
          `for-in ${forIn.ok ? `count=${forIn.value.length} first=${json(forIn.value.slice(0, 6))}` : show(forIn)}`,
      )

      const typeofTeleport = attempt(() => typeof entity.teleport)
      const typeofInvented = attempt(() => typeof entity.notAMember)
      const typeofEntity = attempt(() => typeof entity)
      emit(
        `member-visibility :: [${state}] typeof entity.teleport=${show(typeofTeleport)} ` +
          `typeof entity.notAMember=${show(typeofInvented)} typeof entity=${show(typeofEntity)}`,
      )

      const isEntity = attempt(() => entity instanceof Entity)
      const isPlayer = attempt(() => entity instanceof Player)
      const isObject = attempt(() => entity instanceof Object)
      const entityProtoOf = attempt(() => Entity.prototype.isPrototypeOf(entity))
      const ctorName = attempt(() => entity.constructor?.name)
      emit(
        `member-visibility :: [${state}] instanceof Entity=${show(isEntity)} Player=${show(isPlayer)} ` +
          `Object=${show(isObject)} Entity.prototype.isPrototypeOf=${show(entityProtoOf)} ` +
          `constructor?.name=${show(ctorName)} prototype-chain=${json(protoChain(entity))}`,
      )

      const stringified = attempt(() => JSON.stringify(entity))
      const stringed = attempt(() => String(entity))
      const spread = attempt(() => Object.keys({ ...entity }))
      const descriptor = attempt(() => json(Object.getOwnPropertyDescriptor(Entity.prototype, 'nameTag')))
      emit(
        `member-visibility :: [${state}] JSON.stringify=${show(stringified)} String()=${show(stringed)} ` +
          `spread-own-keys=${spread.ok ? json(spread.value) : show(spread)} ` +
          `Entity.prototype descriptor for 'nameTag'=${descriptor.ok ? String(descriptor.value) : show(descriptor)}`,
      )

      collected[state] = {
        inTeleport: inTeleport.ok ? inTeleport.value : `threw:${inTeleport.name}`,
        inNameTag: inNameTag.ok ? inNameTag.value : `threw:${inNameTag.name}`,
        inInvented: inInvented.ok ? inInvented.value : `threw:${inInvented.name}`,
        keys: keys.ok ? keys.value.length : `threw:${keys.name}`,
        ownNames: ownNames.ok ? ownNames.value.length : `threw:${ownNames.name}`,
        typeofTeleport: typeofTeleport.ok ? typeofTeleport.value : `threw:${typeofTeleport.name}`,
        typeofInvented: typeofInvented.ok ? typeofInvented.value : `threw:${typeofInvented.name}`,
        instanceofEntity: isEntity.ok ? isEntity.value : `threw:${isEntity.name}`,
        constructorName: ctorName.ok ? ctorName.value : `threw:${ctorName.name}`,
      }
    }

    emit(`member-visibility :: SUMMARY invalidated-subject=${invalidId}`)
    for (const [state, row] of Object.entries(collected)) {
      emit(`member-visibility :: SUMMARY [${state}] ${json(row)}`)
    }
    const same = json(collected['valid-control']) === json(collected['invalidated-subject'])
    emit(
      `member-visibility :: SUMMARY valid-and-invalid-read-identically=${same} ` +
        '— every field above is what a pack doing feature detection would see',
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
      name: 'mctest6:access',
      description: 'Does the invalidation guard fire on member access, or only on the call?',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, accessProbes, 'access')
      return { status: CustomCommandStatus.Success, message: 'mctest access-guard probes started' }
    },
  )
  registry.registerCommand(
    {
      name: 'mctest6:shape',
      description: 'What `in`, key enumeration, typeof and instanceof read on a valid and an invalid entity',
      permissionLevel: CommandPermissionLevel.GameDirectors,
    },
    (origin) => {
      startFrom(origin.sourceEntity, shapeProbes, 'shape')
      return { status: CustomCommandStatus.Success, message: 'mctest entity-shape probes started' }
    },
  )
})

// Fallback triggers:
//   /scriptevent mctest6:access [probe-id]
//   /scriptevent mctest6:shape [probe-id]
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === 'mctest6:access') {
    startFrom(event.sourceEntity, accessProbes, 'access', event.message.trim() || undefined)
  } else if (event.id === 'mctest6:shape') {
    startFrom(event.sourceEntity, shapeProbes, 'shape', event.message.trim() || undefined)
  }
})
