// Reports what the tree actually holds after an install attempt: does the shim import, and which
// @minecraft/server version landed.
import { readFileSync } from 'node:fs'

const read = (path) => {
  try {
    return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')).version
  } catch (error) {
    return `absent (${error.code ?? error.message})`
  }
}

let shim
try {
  shim = String((await import('@twin-digital/peer-probe-shim')).shimLoaded)
} catch (error) {
  shim = `import failed (${error.code ?? error.message})`
}

process.stdout.write(
  `shim-import=${shim}\n` +
    `installed-minecraft-server=${read('./node_modules/@minecraft/server/package.json')}\n` +
    `installed-shim=${read('./node_modules/@twin-digital/peer-probe-shim/package.json')}\n`,
)
