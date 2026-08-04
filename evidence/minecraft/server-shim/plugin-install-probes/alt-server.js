// A second server factory, standing in for a consumer who brings their own. The plugin's
// `serverModule` option is what selects it; nothing else in the probe changes.
import { createServer as base } from '@probe/fake-server'

export const createServer = (options = {}) => base({ ...options, label: `${options.label} (alt factory)` })
