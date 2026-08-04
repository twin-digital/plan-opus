// Probe 4 — an AsyncLocalStorage-backed store behind the same stable Proxy bindings. Three
// questions: does a context established in a hook reach the test body, do `describe.concurrent`
// tests each resolve their own server, and what does a callback the fake defers resolve to when the
// scheduler runs it under a different test's context.
import { beforeEach, describe, expect, it } from 'vitest'

import { system, world } from '@minecraft/server'
import { advanceTicks, createServer } from '@twin-digital/minecraft-test-lib'
import { currentTag, storage, withServer } from '@probe/shim-control'
import type * as MC from '@minecraft/server'

/** A real bundle from the library, tagged so a resolution can be named in the output. */
const tagged = (tag: string): { world: MC.World; system: MC.System; tag: string } => {
  const server = createServer()
  return { world: server.world, system: server.system, tag }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('a context established in beforeEach', () => {
  beforeEach(() => {
    storage.enterWith(tagged('from-hook'))
  })

  it('reaches the test body', () => {
    console.log(`[hook] resolved-in-test-body=${currentTag()}`)
    expect(typeof currentTag()).toBe('string')
  })

  it('reaches the test body after an await', async () => {
    await sleep(1)
    console.log(`[hook] resolved-after-await=${currentTag()}`)
    expect(typeof currentTag()).toBe('string')
  })
})

describe.concurrent('concurrent tests, each wrapped in storage.run', () => {
  const concurrentCase = async (tag: string, delay: number): Promise<void> =>
    withServer(tagged(tag), async () => {
      await sleep(delay)
      const seen = currentTag()
      console.log(`[concurrent] expected=${tag} resolved=${seen}`)
      expect(seen).toBe(tag)
    })

  it('case A', async () => concurrentCase('A', 20))
  it('case B', async () => concurrentCase('B', 5))
  it('case C', async () => concurrentCase('C', 10))
})

describe('a deferred callback', () => {
  // Registered under one context, invoked later by the fake's scheduler under another. Nothing in
  // the callback names a server: it reads the module bindings, which is what pack code does.
  const registered: { server: { world: MC.World; system: MC.System; tag: string } } = { server: tagged('unset') }
  const seen: string[] = []

  it('resolves the context it was registered under, while its own scheduler is running', async () => {
    const owner = tagged('owner')
    registered.server = owner
    await withServer(owner, async () => {
      // The shape a pack registers at module scope: no captured server, only the bindings.
      system.runInterval(() => {
        seen.push(`world-resolved-as=${currentTag()} tick=${(system as MC.System).currentTick}`)
      }, 1)
      advanceTicks(owner, 1)
    })
    console.log(`[deferred] same-context run: ${seen.at(-1)} (registered under 'owner')`)
    expect(seen).toHaveLength(1)
  })

  it('resolves the running test’s context, not the one it was registered under', async () => {
    const other = tagged('other')
    await withServer(other, async () => {
      // The owner's scheduler is advanced, so the owner's callback runs — under `other`'s context.
      advanceTicks(registered.server, 1)
    })
    console.log(`[deferred] cross-context run: ${seen.at(-1)} (owner's scheduler, advanced under 'other')`)
    console.log(`[deferred] callback threw? no — it read a world and carried on`)
    expect(seen).toHaveLength(2)
  })

  it('and the world it wrote to is not the world its own server holds', () => {
    console.log(`[deferred] observations=${JSON.stringify(seen)}`)
    expect(seen).toHaveLength(2)
  })
})

// `world` is imported so the module binding is exercised; the reads above go through `currentTag`
// so a resolution can be reported rather than thrown.
void world
