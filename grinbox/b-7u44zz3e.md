# Bound the on-demand resync

`POST /api/sync` → `resyncAllNow` lists the entire inbox unwindowed and paginated
to exhaustion, and re-ingests every previously-unknown message as a fresh arrival
— triaging mail years older than the initial window, with real outside effects.

It is the realistic path to exhausting the provider's quota, and capping the read
operations would not fix it (a capped resync half-finishes). Wants a bound of its
own: a window, a ceiling on what one invocation ingests, or a distinction between
re-fetching known mail and ingesting unknown mail.

Raised while ruling q-b97492y7 in increment 007, where the decision was to leave
read operations uncapped. Deliberately not incorporated there.
