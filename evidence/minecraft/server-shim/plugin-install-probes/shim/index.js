// The aliased root entry: the generated enum values, the classes a pack imports as values, and the
// two live bindings. `enums.generated.js` is `alias-shim-harness/stub/enums.generated.js`
// unchanged — 64 enums generated from the pinned @minecraft/server 2.8.0 declarations.
export * from './enums.generated.js'
export { world, system } from './state.js'

const brand = (member) => ({
  [Symbol.hasInstance]: (value) => typeof value === 'object' && value !== null && member in value,
})

export const Player = brand('onScreenDisplay')
export const Entity = brand('typeId')

export class ItemStack {
  constructor(typeId, amount = 1) {
    this.typeId = typeId
    this.amount = amount
  }
}
