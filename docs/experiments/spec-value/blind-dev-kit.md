# Blind build plan — `@twin-digital/mc-dev-kit`

Derived only from: brief.md, requirements (design + area + global), decisions.yaml (all 31),
and the cited/related facts (`facts/minecraft/packs.yml`, `facts/minecraft/pack-format.yml`,
`facts/package-manager-workspaces.yml`). `spec.md` NOT read.

Reading convention used throughout: an `accepted`/`tolerated` decision is the behaviour; a
`rejected` decision is a choice turned down, so the built behaviour is its complement.

---

## 0. Package shape

- npm name `@twin-digital/mc-dev-kit` (`r:dev-kit-library-name`).
- ESM-only, TypeScript source, ships its own `.d.ts`, targets active Node LTS
  (`r:node-libraries-are-esm-typescript`).
- `[CHOSE]` `"type": "module"`, single `exports` entry `"."` → `./dist/index.js` +
  `"types": "./dist/index.d.ts"`. No subpath exports; the whole surface is one module.
- `[CHOSE]` build with `tsc` alone (`module: nodenext`, `target: es2023`, `declaration: true`,
  `outDir: dist`). No bundler — a library consumed inside the same monorepo does not need one.
- `[CHOSE]` tests with `node:test` + `node:assert` over fixture workspaces committed under
  `test/fixtures/`, mirroring the fixture style already used by the probes in
  `design/minecraft/dev-kit/artifacts/`.
- Runtime dependencies: `@npmcli/map-workspaces` (^6.0.0), `@pnpm/workspace.find-packages`
  (^1000.0.65) — pinned by name from `f:manager-enumeration-libraries-need-no-install` and
  `r:enumeration-uses-the-managers-own-libraries` — plus `[CHOSE]` `yaml` for parsing
  `pnpm-workspace.yaml`.
- `[BLOCKED]` where this package lives in the monorepo (`packages/mc-dev-kit`?), and whether the
  repo's shared tsconfig/eslint/release tooling must be inherited. Would ask the owner. Assuming
  `packages/mc-dev-kit`.

## 1. Modules

| module | responsibility |
| --- | --- |
| `src/index.ts` | public exports only: `discoverPacks` and every exported type |
| `src/discover.ts` | orchestration: enumerate → find packs → per-pack validate/complete → set-wide pass → filter |
| `src/workspace/detect.ts` | choose the manager from the root marker files |
| `src/workspace/enumerate.ts` | call the manager's own library, normalise to `CandidatePackage[]` |
| `src/packs/membership.ts` | the fixed-path source-manifest membership test |
| `src/manifest/read.ts` | read + JSON.parse a source manifest |
| `src/manifest/shape.ts` | container-shape and field-form validation |
| `src/manifest/complete.ts` | fill `header.name`, `header.version`, in-workspace dependency versions |
| `src/manifest/corroborate.ts` | directory kind vs. module types |
| `src/set/resolve.ts` | uuid uniqueness, dependency satisfaction, invalidity fixpoint |
| `src/filter.ts` | the `PackFilter` predicate |
| `src/paths.ts` | POSIX-relative path normalisation |
| `src/problems.ts` | the closed `ProblemCode` union and problem constructors |
| `src/types.ts` | `PackEntry`, `PackManifest`, `DiscoverOptions`, … |

## 2. Public interface

```ts
export type PackKind = 'behavior' | 'resource'          // [CHOSE] short form, from the brief's
                                                        // illustrative `kind: 'behavior'`
export type EntryStatus = 'valid' | 'invalid'

export interface DiscoverOptions {
  /** Workspace root. Defaults to process.cwd(). */
  workspace?: string                    // optional: d:the-workspace-option-is-required is REJECTED
  filter?: PackFilter                   // d:filtering-is-a-parameter-of-the-discovery-call
}

export interface PackFilter {
  packageName?: string                  // npm package name, exact
  name?: string                         // completed header.name, exact
  uuid?: string                         // header uuid, compared lowercased
  status?: EntryStatus
}

export interface ValidPackEntry {
  status: 'valid'
  kind: PackKind
  packageName: string
  packageDir: string
  sourceDir: string
  outputDir: string
  uuid: string
  version: string
  manifest: PackManifest
  problems: []                          // [CHOSE] always present, empty on a valid entry
}

export interface InvalidPackEntry {
  status: 'invalid'
  kind: PackKind
  packageName: string
  packageDir: string
  sourceDir: string
  outputDir: string
  uuid?: string
  version?: string
  manifest?: PackManifest
  problems: [Problem, ...Problem[]]     // never empty
}

export type PackEntry = ValidPackEntry | InvalidPackEntry

export declare function discoverPacks(options?: DiscoverOptions): Promise<PackEntry[]>
```

`[CHOSE]` discriminated union rather than one optional-heavy interface — `r:pack-discovery` says a
consumer reads `status` before anything else, and
`d:invalid-entries-omit-only-manifest-derived-details` fixes exactly which fields may be absent, so
the union encodes the decision in the type.

### Manifest model

`d:the-completed-manifest-is-reported-as-a-plain-object` is **rejected**, so the manifest is a
declared TypeScript model, not `object`. `d:modules-uuid-and-version-are-unmodelled` is also
rejected, so modules declare `uuid` and `version`.

```ts
export type ManifestVersion = string | [number, number, number]

export interface ManifestHeader {
  uuid: string
  name: string                          // always present on a reported manifest (completed)
  version: string                       // completed → always the SemVer string form
  description?: string
  min_engine_version?: ManifestVersion
  [key: string]: unknown
}

export interface ManifestModule {
  type: string                          // required: r:manifest-corroborates-the-directory-kind
  uuid?: string
  version?: ManifestVersion
  description?: string
  entry?: string
  [key: string]: unknown
}

export interface ManifestDependency {
  uuid?: string
  module_name?: string
  version: ManifestVersion              // present on every reported dependency after completion
  [key: string]: unknown
}

export interface PackManifest {
  format_version: number | string
  header: ManifestHeader
  modules: ManifestModule[]
  dependencies?: ManifestDependency[]
  metadata?: Record<string, unknown>
  [key: string]: unknown
}
```

Index signatures everywhere so `r:manifest-format-version-passes-through` holds: unread fields
survive the round trip untouched. `r:manifest-fields-are-validated-by-form` then means every named
field above is form-checked at read time.

### Problems

`d:the-problem-code-set-is-closed` → a string-literal union, no free-form codes.

```ts
export interface Problem {
  code: ProblemCode
  message: string        // human-readable, names the offending value
  field?: string         // dotted path into the manifest, e.g. 'header.version', 'modules.1.type'
}
```

`[CHOSE]` the shape above. `d:manifest-shape-faults-are-one-problem` requires a `field`;
`d:field-type-faults-reuse-the-shape-code` requires the same `field` to name a scalar position.

Codes named directly by decisions:

| code | source |
| --- | --- |
| `manifest-unreadable` | `d:unreadable-and-unparseable-manifests-are-one-problem` |
| `manifest-shape-invalid` | `d:manifest-shape-faults-are-one-problem`, `d:field-type-faults-reuse-the-shape-code` |
| `package-name-missing` | `d:a-nameless-package-is-named-by-its-directory` |
| `dependency-entry-malformed` | `d:an-ambiguous-dependency-entry-is-a-problem` |
| `dependency-unsatisfied` | `d:an-unsatisfied-dependency-names-both-readings` |
| `dependency-invalid` | `d:invalidity-propagates-to-a-fixpoint` |

Codes the foundations require a fault for but never name — **all `[CHOSE]`, and the single largest
guessing surface in this plan**:

| code | fault |
| --- | --- |
| `pack-identity-missing` | no `header.uuid` (`r:pack-record-details`, `r:unresolvable-packs-fail-loudly`) |
| `uuid-duplicated` | a header uuid claimed by more than one pack (`r:uuids-are-claimed-once-in-a-workspace`) |
| `header-name-specified` | source manifest specifies a non-placeholder `header.name` |
| `header-version-specified` | source manifest specifies a non-placeholder `header.version` |
| `dependency-version-specified` | an in-workspace dependency entry specifies a `version` |
| `version-form-invalid` | array version at `format_version` 3 |
| `package-version-missing` | owning `package.json` declares no `version` |
| `package-version-invalid` | owning `package.json` `version` is not a version |
| `module-type-missing` | a module declares no `type` |
| `pack-kind-mismatch` | no corroborating module, or modules of both kinds |

`[BLOCKED]` — I have invented ten code strings. Nothing in the foundations fixes them, and they are
the public API surface consumers switch on (`d:the-problem-code-set-is-closed` makes them a
compatibility promise). I would ask the owner to ratify the names before shipping. I would also ask
whether `package-version-missing` and `package-version-invalid` should collapse into one code the way
read and parse collapse into `manifest-unreadable`.

`[BLOCKED]` `r:uuids-are-claimed-once-in-a-workspace` says "the error names the duplicated uuid and
every pack claiming it". A flat `{code, message, field}` can only do that in prose. I would either
put the claimants in the message string or add a structured field. **Choosing prose**: message reads
`uuid 5c…9f is claimed by packages/a/behavior_pack, packages/b/behavior_pack`.

## 3. Concrete values and literals

- Source manifest paths, relative to a candidate package: `behavior_pack/manifest.json`,
  `resource_pack/manifest.json` (`r:membership-from-source-manifest-presence`). Fixed; not
  configurable.
- Output root: `dist/` inside the package (`r:built-output-defaults-to-dist`).
- Output pack dir: `<packageDir>/dist/<behavior_pack|resource_pack>`
  (`r:built-output-mirrors-the-source-layout`) — the kind-named nesting happens even for a
  single-pack package.
- Directory names carry the kind, so `behavior_pack/` → `kind: 'behavior'`,
  `resource_pack/` → `kind: 'resource'`.
- Corroborating module types: `data` or `script` corroborate `behavior`; `resources` corroborates
  `resource`. Any other type is ignored entirely — neither corroborating nor a problem
  (`r:manifest-corroborates-the-directory-kind`, backed by `f:module-type-enumerations-disagree`).
- Manager markers: root `pnpm-workspace.yaml` → pnpm; otherwise npm via root `package.json`
  (`d:pnpm-marker-wins-npm-is-the-fallback`).
- Version placeholders that read as "unspecified": `""`, `"0.0.0"`, `[0, 0, 0]`
  (`r:kit-completes-partial-source-manifests`). `""` for `header.name` too
  (`d:empty-header-name-reads-as-unspecified`).
- `format_version` 3 restricts versions to string form; every other value (including a missing or
  unrecognised one) imposes no restriction (`d:only-format-version-3-restricts-version-form`).
- Scope stripping: `@scope/mc-pack-1` → `mc-pack-1`.
- Path spelling: POSIX separators, no `./` prefix, no trailing slash, root package's `packageDir`
  is `.` (`d:relative-paths-are-posix-with-the-root-as-a-dot`). So a root behavior pack reports
  `sourceDir: 'behavior_pack'`, `outputDir: 'dist/behavior_pack'` — the `.` is not concatenated.
- No CLI, no config file, no config keys. The kit is a library only
  (`r:dev-kit-provides-a-library`); every input is a `DiscoverOptions` field.

## 4. Behaviours

### 4.1 Enumerate candidate packages

1. Resolve `workspace` (default `process.cwd()`) to an absolute path.
2. If `<root>/pnpm-workspace.yaml` is readable → pnpm path. Else if `<root>/package.json` is
   readable → npm path. Else **throw**.
3. pnpm: parse the YAML, read `packages`, call `findWorkspacePackages(root, { patterns })`. The
   library returns the root project alongside members (`f:manager-enumeration-libraries-need-no-install`),
   satisfying `r:the-root-package-is-a-candidate` for free.
   - `[CHOSE]` when `packages` is absent or empty, pass `patterns: []` rather than forwarding
     `undefined`. `f:enumeration-sweeps-the-tree-outside-node-modules-under-pnpm-and-returns-nothing-under-npm`
     shows that forwarding `undefined` makes the library sweep the whole tree outside
     `node_modules`, which contradicts pnpm's own documented semantics
     (`f:pnpm-workspace-packages-is-an-include-exclude-glob-list`: "If the packages field is
     omitted, only the root package is included"). Honouring the documented semantics wins.
4. npm: `mapWorkspaces({ pkg: rootPackageJson, cwd: root })`. The library never returns the root
   (same fact), so the kit **prepends the root package itself** as a candidate to satisfy
   `r:the-root-package-is-a-candidate`. An absent or empty `workspaces` array yields an empty Map
   without throwing, so a single-package npm repo enumerates to the root alone.
5. No `node_modules` filtering of the kit's own — `d:node-modules-directories-are-never-candidates`
   is rejected, and the fact shows neither library returns a package under such a path.
6. Any throw from step 3/4 — an unparseable member `package.json`
   (`f:a-malformed-member-manifest-fails-the-whole-enumeration`), an unparseable workspace
   definition — **rejects the returned promise with the underlying error unwrapped**
   (`d:enumeration-failure-rejects-the-call`). Not caught, not wrapped, not reported as an entry.
   Consequently one broken member `package.json` anywhere fails the whole call, and
   `d:a-package-fault-invalidates-only-its-own-packs` being rejected confirms this is intended.

Each candidate yields `{ name, dir (absolute), packageJson }`. `packageJson` comes from whatever the
enumeration library already parsed where available, otherwise read by the kit.

### 4.2 Find packs

For every candidate, test the two fixed paths. Zero hits → **no entry at all**
(`d:a-package-with-no-source-manifest-yields-no-entry`). One or two hits → one entry each.
A package can hold at most one pack per kind, so at most two entries per package
(`r:membership-from-source-manifest-presence`).

A directory a workspace pattern matched but that holds no `package.json` is never a candidate, so a
pack inside it is **silently absent** from the list —
`d:a-pack-outside-any-workspace-package-is-reported-invalid` is rejected, so it is not reported as an
invalid entry. This is the brief's acknowledged hole in exhaustiveness, resolved as "skip".

`[CHOSE]` membership is `manifest.json` present and readable-as-a-file; an `ENOENT` on the fixed
path means non-member, any other read error means member-with-`manifest-unreadable`. (A directory in
the file's place counts as a member with `manifest-unreadable`.)

Entry ordering: candidate-package path ascending, `behavior` before `resource` within a package
(`d:entries-ordered-by-package-path`).

### 4.3 Per-pack read, validate, complete

Ordered, with `d:a-form-fault-suppresses-the-checks-that-read-it` in force at every step — a faulted
field reports its fault alone and every check or completion reading it is skipped.

1. **Read + parse.** Any failure → `manifest-unreadable` carrying the underlying message. Entry
   invalid; `uuid`, `version`, `manifest` all absent. Nothing else runs.
2. **Container shape.** Root not an object, `header` not an object, `modules` not an array,
   `dependencies` present but not an array → `manifest-shape-invalid` naming the field; the checks
   reading that container are skipped (`d:manifest-shape-faults-are-one-problem`).
3. **Field form.** Every declared field is form-checked
   (`r:manifest-fields-are-validated-by-form`): `header.uuid` string, `header.name` string,
   `header.version` string-or-`[n,n,n]`, `modules[i].type` string, `modules[i].uuid` string,
   `modules[i].version` version-form, `dependencies[i].uuid` string,
   `dependencies[i].module_name` string, `dependencies[i].version` version-form. A contradiction is
   `manifest-shape-invalid` at that dotted field (`d:field-type-faults-reuse-the-shape-code`).
   Form is tested, never value — no uuid regex beyond "is a string", no check of which format
   versions exist.
4. **Identity.** No `header.uuid` → `pack-identity-missing`; the entry stays invalid and reports no
   `uuid` or `manifest`, but keeps `kind`, `packageName`, `packageDir`, `sourceDir`, `outputDir`
   (`d:invalid-entries-omit-only-manifest-derived-details`).
5. **Partiality.** `header.name` present and not `""` → `header-name-specified`.
   `header.version` present and not a placeholder → `header-version-specified`.
   An array `header.version` (even `[0,0,0]`) at `format_version` 3 → `version-form-invalid`.
   A `dependencies` entry whose `uuid` names an in-workspace pack and that carries a
   non-placeholder `version` → `dependency-version-specified`.
6. **Corroboration.** A module with no `type` → `module-type-missing`. No module of the kind's
   corroborating types → `pack-kind-mismatch`. Any module of the *other* kind's types →
   `pack-kind-mismatch`. A `behavior` pack corroborates on `data` **or** `script`, so a
   script-only behavior pack is fine. Unknown types are ignored.
7. **Completion.**
   - `header.name` ← `package.json` `productName` when a non-empty string, else the scope-stripped
     package name (`d:product-name-must-be-a-non-empty-string`). A non-string or absent
     `productName` raises **no problem**.
   - `header.version` ← `package.json` `version`, written as a SemVer string, unconditionally —
     no branching on `format_version`, source form not consulted. Missing or not-a-version →
     `package-version-missing` / `package-version-invalid`.
   - Each `dependencies` entry whose lowercased `uuid` matches an in-workspace pack's header uuid
     gets `version` ← that pack's owning package's `package.json` version, same rules.
   - The owning `package.json` `dependencies` are never consulted.
   - A `package.json` with no string `name` → the package is reported under its directory's
     basename and every pack in it gets `package-name-missing`
     (`d:a-nameless-package-is-named-by-its-directory`).
8. **Dependency entry sanity.** An entry carrying both `uuid` and `module_name`, or neither →
   `dependency-entry-malformed` (`d:an-ambiguous-dependency-entry-is-a-problem`).

### 4.4 Set-wide pass

1. **Uuid uniqueness.** Group by lowercased header uuid (`r:uuids-compare-case-insensitively`).
   Any group of size > 1 → every member gets `uuid-duplicated`, naming the uuid and all claimants.
   No claimant preferred.
2. **Dependency satisfaction.** For each entry's dependencies:
   - `module_name` entry → external, never resolved, never completed, must carry its own `version`;
     absent version → `[CHOSE]` `dependency-unsatisfied`? No — it names a built-in module, which
     `r:unresolvable-packs-fail-loudly` says "is not a missing pack". `[CHOSE]` a versionless
     `module_name` entry is `manifest-shape-invalid` at `dependencies.N.version`, since `version` is
     a declared required field.
   - `uuid` entry matching an in-workspace pack → resolved and completed.
   - `uuid` entry matching nothing **and carrying a version** → external pass-through, no problem.
   - `uuid` entry matching nothing **and carrying no version** → `dependency-unsatisfied`, whose
     message names both readings: a wrong uuid, or a versionless external dependency
     (`d:an-unsatisfied-dependency-names-both-readings`).
3. **Invalidity propagation.** Repeat until no entry changes status: an entry depending by uuid on
   an invalid entry gets `dependency-invalid`. Transitive by construction. A dependency cycle among
   otherwise sound packs stays valid, because no entry in the cycle ever becomes invalid to seed the
   propagation (`d:invalidity-propagates-to-a-fixpoint`).
4. **Entry projection.** `version` ← the completed `header.version`
   (`d:entry-version-is-the-completed-package-version`) — a string, not a separate source version.

### 4.5 Output locations

`outputDir` is computed, never probed; the kit never reads or writes the output tree
(`d:output-locations-are-computed-not-probed`, `r:kit-produces-no-built-output`). No `fs.stat`, no
`existsSync` on it.

### 4.6 Filtering

Applied last, over the fully resolved set — uuid uniqueness and dependency resolution must see the
whole workspace regardless of the filter.

- `packageName` — exact string, case-sensitive, against the reported package name (scoped form).
- `name` — exact, against the **completed** `header.name`. An entry with no manifest matches no
  `name` filter.
- `uuid` — both sides lowercased, then exact.
- `status` — exact.
- Criteria are ANDed. No default status filter: an empty/absent filter returns **every** entry,
  valid and invalid alike (`r:pack-search`; `d:an-unconstrained-search-returns-every-valid-entry` is
  rejected). Note the brief's Search bullet says the opposite ("a search that does not constrain
  status returns valid entries only") — the requirement is newer and governs.
- No matches → `[]`.

### 4.7 Caching

None. Each `discoverPacks` call reads the filesystem once and filters in memory; no cache, no
watcher between calls (`d:the-pack-set-is-read-once-per-call`).

## 5. Error taxonomy (thrown vs. reported)

**Thrown (promise rejection):**
- Root holds neither a readable `pnpm-workspace.yaml` nor a readable `package.json`.
- The enumeration library throws — unparseable member `package.json` (`JSONParseError`/`EJSONPARSE`
  under npm, `JSONError`/`ERR_PNPM_JSON_PARSE` under pnpm), unparseable workspace definition.
  Rethrown **unwrapped**.
- `[CHOSE]` an unparseable `pnpm-workspace.yaml` — the kit parses this one itself, so it throws its
  own error here. I would surface the underlying YAML error unwrapped for symmetry.

**Reported as entry problems:** everything else. No exception is thrown for any pack-level fault.

**Never:** a set-level problems array. Every fault belongs to a pack
(`d:only-a-missing-workspace-definition-throws` is rejected, but its falsifier — "a fault class
arises that no entry can carry" — plus `d:enumeration-failure-rejects-the-call` puts workspace-level
faults in the throw column, not in a set-level bag).

## 6. Edge cases I would implement

- Root package that is itself a pack-bearing package: `packageDir` `.`, `sourceDir`
  `behavior_pack`, `outputDir` `dist/behavior_pack`.
- npm single-package repo (no `workspaces`): root alone is a candidate; if it holds packs they are
  found.
- Package holding both a behavior and a resource pack: two entries, behavior first.
- Uuid case: `A1B2…` in one manifest and `a1b2…` in another are the same uuid and both are
  duplicated.
- `[0,0,0]` `header.version` at `format_version` 3: **two readings compete** — placeholder (so
  unspecified, complete it) or illegal form (so error). `r:kit-completes-partial-source-manifests`
  says "A source manifest carrying an array version at `format_version` 3 is an error, placeholder
  or not", so: error.
- Behavior pack whose manifest declares `resources` alongside `data`: `pack-kind-mismatch`.
- Behavior pack whose manifest declares `client_data` alongside `data`: valid — unknown types are
  ignored (`f:module-type-enumerations-disagree` is exactly why).
- Dependency chain a → b → c where c is invalid: all three invalid after the fixpoint.
- Dependency cycle a ↔ b, both otherwise sound: both valid.
- Two nameless packages whose directory basenames collide: both reported under the same name; the
  kit does not disambiguate (`d:a-nameless-package-is-named-by-its-directory` names this as a
  falsifier, not as behaviour to handle).

## 7. `[BLOCKED]` list

1. **The ten unnamed problem codes.** Invented above. Public, closed, compatibility-bearing.
2. **`Problem` field shape** — whether `field` exists, whether duplicate-uuid claimants get a
   structured field or only prose.
3. **Whether `problems` is present on a valid entry** (chose: present and empty).
4. **`PackKind` spelling** — `'behavior'` vs `'behavior_pack'`. Chose the short form off the
   brief's non-canonical example.
5. **Entry-shape naming generally** — I derived `kind`, `packageName`, `packageDir`, `sourceDir`,
   `outputDir`, `uuid`, `version`, `manifest` verbatim from
   `d:invalid-entries-omit-only-manifest-derived-details`, but `status` and `problems` are my names.
6. **pnpm absent-`packages` handling** — root-only (chosen) vs. forwarding `undefined` and getting
   a whole-tree sweep. Real behavioural fork.
7. **Versionless `module_name` dependency** — which code.
8. **Package location in the monorepo, tsconfig/build/test tooling, how it inherits repo
   conventions.**
9. **Whether `discoverPacks` is the exported name at all.** It is the brief's illustrative name and
   is quoted inside three decision statements (`d:only-a-missing-workspace-definition-throws`,
   `d:the-pack-set-is-read-once-per-call`, `d:enumeration-failure-rejects-the-call`), so I treat it
   as settled — but only by accident of those decisions mentioning it.
