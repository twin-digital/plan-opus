# Brief — publishing-specs

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
- **Upstream dependencies** — whether what a spec relies on from another design travels inside
  its bundle, and at what cost.

## Out of scope

- **The automation that performs any of it** — the CI/CD workflow, the hooks, the checker
  integration. That is `harness`. This design says what must be published and what a consumer can
  do with it; `harness` designs the machinery that carries it out.
- **What a spec says and what shape it takes** — `authoring` and `doc-structure`.
- **When a spec settles and who decides** — `process`. This design starts the moment a settled
  spec merges to main.
- **What a builder does with a bundle once it has one** — `prompts/build/build-from-spec.md`.

## Done looks like

An agent in an unrelated repository, given a spec's name and nothing else, fetches that spec's
bundle at a version or at latest and builds from it without reading this repository or knowing
its layout. A version pinned last month fetches the same content today.

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
- **How self-containment is achieved**, if the soft requirement survives review: inlining an
  upstream design's material at publish time gives the builder one artifact, and freezes it
  against an upstream that may later be corrected.
- **What "latest" points at after a spec is superseded or rejected.** Immutability settles what
  happens to a published version; it does not settle what the moving pointer does.

## Known tensions

- Self-containment and immutability pull against each other. A bundle that inlines an upstream's
  material is frozen against a version of that upstream which may since have been corrected, and
  the consumer holding it has no signal that anything moved.
- Fetch-by-name-and-version wants a real artifact store, and this repository currently has one
  CI job and no publication of any kind. The gap between the requirement and the machinery is
  most of the design.
- Nothing has been published yet, so the design has no usage evidence to weigh — building the
  publication machinery before the loop has run end to end on a real spec is exactly the
  premature-structure mistake this project is against.
