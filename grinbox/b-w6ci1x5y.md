---
tags:
  - digests
  - backends
---

# Grinbox's own mail should be identifiable by a header

A digest grinbox sends is re-ingested as an ordinary arrival, and a user who wants to act on those
mails — archive them after a delay, categorize them, keep them out of a digest — has nothing exact
to match on. The send path builds only `To:` and `Subject:` (`resources/gmail.ts`), so grinbox's own
mail is indistinguishable from anything else the user sends themselves.

Today the workaround is a rule matching the sender plus a subject substring:

```
from_email == "<me>" and to contains "<me>" and subject contains "digest"
```

That works because the subject is `<operator name> — <date>` and the editions happen to be named
`…digest`. It is coupled to the operator's name — renaming an edition silently stops the match —
and it still admits a note the user mails themselves with "digest" in the subject.

## What to build

Stamp a header on mail grinbox sends, naming grinbox and what sent it — the operator, or at least
that it is a digest. The expression reader already reads `header.<lowercased-name>`, so a rule
becomes exact and rename-proof:

```
header."x-grinbox-edition" != ""
```

Worth deciding: whether the header names the edition (couples to a name again, but usefully — one
rule per edition becomes possible) or only the kind of mail, and whether every grinbox send carries
it or only digests. The send operation is a resource operation every mail backend implements
(d-q2hx8vlm, d-rd986rrt), so a header belongs to the operation rather than to one backend.

Real case: prod-grinbox, 2026-08-12 — two delayed-archive rules for grinbox's own digests and for
USPS Informed Delivery, whose subjects both read "Daily Digest".
