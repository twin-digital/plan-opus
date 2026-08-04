// Variant A — the naive swap. `world` and `system` are stable Proxy objects over a swappable
// target: every trap resolves the current server out of the store, so a static import is never
// stranded. This is `clean-test-file-probes/shim-proxy` unchanged, driven here by a swap instead
// of a single install.
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

/** Points the store at a server. Nothing else happens: the swap is the whole mechanism. */
export const __useServer = (server) => {
  store.world = server?.world
  store.system = server?.system
  store.installs += 1
}

/** What this variant carries across a swap, for the probe to print. */
export const report = () => `installs=${store.installs} carried-registrations=0`
