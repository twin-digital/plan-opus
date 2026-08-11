---
tags:
  - roadmap
  - feature
---

# Notification cooldown

Cross-message dedupe for the `notify` operator: fingerprint (sender + normalized
subject), suppress repeat pushes inside a configurable per-class window
(`cooldown = 0` preserves send-everything for classes that want it). Kills alert
storms — a monitoring failure that emails twenty identical alerts in two days
should cost one push, not twenty — and stops storms from burning the push-service
rate limit that other notifications need.

From the roadmap grinbox carried while it was built by hand, recorded here as it
stood. That file went with the rest of the source when the code moved into the opus
workspace, and the capture that produced increments 001-007 recorded the design of
what existed rather than what was still wanted, so this was held nowhere afterwards.
