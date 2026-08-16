# A preview build for vendored-pack authors

The validation half of this item shipped at 013: `packBuild` validates a `vendored_pack/` tree
at its author's own build — content kinds, declarations, token shadowing, and every reference
over the package's own `minecraft.vendor` field and direct dependencies — and a vendored-only
package validates and emits nothing rather than failing as pack-less (d-rzcxpj7p).

What remains is the preview: completing and rewriting the tree under a placeholder namespace
and prefix so the author can see built output — and load it against a dev server — without
being anyone's dependency. Worth taking up with the first library authored outside the
workspace that consumes it, alongside whatever the selective-import increment (b-1e72a1hz)
settles about the field's `include` list.
