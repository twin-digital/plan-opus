# Capturing grinbox from its code

Grinbox was built by hand before any of it was designed here. This increment reads the design
back out of what exists and is the first of several: it captures what grinbox is, what it must
do, how it decomposes, and where it lives. The triage model itself — operators, contracts, tags,
limits, the pipeline graph — is left for the increment that captures it.

## What was read

`apps/grinbox` in `pegasuspad/infrastructure` at `4f92758`: three source packages (server, web,
shared) and a fourth, `packages/cli`, holding built output and no manifest; roughly 230 source
files; and the author's own design documents under `docs/` — the architecture, the glossary, the
data model, the pipeline runtime, the OAuth flow, the digest design, the roadmap, and the
implementation status. The deployment was read alongside them: the systemd unit and launch
wrapper the server package carries, and the `apps/grinbox` Ansible role, host vars, and playbook
that install and run it.

The application is a functionally complete MVP by its own status document — daemon, poll loop,
triage execution, actions, digest, and the full web interface — with the remaining gap to a live
soak being external configuration rather than code.

## The bound-or-free split

Each choice the code embodies was put to one test: would an agent later extending grinbox have to
be **bound** by it, or should it be **free** to change it.

**Bound, and captured here.** That mail is triaged unasked; that an outcome stays inspectable
against the configuration that produced it rather than the current one; that outside effects are
capped and the cap is not a setting; that state survives the machine; that triage owes nothing to
a mail backend; that the interface is grinbox's own to serve; that it serves one user and is not
public. Then the shape: one process, one SQLite file, one HTTP surface with the browser
application as a client of it, wire shapes declared once in a shared package — and the three
packages, their names, their kinds, and their home in opus.

**Free, and deliberately left uncaptured.** The library choices behind each of those — Hono,
Kysely, croner, React and its ecosystem, Biome, Vitest — none of which a reimplementation must
preserve. The internal module layout of any package. Which model tier a tagger reaches for.
Every default the code picked: poll intervals, worker-pool size, retry counts, the body-fetch
cap. The SQL schema's column-level shape, table by table. The UI's page structure and visual
design. The demo seed. These are the many choices the code contains, as against the few worth
defending, and freezing them as law is the failure a code-first capture exists to avoid.

**Left for a later increment**, not because it is free but because this increment's scope stops
short of it: the operator and contract model, the tag and triage vocabulary, the pipeline graph
and its validation, the limit mechanism's own shape, the provider interface, the OAuth and token
lifecycle, the digest, and the data model.

## Three things worth the owner's eye

**The layout is not what the request named.** `nodejs/apps/grinbox/packages/*` would put grinbox's
packages three levels under `nodejs/`, where the workspace's member pattern does not reach
[[f:opus-workspace-members-sit-two-levels-under-nodejs]] — so they would not be workspace members
at all. `nodejs/grinbox/{server,web,shared}` is the same tree one level up, fitting the pattern
untouched.

**The move splits the application from its deployment.** The Ansible role installs grinbox by
copying a source tree out of a checkout of the repository the code lives in, then installing
production dependencies on the target so `better-sqlite3` binds to the target's Node. Once the
code is in opus that path is gone, and what replaces it — what the monorepo produces, and how the
infrastructure repository fetches it — is the deferral `d-riyvvlx5` hands to the implementation
that performs the move.

**Grinbox needs two package kinds that do not exist.** A daemon is neither a library nor a CLI,
and a browser application is neither. `d-5h9ot6s7` proposes `node-service` and `web-app`, both
taking the existing code wave shape, which adds a row to the dispatch table and a file under the
implementer skill's `waves/` when the process product next ships.

## The state of the code

Grinbox is provisional until this capture publishes: unreleased, and depended on by nothing. The
packages are private and stay so. `product.yaml` describes where they sit today, in
`pegasuspad/infrastructure`; the implementation that performs the move rewrites those entries.
