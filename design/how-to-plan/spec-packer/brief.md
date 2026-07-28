# Brief — spec-packer

## What this design is for

Specify the utility that turns settled designs in this repository into publishable bundles. It
reads the repository, derives each bundle `spec-bundles` describes, works out the version that
bundle would carry, and emits a packed tarball. It does not publish, and nothing it does needs a
network or a credential.

`spec-bundles` says what a bundle is and what publication guarantees. This design says what the
program that produces one does, what it is handed, and what it hands on.

## In scope

- **What a run does** — which designs it covers, what it derives for each, and what it emits.
- **Where the version comes from** — reading the git tag that records a bundle's last published
  version, re-deriving that bundle at the tagged commit, and diffing to compute the next one.
- **The handoff to publication** — the tarball, and whatever a run reports about what it did and
  what it skipped.
- **How the design format is read** — one implementation shared with this repository's checker, and
  what that sharing costs both sides.
- **Reproducibility** — what a run must depend on, and must not, for the same commit to pack
  identically twice.

## Out of scope

- **Publishing, and writing the tag that records it** — a later design owns the credentialed step.
  This design ends at a tarball.
- **When a run happens** — the trigger, the workflow, the permissions. `harness`, or whatever
  replaces it.
- **What a bundle contains, how it is named, and what a bump means** — `spec-bundles`. This design
  implements those rules rather than setting them.
- **What a builder does with a bundle** — `prompts/build/build-from-spec.md`.

## Done looks like

Run the packer over this repository and it emits one tarball per settled, manifest-named design, at
the version each would publish at, and a second run over the same commit produces byte-identical
output. Four designs qualify today.

## What the design must still decide

- **How it reaches the repository.** Handed a path to an existing checkout, or given a URL and a
  ref and left to fetch one. The first keeps network out of the tool, which is what the
  no-network requirement is protecting; the second makes a run self-contained.
- **The cold start, and the hazard it hides.** A settled design with no tag has never published and
  packs at `1.0.0`. But a checkout with no tags fetched looks exactly the same, and would repack
  everything at `1.0.0` — a wrong answer that reports success. What the packer does about that is
  its to decide, and the two cases may not be distinguishable from inside the tool.
- **Whether an unsettled design can be packed as a preview**, so an author can see what a builder
  would get before settling — and if so, how preview output is kept from being mistaken for
  something publishable.
- **Where the shared format implementation lives, and which way the dependency points.** This
  repository's checker currently reads the format with no dependencies at all; sharing means one of
  the two consumes a package built by the other.
- **What a run reports.** Which bundles changed, at what versions, what was skipped and why — the
  shape of that is open, and it is what a person or a later step reads to know what happened.

## Known tensions

- One shared format implementation removes drift between the packer and the checker, and couples
  two repositories that are otherwise independent. The format lives here; the packer does not.
- Reproducibility holds for a given packer, not across packers. The commitments a bundle carries
  are re-read from source rather than re-rendered, so they are stable — but change what the deriver
  puts in a bundle and every bundle re-scores at once, and no tag can protect against that.
- A read-only relationship with tags means the packer cannot tell "nothing was ever published"
  from "the publish step failed after this ran". Both look like an absent tag.
- The packer is built where the format is not. A `doc-structure` change can land here and reach the
  packer only when someone updates it, and the failure would surface as a bundle that packs
  differently from what the checker validated.
