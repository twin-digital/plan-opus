# Brief — planning-lib

## What this design is for

Specify the library that encodes this system's planning artifacts as types and reads them. Designs
and their entries, the fact pool and its evidence, citations and scopes, the product manifest, the
published bundle — one implementation that types them, loads them, validates them, and resolves
what they point at.

It exists because more than one program now reads this format. This repository's checker does
today; `spec-packer` will; harness tooling after it will. Each one that carries its own reading of
the format is a way for two tools to disagree about what a design says, and a place a
`doc-structure` change has to land twice.

The rules it implements are set elsewhere: `doc-structure` defines the artifacts and their
invariants, and `spec-bundles` defines the bundle, the product manifest, and how a cited fact source
becomes an upstream edge. This design specifies the library, not the rules.

## In scope

- **The typed model** — what a design, an entry, a fact, a source, a citation, a scope, a product
  manifest, and a bundle are, as types a consumer programs against.
- **Loading** — reading a working tree into that model.
- **Validation** — enforcing the format's invariants, so a consumer that loads through the library
  never decides for itself whether an artifact is well-formed.
- **Resolution** — citations to entries, designs to the requirements that bind them, a design scope
  to its bundle name, a cited fact source to an upstream edge.
- **Its relationship with this repository's checker** — whether `bin/check-design.mjs` becomes a
  thin caller, moves out, or stays, and what that costs either way.
- **Packaging and publication** — it ships from the opus monorepo and is installable by anything
  that reads planning artifacts.

## Out of scope

- **What the format is and what makes it valid** — `doc-structure`. The library implements those
  rules; it does not set them.
- **What a bundle contains and how a bump is computed** — `spec-bundles`.
- **Deriving, versioning, and packing a bundle** — `spec-packer`.
- **What makes a spec's *content* good** — `authoring`. Those rules are applied by authors and
  reviewers, not by a program, and nothing here mechanises them.
- **Publishing, and the workflows that run any of it.**

## Done looks like

This repository's checker, rebuilt on the library, reports exactly what it reports today for every
design in the tree — the same passes and the same failures on the same fixtures. Nothing was
silently dropped in the move.

## What the design must still decide

- **Read-only, or read and write.** Nothing writes these files by program today; agents author them
  as text. A library that could serialise an entry back would let future tooling add a decision or
  flip a status without hand-editing YAML — at the cost of a formatting contract, since
  round-tripping YAML rarely preserves a file byte for byte and every diff a person reads would pay
  for it.
- **Whether it touches git.** `spec-packer` re-derives a bundle at a tagged commit, which is a
  format operation over a past tree. If the library owns that, every consumer needs a real
  repository rather than a directory; if it does not, the packer builds it.
- **What becomes of `bin/check-design.mjs` and `bin/foundations.mjs`.** A thin caller over the
  published package, a tool that moves out of this repository entirely, or something else. This
  repository is `private: true` with one dependency today and validates itself with no install
  beyond it.
- **The bootstrapping order that follows.** If this repository's checker consumes the published
  library, a format change cannot be adopted here until a library release carries it, and this
  repository cannot validate itself before the library has published once.
- **How a format change reaches consumers.** The library will version independently of the format
  it implements, and a consumer pinned to an old library reads a new tree with old rules. Whether
  that is stated as a compatibility contract, detected, or simply allowed is open.

## Known tensions

- The format lives here and the library is built elsewhere. A `doc-structure` change lands in this
  repository and reaches the library only when someone updates it — and the library is the format's
  implementation, so the gap between them is the format itself being two things at once.
- Serving the checker and serving the packer pull in different directions. The library carries
  product manifests and dependency edges, which are publishing vocabulary the checker never uses,
  and a checker-shaped library would not have them.
- One implementation removes drift and creates a release dependency where there is none today. The
  drift is silent and the dependency is loud, which is an argument for the trade and also the reason
  it will be felt.
- Checker parity is easy to state as a migration test and becomes a standing obligation: every
  future format change has to keep two consumers in step, and the second one is in another
  repository.

## Relationship to `spec-packer`

`spec-packer` is captured (#96) and paused pending this design. Its drafted requirement
`format-has-one-implementation` says the packer and this repository's checker read the format
through one shared implementation — which is this library. That requirement now overlaps this
design's `library-is-the-one-implementation-of-the-format`, and the owner should decide whether it
stays as the packer's own constraint, is reworded to name the library, or moves to area scope to
bind both.
