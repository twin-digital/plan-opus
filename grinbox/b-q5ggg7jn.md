# hold an IMAP connection open instead of one per poll

d-p82gksff has grinbox open a connection when a poll comes due and close it when the poll
finishes, tolerated by the owner with this held for later. IMAP is a session protocol and a
connection carries state worth keeping — the selected folder, CONDSTORE's modseq, and the
server's own per-login cost. A persistent connection would also open the door to IDLE, where
the server announces an arrival rather than waiting for the next interval, which is a different
and better answer to arrival latency than shortening the poll cadence.

What to work out: how many connections a deployment holds across many accounts, what happens
to one that drops, whether the heartbeat still drives anything, and how it sits with
d-v55lpt3t's one-connection-per-account rule.
