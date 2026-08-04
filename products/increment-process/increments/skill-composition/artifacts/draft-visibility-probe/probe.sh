#!/bin/sh
# Does a slug-named draft's content reach the gate and the projection?
# Run from the repository root, with the draft at increments/skill-composition/.
set -e
DP="npx design-process"
I=products/increment-process/increments

echo "=== A. slug-named (as a draft is worked) ==="
echo "--- check ---"
$DP check 2>&1 | grep -E "^✖|design check" || true
echo "--- show: are the draft's own entries projected? ---"
$DP show increment-process 2>&1 | grep -cE "d-63z31u0l|r-w2m32yl6" | sed 's/^/draft entries found: /'
$DP show increment-process 2>&1 | grep -E "^_previous increment|claims in force" || true

echo
echo "=== B. same content, renamed into the next number ==="
N=$($DP where increment-process --next)
mv "$I/skill-composition" "$I/$N"
echo "--- check ---"
$DP check 2>&1 | grep -E "^✖|design check" || true
echo "--- show: are the draft's own entries projected? ---"
$DP show increment-process 2>&1 | grep -cE "d-63z31u0l|r-w2m32yl6" | sed 's/^/draft entries found: /'
$DP show increment-process 2>&1 | grep -E "^_previous increment|claims in force" || true
mv "$I/$N" "$I/skill-composition"
echo
echo "(renamed back to skill-composition)"
