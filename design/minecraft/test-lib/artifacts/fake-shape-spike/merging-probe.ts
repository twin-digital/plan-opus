// Spike: can interface/class declaration merging supply a fake's declared shape without
// hand-writing every member? Also: what `extends` and `implements` do against the engine's
// `private constructor()`, and whether the merged class still type-checks the members it does
// write. Every `@ts-expect-error` is an assertion: an unused one is itself an error, so a clean
// compile means each negative genuinely failed.
// Run: npx tsc --noEmit merging-probe.ts (or npm run check for the whole folder)

import type {
  Dimension,
  Entity,
  EntityApplyDamageByProjectileOptions,
  EntityApplyDamageOptions,
  EntityComponent,
  EntityHealthComponent,
  Player,
  ScoreboardIdentity,
  Vector2,
} from '@minecraft/server'

// ---------------------------------------------------------------------------
// 1. `implements` demands every member. Negative control for the whole exercise.
// ---------------------------------------------------------------------------

// @ts-expect-error `implements Entity` requires all 62 members; this class writes four
class ImplementsEntity implements Entity {
  readonly id = '1'
  readonly typeId = 'minecraft:sheep'
  readonly isValid = true
  nameTag = ''
}

// ---------------------------------------------------------------------------
// 2. `extends` is blocked outright by the engine's `private constructor()`.
// ---------------------------------------------------------------------------

declare const EntityClass: typeof Entity
// @ts-expect-error cannot extend a class whose constructor is private
class ExtendsEntity extends EntityClass {}

// ---------------------------------------------------------------------------
// 3. Declaration merging: the interface supplies the shape, the class supplies the members
//    it actually models. No `implements`, so tsc demands nothing of the class.
// ---------------------------------------------------------------------------

interface FakeEntity extends Entity {}
class FakeEntity {
  readonly id: string
  readonly typeId: string

  constructor(id: string, typeId: string) {
    this.id = id
    this.typeId = typeId
  }

  get isValid(): boolean {
    return true
  }

  kill(): boolean {
    return true
  }

  applyDamage(
    amount: number,
    _options?: EntityApplyDamageByProjectileOptions | EntityApplyDamageOptions,
  ): boolean {
    return amount > 0
  }
}

// It satisfies Entity with no cast, under strict.
const merged: Entity = new FakeEntity('1', 'minecraft:sheep')

// Members the class never wrote are typed and reachable — tsc believes them.
const _dim: Dimension = merged.dimension
const _rot: Vector2 = merged.getRotation()
const _sid: ScoreboardIdentity | undefined = merged.scoreboardIdentity
const _tags: string[] = merged.getTags()

// ...and so are they on the class type itself, which is the hazard: library-internal code can
// call a member the class does not implement and tsc will not object.
const _internal: string[] = new FakeEntity('1', 'x').getTags()

// A typo is still an error on both the interface type and the class type.
// @ts-expect-error no such member on Entity
merged.getTagz()
// @ts-expect-error no such member on FakeEntity either
new FakeEntity('1', 'x').getTagz()

// The members the class *does* write are still checked against the real signatures — but the
// error lands on the `interface … extends Entity` line, not on the offending class member.
// @ts-expect-error TS2430: kill() is declared to return boolean, and this class returns string
interface FakeEntityBadReturn extends Entity {}
class FakeEntityBadReturn {
  kill(): string {
    return 'no'
  }
}

// @ts-expect-error TS2430: applyDamage's first parameter is a number, and this class takes a string
interface FakeEntityBadArity extends Entity {}
class FakeEntityBadArity {
  applyDamage(amount: string): boolean {
    return amount.length > 0
  }
}

// `readonly` is NOT carried across the merge: a class field redeclaring a readonly member as
// writable compiles, and is writable through the class type. It stays readonly through Entity.
interface FakeEntityWritableId extends Entity {}
class FakeEntityWritableId {
  id = '1'
}
const writable = new FakeEntityWritableId()
writable.id = 'reassigned'
const readThroughEntity: Entity = writable
// @ts-expect-error `id` is still readonly through the real declared type
readThroughEntity.id = 'reassigned'

// ---------------------------------------------------------------------------
// 4. Merging survives subclassing: FakePlayer extends the fake class and merges Player.
// ---------------------------------------------------------------------------

interface FakePlayer extends Player {}
class FakePlayer extends FakeEntity {
  readonly name: string

  constructor(id: string, name: string) {
    super(id, 'minecraft:player')
    this.name = name
  }
}

const player: Player = new FakePlayer('2', 'Steve')
const asEntity: Entity = player
void asEntity
// Player's own members are present without being written.
const _level: number = player.level

// ---------------------------------------------------------------------------
// 5. The same trick for a component, and for a component that extends another fake class.
// ---------------------------------------------------------------------------

interface FakeEntityComponent extends EntityComponent {}
class FakeEntityComponent {
  readonly typeId: string
  constructor(typeId: string) {
    this.typeId = typeId
  }
}
const component: EntityComponent = new FakeEntityComponent('minecraft:health')
void component

interface FakeHealthComponent extends EntityHealthComponent {}
class FakeHealthComponent extends FakeEntityComponent {
  currentValue = 20
}
const health: EntityHealthComponent = new FakeHealthComponent('minecraft:health')
// `entity` is inherited from EntityComponent through the merged interface; nothing wrote it.
const _owner: Entity = health.entity

// ---------------------------------------------------------------------------
// 6. A Proxy over the merged class keeps the type. No cast anywhere.
// ---------------------------------------------------------------------------

declare const entityTrap: ProxyHandler<FakeEntity>
const proxied: Entity = new Proxy(new FakeEntity('3', 'minecraft:cow'), entityTrap)
void proxied

// Without merging, a Proxy over a partial object needs a cast to reach Entity.
const partial = { id: '4', typeId: 'minecraft:cow', isValid: true }
declare const partialTrap: ProxyHandler<typeof partial>
// @ts-expect-error a partial object is not an Entity, however it is wrapped
const uncast: Entity = new Proxy(partial, partialTrap)
const cast = new Proxy(partial, partialTrap) as unknown as Entity
void uncast
void cast

// ---------------------------------------------------------------------------
// 7. A checked member-name list: the compiler proves the list is complete, so a version bump
//    that adds a member to Entity fails the build rather than leaving a hole.
// ---------------------------------------------------------------------------

const ENTITY_MEMBERS = [
  'addEffect',
  'addItem',
  'addTag',
  'applyDamage',
  'applyImpulse',
  'applyKnockback',
  'clearDynamicProperties',
  'clearVelocity',
  'dimension',
  'extinguishFire',
  'getAABB',
  'getAllBlocksStandingOn',
  'getBlockFromViewDirection',
  'getBlockStandingOn',
  'getComponent',
  'getComponents',
  'getDynamicProperty',
  'getDynamicPropertyIds',
  'getDynamicPropertyTotalByteCount',
  'getEffect',
  'getEffects',
  'getEntitiesFromViewDirection',
  'getHeadLocation',
  'getProperty',
  'getRotation',
  'getTags',
  'getVelocity',
  'getViewDirection',
  'hasComponent',
  'hasTag',
  'id',
  'isClimbing',
  'isFalling',
  'isInWater',
  'isOnGround',
  'isSleeping',
  'isSneaking',
  'isSprinting',
  'isSwimming',
  'isValid',
  'kill',
  'localizationKey',
  'location',
  'lookAt',
  'matches',
  'nameTag',
  'playAnimation',
  'remove',
  'removeEffect',
  'removeTag',
  'resetProperty',
  'runCommand',
  'scoreboardIdentity',
  'setDynamicProperties',
  'setDynamicProperty',
  'setOnFire',
  'setProperty',
  'setRotation',
  'teleport',
  'triggerEvent',
  'tryTeleport',
  'typeId',
] as const satisfies readonly (keyof Entity)[]

type Missing = Exclude<keyof Entity, (typeof ENTITY_MEMBERS)[number]>
type AssertNever<T extends never> = T
type _NoneMissing = AssertNever<Missing>

// The same assertion with a member removed does fail, so the check above is real.
type MissingIfShort = Exclude<keyof Entity, Exclude<(typeof ENTITY_MEMBERS)[number], 'kill'>>
// @ts-expect-error 'kill' is missing from the shortened list
type _ShortFails = AssertNever<MissingIfShort>

// ---------------------------------------------------------------------------
// 8. A mapped type can describe a stub table, but only over a runtime name list.
// ---------------------------------------------------------------------------

type StubTable = { [K in keyof Entity]: unknown }
declare function stubs(names: readonly (keyof Entity)[]): StubTable
const table = stubs(ENTITY_MEMBERS)
void table

export { merged, player, health, writable, ImplementsEntity, ExtendsEntity, FakeEntityBadReturn, FakeEntityBadArity, FakeEntityWritableId, _dim, _rot, _sid, _tags, _internal, _level, _owner }
export type { _NoneMissing, _ShortFails }
