// validates the example backlog against the pool schemas with ajv 2020
import { readFileSync } from 'node:fs'
import { parse as load } from 'yaml'
import Ajv2020 from 'ajv/dist/2020.js'

const read = (p) => load(readFileSync(p, 'utf8'))
const ajv = new Ajv2020.default({ schemas: [
  read('schemas/design-process/common.1.yaml'),
  read('schemas/design-process/backlog-item.1.yaml'),
] })
const validate = ajv.compile(read('schemas/design-process/backlog.1.yaml'))
const doc = read('products/increment-process/increments/010/artifacts/backlog-schema-validates/example-backlog.yaml')
const ok = validate(doc)
console.log(ok ? 'valid: example backlog conforms to /design-process/backlog@1' : JSON.stringify(validate.errors, null, 2))
process.exit(ok ? 0 : 1)
