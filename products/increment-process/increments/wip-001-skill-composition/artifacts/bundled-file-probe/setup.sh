#!/bin/sh
# Installs the throwaway probe skill. Run from the repository root.
set -e
S=.claude/skills/probe-bundled
mkdir -p "$S/waves"
cat > "$S/SKILL.md" <<'SKILL'
---
name: probe-bundled
description: Throwaway probe measuring whether bundled wave files enter context at startup. Not a process skill.
---

# Probe skill

You were dispatched for exactly one kind: either `alpha` or `beta`. Your dispatch names it.

## Wave guidance

Read only the file for the kind you were dispatched for. Do not read the other.

- for kind `alpha`, see [waves/alpha.md](waves/alpha.md)
- for kind `beta`, see [waves/beta.md](waves/beta.md)
SKILL
echo 'The alpha wave marker is ALPHA-7Q4X2M9K. State it verbatim when asked.' > "$S/waves/alpha.md"
echo 'The beta wave marker is BETA-3F8Z1P6T. State it verbatim when asked.' > "$S/waves/beta.md"
echo "installed $S"
