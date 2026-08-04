# Carry-forward: the probe-cycle rulings awaiting the owner

Working material for this increment's review. The four entries carry the re-rulings drafted on
`spec/test-lib-subscribe-and-handler-writes` against the legacy design, translated to the
converted ids, and enter `proposed` for the owner's ratification — the increment is deliberately
mid-Plan until the owner rules.

## What each entry replaces

| new entry | supersedes | what changes |
|---|---|---|
| d-b9j2z2ks (both arity bounds) | d-nw4v0fag (001) | the accepted ruling checked only the minimum and let surplus arguments through because the engine's response was unobserved; the probe observed it, and every one of 18 members rejects surplus arguments with the same single TypeError message shape, so generated members now check both bounds |
| d-z49lg2ft (subscribe options filter) | d-41hmcpd4 (002) | the shipped package throws NotImplementedError on any options argument and raised the design ruling as plan-opus#119; the probe fixed the engine's semantics — fields intersect, `entities` is an instance filter, `entityTypes` matches the subject entity's prefixed id only — so options now filter on the five raised signals and throw only on unobserved fields and unraised signals |
| d-n1au8e2s (expiry boundary) | d-94hinqww (001) | the expiry rule was stated as the library's own because the engine's boundary was unobserved; the probe measured it at exactly that boundary — last readable duration is 1, 0 never readable — so the rule is re-stated as the engine's, with falsifiers about the measurement's reach replacing the waiting-for-a-probe one |
| d-7wwr2xtp (duration write follows the engine) | d-ka348xdn (001) | the honoured-writes ruling said nothing about how a handler-written duration is validated; the probe showed the field write takes a different validation path from addEffect's own argument — truncate toward zero, no effect at or below zero, clamp at 20000000, TypeError on NaN/Infinity — and the entry carries the field-writes framing with that path spelled out |

## The evidence

All four rest on the mctest8 sets — arity, expiry, handlerwrite and filters — recorded as
`arity-expiry-and-filter-probe-run` in `evidence/minecraft/script-api.yml`, with the pack and its
raw logs under `evidence/minecraft/test-lib/`. The pack was run by the owner on 2026-07-29
against Bedrock dedicated 1.26.31.1 with `@minecraft/server` 2.8.0; each set ran three times,
byte-identical once timestamps and entity ids are normalised, with every validity gate passing.
The five facts the entries cite (`surplus-arguments-are-rejected`,
`effect-expiry-boundary-observed`, `handler-written-effect-duration-is-validated-separately`,
`subscribe-filter-fields-intersect`, `subscribe-filter-entity-types-requires-the-prefix`) are
harvested from those runs.

## Numbering

This increment landed as 003; the shim-facet draft renumbers to 004 at its merge.
