---
tags:
  - defect
  - deployment
---

# the liveness path reports a build it is not running

`GET /healthz` answers `{"status":"ok","version":"0.0.0"}` whatever build is
running. It read `0.0.0` on a host running 0.1.0 and again on the same host
running 0.2.0.

`d-i6ly6ifk` rules that the path reports "that the process is up **and what
build it is running**". The first half holds; the second does not. The version
is a constant in the daemon's source that nothing updates from the package's
own version at build time, so it reports the number the working tree happens to
carry rather than the release.

What this costs is larger than the wrong number. A deployment cannot ask the
daemon what it is running, so it cannot assert that a converge shipped what it
fetched. That gap hid a real failure: the ansible role's unpack was
first-install-only, so a converge fetched 0.2.0, skipped unpacking it, restarted
the service on 0.1.0, and reported `failed=0`. Only reading files on the box
found it. With an honest version, the deployment asserts the running build
against the version it just installed and the converge fails instead.

Fix the daemon to report its package's version, and once it does, add that
assertion to the infrastructure role's converge.
