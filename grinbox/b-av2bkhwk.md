# Expose the receiving Account to the rule language

A Message knows which Account it arrived on (`messages.account_id`), but the
rule-based tagger's match grammar has no account field — its vocabulary is
message content only (from/to/subject/snippet/body, `header.*`, `tag.*`,
`thread.*`). In a pipeline shared by several Accounts there is no first-class
way for a rule to branch on "which mailbox received this".

Users approximate it with address heuristics (`to contains
"sean@twindigital.io"`), which miss Bcc, aliases, and forwards, and break
silently when an address changes. Concrete motivating case: the prod "All
Mail" pipeline serves a Gmail and an IMAP Account, and a VIP-to-IMAP push
notification had to be scoped by To/Cc matching.

Proposal: surface receiving-Account metadata as match fields — e.g.
`account.name`, `account.provider_type` — resolved from the Message's Account
at evaluation time. Alternatives worth weighing at design time: per-account
operator gating on the `when` clause instead of (or alongside) grammar
fields; or documenting one-pipeline-per-account as the intended scoping and
improving what a second pipeline costs.
