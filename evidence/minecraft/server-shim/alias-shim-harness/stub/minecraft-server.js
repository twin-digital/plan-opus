// What a consumer must supply to load a pack under test. @minecraft/server 2.8.0 ships no `main`,
// `exports` or `types` key, so importing a *value* from it fails with ERR_MODULE_NOT_FOUND before
// any test runs. This module is aliased over it in vitest.config.ts.
export * from './enums.generated.js'

// A pack that writes `attacker instanceof Player` needs `instanceof` to answer for a fake. The
// fakes are not instances of anything the pack imports, so the class is stood up as a brand check
// over the shape the library gives a player.
const brand = (member) => ({
  [Symbol.hasInstance]: (value) => typeof value === 'object' && value !== null && member in value,
})

export const Player = brand('onScreenDisplay')
export const Entity = brand('typeId')

// The module-scope singletons. Most packs reach the engine through these rather than through an
// injected parameter, so a test that wants to drive one has to put its fakes here first: they are
// live bindings, and the pack reads them at call time.
export let world
export let system

/** Points the singletons at a bundle from createServer(). */
export const __useServer = (server) => {
  world = server.world
  system = server.system
}
