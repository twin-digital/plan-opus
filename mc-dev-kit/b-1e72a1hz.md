# Compose a per-package resource pack from shared asset libraries

Instead of depending on whole resource *packs*, a package could depend on asset *libraries* — workspace
packages that are just collections of geometry, textures, animations and controllers — and have the build
compose exactly the assets that package needs into its own single resource pack.

Compared with depending on a whole shared pack this ships no unused assets, and each consumer's pack is
its own with its own uuid, so there is no shared pack to contend over.

Two open pieces:

- **Namespacing still applies.** Two consumers composing the same asset from one library land the same
  internal name in two packs, and those names resolve across the whole pack stack. Namespacing the names
  by the library's version makes colliding definitions byte-identical and therefore harmless, which is the
  scheme mc-rpg-core adopted for its shared pack.
- **Inferring the asset set.** Ideally the build determines which assets a package needs rather than the
  author declaring them — derivable in principle from the package's own registry of what it references,
  but a real static-analysis job. Declaring them explicitly is the fallback and is what an early version
  should do.

Earns nothing until asset volume hurts; recorded so the shape is not re-derived.
