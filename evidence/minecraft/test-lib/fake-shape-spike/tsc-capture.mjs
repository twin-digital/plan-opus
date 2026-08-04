// Runs tsc over each compile-time probe and writes the captured output beside it, so the
// compiler's own verdict is committed rather than described.
// Run: node tsc-capture.mjs

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const flags = [
  '--noEmit',
  '--strict',
  '--module',
  'node16',
  '--moduleResolution',
  'node16',
  '--target',
  'es2022',
]

const run = (args) => {
  try {
    const out = execFileSync('npx', ['tsc', ...args], { encoding: 'utf8', stdio: 'pipe' })
    return { code: 0, out }
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

const expectErrors = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.includes('@ts-expect-error')).length

const probes = [
  ['merging-probe.ts', 'merging-probe.tsc.out.txt'],
  ['consumer-typing-probe.ts', 'consumer-typing-probe.tsc.out.txt'],
  ['augmentation-probe.ts', 'augmentation-probe.tsc.out.txt'],
  ['generated/manifests.generated.ts', 'generated/manifests.generated.tsc.out.txt'],
  ['generated/fake-entity-stubs.generated.ts', 'generated/fake-entity-stubs.generated.tsc.out.txt'],
  ['emit/consumer.ts', 'emit/consumer.tsc.out.txt'],
]

for (const [file, outFile] of probes) {
  const r = run([...flags, file])
  const n = expectErrors(file)
  const body = [
    `## tsc --noEmit --strict on ${file}`,
    '',
    `$ npx tsc ${flags.join(' ')} ${file}`,
    r.code === 0 ? 'exit 0, no diagnostics' : `exit ${r.code}`,
    r.out.trim(),
    '',
    n > 0
      ? `The file carries ${n} @ts-expect-error directives. An unused one is itself an error, so`
      : 'The file carries no @ts-expect-error directives.',
    n > 0 ? 'exit 0 means every negative probe genuinely failed to type-check.' : '',
    '',
    '@minecraft/server 2.8.0',
  ]
    .filter((l) => l !== '')
    .join('\n')
  fs.writeFileSync(outFile, `${body}\n`)
  console.log(`${file}: exit ${r.code}`)
}

// Declaration emit: does the merged interface/class survive into the published .d.ts?
const emit = run([
  '--declaration',
  '--emitDeclarationOnly',
  '--outDir',
  'emit/dist',
  '--strict',
  '--module',
  'node16',
  '--moduleResolution',
  'node16',
  '--target',
  'es2022',
  'emit/lib.ts',
])
fs.writeFileSync(
  'emit/emit.out.txt',
  [
    '## Declaration emit of a merged interface/class',
    '',
    '$ npx tsc --declaration --emitDeclarationOnly --outDir emit/dist --strict ... emit/lib.ts',
    emit.code === 0 ? 'exit 0, no diagnostics' : `exit ${emit.code}\n${emit.out.trim()}`,
    '',
    'emitted emit/dist/lib.d.ts:',
    '',
    fs.readFileSync('emit/dist/lib.d.ts', 'utf8').trim(),
    '',
    '@minecraft/server 2.8.0',
  ].join('\n') + '\n',
)
console.log(`declaration emit: exit ${emit.code}`)

// The whole folder, as `npm run check` runs it.
const whole = run(['--noEmit'])
fs.writeFileSync(
  'project.tsc.out.txt',
  [
    '## Whole-folder run (tsconfig.json)',
    '',
    '$ npx tsc --noEmit',
    whole.code === 0 ? 'exit 0, no diagnostics' : `exit ${whole.code}\n${whole.out.trim()}`,
    '',
    'augmentation-probe.ts is excluded from this run: a module augmentation is program-wide,',
    'and its widening of `keyof Entity` breaks consumer-typing-probe.ts\'s completeness',
    'assertions. That interaction is the probe\'s finding, not an accident of layout.',
    '',
    '@minecraft/server 2.8.0',
  ].join('\n') + '\n',
)
console.log(`whole folder: exit ${whole.code}`)
