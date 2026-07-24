# How the harness decides a package is a behavior pack

Living record for the pack-detection decision. Update it whenever the decision moves.

## The rule the choice has to satisfy

A package is a pack because of what it *contains*, under the Bedrock add-on format — not because
of how any particular repository is wired. Conventions of the surrounding monorepo (where a
package sits, which shared build config it depends on, what a repo sync tool writes into it,
which release script it runs) are **excluded from the choice by owner fiat**, not merely ranked
below the content rules. They are not pinned as facts for this design, so nothing here may rest
on them. They appear in the table below only to show what they would have selected.

The format itself supplies the test. `manifest.json` is what defines an add-on pack; the header
`uuid` identifies it, the header `version` versions it, and a module's `type` says what kind of
pack it is — `data` for behavior content, `script` for scripting, `resources` for a resource pack.

## What was measured

`detect-probe.mjs` scores each candidate rule against a real 41-package pnpm workspace
(`twin-digital/opus`, ref `archive/minecraft-prototype`, `4e731f5b`), reading packages from git
without a checkout or a build. `OUTPUT.txt` is the captured run.

Ground truth is derived from pack content under the format — a committed `manifest.json` with a
header uuid and a `data` or `script` module — and yields two packs. The workspace also holds three
packages that a careless rule mistakes for packs: a library that scripts against the Minecraft
API, the packs' shared build config, and the dev harness itself.

Because ground truth is the format's own test, a *format* rule agreeing with it is definitional
rather than evidence. What the scoring actually measures is how far every other kind of rule
drifts from the format's answer.

| kind | rule | result |
|---|---|---|
| format | `manifest.json` with a header uuid and a `data` or `script` module | the test itself |
| format | any `manifest.json`, unexamined | same selection here, but blind to kind — a resource pack or a fixture manifest passes |
| heuristic | dependency on the Minecraft scripting API | 1 false positive — the shared library scripts against the API and is not a pack |
| heuristic | has both `build` and `watch` scripts | 3 false positives, all unrelated to Minecraft |
| heuristic | package name matches `/pack/` | misses both packs, 1 false positive |
| heuristic | `package.json` marker field | selects nothing — no package carries one |
| heuristic | `keywords` naming a pack | selects nothing — no package carries one |
| external | directory location under `minecraft/` | 3 false positives (excluded from the choice regardless) |
| external | shared pack build-config dependency | (excluded) |
| external | repo sync tool's build fragment | (excluded) |
| external | repo's release-assets script | (excluded) |
| build output | a built `dist/manifest.json` | works only after a build; invisible on a clean checkout |

## Why the chosen rule is the chosen rule

**Chosen: a committed pack manifest with a header uuid and a `data` or `script` module.**

- It asks the pack what it is. The manifest is the file that makes a directory a pack under the
  format — the same file the server reads to identify and load it. Nothing else in a package is
  authoritative about packhood; everything else is a proxy for it.
- It needs nothing added. A marker field would have to be introduced to every pack and then
  remembered for the next one, and it selects nothing today. The manifest is already there and is
  hand-authored.
- Reading the module type is what keeps the rule correct as scope grows. Behavior packs are
  required and other addon content is optional, and a resource pack's manifest is
  indistinguishable from a behavior pack's until its modules are read — so an unexamined manifest
  would silently push one into the behavior pool.
- Requiring the header uuid turns a malformed manifest into a discovery error rather than a pack
  that fails to load in silence: the activation list keys on that uuid, and the server reports
  nothing when it is wrong.
- It is visible before any build, so discovery works on a clean checkout — which a built-output
  rule cannot do.

Cost of being wrong: a committed manifest that is a fixture or a vendored sample is picked up as a
pack. Discovery lists what it found, so this is visible rather than silent.

## What would move the decision

- Packs stop committing a source manifest because a generator assembles the whole manifest at
  build time — the built-output rule becomes the only pre-deploy evidence, and discovery has to
  run after a build.
- A pack has to ship from somewhere that is not a workspace package — membership, not the
  manifest, becomes the binding constraint.
- Resource packs become required rather than optional — the module-type test stops being a filter
  and becomes a router with two destinations, each with its own pool and world list.
