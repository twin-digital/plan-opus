#!/bin/sh
# Does a slug-named draft's content reach the gate and the projection?
#
# Run from the repository root with this draft present at increments/draft-visibility/.
# The probe runs check and show with the directory slug-named, renames it to the number
# `where --next` reports, runs both again, and renames it back. The two sections differ only
# by the directory's name — the content is identical.
#
# For the run, a schema violation is injected into the requirements source: `bogus_field: x`
# on the first requirement, which the requirement schema forbids. Whether the gate reports it
# is the measurement.
set -e
DP="npx design-process"
I=products/increment-process/increments
REQ="$I/draft-visibility/requirements.yaml"
# kept outside products/ so the backup does not itself draw a finding
BACKUP=$(mktemp)

cp "$REQ" "$BACKUP"
sed -i 's/^    title: a draft is checked as it is worked$/    title: a draft is checked as it is worked\n    bogus_field: x/' "$REQ"

report() {
  echo "--- check ---"
  $DP check 2>&1 | grep -E "^✖|design check" || true
  echo "--- show ---"
  $DP show increment-process 2>&1 | grep -c "r-4z3yd1ri" | sed 's/^/draft requirement projected (occurrences): /'
  $DP show increment-process 2>&1 | grep -E "claims in force" || true
}

echo "=== A. slug-named, as a draft is worked ==="
report

echo
N=$($DP where increment-process --next)
mv "$I/draft-visibility" "$I/$N"
echo "=== B. identical content, renamed to $N ==="
report
mv "$I/$N" "$I/draft-visibility"

mv "$BACKUP" "$REQ"
echo
echo "(directory renamed back; injected fixture removed)"
