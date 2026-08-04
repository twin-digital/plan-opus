// The shipped shape from the spec: `world` and `system` are `export let` bindings held in this
// module, and `__useServer` reassigns them. Present here only as the contrast case.
export class ShimNotInstalledError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ShimNotInstalledError'
  }
}

const MESSAGE = 'no server installed — call __useServer(server) before the code under test runs'

const sentinel = () => {
  const thrower = () => {
    throw new ShimNotInstalledError(MESSAGE)
  }
  return new Proxy(function unset() {}, {
    get: thrower,
    set: thrower,
    has: thrower,
    deleteProperty: thrower,
    ownKeys: thrower,
    getOwnPropertyDescriptor: thrower,
    apply: thrower,
    construct: thrower,
  })
}

export let world = sentinel()
export let system = sentinel()

export const __useServer = (server) => {
  world = server ? server.world : sentinel()
  system = server ? server.system : sentinel()
}
