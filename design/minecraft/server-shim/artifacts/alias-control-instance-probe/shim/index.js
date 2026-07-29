// The entry a consumer aliases over `@minecraft/server`. Carries the engine surface only.
export { world, system } from './state.js'

// Stands in for the generated enum re-exports; irrelevant to instance identity.
export const GameMode = { survival: 'survival', creative: 'creative' }

// Probe-only: lets a test read which state instance this entry reached.
export { __instanceId, __evaluationCount } from './state.js'
