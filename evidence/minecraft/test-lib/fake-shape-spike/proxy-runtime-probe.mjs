// Spike: what a Proxy actually does for the three obligations — the invalidation guard, the
// NotImplementedError floor, and internal reads on an invalidated fake. Plain JS, because
// @minecraft/server ships no runtime; the shapes here stand in for the faked classes.
// Run: node proxy-runtime-probe.mjs > proxy-runtime-probe.out.txt

const results = []
const say = (s) => results.push(s)
const head = (s) => {
  results.push('')
  results.push(`## ${s}`)
  results.push('')
}

// `attempt` reports what a thing did rather than asserting it.
const attempt = (label, fn) => {
  try {
    const v = fn()
    say(`${label} -> returned ${typeof v === 'function' ? 'function' : JSON.stringify(v)}`)
  } catch (e) {
    say(`${label} -> threw ${e.name}: ${e.message}`)
  }
}

class NotImplementedError extends Error {
  constructor(member) {
    super(`${member} is declared but not modelled by this library.`)
    this.name = 'NotImplementedError'
  }
}
class InvalidEntityError extends Error {
  constructor(id, type) {
    super('Failed to call function or property on an invalid entity.')
    this.name = 'InvalidEntityError'
    this.id = id
    this.type = type
  }
}
const failedGet = (name) => Object.assign(new Error(`Failed to get property '${name}'.`), { name: 'Error' })
const failedCall = (name) => Object.assign(new Error(`Failed to call function '${name}'.`), { name: 'Error' })

// ---------------------------------------------------------------------------
// The state a fake entity carries. The library holds it; the proxy never hides it from us.
// ---------------------------------------------------------------------------

const state = new WeakMap()

// The class writes only the members this cycle models. Its declared shape (in TypeScript) would
// come from `interface FakeEntity extends Entity {}` — see merging-probe.ts.
class FakeEntity {
  constructor(record) {
    state.set(this, record)
  }
  get id() {
    return state.get(this).id
  }
  get typeId() {
    return state.get(this).typeId
  }
  get isValid() {
    return state.get(this).valid
  }
  get scoreboardIdentity() {
    return state.get(this).scoreboardIdentity
  }
  get nameTag() {
    return state.get(this).nameTag
  }
  getTags() {
    return [...state.get(this).tags]
  }
  addTag(tag) {
    state.get(this).tags.add(tag)
    return true
  }
  kill() {
    state.get(this).dead = true
    return true
  }
  applyDamage(amount, options) {
    void options
    state.get(this).health -= amount
    return amount > 0
  }
}

// The engine's non-uniformity, as data. Four names, not a 62-row table.
const READABLE_WHEN_INVALID = new Set(['id', 'isValid', 'typeId', 'scoreboardIdentity'])

// A build-time manifest: which declared members are methods. Derivable from the declarations
// (see method-split-probe.ts for the type-level derivation that checks it).
const ENTITY_METHODS = new Set([
  'addEffect', 'addItem', 'addTag', 'applyDamage', 'applyImpulse', 'applyKnockback',
  'clearDynamicProperties', 'clearVelocity', 'extinguishFire', 'getAABB',
  'getAllBlocksStandingOn', 'getBlockFromViewDirection', 'getBlockStandingOn', 'getComponent',
  'getComponents', 'getDynamicProperty', 'getDynamicPropertyIds',
  'getDynamicPropertyTotalByteCount', 'getEffect', 'getEffects',
  'getEntitiesFromViewDirection', 'getHeadLocation', 'getProperty', 'getRotation', 'getTags',
  'getVelocity', 'getViewDirection', 'hasComponent', 'hasTag', 'kill', 'lookAt', 'matches',
  'playAnimation', 'remove', 'removeEffect', 'removeTag', 'resetProperty', 'runCommand',
  'setDynamicProperties', 'setDynamicProperty', 'setOnFire', 'setProperty', 'setRotation',
  'teleport', 'triggerEvent', 'tryTeleport',
])
const ENTITY_PROPERTIES = new Set([
  'dimension', 'id', 'isClimbing', 'isFalling', 'isInWater', 'isOnGround', 'isSleeping',
  'isSneaking', 'isSprinting', 'isSwimming', 'isValid', 'localizationKey', 'location',
  'nameTag', 'scoreboardIdentity', 'typeId',
])

// ---------------------------------------------------------------------------
// Trap A: guard at access. One rule, no manifest.
//
// Note the forwarding: `Reflect.get(t, key, t)`, not the idiomatic `Reflect.get(t, key, recv)`.
// See section 0 — forwarding the receiver runs the fake's own getters with `this` bound to the
// proxy, and every lookup of per-instance state keyed by the instance then misses.
// ---------------------------------------------------------------------------

const guardAtAccess = (target) =>
  new Proxy(target, {
    get(t, key) {
      const record = state.get(t)
      if (typeof key === 'string' && !record.valid && !READABLE_WHEN_INVALID.has(key)) {
        throw new InvalidEntityError(record.id, record.typeId)
      }
      if (key in t) return Reflect.get(t, key, t)
      if (typeof key === 'string') throw new NotImplementedError(`Entity.${key}`)
      return Reflect.get(t, key, t)
    },
  })

// ---------------------------------------------------------------------------
// Trap B: guard at call for methods, at access for properties. Needs the method manifest.
// ---------------------------------------------------------------------------

const guardAtCall = (target) =>
  new Proxy(target, {
    get(t, key) {
      const record = state.get(t)
      if (typeof key !== 'string') return Reflect.get(t, key, t)
      const invalid = () => !record.valid && !READABLE_WHEN_INVALID.has(key)

      if (ENTITY_METHODS.has(key)) {
        const impl = key in t ? Reflect.get(t, key, t) : null
        // The returned function throws when *called*, as the engine's guard does, and reads
        // validity at call time — a thunk that closed over it would let a method captured
        // before the transition run after it.
        const thunk = (...args) => {
          if (invalid()) throw new InvalidEntityError(record.id, record.typeId)
          if (!impl) throw new NotImplementedError(`Entity.${key}`)
          return impl.apply(t, args)
        }
        // Carry the modelled arity so `fn.length` reads as the engine's would.
        return impl ? Object.defineProperty(thunk, 'length', { value: impl.length }) : thunk
      }

      if (invalid()) throw new InvalidEntityError(record.id, record.typeId)
      if (ENTITY_PROPERTIES.has(key)) {
        if (key in t) return Reflect.get(t, key, t)
        throw new NotImplementedError(`Entity.${key}`)
      }
      return Reflect.get(t, key, t)
    },
  })

const makeRecord = (over = {}) => ({
  id: '1',
  typeId: 'minecraft:sheep',
  valid: true,
  scoreboardIdentity: undefined,
  nameTag: 'Dolly',
  tags: new Set(['friendly']),
  health: 8,
  dead: false,
  ...over,
})

const invalidate = (proxyOrTarget) => {
  state.get(raw(proxyOrTarget)).valid = false
}
// The escape hatch: the WeakMap is keyed by the class instance, and the proxy forwards
// nothing to it — so the library reads state without going through its own trap.
const raw = (p) => (state.has(p) ? p : rawOf.get(p))
const rawOf = new WeakMap()
const wrap = (make, record) => {
  const target = new FakeEntity(record)
  const p = make(target)
  rawOf.set(p, target)
  return p
}

say('# Proxy runtime probe — @minecraft/server has no runtime, so these shapes stand in for the fakes')
say('')
say(`node ${process.version}`)

// ---------------------------------------------------------------------------

head('0. Receiver forwarding: the trap that eats a proxied fake\'s own state')
{
  const s = new WeakMap()
  class WeakMapState {
    constructor(v) {
      s.set(this, v)
    }
    get typeId() {
      return s.get(this).typeId
    }
  }
  const t1 = new WeakMapState({ typeId: 'minecraft:sheep' })
  const forwardReceiver = new Proxy(t1, { get: (t, k, recv) => Reflect.get(t, k, recv) })
  const forwardTarget = new Proxy(t1, { get: (t, k) => Reflect.get(t, k, t) })
  attempt('WeakMap state, Reflect.get(t, k, receiver)', () => forwardReceiver.typeId)
  attempt('WeakMap state, Reflect.get(t, k, target)', () => forwardTarget.typeId)

  class PrivateField {
    #typeId
    constructor(v) {
      this.#typeId = v
    }
    get typeId() {
      return this.#typeId
    }
  }
  const t2 = new PrivateField('minecraft:cow')
  const privReceiver = new Proxy(t2, { get: (t, k, recv) => Reflect.get(t, k, recv) })
  const privTarget = new Proxy(t2, { get: (t, k) => Reflect.get(t, k, t) })
  attempt('#private field, Reflect.get(t, k, receiver)', () => privReceiver.typeId)
  attempt('#private field, Reflect.get(t, k, target)', () => privTarget.typeId)
  say('so every proxied fake forwards to the target, not the receiver — and a subclass that')
  say('overrides a getter the base calls through `this` will not be reached. Worth knowing before')
  say('FakePlayer subclasses FakeEntity.')
}

head('1. Trap A (guard at access), on a valid entity')
{
  const e = wrap(guardAtAccess, makeRecord())
  attempt('e.typeId', () => e.typeId)
  attempt('e.getTags()', () => e.getTags())
  attempt('e.kill (accessed, not called)', () => e.kill)
  attempt('e.location (declared, unmodelled property)', () => e.location)
  attempt('e.teleport (declared, unmodelled method, accessed)', () => e.teleport)
  attempt('e.teleport({x:0,y:0,z:0}) (called)', () => e.teleport({ x: 0, y: 0, z: 0 }))
}

head('2. Trap A, after invalidation of a reference the test already holds')
{
  const e = wrap(guardAtAccess, makeRecord())
  const held = e
  say('the test holds `held` from before the transition; the same object is guarded after it')
  invalidate(e)
  attempt('held.id', () => held.id)
  attempt('held.isValid', () => held.isValid)
  attempt('held.typeId', () => held.typeId)
  attempt('held.scoreboardIdentity', () => held.scoreboardIdentity)
  attempt('held.nameTag', () => held.nameTag)
  attempt('held.getTags()', () => held.getTags())
  attempt('held.kill (accessed, NOT called)', () => held.kill)
  say('  ^ the engine does not throw here: the guard is on the call, not the property read')
}

head('3. Trap B (guard at call for methods), same transition')
{
  const e = wrap(guardAtCall, makeRecord())
  attempt('valid: e.getTags()', () => e.getTags())
  attempt('valid: e.kill accessed', () => e.kill)
  attempt('valid: e.location (unmodelled property)', () => e.location)
  attempt('valid: e.teleport accessed (unmodelled method)', () => e.teleport)
  attempt('valid: e.teleport(...) called', () => e.teleport({ x: 0, y: 0, z: 0 }))
  invalidate(e)
  attempt('invalid: e.id', () => e.id)
  attempt('invalid: e.nameTag', () => e.nameTag)
  attempt('invalid: e.kill accessed', () => e.kill)
  attempt('invalid: e.kill() called', () => e.kill())
  attempt('invalid: e.teleport(...) called', () => e.teleport({ x: 0, y: 0, z: 0 }))
}

head('4. Arity: the engine checks argument count before the validity guard')
{
  const e = wrap(guardAtCall, makeRecord())
  say('modelled members carry a real arity through the thunk:')
  say(`  e.applyDamage.length = ${e.applyDamage.length} (engine expects 1-2)`)
  say(`  e.kill.length = ${e.kill.length}`)
  invalidate(e)
  attempt('invalid: e.applyDamage() with no arguments', () => e.applyDamage())
  say('  ^ the engine raises TypeError "Incorrect number of arguments to function." first')
  say('unmodelled members have no implementation to take an arity from:')
  const f = wrap(guardAtCall, makeRecord())
  say(`  f.teleport.length = ${f.teleport.length} (engine expects 1-2)`)
  say('so reproducing the arity-first ordering needs a per-member arity manifest under every option')
}

head('5. A method captured before the transition')
{
  const e = wrap(guardAtCall, makeRecord())
  const kill = e.kill
  invalidate(e)
  attempt('kill() — captured while valid, called while invalid (trap B)', () => kill())
  const e2 = wrap(guardAtAccess, makeRecord())
  const kill2 = e2.kill
  invalidate(e2)
  attempt('kill2() — captured while valid, called while invalid (trap A)', () => kill2())
  say('  ^ trap A captured the raw method at access time, so the guard never runs')
}

head('6. Internal reads on an invalidated fake')
{
  const e = wrap(guardAtCall, makeRecord({ health: 3 }))
  invalidate(e)
  attempt('library reads through the proxy: e.nameTag', () => e.nameTag)
  const record = state.get(raw(e))
  say(`library reads the state record directly: nameTag=${JSON.stringify(record.nameTag)} health=${record.health} tags=${JSON.stringify([...record.tags])}`)
  say('cost: library code addresses the record, not the fake — a second vocabulary for the same data')
}

head('7. The non-uniform attribute-component guard, as a table')
{
  const ATTR_GUARD = {
    isValid: 'readable',
    typeId: 'readable',
    currentValue: { kind: 'failedGet', internal: 'current' },
    defaultValue: { kind: 'failedGet', internal: 'value' },
    effectiveMax: { kind: 'failedGet', internal: 'effectiveMaxValue' },
    effectiveMin: { kind: 'failedGet', internal: 'effectiveMinValue' },
    resetToDefaultValue: { kind: 'failedCall' },
    resetToMaxValue: { kind: 'failedCall' },
    resetToMinValue: { kind: 'failedCall' },
    setCurrentValue: { kind: 'invalidEntity' },
    entity: { kind: 'invalidEntity' },
  }
  const compState = new WeakMap()
  class FakeAttributeComponent {
    constructor(record) {
      compState.set(this, record)
    }
    get typeId() {
      return compState.get(this).typeId
    }
    get isValid() {
      return compState.get(this).owner.valid
    }
    get currentValue() {
      return compState.get(this).currentValue
    }
    setCurrentValue(v) {
      compState.get(this).currentValue = v
      return true
    }
  }
  const ATTR_METHODS = new Set([
    'resetToDefaultValue',
    'resetToMaxValue',
    'resetToMinValue',
    'setCurrentValue',
  ])
  const guardComponent = (target) =>
    new Proxy(target, {
      get(t, key) {
        if (typeof key !== 'string') return Reflect.get(t, key, t)
        const record = compState.get(t)
        const rule = ATTR_GUARD[key]
        const raise = () => {
          if (rule?.kind === 'failedGet') throw failedGet(rule.internal)
          if (rule?.kind === 'failedCall') throw failedCall(key)
          throw new InvalidEntityError(record.owner.id, record.owner.typeId)
        }
        const invalid = () => !record.owner.valid && rule !== 'readable'
        if (ATTR_METHODS.has(key)) {
          const impl = key in t ? Reflect.get(t, key, t) : null
          return (...args) => {
            if (invalid()) return raise()
            if (!impl) throw new NotImplementedError(`EntityAttributeComponent.${key}`)
            return impl.apply(t, args)
          }
        }
        if (invalid()) return raise()
        if (key in t) return Reflect.get(t, key, t)
        throw new NotImplementedError(`EntityAttributeComponent.${key}`)
      },
    })

  const owner = makeRecord()
  const c = guardComponent(new FakeAttributeComponent({ typeId: 'minecraft:health', currentValue: 8, owner }))
  attempt('valid: c.currentValue', () => c.currentValue)
  owner.valid = false
  attempt('invalid: c.isValid', () => c.isValid)
  attempt('invalid: c.typeId', () => c.typeId)
  attempt('invalid: c.currentValue', () => c.currentValue)
  attempt('invalid: c.effectiveMin', () => c.effectiveMin)
  attempt('invalid: c.resetToMaxValue()', () => c.resetToMaxValue())
  attempt('invalid: c.setCurrentValue(1)', () => c.setCurrentValue(1))
  attempt('invalid: c.entity', () => c.entity)
  say(`the table is ${Object.keys(ATTR_GUARD).length} rows and covers every attribute member`)
}

head('8. What the proxy does to the ordinary JS a test or a pack might run')
{
  const e = wrap(guardAtCall, makeRecord())
  attempt("'kill' in e", () => 'kill' in e)
  attempt("'teleport' in e (declared, unmodelled)", () => 'teleport' in e)
  attempt('Object.keys(e)', () => Object.keys(e))
  attempt('e instanceof FakeEntity', () => e instanceof FakeEntity)
  attempt('typeof e', () => typeof e)
  attempt('JSON.stringify(e)', () => JSON.stringify(e))
  attempt('{...e} (spread)', () => Object.keys({ ...e }))
  attempt('String(e)', () => String(e))
  attempt('e === e', () => e === e)
  const seen = new Set([e])
  attempt('a Set keyed by the proxy finds it again', () => seen.has(e))
}

head('9. Proxy invariants: a frozen or sealed target defeats the trap')
{
  const target = Object.freeze({ id: '1', typeId: 'minecraft:sheep' })
  const p = new Proxy(target, {
    get() {
      return 'from the trap'
    },
  })
  attempt('get trap over a frozen target with a non-configurable own property', () => p.id)
  const target2 = { id: '1' }
  Object.defineProperty(target2, 'pinned', { value: 'x', configurable: false, writable: false })
  const p2 = new Proxy(target2, {
    get() {
      throw new Error('guard')
    },
  })
  attempt('get trap that throws, over a non-configurable non-writable own property', () => p2.pinned)
  say('a class instance with accessor-based state stays configurable, so the traps above are safe;')
  say('a fake built from Object.freeze or from own data properties defined non-configurably is not')
}

head('10. Plain-object target versus class-instance target')
{
  const objTarget = { id: '1', typeId: 'minecraft:sheep' }
  const p = new Proxy(objTarget, {
    get: (t, k, r) => (k in t ? Reflect.get(t, k, r) : (() => { throw new NotImplementedError(String(k)) })()),
  })
  attempt('plain object: p instanceof FakeEntity', () => p instanceof FakeEntity)
  attempt('plain object: p.typeId', () => p.typeId)
  attempt('plain object: Object.keys(p)', () => Object.keys(p))
  const clsTarget = new FakeEntity(makeRecord())
  const q = new Proxy(clsTarget, { get: (t, k, r) => Reflect.get(t, k, r) })
  attempt('class instance: q instanceof FakeEntity', () => q instanceof FakeEntity)
  attempt('class instance: Object.keys(q)', () => Object.keys(q))
  say('a class instance keeps its members on the prototype, so Object.keys reads empty either way;')
  say('only the class-instance target answers instanceof, and only it can carry accessor getters')
}

head('11. No proxy at all: generated stubs installed on the prototype')
{
  // The same obligations met by writing every member once, mechanically, at module load.
  class StubbedEntity extends FakeEntity {}
  for (const name of ENTITY_METHODS) {
    if (name in StubbedEntity.prototype) continue
    Object.defineProperty(StubbedEntity.prototype, name, {
      value: function (...args) {
        void args
        const record = state.get(this)
        if (!record.valid) throw new InvalidEntityError(record.id, record.typeId)
        throw new NotImplementedError(`Entity.${name}`)
      },
      configurable: true,
      writable: true,
    })
  }
  for (const name of ENTITY_PROPERTIES) {
    if (name in StubbedEntity.prototype) continue
    Object.defineProperty(StubbedEntity.prototype, name, {
      get() {
        const record = state.get(this)
        if (!record.valid) throw new InvalidEntityError(record.id, record.typeId)
        throw new NotImplementedError(`Entity.${name}`)
      },
      configurable: true,
    })
  }
  // The guard on the modelled members still has to be installed somewhere.
  for (const name of ['getTags', 'addTag', 'kill', 'applyDamage']) {
    const impl = FakeEntity.prototype[name]
    Object.defineProperty(StubbedEntity.prototype, name, {
      value: function (...args) {
        const record = state.get(this)
        if (!record.valid) throw new InvalidEntityError(record.id, record.typeId)
        return impl.apply(this, args)
      },
      configurable: true,
      writable: true,
    })
  }
  for (const name of ['nameTag']) {
    const desc = Object.getOwnPropertyDescriptor(FakeEntity.prototype, name)
    Object.defineProperty(StubbedEntity.prototype, name, {
      get() {
        const record = state.get(this)
        if (!record.valid) throw new InvalidEntityError(record.id, record.typeId)
        return desc.get.call(this)
      },
      configurable: true,
    })
  }

  const e = new StubbedEntity(makeRecord())
  attempt('valid: e.getTags()', () => e.getTags())
  attempt('valid: e.location', () => e.location)
  attempt('valid: e.teleport accessed', () => e.teleport)
  attempt('valid: e.teleport(...) called', () => e.teleport({ x: 0, y: 0, z: 0 }))
  attempt('e instanceof FakeEntity', () => e instanceof FakeEntity)
  invalidate(e)
  attempt('invalid: e.id', () => e.id)
  attempt('invalid: e.typeId', () => e.typeId)
  attempt('invalid: e.nameTag', () => e.nameTag)
  attempt('invalid: e.kill accessed', () => e.kill)
  attempt('invalid: e.kill() called', () => e.kill())
  attempt('invalid: e.location', () => e.location)
  say('this needs no Proxy and no cast, but every member has to be installed — from a manifest')
  say('or by hand — and the guard has to be wrapped around each modelled member individually')
}

head('12. Composing two behaviours on one member')
{
  // The health write's cascade and the validity guard both want setCurrentValue.
  const order = []
  const base = { setCurrentValue: (v) => (order.push(`write ${v}`), true) }
  const withCascade = {
    ...base,
    setCurrentValue: (v) => {
      const r = base.setCurrentValue(v)
      order.push('cascade')
      return r
    },
  }
  const guarded = new Proxy(withCascade, {
    get(t, k, r) {
      if (k === 'setCurrentValue') {
        return (...a) => {
          order.push('guard')
          return Reflect.get(t, k, r).apply(r, a)
        }
      }
      return Reflect.get(t, k, r)
    },
  })
  guarded.setCurrentValue(5)
  say(`decorator order: ${order.join(' -> ')}`)
  say('the proxy is the outermost decorator by construction, which is the order the engine has:')
  say('the validity guard runs before any modelled behaviour')
}

console.log(results.join('\n'))
