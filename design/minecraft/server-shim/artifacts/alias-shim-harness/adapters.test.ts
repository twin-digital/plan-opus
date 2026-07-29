// Second validation pass over bencrob/marron-town-mod (MIT, 2c025b4), reaching the paths
// combat-handler.test.ts did not: the event bus end to end, scoreboard persistence, output capture,
// and the passive loop over world.getAllPlayers().
//
// Everything here reads the engine through the module-scope `world`/`system` singletons, which is
// how most packs are written — so the test points the aliased module at a bundle first.
import { beforeEach, describe, expect, it } from 'vitest'

import {
  addComponent,
  createEntity,
  createPlayer,
  createServer,
  getOutput,
  withVanillaDimensions,
  type FakeServer,
} from '@twin-digital/minecraft-test-lib'
import type * as MC from '@minecraft/server'

import { __useServer } from './stub/minecraft-server.js'

import { CombatHandler } from './marron-town-mod/src/infrastructure/combat-handler'
import { PassiveApplier } from './marron-town-mod/src/infrastructure/passive-applier'
import { ScoreboardSkillRepository } from './marron-town-mod/src/infrastructure/scoreboard-skill-repository'
import { MinecraftMessenger } from './marron-town-mod/src/infrastructure/minecraft-messenger'
import { emptyState } from './marron-town-mod/src/domain/skills/skill-state'

let server: FakeServer
let overworld: MC.Dimension

beforeEach(() => {
  server = createServer()
  withVanillaDimensions(server)
  overworld = server.world.getDimension('overworld')
  // The pack's adapters read `world` from the module; point it at this bundle.
  __useServer(server)
})

describe('the event bus, end to end', () => {
  // main.ts line 126: world.afterEvents.entityHurt.subscribe((event) => combat.handle(event))
  it('carries applyDamage through entityHurt into the pack s handler', () => {
    const repo = new ScoreboardSkillRepository()
    const attacker = createPlayer(server, { name: 'Alice', dimension: overworld })
    const victim = createEntity(server, { typeId: 'minecraft:zombie', dimension: overworld })
    addComponent(victim, 'minecraft:health', 20)
    repo.save(attacker.id, { ...emptyState(), levels: { agility: 0, attack: 20, defense: 0, mining: 0 } })

    const combat = new CombatHandler(repo)
    server.world.afterEvents.entityHurt.subscribe((event) => {
      combat.handle(event)
    })

    // No hand-built payload: the fake raises entityHurt from applyDamage, as the engine would.
    for (let landed = 1; landed <= 9; landed += 1) {
      victim.applyDamage(1, { cause: 'entityAttack' as MC.EntityDamageCause, damagingEntity: attacker })
      expect(victim.getEffect('poison')).toBeUndefined()
    }
    victim.applyDamage(1, { cause: 'entityAttack' as MC.EntityDamageCause, damagingEntity: attacker })

    expect(victim.getEffect('poison')?.duration).toBe(60)
    // Ten hits of 1 damage, and the handler's own crit branch is off at attack 20.
    expect(victim.getComponent('minecraft:health')?.currentValue).toBe(10)
  })
})

describe('scoreboard persistence', () => {
  it('round-trips a skill state through world.scoreboard', () => {
    const repo = new ScoreboardSkillRepository()
    const player = createPlayer(server, { name: 'Alice', dimension: overworld })

    repo.save(player.id, {
      ...emptyState(),
      unspentPoints: 3,
      totalPointsEarned: 11,
      levels: { agility: 5, attack: 20, defense: 0, mining: 40 },
    })

    const loaded = repo.load(player.id)
    expect(loaded.unspentPoints).toBe(3)
    expect(loaded.totalPointsEarned).toBe(11)
    expect(loaded.levels).toEqual({ agility: 5, attack: 20, defense: 0, mining: 40 })

    // It really went through the scoreboard, not a field on the repository.
    expect(server.world.scoreboard.getObjective('marrontown_attack')?.getScore(player.id)).toBe(20)
  })

  it('reads an unknown player as the empty state rather than throwing', () => {
    expect(new ScoreboardSkillRepository().load('nobody')).toEqual(emptyState())
  })

  it('keeps two players scores apart', () => {
    const repo = new ScoreboardSkillRepository()
    const alice = createPlayer(server, { name: 'Alice' })
    const bob = createPlayer(server, { name: 'Bob' })
    const base = emptyState()

    repo.save(alice.id, { ...base, levels: { ...base.levels, mining: 60 } })
    repo.save(bob.id, { ...base, levels: { ...base.levels, mining: 10 } })

    expect(repo.load(alice.id).levels.mining).toBe(60)
    expect(repo.load(bob.id).levels.mining).toBe(10)
  })
})

describe('captured output', () => {
  it('records what the messenger would have sent, per target', () => {
    const alice = createPlayer(server, { name: 'Alice', dimension: overworld })
    const messenger = new MinecraftMessenger()

    messenger.actionBar(alice.id, 'Niveau 20')
    messenger.sendTo(alice.id, 'Poison débloqué')
    messenger.broadcast('Rotation boutique')

    expect(getOutput(alice)).toEqual([
      { kind: 'actionBar', value: 'Niveau 20' },
      { kind: 'message', value: 'Poison débloqué' },
    ])
    expect(getOutput(server.world)).toEqual([{ kind: 'message', value: 'Rotation boutique' }])
  })
})

describe('the passive loop', () => {
  it('applies a passive effect to every player the world holds', () => {
    const repo = new ScoreboardSkillRepository()
    const alice = createPlayer(server, { name: 'Alice', dimension: overworld })
    const bob = createPlayer(server, { name: 'Bob', dimension: overworld })
    const base = emptyState()
    // Defense 20 is the first passive tier; mining stays 0 so the block-scanning perk is off.
    repo.save(alice.id, { ...base, levels: { ...base.levels, defense: 20 } })

    new PassiveApplier(repo).tick(100)

    expect(alice.getEffect('resistance')).toBeDefined()
    expect(alice.getEffect('resistance')?.duration).toBe(80)
    expect(bob.getEffects()).toEqual([])
  })

  it('does nothing before its suppression tick', () => {
    const repo = new ScoreboardSkillRepository()
    const alice = createPlayer(server, { name: 'Alice', dimension: overworld })
    const base = emptyState()
    repo.save(alice.id, { ...base, levels: { ...base.levels, defense: 20 } })

    const passives = new PassiveApplier(repo)
    passives.suppressedUntilTick = 200
    passives.tick(100)

    expect(alice.getEffects()).toEqual([])
  })

  it('refuses to invent a location the test never gave the player', () => {
    const repo = new ScoreboardSkillRepository()
    const alice = createPlayer(server, { name: 'Alice', dimension: overworld })
    const base = emptyState()
    // Mining 80 turns on the in-mine night vision, which reads player.location.y.
    repo.save(alice.id, { ...base, levels: { ...base.levels, mining: 80 } })

    // The perk's own try/catch is around addEffect, not around the location read, so the
    // UnsetValueError surfaces — the fake will not answer with a coordinate nobody supplied.
    expect(() => {
      new PassiveApplier(repo).tick(100)
    }).toThrow(/location/)
  })
})
