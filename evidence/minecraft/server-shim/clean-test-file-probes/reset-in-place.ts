// Probe 3 — the reset `@twin-digital/minecraft-test-lib` does not expose. Its `index.ts` exports no
// reset of any kind, so this reaches the library's own `ServerState` through its internal modules
// and clears it field by field, leaving the `world` and `system` fakes — and the signal objects
// holding the pack's module-scope subscribers — exactly where they were.
//
// What it stands for is the capability, not the API: everything here is a member of the library's
// private state record, and a consumer cannot write it.
import { serverOf, type ServerState } from '@twin-digital/minecraft-test-lib/internal-state'
import { stateOf } from '@twin-digital/minecraft-test-lib/internal-member'
import type * as MC from '@minecraft/server'

export interface ResetOptions {
  /**
   * Whether the scheduled runs survive. A pack registers `system.runInterval` at module scope, in
   * the same evaluation as its subscriptions, so clearing the queue unregisters half of what the
   * pack set up while leaving the other half in place.
   */
  readonly keepScheduled: boolean
}

/** What survived the reset, for the probe to report. */
export interface ResetReport {
  readonly subscribers: number
  readonly scheduled: number
}

const countSubscribers = (state: ServerState): number => {
  let total = 0
  for (const signal of state.signals.values()) {
    total += signal.subscribers.size
  }
  return total
}

export const resetInPlace = (world: MC.World, { keepScheduled }: ResetOptions): ResetReport => {
  const state = serverOf(world)

  for (const entity of state.entities) {
    stateOf(entity.entity).valid = false
  }
  state.entities.length = 0
  state.nextEntityId = 1

  state.currentTick = 0
  state.pendingInvalidations.length = 0
  state.handlerErrors.length = 0
  state.output.length = 0
  state.dynamicProperties.clear()
  state.scoreboard.objectives.clear()
  state.scoreboard.displaySlots.clear()
  state.scoreboard.identities?.clear()

  if (keepScheduled) {
    // The tick clock went back to zero, so every surviving run is re-based onto the new one.
    for (const run of state.scheduled) {
      run.dueTick = state.currentTick + run.interval
    }
  } else {
    state.scheduled.length = 0
  }

  // Deliberately untouched: `state.signals`, so every module-scope `subscribe` is still registered,
  // and `state.dimensions`, so the world the setup file built is still the world.
  return { subscribers: countSubscribers(state), scheduled: state.scheduled.length }
}
