// Third validation subject: xigma0512/GunFight-Arena (MIT, 0f16e88) — chosen for the paths
// marron-town-mod does not reach: dynamic properties on both the world and an entity, `system`
// scheduling through advanceTicks, and EntityQueryOptions filtering.
//
// Note it declares `@minecraft/server` ^1.17.0 while this library pins 2.8.0. Nothing exercised here
// moved between those lines, but that is a compatibility question a consumer has to ask.
import { beforeEach, describe, expect, it } from 'vitest'

import {
  advanceTicks,
  createEntity,
  createPlayer,
  createServer,
  withVanillaDimensions,
  type FakeServer,
} from '@twin-digital/minecraft-test-lib'
import type * as MC from '@minecraft/server'

import { __useServer } from './stub/minecraft-server.js'

import Property from './GunFight-Arena/src/property/_handler'
import { Task } from './GunFight-Arena/src/system/task/task'
import { Team } from './GunFight-Arena/src/declare/enums'

let server: FakeServer
let overworld: MC.Dimension

beforeEach(() => {
  server = createServer()
  withVanillaDimensions(server)
  overworld = server.world.getDimension('overworld')
  __useServer(server)
})

describe('dynamic properties on an entity', () => {
  it('seeds itself on first construction, because an unset property reads undefined', () => {
    const player = createPlayer(server, { name: 'Alice', dimension: overworld })
    expect(player.getDynamicProperty('alive')).toBeUndefined()

    // PAlive's constructor writes the default only when the read comes back undefined.
    const alive = Property.entity(player).get('alive')

    expect(alive.value).toBe(true)
    expect(player.getDynamicProperty('alive')).toBe(true)
  })

  it('does not overwrite a value already stored', () => {
    const player = createPlayer(server, { name: 'Alice', dimension: overworld })
    player.setDynamicProperty('alive', false)

    expect(Property.entity(player).get('alive').value).toBe(false)
  })

  it('writes through to the entity the test holds', () => {
    const player = createPlayer(server, { name: 'Alice', dimension: overworld })
    const alive = Property.entity(player).get('alive')

    alive.update(false)

    expect(alive.value).toBe(false)
    expect(player.getDynamicProperty('alive')).toBe(false)
    expect(player.getDynamicPropertyIds()).toContain('alive')
  })

  it('keeps two players properties apart', () => {
    const alice = createPlayer(server, { name: 'Alice', dimension: overworld })
    const bob = createPlayer(server, { name: 'Bob', dimension: overworld })

    Property.entity(alice).get('alive').update(false)
    Property.entity(bob).get('alive')

    expect(alice.getDynamicProperty('alive')).toBe(false)
    expect(bob.getDynamicProperty('alive')).toBe(true)
  })
})

describe('dynamic properties on the world', () => {
  it('round-trips the team score through a JSON world property', () => {
    const score = Property.world().get('team_score')
    expect(score.getTeamScore(Team.Red)).toBe(0)

    score.updateTeamScore(Team.Red, 7)
    score.updateTeamScore(Team.Blue, 3)

    expect(score.getTeamScore(Team.Red)).toBe(7)
    expect(score.getTeamScore(Team.Blue)).toBe(3)
    // The value really lives on the world, not on the property object.
    expect(JSON.parse(server.world.getDynamicProperty('team_score') as string)).toEqual({ red: 7, blue: 3 })
  })

  it('reads back what a second handle wrote, since the world is the storage', () => {
    Property.world().get('team_score').updateTeamScore(Team.Blue, 5)

    expect(Property.world().get('team_score').getTeamScore(Team.Blue)).toBe(5)
  })

  it('holds nothing on a fresh bundle', () => {
    expect(createServer().world.getDynamicPropertyIds()).toEqual([])
  })
})

describe('scheduling through Task', () => {
  it('runs its job every interval ticks once the test advances them', () => {
    let ran = 0
    new Task(() => {
      ran += 1
    }, 20).run()

    expect(ran).toBe(0) // nothing runs on its own

    advanceTicks(server, 19)
    expect(ran).toBe(0)

    advanceTicks(server, 1)
    expect(ran).toBe(1)

    advanceTicks(server, 60)
    expect(ran).toBe(4)
  })

  it('stops when killed, and not before', () => {
    let ran = 0
    const task = new Task(() => {
      ran += 1
    }, 5)
    task.run()

    advanceTicks(server, 12)
    expect(ran).toBe(2)

    task.kill()
    advanceTicks(server, 100)
    expect(ran).toBe(2)
  })

  it('drives a real job: the saturation task the pack runs every second', () => {
    const alice = createPlayer(server, { name: 'Alice', dimension: overworld })
    const bob = createPlayer(server, { name: 'Bob', dimension: overworld })

    // PrimaryTask.PlayerEffect, lifted rather than imported: runTask.ts pulls in the whole game.
    new Task(() => {
      for (const player of server.world.getAllPlayers()) {
        player.addEffect('saturation', 30, { amplifier: 1, showParticles: false })
      }
    }, 20).run()

    advanceTicks(server, 20)

    for (const player of [alice, bob]) {
      expect(player.getEffect('saturation')?.duration).toBe(30)
      expect(player.getEffect('saturation')?.amplifier).toBe(1)
    }
  })
})

describe('entity queries', () => {
  // events/after/entity/entitySpawn.ts: getEntities({ type: 'minecraft:item', name: 'C4' })
  it('filters on the two fields the pack s spawn handler queries with', () => {
    const bomb = createEntity(server, { typeId: 'minecraft:item', dimension: overworld })
    bomb.nameTag = 'C4'
    const otherItem = createEntity(server, { typeId: 'minecraft:item', dimension: overworld })
    otherItem.nameTag = 'Stone'
    const zombie = createEntity(server, { typeId: 'minecraft:zombie', dimension: overworld })
    zombie.nameTag = 'C4'

    const found = overworld.getEntities({ type: 'minecraft:item', name: 'C4' })

    expect(found).toEqual([bomb])
    void otherItem
    void zombie
  })

  // modes/demolition/preparation.ts: getEntities({type}).forEach(e => e.kill())
  it('kills exactly the entities the type filter selected', () => {
    const planted = createEntity(server, { typeId: 'gunfight_arena:planted_bomb', dimension: overworld })
    const dropped = createEntity(server, { typeId: 'gunfight_arena:dropped_bomb', dimension: overworld })

    overworld.getEntities({ type: 'gunfight_arena:planted_bomb' }).forEach((entity) => {
      entity.kill()
    })

    // kill() on a health-less entity invalidates it, as the engine does within the call.
    expect(planted.isValid).toBe(false)
    expect(dropped.isValid).toBe(true)
  })
})
