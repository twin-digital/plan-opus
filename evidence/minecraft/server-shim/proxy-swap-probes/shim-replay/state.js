// Variant D — journal and replay, with no list of member names anywhere. Variant B's recursive
// proxying, plus a record of every call made through the proxy tree before the first swap. On each
// swap the whole journal is re-issued against the new server, in the order it was recorded.
//
// The rule is positional, not nominal: what gets replayed is "everything the code under test did
// while it was evaluating", so the shim needs to know nothing about which members register and
// which do not. What it cannot replay is the values those calls returned — the code under test is
// still holding the ones the first server gave it.
import { store } from './store.js'

export class ShimNotInstalledError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ShimNotInstalledError'
  }
}

const MESSAGE = 'no server installed — call __useServer(server) before the code under test runs'

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

/** Every call made through the proxy tree before the first swap. */
const journal = []
let recording = true

const nodes = new Map()

const nodeFor = (slot, path) => {
  const key = `${slot}|${path.join('.')}`
  let node = nodes.get(key)
  if (node === undefined) {
    node = new Proxy(function shimNode() {}, traps(slot, path))
    nodes.set(key, node)
  }
  return node
}

const invoke = (slot, path, args) => Reflect.apply(resolve(slot, path), resolve(slot, path.slice(0, -1)), args)

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
  apply: (_target, _thisArg, args) => {
    if (recording) {
      journal.push({ slot, path, args })
    }
    return invoke(slot, path, args)
  },
  construct: (_target, args) => Reflect.construct(resolve(slot, path), args),
})

export const world = nodeFor('world', [])
export const system = nodeFor('system', [])

export const __useServer = (server) => {
  store.world = server?.world
  store.system = server?.system
  store.installs += 1
  if (store.installs === 1) {
    return
  }
  recording = false
  for (const { slot, path, args } of journal) {
    invoke(slot, path, args)
  }
}

export const report = () =>
  `installs=${store.installs} carried-registrations=${journal.length}` +
  ` journalled-paths=${[...new Set(journal.map(({ slot, path }) => `${slot}.${path.join('.')}`))].join(',')}`
