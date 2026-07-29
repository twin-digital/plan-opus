// One record per shim variant, on globalThis under a registered symbol.
const KEY = Symbol.for('@probe/shim-shallow.store')

globalThis[KEY] ??= { world: undefined, system: undefined, installs: 0 }

export const store = globalThis[KEY]
