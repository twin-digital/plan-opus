// Spike: what the test author sees under each option, and whether the runtime manifests a
// proxy or a stub installer needs can be checked complete by the compiler rather than trusted.
// Every `@ts-expect-error` is an assertion; an unused one fails the build.
// Run: npx tsc --noEmit consumer-typing-probe.ts (or npm run check for the whole folder)

import type {
  Entity,
  EntityComponentTypeMap,
  EntityHealthComponent,
  Player,
  System,
  World,
} from '@minecraft/server'

// ---------------------------------------------------------------------------
// 1. The method/property split a call-time guard needs is derivable from the declarations.
// ---------------------------------------------------------------------------

type MethodsOf<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends (...args: never[]) => unknown ? K : never
}[keyof T]
type PropertiesOf<T> = Exclude<keyof T, MethodsOf<T>>

declare const someMethod: MethodsOf<Entity>
declare const someProperty: PropertiesOf<Entity>

// The split lands where the checker's own count says it should: methods on one side...
const _m1: 'kill' | 'applyDamage' | 'getComponent' = someMethod as 'kill' | 'applyDamage' | 'getComponent'
// @ts-expect-error `id` is a property, not a method
const _m2: MethodsOf<Entity> = 'id'
// ...properties on the other.
const _p1: PropertiesOf<Entity> = 'id'
// @ts-expect-error `kill` is a method, not a property
const _p2: PropertiesOf<Entity> = 'kill'
void someProperty

// A runtime manifest can therefore be proved complete and correctly partitioned at compile
// time. A version bump that adds a member, or moves one across the split, fails the build.
type AssertNever<T extends never> = T

const ENTITY_METHODS = [
  'addEffect', 'addItem', 'addTag', 'applyDamage', 'applyImpulse', 'applyKnockback',
  'clearDynamicProperties', 'clearVelocity', 'extinguishFire', 'getAABB',
  'getAllBlocksStandingOn', 'getBlockFromViewDirection', 'getBlockStandingOn', 'getComponent',
  'getComponents', 'getDynamicProperty', 'getDynamicPropertyIds',
  'getDynamicPropertyTotalByteCount', 'getEffect', 'getEffects',
  'getEntitiesFromViewDirection', 'getHeadLocation', 'getProperty', 'getRotation', 'getTags',
  'getVelocity', 'getViewDirection', 'hasComponent', 'hasTag', 'kill', 'lookAt', 'matches',
  'playAnimation', 'remove', 'removeEffect', 'removeTag', 'resetProperty', 'runCommand',
  'setDynamicProperties', 'setDynamicProperty', 'setOnFire', 'setProperty', 'setRotation',
  'teleport', 'triggerEvent', 'tryTeleport',
] as const satisfies readonly MethodsOf<Entity>[]

const ENTITY_PROPERTIES = [
  'dimension', 'id', 'isClimbing', 'isFalling', 'isInWater', 'isOnGround', 'isSleeping',
  'isSneaking', 'isSprinting', 'isSwimming', 'isValid', 'localizationKey', 'location',
  'nameTag', 'scoreboardIdentity', 'typeId',
] as const satisfies readonly PropertiesOf<Entity>[]

type _MethodsComplete = AssertNever<Exclude<MethodsOf<Entity>, (typeof ENTITY_METHODS)[number]>>
type _PropertiesComplete = AssertNever<Exclude<PropertiesOf<Entity>, (typeof ENTITY_PROPERTIES)[number]>>

// The completeness assertion is real: drop one and it fails.
// @ts-expect-error 'kill' is no longer covered
type _Fails = AssertNever<Exclude<MethodsOf<Entity>, Exclude<(typeof ENTITY_METHODS)[number], 'kill'>>>

// And a member on the wrong side of the split fails too.
// @ts-expect-error 'id' is a property
const _WrongSide = ['id'] as const satisfies readonly MethodsOf<Entity>[]

// ---------------------------------------------------------------------------
// 2. What the test author sees. A factory declared to return the engine's own type gives the
//    real completion list and the real errors.
// ---------------------------------------------------------------------------

declare function createEntityAsEntity(typeId: string): Entity

const e = createEntityAsEntity('minecraft:sheep')
const _typeId: string = e.typeId
const _killed: boolean = e.kill()
// @ts-expect-error a typo is an error
e.getTagz()
// @ts-expect-error a wrong argument type is an error
e.applyDamage('lots')
// @ts-expect-error a member the engine does not have is an error, however useful it would be
e.invalidate()

// ---------------------------------------------------------------------------
// 3. The failure mode to avoid: a fake typed loosely. Everything above stops being an error.
// ---------------------------------------------------------------------------

declare function createEntityAsAny(typeId: string): any
const loose = createEntityAsAny('minecraft:sheep')
loose.getTagz() // no error — the typo compiles
loose.applyDamage('lots') // no error — the wrong argument compiles
const _wrong: number = loose.typeId // no error — the wrong type compiles
void _wrong

// A `Record<string, unknown>` or an index signature is the same failure with a different spelling:
declare function createEntityIndexed(typeId: string): Entity & Record<string, unknown>
const indexed = createEntityIndexed('minecraft:sheep')
indexed.getTagz // no error — an index signature swallows every typo
void indexed

// A `Partial<Entity>` fake is a third spelling of it: the typo is caught, but every read is
// possibly-undefined, so the test author writes `!` everywhere and the fake stops standing in
// for the real type at all.
declare function createEntityPartial(typeId: string): Partial<Entity>
const partial = createEntityPartial('minecraft:sheep')
// @ts-expect-error Partial<Entity> is not assignable to Entity
const _asEntity: Entity = partial
// @ts-expect-error kill may be undefined
partial.kill()

// ---------------------------------------------------------------------------
// 4. Module augmentation is in augmentation-probe.ts, compiled on its own. Keeping it in this
//    file breaks the completeness assertion above — which is itself the finding: an augmentation
//    widens `keyof Entity` for the whole program.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 5. The bundle: registries must be classes, and the whole thing is a Pick of the module.
// ---------------------------------------------------------------------------

type ServerBundle = { world: World; system: System }
declare const bundle: ServerBundle
const _w: World = bundle.world
const _s: System = bundle.system

// ---------------------------------------------------------------------------
// 6. Merged fake classes compose the same way the engine's do.
// ---------------------------------------------------------------------------

interface FakeEntity extends Entity {}
class FakeEntity {
  readonly typeId: string
  constructor(typeId: string) {
    this.typeId = typeId
  }
}
interface FakePlayer extends Player {}
class FakePlayer extends FakeEntity {}

declare function acceptsEntity(e: Entity): void
declare function acceptsPlayer(p: Player): void
acceptsEntity(new FakeEntity('minecraft:sheep'))
acceptsPlayer(new FakePlayer('minecraft:player'))
acceptsEntity(new FakePlayer('minecraft:player'))
// @ts-expect-error a plain fake entity is not a Player
acceptsPlayer(new FakeEntity('minecraft:sheep'))

// The merged class is exportable, and a consumer who constructs it directly gets an object
// whose unimplemented members are `undefined` at runtime while typing as present.
const raw = new FakeEntity('minecraft:sheep')
const _dangling: string[] = raw.getTags() // compiles; at runtime `getTags` is not there

declare const health: EntityHealthComponent
const _cv: number = health.currentValue

// ---------------------------------------------------------------------------
// 7. One generic factory can stand in for all 68 component classes: the type map carries the
//    per-id return type, so a test still gets the exact component type and its exact members.
//    The library pays one internal cast; the test author pays none.
// ---------------------------------------------------------------------------

declare function getComponentTyped<K extends keyof EntityComponentTypeMap>(
  entity: Entity,
  id: K,
): EntityComponentTypeMap[K] | undefined

const h = getComponentTyped(e, 'minecraft:health')
const _hv: number | undefined = h?.currentValue
const inv = getComponentTyped(e, 'minecraft:inventory')
const _container = inv?.container
// @ts-expect-error the inventory component has no currentValue
inv?.currentValue
// @ts-expect-error a typo'd component id is not in the map
getComponentTyped(e, 'minecraft:helth')

// And the implementation side: a proxy over one shared record reaches every one of them with a
// single cast, so none of the 68 classes has to exist.
declare const anyProxy: object
function makeComponent<K extends keyof EntityComponentTypeMap>(id: K): EntityComponentTypeMap[K] {
  void id
  return anyProxy as EntityComponentTypeMap[K]
}
const _made: EntityHealthComponent = makeComponent('minecraft:health')

export {
  ENTITY_METHODS,
  ENTITY_PROPERTIES,
  e,
  loose,
  partial,
  raw,
  _m1,
  _m2,
  _p1,
  _p2,
  _typeId,
  _killed,
  _asEntity,
  _WrongSide,
  _w,
  _s,
  _cv,
  h,
  inv,
  _hv,
  _container,
  _made,
  makeComponent,
  _dangling,
}
export type { MethodsOf, PropertiesOf, _MethodsComplete, _PropertiesComplete, _Fails }
