# follow a folder's changes instead of re-reading it whole

The reconcile takes a whole-folder snapshot on a cadence — a day by default (d-gj8j4np0) — so a
message the user moves by hand keeps a stale standing in grinbox until it runs. The incremental
poll cannot help: it reads the arrival folder above a UID cursor, which sees arrivals and
nothing else.

IMAP has a cheaper answer than re-reading everything. CONDSTORE gives each folder a modification
sequence, and QRESYNC reports which messages vanished from it since a sequence the client names
— so "what changed since last time" is one command per folder rather than an enumeration whose
cost grows with the folder. Both are advertised by the servers probed so far.

What to work out: a stored per-folder sequence beside the UID cursor; what a sequence
invalidation does, as UIDVALIDITY does to UIDs; the fallback for a server offering neither, which
is fetching just the UIDs grinbox already holds rather than the whole folder; and whether the
daily whole-folder snapshot stays as a backstop or goes.

The user-visible prize: the message browser stops showing mail in the inbox that the user
archived themselves hours ago.
