// The single mutable module the whole design turns on. Both package entries reach it; if a runner
// instantiates it twice, the counter below reports it.
import { randomUUID } from 'node:crypto'

globalThis.__shimStateEvaluations = (globalThis.__shimStateEvaluations ?? 0) + 1

/** Distinct per module instance; equal across entries only if one instance is shared. */
export const __instanceId = randomUUID()

/** How many times this module was evaluated in the process. */
export const __evaluationCount = globalThis.__shimStateEvaluations

export let world
export let system

export class ShimNotInstalledError extends Error {}

export const __serverVersion = '2.8.0'

export const brandAs = (kind, value) => Object.assign(value, { __brand: kind })

export const __useServer = (server) => {
  world = server?.world
  system = server?.system
}
