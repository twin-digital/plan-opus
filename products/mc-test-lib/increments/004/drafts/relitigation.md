# Relitigation: the two items argued afresh

`drafts/carry-forward.md` left two items for this loop to argue on their merits. The choices are
`d-bslnaeg6` and `d-vjeple9k`; this records the arguments.

## The default path is boilerplate-free with per-test isolation (d-bslnaeg6)

The boilerplate-free shape is measured, not aspirational: one config entry and a tooling-owned
setup file run an unmodified pack's suite green with the test file holding static imports and
nothing else [[f:a-setup-file-server-makes-a-pack-test-file-boilerplate-free]].

Boilerplate-free alone is not enough. A file-scoped server carries each test's leavings into the
next — 1 entity, a tick clock at 40, and 11 objectives handed to the second test
[[f:one-server-per-file-carries-state-into-the-next-test]] — so the rule is only worth committing
to with per-test isolation beside it.

The mechanisms that cannot deliver that isolation for a pack registering at module scope:

- Repointing `world`/`system` at a fresh server strands the pack's completed registrations —
  every swapped-in server saw `subscribers=0 scheduled=0`
  [[f:a-proxy-target-swap-strands-a-completed-registration]].
- An `AsyncLocalStorage` store needs the consumer's test body wrapped in `storage.run(…)` — the
  boilerplate the rule exists to remove [[f:an-als-context-must-be-established-inside-the-test-callback]] —
  and hands a deferred pack callback another test's world silently
  [[f:an-als-store-resolves-a-deferred-callback-under-the-calling-context]].

What does deliver it: replacing the state beneath the fakes while the signal objects and scheduled
runs survive — three successive tests each started from an empty world and drove the pack to the
identical end state [[f:a-fake-server-can-be-cleared-in-place-with-its-subscriptions-intact]],
[[f:pack-isolation-comes-from-under-the-fakes-not-from-the-shim]].

What made this shape expensive in July is gone: the clear then needed a public hook from a
separate library package, which the library does not expose
[[f:test-lib-ships-no-reset-hook]]. Under `r-3dgnq0sp` one package ships both halves, so the
capability lives inside the package, called by its own runner tooling — nothing exposed, and fake
state stays instance-scoped as `r-qayd22z2` holds.

**Ruled**: the owner rejected `d-bslnaeg6` — dynamic import and module reset is the accepted
test-library pattern for this case, and the fake library ships no reset. `d-2mngzzpg` carries
the ruling.

## The version statement is inert (d-vjeple9k)

Enforcing the derived version through a `@minecraft/server` peer range takes consumer installs
down: npm exits 1 with `ERESOLVE` against a consumer pinned to `^1.17.0`, installing nothing, and
`peerDependenciesMeta: { optional: true }` does not rescue it
[[f:an-unsatisfiable-peer-range-fails-npm-and-warns-pnpm-and-yarn]].

Enforcement at run time guards nothing real: the test process has no engine in it — the shim is
what stands where the engine would be — so a mismatch between the consumer's pin and the derived
version is a fidelity question the statement itself answers. The statement `r-29dlrp9r` requires
stays, readable, and staleness is the consumer's to judge against it.
