# Name display probe — for q-r7db9r31

Answers two things `q-r7db9r31` asks, which decide whether a preset's default name can move out
of the library and into the vendored pack:

1. does an `entity.<id>.name` entry in a resource pack put a name above an entity a player is
   looking at, with no `nameTag` set?
2. can a name a player reads carry a translation at all — as a raw key, or as rawtext?

## This cannot be run headless

`f:a-resource-pack-cannot-carry-anything-a-script-can-reach` settles it: a resource pack reaches
nothing a script can observe, and a dedicated server does not read one. A name plate is drawn by
the client. So the answer is read by a person looking at the screen, and the script here only
captures the half the engine will report — `localizationKey` and the `nameTag` readback — so the
two halves can be lined up afterwards.

## The five cases

Each is one entity, spawned in a row, drawn as an evoker. They differ only in whether the pack
carries a localization entry for the identifier and what the script writes to `nameTag`.

| identifier | `.lang` entry | script sets `nameTag` to |
|---|---|---|
| `probe:lang_only` | yes | nothing |
| `probe:no_lang` | **no** — the control | nothing |
| `probe:lang_and_tag` | yes | `Literal Tag` |
| `probe:tag_is_key` | yes | the key `entity.probe:tag_is_key.name` |
| `probe:tag_is_rawtext` | yes | `{"rawtext":[{"translate":"entity.probe:tag_is_rawtext.name"}]}` |

`en_US.lang` and `de_DE.lang` carry different strings (`… EN` / `… DE`) so that "the file is read
at all" is separable from "it is read for the player's own language".

## Running it

Both packs must reach a **client**, not just a server — install the `.mcaddon` locally and play on
a local world, or install the resource pack client-side and the behavior pack on the server.

```sh
cd packs/behavior_pack && zip -r ../../probe_bp.mcpack . && cd -
cd packs/resource_pack && zip -r ../../probe_rp.mcpack . && cd -
zip probe.mcaddon probe_bp.mcpack probe_rp.mcpack
```

Then, in a creative world with both packs active:

1. `/scriptevent probe:run` — five entities spawn in a row six blocks ahead.
2. Walk up to each and **read what is above it**. Record the exact string, or its absence.
3. Capture the chat output the script wrote (`localizationKey` and `nameTag` per entity).
4. Quit to the main menu, set the language to **Deutsch**, rejoin, and read all five again.
5. Record both readings per entity. A screenshot per language is the durable form.

The row is re-readable: a second `/scriptevent probe:run` removes what the last one spawned.

## What each outcome changes

This is why the question is worth answering rather than assuming. The readings pick between three
different designs, and they are not small differences for a player.

**A — `lang_only` shows a plate reading "Lang Only EN", and "Lang Only DE" in German.**
The name moves into the pack. `d-bfdql5tx` and `d-kklnm4j4` are superseded: the library stops
writing a name at spawn, an actor's default name reaches every player in their own language, and an
adventure overrides a preset's name by contributing its own `.lang` entry — which the kit composes
rather than letting one pack win — instead of calling the library. This is the outcome
`b-ejavoqeh` assumes.

**B — `lang_only` shows no plate, and `tag_is_key` / `tag_is_rawtext` show their literal strings.**
Then a `.lang` entry names the entity type for the surfaces that use the type's name and puts
nothing above it, and a plate is literal text with no translation route. Moving the name into the
pack would trade a name every player reads for one most never see. `d-bfdql5tx` and `d-kklnm4j4`
stand, `b-ejavoqeh` is closed as not worth doing, and at most the pack carries a `.lang` entry
*beside* the library string — two sources for one name, which is a cost rather than a feature.

**C — `lang_only` shows no plate, but `tag_is_key` or `tag_is_rawtext` resolves to the translated
string.**
The best of the three, and the one nobody would guess. The pack carries the localization entry and
the library keeps writing a `nameTag` — but writes the *key* rather than the string. Visible and
translated. `d-bfdql5tx` is superseded on where the text lives, `d-kklnm4j4` becomes a key rather
than the literal `Wizard`, and an adventure still overrides by `.lang`.

Two readings sharpen whichever case lands:

- **`lang_and_tag`** says which wins when both exist, which is what an adventure's per-actor
  display-name override (`d-o9lynydc`'s `options`) has to compose with.
- **`no_lang`** is the control. If it shows a plate, something other than the `.lang` file is
  naming these entities and every other reading needs re-reading.

## Why it matters now rather than later

Where a name lives is visible to players, so changing it after adventures ship changes what their
players read — `d-d4yzvu0o` already treats the identifier as a consumer-visible string for the same
reason. And `d-nyh4i1x1` has already admitted the content kind, so the pack *may* carry the entry
today; the only thing not established is whether carrying it accomplishes anything.
