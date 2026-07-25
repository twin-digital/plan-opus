# Handoff — `minecraft/dev-kit`, shape C: packages declare their own packs

**For:** `prompts/capture/capture-requirements.md`, run against the design `minecraft/dev-kit`
(and, after it, a regeneration of `minecraft/dev-workflow` via `prompts/design/generate-spec.md`).

**Status:** input for capture. Nothing here is a requirement yet — requirements are owner fiat, and
this document records the reasoning a capture agent needs so the owner is not asked to re-derive it.

---

## The shape this branch explores

**Each package declares its own packs; the kit never has to build first.**

A package declares, next to the code it describes — a `minecraft` field in `package.json` or an
exported descriptor — which packs it contains, where each pack's sources live, and where each pack's
built output lands. The kit owns the declaration schema, validates it, and normalises it into the
pack set. Selection is a workspace filter over the declared packs.

The declaration is deliberately narrow: it may declare **only what the manifest cannot** — which
sources to build, and where output lands. It must never restate kind or identity. Those come from
the manifest, which declares them authoritatively; restating either recreates the
duplicate-declaration failure that killed the config-registry shape, where two sources of truth can
disagree and the server fails silently.

### What it resolves

- **Tension 1 dissolves**, differently from the artifact-identity shape: there is still no fixed
  source layout, because each package states where its own sources are. `r:pack-source-layout-is-fixed`
  should be **retired** if this shape is adopted.
- **`locating-built-packs` is answered by declaration** rather than by scanning — the package says
  where its output lands.
- Packs are enumerable **without building**, which the artifact-identity shape cannot do. That makes a
  bare `validate`, a clean-checkout listing, and early error messages all straightforward: a source
  typo surfaces at discovery, not as "no packs found" after a build.

### Costs to carry honestly into capture

- Every package carries declaration boilerplate, and the declaration can drift from reality in a way
  a scan cannot — it says where output lands, but nothing enforces that the build agrees.
- It is a migration: the detection probe in `artifacts/pack-detection/` found that **no package in the
  existing workspace carries a marker field today**. That measured detection reliability now, not
  migration cost — the migration is small — but it is real work, and until it is done, nothing is
  discoverable.
- The kit must resist absorbing build semantics. A declaration that grows from "where my output
  lands" into "how my pack is built" puts `r:built-output-assembly-is-the-package-s-concern` at risk.

The alternative — locating packs by scanning built output, so the format's own definition of a pack
does the work and nothing declares anything — is being explored on branch
`plan/mc-dev-kit-artifact-identity`. Its tradeoffs are the mirror image of these: no boilerplate and
no possible drift, but nothing is enumerable until a build has run. If the owner picks that one, this
branch is abandoned rather than merged.

---

## Why this design exists

The `minecraft/dev-workflow` design (PR #33, branch `design/minecraft-dev-workflow`) specified a dev
harness that discovers Bedrock behavior packs in a workspace, builds them, deploys them to a
containerised server, and reloads on change. Review of that draft surfaced two tensions that the
design could not resolve from inside itself.

**Tension 1 — source layout serves two masters.** `r:pack-source-layout-is-fixed` pins packs at
`pack/manifest.json` or `packs/<name>/manifest.json` so *discovery* can find them. But source layout
is also the input to *build*. A package cannot reorganise its sources for build reasons without
breaking discovery, and discovery cannot change without dictating build structure. The open question
`locating-built-packs` is the same crack from the other side: the source end is pinned by fiat and
the built end fell out unspecified.

**Tension 2 — auto-detection answers the wrong question.** `r:packs-discovered-from-workspace`
forbids a hand-maintained list, which makes "every pack in the workspace" the only expressible
answer. That answers *what exists*. Running a test server against a subset of the monorepo asks *what
do I want right now* — and a selection is an argument, not a list that drifts. The requirement is
right about the registry and wrong about the roster.

Both point past the harness: what is actually wanted is a general kit for identifying, validating,
and building Minecraft packages, with dev hosting as a layer on top of it.

## The layer boundary

**Kit** — membership, build (or emit configuration for another build tool), locate packs, parse and
validate manifests, classify kind, and produce a normalised pack set: one entry per pack, roughly
`{ packId, version, kind, dir, ownerPackage }`. Validation covers uuid present, uuid unique across
the set, and `dependencies` resolvable within it.

**Harness** — the Compose project and volumes, readiness, pool routing by kind, activation lists,
reconcile / stamps / diff, reload-versus-restart, watch orchestration, interleaved output, and the
selection UX.

That interface is **one data structure and two verbs**, which is what makes it a good boundary under
this repository's rules. A separate design cannot cite another design's decisions; it depends on the
upstream through a **fact sourced to the upstream `spec.md` by verbatim quote**. Here that fact quotes
one or two sentences: the pack-set entry fields, and the guarantee that every entry names a directory
whose root holds `manifest.json` with a header uuid unique in the set. A boundary needing a dozen
quoted behaviours would be the wrong boundary; this one does not.

**Do not let the kit grow into "the build system."** Its defensible core is *identify, validate,
normalise*. Building is something it can orchestrate or configure, but the moment the kit owns build
semantics, `r:built-output-assembly-is-the-package-s-concern` is dead and tension 1 returns wearing a
different hat.

## Shapes that were considered and rejected

- **Config-first registry** — a config file declaring each pack's source root, kind, and output.
  Fails as a registry: the ecosystem standard it would model, Bedrock-OSS's `project-config-standard`,
  keys `packs` by pack *type* with one path each, so a second behavior pack has nowhere to go, and
  Regolith's config struct is two singular string fields. Inventing our own central registry instead
  recreates the duplicate-declaration failure: a config saying `behaviorPack` while the manifest's
  modules say `resources`, with nothing detecting the disagreement and the server failing silently
  (see `artifacts/pack-layout/probe/`, cases 2 and 4). A config file is the right home for *what I
  want right now* and the wrong home for *what exists*.
- **Build-tool plugin** — shipping the kit as a plugin for a build-tool family. The one ecosystem
  build integration that exists, Microsoft's `@minecraft/core-build-tasks`, hard-codes
  `development_behavior_packs/<PROJECT_NAME>` and merges every listed source folder into *one* pack
  per project — it is structurally single-pack. Keep the insight that the build knows its own
  outputs; drop the coupling. A build-emitted descriptor as house-defined data is fine.
- **Toolkit-as-library** is not a competitor but the packaging of whichever resolution wins. It earns
  its keep because a small typed contract is what makes the interface quotable for the citation rule
  above.

## What a regeneration of `dev-workflow` costs

Less than it feels. The server half stands; roughly the front 40% of the spec — discovery, build, and
the pack side of reconcile — is rewritten.

- **Facts: all eleven survive.** Nine are pure server/Docker mechanics and are untouched.
  `bedrock-manifest-declares-pack-identity-and-kind` moves to `design/minecraft/` area scope verbatim,
  since both designs need it. `content-independent-pack-heuristics-misfire` survives but demotes to
  background.
- **Decisions: seven of ten survive untouched** — push-deploy over compose watch,
  server-as-state-of-record, content stamp, restart classification, explicit env-file, console reload,
  named volume. `watch-built-output-not-sources` survives and is vindicated.
  `pack-identified-by-a-committed-behavior-manifest` is the coupling artefact and dies as written; its
  residue (deploy `data`/`script` packs, recognise and skip other kinds) moves to kit classification
  or a small harness routing decision.
- **Requirements.** Workflow keeps: one-command loop, lifecycle-outlives-foreground,
  reconcile-to-built-packs, edit-to-live, single-world, remote-docker. Area scope:
  `behavior-packs-required-other-content-optional`, `deployment-is-not-a-pack-concern`,
  `built-output-assembly-is-the-package-s-concern`. Kit: membership and validation.

## Selection sits beside discovery, it does not replace it

Narrow the discovery requirement rather than rewording it away: "no hand-maintained list" should
become "no hand-maintained list **of what exists**". A second requirement sits beside it — which of
the discovered packs a run hosts is an argument, defaulting to all, with persisted profiles allowed,
because a profile is a saved argument and not a source of truth.

One consequence to price in: `r:deploy-reconciles-to-built-packs` currently says the server matches
"the current built output"; with selection it must say the **selected** packs, and deselecting a pack
becomes a removal — which is a restart, by `f:bedrock-activation-list-read-only-at-world-load`.

## Evidence already banked — do not re-research it

On branch `design/minecraft-dev-workflow`, under `design/minecraft/dev-workflow/`:

- `facts.yaml` — eleven facts, all with sources: Compose watch constraints and versions, `compose cp`
  without bind mounts, env-file resolution, activation-list-read-at-world-load, reload scope, the
  console helper, one world per server instance, the activation entry shape, the manifest's
  declaration of pack identity and kind (five verbatim Microsoft Learn quotes), and how
  content-independent detection heuristics misfire.
- `artifacts/pack-layout/` — eight candidate source layouts, format and tooling evidence with quoted
  sources, a probe with captured server output, and the analysis that led to the current requirement.
  Its `Outcome` section records what the owner settled and what stayed open.
- `artifacts/pack-detection/` — thirteen detection rules scored against a real 41-package workspace,
  with captured output.
- `artifacts/activation-list-probe/`, `artifacts/compose-watch-probes/`, `artifacts/env-file-resolution/`
  — the server and Compose probes behind the facts.

Two probe results that constrain any shape: a pack deployed into a wrongly-named directory loads fine
(nothing keys off a source directory name), and a pack misfiled into the wrong *pool* fails silently
at the server. Kind must come from the manifest, and it must be right.

## Questions that are the owner's to decree

Bring these back rather than deciding them:

1. One design or two, and whether kit and harness ship as one package or separately.
2. Whether packages must declare membership explicitly, or membership is inferred.
3. Whether the kit serves non-dev consumers (release, CI) — this decides whether it is a product or
   an extraction.
4. Selection semantics: default-all, whether profiles persist, whether a selection names worlds or
   server versions too.
5. Whether resource packs move from optional to required — that turns kind-handling from a filter
   into a router.
6. The versioning fork from `artifacts/pack-layout/ADDENDUM.md`: what a *package* is. Still
   unanswered, and it matters more once a kit implies a release path.

## Questions an agent should decide

The pack-set shape and the two verbs; scan-versus-descriptor for locating built packs; validation
rules and error surfaces; how a build maps to the packs it changed, for watch; and everything
server-side, which is unchanged.
