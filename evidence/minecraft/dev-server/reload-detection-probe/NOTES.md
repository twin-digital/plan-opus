# reload detection probe — what a console reload re-evaluates, measured with a detector that works

## Result

`send-command reload` re-evaluates a loaded behavior pack's script module against the **current
contents of its files**, with no restart and no world reload, in under ten seconds. It does so
whether the edit landed in the module's **entry file** or in a file the entry **imports** — four
cases, alternating, all positive, in one server session.

| case | edited | re-evaluated with the new content |
|---|---|---|
| 1 | entry file | yes |
| 2 | imported file | yes |
| 3 | entry file | yes |
| 4 | imported file | yes |

## The detector, and why it is a thrown error

An earlier probe used `console.warn` and returned six negatives. **Those negatives were the
detector, not the server.** This probe's own output shows it: at world load the script's `WARN` line
and its `ERROR` lines both reach the console, and on every subsequent reload only the `ERROR` lines
do — while the token carried by the thrown error proves the module re-evaluated with the edited
file. A script's `console.warn` does not reliably reach the console on a reload; an uncaught error
does.

So the probe throws, and the thrown message carries a token that changes with every edit. A case is
positive only when the **new** token appears, which no stale line and no suppressed repeat can fake.

## What this bears on

- A harness that deploys a changed pack and issues a reload sees the change take effect. The cheap
  path is real, and it does not depend on how a pack's script module is split across files — which
  matters because the build bundles a module to a single entry file.
- Anything reading a pack's `console.warn` output as a signal that a reload landed will be wrong.
  The harness's own stream should not treat script log lines as a deploy acknowledgement.

## Scope

One engine build, 1.26.40.8, one `itzg/minecraft-bedrock-server` container, `@minecraft/server`
2.0.0. The probe edits files that already exist in the pack; it does not add new ones, which
`f:a-bedrock-script-reload-resolves-only-the-files-loaded-at-world-load` covers separately and this
probe does not contradict.

`@minecraft/server-net` was tried first as an out-of-band detector — an HTTP call to a second
container on the compose network — and abandoned: the image's `permissions.json` does not allow the
module by default, and the only version the engine recognises, `1.0.0-beta`, needs the Beta APIs
experiment enabled on the world. The thrown-error detector needs none of that.
