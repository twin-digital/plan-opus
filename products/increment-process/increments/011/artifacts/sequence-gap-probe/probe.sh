#!/bin/sh
# Runs npm run check with a disposable increment directory that skips a number,
# capturing the run's full output and exit code.
set -u
root="$(git rev-parse --show-toplevel)"
here="$(cd "$(dirname "$0")" && pwd)"
cd "$root"

mkdir -p products/increment-process/increments/013
cp "$here/requirements-fixture.yaml" products/increment-process/increments/013/requirements.yaml
npm run check >"$here/OUTPUT.txt" 2>&1
echo "exit: $?" >>"$here/OUTPUT.txt"
rm -r products/increment-process/increments/013
