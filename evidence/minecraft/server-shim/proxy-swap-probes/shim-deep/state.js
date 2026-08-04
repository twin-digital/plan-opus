// Variant B — recursive proxying. Every object reached through `world` or `system` by a string
// key is itself a Proxy, keyed by the path that reached it, so `world.afterEvents.entityHurt` is
// one object of fixed identity for the life of the process and resolves its target at access time.
//
// Symbol keys are not wrapped: the test library hangs each fake's state record off a symbol, and
// wrapping that would hide it from `stateOf`.
import { store } from './store.js'

export class ShimNotInstalledError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ShimNotInstalledError'
  }
}

const MESSAGE = 'no server installed — call __useServer(server) before the code under test runs'

/** Walks the current target for a slot down a path of string keys. */
const resolve = (slot, path) => {
  let current = store[slot]
  if (current === undefined) {
    throw new ShimNotInstalledError(MESSAGE)
  }
  for (const key of path) {
    current = current[key]
  }
  return current
}

const nodes = new Map()

/** One proxy per (slot, path), so identity is stable across every swap. */
const nodeFor = (slot, path) => {
  const key = `${slot}|${path.join('.')}`
  let node = nodes.get(key)
  if (node === undefined) {
    node = new Proxy(function shimNode() {}, traps(slot, path))
    nodes.set(key, node)
  }
  return node
}

const traps = (slot, path) => ({
  get: (target, prop, receiver) => {
    if (prop === 'prototype') {
      return Reflect.get(target, prop, receiver)
    }
    const current = resolve(slot, path)
    const value = Reflect.get(current, prop, current)
    if (typeof prop === 'symbol' || value === null || (typeof value !== 'object' && typeof value !== 'function')) {
      return value
    }
    return nodeFor(slot, [...path, prop])
  },
  set: (_target, prop, value) => Reflect.set(resolve(slot, path), prop, value),
  has: (_target, prop) => Reflect.has(resolve(slot, path), prop),
  deleteProperty: (_target, prop) => Reflect.deleteProperty(resolve(slot, path), prop),
  ownKeys: (target) => [...new Set([...Reflect.ownKeys(resolve(slot, path)), ...Reflect.ownKeys(target)])],
  getOwnPropertyDescriptor: (target, prop) =>
    prop === 'prototype'
      ? Reflect.getOwnPropertyDescriptor(target, prop)
      : Reflect.getOwnPropertyDescriptor(resolve(slot, path), prop),
  defineProperty: (_target, prop, descriptor) => Reflect.defineProperty(resolve(slot, path), prop, descriptor),
  getPrototypeOf: () => Reflect.getPrototypeOf(resolve(slot, path)),
  // Both the function and its holder are resolved at call time, so the call lands on whichever
  // server is installed at the moment of the call — not the one installed when the path was built.
  apply: (_target, _thisArg, args) => Reflect.apply(resolve(slot, path), resolve(slot, path.slice(0, -1)), args),
  construct: (_target, args) => Reflect.construct(resolve(slot, path), args),
})

export const world = nodeFor('world', [])
export const system = nodeFor('system', [])

export const __useServer = (server) => {
  store.world = server?.world
  store.system = server?.system
  store.installs += 1
}

export const report = () => `installs=${store.installs} carried-registrations=0 proxy-nodes=${nodes.size}`
