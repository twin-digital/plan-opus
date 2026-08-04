// What a shim could learn from the fake's own shape, with no list of names. Variant C only works
// if the shim can tell a registration from any other call; this measures how far the shape gets it.
// No shim is involved — this reads a server the library built.
import { it } from 'vitest'

import { createServer, withVanillaDimensions } from '@twin-digital/minecraft-test-lib'

const membersOf = (fake: object): string[] =>
  Object.getOwnPropertyNames(Object.getPrototypeOf(fake) as object).filter((name) => name !== 'constructor')

/** Whether a value looks like a signal from the outside: a `subscribe`/`unsubscribe` pair. */
const looksLikeSignal = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { subscribe?: unknown }).subscribe === 'function' &&
  typeof (value as { unsubscribe?: unknown }).unsubscribe === 'function'

it('what the shape reveals', () => {
  const server = createServer()
  withVanillaDimensions(server)

  for (const [label, container] of [
    ['world.afterEvents', server.world.afterEvents],
    ['world.beforeEvents', server.world.beforeEvents],
    ['system.afterEvents', server.system.afterEvents],
  ] as const) {
    const names = membersOf(container)
    let reachable = 0
    let signalShaped = 0
    const threw: string[] = []
    for (const name of names) {
      try {
        const value = (container as unknown as Record<string, unknown>)[name]
        reachable += 1
        if (looksLikeSignal(value)) {
          signalShaped += 1
        }
      } catch (error) {
        threw.push(`${name}:${(error as Error).name}`)
      }
    }
    console.log(
      `[container] ${label} members=${names.length} reachable=${reachable}` +
        ` subscribe+unsubscribe-shaped=${signalShaped} threw=${threw.length}`,
    )
  }

  // `system`'s registration members are plain methods. Nothing on the object separates the ones
  // that hold a callback for later from the ones that act now.
  const systemMembers = membersOf(server.system)
  const functions = systemMembers.filter((name) => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(server.system) as object, name)
    return typeof descriptor?.value === 'function'
  })
  console.log(`[system] members=${systemMembers.length} function-valued=${functions.length}`)
  console.log(`[system] function-valued members: ${functions.join(',')}`)

  const worldMembers = membersOf(server.world)
  const worldFunctions = worldMembers.filter((name) => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(server.world) as object, name)
    return typeof descriptor?.value === 'function'
  })
  console.log(`[world] members=${worldMembers.length} function-valued=${worldFunctions.length}`)
  console.log(`[world] function-valued members: ${worldFunctions.join(',')}`)

  // Arity is the only other thing a call site exposes; a callback argument is a function either way.
  const arities = ['run', 'runInterval', 'runTimeout', 'clearRun'].map((name) => {
    const fn = (server.system as unknown as Record<string, unknown>)[name]
    return `${name}/${typeof fn === 'function' ? fn.length : 'absent'}`
  })
  console.log(`[system] arity of the scheduler members: ${arities.join(' ')}`)
})
