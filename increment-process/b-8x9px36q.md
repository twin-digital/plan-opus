---
tags:
  - process-doc
  - tooling
---

# a record's package version cannot name what shipped

`implementations/<product>/<NNN>-<k>.yaml` carries a `packages[].version` per package, and in a
repository where versions are assigned at release the field can never hold the version that was
actually published.

Three rules close the loop:

- the record rides in the integration branch's pull request, with the implementation changes it
  describes, so it is written before that branch merges;
- the version is assigned afterwards, by a separate release pull request the release tooling opens
  — changesets, in the opus monorepo, whose `Version Packages` PR bumps every package a changeset
  named;
- `record-immutable` (`d-0hedq82d`) refuses any edit to a published record, so the field cannot be
  corrected once the real version exists.

So a design-first record names the version the package.json held *while it was being built*, which
is the previous release's number, or — for a package this build introduced — a number that is never
published at all.

From the mc-dev-kit 009 build: the record names `mc-dev-kit 0.2.0` and `mc-dev-server 0.1.0`. What
shipped is `0.3.0` and `0.2.0`. The first is actively misleading, since 0.2.0 is a real release and
is what the *previous* record already names; the second names a version that does not exist on npm.
Editing the record to correct it is refused.

The one record that gets this right, `mc-dev-kit/002-1.yaml`, does so because it was a
reconstruction filed after the code had already released — the code-first path, where the build
happened first. So the field works for a captured target and cannot for a design-first one.

Worth settling: whether the field should name the version the build *will* release as (which the
changeset already determines, and which tooling could compute), whether it should be written by the
release rather than the record's author, whether `record-immutable` should admit a narrow amendment
for it, or whether a version that is assigned downstream simply does not belong in the record and
the package path plus the target is the durable identifier.
