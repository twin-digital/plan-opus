// Stands in for unmodified pack code: reaches the engine through the module-scope singletons and
// is never told about the shim. Under the alias, this specifier resolves to the shim's main entry.
import { world, system, __instanceId, __evaluationCount } from '@minecraft/server'

export const packSeesWorld = () => world
export const packSeesSystem = () => system
export const packInstanceId = () => __instanceId
export const packEvaluationCount = () => __evaluationCount
