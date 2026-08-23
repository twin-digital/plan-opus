# Capture delivery-path headers on IMAP fetch (Bcc-blind rules)

The rule language can only match headers the provider fetched. The IMAP poller
fetches a fixed metadata-header list (`METADATA_HEADERS` in `imap-session.ts`:
message-id, in-reply-to, references, from, to, cc, subject, date, list-id,
list-unsubscribe, reply-to). The Gmail client fetches `format: 'metadata'` with
no filter and gets every header.

A Bcc'd message carries no Bcc header at delivery — the submitting MTA strips
it — so no rule over From/To/Cc can detect "this arrived in my mailbox via
Bcc". The header the *receiving* MTA stamps (`Delivered-To` on most stacks,
`Envelope-To` on Exim, sometimes `X-Original-To`) is the artifact that names
the actual recipient mailbox, and it covers Bcc, aliases, and forwards alike.
Today it is present on the wire but not fetched, so `header."delivered-to"`
resolves to `""` on IMAP messages.

Proposal: add `delivered-to`, `envelope-to`, and `x-original-to` to the IMAP
metadata-header capture so rules can match the delivering mailbox. Concrete
motivating case: a "VIP mail to the Twin Digital account → push" rule in the
prod pipeline currently approximates account scoping with
`to contains ... or header.cc contains ...`, which misses Bcc deliveries.
