Probe: does a bundled file linked from SKILL.md enter a subagent's context at startup,
or only when the agent reads it?

setup.sh installs a throwaway skill at .claude/skills/probe-bundled/ whose SKILL.md links two
wave files, each carrying a distinct marker token. A subagent is then dispatched with the
skill and one kind, and asked to report which markers it can see WITHOUT reading any file.

If the agent can produce only its own kind's marker, bundled files load on demand and a
per-kind wave file keeps the other kind's guidance out of context. If it can produce both,
they are preloaded and the structure does not deliver what r-w2m32yl6 asks.

teardown.sh removes the throwaway skill.
