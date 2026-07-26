# Pack API survey

How often do real, public Minecraft Bedrock behavior packs touch each part of `@minecraft/server`?
This folder holds the scripts that measured it, the pinned list of repositories measured, and the
captured output.

Run order (each script writes both a `.json` it hands to the next step and a `.out.txt` transcript):

| script | writes | what it does |
|---|---|---|
| `1-discover.mjs` | `candidates.json` | GitHub repository search, 16 queries x 2 sort orders |
| `2-api-index.mjs` | `api-index.json` | parses the `@minecraft/server` 2.8.0 declarations into the classification ground truth |
| `3-fetch.mjs` | `packs.json` | clones candidates, applies the inclusion rules, records the funnel |
| `4-analyze.mjs` | `usage.json` | scans the accepted sources, attributes each name to an API area |
| `5-report.mjs` | `5-report.out.txt` | the ranked tables; `KIND=pack` re-runs it without the library-tagged repositories |

`npm install` first — `2-api-index.mjs` reads the declarations out of `node_modules`. Clones land in
`.work/`, which is not committed; `packs.json` pins each repository's commit SHA.

## What was sampled

103 public GitHub repositories, 2422 source files, 368,385 non-blank source lines. 98 are tagged
`pack` and 5 `library`; 45 are TypeScript sources and 58 JavaScript; 29 have no stars, 58 have one
to nine, 16 have ten or more. Median repository size is 1200 non-blank source lines.

Discovery could not use GitHub code search, which requires a token this environment did not have.
It used the unauthenticated repository-search API instead: a fixed list of 16 queries (addon and
Bedrock topics, plus text queries naming `@minecraft/server`), each read sorted by stars and by
recent push so the pool was not purely popularity-weighted. That produced 919 candidate
repositories, of which 850 were under the 80 MB size cap and were cloned and inspected.

## How the sample was filtered

`3-fetch.mjs` decides from repository contents, never from the search text that surfaced it. A
repository is in the sample when all of these hold:

- it looks like a behavior pack — a `manifest.json` declaring a module of `"type": "script"`, or a
  behavior-pack data layout (three or more files under `entities/`, `items/`, `loot_tables/`, and
  friends) for the repositories that generate their manifest at build time;
- at least one source file names `@minecraft/server`;
- those files total 150 or more non-blank lines, which drops single-file samples;
- its name, description, and topics are free of tutorial, sample, template, and boilerplate wording.

Vendored code, declaration files, files over 400 KB, and files whose average line length exceeds 300
characters (minified or bundled output) are skipped. Where a repository has both TypeScript sources
and a checked-in JavaScript build, only the TypeScript is analysed, so one body of code is not
counted twice.

The funnel is in `3-fetch.out.txt`: 850 attempted, 103 accepted, 746 rejected — 581 for having
neither a manifest nor a pack layout (the searches surface many Java mods and server tools), 89 for
having no script sources, 36 for falling under the line threshold, 21 for declaring no script module,
15 for never naming `@minecraft/server`, 4 for tutorial wording, and 1 clone error.

Repositories are tagged `pack` or `library` from description and topic wording. Libraries are kept
but reported separately in `5-report.packs-only.out.txt`, which reruns every table over the 98
pack-tagged repositories alone. The two sets rank the areas the same way.

## How usage was counted

`2-api-index.mjs` parses the `@minecraft/server` 2.8.0 `index.d.ts` into 438 classes with their
inherited members, the event tables off `WorldAfterEvents` / `WorldBeforeEvents` / `SystemAfterEvents`
/ `SystemBeforeEvents`, and the three component-id type maps. Every attribution in the report resolves
through that index, so the area assignments are not a hand-written keyword list. Each event also
carries the API classes a handler can reach off the event object in one hop, which is what makes the
"subscribes to an event whose payload exposes `ItemStack`" test possible.

`4-analyze.mjs` scans sources lexically: comments removed, regular-expression literals skipped, string
literals kept addressable so component ids can be read, and template-literal `${}` expressions scanned
as code. `node 4-analyze.mjs --selfcheck` runs it over `selfcheck-fixture.txt`, which exercises each
of those cases; the result is `4-analyze.selfcheck.out.txt`. Four signal kinds are counted:

- **imports** — named imports and `require` destructurings from `@minecraft/server`;
- **component ids** — the string passed to `get`/`has`/`add`/`removeComponent`, plus ids written as
  `EntityComponentTypes.X` enum members;
- **event subscriptions** — `<x>.afterEvents.<name>` and `<x>.beforeEvents.<name>`, with `system` as
  the holder distinguished from the world;
- **member calls** — `.name(` where `name` is declared in exactly one API area.

The first three are unambiguous. The fourth is an inference: the scanner has no receiver type, so a
name declared across several areas is not attributed at all, and names common in ordinary JavaScript
(`get`, `set`, `delete`, `location`, `id`, `button`, ...) are stoplisted out entirely — the report
prints which stoplisted names it saw. Bare property reads are weaker still and are excluded from the
area table, reported in their own low-confidence table instead.

Counts are reported two ways: **repos**, the number of repositories referencing something at least
once, which is the primary figure, and **refs**, the raw number of references, which a single large
repository can dominate.

## What these numbers cannot support

- **The sample is not random.** It is what GitHub repository search returns for one fixed query list.
  Packs distributed only as `.mcaddon` files, on marketplaces, or in private repositories are absent,
  and there is no way from here to say how the sampled packs differ from those. Treat every share as
  descriptive of this sample, not as an estimate of a population proportion.
- **Presence is not weight.** "62% of repositories touch items" counts a single `itemStack.typeId`
  read the same as a full inventory system. The numbers rank what gets touched; they do not measure
  how much of a pack's behavior depends on it, how much of the class's surface is needed, or how much
  of the pack could still be tested against a fake that lacks it.
- **The unit is a repository, not a shipped pack.** A repository holding several packs counts once.
- **Static analysis undercounts and can overcount.** Dynamic access (`entity[name]()`), and helper
  modules that operate on API objects passed in without ever naming `@minecraft/server`, are invisible
  to it — those files were not analysed at all. In the other direction, a pack class of its own with a
  method named `getItem` would be attributed to `Container`. Spot checks of the container attribution
  found real `Container`/`ContainerSlot` calls, but the member tier is an inference and is reported
  apart from the unambiguous signals for that reason.
- **Version drift is real.** Classification uses declarations 2.8.0; the packs target many versions.
  Event names that no longer exist in 2.8.0 (`chatSend`, `worldInitialize`, `itemUseOn`,
  `watchdogTerminate`, ...) are counted and listed in their own table rather than dropped.
- **"Fully served" is a statement about references, not about testability.** A repository counted as
  needing items may need them in one handler out of forty.
- **Thresholds are judgment calls** — the 150-line floor, the exclusion wording, the three-file pack
  layout test. They are all in `3-fetch.mjs` and every rejection is recorded in `packs.json`.
