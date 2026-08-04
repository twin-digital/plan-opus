// The smallest fake server these probes need: enough of `world` and `system` for an unmodified
// pack's module-scope subscriptions to land, plus introspection so a test can count them.
// `@twin-digital/minecraft-test-lib` is unpublished and absent from this checkout; nothing here
// stands for its behaviour, only for a server object the shim can be pointed at.

const signalStore = new WeakMap()

const makeSignals = (server, kind) =>
  new Proxy(
    {},
    {
      get(cache, name) {
        if (typeof name !== 'string') {
          return undefined
        }
        const key = `${kind}.${name}`
        const registry = signalStore.get(server)
        if (!registry.has(key)) {
          registry.set(key, [])
        }
        if (!cache[key]) {
          cache[key] = {
            subscribe: (handler) => {
              registry.get(key).push(handler)
              return handler
            },
            unsubscribe: (handler) => {
              const handlers = registry.get(key)
              const at = handlers.indexOf(handler)
              if (at >= 0) handlers.splice(at, 1)
            },
          }
        }
        return cache[key]
      },
    },
  )

class Dimension {
  constructor(id) {
    this.id = id
  }
  getEntities() {
    return []
  }
}

/**
 * Builds a server. `dimensions` is the option these probes flow through the plugin: a server
 * built with none throws on `world.getDimension`, which is what a test can tell apart.
 */
export const createServer = ({ dimensions = [], label = 'unlabelled' } = {}) => {
  const server = {}
  signalStore.set(server, new Map())

  const dimensionsById = new Map(dimensions.map((id) => [id, new Dimension(id)]))
  const messages = []
  const objectives = new Map()

  const world = {
    label,
    afterEvents: makeSignals(server, 'after'),
    beforeEvents: makeSignals(server, 'before'),
    sendMessage: (message) => messages.push(message),
    getDimension: (id) => {
      const dimension = dimensionsById.get(id)
      if (!dimension) {
        throw new Error(`Dimension "${id}" is not present in this world`)
      }
      return dimension
    },
    getAllPlayers: () => [],
    scoreboard: {
      getObjectives: () => [...objectives.values()],
      getObjective: (id) => objectives.get(id),
      addObjective: (id, displayName) => {
        const objective = { id, displayName: displayName ?? id, getScore: () => undefined, setScore: () => {} }
        objectives.set(id, objective)
        return objective
      },
    },
  }

  const pending = []
  const intervals = []
  const system = {
    currentTick: 0,
    run: (callback) => pending.push(callback) && pending.length,
    runInterval: (callback, period = 1) => intervals.push({ callback, period }) && intervals.length,
    runTimeout: (callback, delay = 1) => pending.push(callback) && pending.length,
    clearRun: () => {},
  }

  Object.assign(server, { world, system, messages })
  server.advanceTicks = (count) => {
    for (let n = 0; n < count; n += 1) {
      system.currentTick += 1
      while (pending.length > 0) {
        pending.shift()()
      }
      for (const { callback, period } of intervals) {
        if (system.currentTick % period === 0) callback()
      }
    }
  }
  server.census = () => {
    const registry = signalStore.get(server)
    const subscribed = [...registry.entries()].filter(([, handlers]) => handlers.length > 0)
    return {
      label,
      subscriptions: subscribed.map(([key, handlers]) => `${key}x${handlers.length}`).sort(),
      subscriptionCount: subscribed.reduce((total, [, handlers]) => total + handlers.length, 0),
      intervals: intervals.length,
      queuedRuns: pending.length,
      dimensions: [...dimensionsById.keys()],
      messages: messages.length,
    }
  }
  return server
}
