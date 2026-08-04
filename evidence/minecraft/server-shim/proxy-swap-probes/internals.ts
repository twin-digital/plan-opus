// What the library keeps per server, read the way `clean-test-file-probes/reset-in-place.ts` reads
// it: through the private `ServerState`, reached by aliasing the library's internal modules. None
// of this is API a consumer could call; it is here so the probe can count what landed where.
import { serverOf, type ServerState } from '@twin-digital/minecraft-test-lib/internal-state'
import type * as MC from '@minecraft/server'

/** The counts that say whether a registration reached a given server. */
export interface Census {
  readonly subscribers: number
  readonly scheduled: number
  readonly objectives: number
  readonly entities: number
  readonly currentTick: number
  /** The signals carrying at least one subscriber, so a swap's losses are visible by name. */
  readonly signalNames: string[]
}

const censusOf = (state: ServerState): Census => {
  let subscribers = 0
  const signalNames: string[] = []
  for (const signal of state.signals.values()) {
    subscribers += signal.subscribers.size
    if (signal.subscribers.size > 0) {
      signalNames.push(`${signal.scope}.${signal.name}`)
    }
  }
  return {
    subscribers,
    scheduled: state.scheduled.filter((run) => !run.cancelled).length,
    objectives: state.scoreboard.objectives.size,
    entities: state.entities.length,
    currentTick: state.currentTick,
    signalNames,
  }
}

export const census = (world: MC.World): Census => censusOf(serverOf(world))

export const render = (label: string, value: Census): string =>
  `[${label}] subscribers=${value.subscribers} scheduled=${value.scheduled}` +
  ` objectives=${value.objectives} entities=${value.entities} tick=${value.currentTick}` +
  ` signals=${value.signalNames.join('|') || 'none'}`
