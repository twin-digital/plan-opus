// Compiles against the *emitted* declaration in emit/dist/lib.d.ts, which is what a consumer of
// the published package would see.
import type { Entity } from '@minecraft/server'
import { FakeEntity, createEntity } from './dist/lib.js'

const fromFactory: Entity = createEntity('minecraft:sheep')
const fromClass: Entity = new FakeEntity('minecraft:sheep')
const _tags: string[] = fromFactory.getTags()
// @ts-expect-error a typo is still an error through the emitted declaration
fromClass.getTagz()

export { fromFactory, fromClass, _tags }
