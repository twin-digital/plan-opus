# Check the chosen namespace against the Bedrock-OSS add-on registry at build time

d-p00wsgxo has the kit's docs point an author who overrides the default namespace at the
Bedrock-OSS add-on registry, and stops there: the build neither reads it nor requires an entry.

The registry is real allocation rather than advice — one JSON file per creator, the key being the
namespace, claimed by pull request, and "Duplicate keys are not allowed. The build will fail if a
namespace is already taken" (f-5cqzbyqa). So a build could fetch it and refuse, or warn on, a
namespace another creator holds.

What it would cost: a network dependency in a build that has none today, a cache and a staleness
policy for offline and CI builds, and a failure mode when the fetch fails that is not "the pack is
wrong". What it would buy is bounded too — the registry is opt-in, the engine reads nothing from
it, and a pack that never registered may hold any namespace it likes, so a clean check proves
nothing about the packs a world will actually run.

Worth taking up if the registry's coverage grows enough that a clean check means something, or if
the default namespace is ever relaxed to something an author is likely to collide on. The
d-zk0c48uy default — the full scoped package name — is what makes this optional today.
