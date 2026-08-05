# Capturing the built-in operators

Third increment of the grinbox capture, stacked on `wip-002`. Where 002 captured the primitive,
this captures what actually ships inside it: the six built-in types, the gate they share, the two
taggers' shapes, the placeholder grammar every template is written in, and what the actions do to
the user's mailbox.

## What was read

`packages/shared/src/operators.ts` — the configuration shapes, which the code calls the source of
truth the design documents defer to — with `contract.ts` for how each type's declarations are
derived, and `packages/server/src/operators/built-ins/` for the runtime: the two taggers, the
three actions, the gate, the template renderer, the match-expression reader, and the extracted-value
normalizer. `docs/glossary.md`'s Built-ins section carries the intent.

## The bound-or-free split

**Bound.** The closed set of types. That the gate is one shape on every type, reading a closed
enum, checked at save. That an LLM tagger produces all its outputs in one call. The normalized
forms extracted values take. That a rule-based tagger has one output and a required default field
rather than a wildcard rule. That rules are expressions over tags and message fields, read by
grinbox rather than executed. That one placeholder grammar covers every composed text, and that
the tags a template names are what order it. That an unknown placeholder is refused at save and
empty at run time, and that field checks never run at enqueue. That applying a category adds and
archiving takes only the inbox marker.

**Free.** The prompt framing grinbox appends around the user's template. Which model a tagger
defaults to. The length cap on extracted text and the rendered-body cap. The expression reader's
implementation and its precedence table. The wording of every save-time error. Which fields the
message view exposes under which names.

**Left for later increments.** The digest type's own semantics — its schedule, coverage window,
sections, and reconciliation — belong to `wip-005`; this increment names the type as a member of
the set and stops there. Credentials and the mail backend an action reaches through belong to
`wip-004`.

## Two things worth the owner's eye

**`r-ziitim35` is the strongest fiat in the capture so far** — no effect on a mailbox loses mail.
It is what `d-ypmi8g3g` is written against, and it is also the reason the roadmap's aggressive
archiving is safe to pursue. If it is too strong — if a delete action should be possible one day —
this is the increment to say so.

**`r-5ezt7j0v`, that a stored configuration keeps working**, is captured from a choice the code
makes deliberately and twice: an unknown placeholder is refused at save but rendered empty at run
time, and single-operator field checks are kept out of the enqueue path on purpose. Both read as
sloppiness until you see the requirement they serve.
