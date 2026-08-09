---
tags:
  - tooling
  - process-doc
---

# The increment session opens on a settled draft, for review

`design-process increment <product>` today is a ruling session: it exists to move proposed
decisions and open questions to a ruling, and landing unlocks once nothing is proposed. That
makes a draft with nothing proposed uninteresting to it — and a companion increment is exactly
that draft.

An implementation's companion lands its entries as `delegated`, because the agent that wrote them
has not ruled on anything and says so. Nothing is `proposed`, so there is nothing for the session
to put in front of me, and the only way to review what the build decided is to read the YAML.
That is the wrong way round: a companion is ratified as a whole at its pull request, so its
entries are precisely the ones I most want to page through one at a time.

What I want is to open the session against any draft — settled or not — and walk its entries with
the same master-list-beside-the-full-text view the ruling session already has. Reviewing a
`delegated` entry should let me accept it, tolerate it, reject it, or leave it delegated, and
should surface what an entry pins and what it supersedes, since those are the two things a
companion's PR description has to call out and the two I am actually ruling on.

Concretely, from working mc-dev-kit's companion at 010: twenty-one entries, eleven proposed
pinned, one overturn. Every one of them wanted a look, and the session had nothing to show me
because the agent had honestly marked them all delegated rather than proposed.

Worth settling while designing this: whether "no unsettled entries" should stop being the
session's entry condition and become only the landing's, and whether a review pass over a landed
increment is the same feature or a different one.
