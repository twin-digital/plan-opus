---
tags:
  - tooling
  - design-validator
---

# Validator rules under-cite the decisions they enforce

A finding prints as `✖ [<rule>] <path>: <message> (<claims>)`, and several rules name only
the requirement or the originating decision — not the later decisions that refined them.

Found while assembling the `015-1` record: six claims looked test-only because the finding a
reader greps for does not name them.

- `preset-adopt-and-drop` implements `d-a8hiceqo`, cites only `d-k48jh86c`
- `citation-fact-retired` omits `d-08yrcfd7`
- `schema-versions-dense` omits `d-is1lgu15`
- `id-format` / `id-unique` omit `d-el21jvd0`
- `preset-conflict` omits `d-wb0qq8wv`
- `pool-version-immutable` omits `d-emngkw5c`

No foundation in force requires a finding's `claims` to be exhaustive, so this is an
improvement rather than a defect — which is why it was not folded into the 013/014 build.
The fix is one line per rule. Whoever takes it should sweep the whole rule table rather than
just these six, since the pattern is systematic.
