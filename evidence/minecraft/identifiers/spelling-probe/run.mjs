// Drives the namespace-character probe against a real Bedrock dedicated server, headless.
//
//   node gen.mjs && node run.mjs      # writes OUTPUT.txt and RAW-OUTPUT.txt beside this file
//
// Two phases against one world: behavior pack alone, then behavior pack plus the resource pack
// whose geometry identifiers carry the same namespace spellings — so content-log errors from the
// resource side are separable from the behavior side.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "OUTPUT.txt");
const COMPOSE = path.join(DIR, "compose.yaml");
const CONTAINER = "ns-probe-bedrock-1";

const BP = { id: "5f2c1c4e-1d7a-4f3b-9d21-6a7c0f1e2b30", dir: "bp", name: "nsprobebp" };
const RP = { id: "3d8f9b02-6a41-4c55-9f7e-2b0c8d16a4f7", dir: "rp", name: "nsproberp" };

const log = (s) => { process.stdout.write(s + "\n"); fs.appendFileSync(OUT, s + "\n"); };
const compose = (...args) =>
  execFileSync("docker", ["compose", "-f", COMPOSE, ...args], { encoding: "utf8", maxBuffer: 512 << 20 });
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
log("# bedrock namespace-character probe");

compose("up", "-d");
if (!waitFor("Server started", 300_000)) { log("SERVER DID NOT START"); process.exit(1); }

compose("exec", "-T", "bedrock", "rm", "-rf", `/data/development_behavior_packs/${BP.name}`);
execFileSync("docker", ["cp", path.join(DIR, "packs", BP.dir), `${CONTAINER}:/data/development_behavior_packs/${BP.name}`]);
compose("exec", "-T", "bedrock", "rm", "-rf", `/data/development_resource_packs/${RP.name}`);
execFileSync("docker", ["cp", path.join(DIR, "packs", RP.dir), `${CONTAINER}:/data/development_resource_packs/${RP.name}`]);

const activate = (withRp) => {
  const bp = [{ pack_id: BP.id, version: [0, 1, 0] }];
  const rp = withRp ? [{ pack_id: RP.id, version: [0, 1, 0] }] : [];
  for (const [file, list] of [["world_behavior_packs.json", bp], ["world_resource_packs.json", rp]]) {
    const local = path.join(DIR, file);
    fs.writeFileSync(local, JSON.stringify(list));
    execFileSync("docker", ["cp", local, `${CONTAINER}:/data/worlds/dev/${file}`]);
  }
  return `bp=${JSON.stringify(bp)} rp=${JSON.stringify(rp)}`;
};

const PHASES = [
  { label: "bp-only", rp: false },
  { label: "bp-plus-rp", rp: true },
];

for (const phase of PHASES) {
  const json = activate(phase.rp);
  const bootWant = countOf("[nsprobe] boot :: ready") + 1;
  compose("restart", "bedrock");
  if (!waitCount("[nsprobe] boot :: ready", bootWant, 300_000)) { log(`PACK DID NOT LOAD (${phase.label})`); process.exit(1); }
  log(`\n--- ${phase.label} ${json} ---`);
  const want = countOf(`${phase.label} :: complete`) + 1;
  send(`scriptevent nsprobe:run ${phase.label}`);
  if (!waitCount(`${phase.label} :: complete`, want, 900_000)) log(`PHASE ${phase.label} DID NOT COMPLETE`);
}

const raw = logs();
fs.writeFileSync(path.join(DIR, "RAW-OUTPUT.txt"), raw);
const version = (raw.match(/Version: ([\d.]+)/) ?? [])[1] ?? "unknown";
log(`\nserver=${version} bp=${BP.id} rp=${RP.id}`);

log("\n=== raw [nsprobe] lines, delivery order ===");
for (const line of raw.split("\n")) if (line.includes("[nsprobe]")) log(line.trimEnd());

log("\n=== other content-log lines mentioning a probe identifier ===");
for (const line of raw.split("\n")) {
  if (line.includes("[nsprobe]")) continue;
  if (/probe|geometry|ns64|ns200|ns512|namespace|identifier/i.test(line)) log(line.trimEnd());
}
log("\n=== end ===");
