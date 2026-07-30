# Blind build plan — how-to-plan/doc-structure

Derived ONLY from: brief.md, requirements.yaml (design + area + global, via `bin/foundations.mjs
how-to-plan/doc-structure`), decisions.yaml, and the fact pool. `spec.md` and `bin/check-design.mjs`
not read.

Note up front: **doc-structure's own foundations cite no facts.** `grep '\[\[f:' ` over brief.md,
requirements.yaml, decisions.yaml returns nothing. The facts that describe this format
(`facts/design-authoring.yml`) are *downstream* — they quote doc-structure's requirements so that
*other* designs can cite the format. So every fact-derived input below is inference, not citation.

---

## 1. On-disk layout

```
<repo root>/
  design/
    requirements.yaml        # global tier
    sets.yaml                # global sets (may span areas)
    <area>/
      requirements.yaml      # area tier
      sets.yaml              # area sets (that area's designs only)
      <design>/
        brief.md             # INPUT
        requirements.yaml    # INPUT  (design tier)
        decisions.yaml       # OUTPUT
        spec.md              # OUTPUT
        artifacts/           # optional; captured test material
  facts/                     # any *.yml|*.yaml at any depth is a fact file
  evidence/                  # any *.yml|*.yaml at any depth is a run file
  products.yaml
```

- Exactly three requirement tiers; areas do not nest (`r:three-tiers-hold-requirements`).
- No `facts.yaml` at any scope — facts are one pool (`r:facts-live-in-one-pool`). The retired
  `three-tier-scopes` / `three-tiers-hold-foundations` entries show the pool replaced per-scope
  fact files; do not reintroduce them.
- A design directory is the only place a `spec.md`/`decisions.yaml` may sit
  (`r:design-inputs-and-outputs-split`). Nothing upstream writes into the two output files;
  regeneration may overwrite them and must never touch brief.md or requirements.yaml.
- **[CHOSE]** `.yml` and `.yaml` are both accepted extensions in the pools; anything else under
  `facts/`/`evidence/` (README.md, .gitkeep) is ignored rather than an error. The requirement says
  "any YAML file at any depth", which is silent on extension spelling.

## 2. `spec.md` structure

Required order (`r:fixed-outer-sections`, `d:fixed-section-headings`):

1. **[CHOSE]** an optional H1 title line (`# Spec — <design>`), mirroring `brief.md`'s `# Brief —
   <design>`. Nothing in the foundations grants or forbids it; a checker that rejected an H1 would
   be hostile, so I allow exactly one leading H1 and require nothing of its text.
2. `## Summary` — required, always first.
3. `## Open questions` — required *iff* the design has open questions; forbidden otherwise. Sits
   immediately after Summary.
4. The specification body — one or more free-form H2 sections, author-chosen headings. **[CHOSE]**
   no constraint on their names or count; the foundations only fix the outer three.
5. `## Components` — required *iff* the design has components; forbidden otherwise. Always last.

Decisions do **not** appear in the document (`r:fixed-outer-sections`) — they live only in
`decisions.yaml`. There is no `## Decisions`, no `## Facts`, no `## Requirements` section: those are
foundation files, and the spec reaches them by citation only.

Heading text is exactly `## Summary`, `## Open questions`, `## Components` — H2, that capitalisation
(`d:fixed-section-headings`). **[CHOSE]** match case-sensitively; the decision names "these exact
strings" and names a rename cost as its falsifier, which only bites if matching is exact.

### Live blocks

- `## Components` holds exactly one ```` ```yaml ```` fenced block; `## Open questions` likewise
  (`r:one-block-per-kind`, `d:live-blocks-identified-by-section`).
- Each live block is a YAML **mapping with exactly one top-level key naming its kind**
  (`r:blocks-are-keyed-mappings`), whose value is a sequence of entries.
- **[CHOSE]** the two key names are `components:` and `open_questions:`. The requirement says the
  key "names its kind" without spelling it; `questions:` and `open-questions:` are equally
  defensible. This is the single highest-risk guess in the plan — a checker and an author who
  choose differently produce documents that will not validate against each other.
- Any ```` ```yaml ```` block *outside* those two sections is illustrative: not parsed, not
  validated, need not be a keyed mapping (`r:blocks-are-keyed-mappings`,
  `r:one-block-per-kind`).
- `d:examples-fenced-as-non-yaml` is **rejected** — so an illustrative example *may* carry the
  `yaml` info string and get highlighting. Section placement alone separates live from
  illustrative. A checker must therefore not key on the info string to find live blocks; it must
  key on the enclosing H2.

## 3. Entry schemas

Every field set below is **closed**: a key outside it is an error, not ignored
(`r:entry-schemas-are-closed`). Every `id` is kebab-case, stable, and unique **per kind across the
whole repository** (`r:ids-unique-repo-wide`, `r:ids-unique-per-kind`) — a repeat at a nearer scope
is an error, never an override. Every field with a sensible default is omitted at its default,
except a decision's `status`, which is always written (`r:defaults-are-omitted`,
`r:foundation-default-fields` soft).

### Fact — `facts/**/*.yml`, bare top-level sequence (`d:block-and-file-encoding`)

| field | req? | type / values |
|---|---|---|
| `id` | required | kebab-case string, unique among facts repo-wide |
| `claim` | required | string, states the fact |
| `backing` | required | `tested` \| `documented` \| `assumed` |
| `sources` | required | sequence, ≥1 |
| `status` | optional | `active` \| `retired`, default `active` |
| `reason` | required iff retired | `superseded` \| `disproven` \| `stale` |
| `superseded_by` | required iff `reason: superseded` | fact id |
| `caveat` | optional | string |

Source — exactly one locator per source (`r:fact-sources-take-one-locator`):

| form | fields |
|---|---|
| documented | `url` + `where` + `quote` |
| run | `run` (a run id) + `where` + `quote` |
| assumed | `description` |

- `quote` is always a block scalar `quote: |`, even one line (`r:quote-is-block-scalar`).
- A url pointing inside this repo is written **repo-root-relative**, not file-relative
  (`r:repo-relative-source-paths`) — so `design/how-to-plan/authoring/requirements.yaml`, never
  `../authoring/requirements.yaml` and never a `https://github.com/...` blob URL.
- **Backing floor** (`r:backing-demands-its-locator`): at least one source must take the form its
  backing demands — `tested` → a `run`, `documented` → a `url`, `assumed` → a `description`.
  Further sources may take any form.
- A url pointing into an `artifacts/` directory is legal **only** on a `tested` fact
  (`r:artifact-sources-back-tested-facts`). No scope restriction — the retired
  `artifact-sources-back-only-tested-facts` shows the "own scope or wider" clause was dropped.
- `topics` is **not** a field: `d:facts-carry-topic-tags` is rejected.
- **[CHOSE]** `run:` holds a run **id**, not a path. `r:runs-live-in-one-pool` gives runs
  repo-unique ids and `r:facts-live-in-one-pool` says paths carry no meaning to resolution, so an
  id is the only stable handle. A checker resolves `run:` against the evidence pool.
- **[CHOSE]** `where` on a `run` source points into the run's captured `output`; the checker does
  not verify the quote appears there (that is authoring's problem), only that the run id resolves.

### Requirement — `requirements.yaml` at any of the three tiers, bare sequence

| field | req? | type / values |
|---|---|---|
| `id` | required | kebab-case, unique among requirements repo-wide |
| `statement` | required | string |
| `force` | optional | `hard` \| `soft`, default `hard` |
| `status` | optional | `active` \| `retired`, default `active` |
| `rationale` | optional | string |
| `applies_to` | optional | sequence of `<area>/<design>` or `set:<name>` |

- `applies_to` is **valid only above design scope** — present on a design-tier requirement is an
  error (`r:requirement-entry-structure`). Omitted above design scope, the requirement binds its
  whole tier (`d:omitted-binding-means-the-whole-tier`).
- Binding never widens (`r:binding-narrows-within-the-tier`): an area requirement's `applies_to`
  may name only designs in that area; a set it names must resolve to designs within the tier.
- **[CHOSE]** a retired requirement carries **no** `reason` / `superseded_by`. Facts and runs get
  those fields explicitly and requirements do not, and the schema is closed — so a retired
  requirement cannot say why. I would build it this way and note it as a rough edge.
- No `exception` field, no per-design carve-out: a departure from a soft requirement is recorded as
  a decision citing it (`r:soft-departures-are-decisions`).

### Decision — `decisions.yaml` beside `spec.md`, bare sequence

| field | req? | type / values |
|---|---|---|
| `id` | required | kebab-case, unique among decisions repo-wide |
| `statement` | required | **single line** naming what was chosen |
| `status` | required, always written | `proposed` \| `accepted` \| `tolerated` \| `rejected` |
| `falsifiers` | required unless `rejected` | sequence, ≥1 |

- `statement` names what was chosen — not why, not what it entails (`r:decision-structure`). The
  "single-line" constraint is semantic, not physical: a folded/block scalar spanning source lines
  is fine, one sentence is the rule. **[CHOSE]** the checker does not enforce sentence count.
- A decision is **not** citable outside its own design (`r:decision-citations-stay-in-their-design`,
  `r:decisions-belong-to-their-design`). A rejected decision is retained, blocks nothing, and may
  not be cited (`r:rejected-decisions-are-closed`).
- No `rationale` field — the schema is closed and lists none.
- **[CHOSE]** a rejected decision *may* still carry falsifiers (several in the tree do); the rule
  is only that it needs none.

### Component — live block under `## Components`

| field | req? | type |
|---|---|---|
| `id` | required | kebab-case, unique among components repo-wide |
| `responsibility` | required | one line |
| `excludes` | optional | the nearby responsibility it deliberately does not hold |
| `depends_on` | optional | sequence of component ids that must land first |

**[CHOSE]** all four field names. `r:component-structure` gives the *data*, not the spelling.
`name`/`not`/`after` are equally consistent with the requirement.

### Open question — live block under `## Open questions`

| field | req? | type |
|---|---|---|
| `id` | required | kebab-case, unique among questions repo-wide |
| `question` | required | the question |
| `closed_by` | required | `fact` \| `requirement` \| `decision` |
| `gates` | optional | sequence of decision ids this question blocks |

**[CHOSE]** the field names `closed_by` and `gates`. A question is never citable
(`r:question-structure`, `r:foundations-are-the-citable-kinds`).

### Run — `evidence/**/*.yml`, bare sequence

| field | req? | type |
|---|---|---|
| `id` | required | kebab-case, unique among runs repo-wide |
| `command` | required | reproduces the run |
| `output` | required | repo-relative path to captured output |
| `ran_at` | required | `YYYY-MM-DD` |
| `environment` | optional | versions / fixtures / state |
| `status` | optional | `active` \| `retired`, default `active` |
| `reason` | required iff retired | `superseded` \| `stale` \| `invalid` |
| `superseded_by` | required iff superseded | run id |

One run = one execution and the output it captured; a directory of probes yields several runs
(`r:one-run-is-one-captured-output`). A run is not a foundation and no claim may cite it — there is
no `[[run:...]]` kind (`r:runs-live-in-one-pool`, `r:citation-token-grammar`).

### Sets — `design/sets.yaml`, `design/<area>/sets.yaml`

A **mapping**, not a sequence: name → sequence of `<area>/<design>` scopes
(`r:binding-sets-are-declared-once`). Names unique across the repository. An area's set holds only
that area's designs; a global set may span areas. No set holds another. A design does not declare
its memberships (`d:set-membership-is-declared-by-the-set`).

## 4. Citations

- Grammar: `[[<k>:<id>]]`, `k` ∈ `f` (fact) | `r` (requirement) | `d` (decision)
  (`r:citation-token-grammar`). **[CHOSE]** id matches `[a-z0-9]+(-[a-z0-9]+)*`; no whitespace
  inside the brackets.
- Only the three foundation kinds are citable (`r:foundations-are-the-citable-kinds`). Components,
  open questions, and runs are not.
- A token inside a fenced block or an inline-code span is **text**: resolves to nothing, satisfies
  no obligation, and is not an error (`r:citations-in-code-are-not-citations`). The checker must
  strip fenced blocks and inline-code spans before scanning.
- Resolution (`r:resolution-is-scope-blind`): match the id against every entry of that kind in the
  three scopes the citing design sees; **exactly one** match required, any other count is an error.
  Scope-blind is safe only because ids are unique per kind repo-wide.
  - `f:` resolves against the **whole pool** (`r:facts-resolve-repo-wide`).
  - `r:` resolves against the citing design's own + its area's + global requirements — and, per
    `r:requirement-binding-is-explicit`, a requirement is only *binding* if its `applies_to` reaches
    the design. **[CHOSE]** a design may *cite* any requirement in its three tiers, bound or not;
    binding governs obligation, not reach.
  - `d:` resolves only within the citing design's own `decisions.yaml`.
- The target must be **live**: an active fact/requirement, a non-rejected decision. A retired or
  rejected target is an error (`r:retired-entries-are-closed`, `r:rejected-decisions-are-closed`).
- Every citation must belong to a claim that genuinely rests on it (`r:explicit-intent`) — but that
  is a judgement, not mechanical. Mark it unenforced.

## 5. Design status

`r:status-derived-from-content`, `r:design-status-enum`, `r:publication-is-a-separate-axis`:

- no `spec.md` → **exploring**
- `spec.md` with any proposed decision, any open question, or any uncited live design-scoped
  requirement or accepted-or-tolerated decision → **draft**
- otherwise → **settled**
- `published` is an orthogonal boolean: settled **and** merged to main. Not a fourth state.

Nothing is built on a design until published (`r:only-published-work-licenses-building`).

## 6. Invariants the checker enforces

**Layout**
1. `design/<area>/<design>/` is the only place spec.md / decisions.yaml sit; areas do not nest.
2. No `facts.yaml` under `design/`; no requirements file below design scope.
3. Every file directly under `facts/` (recursively) parses as a sequence of facts; same for
   `evidence/` and runs.

**spec.md**
4. `## Summary` present and first (after an optional H1).
5. `## Open questions`, if present, sits immediately after Summary; present iff the design has
   questions.
6. `## Components`, if present, is the last H2; present iff the design has components.
7. Exactly one `yaml` fenced block under each fixed section.
8. Each live block is a mapping with exactly one top-level key, that key naming the kind.

**Entries (all kinds)**
9. Required fields present; no field outside the closed set.
10. Enum fields hold only permitted values.
11. `id` kebab-case; unique per kind repo-wide.
12. Fields at their default are absent — except decision `status`, which is present always.

**Facts**
13. ≥1 source; each source carries exactly one of `url` / `run` / `description`.
14. `url` and `run` sources carry `where` and `quote`; `description` sources carry neither.
15. `quote` is a block scalar.
16. ≥1 source in the form `backing` demands.
17. An `artifacts/` url appears only on `backing: tested`.
18. A repo-internal url is repo-root-relative and resolves to an existing file.
19. `retired` ⇒ `reason`; `reason: superseded` ⇒ `superseded_by` resolving to an active fact.

**Requirements**
20. `applies_to` absent at design scope.
21. Each `applies_to` item is `<area>/<design>` or `set:<name>`; each resolves.
22. Binding narrows within the tier — no area requirement reaching outside its area.

**Decisions**
23. ≥1 falsifier unless `rejected`.
24. `status` written explicitly.

**Sets**
25. Set names unique repo-wide; no set names another set; area sets hold only that area's designs.
26. **[CHOSE]** a member naming a nonexistent design **fails the check**.
    `d:dangling-members-are-reported-not-rejected` is *rejected*, so reporting-only is off the
    table; failing is the remaining option.

**Citations**
27. Every token outside code matches the grammar.
28. Every token resolves to exactly one live entry of the named kind, within its fence.
29. Tokens inside fences and code spans are ignored entirely.

**Status / settle gate**
30. A design's computed status is derivable; a settled design holds no proposed decision and no
    open question.
31. A settled design has a citing claim for every live requirement binding it and every
    accepted-or-tolerated decision it holds — **see [BLOCKED] 1, the scope of this is contested.**
32. **[CHOSE]** binding *coverage* — whether a design actually honours each bound requirement — is
    **not** reported by the harness. `d:binding-coverage-is-reported-not-enforced` is rejected, so
    report-only was ruled out; and enforcement is impossible mechanically. It falls to review.
33. Fact **filing** is never checked — only that a fact sits somewhere under `facts/` and is
    well-formed (`d:fact-filing-is-advisory-not-enforced`, tolerated).

**Marked unenforced** (per `r:invariants-are-enforced-or-marked`, the spec must say so explicitly
for each): id stability across a meaning change; `statement` being genuinely single-line; a
falsifier being real; a quote being verbatim; `explicit-intent`'s "cite what a claim rests on";
`must-beat-doing-it-myself`.

## 7. The fact index

`bin/foundations.mjs --facts` prints every fact in the repository with its scope and its backing,
generated on demand and never committed (`r:facts-can-be-found-without-walking-the-tree`,
`d:fact-index-is-generated-on-demand`). `bin/foundations.mjs <area>/<design>` prints the
requirements binding that design, nearest scope first, retired omitted.

## 8. Obligations on doc-structure's own spec

- `r:spec-shows-layout-as-tree` — a visual labelled tree of the three tiers and input/output files.
- `r:spec-shows-copyable-type-examples` — a concrete on-disk example for fact, requirement,
  decision, component, open question, and a spec.md fenced block, shown as illustration so it is
  not parsed as live.
- `r:instructs-readers-to-follow-the-format-rules` — every other rule here is documented for the
  reader.

---

## [BLOCKED]

1. **Settle-gate scope contradiction.** `r:status-derived-from-content` says draft while an
   "uncited live **design-scoped** requirement" stands; `r:settled-design-cites-what-binds-it` says
   "a live requirement **binding it**" — which includes wider-scope requirements whose `applies_to`
   reaches the design. The retired `settled-design-cites-what-keeps` and the rejected
   `d:settle-bar-stays-design-scoped` both show the narrow reading was deliberately abandoned, so I
   *believe* the broad one is current and `status-derived-from-content` is stale prose. But this is
   requirement-against-requirement: I would stop and ask the owner rather than pick. **Cost if I
   guess wrong:** every design in the tree flips between draft and settled.

2. **Live-block key names.** `components:` vs `component:` vs some other spelling; `open_questions:`
   vs `questions:`. `r:blocks-are-keyed-mappings` says only "naming its kind". Would ask.

3. **Component and open-question field names.** `responsibility`/`excludes`/`depends_on` and
   `closed_by`/`gates` are my invention. The requirements name the data, never the keys. Would ask.

4. **Whether an H1 is permitted in spec.md**, and whether anything else may precede `## Summary`.

5. **Markdown hygiene rules.** `facts/markdown-rendering.yml` holds
   `trailing-spaces-are-a-hard-line-break`, `no-inline-styles-in-gfm`, and
   `fence-info-string-is-raw-text`. Nothing in doc-structure's foundations cites any of them, so I
   cannot tell whether this format bans trailing whitespace or inline HTML. **I would not have
   built any such check.** If the spec has one, that is a real miss.

6. **`run:` locator payload** — id or path? I chose id, but nothing states it.

7. **Retired requirements cannot say why.** Closed schema + no `reason` field. Deliberate or an
   oversight? Would ask.

8. **Whether a `[[r:...]]` may cite a requirement in the design's tiers that does not bind it.** I
   chose yes. `r:requirement-binding-is-explicit` governs obligation; nothing governs reach.
