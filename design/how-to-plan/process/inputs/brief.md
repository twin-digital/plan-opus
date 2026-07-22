# Brief — process

## What this design is for

Specify the working protocol: the order work happens in, what an agent may settle alone,
what it must bring to me, and when to throw work away. This is the design a person reads
first and an agent is handed as standing instructions.

## In scope

- The loop, and why its order is load-bearing.
- The knowledge model: what kinds of thing a project knows, and what settles each.
- The autonomy rule — build freely on, decide alone, stop and ask.
- Which calls are the agent's, and the exceptions.
- Abort: when, and whose call it is.

## Out of scope

- The shape of the artifacts the protocol produces — that is `doc-structure`.
- The tooling that enforces any of it — that is `harness`.

## Done looks like

An agent follows the protocol without me restating it, and I can tell from the artifacts
alone whether a design is safe to build on.

## Known tensions

- This design produces no software, so it declares no components, which may mean it is
  conventions rather than a design.
- Ceremony grows easily and nothing yet measures whether the protocol costs less attention
  than working without it.
