// Backs fact: server-classes-are-structurally-assignable.
// A value carrying only the public shape of each faked class must be assignable to it. The
// declared classes have private constructors (counted by assignability-probe.mjs), but a private
// constructor adds no instance member, so it does not brand the instance type. Run: npm run check

import type {
  Dimension,
  Effect,
  EffectType,
  Entity,
  EntityComponent,
  EntityHealthComponent,
  EntityHurtAfterEventSignal,
  Player,
  World,
} from '@minecraft/server'

type PublicShape<T> = { [K in keyof T]: T[K] }
declare function shape<T>(): PublicShape<T>

const entity: Entity = shape<Entity>()
const player: Player = shape<Player>()
const component: EntityComponent = shape<EntityComponent>()
const health: EntityHealthComponent = shape<EntityHealthComponent>()
const world: World = shape<World>()
const dimension: Dimension = shape<Dimension>()
const effect: Effect = shape<Effect>()
const effectType: EffectType = shape<EffectType>()
const signal: EntityHurtAfterEventSignal = shape<EntityHurtAfterEventSignal>()

// A hand-written class — no `extends`, no access to the private constructor — assigns to the
// declared type, which a brand field or a private instance member would block.
declare const someEntity: Entity
class FakeEntityComponent {
  readonly typeId = 'minecraft:health'
  readonly isValid = true
  readonly entity = someEntity
}
const structural: EntityComponent = new FakeEntityComponent()

// Negative control proving the probe can fail: a shape missing one member is rejected.
// @ts-expect-error
const missingMember: Entity = shape<Omit<Entity, 'applyDamage'>>()

// Negative control for the structural case: dropping a member breaks the assignment.
class FakeMissingMember {
  readonly typeId = 'minecraft:health'
  readonly isValid = true
}
// @ts-expect-error
const structuralMissing: EntityComponent = new FakeMissingMember()

export {
  component,
  dimension,
  effect,
  effectType,
  entity,
  health,
  missingMember,
  player,
  signal,
  structural,
  structuralMissing,
  world,
}
