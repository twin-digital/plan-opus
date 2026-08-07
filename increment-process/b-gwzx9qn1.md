# A decision enumerating a growable set should be split

A decision whose statement lists the members of a set that will grow is likely to
be superseded every time the set changes. Prefer one decision defining the idea —
the set is closed, resident in code, a user cannot extend it — and one decision
declaring each member. Superseding then touches only the member that changed.

Belongs in the authoring tests, or in CLAUDE.md if it reads as instruction rather
than a content test. Found while reviewing grinbox 003, whose built-in operator
types were one decision listing six.
