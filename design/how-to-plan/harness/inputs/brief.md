# Brief — harness

## What this design is for

Specify the machinery that holds the quality line without my attention: what runs, when it
runs, what it may decide, and what it must only report.

## In scope

- The checker: schema and citation validation, and the views it derives.
- Where it runs from — hooks, and eventually CI.
- The two readers: a coherence reviewer for implementation drift, a citation auditor for
  whether a citation supports the claim it sits on.
- Packaging the whole thing so it travels to another repo.

## Out of scope

- What the rules *are* — those belong to `doc-structure`; this design enforces them.
- Judgement calls the machine may not make. Abort stays mine.

## Done looks like

A malformed or incoherent design fails loudly before I read it, and everything the machine
flags is either actionable or evidence the rule was wrong.

## Known tensions

- Two rules already have no mechanical backstop — whether a citation is apt, and whether a
  deferred unknown is genuine or a dodged gate. More may accumulate.
- Building the harness before running the loop by hand is the premature-structure mistake
  this project is against.
