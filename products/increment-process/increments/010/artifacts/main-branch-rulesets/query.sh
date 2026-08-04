#!/bin/sh
# Lists the repository's rulesets, then each one's conditions, rules, and bypass actors.
set -eu
gh api repos/twin-digital/plan-opus/rulesets --jq '.[] | {id, name, target, enforcement}'
for id in $(gh api repos/twin-digital/plan-opus/rulesets --jq '.[].id'); do
  gh api "repos/twin-digital/plan-opus/rulesets/$id" \
    --jq '{name, enforcement, conditions, bypass_actors, rules: [.rules[].type]}'
done
