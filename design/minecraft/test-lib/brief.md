# @twin-digital/minecraft-test-lib: Design Brief

`@twin-digital/minecraft-test-lib` is a test double library for Minecraft Bedrock behavior packs, providing in-memory fakes of the `@minecraft/server` object model (entities, components, worlds, and events) that behave rather than merely record — so tests assert on resulting state (health.currentValue === 20) instead of on which methods were called. 

It exists because `@minecraft/server` ships types with no runtime JS, leaving pack authors to hand-roll brittle per-test doubles that can't express real conditions like an absent component or an entity that has unloaded mid-event. The library should faithfully mirror the real API's observable behavior — including its quirks, such as invalidated entities throwing on member access and namespace-optional ids — while requiring no test framework of its own, so fakes work identically under any runner.
