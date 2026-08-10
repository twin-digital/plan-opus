# Establish pack, bundle and active as preset terms

The terms glossary landed in increment-process 033, and this preset's own requirements use three words that
want binding. mc-rpg-core measured the vocabulary across all six minecraft products and proposed them:

- **pack** — a Bedrock behavior pack or resource pack: a directory with a manifest at its root, which the
  game loads as a unit. Used by every live requirement here, and ambiguous as written: behavior, resource,
  or either. Binding it also sharpens the preset-subject test authoring applies, since a requirement written
  in a preset has to name the kind of thing it binds.
- **bundle** — the built script a behavior pack's script module names as its entry. `r-cyd08e6q` says "a
  pack's bundle is built by the dev kit", which could as easily mean the release archive.
- **active** — a pack is active in a world when the world's pack stack holds it, so the game loads its
  content. `r-992moral` says "with the pack installed and active" and then "no activation plumbing of its
  own".

mc-rpg-core declares `pack` locally in the meantime; it does not declare `bundle` or `active`, because its
own entries use `bundle` only as a verb and never use `active` at all, so both would bind senses it does not
speak.

Deliberately not proposed: `world` and `entity` need no binding, `workspace` and `monorepo` belong to the
monorepo-package or nodejs presets, and `manifest`, `activation list`, `pack stack`, `pool` and `discovery`
are mc-dev-kit's own vocabulary that this preset's requirements never use. `preset` must stay local — it
means a requirement preset in mc-test-lib and an actor preset in mc-rpg-core, which is the divergence
d-x9x3fxp4 permits.
