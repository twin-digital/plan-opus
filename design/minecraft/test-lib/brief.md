# @twin-digital/minecraft-test-lib: Design Brief

`@twin-digital/minecraft-test-lib` is a test double library for Minecraft Bedrock behavior packs, providing in-memory fakes of the `@minecraft/server` object model — entities, components, worlds, events, `system` scheduling, and the state a pack persists (dynamic properties and scoreboards) — that behave rather than merely record — so tests assert on resulting state (health.currentValue === 20) instead of on which methods were called. 

It exists because `@minecraft/server` ships types with no runtime JS, leaving pack authors to hand-roll brittle per-test doubles that can't express real conditions like an absent component or an entity that has gone invalid mid-event. Worse, a hand-rolled double that returns a plausible-looking payload lets a handler take the wrong branch while the test still passes.

Where the library models a behaviour, it models what the engine actually does — the quirks included, such as invalidated entities throwing on member access — rather than a convenient approximation. It does not owe a reproduction of every engine behaviour; which ones it models is a scope decision. Where following the engine exactly would cost more than it is worth, it simplifies deliberately and says so — what it never does is present a simplification as the engine's. It requires no test framework of its own, so fakes work identically under any runner.

Items, blocks, and containers are out of scope for this cycle, despite the share of packs that touch them; a later cycle may take them up.
