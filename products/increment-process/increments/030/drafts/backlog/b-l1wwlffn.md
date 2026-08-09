# The ratify session stays open after it writes

Writing the staged rulings should push them and leave the session open, rather
than exiting. Today the session writes, attempts the push, and ends — so a
failed push ends the sitting too, and continuing means starting over.

Seen while ruling grinbox 002: the push was refused non-fast-forward, the
session exited reporting "committed, not pushed", and the commit it had just
made was left in a temporary worktree that was then discarded. The rulings
survived only as an unreachable object recovered with `git fsck`. Whatever the
session does on a failed push, it must not leave the only copy of the owner's
rulings somewhere it is about to delete.
