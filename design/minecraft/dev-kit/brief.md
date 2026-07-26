# Minecraft dev kit: Design Brief

The dev kit is the library that answers, for a workspace of Minecraft Bedrock packages, *which packs exist here and what is each one*. It finds the packs, parses and validates their manifests, and hands back a normalised pack set — one entry per resolved pack, carrying identity, version, kind, the directory holding the pack, and the package that owns it — alongside a structured error for every pack it could not resolve. Everything about running a server sits on top of it: the dev server harness consumes the pack set and owns deployment, activation, reload, watching, and the selection UX. The kit's defensible core is identify, validate, normalise, and complete — a source manifest is partial by design, and the kit is what reports it whole. Producing built output is not part of this spec.

It ships as a typed library — a consumer imports it and gets the pack set as data, never as text to parse.

Five capabilities cover the surface:

- **Discover** — given a workspace root, find the pack-bearing packages and return one record per valid pack, with a structured error for every pack that was found but could not be resolved. Each discovered pack lands in exactly one of the two.
- **Detail** — for each pack, its owning package, its kind, its source location, where its built output is expected whether or not it is there yet, and its manifest as an object.
- **Complete** — a source manifest omits what the package already knows, and the kit fills those fields in on the manifest it reports: the header name and version from `package.json`, and the version of any dependency naming a workspace pack by uuid, which is how a dependency on a pack this workspace resolves is declared.
- **Search** — find packs by npm package name, pack name, or pack uuid, matched exactly.
- **Validate** — the manifest parses; a header uuid is present and unique across the set; the manifest carries a module corroborating the kind its directory declares, and none of the other kind; in-workspace manifest dependencies resolve, exempting a dependency naming a built-in scripting module; the data completion needs is present and well formed.

Enumerating the workspace's packages is the one place worth weighing before deciding. Consider reaching for what the package manager already implements — a library it publishes, or shelling out to the manager itself — rather than re-implementing its configuration formats and glob behaviour. An API the manager does not officially support is acceptable where it is published to the public registry and the spec argues it is the most robust option available. This is a suggestion, not a constraint: the spec weighs it and decides.

A pack's kind is the directory's — `behavior_pack/` or `resource_pack/` — and the manifest corroborates it rather than declaring it. The tension this resolves is worth naming, because it is what the first two cycles kept reaching for: the manifest is what the *server* reads, so a pack deployed by a kind its manifest contradicts silently fails to load, while the set of module types a manifest may declare is not enumerable and cannot be validated against. Corroboration is what keeps a single kind on the record without validating a moving target.

Illustrative only, to show the shape of consumption rather than an API — none of this is canonical:

```ts
const packs = await discoverPacks({ workspace: process.cwd() })
// [{ id: 'b1a7…', version: [0,1,0], kind: 'behavior', dir: 'packages/mc-pack-1/dist/behavior_pack',
//    package: 'mc-pack-1' }, …]

const selected = packs.filter(p => ['mc-pack-1', 'mc-pack-2'].includes(p.package))
for (const pack of selected) deployToPool(pack)   // the dev server's job, not the kit's
```

```
$ mc-kit validate                      # the deferred CLI, one day
mc-pack-2  behavior_pack/manifest.json — header uuid duplicates mc-pack-5
mc-pack-4  no built pack at dist/behavior_pack
2 problems
```
