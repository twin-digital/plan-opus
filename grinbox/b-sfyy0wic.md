# Consider renaming 'triage'

`triage` is countable in grinbox — "a triage", "two triages", "per-triage records" — which
English does not support; the noun form reads as a coinage. The term is declared with its
countable definition (one application of a pipeline to one message), which licenses the usage,
but a rename may still be worth the wave.

Candidates weighed when this was raised:

- **`pass`** — the best alternative: "one pass of a pipeline over a message" is exactly the
  referent, the countable form is natural ("a pass that partly succeeded"), and re-triage
  becomes "a second pass", arguably clearer. No in-force entry uses the word.
- **`case`** — fits the lifecycle (opened, worked, settled, recorded against), but decision
  entries now carry `cases:` lists, so specs would hold two unrelated senses in adjacent lines.
- **`job`** — precisely "the unit grinbox enqueues, runs, settles, and records against", but it
  names how the unit executes rather than what it is, and a future scheduled unit (a delivery)
  has equal claim.
- **`run`** — unavailable: settled as one operator's execution by the vocabulary pass.
- **`sort`, `sift`, `workup`, `review`, `assessment`** — no natural countable form, obscure, or
  implying human judgment.

Cost: `triage` appears in 36 in-force entries, 14 of them requirements, plus the built code and
API — a supersession wave across most of the fold, with 14 requirement successors to ratify.
A zero-cost middle path is authoring style: prefer the possessive ("a message's triage") and
reserve bare countable uses for where compression matters.
