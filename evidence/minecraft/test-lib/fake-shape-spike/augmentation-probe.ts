// Spike: module augmentation as a route to a fake-only member. It works, and it reaches every
// Entity in the consumer's program — engine-backed references included. Compiled on its own,
// because an augmentation is program-wide: leaving it in consumer-typing-probe.ts widens
// `keyof Entity` there and breaks that file's manifest-completeness assertion.
// Run: npx tsc --noEmit augmentation-probe.ts

import type { Entity } from '@minecraft/server'

declare module '@minecraft/server' {
  interface Entity {
    __invalidate(): void
  }
}

declare const anyEntity: Entity
anyEntity.__invalidate()

// The member is now part of the type, so it is part of `keyof Entity` too.
type HasFakeMember = '__invalidate' extends keyof Entity ? true : false
const _reached: HasFakeMember = true

export { anyEntity, _reached }
export type { HasFakeMember }
