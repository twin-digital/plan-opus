# Prompts

Standing instructions an agent is handed to do one job in the planning loop. They run in three
phases; each artifact a phase produces is the next phase's input.

## Capture → Design → Build

**Capture** — produce a design's inputs (`brief.md`, `requirements.yaml`) and whatever facts they
rest on, in the `facts/` pool. The
foundations get written down before anyone designs.

| prompt | role | produces |
|---|---|---|
| [`capture-requirements.md`](./capture/capture-requirements.md) | planner | `brief.md`, `requirements.yaml`, and pool facts — by interview, by converting a prototype, or hybrid |

**Design** — turn settled inputs into a `spec.md` + `decisions.yaml`, reviewed clean. The spec is
the design: what to build and the decisions behind it.

| prompt | role | does |
|---|---|---|
| [`generate-spec.md`](./design/generate-spec.md) | orchestrator | runs the write → review → revise loop; holds verdicts, dispatches the rest |
| [`write-design-doc.md`](./design/write-design-doc.md) | spec author | derives the spec from the inputs |
| [`review-spec.md`](./design/review-spec.md) | spec reviewer | verdict + verified findings against format and content rules |
| [`amend-design-doc.md`](./design/amend-design-doc.md) | spec author | realigns a draft after an owner changes an input |
| [`process-review-comments.md`](./design/process-review-comments.md) | spec author | applies owner comments about the document |

**Build** — turn a settled, published spec into the working deliverable.

| prompt | role | does |
|---|---|---|
| [`build-from-spec.md`](./build/build-from-spec.md) | builder | builds each component the spec specifies |

## How work flows and routes back

Capture hands off a design in the `exploring` state; the owner ratifies the inputs. Design hands
off a `draft` spec; the owner reviews it, and each response routes by what it reaches — **an input
outranks a comment, and both outrank the document** (see `generate-spec.md` § *owner feedback*). A
comment about the document is applied (`process-review-comments.md`); a changed input is applied to
the file and the draft realigned (`amend-design-doc.md`); a full rebuild (`write-design-doc.md`) is
the reserved fallback. Only a spec that settles and merges licenses Build.
