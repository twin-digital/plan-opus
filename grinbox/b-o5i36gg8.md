---
tags:
  - digests
---

# run a digest now, and re-render a past one

A digest edition fires on its schedule and nowhere else, so a user editing one waits for the next
occurrence to see what it produces, and a run that went out wrong cannot be produced again.

Two controls, mirroring the message replay the fold already has:

- **run an edition now**, optionally over a window the user names rather than the standing
  watermark, and by default composing the renditions without sending — the "try before you trust"
  facility the rule-based tagger's preview already gives, for digests.
- **re-render a past run** over that run's own coverage window with the configuration and tags as
  they are now, recorded as a re-rendering of the run it came from.

Both reach the send path, so what a repeat send means against "re-examining a message never repeats
an outside effect" is the question to settle first — the preview case avoids it and the delivering
case does not.

Came out of closing pegasuspad/infrastructure#92, which was a roadmap entry standing in as an issue.
