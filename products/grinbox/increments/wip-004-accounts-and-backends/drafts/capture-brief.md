# Capturing accounts, mail backends, and credentials

Fourth increment of the grinbox capture, stacked on `wip-003`. It captures the seam between
grinbox and a mail backend, how new mail is noticed without losing any, and how a mailbox is
authorized and its credentials held.

## What was read

`docs/oauth-flow.md` in full, `docs/architecture.md`'s provider and backend sections, and
`docs/pipeline-runtime.md`'s account polling. Then the code: `packages/server/src/providers`,
`poll`, `oauth`, and `crypto`. The deployment side was read alongside it — the Ansible role's
secret sealing and the host's runtime configuration — because the split between what a deployment
supplies and what grinbox stores is a commitment on both sides.

## The bound-or-free split

**Bound.** The provider seam and its four operations, that a backend declares what it supports,
and that a category is the backend-neutral name for durable metadata grinbox writes. That polling
is incremental from a per-account cursor with a bounded first window, and — the one that is
invisible in the code without knowing it is a commitment — that the cursor advances last, so a
crash re-lists rather than skips. That an account with no active pipeline is left alone. That
encryption is a seam over a key grinbox is handed and never stores, with the two properties it
asks of whoever custodies it; and the deployer-managed against runtime-managed split. That
authorization starts inside and finishes at one public path guarded by a correlation token, that
what grinbox asks of its deployment is exactly one reachable redirect, that renewal stores what
comes back and a refusal retires the account, and that every permission is asked for at once.

**Free.** Which backend ships first, and everything specific to it: the particular history and
list calls, the shape of a cursor value, the deduplication key. The poll interval and the first
window's length. The cipher and its parameters. The proof-key extension on the authorization flow,
the popup rather than a full-page redirect, and how the popup hands its result back. The wording of
the account's needs-attention state.

**Left for later increments.** The digest's send path is `wip-005`; the account and credential
screens are `wip-006`.

## One claim deliberately not captured

`docs/oauth-flow.md` rests part of its deployment guidance on a claim about the mail provider's
own behaviour — that a consent screen left in testing status issues durable credentials that expire
after seven days. It is very likely true and it is not captured here, because nothing in this
repository cites the provider's documentation for it, and a fact needs that citation. It also
governs a console setting rather than any of grinbox's packages. Worth recording as a fact, with
the upstream citation, if a later increment leans on it.
