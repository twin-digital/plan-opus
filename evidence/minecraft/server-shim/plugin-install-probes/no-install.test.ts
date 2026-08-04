// The control for probe 1: the same pack and the same imports, with neither an alias nor a mock.
import { expect, it } from 'vitest'

import './marron-town-mod/src/main'
import { world } from '@minecraft/server'

it('never runs — the suite cannot resolve @minecraft/server', () => {
  expect(world).toBeDefined()
})
