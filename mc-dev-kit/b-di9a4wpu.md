# A build mode for vendored-pack authors

A vendored pack is never built by its author: it carries no manifest, is never discovered, and
its faults surface only inside consumers' builds. The 013 resolution rules make most of those
faults the author's own — content kinds outside the modeled set, names declared twice within
the library, references that resolve to none of its direct suppliers or to several — and every
one fails identically for every consumer, so the author is the right place to catch them.

The mode: the dev kit validates a package whose product is its `vendored_pack/` tree — content
kinds against the closed set, internal references, and closure references against the package's
own direct `dependencies` (its closure config, same as a consumer's) — without the package
being anyone's dependency. Possibly a preview build (complete + rewrite under a placeholder
namespace) so the author sees output; at minimum a check with the same failure messages a
consumer would see.

Surface question to settle when taken up: a `packBuild` option, a separate export, or a command
beside `mc-pack-archive`. Earns its keep with the first shared library authored outside the
workspace that consumes it.
