#!/bin/sh
# Runs npm run check against two disposable fixtures, one per candidate backlog shape,
# capturing each run's full output and exit code.
set -u
root="$(git rev-parse --show-toplevel)"
here="$(cd "$(dirname "$0")" && pwd)"
cd "$root"

mkdir -p products/increment-process/increments/some-future-idea
cp "$here/item.md" products/increment-process/increments/some-future-idea/
npm run check >"$here/OUTPUT-slug-increment.txt" 2>&1
echo "exit: $?" >>"$here/OUTPUT-slug-increment.txt"
rm -r products/increment-process/increments/some-future-idea

mkdir -p products/increment-process/backlog
cp "$here/item.md" products/increment-process/backlog/some-future-idea.md
npm run check >"$here/OUTPUT-backlog-dir.txt" 2>&1
echo "exit: $?" >>"$here/OUTPUT-backlog-dir.txt"
rm -r products/increment-process/backlog
