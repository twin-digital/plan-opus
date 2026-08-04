// Backs fact: component-ids-are-derivable-from-types.
// The type-level half of component-ids-probe.mjs: the id sets are computed from
// @minecraft/server's own types, with @ts-expect-error negative probes proving the derived
// unions actually reject non-members (an unused expect-error directive fails the build).
// Run: npm run check

import type {
  EntityAttributeComponent,
  EntityComponentTypeMap,
  EntityComponentTypes,
} from '@minecraft/server'

// Every component id, bare and prefixed.
type ComponentId = keyof EntityComponentTypeMap
// The canonical prefixed ids, as string literals rather than enum members.
type CanonicalComponentId = `${EntityComponentTypes}`
// The attribute-shaped subset, by conditional mapping over the type map.
type AttributeComponentId = {
  [K in ComponentId]: EntityComponentTypeMap[K] extends EntityAttributeComponent ? K : never
}[ComponentId]

const bare: ComponentId = 'health'
const prefixed: ComponentId = 'minecraft:health'
const canonical: CanonicalComponentId = 'minecraft:health'
const attribute: AttributeComponentId = 'minecraft:player.hunger'

// Every canonical id is a component id — the derivations agree.
const canonicalIsComponentId: ComponentId = canonical
// Every attribute id is a component id.
const attributeIsComponentId: ComponentId = attribute

// Negative probes: each must error, or the build fails on an unused directive.
// @ts-expect-error a non-attribute component id is not in the attribute subset
const notAnAttribute: AttributeComponentId = 'minecraft:tameable'
// @ts-expect-error a typo is not a component id
const typo: ComponentId = 'minecraft:helth'
// @ts-expect-error a bare id is not canonical
const bareIsNotCanonical: CanonicalComponentId = 'health'

export {
  attribute,
  attributeIsComponentId,
  bare,
  bareIsNotCanonical,
  canonical,
  canonicalIsComponentId,
  notAnAttribute,
  prefixed,
  typo,
}
