# keep one connection for a whole triage and route its actions through it

d-v55lpt3t holds an account to one connection at a time, tolerated by the owner with this held
for later. A triage that fetches a body, applies a category, and archives currently makes each
call its own visit. Holding the connection for the triage's life and routing every action of
that triage through it would cost one login rather than several, and the actions of one message
are already ordered.

What to work out: where the connection's lifetime hangs (the triage, or the execution loop's
slot), what a mid-triage disconnect does to the operators that have not run, and whether a due
pending archive fired by the heartbeat joins the same connection or takes its own.
