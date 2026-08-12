---
tags:
  - digests
---

# A digest's subject line is hardcoded

`digestSubject()` builds every digest's subject as `<operator name> — <date>`, the date rendered
`YYYY-MM-DD` in the edition's timezone. Nothing about it is configurable, so the only way to change
what lands in the user's inbox is to rename the edition operator — which also re-labels the
operator everywhere else it appears.

This is the one piece of user-facing digest text that does not go through the placeholder grammar
d-t2gm7ryx fixes for everything a user configures; sections, prose, and item lines all do. The fold
decides nothing about the subject either way — no digest decision mentions it — so it has never
been surfaced as a choice.

## What to build

An optional subject template on the edition's configuration, in the same grammar, defaulting to
today's form so stored configurations keep working (r-5ezt7j0v).

The wrinkle worth a decision: an occurrence has no subject message, so the per-message placeholders
the grammar is built on do not apply. The vocabulary here is the occurrence's own — the edition
name, the coverage dates, the item count, maybe the account. That makes it a second, narrower
placeholder vocabulary rather than a reuse of the existing one, which is the part to design rather
than assume.

Also worth settling: whether the date remains implicit when a template names none — a subject with
no date makes every digest look identical in a threaded client.
