// Validation: does @twin-digital/minecraft-test-lib let a real, public pack's engine-facing code be
// tested? The subject is bencrob/marron-town-mod (MIT) at 2c025b4 — CombatHandler, unmodified.
//
// Its own suite covers domain/ and application/ only; this reaches infrastructure/, the layer that
// touches @minecraft/server, which had no double before.
import { describe, expect, it, vi } from 'vitest'

import {
  addComponent,
  createEntity,
  createPlayer,
  createServer,
  withVanillaDimensions,
  type FakeServer,
} from '@twin-digital/minecraft-test-lib'
import type * as MC from '@minecraft/server'

import { CombatHandler } from './marron-town-mod/src/infrastructure/combat-handler'
import { emptyState } from './marron-town-mod/src/domain/skills/skill-state'
import { InMemorySkillRepository } from './marron-town-mod/src/testing/fakes'

/** Attack 20 turns on the poison-every-10-hits rule and nothing else: crit needs 40, debuff 60. */
const POISON_ONLY = 20
/** Attack 40 adds the 10%-chance crit, which is the only branch that deals damage. */
const WITH_CRIT = 40

const world = (): { server: FakeServer; overworld: MC.Dimension } => {
  const server = createServer()
  withVanillaDimensions(server)
  return { server, overworld: server.world.getDimension('overworld') }
}

const zombie = (server: FakeServer, overworld: MC.Dimension, health = 20): MC.Entity => {
  const victim = createEntity(server, { typeId: 'minecraft:zombie', dimension: overworld })
  addComponent(victim, 'minecraft:health', health)
  return victim
}

/** A handler whose repository grants `attackers` the given attack level. */
const handlerFor = (attackers: readonly MC.Entity[], attackLevel: number): CombatHandler => {
  const repo = new InMemorySkillRepository()
  const base = emptyState()
  for (const attacker of attackers) {
    repo.save(attacker.id, { ...base, levels: { ...base.levels, attack: attackLevel } })
  }
  return new CombatHandler(repo)
}

const strike = (handler: CombatHandler, victim: MC.Entity, attacker: MC.Entity, cause = 'entityAttack'): void => {
  handler.handle({ hurtEntity: victim, damage: 4, damageSource: { cause, damagingEntity: attacker } } as never)
}

describe('marron-town-mod CombatHandler, against the fakes', () => {
  it('poisons the victim on every tenth landed hit, and not before', () => {
    const { server, overworld } = world()
    const attacker = createPlayer(server, { name: 'Alice', dimension: overworld })
    const victim = zombie(server, overworld)
    const handler = handlerFor([attacker], POISON_ONLY)

    for (let landed = 1; landed <= 9; landed += 1) {
      strike(handler, victim, attacker)
      expect(victim.getEffect('poison')).toBeUndefined()
    }

    strike(handler, victim, attacker)

    // The assertion is on the victim's state, not on `addEffect` having been called.
    expect(victim.getEffect('poison')?.duration).toBe(60)
    expect(victim.getEffect('poison')?.amplifier).toBe(0)
  })

  it('tallies hits per attacker, so two attackers do not pool their way to a poison', () => {
    const { server, overworld } = world()
    const alice = createPlayer(server, { name: 'Alice', dimension: overworld })
    const bob = createPlayer(server, { name: 'Bob', dimension: overworld })
    const victim = zombie(server, overworld)
    const handler = handlerFor([alice, bob], POISON_ONLY)

    // Nine each: eighteen landed hits, and a shared tally would have poisoned twice by now.
    for (let landed = 1; landed <= 9; landed += 1) {
      strike(handler, victim, alice)
      strike(handler, victim, bob)
    }
    expect(victim.getEffect('poison')).toBeUndefined()

    // Alice's tenth is hers alone.
    strike(handler, victim, alice)
    expect(victim.getEffect('poison')?.duration).toBe(60)
  })

  it('ignores the damage it deals itself, so the crit branch cannot recurse', () => {
    const { server, overworld } = world()
    const attacker = createPlayer(server, { name: 'Alice', dimension: overworld })
    const victim = zombie(server, overworld)
    const handler = handlerFor([attacker], POISON_ONLY)

    for (let landed = 1; landed <= 20; landed += 1) {
      strike(handler, victim, attacker, 'override')
    }

    expect(victim.getEffect('poison')).toBeUndefined()
  })

  it('ignores a mob attacker, because the rule is written for players', () => {
    const { server, overworld } = world()
    const skeleton = createEntity(server, { typeId: 'minecraft:skeleton', dimension: overworld })
    const victim = zombie(server, overworld)
    const handler = handlerFor([skeleton], POISON_ONLY)

    for (let landed = 1; landed <= 20; landed += 1) {
      strike(handler, victim, skeleton)
    }

    expect(victim.getEffect('poison')).toBeUndefined()
  })

  it('takes the crit surplus off the victim s health when the draw lands', () => {
    const { server, overworld } = world()
    const attacker = createPlayer(server, { name: 'Alice', dimension: overworld })
    const victim = zombie(server, overworld, 20)
    const handler = handlerFor([attacker], WITH_CRIT)
    const health = victim.getComponent('minecraft:health')

    // 0 clears the 10% crit chance; the debuff branch needs attack 60, so this is the only draw.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    strike(handler, victim, attacker)
    vi.restoreAllMocks()

    // critSurplus(4, 1.5) = 2, applied through applyDamage on top of the 4 the engine already dealt.
    expect(health?.currentValue).toBe(18)
  })

  it('leaves the victim alone when the crit draw misses', () => {
    const { server, overworld } = world()
    const attacker = createPlayer(server, { name: 'Alice', dimension: overworld })
    const victim = zombie(server, overworld, 20)
    const handler = handlerFor([attacker], WITH_CRIT)
    const health = victim.getComponent('minecraft:health')

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    strike(handler, victim, attacker)
    vi.restoreAllMocks()

    expect(health?.currentValue).toBe(20)
  })
})
