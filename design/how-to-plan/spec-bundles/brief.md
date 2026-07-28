# Brief — spec-bundles

## What this design is for

Specify how a settled spec becomes something an agent can build from somewhere else: what a
published bundle holds, how it is named and versioned, where it lands, and how a consumer gets
it. Builders run this repository's prompts but produce their artifacts in other repositories, so
the bundle is the only thing that crosses the boundary — and today nothing crosses it, because
nothing is published at all.

## In scope

- **What a bundle holds and how it is shaped** — the derived implementer view as an artifact: one
  file or several, the spec's prose with citation tokens stripped, and the extraction of the
  decisions and requirements the spec is bound by.
- **Identity and versioning** — how a spec's bundle is named, how a version is stamped at
  settle-and-merge, and what decides a bump.
- **Where bundles are published, and how they are reached** — the store that serves a bundle by
  name and version, including a way to ask for the latest without knowing it.
- **The publishing process** — what happens at the moment a settled spec merges, what it emits,
  and what a consumer sees afterwards.
- **Upstream dependencies** — how a bundle expresses what its spec depends on from another
  design, so a builder can fetch those bundles separately rather than find them vendored inside.

## Out of scope

- **The automation that performs any of it** — the CI/CD workflow, the hooks, the checker
  integration. That is `harness`. This design picks the store and states the contract it must
  meet — naming, immutability, and the latest pointer; `harness` builds the workflow that pushes
  to it.
- **What a spec says and what shape it takes** — `authoring` and `doc-structure`.
- **When a spec settles and who decides** — `process`. This design starts the moment a settled
  spec merges to main.
- **What a builder does with a bundle once it has one** — `prompts/build/build-from-spec.md`.

## Done looks like

An agent in an unrelated repository, given a spec's name and nothing else, fetches that spec's
bundle at a version or at latest and builds from it without knowing this repository's layout. A
version pinned last month fetches the same content today.

## What the design must still decide

- **The publication target.** Fetching by name and version rules out a bare path into this
  repository, but what serves it — a GitHub release and its assets, a package registry, a tagged
  directory reachable over raw HTTP, something else — is open. The choice turns on evidence about
  what each actually guarantees for a frozen version and for a moving "latest" pointer, and that
  evidence is the design's to gather.
- **The bump policy.** Per-spec semantic versioning is decreed; what separates a major from a
  minor is not. A rule derived from what changed in the spec — a requirement that moved, a
  component interface that shifted — is the outcome worth reaching for; a changesets-style or
  conventional-commit-style declaration by the author is an acceptable floor.
- **The bundle's file shape** — one document or a directory, and whether the requirement and
  decision extraction is rendered prose beside the spec or machine-readable data a builder's
  tooling can load.
- **How a bundle expresses its dependencies.** Nothing states them today; a manifest of some kind
  is the obvious shape but does not exist. Propose a solid solution here — other designs can be
  amended to accommodate it.
- **What "latest" points at after a spec is superseded or rejected.** Immutability settles what
  happens to a published version; it does not settle what the moving pointer does.
- **What happens to specs settled before publishing existed** — backfilled at an initial version,
  or published only on their next settle.

## Known tensions

- Fetch-by-name-and-version wants a real artifact store, and this repository currently has one
  CI job and no publication of any kind. The gap between the requirement and the machinery is
  most of the design.
- Nothing has been published yet, so the design has no usage evidence to weigh — building the
  publication machinery before the loop has run end to end on a real spec is exactly the
  premature-structure mistake this project is against.
