import { beforeEach, describe, expect, it } from 'vitest'

// The test-facing half, reached by ordinary node resolution — no alias involved.
import {
  __useServer,
  __instanceId as controlInstanceId,
  __evaluationCount as controlEvaluationCount,
} from '@twin-digital/minecraft-server-shim/control'

// The pack-facing half, reached only through the aliased `@minecraft/server` specifier.
import {
  packSeesWorld,
  packSeesSystem,
  packInstanceId,
  packEvaluationCount,
} from './pack.js'

const fakeServer = { world: { tag: 'fake-world' }, system: { tag: 'fake-system' } }

describe('alias entry and ./control entry', () => {
  beforeEach(() => {
    __useServer(fakeServer)
  })

  it('resolve to one module instance', () => {
    // eslint-disable-next-line no-console
    console.log(
      `same-instance=${controlInstanceId === packInstanceId()} ` +
        `state-module-evaluations=${Math.max(controlEvaluationCount, packEvaluationCount())}\n` +
        `control-instance-id=${controlInstanceId} pack-instance-id=${packInstanceId()}`,
    )
    expect(packInstanceId()).toBe(controlInstanceId)
  })

  it('let a control-side __useServer reach the pack side', () => {
    // eslint-disable-next-line no-console
    console.log(
      `pack-world=${JSON.stringify(packSeesWorld())} pack-system=${JSON.stringify(packSeesSystem())}`,
    )
    expect(packSeesWorld()).toBe(fakeServer.world)
    expect(packSeesSystem()).toBe(fakeServer.system)
  })
})
