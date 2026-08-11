# A pre-worldLoad phase for the fakes

The engine refuses certain calls before `worldLoad` (early-execution: lookups throw a
ReferenceError-shaped refusal), and the fakes have no counterpart phase — test-lib answers
whenever. Consequence in mc-rpg-core 002: the library's definitions-check behavior states an
early-execution case ("the engine refuses the lookup, and the call fails on that refusal rather
than on this product's error", d-xobjyw2e) that has no code-test route; it rides on attestation
plus an in-world run.

Wanted: a mode where a created server is "not yet loaded" — lookups refuse the way the engine
does, `worldLoad` fires on demand — so consumer tests can exercise the before/after boundary.
