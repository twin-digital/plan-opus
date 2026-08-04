// The other layer. The shim's bindings never move: they point at server A for the whole file.
// What changes between tests is the state underneath A's fakes, cleared field by field the way
// `clean-test-file-probes/reset-in-place.ts` clears it — everything except `signals`, which holds
// the subscriber sets, and `scheduled`, whose entries are the pack's module-scope loops.
//
// None of this is API a consumer could call.
import { serverOf } from '@twin-digital/minecraft-test-lib/internal-state'
import { stateOf } from '@twin-digital/minecraft-test-lib/internal-member'
import type * as MC from '@minecraft/server'

export const swapBeneath = (world: MC.World): void => {
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

  // The tick clock went back to zero, so every surviving run is re-based onto the new one.
  for (const run of state.scheduled) {
    run.dueTick = state.currentTick + run.interval
  }
}
