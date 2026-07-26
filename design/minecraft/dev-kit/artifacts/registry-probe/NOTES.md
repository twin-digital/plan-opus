# registry-probe

Asks the public npm registry for the two workspace-enumeration packages npm and pnpm publish,
and prints each one's name, latest version, description, repository, and tarball url.

Re-run (network required):

```
node probe.mjs > OUTPUT.txt
```

`OUTPUT.txt` beside this file is the captured stdout of that command, run 2026-07-26.
