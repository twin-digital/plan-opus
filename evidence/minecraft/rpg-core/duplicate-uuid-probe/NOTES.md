# duplicate-uuid-probe

What a server does when its pool holds several directories declaring the same pack uuid — the state
reached if every adventure bundles its own copy of a shared pack instead of the pack being installed once.

## What it does

Two behavior packs claim one uuid but are distinguishable by content: one defines entity `dup:from_a`,
the other `dup:from_b`. Whichever entity type resolves names the copy that won. A separate observer pack,
with its own uuid, does the reporting, so the thing under test never reports on itself.

| scenario | pool | activation list pins | result |
| --- | --- | --- | --- |
| A `samever` | a@1.0.0, b@1.0.0 | 1.0.0 | copy a; one stack entry; no error |
| B `mixedver` | a@1.0.0, b@1.1.0 | 1.0.0 | copy a — **not** the higher version |
| C `listedtwice` | a@1.0.0, b@1.0.0 | 1.0.0 twice | copy a; still one stack entry |
| D `duprp` | two resource dirs, one uuid | — | one of them; client stack count 2 |
| E `pinhigher` | a@1.0.0, b@1.1.0 | 1.1.0 | copy b — the pin selects |
| F `tieorder` | a@1.0.0, b@1.0.0, names inverted | 1.0.0 | copy a — **not** name order |
| G `pinmissing` | a@1.0.0, b@1.1.0 | 1.2.0 | copy b — an unsatisfiable pin does not fail |

## Findings

**Duplicates are safe.** Several directories sharing a uuid load as one pack, silently. Nothing is logged
and the stack holds one entry. Listing the uuid twice is absorbed. Resource packs behave the same.

**The activation list's version pin selects which copy loads** — not "newest wins". B and E are the same
pool with different pins and different winners. This is worth contrasting with the documented rule for
*importing* a pack, where a higher version replaces a lower one: that rule does not describe this path.

**An unsatisfiable pin degrades silently.** G pinned a version no copy in the pool was, and the pack loaded
anyway at a version the world never asked for. This is the failure mode bundling introduces: not a
conflict, a quiet substitution.

**The tie-break is not name order.** F inverted the directory names so the other copy sorted first, and the
same copy still won. In both ties the first-copied directory won, consistent with pool enumeration
following creation order. Do not rely on it.

## Design note

E and G together are why bundling needs a version assertion rather than trust: resolution is deterministic
given a pin, but a pin the pool cannot satisfy is answered with a substitution instead of an error, and
nothing in the pack stack or the log says so.

## Re-running

```sh
node evidence/minecraft/rpg-core/duplicate-uuid-probe/probe.mjs        # tears down after itself
node evidence/minecraft/rpg-core/duplicate-uuid-probe/probe.mjs --keep
```

Container and volume are named `rpg-dupuuid-probe`; no ports published; roughly five minutes for seven
scenarios. The traps in `../cross-pack-probe/NOTES.md` apply.
