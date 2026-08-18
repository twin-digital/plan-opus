# Actor names could live in the assets pack and become localisable

d-bfdql5tx puts a preset's default name in the library as a plain string, untranslated, because
d-ny9lcyjg bars the assets pack from content kinds the namespace cannot reach — and a `.lang` file
is one file for the whole pack rather than one file per name, so nothing in it could be namespaced.

mc-dev-kit's vendoring increment removes that obstacle. Its d-7aqne91n admits localization entries
keyed by an entity identifier among the content a vendored pack may hold, on the strength of
f-gvmc2wfa: an entity's localization key is `entity.<id>.name` from its identifier by one rule with
no exceptions, so the key moves with the identifier the namespace already rewrites. And d-hqtqb43i
has the build compose the pack-global files two packs both contribute entries to, rather than one
silently winning.

So the two reasons d-bfdql5tx names both fall away, and an actor's default name could sit in the
assets pack as a localisable resource — reaching players in their own language, and letting an
adventure override a name by the ordinary resource route instead of a library call.

Worth taking up when mc-rpg-core next considers adopting the kit's namespacing in place of its own
hand-rolled scheme (d-i8pjw2on, d-2zclv5ol, d-5f011w0o, d-orqkexpm); the two go together, since the
localization only works under the kit's rewrite.
