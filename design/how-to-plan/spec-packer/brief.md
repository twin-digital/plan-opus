# Brief — spec-packer

## What this design is for

Specify the utility that turns one settled design into a publishable bundle. It is invoked within a
design — `design/how-to-plan/spec-bundles`, say — derives that design's bundle, works out the
version it would carry, and writes a packed tarball inside the design directory. It packs one design
per run, does not publish, and needs no network and no credential.

`spec-bundles` says what a bundle is and what publication guarantees. This design says what the
program that produces one does, what it is handed, and what it hands on.

## In scope

- **What a run does** — what it derives for the design it was pointed at, and what it emits where.
- **Where the version comes from** — reading the git tag that records that bundle's last published
  version, re-deriving the bundle at the tagged commit, and diffing to compute the next one.
- **What a run needs from outside its own design** — its bundle name comes from a manifest at the
  repository root, its version from repository tags, and its dependency edges from other designs'
  files. A package-level tool with repository-level inputs is the shape to work out.
- **The handoff to publication** — the tarball, and whatever a run reports about what it did.
- **How the design format is read** — one implementation shared with this repository's checker, and
  what that sharing costs both sides.
- **Reproducibility** — what a run must depend on, and must not, for the same design at the same
  commit to pack identically twice.

## Out of scope

- **Covering more than one design** — which designs get packed, in what order, and what happens
  when one fails belongs to whatever invokes the packer: a workflow, a task runner, a person.
- **Publishing, and writing the tag that records it** — a later design owns the credentialed step.
  This design ends at a tarball.
- **When a run happens** — the trigger, the permissions, the environment.
- **What a bundle contains, how it is named, and what a bump means** — `spec-bundles`. This design
  implements those rules rather than setting them.
- **What a builder does with a bundle** — `prompts/build/build-from-spec.md`.

## Done looks like

Invoke the packer inside a settled, manifest-named design and it writes that design's tarball, at
the version it would publish at, inside that design's directory. Invoke it again at the same commit
and the tarball is byte-identical.

## What the design must still decide

- **How far out of its own directory a run reaches, and how.** The packer is invoked within a
  design but cannot be sealed inside one: the bundle name lives in a manifest at the repository
  root, the version lives in repository tags, and a dependency edge is a fact source pointing into
  another design's files. Finding the repository root, and what a run does when it cannot, is the
  design's to settle.
- **The cold start, and the hazard it hides.** A settled design with no tag has never published and
  packs at `1.0.0`. But a checkout with no tags fetched looks exactly the same, and would pack at
  `1.0.0` while reporting success. The two cases may not be distinguishable from inside the tool.
- **What a run does when an upstream has no tag.** A bundle's dependency ranges pin each upstream at
  its published version, so packing a design whose upstream has never published cannot produce a
  complete manifest. Whether that is a failure, a wait, or something a run reports and continues
  past is open — and whatever it is becomes a contract on whoever orders the runs.
- **Whether an unsettled design can be packed as a preview**, so an author can see what a builder
  would get before settling — and if so, how preview output is kept from being mistaken for
  something publishable.
- **Where the shared format implementation lives, and which way the dependency points.** This
  repository's checker currently reads the format with no dependencies at all; sharing means one of
  the two consumes a package built by the other.
- **What a run reports**, and where the tarball lands. Both are what a person or a later step reads
  to know what happened.

## Known tensions

- A package-level tool with repository-level inputs. Everything about invocation says "build this
  package", and three of its inputs — the manifest, the tags, the upstream designs — are properties
  of the whole repository.
- One shared format implementation removes drift between the packer and the checker, and couples
  two repositories that are otherwise independent. The format lives here; the packer does not.
- Reproducibility holds for a given packer, not across packers. The commitments a bundle carries
  are re-read from source rather than re-rendered, so they are stable — but change what the deriver
  puts in a bundle and every bundle re-scores at once, and no tag can protect against that.
- A read-only relationship with tags means the packer cannot tell "nothing was ever published" from
  "the publish step failed after this ran". Both look like an absent tag.
- The packer is built where the format is not. A `doc-structure` change can land here and reach the
  packer only when someone updates it, and the failure would surface as a bundle that packs
  differently from what the checker validated.
