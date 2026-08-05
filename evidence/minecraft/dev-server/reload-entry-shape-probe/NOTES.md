# reload entry-shape probe — inconclusive, and why

**This probe establishes nothing about which edits a console reload re-evaluates.** It is kept
because its failure is informative about the probe, and because an earlier revision of this file
asserted a conclusion the evidence does not support.

## What it does

One pack, loaded once, then edited and reloaded repeatedly with no restart in between. Cases
alternate: edit the module's entry file, edit a file the entry imports, and so on. The imported-file
edits are a **positive control** — an edit of that kind re-evaluated on reload in two earlier runs
(the dev-loop probe's E2, and a standalone check beside it) and in increment 007's
`reload-edits-a-loaded-file`, whose edit was to `helper.js`.

Each case reads the file back out of the container after copying it, so no case is scored on an edit
that did not land. Every expected line is unique, so the content log's suppression of byte-identical
repeats cannot hide a re-evaluation.

## Result

| | #1 | #2 | #3 |
|---|---|---|---|
| edit to the entry file | NO | NO | NO |
| edit to an imported file | NO | NO | NO |

Every copy landed — the read-back shows the new bytes on the server. Every reload was acknowledged
with `Function and script files have been reloaded.` **The positive control failed.** No reload in
this session re-evaluated the module, whichever file changed.

## What that means

A run of negatives with a failing positive control cannot distinguish "this kind of edit does not
re-evaluate" from "no edit re-evaluates in this setup". So the six negatives here, and the six in the
previous revision of this probe, say nothing about entry files versus imported files. The claim that
an entry-file edit does not re-evaluate is **withdrawn**.

## What is still unexplained

Reload re-evaluation has been observed and not observed on the same engine build, 1.26.40.8:

| run | first edit after the world load | re-evaluated |
|---|---|---|
| increment 007 `reload-edits-a-loaded-file` | imported file | yes |
| dev-loop probe E1 | entry file | yes |
| dev-loop probe E2 | imported file | yes |
| standalone check beside the dev-loop probe | imported file | yes |
| standalone check before it | entry file, single-file module | no |
| this probe, six cases | both kinds | no |

The runs that worked were late in long server sessions with many restarts behind them and other
packs sitting in the pool. The runs that failed were early in a fresh session with a single pack in
an emptied pool. That is a difference between the runs, not a demonstrated cause, and nothing here
tests it.

Anyone taking this further should hold the positive control in the same session as the question, and
vary one of: how long the world has been up, how many restarts precede the reload, and whether other
packs sit in the pool.
