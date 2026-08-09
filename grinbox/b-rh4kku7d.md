# Link a notification back to the message, properly

Grinbox currently puts a mail-provider deep link on every notification and on the
message-detail view, built from one shared helper that names the provider and
hard-codes its first signed-in-account slot. It does not work: on a phone, where
Pushover notifications land, the link opens an unauthenticated page and does not
resolve to the right message. Increment 007 drops it rather than keep a broken
affordance that also breaches r-etj0gluz.

Getting the user from a notification to the message is still worth having. What a
working version needs:

- the link supplied by the backend rather than composed from a provider name, so
  a second backend brings its own and one that has none simply has no link
- resolved when the message is taken in and stored with it, not fetched at send
  time — notify declares only its notification operation, and reaching a mailbox
  at send time would widen what an operator may reach (d-v5zamgjn)
- something that actually opens the right message on a phone, authenticated,
  which is the part that is unsolved rather than merely unbuilt

Raised while ruling q-urj6g53b in 007.
