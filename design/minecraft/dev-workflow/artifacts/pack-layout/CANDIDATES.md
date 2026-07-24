# Candidate layouts (working notes for ADDENDUM.md)

Scratch enumeration. The addendum carries the comparison; this file keeps the full field so a
later reader can see what was considered and dropped.

- **A — pack-per-package, manifest at package root.** The npm package *is* the pack:
  `manifest.json` at the package root, authored content beside it, build output to `dist/`.
- **B — pack-per-package, manifest under a source subfolder.** `pack/manifest.json` plus `src/`;
  the build assembles `dist/` as the shippable pack.
- **C — addon-rooted container.** `.mcaddon/{manifest.json, modules/<foo>/manifest.json}`; one
  package holds an addon and its member packs.
- **D — kind-partitioned container.** Top-level `manifest.json` beside `behavior_packs/`,
  `resource_packs/`, `packs/`; mirrors the server's pool names.
- **E — multi-pack package, pool mirror.** One package holds `behavior_packs/<name>/` and
  `resource_packs/<name>/`; source layout equals deployed pool layout, no transform.
- **F — composition by dependency.** Packs are packages; an addon package holds no pack source at
  all, only dependencies naming its member pack packages, resolved at assembly time.
- **E — kind-agnostic `packs/*`.** One `packs/` root, one directory per pack,
  `packs/<name>/manifest.json`, kind read from the manifest's module types rather than from a
  directory name. Shortlisted; see ADDENDUM.md.
- **G — tool-canonical project.** Whatever the dominant ecosystem tool fixes (e.g. `packs/BP`,
  `packs/RP` per project).
- **H — free source, canonical build output.** Source layout unconstrained; the build emits
  canonical pack directories, and only the built shape is pinned.
