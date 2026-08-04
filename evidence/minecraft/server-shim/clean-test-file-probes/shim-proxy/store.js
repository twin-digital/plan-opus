// The store lives on globalThis under a registered symbol — the same mechanism the shim already
// uses for its brand table — so every instance of this module, in every registry, reads one record.
const KEY = Symbol.for('@twin-digital/minecraft-server-shim.store')

globalThis[KEY] ??= { world: undefined, system: undefined, installs: 0 }

/** @type {{ world: unknown, system: unknown, installs: number }} */
export const store = globalThis[KEY]

/** How many times this module has been evaluated in this process. */
export const evaluations = (globalThis[Symbol.for('@twin-digital/minecraft-server-shim.evals')] =
  (globalThis[Symbol.for('@twin-digital/minecraft-server-shim.evals')] ?? 0) + 1)
