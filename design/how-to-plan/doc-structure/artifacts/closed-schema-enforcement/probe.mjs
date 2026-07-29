// Runs the repository's checker against a fixture tree in which every entry kind carries a field
// outside its schema, and reports what the checker said about them.
//
//   node design/how-to-plan/doc-structure/artifacts/closed-schema-enforcement/probe.mjs
//
// The fixture beside this script holds a fact, a requirement, a decision, a component, and an open
// question, each well-formed but for a `checked` key no schema defines. The design keeps an open
// question so it computes as draft and the settle gate stays out of the observation.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, "fixture");
const root = path.resolve(here, "../../../../..");
const checker = path.join(root, "bin", "check-design.mjs");
const FIELD = "checked";

const INJECTED = [
  ["fact", "facts/demo.yml", "demo-fact"],
  ["requirement", "design/demo/demo-design/requirements.yaml", "demo-requirement"],
  ["decision", "design/demo/demo-design/decisions.yaml", "demo-decision"],
  ["component", "design/demo/demo-design/spec.md", "demo-component"],
  ["open question", "design/demo/demo-design/spec.md", "demo-question"],
];

console.log("== fixture ==");
console.log(`every entry below is well-formed but for a \`${FIELD}\` key no schema defines\n`);
for (const [kind, file, id] of INJECTED) console.log(`  ${kind.padEnd(14)} ${id.padEnd(16)} ${file}`);

const run = spawnSync(process.execPath, [checker], { cwd: fixture, encoding: "utf8" });
const stdout = run.stdout ?? "";

console.log("\n== checker ==");
console.log(`$ cd ${path.relative(root, fixture)} && node ${path.relative(root, checker)}\n`);
process.stdout.write(stdout);
if (run.stderr) process.stdout.write(run.stderr);

const lines = stdout.split("\n");
const failing = lines.filter((l) => l.startsWith("FAIL")).length;
const naming = lines.filter((l) => l.includes(FIELD)).length;

console.log("\n== observation ==");
console.log(`unknown fields injected: ${INJECTED.length}`);
console.log(`diagnostics naming an injected field: ${naming}`);
console.log(`failing checks reported: ${failing}`);
console.log(`checker exit status: ${run.status}`);
