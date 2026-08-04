// The stable-binding variant: `world` and `system` are Proxy objects whose identity never changes.
// Each resolves the current server out of the globalThis store on every trap, so a consumer's
// static import is never stranded by a module-registry reset.
import { store } from './store.js'

export class ShimNotInstalledError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ShimNotInstalledError'
  }
}

const MESSAGE = 'no server installed — call __useServer(server) before the code under test runs'

const resolve = (slot) => {
  const current = store[slot]
  if (current === undefined) {
    throw new ShimNotInstalledError(MESSAGE)
  }
  return current
}

// A function target, so `apply` and `construct` fire and `system(…)`-shaped misuse reads as the
// shim's error. `prototype` is a non-configurable own property of a function, so the two traps that
// carry an invariant over it delegate that one key to the target.
const traps = (slot) => ({
  get: (target, prop, receiver) =>
    prop === 'prototype' ? Reflect.get(target, prop, receiver) : Reflect.get(resolve(slot), prop, resolve(slot)),
  set: (_target, prop, value) => Reflect.set(resolve(slot), prop, value),
  has: (_target, prop) => Reflect.has(resolve(slot), prop),
  deleteProperty: (_target, prop) => Reflect.deleteProperty(resolve(slot), prop),
  ownKeys: (target) => [...new Set([...Reflect.ownKeys(resolve(slot)), ...Reflect.ownKeys(target)])],
  getOwnPropertyDescriptor: (target, prop) =>
    prop === 'prototype'
      ? Reflect.getOwnPropertyDescriptor(target, prop)
      : Reflect.getOwnPropertyDescriptor(resolve(slot), prop),
  defineProperty: (_target, prop, descriptor) => Reflect.defineProperty(resolve(slot), prop, descriptor),
  getPrototypeOf: () => Reflect.getPrototypeOf(resolve(slot)),
  apply: (_target, thisArg, args) => Reflect.apply(resolve(slot), thisArg, args),
  construct: (_target, args) => Reflect.construct(resolve(slot), args),
})

export const world = new Proxy(function shimWorld() {}, traps('world'))
export const system = new Proxy(function shimSystem() {}, traps('system'))

/** Points the store at a server; with no argument, returns it to the unset state. */
export const __useServer = (server) => {
  store.world = server?.world
  store.system = server?.system
  store.installs += 1
}
