# Retired facts: why

Four facts in `../facts.yaml` carry `status: retired`, `reason: superseded`. The schema has one
retirement label, so this file records which were merely *superseded* (the successor subsumes
them; the old claim was never wrong) and which were *disproved* (a later engine run contradicted
them). Each justification is checked against the committed artifacts named below.

## invalidation-throws-non-uniformly → invalidation-guard-list-complete

**Disproved in part.** Claimed: "`id`, `typeId`, `isValid`, and `nameTag` stay readable" on an
invalid entity.

`nameTag` throws. `mctest-engine-probe-results.md` line 122
(`invalidation-nonuniformity-in-engine`) and line 230 (deep run,
`invalidation-guard-enumeration`) both read
`nameTag threw name=InvalidEntityError ctor=InvalidEntityError instanceofInvalidEntityError=true`.
The successor names the four members that do stay readable — `id`, `isValid`, `typeId`,
`scoreboardIdentity`.

The claim came from the declarations, not from a run: `type-probes/throws-annotation-probe.out.txt`
lists six Entity members under `no @throws` — `id, isSneaking, isValid, nameTag,
scoreboardIdentity, typeId` — and the fact read absence of an annotation as absence of a guard.
Its documented source (Microsoft Learn) covers only `id`, `typeId`, and `isValid`, all of which
survive.

Its component half — `Component.isValid` and `typeId` readable while `EntityComponent.entity`
throws — is correct and is carried by `attribute-guard-classes-observed`, not by the successor
named in `superseded_by`, which is entity-only. Results lines 103, 104, 107.

## invalidation-throws-are-mechanically-derivable → invalidation-guard-list-complete

**Disproved.** Claimed the guard list "is mechanically derivable from the declarations ... so no
Entity member is ambiguous."

The two members with no annotation and no readability, `nameTag` and `isSneaking`, break the
derivation: results lines 122–123 and 224, 230, all `InvalidEntityError`. Annotations under-report
the guard, so the declarations cannot yield the list.

The fact's declaration-level counts are accurate and are not what failed —
`throws-annotation-probe.out.txt` confirms 56 Entity members naming InvalidEntityError, 6 with no
`@throws`, and the coarser attribute classes (`setCurrentValue` annotated, 7 value getters and
resets carrying a generic `@throws`). What was wrong was the inference from those counts to the
engine's behaviour.

## invalidation-guards-observed → invalidation-guard-list-complete

**Superseded.** Nothing in it is contradicted; the deep run enumerates the whole property and
zero-argument-getter surface where the first run sampled it, and every sampled member agrees
(`id`/`typeId`/`isValid` ok, `scoreboardIdentity` undefined, `nameTag`/`isSneaking`/`location`
throwing — results lines 119–127 against 217–242).

One residual: the first run also probed the argument-taking `hasTag` and `getComponent` (lines
125–126, both throwing), which the deep enumeration does not reach. The successor does not carry
those two observations. The design's default-throw rule for members outside the enumeration covers
them, so nothing rests on the gap.

## effect-readd-not-unconditional → effect-replacement-rule-observed

**Superseded.** Claimed a lower re-add does not take, and that "the full replacement rule ... is
unmeasured."

The single observation holds and is now one cell of a measured matrix. First run, results line 97:
staging `speed` amp2/dur600 then re-adding amp0/dur100 read back `duration=599 amplifier=2`. Deep
run, `effect-replacement-matrix` (lines 211–216) over a base of amp1/dur300: higher amplifier
replaces at either duration, same amplifier replaces only on a longer duration, lower amplifier
never replaces — the old case, generalized. The successor's rule contradicts nothing in it; only
the "unmeasured" remark has expired.
