// The test file. It imports the pack for its side effects, exactly as a consumer's would; the
// pack subscribes while this module evaluates, against server A. Every test then runs after the
// `beforeEach` in `setup-swap.ts` has swapped the bindings to a fresh server.
//
// The subject is bencrob/marron-town-mod (MIT) at 2c025b4, unmodified: its `src/main.ts` subscribes
// to five world events and registers two `system.runInterval` loops while it evaluates.
import { expect, it } from 'vitest'

import { system, world } from '@minecraft/server'
import { advanceTicks, createPlayer, emit, getHandlerErrors } from '@twin-digital/minecraft-test-lib'
import type * as MC from '@minecraft/server'

import './marron-town-mod/src/main'

import { census, render } from './internals.js'
import { servers } from './swap-state.js'

const bindings = { world, system } as unknown as { world: MC.World; system: MC.System }

const overworld = (): MC.Dimension => world.getDimension('overworld')

/** The pack's `playerSpawn` handler is what turns a spawn into scoreboard objectives. */
const spawn = (name: string): MC.Player => {
  const player = createPlayer(bindings, { name, dimension: overworld() })
  emit(world.afterEvents.playerSpawn as never, { player, initialSpawn: true } as never)
  return player
}

/**
 * Whether a signal still isolates one subscriber's throw from the next, measured on the server
 * that is current now. Two handlers, the first throwing; the engine runs the second and records
 * the first's error.
 */
const isolation = (): string => {
  const order: string[] = []
  const first = (): void => {
    order.push('first')
    throw new Error('probe: first subscriber throws')
  }
  const second = (): void => {
    order.push('second')
  }
  world.afterEvents.entityHurt.subscribe(first as never)
  world.afterEvents.entityHurt.subscribe(second as never)
  let threwToCaller = 'no'
  try {
    emit(world.afterEvents.entityHurt as never, { hurtEntity: undefined, damage: 1 } as never)
  } catch (error) {
    threwToCaller = `yes (${(error as Error).message})`
  }
  return `ran=${order.join('+') || 'none'} threw-to-caller=${threwToCaller}`
}

const round = (label: string): void => {
  console.log(render(`${label}: server A`, census(servers[0].world)))
  console.log(render(`${label}: current server`, census(world as MC.World)))

  let outcome = 'no throw'
  try {
    spawn(`${label}-player`)
    advanceTicks(bindings, 40)
  } catch (error) {
    outcome = `threw ${(error as Error).name}: ${(error as Error).message}`
  }

  console.log(render(`${label}: server A after driving`, census(servers[0].world)))
  console.log(render(`${label}: current server after driving`, census(world as MC.World)))
  console.log(`[${label}] drive outcome: ${outcome}`)
  console.log(`[${label}] handler errors on current: ${getHandlerErrors(bindings).length}`)
  console.log(`[${label}] handler isolation on current: ${isolation()}`)
}

it('test 1 — the first swapped-in server', () => {
  round('test 1')
  // The pack made objectives on whichever server received its `playerSpawn` subscriber.
  expect(census(world as MC.World).objectives).toBeGreaterThan(0)
})

it('test 2 — a second swapped-in server', () => {
  round('test 2')
  expect(census(world as MC.World).scheduled).toBeGreaterThan(0)
})
