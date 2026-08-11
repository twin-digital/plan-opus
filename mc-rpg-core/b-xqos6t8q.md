# Read the EULA before the first release, not after

`f-ev10b68v` records that the vanilla packs are published all rights reserved and governed by the Minecraft
EULA, with an explicit caveat that what the agreement permits for an asset a pack *redistributes* is not
quoted there. The reasoning taken during the first increment was that it does not arise for a family addon
nobody publishes.

The survey found that the step arrives sooner than that assumed: the monorepo's `publish.yaml` uploads
whatever a package's `release-assets` hook writes to that package's GitHub release, on a public repository.
So the assets pack's first release is a distribution of re-identified Mojang assets to whoever can read that
release, whether or not anyone is meant to install it.

`d-lyvjq8l1` vendors the assets and `d-cb9jl02i` records their provenance, so what was taken and from where
is answerable. What is not answered is whether publishing it that way is permitted. Worth settling before
the first release rather than after — and the cheap alternative, if the answer is unwelcome, is that the
archive is not a published release asset at all.
