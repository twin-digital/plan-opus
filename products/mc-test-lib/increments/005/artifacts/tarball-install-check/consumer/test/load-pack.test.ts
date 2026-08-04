import { Player } from '@minecraft/server'
import { advanceTicks, createPlayer, NotImplementedError } from '@twin-digital/minecraft-test-lib'
import { loadPack } from '@twin-digital/minecraft-test-lib/vitest'
import { describe, expect, it } from 'vitest'

describe('loadPack across a module-registry reset', () => {
  it('returns the server the pack registered against', async () => {
    const server = await loadPack(() => import('../src/pack.js'))
    expect(server.system.currentTick).toBe(0)
    advanceTicks(server, 2)
    expect(server.system.currentTick).toBe(2)
  })

  it('starts the next test from a world of its own', async () => {
    const server = await loadPack(() => import('../src/pack.js'))
    expect(server.system.currentTick).toBe(0)
  })

  it('recognises the returned fakes in a statically imported free function', async () => {
    const server = await loadPack(() => import('../src/pack.js'))
    const player = createPlayer(server, {})
    expect(() => {
      advanceTicks(server, 1)
    }).not.toThrow()
    expect(player.typeId).toBe('minecraft:player')
  })

  it('answers instanceof against a statically imported surface class after the reset', async () => {
    const server = await loadPack(() => import('../src/pack.js'))
    expect(createPlayer(server, {})).toBeInstanceOf(Player)
  })

  it('catches a statically imported package error class after the reset', async () => {
    const server = await loadPack(() => import('../src/pack.js'))
    const player = createPlayer(server, {})
    let caught: unknown
    try {
      player.getSpawnPoint()
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(NotImplementedError)
  })
})
