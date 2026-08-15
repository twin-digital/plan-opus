# an immediate archive silently defeats a delayed one in the same triage

Where one triage both performs an undelayed archive and records a delayed one, the immediate
archive wins and the user's delay is defeated. The only trace is a `pending_archive_skipped`
event carrying `already_departed`, recorded when the delayed archive finally comes due — up to
a day later, on a run nobody is looking at.

d-0tajzoy7 rules the delayed-versus-delayed case (a message holds the earliest due of its
latest settled triage) and is silent on immediate-versus-delayed. By the rules as they stand
grinbox is correct — d-grcdd4ov archives during the triage when no delay is stored, and the
immediate archive is the earliest — so the gap is that nothing tells the user their delay is
being overridden.

Found in production: a digest classified into a category whose archive rule fired `true` was
archived five minutes after arrival by an undelayed archive operator, while the 24h delayed
archive operator gated on the digest class recorded a pending archive that was skipped the next
day as already departed. The pipeline was at fault, and the design let it be silent.

Worth considering: whether the interface reports an operator whose recorded pending archive was
overridden, whether a save warns when two archive operators can both match, or whether a
recorded delay suppresses an undelayed archive in the same triage.
