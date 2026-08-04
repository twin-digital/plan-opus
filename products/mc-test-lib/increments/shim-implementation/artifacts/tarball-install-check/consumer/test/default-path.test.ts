import {
  addComponent,
  advanceTicks,
  createEntity,
  createPlayer,
  currentServer,
  withVanillaDimensions,
} from '@twin-digital/minecraft-test-lib'
import { Entity, EntityDamageCause, Player, system, world } from '@minecraft/server'
import { describe, expect, it } from 'vitest'

import { hurtLog } from '../src/pack.js'

describe('the default static-import path', () => {
  it('loaded the unmodified pack, every value import resolved', () => {
    expect(hurtLog).toEqual([])
  })

  it('landed the pack subscriptions on the setup-installed server', () => {
    const server = currentServer()
    withVanillaDimensions(server)
    const sheep = createEntity(server, {
      typeId: 'minecraft:sheep',
      dimension: world.getDimension('overworld'),
    })
    addComponent(sheep, 'minecraft:health', 20)
    sheep.applyDamage(1, { cause: EntityDamageCause.entityAttack })
    expect(hurtLog).toEqual(['entity:attack'])
  })

  it('landed the pack scheduled loop on the same server', () => {
    const before = system.currentTick
    advanceTicks(currentServer(), 3)
    expect(system.currentTick).toBe(before + 3)
  })

  it('answers instanceof across the alias', () => {
    const player = createPlayer(currentServer(), {})
    expect(player).toBeInstanceOf(Player)
    expect(player).toBeInstanceOf(Entity)
    expect({}).not.toBeInstanceOf(Entity)
  })
})
