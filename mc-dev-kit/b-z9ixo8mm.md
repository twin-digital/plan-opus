# Bundle a dependency's packs into an adventure's release archive

`mc-pack-archive` cuts a package's `.mcaddon` from that package's own `dist/` tree — members are
fixed in source (`PACK_MEMBERS`: the two kind-named directories), and nothing routes another
package's packs into the archive. So an adventure depending on an assets pack (mc-rpg-core's
shape) cannot ship a one-file install: the operator installs two archives, one per package.

mc-rpg-core 002 records this as fact `opus-pack-archive-carries-only-the-packages-own-packs` and
supersedes its one-file-install decision (d-hybkhum6 → d-kxl9ej80) because of it. If the kit
gains foreign-pack archiving — e.g. following behavior-manifest uuid dependencies into the
workspace pack set and adding those packs' halves as members — the one-file story becomes
buildable again and mc-rpg-core could re-adopt it.

Sits beside what mc-rpg-core's d-lgaqtx4c already defers to this product: an extension point for
a product's own build-time checks, an archive that refuses an incomplete addon, and somewhere a
prior release's identifier set is recorded.
