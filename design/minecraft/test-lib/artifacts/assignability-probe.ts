// Backs fact: server-classes-are-structurally-assignable.
// A value carrying only the public shape of each faked class must be assignable to it —
// which holds iff the declared class has no private members or brand fields. Run: npm run check

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

// Negative control proving the probe can fail: a shape missing one member is rejected.
// @ts-expect-error
const missingMember: Entity = shape<Omit<Entity, 'applyDamage'>>()

export { component, dimension, effect, effectType, entity, health, missingMember, player, signal, world }
