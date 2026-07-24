# Pack-detection probe

`detect-probe.mjs` scores candidate rules for "is this workspace package a behavior pack?"
against the real monorepo. `OUTPUT.txt` is the captured run — `node detect-probe.mjs
[<opus-repo> [<ref>]]`, defaulting to `/workspace/opus` at `archive/minecraft-prototype`
(`4e731f5b`), the branch that holds the behavior-pack prototype. It reads the tree through
`git`, so it needs no checkout and no build; one final pass looks at `dist/` on disk, which is
the only way to see the built-output rule.

`ADDENDUM.md` is the living record the decision refers to: every rule weighed, what each
scored, and why the chosen one was chosen. Update it when the decision moves.
