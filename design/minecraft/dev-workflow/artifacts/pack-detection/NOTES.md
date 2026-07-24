# Pack-detection probe

`detect-probe.mjs` scores candidate rules for "is this workspace package a behavior pack?" against
a real 41-package workspace. `OUTPUT.txt` is the captured run — `node detect-probe.mjs
[<repo> [<ref>]]`, defaulting to `/workspace/opus` at `archive/minecraft-prototype` (`4e731f5b`).
It reads packages through `git`, so it needs no checkout and no build; a final pass looks at
`dist/` on disk, the only way to see the built-output rule.

Ground truth comes from pack content under the Bedrock add-on format — a committed `manifest.json`
with a header uuid and a `data` or `script` module — not from any convention of the repo being
scored. Rules are labelled `format` (restating that test, so agreement is definitional),
`heuristic` (content-independent guesses, scored to show their divergence), and `external`
(conventions of the surrounding repo, reported but excluded from the choice).

`ADDENDUM.md` is the living record the decision refers to: the rules weighed, what each scored,
and why the chosen one was chosen. Update it when the decision moves.
