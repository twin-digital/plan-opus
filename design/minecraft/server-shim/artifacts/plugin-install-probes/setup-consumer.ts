// Probe 4 — a setup file the consumer already had, kept alongside the plugin's. It imports through
// an alias the consumer's own config contributes, so the run shows whether the plugin's alias table
// merged with theirs or replaced it.
import { marker } from '@consumer/marker'

const order = ((globalThis as Record<string, any>).__setupOrder ??= [])
order.push('consumer')
console.log(`[consumer setup] ran, order=${JSON.stringify(order)} marker=${marker}`)
