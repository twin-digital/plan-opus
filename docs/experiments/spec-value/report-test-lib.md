# Experiment result — `minecraft/test-lib`

Agent's Phase 3 report, verbatim. Blind plan: `blind-test-lib.md`, written before opening `spec.md`
(1048 lines).

## 1. Proportions across A / B / C

Measured over substantive statements in the spec, not lines:

| bucket | share | what it is |
|---|---|---|
| **(A) changed my build** | **~10%** | 22 discrete items |
| **(B) confirmed my build** | **~60%** | restatement of decisions + facts, with citations, in prose order |
| **(C) surplus** | **~30%** | motivation, cost paragraphs echoing falsifiers, "why permissive", "why `implements` is the point", "why the table rots" |

The (B) mass is not filler in the trivial sense — it is the spec *assembling* 23 requirements, 34
decisions and ~40 facts into one ordered narrative. But it is, by construction, recoverable from the
foundations.

## 2. The (A) items, counted and graded

**22 items: 6 tier-one, 8 tier-two, 8 cosmetic.**

### Tier one — breaks the build (6)

| # | spec passage | what I would have shipped |
|---|---|---|
| **A1** | "A single number is `currentValue`, with `effectiveMin` 0 and `effectiveMax` equal to it… a two-element `[min, max]` gives those bounds with `currentValue` at `max`" (L390–396) | I chose: single number sets `currentValue` **only**; pair sets bounds **only**; everything else unset. So `addComponent(e, 'minecraft:health', 20)` — the single most common line in every test — would throw `UnsetValueError` on the next `setCurrentValue` bounds check. |
| **A2** | "Each registry is declared as a `class`, never an object literal: the bundle's registry properties are typed `typeof BiomeTypes`… whose static side carries `prototype`, which only a class declaration supplies" (L63–67) | I chose "plain objects on the bundle typed as `typeof MC.XTypes`". **That does not compile.** Builder stops cold. |
| **A3** | The three-part emission rule (L161–176): `typeId`/`id` own data properties; every other member on the prototype; prototype members `Object.defineProperties(…, enumerable: true)` | I explicitly **declined** to model entity enumeration and wrote a divergence coverage row for it. My build reads `Object.keys` 48 and `for-in` 2 where the engine reads 2 and 62. Retrofitting changes the generator's whole emission shape. |
| **A4** | `remove()` raises the `entityRemove` **before**-event first (entity still registered and valid, no `cancel`), then detach+invalidate **as one act**, then the after-event (L331–341) | I had after-event only. A pack subscribing to `beforeEvents.entityRemove` receives nothing. |
| **A5** | "`kill()` schedules the invalidation, and the corpse goes stale when the test advances to that tick, so `advanceTicks(server, 21)` after a `kill()` leaves the reference invalid" (L357–364) | I chose "the corpse stays valid indefinitely" and wrote a divergence row, reasoning from `r:scheduling-is-test-advanced` ("starts no timer"). I flagged this as a fork — but I chose wrong. |
| **A6** | On a health-less entity, `kill()` "invalidates it before raising `entityDie` — the handler therefore reads an invalid entity" (L351–356, L473–476) | I had the invalidation but never ordered it against the dispatch. A `entityDie` handler reading `entity.location` throws in the spec's build and works in mine. |

### Tier two — different but defensible (8)

**A7** the rule-4/rule-5 discriminator: "a member declared `T | undefined` has an absence the engine
itself can present… a member declared bare `T` has none" (L796–800), plus rule 3 outranking rule 4
(L806–809). I had the instinct but no mechanical test, so I decided ad hoc per member and got some
wrong (I gave `world.seed` `UnsetValueError` and computed a real `getDynamicPropertyTotalByteCount`;
the ladder makes both `NotImplementedError`).

**A8** `getDynamicPropertyTotalByteCount` throws — I implemented it, which is a fabrication.
**A9** `kill()` raises **no** before-event; exactly three before-events are ever fake-raised.
**A10** `tags` is all-of, `excludeTags` is any-of, fields intersect, `name` against an unsupplied
`nameTag` throws.
**A11** `damagingEntity`/`damagingProjectile` carried onto the `damageSource` of both `entityHurt` and
`entityDie`.
**A12** an entity created with no `dimension` registers with the world and appears in no dimension
listing.
**A13** tag storage is modelled at all — `d:modelled-surface-is-world-entity-effect` does not name
tags.
**A14** `emit(signal, payload)` takes the signal object; I chose `(server, name, payload)`.

### Cosmetic (8)

A15 the seven attribute ids (**mechanically derivable from `index.d.ts`** — my guess was wrong, a real
builder's wouldn't be); A16 arity message `Expected 2-3` when min≠max; A17 `triggerEvent`'s exact
message; A18 the four internal field names in the attribute plain-`Error` messages; A19
`minecraft:empty` has no shipped base; A20 `createPlayer`'s `name` optional; A21 the future-overload
rule; A22 `removeEffect`'s boolean.

**Note on A16/A17/A18:** these are engine message strings with **no fact backing them anywhere in the
pool**, and the spec cites nothing for them. Under `r:engine-claims-are-sourced` they arguably belong
in `facts/` regardless of this experiment.

## 3. Cheap foundation forms — only where cheap

**The tier-one six cost roughly 3 new entries and 2 amendments.** That is the headline.

- **A1 → amend `d:component-state-is-the-attribute-four`**, no new entry. Add one clause: *"the
  single-number shorthand sets currentValue with effectiveMin 0 and effectiveMax equal to it; the
  [min, max] shorthand sets those bounds with currentValue at max; both leave defaultValue unset."*
- **A4 → amend `d:remove-raises-only-entity-remove`**, no new entry. Widen to: *"remove raises the
  entityRemove before-event on the still-valid entity, then detaches and invalidates as one act, then
  raises the after-event, and raises nothing else."*
- **A9 → amend `d:every-signal-exists-few-are-raised`**, no new entry — it already enumerates the
  after-events; naming the three before-events is one clause.
- **A2 → one new fact** (it is a claim about TypeScript, not a choice): *"a value typed `typeof C` for
  a declared class must carry `prototype`, so an object literal is not assignable there; only a class
  declaration satisfies it."*
- **A3 → one new decision:** *"a fake entity's own enumerable properties are typeId and id and every
  other declared member is an enumerable prototype member, so Object.keys, spread and JSON.stringify
  read the engine's two while for-in walks its 62."* Falsifiers are obvious (enumerable prototype
  methods break tooling that walks with for-in expecting data).
- **A5 + A6 → one new decision covering both branches:** *"kill() invalidates a health-less entity
  before raising entityDie, and schedules a health-bearing entity's corpse to go invalid 21 ticks
  later, reached only by advancing."*
- **A7 → one new decision, and it is the highest-leverage one available:** *"a member's answer to an
  empty read is settled by arity, then the validity guard, then scope, then the declaration's own
  type: `T | undefined` returns undefined, bare `T` throws UnsetValueError."* One entry that governs
  ~1010 members and absorbs A8 and three cosmetic items outright.

**Beyond that it gets expensive and I will not enumerate it.** A10–A14 share no shape — five details,
five entries, each one a paragraph of carve-out that reads as a decision wearing the wrong hat. The
eight cosmetic items are transcription (message strings, derivable literals) and belong in facts or in
generated data, never in a reviewable decision set. My honest read: **capturing the full (A) payload as
foundations costs 15–18 entries; capturing only what breaks the build costs 4 new entries and 3
amendments.**

## 4. Genuinely inexpressible as foundations

Only two things, and **neither is reasoning — both are deliverables**:

1. **The 65-row coverage table** (L828–891). `r:coverage-is-enumerated` *requires* this artifact to
   exist and to reach the user. It cannot be foundations: as entries it would be 65 of them, and most
   rows only point at a decision or fact that already exists. It is a shipped product surface that
   happens to live in the spec. (It does smuggle in ~5 rulings not in any decision —
   `damage-invulnerability-window`, `add-effect-nan-and-infinity`, `effect-display-name-locale`,
   `dynamic-property-byte-count`, `run-job` — but those are cheap amendments, not the table's
   justification.)
2. **The `components:` block** (L924–1047) — 14 components with responsibility, excludes and `after`
   ordering. A work breakdown. Foundations have no shape that holds this, and it is the artifact a
   builder actually sequences from.

Everything else that changed my build could have been a requirement, decision or fact. **The spec's
non-deliverable contribution is not inexpressible — it is a precedence ordering.** Foundations are an
unordered set; the five-rule ladder (arity → guard → scope → absence → unset) is precisely the thing
that cannot be read off 34 independent decisions, and it is the single passage that most changed my
build. But it compresses to one entry.

## 5. My Phase-1 `[BLOCKED]` list vs. the spec

| blocked | resolved? |
|---|---|
| the seven attribute ids | **Yes** — named. (Also derivable, so not real risk.) |
| `InvalidEntityError`'s message string | **No.** Spec pins `name`, `id`, `type` and stops. Still open. |
| `world.gameRules` | **Yes, generically** — rule 3 makes it `NotImplementedError`. Never named. |
| corpse invalidation at 21 ticks | **Yes — against my choice.** |
| control-plane function names | **Yes** — the table. 10 of my 12 invented names matched; `emit`'s signature differs. |
| `Player`'s modelled surface | **Partly** — `createPlayer`, `name`, `sendMessage`, `onScreenDisplay`; the player client surface is out of scope. |
| output log per-target or interleaved | **Yes** — per-target. My inference from the falsifier was right. |
| where the coverage table reaches users | **Yes** — the package's own user-facing docs, owned by `package-and-exports`. |

## 6. The decisive number

**With `spec.md` deleted and foundations exactly as they stand: ~20% of the enumerated build is at
risk, and ~11% is tier-one.**

Mapped onto the coverage table's 65 rows as the build's own enumeration: 7 rows are tier-one wrong or
blocked (`entity-remove-cascade`, `corpse-invalidation-after-kill`, `kill-invalidation-without-health`,
`own-enumerable-properties`, `for-in-enumeration`, `out-of-scope-surfaces` via the registry typing,
`attribute-shaped-components` via the shorthand), ~6 more are tier-two, ~6 cosmetic. The other ~46 rows
I derived correctly from foundations alone.

## 7. Verdict

A competent builder working from foundations alone would have shipped roughly 80% of this library
correctly and would have gotten one thing that does not compile, one generator shape that is expensive
to retrofit, and four behaviours a pack could observe as wrong — a real but bounded failure,
concentrated in six items that fold into about four new foundation entries and three amendments to
existing ones. So the spec is *not* carrying its 1048 lines on the strength of what it changes: its
unique contribution is a precedence ordering that compresses to one decision, plus two deliverables
(the coverage table and the component breakdown) that are products rather than reasoning — and if those
two moved to their own artifacts, the remaining spec would be earning its place on about ten percent of
the build.
