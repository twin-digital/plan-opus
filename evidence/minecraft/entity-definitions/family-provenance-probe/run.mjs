// Drives the custom-family / same-identifier provenance probe against a real Bedrock dedicated
// server, headless.
//
//   node run.mjs            # writes OUTPUT.txt beside this file
//
// Four phases against one world: pack order A,B twice (restarted between), then B,A, then A,B
// again — so a winner that moves with the stack order is distinguishable from one that is stable
// across reloads.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, process.env.OUT_FILE ?? "OUTPUT.txt");
const COMPOSE = path.join(DIR, "compose.yaml");
const CONTAINER = "family-probe-bedrock-1";

const SCRIPT = { id: "275486e7-acfd-4bf6-8813-69a70b1840e4", dir: "script", name: "probescript" };
const PACK_A = { id: "8f067333-b5a7-4ffc-a000-22416a6b0781", dir: "a", name: "probepacka" };
const PACK_B = { id: "0b209d15-808d-4b1e-b543-93ee7eb1c9cf", dir: "b", name: "probepackb" };

const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", COMPOSE, ...args], { encoding: "utf8", maxBuffer: 256 << 20 });
const send = (c) => { try { compose("exec", "-T", "bedrock", "send-command", c); } catch { /* replies do not reach the log */ } };
const logs = () => compose("logs", "--no-log-prefix", "bedrock");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const countOf = (needle) => logs().split(needle).length - 1;

const waitFor = (needle, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (logs().includes(needle)) return true;
    sleep(5000);
  }
  return false;
};
const waitCount = (needle, want, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (countOf(needle) >= want) return true;
    sleep(5000);
  }
  return false;
};

fs.writeFileSync(OUT, "");
log("# custom type_family + same-identifier provenance probe");

compose("up", "-d");
if (!waitFor("Server started", 300_000)) { log("SERVER DID NOT START"); process.exit(1); }

for (const p of [SCRIPT, PACK_A, PACK_B]) {
  compose("exec", "-T", "bedrock", "rm", "-rf", `/data/development_behavior_packs/${p.name}`);
  execFileSync("docker", ["cp", path.join(DIR, "packs", p.dir), `${CONTAINER}:/data/development_behavior_packs/${p.name}`]);
}

const activate = (order) => {
  const list = order.map((p) => ({ pack_id: p.id, version: [0, 1, 0] }));
  const file = path.join(DIR, "world_behavior_packs.json");
  fs.writeFileSync(file, JSON.stringify(list));
  execFileSync("docker", ["cp", file, `${CONTAINER}:/data/worlds/dev/world_behavior_packs.json`]);
  return JSON.stringify(list);
};

const PHASES = [
  { label: "order-ab-1", order: [SCRIPT, PACK_A, PACK_B] },
  { label: "order-ab-2", order: [SCRIPT, PACK_A, PACK_B] },
  { label: "order-ba-1", order: [SCRIPT, PACK_B, PACK_A] },
  { label: "order-ab-3", order: [SCRIPT, PACK_A, PACK_B] },
];

for (const phase of PHASES) {
  const json = activate(phase.order);
  const bootWant = countOf("[probe] boot :: ready") + 1;
  compose("restart", "bedrock");
  if (!waitCount("[probe] boot :: ready", bootWant, 300_000)) { log(`PACK DID NOT LOAD (${phase.label})`); process.exit(1); }
  log(`\n--- ${phase.label} world_behavior_packs.json=${json} ---`);
  const want = countOf(`${phase.label} :: complete`) + 1;
  send(`scriptevent probe:run ${phase.label}`);
  if (!waitCount(`${phase.label} :: complete`, want, 600_000)) log(`PHASE ${phase.label} DID NOT COMPLETE`);
}

const version = (logs().match(/Version: ([\d.]+)/) ?? [])[1] ?? "unknown";
log(`\nserver=${version} script=${SCRIPT.id} packA=${PACK_A.id} packB=${PACK_B.id}`);

log("\n=== raw [probe] lines, delivery order ===");
for (const line of logs().split("\n")) if (line.includes("[probe]")) log(line.trimEnd());
log("\n=== content log warnings/errors mentioning probe ===");
for (const line of logs().split("\n")) {
  if (/probe:subject|probe:solo|probe_token/i.test(line) && !line.includes("[probe]")) log(line.trimEnd());
}
log("\n=== end ===");
