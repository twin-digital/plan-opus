# reload file-set probe — which file-set changes actually need a restart

`d-ftlfhac8` restarts the server for "an added or removed file". One case under that heading was
evidenced — a module file reached through an `import`, first deployed after world load, fails to
resolve — and the rest was extrapolation. This probe tests the rest, which matters because the build
bundles scripts to a single entry file: nearly every file-set change an author makes is a non-script
asset rather than a module.

## Result

| change | file set | reload enough? |
|---|---|---|
| edit an existing function's content | unchanged | **yes** — the new content is live |
| add a function nothing imports | grew | **no** — the function stays absent until a restart |
| remove a function nothing imports | shrank | **yes** — the removal takes effect at once |
| add a module file the entry imports | grew | **no** — missing-import error (the control) |

Reading the line `existing=ran(1)wrote(2)`: the function ran, and the value it wrote was 2 rather
than the 1 its pre-edit content wrote. `added=ran(0)` is a function that does not exist —
`runCommand` succeeds with a success count of zero. `spare` going from `ran(1)` to `ran(0)` across
case 3 is the removal landing.

**So the restart trigger is an *added* file, not a changed file set.** A removal needs no restart,
and neither does an edit — including an edit to content that is not a script.

## The observable, and two that failed first

`send-command` replies do not reach the container log. `say`, `list` and `function` all produce
nothing there; only server events like the reload acknowledgement do. An earlier pass of this probe
scored every case on those replies and read `<nothing>` throughout, which would have looked like a
uniform failure and meant nothing at all.

`runCommand("function <name>").successCount` fixed existence but not content: it reports whether the
function command succeeded, not what the function did, so an edited function and an unedited one
both read `ran(1)`. The functions therefore write a scoreboard value and the script tests it back,
which is what makes case 1 decisive.

Case 4 is a positive control that must fail, and does. Without it a row of passes could not be told
from a rig that had stopped detecting anything — which is exactly how an earlier probe in this
directory went wrong.

## Scope

One engine build, 1.26.40.8. The non-script content tested is a **function**. Entity, item and block
definitions and textures are not tested here, and
`f:bedrock-reload-updates-scripts-not-pool-or-manifest` records Microsoft documenting those as
reloading only partially or not at all — so "the file set did not grow" is not on its own a promise
that every kind of edit is live. What this probe establishes is that a *growing* file set is what
the engine cannot absorb, and that functions behave like scripts for edits and removals.
