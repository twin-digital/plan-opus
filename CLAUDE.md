# plan-opus

Planning repository. Designs live under `design/<area>/<design>/`; the artifact format is
specified by `design/how-to-plan/doc-structure/spec.md` and the content rules by
`design/how-to-plan/authoring/spec.md`. Validate every change with `npm run check`.

## Agents may propose facts

An agent writing or revising a spec may add entries to a `facts.yaml`, at any scope, provided
each new fact meets one of:

a. **Documented elsewhere** — its sources cite the evidence as `doc-structure` requires: a
   `url` with `where` and a verbatim `quote`, or a `description` of the mechanism for an
   assumed fact. The url is the upstream original, and the quote states the claim, per
   `r:documented-source-is-primary` and `r:quote-carries-the-claim` in
   `design/how-to-plan/authoring/requirements.yaml`. A file you wrote in this repository is
   never the source, however faithfully it transcribes the original.
b. **Tested directly** — the agent ran the test itself, and the design's `artifacts/`
   subfolder holds the actual scripts and inputs used, plus their outputs when the test
   produces any. The fact's `sources` name those files and state the observed result. What
   an artifact contributes is captured output; a prose conclusion the agent wrote there is
   interpretation, and a fact resting on it belongs under (a) or as an open question. This bar
   is claimed on your own behalf only: a test you did not run is disclosed per
   `r:tested-facts-name-whose-test`, and artifacts another design holds are promoted to a shared
   scope rather than cited where they sit.

A fact meeting neither bar is recorded as an open question instead. Proposed facts are input
changes and get owner review: the PR description must call each one out.
