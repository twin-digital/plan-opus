// The ./control subpath: the test-facing surface, re-exported from the package root's state.
export { __useServer, brandAs, ShimNotInstalledError, __serverVersion } from './state.js'

// Probe-only: lets a test read which state instance this entry reached.
export { __instanceId, __evaluationCount } from './state.js'
