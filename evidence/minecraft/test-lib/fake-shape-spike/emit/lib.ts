// Spike: does the merged interface/class survive declaration emit? The package ships .d.ts, so
// what a consumer sees is this file's emitted declaration, not this file.
import type { Entity } from '@minecraft/server'

export interface FakeEntity extends Entity {}
export class FakeEntity {
  readonly typeId: string
  constructor(typeId: string) {
    this.typeId = typeId
  }
  kill(): boolean {
    return true
  }
}

export function createEntity(typeId: string): Entity {
  return new FakeEntity(typeId)
}
