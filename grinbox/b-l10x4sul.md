# one digest across every account and pipeline

Raised by the owner reviewing 013: a single daily digest, delivered to Gmail, consolidating
everything grinbox triaged across all accounts and all pipelines — rather than the per-account,
per-pipeline digest the design has now.

What stands in the way. d-p3vd6kxz fires an edition once per account its pipeline is active on,
covering that account's mail and sending through that account. A consolidated digest inverts
all three: it covers many accounts, belongs to no pipeline in particular, and is sent through
one account the user names rather than the one the mail arrived on. d-5h66e3zl matters here too
— an IMAP account cannot send, so the sending account has to be chosen rather than derived.

What to work out: whether the edition hangs off the user rather than a pipeline; how coverage
spans (d-8wqk2nvy) and the once-only guarantee (r-j2wn9xtb) work when one message could be
claimed by a per-pipeline edition and the consolidated one; how sections and categories compose
across pipelines that do not share a tag vocabulary; and which account sends it.

Worth deciding early whether this replaces per-pipeline digests or sits beside them.
