// The AsyncLocalStorage variant: same stable Proxy bindings, but the current server is read out of
// an ALS store rather than a plain globalThis slot, so concurrent tests could in principle each see
// their own. The ALS itself lives on globalThis under a registered symbol so a registry reset does
// not make a second one.
import { AsyncLocalStorage } from 'node:async_hooks'

const KEY = Symbol.for('@probe/shim-als.storage')
globalThis[KEY] ??= new AsyncLocalStorage()

/** @type {import('node:async_hooks').AsyncLocalStorage<{ world: unknown, system: unknown }>} */
export const storage = globalThis[KEY]

export class ShimNotInstalledError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ShimNotInstalledError'
  }
}

const resolve = (slot) => {
  const server = storage.getStore()
  if (server === undefined || server[slot] === undefined) {
    throw new ShimNotInstalledError('no server in the current async context')
  }
  return server[slot]
}

const traps = (slot) => ({
  get: (target, prop, receiver) =>
    prop === 'prototype' ? Reflect.get(target, prop, receiver) : Reflect.get(resolve(slot), prop, resolve(slot)),
  set: (_t, prop, value) => Reflect.set(resolve(slot), prop, value),
  has: (_t, prop) => Reflect.has(resolve(slot), prop),
  ownKeys: (target) => [...new Set([...Reflect.ownKeys(resolve(slot)), ...Reflect.ownKeys(target)])],
  getOwnPropertyDescriptor: (target, prop) =>
    prop === 'prototype'
      ? Reflect.getOwnPropertyDescriptor(target, prop)
      : Reflect.getOwnPropertyDescriptor(resolve(slot), prop),
  getPrototypeOf: () => Reflect.getPrototypeOf(resolve(slot)),
  apply: (_t, thisArg, args) => Reflect.apply(resolve(slot), thisArg, args),
  construct: (_t, args) => Reflect.construct(resolve(slot), args),
})

export const world = new Proxy(function shimWorld() {}, traps('world'))
export const system = new Proxy(function shimSystem() {}, traps('system'))

/** Sets the server for the remainder of the current async execution context. */
export const __useServer = (server) => {
  storage.enterWith(server ?? undefined)
}

/** Runs `fn` with `server` as the store, the shape ALS is designed around. */
export const withServer = (server, fn) => storage.run(server, fn)

/** What the ALS resolves to right now, without throwing — for reporting which server was seen. */
export const currentTag = () => {
  const server = storage.getStore()
  return server === undefined ? 'none' : String(server.tag)
}
