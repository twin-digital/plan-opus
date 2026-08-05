---
tags:
  - dev-loop
---

# Beta APIs as an optional flag

The server's posture is the harness's and is not configurable (d-e956frnx): offline mode, no allow
list, the content log to the console, resource packs offered rather than required. Beta APIs are off
with it, which is the right default and not the right only-option.

A pack that depends on a beta module — `@minecraft/server-net` among them — will not load without
the Beta APIs experiment enabled on the world, and fails with a dependency error rather than
anything that names the experiment. That was met while probing: the only version of
`@minecraft/server-net` the engine recognised was `1.0.0-beta`, and it refused to load for want of
the experiment.

Add a flag, and a config key beside it, that turns the experiment on for a run. Worth settling at
the same time: whether it belongs to a profile like the world settings do, since a pack set that
needs beta APIs is a property of what is being hosted rather than of the machine hosting it.
