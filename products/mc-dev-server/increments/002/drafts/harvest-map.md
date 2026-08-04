# Harvest map: branch design/minecraft-dev-server → mc-dev-server increment 002

Working material for this increment's Plan loop. The unmerged branch `design/minecraft-dev-server`
(tip c43cefe) carried a full in-flight spec cycle for the dev-server — sixteen proposed decisions,
a 263-line `spec.md`, five open questions, and a components block — that increment 001's
conversion never saw: PR #152 read `main` only, where the legacy design was still `exploring`,
and its conversion map recorded "the legacy design was exploring and had no `decisions.yaml` and
no `spec.md` to harvest". By owner ruling of 2026-08-04 that cycle re-enters here as the starting
point of the product's Plan loop: every decision as `proposed` for the owner to rule through this
increment's PR, every open question carried, the draft spec copied as raw material the fold
outranks.

## Decisions (16 harvested, all re-entered as proposed)

Statements verbatim from the branch's `decisions.yaml`; each `because:` is lifted from the
citations `spec.md` attaches to the decision, with legacy slugs mapped as below.

| old slug | new id |
|---|---|
| deploy-transport-is-cp-and-console-exec | d-thagewn2 |
| generated-compose-file-is-fully-resolved | d-4oyvz42j |
| server-image-pinned-with-console-helper | d-imhq2v4w |
| world-state-lives-in-a-named-volume | d-ihbu9tu5 |
| both-pack-kinds-are-routed-by-declared-kind | d-br873uo4 |
| activation-version-read-from-the-built-manifest | d-snejjjs6 |
| live-reload-limited-to-active-behavior-pack-content | d-pz0ibyit |
| changed-pack-set-is-an-input-to-the-reconcile | d-6m4kq00z |
| start-builds-once-before-the-first-reconcile | d-dsrjqw4m |
| reconcile-reads-live-server-state | d-xz2c1pl7 |
| packages-rebuild-and-the-harness-watches-built-output | d-hgci9q17 |
| readiness-is-the-world-load-pack-stack-line | d-40xln0zd |
| selection-is-flags-with-workspace-profiles | d-ezr24i10 |
| command-surface-is-start-and-stop | d-5ug7kj46 |
| activity-and-server-output-share-one-tagged-stream | d-1jvib0dk |
| content-changes-are-recopied-not-compared | d-bd2t71wn |

Pinning is proposed on the two consumer-facing surfaces — d-ezr24i10 (the flags and the
checked-in config file) and d-5ug7kj46 (the verbs) — and on nothing else.

## Open questions (5 carried)

| old slug | new id | routed to |
|---|---|---|
| pack-set-entry-built-output-location | q-7ssvrzhv | fact |
| built-output-is-per-pack-or-per-package | q-ivw91zit | fact |
| kit-build-invocation | q-g13pltdt | fact |
| activation-list-edit-without-a-restart | q-rtjmsq1r | fact |
| console-command-for-a-newly-pooled-pack | q-h2uaejbd | fact |

All five close as facts: what the kit offers is documented by the kit's published foundations,
and the two server questions close with a probe or a documented source. Each question's text
names the harvested decisions it gates, carrying the branch's `gates:` lists forward.

The pool has moved under the first two since the branch stranded:
`f:dev-kit-reports-a-fixed-kind-named-output-location-and-writes-none` (from mc-dev-kit's
published requirements) fixes the output location as computed and kit-reported — `dist/` with one
kind-named subdirectory per pack, a single-pack package included. That bears on most of
q-7ssvrzhv and all of q-ivw91zit; the Plan loop closes them against it rather than re-probing.

## Requirements

None proposed. The branch's requirements were converted by increment 001; `because:` citations
here use those ids (001's `drafts/conversion-map.md` holds that mapping).

## Adaptations

Two fact slugs the branch cites no longer exist in the pool; citations moved to the facts that
now carry the claims:

- `f:dev-kit-pack-built-output-defaults-to-dist` →
  `f:dev-kit-reports-a-fixed-kind-named-output-location-and-writes-none`
- `f:server-load-output-reports-only-activated-behavior-packs` →
  `f:pack-kind-mismatch-fails-silently-at-the-server`

## Not carried

- **Falsifiers.** The branch's decision entries each carried a `falsifiers:` list under the old
  doc-structure regime. The current decision schema has no such field, and `revisit_when` is
  explicitly not a falsification regime, so they are not re-entered; they remain readable at the
  branch tip (c43cefe, `design/minecraft/dev-server/decisions.yaml`).
- **The components block.** `spec.md`'s fifteen-component breakdown travels only inside the
  copied draft; nothing normative is made of it until the Plan loop composes the spec.
