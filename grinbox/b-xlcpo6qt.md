# an IMAP account sends through SMTP submission

An IMAP account cannot send mail, so digests and any send operator are unavailable on one.
Pair the IMAP backend with SMTP submission so an IMAP account sends through its own provider:
what the user supplies (host, port, credentials — the same app password, or a second one),
whether submission config is separable from the IMAP half, and what happens to an edition
active on an account whose submission is unconfigured or failing.

Deferred out of the generic-IMAP-backend increment by the owner, which ships read-and-mark only.
