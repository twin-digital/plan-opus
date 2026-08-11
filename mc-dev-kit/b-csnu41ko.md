# Per-invocation compose-project isolation — probes collide with the live session

The compose project name is keyed to the monorepo, so every invocation from every worktree,
config, or agent session targets the same container. Observed 2026-08-11: an agent's throwaway
placement probe (different level name, same project) recreated the owner's running dev server
mid-play-session — the "throwaway world" isolation a level name suggests does not exist at the
container layer, and a probe's cleanup takes the live session down with it.

Wanted: project identity that separates purposes — e.g. derived from config path or an explicit
`project:` setting — so a probe, a second worktree, or a CI run can never recreate or destroy a
developer's live server. (The generated compose file lives at a tmpdir path keyed by project, so
today the collision also silently reverts any hand-applied compose edits.)
