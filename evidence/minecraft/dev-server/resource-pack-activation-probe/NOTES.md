# resource-pack activation probe — a person is the instrument

Whether a resource pack activates cannot be read off the server. The load output's Pack Stack line
names behavior packs only, and a resource pack runs no script that could report itself, so every
phase below prints `Pack Stack - None` whatever the resource pack is doing. The observer is
therefore a person with a Bedrock client attached, and the probe drives the server around them in
phases they run between observations.

The pack carries exactly one file of content: a `texts/en_US.lang` line renaming the diamond sword
to `RESOURCE PACK IS ACTIVE`. Nothing about the pack changes between phases — only whether
`world_resource_packs.json` names it — so nothing else can explain a difference in what the client
sees.

## Phases and what was observed

| phase | activation list | observed at the client |
|---|---|---|
| setup | `[]` | "Diamond Sword" — the stock name |
| activate | names the pack | a prompt to download the resource pack, then "RESOURCE PACK IS ACTIVE" |
| deactivate | `[]` again | "Diamond Sword" again |

The third phase is what makes the second mean anything: the name follows the activation list in both
directions, so the change is the list and not a client-side cache warming up.

## What it establishes

A resource pack in `/data/development_resource_packs/<uuid>` and named in
`<world>/world_resource_packs.json` **activates**, and its content reaches the client. A pooled pack
the list does not name does nothing. The server offers the pack to a joining client, which prompts
before downloading it.

## What is recorded here, and by whom

The `OBSERVED` lines in `OUTPUT.txt` are the owner's report from an attached client, appended to the
run's output as each phase was observed. They are observations rather than machine-captured output,
which is the nature of this measurement — there is no console line that carries the answer. Everything
else in the output is the server's own.

## Scope

One engine build, 1.26.40.8, one client, `ONLINE_MODE` off and no allow list, the port published to
the daemon's host. The probe says nothing about a client that declines the download prompt, and
nothing about `texturepack-required`, which it does not set.
