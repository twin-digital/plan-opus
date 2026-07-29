# Experiment result — `minecraft/dev-kit`

Agent's Phase 3 report, verbatim. Blind plan: `blind-dev-kit.md`, written before opening `spec.md`.
Phase 1 inputs: `brief.md`, 21 bound requirements, all 31 decisions, and the facts in
`facts/minecraft/packs.yml`, `facts/minecraft/pack-format.yml`, `facts/package-manager-workspaces.yml`.

## 1. Proportions

By substantive statement, roughly **A ≈ 15%, B ≈ 55%, C ≈ 30%**. By word count C is larger (~40%) —
the spec spends a lot of prose deriving its own type declarations from the rules and re-arguing facts
already cited.

**20 (A) items. Three are tier one.**

The single most useful structural finding: the blind plan and the spec agree on *the entire pipeline* —
five stages in the same order, the same membership test, the same completion rules, the same set-wide
fixpoint, the same filter-after-build. Every disagreement is local. Nothing in the spec reorganised
the build.

## 2. The (A) items, graded

### Tier 1 — a builder ships something wrong

**A1. pnpm with no `packages` field: forward the absence unread.**

> "a `pnpm-workspace.yaml` carrying no `packages` field forwards no patterns, which leaves the library
> on its own defaults and yields the root plus every nested package in the tree outside
> `node_modules` … it passes the absent field on rather than substituting a pattern of its own"

I chose the opposite, explicitly and with reasoning: pass `patterns: []` so only the root is a
candidate, because `f:pnpm-workspace-packages-is-an-include-exclude-glob-list` quotes pnpm's docs
saying "If the packages field is omitted, only the root package is included". I read the documented
semantics as governing and the tested sweep as a library quirk to neutralise. The spec reads the
delegation requirement as governing. My build silently finds no packs in a loosely-defined pnpm
workspace. This is the sharpest divergence in the experiment, and both readings are defensible from
the foundations — which is exactly why it needed writing down.

*Foundation form — a decision, one entry, cheap:*

```yaml
- id: an-unpatterned-pnpm-workspace-forwards-the-absence
  statement: |
    a `pnpm-workspace.yaml` with no `packages` field forwards no patterns to
    `findWorkspacePackages`, leaving the library on its own defaults; the kit substitutes no
    pattern of its own, so such a workspace enumerates as a whole-tree sweep outside
    `node_modules`.
  status: accepted
  falsifiers:
    - a real workspace defines no `packages` field and the sweep returns packages the manager
      itself would not count members
```

*Why it apparently wasn't:* it looks like a restatement of
`r:enumeration-uses-the-managers-own-libraries`, but that requirement fixes *who enumerates*, not
*what is passed*. The gap is invisible until you sit down to write the call.

**A2/A3. Absence is never a form fault — and `external-dependency-version-missing` exists.**

> "Absence is not a form fault: a field the source omits is the business of the completion and
> validation rules below"

and

> "A `module_name` entry names a built-in scripting module … a missing version is
> `external-dependency-version-missing`"

I got this wrong twice over. My plan declared `ManifestDependency.version` required and then reasoned
"a versionless `module_name` entry is `manifest-shape-invalid` at `dependencies.N.version`, since
`version` is a declared required field" — I explicitly marked that `[CHOSE]` and chose badly. The
spec's rule is that `PackManifest` describes what a *valid* entry guarantees, not what a source file
must hold, so required-ness in the type never implies a shape fault on absence. Same trap sits behind
`header.uuid` (→ `manifest-missing-uuid`) and `modules[].type` (→ `module-missing-type`), where I
happened to get the right answer for the wrong reason.

*Foundation form — one decision absorbs the rule; the code is a separate matter (see A7):*

```yaml
- id: absence-is-never-a-form-fault
  statement: |
    the form pass tests only fields the source wrote. `PackManifest` states what a valid entry
    guarantees, not what a source manifest must hold, so a field the type declares required but
    the source omits is the business of a named completion or validation rule, never
    `manifest-shape-invalid`.
  status: accepted
  falsifiers:
    - a declared required field is found whose absence no named rule reports, so it reaches a
      consumer missing under a type that promises it
```

*Why it apparently wasn't:* it is the reconciliation of `r:manifest-fields-are-validated-by-form` with
`r:unresolvable-packs-fail-loudly`, and each requirement reads complete on its own. The collision only
appears when you write the type.

**A4. The `format_version` 3 check reads only the two version fields completion touches.**

> "The check reads exactly the two version fields completion touches — `header.version` and each
> `dependencies[].version` — and never a module's `version`, which the form pass checks and no
> completion writes."

My plan did not scope the check. `r:kit-completes-partial-source-manifests` says flatly "A source
manifest carrying an array version at `format_version` 3 is an error", and `modules[].version` is a
version I declared. I would have applied it to module versions and reported problems against packs
Minecraft loads happily — a false-positive invalidation, the exact failure
`f:module-type-enumerations-disagree` exists to prevent, arrived at by a different route.

*Foundation form — a decision, one entry:*

```yaml
- id: the-format-version-3-restriction-reads-only-completed-versions
  statement: |
    `array-version-at-format-version-3` is raised only against `header.version` and each
    `dependencies[].version` — the fields completion writes. A module's `version` is form-checked
    and never restricted by the format version.
  status: tolerated
  falsifiers:
    - a `format_version` 3 pack with an array module version is refused by the server, so the
      unrestricted module version was the wrong call
```

*Why it apparently wasn't:* the requirement's sentence generalises over "a version" and reads
unambiguous until you enumerate the fields you declared.

### Tier 2 — a competent builder makes another defensible choice

| # | spec's answer | mine | note |
|---|---|---|---|
| A5 | the dependency discriminator (`uuid` xor `module_name`) is read **before** the form pass; a malformed entry's fields are not form-checked | discriminator checked after form validation | changes problem *count* on a doubly-broken entry, nothing else |
| A6 | `kind-not-corroborated` and `foreign-kind-module` are **two** codes | one `pack-kind-mismatch` | closed public union, so consumer switches differ |
| A8 | per-code payloads: `error`, `field`, `packageDir`, `value`, `uuid`, `moduleName`, `claimants: string[]` | flat `{code, message, field?}`, claimants in prose | the sharpest bit is `packageDir` on the package-version problems meaning **the depended-on pack's** package when completing a dependency — I would not have derived that |
| A10 | invalid entry's `manifest` is `unknown` | `manifest?: PackManifest` | mine is unsound; the spec's reasoning (lines 169-174) is correct and I missed it |
| A11 | valid entry's `uuid` is **lowercased** on the entry | lowercased only for comparison | `r:uuids-compare-case-insensitively` says "before every comparison", which does not obviously reach the reported field |
| A13 | `package-name-missing` fires **even when `productName` completes the name**, and `header.name` falls back to the directory basename | problem raised, no basename fallback for `header.name` | mine leaves `header.name` unwritten on a nameless root package |
| A14 | candidate set deduplicated by workspace-relative path | no dedup | bites only where the root is reached twice |
| A15 | container pass checks array **elements are objects**, and containers only "where present" | containers checked, elements not | mine passes a `modules: [42]` through to the form pass |
| A16 | `readWorkspaceManifest` from **`@pnpm/workspace.read-manifest`** reads the yaml | hand-parse with the `yaml` package | a third upstream package I did not know existed; mine works but re-implements what pnpm publishes |
| A17 | `PackManifest` declares only fields the design names | I also declared `description`, `min_engine_version`, `entry`, `metadata` | under `r:manifest-fields-are-validated-by-form` every extra declaration obliges an extra validation row, so my over-declaring *over-validates* — a genuinely counterintuitive consequence |

### Tier 3 — cosmetic

A7 (five code names differ: `version-form-invalid`→`array-version-at-format-version-3`,
`pack-identity-missing`→`manifest-missing-uuid`, `module-type-missing`→`module-missing-type`,
`uuid-duplicated`→`duplicate-uuid`), A9 (`field` uses bracketed indices `dependencies[2].version`, root
is `''`), A12 (`PackCriteria.package` not `packageName` — note the asymmetry with the entry's
`packageName`), A18 (`modules` a non-empty tuple, `format_version` optional), A19
(`readonly PackEntry[]`), A20 (the five-component decomposition vs. my thirteen files).

## 3. Genuinely inexpressible as foundations

**Almost none — but with one real qualification.**

Every tier-one item folds into a single ordinary decision, and I have written all three above. The
tier-two items fold into about five more: one for the dependency discriminator's position, one for the
manifest-type policy (absorbing A10, A17, A18), one for the pnpm read path (absorbing A16 into A1's
decision), one for the nameless-package fallback (A13), one for the container pass's element check plus
dedup (A15, A14). Call it **eight new decisions to absorb all of tier one and most of tier two.** That
is a cheap answer, not a forty-entry answer.

The qualification is **A7/A8, the 18-code union with its per-code payload fields.** This is expressible
as *one* decision — but only as a decision whose `statement` is a twenty-line code table. That is spec
content wearing a decision hat: it does not read as a choice with a falsifier, it reads as an interface
declaration. Splitting it into 18 decisions is the unreviewable outcome you told me to avoid. So the
honest finding is: the code set is not *inexpressible*, it is **mis-shaped** for a foundation entry. It
is the one place where the spec's format is doing work no foundation format does well.

Two smaller things in the same category: the **form-pass table** (10 rows) and the **suppression
table** (10 rows). I classified both (B) — I derived the principle behind each from
`r:manifest-fields-are-validated-by-form` and `d:a-form-fault-suppresses-the-checks-that-read-it`, and
would have implemented them. But the *tables* are what make them auditable, and neither would survive
as a decision statement without the same shape problem.

Nothing else. No motivation, no argument, no context in the spec changed a single build choice.

## 4. Phase 1 `[BLOCKED]` list — resolution

| # | blocked on | resolved? |
|---|---|---|
| 1 | the ten problem codes I invented | yes — **11 of 18 exact matches**, 5 renamed, 1 (`external-dependency-version-missing`) missing entirely, 1 of mine split into two |
| 2 | `Problem` field shape | yes — per-code payloads; I was wrong to go flat |
| 3 | `problems` on a valid entry | yes — **I was right** (`problems: []`) |
| 4 | `PackKind` spelling | yes — **I was right** (`'behavior' \| 'resource'`) |
| 5 | `status`/`problems` names | yes — **I was right** |
| 6 | pnpm absent-`packages` | yes — **I was wrong** (tier one) |
| 7 | versionless `module_name` dependency | yes — **I was wrong** (tier one) |
| 8 | repo location, tsconfig, build tool, test framework, `exports` map | **NO — the spec says nothing** |
| 9 | is the export named `discoverPacks` | yes — **I was right** |

## 5. On build-tooling specifics, which you asked me to test hard

The result cuts against the hypothesis. **This spec carries no build-tooling detail at all** — no path
inside the kit's own repo, no generated file, no config schema, no command name, no `package.json`
fields beyond the package name (which is already `r:dev-kit-library-name`). Item 8 above stayed blocked
after reading it. Partly that is the target: the kit is a pure library that reads a workspace and
returns data, so the "generated file contents / config keys / CLI flags" class barely exists here.

What the spec *does* carry in that neighbourhood is two upstream package names and their call shapes —
`readWorkspaceManifest(workspaceRoot)`, `findWorkspacePackages(root, { patterns })`,
`mapWorkspaces({ cwd, pkg })`. I graded that tier two, not tier one: a builder handed the requirement
to use the managers' own libraries finds those signatures from the packages' own docs in minutes. The
one bit that is not findable is A1, and A1 is a *policy* about what to pass, not a fact about the API.

So the exact-literal payload of this spec is almost entirely **API surface** — type declarations, code
strings, dotted field paths. That is precisely the class that fits a decision table, which is why the
answer lands where it does.

## 6. The decisive number

**With `spec.md` deleted and the foundations exactly as they stand, roughly 5% of the *behaviour* is at
tier-one risk** — one enumeration branch (pnpm with no `packages`), one validation-philosophy rule and
the single code it requires, and the scope of one version-form check. Everything else in the pipeline
reconstructs.

**About 20-25% of the *public surface* diverges at tier two or three** — mostly code strings, payload
fields, and type-declaration choices. None of it changes what the library does; all of it changes what
a second consumer compiles against.

## 7. Verdict

A competent builder working from foundations alone would have shipped a kit with the right
architecture, the right pipeline, and the right semantics almost everywhere — but with three
behavioural faults, one of which (the pnpm sweep) silently returns an empty pack set for a real
workspace shape, and a public problem-code union that no second consumer could have compiled against.
Eight new decisions would close every behavioural gap cheaply; the one thing that genuinely resists the
foundation format is the 18-code union with its payloads, which is expressible only as a table
pretending to be a decision — so on this design the spec earns its place narrowly, and mostly for the
interface declaration rather than the prose around it.
