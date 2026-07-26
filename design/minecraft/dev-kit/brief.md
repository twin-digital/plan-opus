# Minecraft dev kit: Design Brief

The dev kit is the library that answers, for a workspace of Minecraft Bedrock packages, *which packs exist here and what is each one*. It finds the packs, parses and validates their manifests, classifies each pack's kind, and hands back a normalised pack set — one entry per pack, carrying identity, version, kind, the directory holding the pack, and the package that owns it. Everything about running a server sits on top of it: the dev server harness (`minecraft/dev-server`) consumes the pack set and owns deployment, activation, reload, watching, and the selection UX. The kit's defensible core is identify, validate, normalise, and complete — a source manifest is partial by design, and filling in what it omits is the kit's. Producing built output is not: that belongs to `minecraft/build-kit`, which ships in the same package.

It ships as a typed library — a consumer imports it and gets the pack set as data, never as text to parse. A CLI over the same capabilities is intended and deliberately unspecified here. Two consumers are in view: the dev server, which needs the pack set on every build; and a CI check, which needs validation to report every problem it found in a form nothing human has to read.

Four capabilities cover the surface (deployment, activation, and reload are the dev server's; producing a built tree is build-kit's):

- **Discover** — given a workspace root, find the pack-bearing packages and return one entry per pack.
- **Validate** — the manifest parses; a header uuid is present and unique across the set; the module type is recognised; the kind agrees with the directory holding it; in-workspace manifest dependencies resolve, exempting a dependency naming a built-in scripting module; expected built output exists once a build has run.
- **Complete** — inject what a source manifest deliberately omits into the manifests in built output, never into source.
- **Locate built output** — `dist/` unless the package says otherwise.

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

The shape is membership by convention. A workspace package carries at most one behavior pack and at most one resource pack — the shape the whole ecosystem models, and the shape that makes an addon — and it is a pack-bearing package exactly when its *source* holds `behavior_pack/manifest.json` or `resource_pack/manifest.json`. Nothing is declared: no marker field, no registry, no config entry. Microsoft's two canonical layouts disagree on this point — the add-on development workflow puts singular `behavior_pack/` and `resource_pack/` siblings at a project root, while the `ts-starter` scripting sample uses plural `behavior_packs/<project>/` with scripts outside the pack — and the convention here follows the former, so a package built on the latter has to move. Built output is assumed to be `dist/`, with a way for a package to say otherwise. Because membership is known from source before any build runs, the kit enumerates packs on a clean checkout, and a missing or misplaced build output is already a loud error naming the package and the path it looked in. Identity and kind still come from the manifest alone; the kind-named directory locates a pack and never overrules it, and a directory whose manifest disagrees with it is an error rather than a preference the kit resolves quietly, because a pack misfiled between kinds fails silently at the server and nothing downstream reports it.

The inputs stop short of designing. Left open for the design: the pack-set data structure and the verbs over it; how a package specifies an alternate output location, which the owner deliberately did not fix; the validation rules and error surfaces beyond the outcome the requirements decree; where the injected version is read from; and how completion is invoked from the build that produces the tree it writes into.
