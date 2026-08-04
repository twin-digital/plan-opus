// Probe 1 — the stable-Proxy shim, whose `world` and `system` never change identity and resolve the
// current server out of a globalThis store. Run under both shims: `stable-bindings.config.ts`
// aliases `@minecraft/server` to the Proxy variant, `let-bindings.config.ts` to the `export let`
// variant the spec ships, and every expectation below is written to record what happened rather
// than to assert the Proxy's answer.
import { expect, it, vi } from 'vitest'

// The static import a clean test file wants to write: no dynamic import, no await.
import { system, world } from '@minecraft/server'
import { __useServer, ShimNotInstalledError } from '@probe/shim-control'

const SHIM = process.env.PROBE_SHIM ?? 'unknown'

/** A stand-in server: two tagged objects, enough to see which one a binding resolved to. */
const fakeServer = (tag: string) => ({
  tag,
  world: { tag, getDimension: (id: string) => `${tag}:${id}` },
  system: { tag, currentTick: 0, runInterval: (_fn: () => void, _n: number) => 1 },
})

it('(a) a static import of world after vi.resetModules()', async () => {
  __useServer(fakeServer('A'))
  console.log(`[${SHIM}] before-reset static-world.tag=${(world as never as { tag: string }).tag}`)

  vi.resetModules()
  const control = await import('@probe/shim-control')
  console.log(`[${SHIM}] control-module-is-fresh=${control.__useServer !== __useServer}`)
  control.__useServer(fakeServer('B'))

  let observed: string
  try {
    observed = (world as never as { tag: string }).tag
  } catch (error) {
    observed = `threw ${(error as Error).name}`
  }
  console.log(`[${SHIM}] after-reset static-world.tag=${observed} (installed B through the fresh control module)`)
  expect(typeof observed).toBe('string')
})

it('(b) the unset sentinel', () => {
  __useServer()
  const caught = (fn: () => unknown): string => {
    try {
      fn()
      return 'no throw'
    } catch (error) {
      return (error as Error).name
    }
  }
  console.log(`[${SHIM}] unset property-read=${caught(() => (world as never as { x: unknown }).x)}`)
  console.log(`[${SHIM}] unset method-call=${caught(() => (world as never as { getDimension(id: string): void }).getDimension('overworld'))}`)
  console.log(`[${SHIM}] unset call-shaped=${caught(() => (system as never as () => void)())}`)
  console.log(`[${SHIM}] unset construct-shaped=${caught(() => new (world as never as new () => void)())}`)
  console.log(`[${SHIM}] unset in-operator=${caught(() => 'afterEvents' in (world as never as object))}`)
  console.log(`[${SHIM}] unset spread=${caught(() => ({ ...(world as never as object) }))}`)
  console.log(`[${SHIM}] unset typeof=${typeof world} nullish=${(world as unknown) == null} truthy=${Boolean(world)}`)
  expect(caught(() => (world as never as { x: unknown }).x)).toBe(ShimNotInstalledError.name)
})

it('(c) identity, once a server is installed', () => {
  const server = fakeServer('C')
  __useServer(server)
  console.log(`[${SHIM}] server.world===world -> ${(server.world as unknown) === (world as unknown)}`)
  console.log(`[${SHIM}] server.system===system -> ${(server.system as unknown) === (system as unknown)}`)
  console.log(`[${SHIM}] installed typeof-world=${typeof world}`)
  console.log(`[${SHIM}] installed Object.keys(world)=${JSON.stringify(Object.keys(world as never as object))}`)
  console.log(`[${SHIM}] installed JSON.stringify(world)=${JSON.stringify(world)}`)
  console.log(`[${SHIM}] installed world.getDimension('overworld')=${(world as never as { getDimension(id: string): string }).getDimension('overworld')}`)
  console.log(`[${SHIM}] installed 'getDimension' in world -> ${'getDimension' in (world as never as object)}`)
  expect((world as never as { tag: string }).tag).toBe('C')
})
