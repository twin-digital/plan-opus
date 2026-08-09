# A refused push pulls, reapplies by id, and tries again

On a rejected push the session should pull the branch's latest, reapply the
owner's rulings onto it, and push again, rather than reporting the failure and
stopping.

Reapplying matches entries by id, not by position or file offset, so rulings
survive edits made to the draft out of band. Where an entry the session ruled
already carries a different status at the branch tip, that is reported to the
owner rather than silently overwritten in either direction.

Motivating case: an agent pushed unrelated commits to the draft's branch while
a session was open, and every ruling in that sitting was refused at the push.
See b-l1wwlffn, which is the same failure from the session-lifetime side.
