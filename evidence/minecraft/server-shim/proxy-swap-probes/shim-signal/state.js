// Variant C — a stable proxy at the signal layer. Variant B's recursive proxying, plus the shim
// keeping the subscriber set itself: `subscribe` never reaches the fake. The shim holds the
// handlers on an object that survives the swap, and on every swap installs one trampoline
// subscriber on the new server's signal, which fans the payload out to the set it holds.
//
// `system.runInterval` has no set to hold, so the scheduler calls are handled the only other way
// available — journalled and re-issued against the new server on each swap.
//
// Both halves rest on a hand-maintained list of member names, below.
import { store } from './store.js'

/** What the shim has to be told about `@minecraft/server`, because no shape reveals it. */
const SUBSCRIBE = 'subscribe'
const UNSUBSCRIBE = 'unsubscribe'
const SCHEDULERS = new Set(['run', 'runInterval', 'runTimeout', 'runJob'])

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

/** One entry per signal the code under test has ever subscribed to, keyed by its path. */
const signals = new Map()
/** Scheduler calls made before the first swap, re-issued on every swap after it. */
const scheduled = []
let recording = true

const entryFor = (slot, path) => {
  const key = `${slot}|${path.join('.')}`
  let entry = signals.get(key)
  if (entry === undefined) {
    entry = { slot, path, handlers: new Set(), installedOn: new WeakSet() }
    // One trampoline for the life of the process. It is the only subscriber the fake ever sees.
    entry.trampoline = (payload) => {
      for (const handler of [...entry.handlers]) {
        handler(payload)
      }
    }
    signals.set(key, entry)
  }
  return entry
}

/** Puts the trampoline on the current server's signal, once per signal object. */
const install = (entry) => {
  const signal = resolve(entry.slot, entry.path)
  if (entry.installedOn.has(signal)) {
    return
  }
  entry.installedOn.add(signal)
  signal[SUBSCRIBE](entry.trampoline)
}

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
    const member = path[path.length - 1]
    if (member === SUBSCRIBE) {
      const entry = entryFor(slot, path.slice(0, -1))
      entry.handlers.add(args[0])
      install(entry)
      return args[0]
    }
    if (member === UNSUBSCRIBE) {
      entryFor(slot, path.slice(0, -1)).handlers.delete(args[0])
      return undefined
    }
    if (SCHEDULERS.has(member) && recording) {
      scheduled.push({ slot, path, args })
    }
    return Reflect.apply(resolve(slot, path), resolve(slot, path.slice(0, -1)), args)
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
  for (const entry of signals.values()) {
    install(entry)
  }
  for (const { slot, path, args } of scheduled) {
    Reflect.apply(resolve(slot, path), resolve(slot, path.slice(0, -1)), args)
  }
}

export const report = () =>
  `installs=${store.installs} carried-signals=${signals.size}` +
  ` carried-handlers=${[...signals.values()].reduce((total, entry) => total + entry.handlers.size, 0)}` +
  ` carried-scheduler-calls=${scheduled.length}`
